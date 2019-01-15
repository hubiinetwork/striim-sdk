'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const ethers = require('ethers');
const {prefix0x} = require('./utils');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const stubbedIdentityModel = {
    createApiToken: sinon.stub()
};

const stubbedNahmiiRequestCtr = sinon.stub();
const stubbedNahmiiRequest = {
    get: sinon.stub(),
    post: sinon.stub()
};
const stubbedClusterInformation = {};

const stubbedDriipSettlementChallengeCtr = sinon.stub();
const stubbedDriipSettlementChallenge = {
    proposalStageAmount: sinon.stub(),
    proposalStatus: sinon.stub(),
    proposalCurrency: sinon.stub()
};

const stubbedClientFundCtr = sinon.stub();
const stubbedClientFund = {
    settledBalance: sinon.stub(),
    depositedBalance: sinon.stub(),
    stagedBalance: sinon.stub()
};

function proxyquireProvider() {
    return proxyquire('./nahmii-provider', {
        './identity-model': stubbedIdentityModel,
        './nahmii-request': stubbedNahmiiRequestCtr,
        './client-fund-contract': stubbedClientFundCtr,
        './driip-settlement-challenge-contract': stubbedDriipSettlementChallengeCtr,
        './cluster-information': stubbedClusterInformation
    });
}

const expectedJWT = 'some JWT';
const baseUrl = 'api base url';
const appId = 'nahmii api app id';
const appSecret = 'nahmii api app secret';
const node = 'some ethereum node url';
const network = 'testnet';
const walletAddr = '0000000000000000000000000000000000000001';

describe('Nahmii Provider', () => {
    let provider;

    afterEach(() => {
        stubbedIdentityModel.createApiToken.reset();
    });

    context('a new NahmiiProvider with valid configuration', () => {
        beforeEach(() => {
            stubbedNahmiiRequestCtr
                .withArgs(baseUrl)
                .returns(stubbedNahmiiRequest);
            stubbedClientFundCtr
                .returns(stubbedClientFund);
            stubbedDriipSettlementChallengeCtr
                .returns(stubbedDriipSettlementChallenge);
            stubbedIdentityModel.createApiToken
                .withArgs(baseUrl, appId, appSecret)
                .resolves(expectedJWT);
            const NahmiiProvider = proxyquireProvider();
            provider = new NahmiiProvider(baseUrl, appId, appSecret, node, network);
        });

        afterEach(() => {
            provider.stopUpdate();
        });

        validateExpectedBehaviorOfProvider();
    });

    context('a NahmiiProvider from cluster information', () => {
        beforeEach(async () => {
            stubbedNahmiiRequestCtr
                .withArgs(baseUrl)
                .returns(stubbedNahmiiRequest);
            stubbedIdentityModel.createApiToken
                .withArgs(baseUrl, appId, appSecret)
                .resolves(expectedJWT);
            stubbedClusterInformation.get = sinon.stub();
            stubbedClusterInformation.get.withArgs(baseUrl)
                .resolves({
                    ethereum: {
                        node: node,
                        net: network
                    }
                });
            const NahmiiProvider = proxyquireProvider();
            provider = await NahmiiProvider.from(baseUrl, appId, appSecret);
        });

        afterEach(() => {
            provider.stopUpdate();
        });

        validateExpectedBehaviorOfProvider();
    });

    function validateExpectedBehaviorOfProvider() {
        it('can retrieve the API access token', async () => {
            expect(await provider.getApiAccessToken()).to.eql(expectedJWT);
        });

        it('schedules and update of the API access after asking for it', async () => {
            expect(provider.isUpdating).to.be.false;
            await provider.getApiAccessToken();
            expect(provider.isUpdating).to.be.true;
        });

        it('can stop the scheduled updates', async () => {
            await provider.getApiAccessToken();
            expect(provider.isUpdating).to.be.true;
            provider.stopUpdate();
            expect(provider.isUpdating).to.be.false;
        });

        it('will create a new token when called several times shortly after each other', async () => {
            let t1 = await provider.getApiAccessToken();
            stubbedIdentityModel.createApiToken.resetBehavior();
            let t2 = await provider.getApiAccessToken();
            let t3 = await provider.getApiAccessToken();
            expect(t1).to.equal(t2);
            expect(t1).to.equal(t3);
            expect(stubbedIdentityModel.createApiToken.callCount).to.eql(1);
        });

        it('re-authenticates once a minute', async () => {
            let clock = sinon.useFakeTimers(new Date());

            let i = 0;
            stubbedIdentityModel.createApiToken.reset();
            stubbedIdentityModel.createApiToken.resolves('token.' + i);
            expect(await provider.getApiAccessToken()).to.eql('token.' + i++);

            for (; i <= 10; i++) {
                let expectedToken = `token.${i}`;
                stubbedIdentityModel.createApiToken.resolves(expectedToken);
                clock.tick(60 * 1000);
                await stubbedIdentityModel.createApiToken.promise;
                expect(await provider.getApiAccessToken()).to.eql(expectedToken);
            }
            clock.restore();
        });

        it('can retrieve a list of supported tokens', async () => {
            const expectedTokens = [];
            stubbedNahmiiRequest.get
                .withArgs('/ethereum/supported-tokens')
                .resolves(expectedTokens);
            const tokens = await provider.getSupportedTokens();
            expect(tokens).to.equal(expectedTokens);
        });

        it('can return TokenInfo for symbol ETH', async () => {
            const expectedTokenInfo = {
                currency: '0x0000000000000000000000000000000000000000',
                symbol: 'ETH',
                decimals: 18,
                color: ''
            };
            const token = await provider.getTokenInfo('ETH');
            expect(token).to.eql(expectedTokenInfo);
        });

        it('can return TokenInfo for ETH address', async () => {
            const expectedTokenInfo = {
                currency: '0x0000000000000000000000000000000000000000',
                symbol: 'ETH',
                decimals: 18,
                color: ''
            };
            const token = await provider.getTokenInfo('0x0000000000000000000000000000000000000000', true);
            expect(token).to.eql(expectedTokenInfo);
        });

        it('can return TokenInfo for ETH symbol', async () => {
            const expectedTokenInfo = {
                currency: '0x0000000000000000000000000000000000000000',
                symbol: 'ETH',
                decimals: 18,
                color: ''
            };
            const token = await provider.getTokenInfo('ETH');
            expect(token).to.eql(expectedTokenInfo);
        });

        it('can return TokenInfo for token symbol', async () => {
            const expectedTokens = [
                {
                    currency: '0x0000000000000000000000000000000000000001',
                    symbol: 'TTT',
                    decimals: 18,
                    color: ''
                }
            ];
            stubbedNahmiiRequest.get
                .withArgs('/ethereum/supported-tokens')
                .resolves(expectedTokens);
            const token = await provider.getTokenInfo(expectedTokens[0].symbol);
            expect(token).to.eql(expectedTokens[0]);
        });

        it('can return TokenInfo for token address', async () => {
            const expectedTokens = [
                {
                    currency: '0x0000000000000000000000000000000000000001',
                    symbol: 'TTT',
                    decimals: 18,
                    color: ''
                }
            ];
            stubbedNahmiiRequest.get
                .withArgs('/ethereum/supported-tokens')
                .resolves(expectedTokens);
            const token = await provider.getTokenInfo(expectedTokens[0].currency, true);
            expect(token).to.eql(expectedTokens[0]);
        });

        it('can retrieve the balance for a wallet', async () => {
            const expectedApiRes = [{
                amount: '100',
                currency: {
                    ct: '0x0000000000000000000000000000000000000001',
                    id: 0
                },
                symbol: 'TTT'
            }];
            const expectedTokens = [
                {
                    currency: '0x0000000000000000000000000000000000000001',
                    symbol: 'TT1',
                    decimals: 2,
                    color: ''
                }
            ];
            const expectedBalances = {TT1: '1.0'};
            stubbedNahmiiRequest.get
                .withArgs(`/trading/wallets/${prefix0x(walletAddr)}/balances`)
                .resolves(expectedApiRes);
            stubbedNahmiiRequest.get
                .withArgs('/ethereum/supported-tokens')
                .resolves(expectedTokens);
            const result = await provider.getAvaliableBalances(walletAddr);
            expect(result).to.deep.equal(expectedBalances);
        });

        it('can retrieve the base layer balance for a wallet', async () => {
            const BOKKY_ADDR = '0x583cbbb8a8443b38abcc0c956bece47340ea1367';
            const expectedBalanceApiResponse = [ 
                { 
                    address: walletAddr,
                    currency: 'ETH',
                    balance: '137104618244215607775' 
                },
                { 
                    address: walletAddr,
                    currency: BOKKY_ADDR,
                    balance: '1097796710986654323' 
                } 
            ];
            const expectedTokens = [{ currency: BOKKY_ADDR, symbol: 'BOKKY', decimals: 18 }];
            const expectedBalances = { ETH: '137.104618244215607775', BOKKY: '1.097796710986654323' };

            stubbedNahmiiRequest.get
                .withArgs('/ethereum/supported-tokens')
                .resolves(expectedTokens);
            stubbedNahmiiRequest.get
                .withArgs(`ethereum/wallets/${`0x${walletAddr}`}/balances`)
                .resolves(expectedBalanceApiResponse);
            const result = await provider.getBaseLayerBalances(walletAddr);
            expect(result).to.deep.equal(expectedBalances);
        });

        it('can retrieve the list of pending payments', async () => {
            const expectedPayments = [];
            stubbedNahmiiRequest.get
                .withArgs('/trading/payments')
                .resolves(expectedPayments);
            const result = await provider.getPendingPayments();
            expect(result).to.equal(expectedPayments);
        });

        it('can retrieve the list of payment receipts', async () => {
            const expectedReceipts = [];
            stubbedNahmiiRequest.get
                .withArgs('/trading/receipts')
                .resolves(expectedReceipts);
            const result = await provider.getAllReceipts();
            expect(result).to.equal(expectedReceipts);
        });

        it('can retrieve the list of payment receipts for a wallet', async () => {
            const expectedReceipts = [];
            stubbedNahmiiRequest.get
                .withArgs(`/trading/wallets/${walletAddr}/receipts`)
                .resolves(expectedReceipts);
            const result = await provider.getWalletReceipts(walletAddr);
            expect(result).to.equal(expectedReceipts);
        });

        it('can retrieve the list of payment receipts for a wallet with paginator/filter criteria', async () => {
            const expectedReceipts = [];
            const fromNonce = 1;
            const limit = 1;
            const asc = true;
            stubbedNahmiiRequest.get
                .withArgs(`/trading/wallets/${walletAddr}/receipts`, {
                    fromNonce,
                    limit,
                    direction: 'asc'
                })
                .resolves(expectedReceipts);
            const result = await provider.getWalletReceipts(walletAddr, fromNonce, limit, asc);
            expect(result).to.equal(expectedReceipts);
        });

        it('can register a payment', () => {
            const expectedPayment = {};
            stubbedNahmiiRequest.post
                .withArgs('/trading/payments', expectedPayment)
                .resolves();
            return provider.registerPayment(expectedPayment);
        });

        [
            [402, 'Insufficient funds!'],
            [403, 'Not authorized!'],
            [500, 'Error']
        ].forEach(([statusCode, expectedMessage]) => {
            it('sends back error messages with sensible messages when API fails to register payment', (done) => {
                const expectedPayment = {};
                const error = new Error();
                error.status = statusCode;
                stubbedNahmiiRequest.post
                    .withArgs('/trading/payments', expectedPayment)
                    .rejects(error);
                provider
                    .registerPayment(expectedPayment)
                    .catch(err => {
                        expect(err.message).to.eql(expectedMessage);
                        done();
                    });
            });
        });

        it('can effectuate a payment', () => {
            const expectedReceipt = {};
            stubbedNahmiiRequest.post
                .withArgs('/trading/receipts', expectedReceipt)
                .resolves();
            return provider.effectuatePayment(expectedReceipt);
        });

        it('can watch a tx hash and resolve when it\'s mined and executed successfully', async () => {
            const txReceipt = {hash: 'magic tx hash', status: 1};
            const txHash = '0x1bb332f5b3c2c6b56e43284145c1cb7454606d89bd9b82bd8821e3edfe8d35ad';
            // TODO: Fix this. Dont stub the code under test!
            sinon.stub(provider, 'getTransactionReceipt')
                .withArgs(txHash)
                .resolves(txReceipt);
            const result = await provider.getTransactionConfirmation(txHash);
            expect(result).to.equal(txReceipt);
        });

        it('can watch a tx hash and reject when it\'s mined but failed to execute', (done) => {
            const txReceipt = {hash: 'magic tx hash 2', status: 0};
            const txHash = '0x1bb332f5b3c2c6b56e43284145c1cb7454606d89bd9b82bd8821e3edfe8d35ad';

            // TODO: Fix this. Dont stub the code under test!
            sinon.stub(provider, 'getTransactionReceipt')
                .withArgs(txHash)
                .resolves(txReceipt);

            provider
                .getTransactionConfirmation(txHash)
                .catch(err => {
                    expect(err.message).to.equal('Transaction failed');
                    done();
                });
        });

        [
            [403, 'Not authorized!'],
            [404, 'Payment not found'],
            [500, 'Error']
        ].forEach(([statusCode, expectedMessage]) => {
            it('sends back error messages with sensible messages when API fails to effectuate payment', (done) => {
                const expectedReceipt = {};
                const error = new Error();
                error.status = statusCode;
                stubbedNahmiiRequest.post
                    .withArgs('/trading/receipts', expectedReceipt)
                    .rejects(error);
                provider
                    .effectuatePayment(expectedReceipt)
                    .catch(err => {
                        expect(err.message).to.eql(expectedMessage);
                        done();
                    });
            });

            describe('contract balance checks', () => {
                const expectedTokens = [{ currency: '0x01', symbol: 'ABC', decimals: 12 }];
                const expectedBalances = {ABC: ethers.utils.bigNumberify('1001'), ETH: ethers.utils.bigNumberify('5')};
                const expected = {ABC: ethers.utils.formatUnits('1001', 12), ETH: ethers.utils.formatUnits('5', 18)};

                beforeEach(() => {
                    stubbedNahmiiRequest.get
                        .withArgs('/ethereum/supported-tokens')
                        .resolves(expectedTokens);
                });

                it('can retrieve the staged balances for an address', async () => {
                    stubbedClientFund.stagedBalance
                        .withArgs(walletAddr, '0x01', 0)
                        .resolves(expectedBalances['ABC']);
                    stubbedClientFund.stagedBalance
                        .withArgs(walletAddr, '0x0000000000000000000000000000000000000000', 0)
                        .resolves(expectedBalances['ETH']);
                    const result = await provider.getStagedBalances(walletAddr);
                    expect(result).to.deep.equal(expected);
                });

                it('can retrieve the staging balance for an address with settlement in progress', async () => {
                    stubbedDriipSettlementChallenge.proposalStatus
                        .resolves(1);
                    stubbedDriipSettlementChallenge.proposalCurrency
                        .resolves(expectedTokens[0].currency);
                    stubbedDriipSettlementChallenge.proposalStageAmount
                        .resolves(expectedBalances['ABC']);
                    const expected = {ABC: ethers.utils.formatUnits(expectedBalances['ABC'], expectedTokens[0].decimals)};
                    const result = await provider.getStagingBalances(walletAddr);
                    expect(result).to.deep.equal(expected);
                });

                it('can retrieve the staging balance for an address with no settlement in progress', async () => {
                    stubbedDriipSettlementChallenge.proposalStatus
                        .resolves(0);
                    const expected = {};
                    const result = await provider.getStagingBalances(walletAddr);
                    expect(result).to.deep.equal(expected);
                });
            });
        });
    }
});
