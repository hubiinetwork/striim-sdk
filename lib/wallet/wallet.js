'use strict';

/**
 * @module nahmii-sdk
 */

const dbg = require('../dbg');
const ethers = require('ethers');
const ClientFundContract = require('./client-fund-contract');
const BalanceTrackerContract = require('./balance-tracker-contract');
const Erc20Contract = require('./erc20-contract');

const _clientFund = new WeakMap();
const _balanceTracker = new WeakMap();
const _provider = new WeakMap();
const _signatureProvider = new WeakMap();

/**
 * @class Wallet
 * A class for performing various operations on a wallet.
 * @alias module:nahmii-sdk
 */
class Wallet extends ethers.Signer {
    /**
     * Create a Wallet from either a private key or custom signing functions
     * @param {(string|object)} signer - A private key, or information required for the wallet to have signing capabilities
     * @param {NahmiiProvider} provider - A NahmiiProvider instance
     */
    constructor(signer, provider) {
        super();
        _provider.set(this, provider);

        if (typeof signer === 'string')
            _signatureProvider.set(this, signerFromKey.call(this, signer));
        else
            _signatureProvider.set(this, signerFromExternalImpl.call(this, signer.signMessage, signer.signTransaction, signer.address));

        _clientFund.set(this, new ClientFundContract(this));
        _balanceTracker.set(this, new BalanceTrackerContract(this));
    }

    /**
     * The Nahmii Provider used by this wallet instance.
     * @return {NahmiiProvider}
     */
    get provider() {
        return _provider.get(this);
    }

    /**
     * Returns the address for this wallet, required by ethers Wallet
     * methods.
     * @return {String}
     */
    get address() {
        return _signatureProvider.get(this).address;
    }

    /**
     * Retrieves avaliable nahmii balance for current wallet.
     * @return {Promise} A promise that resolves into a mapping from symbol to human readable amount.
     */
    async getAvaliableBalances() {
        return this.provider.getAvaliableBalances(this.address);
    }

    /**
     * Retrieves all nahmii staged balances for the wallet.
     * @return {Promise} A promise that resolves into a balances object.
     */
    getStagedBalances() {
        return this.provider.getStagedBalances(this.address);
    }

    /**
     * Retrieves all balances locked up in the process of staging for the wallet.
     * @return {Promise} A promise that resolves into a balances object.
     */
    getStagingBalances() {
        return this.provider.getStagingBalances(this.address);
    }

    /**
     * Retrieves all nahmii staged balances for the wallet.
     * @return {Promise} A promise that resolves into a balances object.
     */
    getBaseLayerBalances() {
        return this.provider.getBaseLayerBalances(this.address);
    }

    /**
     * Initiates the deposit of ETH from the on-chain balance of the wallet to
     * nahmii.
     * @param {(number|string)} amountEth - The amount of ETH to deposit.
     * @param [options]
     * @return {Promise} A promise that resolves into a transaction with a hash.
     * @example
     * const {hash} = await wallet.depositEth('1.1', {gasLimit: 200000});
     * const receipt = await wallet.provider.getTransactionConfirmation(hash);
     */
    async depositEth(amountEth, options) {
        options = {gasLimit: 600000, ...options};
        const amountWei = ethers.utils.parseEther(amountEth.toString());
        const clientFund = _clientFund.get(this);
        const rawTx = {
            to: clientFund.address,
            value: amountWei,
            ...options
        };

        const address = await this.getAddress();
        dbg('Sending ' + amountWei + ' wei to ' + clientFund.address + ' from ' + address);
        return this.sendTransaction(rawTx);
    }

    /**
     * Initiates the deposit of a token from the wallet's on-chain balance to
     * nahmii by calling the approve method of the token smart contract.
     * @param {(number|string)} amount - The amount of currency to deposit.
     * @param {string} symbol - The currency symbol
     * @param [options]
     * @return {Promise} A promise that resolves into a transaction with a hash.
     * @see https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-receipts
     * @example
     * const {hash} = await wallet.depositToken('1.1', 'HBT', {gasLimit: 200000});
     * const receipt = await wallet.provider.getTransactionConfirmation(hash);
     */
    async approveTokenDeposit(amount, symbol, options) {
        options = {gasLimit: 600000, ...options};
        const tokenInfo = await getTokenInfo.call(this, symbol);
        const tokenContract = new Erc20Contract(tokenInfo.currency, this);
        const amountBN = ethers.utils.parseUnits(amount.toString(), tokenInfo.decimals);
        const clientFund = _clientFund.get(this);
        try {
            return await tokenContract.approve(clientFund.address, amountBN, options);
        }
        catch (e) {
            throw new Error(`Failed to approve token deposit: ${e}`);
        }
    }

    /**
     * Initiates the completion of a deposit of a token from a wallet's on-chain
     * balance to nahmii by calling the depositTokens method of the nahmii
     * clientFund smart contract.
     * Requires approveTokenDeposit to have been called first.
     * @param {(number|string)} amount - The amount of currency to deposit.
     * @param {string} symbol - The currency symbol
     * @param [options]
     * @return {Promise} A promise that resolves into a transaction with a hash.
     * @example
     * const {hash} = await wallet.completeTokenDepsoit('1.1', 'HBT', {gasLimit: 200000});
     * const receipt = await wallet.provider.getTransactionConfirmation(hash);
     */
    async completeTokenDeposit(amount, symbol, options) {
        options = {gasLimit: 600000, ...options};
        const tokenInfo = await getTokenInfo.call(this, symbol);
        const tokenContract = new Erc20Contract(tokenInfo.currency, this);
        const amountBN = ethers.utils.parseUnits(amount.toString(), tokenInfo.decimals);
        const clientFund = _clientFund.get(this);

        try {
            return await clientFund.receiveTokens('', amountBN, tokenContract.address, 0, 'ERC20', options);
        }
        catch (e) {
            throw new Error(`Failed to complete token deposit: ${e}`);
        }
    }

    /**
     * Withdraw an amount of ETH or ERC20 tokens from nahmii to base layer.
     * @param {MonetaryAmount} monetaryAmount - The amount to withdraw from nahmii.
     * @param [options]
     * @return {Promise} A promise that resolves into transaction hash.
     * @example
     * let amountBN = ethers.utils.parseUnits('1.1', 18);
     * let currency = '0x0000000000000000000000000000000000000000'
     * let monetaryAmount = new nahmii.MonetaryAmount(amountBN, currency, 0)
     * let hashObj = await wallet.withdraw(monetaryAmount, {gasLimit: 200000});
     */
    async withdraw(monetaryAmount, options = {}) {
        const {amount, currency} = monetaryAmount.toJSON();
        const clientFund = _clientFund.get(this);
        return await clientFund.withdraw(amount, currency.ct, currency.id, '', options);
    }

    /**
     * Unstage an amount of ETH or ERC20 tokens from staged balance back to
     * nahmii available balance.
     * @param {MonetaryAmount} monetaryAmount - The amount unstage from staged balance.
     * @param [options]
     * @return {Promise} A promise that resolves into transaction hash.
     * @example
     * let amountBN = ethers.utils.parseUnits('1.1', 18);
     * let currency = '0x0000000000000000000000000000000000000000'
     * let monetaryAmount = new nahmii.MonetaryAmount(amountBN, currency, 0)
     * let hashObj = await wallet.unstage(monetaryAmount, {gasLimit: 200000});
     */
    async unstage(monetaryAmount, options = {}) {
        const {amount, currency} = monetaryAmount.toJSON();
        const clientFund = _clientFund.get(this);
        return await clientFund.unstage(amount, currency.ct, currency.id, options);
    }

    /**
     * Retrieves the wallet address.
     * @return {Promise<string>} - The wallet address as a hexadecimal string
     */
    async getAddress() {
        return _signatureProvider.get(this).address;
    }

    /**
     * Signs message and returns a Promise that resolves to the flat-format
     * signature. If message is a string, it is converted to UTF-8 bytes,
     * otherwise it is preserved as a binary representation of the Arrayish data.
     * @param message
     * @return {Promise<string>}
     */
    async signMessage(message) {
        return await _signatureProvider.get(this).signMessage(message);
    }

    /**
     * Signs transaction and returns a Promise that resolves to the signed
     * transaction as a hex string.
     * In general, the sendTransaction method is preferred to sign, as it can
     * automatically populate values asynchronously.
     * @param transaction
     * @return {Promise<string>}
     */
    async sign(transaction) {
        return await _signatureProvider.get(this).sign(transaction);
    }

    /**
     * Returns the wallet instance on-chain ETH balance
     * @param {string} [blockTag] - A block number to calculate from
     * @return {Promise<BigNumber>}
     */
    async getBalance(blockTag) {
        return await ethers.Wallet.prototype.getBalance.call(this, blockTag);
    }

    /**
     * Returns the wallet instance on-chain transaction count
     * @param {string} [blockTag] - A block number to calculate from
     * @return {Promise<number>}
     */
    async getTransactionCount(blockTag) {
        return await ethers.Wallet.prototype.getTransactionCount.call(this, blockTag);
    }

    /**
     * Sends the transaction to the network and returns a Promise that resolves
     * to a Transaction Response.
     * Any properties that are not provided will be populated from the network.
     * See: https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-request
     * @param {object} transaction - An unsigned Ethereum transaction
     * @return {Promise<TransactionResponse>}
     */
    async sendTransaction(transaction) {
        return await ethers.Wallet.prototype.sendTransaction.call(this, transaction);
    }

    /**
     * If used with software wallet, returns an object containing signer related
     * information and logic such as the private key, otherwise undefined
     * @returns {ethers.SignerKey|undefined} The private key or undefined
     */
    get signerKey() {
        return _signatureProvider.get(this).signerKey;
    }
}

module.exports = Wallet;

/**
 * @private - invoke bound to instance.
 * Creates signer implementation
 * @param {string} privateKey - An Ethereum hex encoded private key
 * @return {object} implementing the functions needed to sign a message
 */
function signerFromKey(privateKey) {
    return new ethers.Wallet(privateKey, this.provider);
}

/**
 * @private - invoke bound to instance.
 * Creates custom signer implementation
 * @param {function} signMessage - Takes a string as input and returns a flat format Ethereum signature
 * @param {function} sign - Takes a transaction as input and returns the same transaction signed, as a hex string
 * @param {string} address - The address to use. Must be able to derive from the private key used in the signing functions
 */
function signerFromExternalImpl(signMessage, sign, address) {
    if (typeof signMessage === 'function'
        && typeof sign === 'function'
        && typeof address === 'string'
    )
        return {signMessage, sign, address};

    throw new Error('Invalid parameter passed to Wallet constructor');
}

/**
 * @private - invoke bound to instance.
 * Retrieves information about the token that has the specified symbol.
 * @param {string} symbolOrAddress - token symbol or address
 * @param {boolean} byAddress - a flag to tell whether to look up by symbol or address
 * @return {Promise<Object>}
 */
async function getTokenInfo(symbolOrAddress, byAddress) {
    const supportedTokens = await this.provider.getSupportedTokens();
    const searchBy = byAddress ? 'currency' : 'symbol';
    const tokenInfo = supportedTokens.find(t => t[searchBy].toUpperCase() === symbolOrAddress.toUpperCase());
    if (!tokenInfo)
        throw new Error(`Unknown currency. "${symbolOrAddress}" could not be found in the list of supported tokens.`);
    return tokenInfo;
}
