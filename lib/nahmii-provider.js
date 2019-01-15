'use strict';

/**
 * @module nahmii-sdk
 */

const dbg = require('./dbg');
const ethers = require('ethers');
const {prefix0x} = require('./utils');
const {createApiToken} = require('./identity-model');
const NahmiiRequest = require('./nahmii-request');
const ClientFundContract = require('./client-fund-contract');
const DriipSettlementChallengeContract = require('./driip-settlement-challenge-contract');
const ClusterInformation = require('./cluster-information');

// Private properties
const _baseUrl = new WeakMap();
const _appId = new WeakMap();
const _appSecret = new WeakMap();
const _apiAccessToken = new WeakMap();
const _apiAccessTokenPending = new WeakMap();
const _tokenInterval = new WeakMap();
const _nahmii = new WeakMap();
const _clientFund = new WeakMap();
const _driipSettlementChallenge = new WeakMap();

/**
 * @class NahmiiProvider
 * A class providing low-level access to the _hubii nahmii_ APIs.
 * @alias module:nahmii-sdk
 * @example
 * const {NahmiiProvider} = require('nahmii-sdk');
 *
 * const provider = await NahmiiProvider.from('https://api.nahmii.io', app_id, app_secret);
 */
class NahmiiProvider extends ethers.providers.JsonRpcProvider {
    /**
     * Construct a new NahmiiProvider.
     * Instead of using this constructor directly it is recommended that you use
     * the NahmiiProvider.from() factory function.
     * @param {string} nahmiiBaseUrl - The base URL (domain name) for the nahmii API
     * @param {string} apiAppId - nahmii API app-ID
     * @param {string} apiAppSecret - nahmii API app-secret
     * @param {string} nodeUrl - url to an ethereum node to connect to
     * @param {string|number} network - a known ethereum network name or ID
     */
    constructor(nahmiiBaseUrl, apiAppId, apiAppSecret, nodeUrl, network) {
        super(nodeUrl, network);

        _baseUrl.set(this, nahmiiBaseUrl);
        _appId.set(this, apiAppId);
        _appSecret.set(this, apiAppSecret);
        _nahmii.set(this, new NahmiiRequest(nahmiiBaseUrl, () => {
            return this.getApiAccessToken();
        }));
        _clientFund.set(this, new ClientFundContract(this));
        _driipSettlementChallenge.set(this, new DriipSettlementChallengeContract(this));
    }

    /**
     * Factory method for creating a new NahmiiProvider automatically configured
     * from the specified nahmii cluster.
     * @param {string} nahmiiBaseUrl - The base URL (domain name) for the nahmii API
     * @param {string} apiAppId - nahmii API app-ID
     * @param {string} apiAppSecret - nahmii API app-secret
     * @returns {Promise<NahmiiProvider>}
     */
    static async from(nahmiiBaseUrl, apiAppId, apiAppSecret) {
        const {ethereum} = await ClusterInformation.get(nahmiiBaseUrl);
        return new NahmiiProvider(nahmiiBaseUrl, apiAppId, apiAppSecret, ethereum.node, ethereum.net);
    }

    get operatorAddress() {
        // TODO: implement
        throw new Error('Not implemented');
    }

    /**
     * Force provider to start updating the API access token once a minute. The
     * update will continue until stopUpdate() is called.
     * Using any methods that require an API access token will automatically
     * start the update process.
     */
    startUpdate() {
        if (this.isUpdating)
            return;

        const updateToken = () => {
            dbg('Updating API access token...');
            const baseUrl = _baseUrl.get(this);
            const appId = _appId.get(this);
            const appSecret = _appSecret.get(this);

            _apiAccessTokenPending.set(this, createApiToken(baseUrl, appId, appSecret)
                .then(t => {
                    dbg('Successfully updated API access token.');
                    _apiAccessToken.set(this, t);
                    return t;
                })
                .catch(err => {
                    dbg('Failed to update API access token!');
                    return Promise.reject(err);
                }));
        };

        updateToken();
        _tokenInterval.set(this, setInterval(updateToken, 60 * 1000));
    }

    /**
     * Stops the automatic update of API access tokens. This should be called
     * when you want to terminate/delete the provider to ensure there are no
     * lingering references.
     */
    stopUpdate() {
        clearInterval(_tokenInterval.get(this));
        _tokenInterval.set(this);
    }

    /**
     * Returns the state of the API access token update process.
     * @returns {boolean} True if the update is running, false otherwise.
     */
    get isUpdating() {
        return !!_tokenInterval.get(this);
    }

    /**
     * Resolves into the current token, or will obtain a new token from the
     * server as needed.
     * @returns {Promise} A promise that resolves into an API access token
     */
    async getApiAccessToken() {
        let currentToken = _apiAccessToken.get(this);
        if (isValidToken(currentToken))
            return currentToken;

        this.startUpdate();
        return _apiAccessTokenPending.get(this);
    }

    /**
     * Retrieves the list of tokens (currencies) supported by _hubii nahmii_.
     * @returns {Promise} A promise that resolves into an array of token definitions.
     */
    getSupportedTokens() {
        return _nahmii.get(this).get('/ethereum/supported-tokens');
    }

    /**
     * Retrieves information about the token that has the specified symbol.
     * @param {string} symbolOrAddress - token symbol or address
     * @param {boolean} byAddress - a flag to tell whether to look up by symbol or address
     * @returns {Promise<Object>}
     */
    async getTokenInfo(symbolOrAddress, byAddress) {
        if (['ETH', '0X0000000000000000000000000000000000000000'].indexOf(symbolOrAddress.toUpperCase()) !== -1) {
            return {
                currency: '0x0000000000000000000000000000000000000000',
                symbol: 'ETH',
                decimals: 18,
                color: ''
            };
        }

        const supportedTokens = await this.getSupportedTokens();
        const searchBy = byAddress ? 'currency' : 'symbol';
        const tokenInfo = supportedTokens.find(t => t[searchBy].toUpperCase() === symbolOrAddress.toUpperCase());
        if (!tokenInfo)
            throw new Error('Unknown currency. See "nahmii show tokens" for a list of supported tokens.');
        return tokenInfo;
    }

    /**
     * Retrieves the balances for all available tokens for the specified wallet address.
     * @param {Address} address
     * @returns {Promise} A promise that resolves into an object of balance information.
     */
    async getAvaliableBalances(address) {
        await this.getApiAccessToken();
        const balancesArr = await _nahmii.get(this).get(`/trading/wallets/${prefix0x(address)}/balances`);
        const currenciesArr = await this.getAllSupportedCurrencies();
        
        const availableBalances = {};
        balancesArr.forEach(bal => {
            // two checks required due to inconsistency in balance API response
            // bal.currency === c.currency for tokens, === c.symbol for ETH
            const currency = currenciesArr
                .find(c => c.currency === bal.currency.ct || c.symbol === bal.currency);
            availableBalances[currency.symbol] = ethers.utils.formatUnits(bal.amount, currency.decimals);
        });

        return availableBalances;
    }

    /**
     * Retrieves all staged balances for the specified wallet address.
     * @param {Address} address
     * @return {Promise} A promise that resolves into a balances object.
     */
    async getStagedBalances(address) {
        const clientFund = _clientFund.get(this);
        await this.getApiAccessToken();

        const currenciesArr = await this.getAllSupportedCurrencies();
        const balancesArr = await Promise.all(currenciesArr.map(asset => clientFund.stagedBalance(address, asset.currency, 0)));

        const stagedBalances = {};
        balancesArr.forEach((bal, i) => {
            if (bal.gt('0')) {
                const currency = currenciesArr[i];
                stagedBalances[currency.symbol] = ethers.utils.formatUnits(bal, currency.decimals);
            }
        });

        return stagedBalances;
    }

    /**
     * Retrieves all balances locked up in the process of staging for the specified wallet address.
     * @param {Address} address
     * @return {Promise} A promise that resolves into a balances object.
     */
    async getStagingBalances(address) {
        await this.getApiAccessToken();
        const currenciesArr = await this.getAllSupportedCurrencies();
        const driipSettlementChallenge = _driipSettlementChallenge.get(this);

        const challengeStarted = await driipSettlementChallenge.proposalStatus(address);
        if (!challengeStarted) return {};

        const proposalCurrency = await driipSettlementChallenge.proposalCurrency(address);
        const proposalStageAmount = await driipSettlementChallenge.proposalStageAmount(address, proposalCurrency);
        const {symbol, decimals} = currenciesArr.find(c => c.currency === proposalCurrency);

        return {[symbol]: ethers.utils.formatUnits(proposalStageAmount, decimals)};
    }

    /**
     * Retrieves all base layer (on-chain) balances for the specified wallet address.
     * @param {Address} address
     * @return {Promise} A promise that resolves into a balances object.
     */
    async getBaseLayerBalances(address) {
        await this.getApiAccessToken();
        const balancesArr = await _nahmii.get(this).get(`ethereum/wallets/${prefix0x(address)}/balances`);
        const currenciesArr = await this.getAllSupportedCurrencies();

        const baseLayerBalances = {};
        balancesArr.forEach((bal) => {
            // two checks required due to inconsistency in balance API response
            // bal.currency === c.currency for tokens, === c.symbol for ETH
            const currency = currenciesArr
                .find(c => c.currency === bal.currency || c.symbol === bal.currency);
            baseLayerBalances[currency.symbol] = ethers.utils.formatUnits(bal.balance, currency.decimals);
        });

        return baseLayerBalances;
    }

    /**
     * Retrieves all pending payments that have not yet been effectuated by the
     * server.
     * @returns {Promise} A promise that resolves into an array of registered payments
     */
    getPendingPayments() {
        return _nahmii.get(this).get('/trading/payments');
    }

    /**
     * Registers a payment with the server to have it effectuated. The payment
     * is expected to be hashed and signed according to the _hubii nahmii_
     * protocol.
     * @param payment A JSON object of a serialized signed Payment
     * @returns {Promise} A promise that resolves into a registered payment payload
     */
    async registerPayment(payment) {
        return _nahmii.get(this)
            .post('/trading/payments', payment)
            .catch(err => {
                switch (err.status) {
                case 402:
                    throw new Error('Insufficient funds!');
                case 403:
                    throw new Error('Not authorized!');
                case 422:
                    throw new Error(err.response.body.message);
                default:
                    throw new Error(err);
                }
            });
    }

    /**
     * Registers a receipt with the server to effectuate the transfer. The
     * receipt is expected to be hashed and signed according to the
     * _hubii nahmii_ protocol.
     * @param receipt A JSON object of a serialized signed Receipt
     * @returns {Promise} A promise that resolved into a receipt registration payload
     */
    async effectuatePayment(receipt) {
        return _nahmii.get(this)
            .post('/trading/receipts', receipt)
            .catch(err => {
                switch (err.status) {
                case 403:
                    throw new Error('Not authorized!');
                case 404:
                    throw new Error('Payment not found');
                case 422:
                    throw new Error(err.response.body.message);
                default:
                    throw new Error(err);
                }
            });
    }

    /**
     * Retrieves all receipts for effectuated payments from the server.
     * @returns {Promise} A promise that resolves into an array of payment receipts
     */
    getAllReceipts() {
        return _nahmii.get(this).get('/trading/receipts');
    }

    /**
    * Resolves into a list of all currencies supported by nahmii.
    * @returns {Promise<void>}
    */
    async getAllSupportedCurrencies() {
        const ETH_INFO = { currency: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18 };
        await this.getApiAccessToken();
        const supportedTokens = await this.getSupportedTokens();
        return [...supportedTokens, ETH_INFO];
    }

    /**
     * Retrieves all receipts for effectuated payments using filter/pagnination criteria.
     * @param {Address} address Filter payment receipts for a specific wallet address.
     * @param {number} fromNonce Filter payment receipts greater or equal to specific nonce.
     * @param {number} limit The max number of payment receipts to return.
     * @param {boolean} asc Return payment receipts in asc order. The default order is desc.
     * @returns {Promise} A promise that resolves into an array of payment receipts
     */
    getWalletReceipts(address, fromNonce, limit, asc) {
        const queries = {};
        if (fromNonce)
            queries.fromNonce = fromNonce;
        if (limit > 0)
            queries.limit = limit;
        if (asc)
            queries.direction = 'asc';

        return _nahmii.get(this).get(`/trading/wallets/${address}/receipts`, queries);
    }

    /**
     * Waits for a transaction to be mined, polling every second.
     * Rejects if a transaction is mined, but fails to execute, for example in an out of gas scenario.
     * @see https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-receipts
     * @param {string} transactionHash
     * @param {number} [timeout=60] - Seconds to wait before timing out
     * @returns {Promise<Object>}
     * @example
     * const {hash} = await wallet.depositEth('1.1', {gasLimit: 200000});
     * const transactionReceipt = await getTransactionConfirmation(hash);
     */
    getTransactionConfirmation(transactionHash, timeout = 60) {
        return Promise.retry(() => {
            return deferredIsNotNull(this.getTransactionReceipt(transactionHash));
        }, Math.ceil(timeout), 1000)
            .then(result => {
                if (result.status === 0) throw new Error('Transaction failed');
                return result;
            });
    }
}

function isValidToken(currentToken) {
    // TODO: check JWT.exp also
    return !!currentToken;
}

module.exports = NahmiiProvider;

function deferredIsNotNull(promise) {
    return new Promise((resolve, reject) => {
        promise.then(res => {
            if (res !== null)
                resolve(res);
            else
                reject();
        });
    });
}

Promise.retry = function(attemptFn, times, delay) {
    return new Promise(function(resolve, reject) {
        let error;

        function attempt() {
            if (!times)
                return reject(error);

            attemptFn()
                .then(resolve)
                .catch(function(e) {
                    times--;
                    error = e;
                    setTimeout(function() {
                        attempt();
                    }, delay);
                });
        }

        attempt();
    });
};
