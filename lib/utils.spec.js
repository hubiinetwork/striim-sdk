'use strict';

const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const {privateToAddress, ecsign} = require('ethereumjs-util');
const {soliditySha3} = require('web3-utils');

const utils = require('./utils');

describe('#prefix0x()', () => {
    [
        undefined,
        null,
        123,
        {},
        [],
        '',
        '0x123',
        '0x',
        '0xSome String'
    ].forEach(input => {
        it(`returns ${JSON.stringify(input)} unmodified`, () => {
            expect(utils.prefix0x(input)).to.eql(input);
        });
    });

    [
        ['0', '0x0'],
        ['1', '0x1'],
        ['some string', '0xsome string'],
        ['0x0x0xTEST', '0xTEST']
    ].forEach(([input, expected]) => {
        it(`returns input ${JSON.stringify(input)} as ${JSON.stringify(expected)}`, () => {
            expect(utils.prefix0x(input)).to.eql(expected);
        });
    });
});

describe('#strip0x()', () => {
    [
        undefined,
        null,
        123,
        {},
        [],
        '',
        '123123',
        'Some String'
    ].forEach(input => {
        it(`returns ${JSON.stringify(input)} unmodified`, () => {
            expect(utils.strip0x(input)).to.eql(input);
        });
    });

    [
        ['0x', ''],
        ['0x0', '0'],
        ['0x1', '1'],
        ['0xSome String', 'Some String'],
        ['0x0x0x0', '0']
    ].forEach(([input, expected]) => {
        it(`returns input ${JSON.stringify(input)} as ${JSON.stringify(expected)}`, () => {
            expect(utils.strip0x(input)).to.eql(expected);
        });
    });
});

describe('#hashObject()', () => {

    describe('when success', () => {

        [
            {
                description: 'Simple object hash',
                hashProperties: [
                    'firstName',
                    'lastName'
                ],
                obj: {
                    firstName: 'Vitalik',
                    lastName: 'Buterin'
                },
                expectedHash: utils.hash('Vitalik', 'Buterin')
            },
            {
                description: 'Nested properties',
                hashProperties: [
                    'name.firstName',
                    'name.lastName',
                    'age'
                ],
                obj: {
                    name: {
                        firstName: 'Vitalik',
                        lastName: 'Buterin'
                    },
                    age: 24
                },
                expectedHash: utils.hash('Vitalik', 'Buterin', 24)
            },
            {
                description: 'All numbers in an array',
                hashProperties: [
                    'someArray.*'
                ],
                obj: {
                    someArray: [1, 2, 3]
                },
                expectedHash: utils.hash(1, 2, 3)
            },
            {
                description: 'All objects in an array',
                hashProperties: [
                    'someArray.*'
                ],
                obj: {
                    someArray: [{propA: 1}, {propB: 2}, {propA: 3, propB: 4}]
                },
                expectedHash: utils.hash(1, 2, 3, 4)
            },
            {
                description: 'Specific properties from objects in an array',
                hashProperties: [
                    'someArray.*.propB'
                ],
                obj: {
                    someArray: [{propA: 1, propB: 2}, {propB: 3}, {
                        propA: 4,
                        propB: 5
                    }]
                },
                expectedHash: utils.hash(2, 3, 5)
            },
            {
                description: 'Recursive hashing',
                hashProperties: [
                    [
                        'name.firstName',
                        ['name.lastName']
                    ],
                    'age'
                ],
                obj: {
                    name: {
                        firstName: 'Vitalik',
                        lastName: 'Buterin'
                    },
                    age: 24
                },
                expectedHash: utils.hash(
                    utils.hash(
                        'Vitalik', utils.hash('Buterin')
                    ), 
                    24
                )
            },
            {
                description: 'Recursive array hashing',
                hashProperties: [
                    'someArray.[]', 'propA', 'propB'
                ],
                obj: {
                    someArray: [{propA: 1, propB: 2}, {propA: 6, propB: 3}, {
                        propA: 4,
                        propB: 5
                    }]
                },
                expectedHash: utils.hash(utils.hash(utils.hash(0, 1, 2), 6, 3), 4, 5)
            },
            {
                description: 'Hash empty recursive array',
                hashProperties: [
                    'someArray.[]', 'propA', 'propB'
                ],
                obj: {
                    someArray: []
                },
                expectedHash: 0
            }
        ].forEach(({description, hashProperties, obj, expectedHash}) => {
            describe(description, () => {
                it('calculates expected hash', () => {
                    const actualHash = utils.hashObject(obj, hashProperties);
                    expect(actualHash).to.eql(expectedHash);
                });
            });
        });
    });

    describe('when obj is missing a value', () => {

        it('throws error', () => {
            const hashProperties = [
                'name.firstName',
                'name.lastName',
                'age'
            ];
            const obj = {
                name: {
                    firstName: 'Vitalik'
                },
                age: 24
            };

            let error;
            try {
                utils.hashObject(obj, hashProperties);
            }
            catch (err) {
                error = err;
            }
            expect(error).to.exist;
            expect(error.message).to.match(/Expected property "name.lastname" does not exist on object/i);
        });
    });

    context('given a glob pattern matching a non-array property', () => {
        it('throws an error', function() {
            const obj = {notAnArray: 123};
            const hashProperties = ['notAnArray.*'];
            expect(() => utils.hashObject(obj, hashProperties)).to.throw(/Expected property "notAnArray\.\*" does not exist on object/);
        });
    });

    context('given a glob pattern not matching any property', () => {
        it('throws an error', function() {
            const obj = {propA: 123};
            const hashProperties = ['someOtherProp.*'];
            expect(() => utils.hashObject(obj, hashProperties)).to.throw(/Expected property "someOtherProp\.\*" does not exist on object/);
        });
    });
});

describe('#sign()', () => {
    it('generates signature based on a message re-hashed with eth prefix', () => {
        const privateKey = '3a1076bf45ab87712ad64ccb3b10217737f7faacbf2872e88fdd9a537d8fe266';
        const pk = new Buffer(privateKey, 'hex');
        const message = soliditySha3('some data');
        const ethMessage = utils.strip0x(soliditySha3('\x19Ethereum Signed Message:\n32', message));
        const ethMessageBuf = new Buffer(ethMessage, 'hex');
        const ecsignature = ecsign(ethMessageBuf, pk);
        const expectedSignature = {
            v: ecsignature.v,
            r: utils.prefix0x(ecsignature.r.toString('hex')),
            s: utils.prefix0x(ecsignature.s.toString('hex'))
        };
        expect(utils.sign(message, privateKey)).to.eql(expectedSignature);
    });
});

describe('#isSignedBy()', () => {
    const privateKey = '3a1076bf45ab87712ad64ccb3b10217737f7faacbf2872e88fdd9a537d8fe266';
    const valid = {
        message: utils.hash('some hashed data'),
        signature: utils.sign(utils.hash('some hashed data'), privateKey),
        address: privateToAddress(new Buffer(privateKey, 'hex')).toString('hex')
    };

    context('an address matching message and signature combo', () => {
        [
            utils.strip0x(valid.address),
            utils.prefix0x(valid.address),
            valid.address.toUpperCase(),
            valid.address.toLowerCase()
        ].forEach(address => {
            it('returns true for ' + address, () => {
                expect(utils.isSignedBy(valid.message, valid.signature, valid.address)).to.be.true;
            });
        });
    });

    context('an address not matching message and signature combo', () => {
        [
            '0x0000000000000000000000000000000000000001',
            '',
            null,
            undefined
        ].forEach(otherAddress => {
            it('returns false for ' + JSON.stringify(otherAddress), () => {
                expect(utils.isSignedBy(valid.message, valid.signature, otherAddress)).to.be.false;
            });
        });
    });
});

describe('#sumBalances()', () => {
    const posBal1 = {
        ETH: '0.01',
        HBT: '5.91'
    };
    const posBal2 = {
        ETH: '0.1',
        HBT: '500',
        BOKKY: '12'
    };
    const posBal3 = {
        ETH: '12'
    };
    const negBal = {
        ETH: '-40'
    };
    const emptyBal = {};
    context('single balance', () => {
        it('returns the input', () => {
            expect(utils.sumBalances(posBal1)).to.deep.equal(posBal1);
        });
    });

    context('three balances', () => {
        it('returns the correct sum', () => {
            const sum = {
                ETH: '12.11',
                HBT: '505.91',
                BOKKY: '12'
            };
            expect(utils.sumBalances(posBal1, posBal2, posBal3)).to.deep.equal(sum);
        });
    });

    context('negative balance', () => {
        it('returns the correct sum', () => {
            const sum = {
                ETH: '-39.99',
                HBT: '5.91'
            };
            expect(utils.sumBalances(posBal1, negBal)).to.deep.equal(sum);
        });
    });

    context('one balance is empty', () => {
        it('returns the correct sum', () => {
            const sum = {
                ETH: '-39.99',
                HBT: '5.91'
            };
            expect(utils.sumBalances(posBal1, emptyBal, negBal)).to.deep.equal(sum);
        });
    });
});
