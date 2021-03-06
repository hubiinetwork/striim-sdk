'use strict';

const chai = require('chai');
const sinon = require('sinon');
chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));

const expect = chai.expect;
const given = describe;
const when = describe;

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

class Contract {
    constructor(addr, abi, signerOrProvider) {
        this.address = addr;
        this.abi = abi;
        this.signerOrProvider = signerOrProvider;
    }
}

const fakeEthers = {
    Contract
};

const fakeDeployment = {
    networks: {
        '123456789': {
            address: '0x1234567890123456789012345678901234567890'
        }
    },
    abi: []
};

const fakeProvider = {
    network: {
        chainId: '123456789',
        name: 'some network name'
    },
    getClusterInformation: sinon.stub(),
    getCode: sinon.stub()
};

const fakeWallet = {
    provider: fakeProvider
};

const stubbedContractAbstractions = {
    get: sinon.stub()
};

const proxyquireNahmiiContract = function() {
    return proxyquire('./index', {
        'ethers': fakeEthers,
        './abstractions': stubbedContractAbstractions
    });
};

describe('NahmiiContract', () => {
    let NahmiiContract, clusterInformation;

    beforeEach(() => {
        NahmiiContract = proxyquireNahmiiContract();
        clusterInformation = {
            ethereum: {
                contracts: {
                    contract1: '0x0000000000000000000000000000000000000001',
                    contract2: '0x0000000000000000000000000000000000000002',
                    SomeContractAbstraction: fakeDeployment.networks['123456789'].address,
                    contract3: '0x0000000000000000000000000000000000000003'
                },
                net: fakeProvider.network.name
            }
        };
        fakeProvider.getClusterInformation.resolves(clusterInformation);
        fakeProvider.getCode.resolves('0xabcdef122345678');

        stubbedContractAbstractions.get
            .withArgs(fakeProvider.network.name, 'SomeContractAbstraction')
            .returns(fakeDeployment);

        sinon.stub(console, 'warn');
    });

    afterEach(() => {
        console.warn.restore();
    });

    [
        ['wallet', fakeWallet],
        ['provider', fakeProvider]
    ].forEach(([description, walletOrProvider]) => {
        describe(`given a valid contract and a ${description}`, () => {
            let contract;

            beforeEach(() => {
                contract = new NahmiiContract('SomeContractAbstraction', walletOrProvider);
            });

            it('is an instance of Contract', () => {
                expect(contract).to.be.an.instanceOf(Contract);
            });

            it('uses correct contract address in construction', () => {
                expect(contract.address).to.eql(fakeDeployment.networks['123456789'].address);
                expect(contract.abi).to.eql(fakeDeployment.abi);
                expect(contract.signerOrProvider).to.equal(walletOrProvider);
            });

            describe('given a name and address that exist in the cluster', () => {
                it('can be validated', async () => {
                    expect(await contract.validate()).to.be.true;
                });
            });

            describe('given a name that does not exist in the cluster', () => {
                beforeEach(() => {
                    delete clusterInformation.ethereum.contracts.SomeContractAbstraction;
                });

                it('can not be validated', async () => {
                    expect(await contract.validate()).to.be.false;
                });
            });

            describe('given a valid name but incorrect address', () => {
                beforeEach(() => {
                    clusterInformation.ethereum.contracts.SomeContractAbstraction = '0x0000000000111111111122222222223333333333';
                });

                it('can not be validated', async () => {
                    expect(await contract.validate()).to.be.false;
                });
            });

            describe('given a valid name but registered address is corrupt', () => {
                beforeEach(() => {
                    clusterInformation.ethereum.contracts.SomeContractAbstraction = 'corrupt';
                });

                it('can not be validated', async () => {
                    expect(await contract.validate()).to.be.false;
                });
            });

            describe('given a valid name but corrupt address', () => {
                beforeEach(() => {
                    contract.address = '';
                });

                it('can not be validated', async () => {
                    expect(await contract.validate()).to.be.false;
                });
            });

            describe('given a mismatching network for the cluster', () => {
                beforeEach(() => {
                    clusterInformation.ethereum.net = 'whatevs network';
                });

                it('can not be validated', async () => {
                    expect(await contract.validate()).to.be.false;
                });
            });

            describe('given missing contract code', () => {
                beforeEach(() => {
                    fakeProvider.getCode.resolves('0x');
                });

                it('can not be validated', async () => {
                    expect(await contract.validate()).to.be.false;
                });
            });

            describe('abi contains invalid address (syntax)', () => {
                let contract;

                beforeEach(() => {
                    stubbedContractAbstractions.get
                        .withArgs(fakeProvider.network.name, 'SomeContractAbstraction')
                        .returns({
                            networks: {
                                '123456789': {
                                    address: 'not a valid address'
                                }
                            },
                            abi: []
                        });

                    contract = new NahmiiContract('SomeContractAbstraction', walletOrProvider);
                });

                it('can not be validated', async () => {
                    expect(await contract.validate()).to.be.false;
                });
            });
        });
    });

    given ('a contract factory', () => {
        when('creating an invalidated contract', () => {

            it ('returns contract if it is valid', () => {
                return expect(NahmiiContract.from('SomeContractAbstraction', fakeProvider)).to.eventually.be.instanceOf(NahmiiContract).then(() => {
                    expect(console.warn.callCount).to.be.equal(0);
                });
            });

            it ('returns null if contract is invalid and ACCEPT_INVALID_CONTRACTS is not set', () => {
                delete clusterInformation.ethereum.contracts.SomeContractAbstraction;
                delete process.env['ACCEPT_INVALID_CONTRACTS'];
                return expect(NahmiiContract.from('SomeContractAbstraction', fakeProvider)).to.eventually.be.null.then(() => {
                    expect(console.warn.callCount).to.be.gt(0);
                });
            });

            it ('logs warning if contract is invalid and ACCEPT_INVALID_CONTRACTS is set', () => {
                delete clusterInformation.ethereum.contracts.SomeContractAbstraction;
                process.env['ACCEPT_INVALID_CONTRACTS'] = 1;
                return expect(NahmiiContract.from('SomeContractAbstraction', fakeProvider)).to.eventually.be.instanceOf(NahmiiContract).then(() => {
                    expect(console.warn.callCount).to.be.gt(0);
                });
            });
        });
    });

    describe('when contract abstraction can not be loaded', () => {
        beforeEach(() => {
            stubbedContractAbstractions.get.throws(new Error('reasons'));
        });

        it('throws an error', () => {
            expect(
                () => new NahmiiContract('invalid contract name', fakeWallet)
            ).to.throw(Error, /reasons/i);
        });
    });

});
