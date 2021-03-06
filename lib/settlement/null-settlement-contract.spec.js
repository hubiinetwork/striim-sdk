'use strict';

const CONTRACT_NAME = 'NullSettlement';
const CONTRACT_FILE = 'null-settlement-contract';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const stubbedNahmiiContractConstructor = sinon.stub();

function createContract(walletOrProvider) {
    const NullSettlementContract = proxyquire('./' + CONTRACT_FILE, {
        '../contract': stubbedNahmiiContractConstructor
    });
    stubbedNahmiiContractConstructor
        .withArgs(CONTRACT_NAME, walletOrProvider)
        .returns(stubbedNahmiiContractConstructor);
    return new NullSettlementContract(walletOrProvider);
}

describe(CONTRACT_NAME, () => {
    const fakeProvider = {
        network: {
            chainId: '123456789',
            name: 'some network'
        }
    };
    const fakeWallet = {
        provider: fakeProvider
    };

    [
        ['wallet', fakeWallet],
        ['provider', fakeProvider]
    ].forEach(([description, walletOrProvider]) => {
        context('with ' + description, () => {
            it('is an instance of NahmiiContract', () => {
                expect(createContract(walletOrProvider)).to.be.instanceOf(stubbedNahmiiContractConstructor);
            });
        });
    });
});
