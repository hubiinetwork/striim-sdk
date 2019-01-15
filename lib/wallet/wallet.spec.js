'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const ethers = require('ethers');
const MonetaryAmount = require('../monetary-amount');

const privateKey = '0x' + '0F'.repeat(32);
const walletAddress = '0x691A8D05678FC962ff0f2174134379c0051Cb686'; // Derived from privateKey! Not random!

const apiAccessToken = 'hubii-api-token';


const stubbedProvider = {
    _ethersType: 'Provider',
    network: {chainId: 3},
    getTransactionReceipt: sinon.stub(),
    getTransactionConfirmation: sinon.stub(),
    getApiAccessToken: sinon.stub(),
    getSupportedTokens: sinon.stub(),
    getNahmiiBalances: sinon.stub(),
    getBalance: sinon.stub(),
    getTransactionCount: sinon.stub(),
    sendTransaction: sinon.stub(),
    getGasPrice: sinon.stub(),
    getNetwork: sinon.stub(),
    resolveName: sinon.stub()
};

const testTokens = [
    {
        currency: '0x0000000000000000000000000000000000000001',
        symbol: 'TT1',
        decimals: 18
    },
    {
        currency: '0x0000000000000000000000000000000000000002',
        symbol: 'TT2',
        decimals: 5
    }
];

const stubbedClientFundContract = {
    receiveTokens: sinon.stub(),
    withdraw: sinon.stub(),
    unstage: sinon.stub(),
    address: 'client fund address'
};

const stubbedErc20Contract = {
    approve: sinon.stub()
};

function proxyquireWallet() {
    return proxyquire('./wallet', {
        './client-fund-contract': function() {
            return stubbedClientFundContract;
        },
        './erc20-contract': function(address) {
            stubbedErc20Contract.address = address;
            return stubbedErc20Contract;
        },
        './balance-tracker-contract': function() {
            return {};
        }
    });
}


[
    ['private key signing', privateKey],
    ['custom signing', {
        address: walletAddress,
        signMessage: async (rawMessage) => {
            let message = rawMessage;
            if (typeof message === 'string')
                message = ethers.utils.toUtf8Bytes(message);
            const wallet = new ethers.Wallet(privateKey);
            const signature = wallet.signingKey.signDigest(ethers.utils.hashMessage(message));
            return ethers.utils.joinSignature(signature);
        },
        signTransaction: async (unresolvedTx) => {
            const tx = await ethers.utils.resolveProperties(unresolvedTx);
            const serializedTx = ethers.utils.serializeTransaction(tx);
            const wallet = new ethers.Wallet(privateKey);
            const signature = wallet.signingKey.signDigest(ethers.utils.keccak256(serializedTx));
            return ethers.utils.serializeTransaction(tx, signature);
        }
    }]
].forEach(([description, signer]) => {
    describe(`Wallet with ${description}`, () => {
        let wallet;

        beforeEach(() => {
            stubbedProvider.getApiAccessToken.resolves(apiAccessToken);
            stubbedProvider.getSupportedTokens.resolves(testTokens);
            const Wallet = proxyquireWallet();
            wallet = new Wallet(signer, stubbedProvider);
        });

        afterEach(() => {
            stubbedErc20Contract.approve.reset();
            stubbedClientFundContract.receiveTokens.reset();
            stubbedProvider.getNahmiiBalances.reset();
            stubbedProvider.getSupportedTokens.reset();
            stubbedProvider.getTransactionReceipt.reset();
            stubbedProvider.getApiAccessToken.reset();
            stubbedProvider.getBalance.reset();
            stubbedProvider.getTransactionCount.reset();
            stubbedProvider.sendTransaction.reset();
            stubbedProvider.getGasPrice.reset();
            stubbedProvider.getNetwork.reset();
            stubbedProvider.resolveName.reset();
            stubbedClientFundContract.withdraw.reset();
            stubbedClientFundContract.unstage.reset();
        });

        context('an initialized wallet', () => {
            it('can sign transactions using it\'s \'sign\' method', async () => {
                const rawTx = {
                    to: walletAddress,
                    value: ethers.utils.parseEther('1.23'),
                    gasLimit: 1
                };
                const signedHex = '0xf86580800194691a8d05678fc962ff0f2174134379c0051cb686881111d67bb1bb0000801ca063b9e191cad9ad10903061f2f631b8115e5e7241e48091d28dc8d8683a28e70fa079321a11cf7cbcb3b34650f335c5c82453ca9ca0ca3711623efabebc125b8292';
                const sig = await wallet.sign(rawTx);
                expect(sig).to.equal(signedHex);
            });

            it('can sign messages using it\'s \'signMessage\' method', async () => {
                const message = 'Hello World!';
                const signedHex = '0xaeca66ebca1a5da255e4c60003ce9709911c4a5bfb9fd62d0f0f6aa9bfc216b217034f7c277f32b1efec116765851b65960be921e8b8711b7529eda338cc08d81b';
                const sig = await wallet.signMessage(message);
                expect(sig).to.equal(signedHex);
            });
        });

        context('a wallet with no base layer transactions', () => {
            let txCount;
            beforeEach(() => {
                txCount = 0;
                stubbedProvider.getTransactionCount
                    .withArgs(walletAddress)
                    .resolves(txCount);
            });

            it('has no base layer transactions', async () => {
                let balance = await wallet.getTransactionCount();
                expect(balance).to.eql(txCount);
            });
        });

        context('a wallet base layer transactions', () => {
            let txCount;
            beforeEach(() => {
                txCount = 5;
                stubbedProvider.getTransactionCount
                    .withArgs(walletAddress)
                    .resolves(txCount);
            });

            it('has a positive base layer transactions', async () => {
                let balance = await wallet.getTransactionCount();
                expect(balance).to.eql(txCount);
            });
        });

        // context('a wallet with no nahmii balance', () => {
        //     beforeEach(() => {
        //         stubbedProvider.getNahmiiBalances
        //             .withArgs(walletAddress)
        //             .resolves([]);
        //     });

        //     it('has no nahmii balance', async () => {
        //         let balance = await wallet.getNahmiiBalance();
        //         expect(balance).to.eql({});
        //     });
        // });

        context('a wallet with nahmii balance', () => {
            beforeEach(() => {
                stubbedProvider.getNahmiiBalances
                    .withArgs(walletAddress)
                    .resolves([
                        {
                            wallet: walletAddress,
                            currency: {
                                ct: '0x0000000000000000000000000000000000000000',
                                id: '0'
                            },
                            amount: '100200000000000000000'
                        },
                        {
                            wallet: walletAddress,
                            currency: {ct: testTokens[0].currency, id: '0'},
                            amount: '3140000000000000000'
                        }
                    ]);
            });

            // it('has a nahmii balance', async () => {
            //     let balance = await wallet.getNahmiiBalance();
            //     expect(balance).to.eql({
            //         'ETH': '100.2',
            //         'TT1': '3.14'
            //     });
            // });

            it('can withdraw eth or tokens', async () => {
                const fakeTx = {hash: 'magic tx hash 1'};
                const amount = '1.23';
                const currency = '0x0000000000000000000000000000000000000000';
                const amountBN = ethers.utils.parseUnits(amount, 18);
                stubbedClientFundContract.withdraw
                    .withArgs(amountBN.toString(), currency, '0', '', {})
                    .resolves(fakeTx);
                const monetaryAmount = new MonetaryAmount(amountBN, currency, 0);
                let tx = await wallet.withdraw(monetaryAmount);
                expect(tx).to.equal(fakeTx);
            });
        });


        context('a wallet with a base layer balance', () => {
            let walletBal;
            const fakeTxHash = 'some tx hash';

            beforeEach(() => {
                walletBal = ethers.utils.bigNumberify('10000');
                stubbedProvider.getBalance
                    .withArgs(walletAddress)
                    .resolves(walletBal);
            });

            it('has a base layer balance', async () => {
                let result = await wallet.getBalance();
                expect(result).to.eql(walletBal);
            });

            it('can send a transaction', async () => {
                const rawTx = {
                    to: walletAddress,
                    value: ethers.utils.parseEther('1.23'),
                    gasLimit: 1
                };
                const gasPrice = ethers.utils.bigNumberify('1000');
                const transactionCount = 1;
                const network = {chainId: 3};
                const tx = {
                    value: ethers.utils.parseEther('1.23'),
                    to: walletAddress,
                    gasPrice,
                    gasLimit: 1,
                    nonce: transactionCount,
                    chainId: network.chainId
                };
                const signedHex = '0xf867018203e80194691a8d05678fc962ff0f2174134379c0051cb686881111d67bb1bb00008029a0d3ee30ea37851b40850481af6feec666c3f60c13f093ffe1da5c0db30c8b09ada033726b50332de13a9893a6dd759474876b46854cf434bfc5145ed3b46eec843c';
                stubbedProvider.getGasPrice
                    .resolves(gasPrice);
                stubbedProvider.getTransactionCount
                    .resolves(transactionCount);
                stubbedProvider.getNetwork
                    .resolves(network);
                stubbedProvider.resolveName
                    .resolves(walletAddress);
                stubbedProvider.sendTransaction
                    .withArgs(signedHex)
                    .resolves({...tx, hash: fakeTxHash});
                sinon.stub(wallet, 'sign')
                    .withArgs(tx)
                    .resolves(signedHex);

                const res = await wallet.sendTransaction(rawTx);
                expect(res).to.deep.equal({...tx, hash: fakeTxHash});
            });

            it('can deposit eth to nahmii', async () => {
                const rawTx = {
                    to: stubbedClientFundContract.address,
                    value: ethers.utils.parseEther('1.23'),
                    gasLimit: 1
                };
                sinon.stub(wallet, 'sendTransaction')
                    .withArgs(rawTx)
                    .resolves({hash: fakeTxHash});
                let {hash} = await wallet.depositEth('1.23', {gasLimit: 1});
                expect(hash).to.equal(fakeTxHash);
            });

            testTokens.forEach(t => {
                it(`can initiate the deposit of ${t.symbol} tokens to nahmii`, async () => {
                    stubbedErc20Contract.approve
                        .withArgs(stubbedClientFundContract.address, ethers.utils.parseUnits('2.71', t.decimals), {gasLimit: 1})
                        .resolves({hash: fakeTxHash});
                    const {hash} = await wallet.approveTokenDeposit('2.71', t.symbol, {gasLimit: 1});
                    expect(hash).to.eql(fakeTxHash);
                });

                it(`can complete the deposit of ${t.symbol} tokens to nahmii`, async () => {
                    stubbedClientFundContract.receiveTokens
                        .withArgs('', ethers.utils.parseUnits('2.71', t.decimals), t.currency, 0, 'ERC20', {gasLimit: 1})
                        .resolves({hash: fakeTxHash});

                    const {hash} = await wallet.completeTokenDeposit('2.71', t.symbol, {gasLimit: 1});
                    expect(hash).to.eql(fakeTxHash);
                });

                it(`rejects when deposit of ${t.symbol} can not be completed`, (done) => {
                    stubbedClientFundContract.receiveTokens
                        .rejects('some error');
                    wallet.completeTokenDeposit('2.71', t.symbol, {gasLimit: 1})
                        .catch(e => {
                            expect(e).to.match(/failed.*deposit.*some.*error/i);
                            done();
                        });
                });
            });
        });

        context('a wallet with no non-nahmii balance', () => {
            let walletBal;
            beforeEach(() => {
                walletBal = ethers.utils.bigNumberify('0');
                stubbedProvider.getBalance
                    .withArgs(walletAddress)
                    .resolves(walletBal);
                sinon.stub(wallet, 'sendTransaction').rejects('insufficient funds');
                stubbedErc20Contract.approve.rejects('insufficient funds');
                stubbedClientFundContract.receiveTokens.rejects('insufficient funds');
            });

            it('has no base layer balance', async () => {
                let result = await wallet.getBalance();
                expect(result).to.eql(walletBal);
            });

            it('can not deposit eth to nahmii', (done) => {
                wallet.depositEth('1.23', {gasLimit: 1}).catch(err => {
                    expect(err.name).to.eql('insufficient funds');
                    done();
                });
            });

            it('can not initiate deposit tokens to nahmii', (done) => {
                wallet.approveTokenDeposit('2.71', 'TT1', {gasLimit: 1}).catch(err => {
                    expect(err.message).to.match(/failed.*approve/i);
                    done();
                });
            });
        });

        context('a wallet with a staged balance', () => {
            it('can unstage eth or tokens', async () => {
                const fakeTx = {hash: 'magic tx hash 1'};
                const amount = '1.23';
                const currency = '0x0000000000000000000000000000000000000000';
                const amountBN = ethers.utils.parseUnits(amount, 18);
                stubbedClientFundContract.unstage
                    .withArgs(amountBN.toString(), currency, '0', {})
                    .resolves(fakeTx);
                const monetaryAmount = new MonetaryAmount(amountBN, currency, 0);
                let tx = await wallet.unstage(monetaryAmount);
                expect(tx).to.equal(fakeTx);
            });
        });
    });
});
