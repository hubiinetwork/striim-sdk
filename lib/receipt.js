'use strict';

/**
 * @module striim-sdk
 */

const {hashObject, sign, ethHash, isSignedBy} = require('./utils');
const Payment = require('./payment');
const MonetaryAmount = require('./monetary-amount');

const _provider = new WeakMap();
const _payment = new WeakMap();
const _hash = new WeakMap();
const _signature = new WeakMap();
const _nonce = new WeakMap();
const _senderNonce = new WeakMap();
const _recipientNonce = new WeakMap();
const _senderCurrentBalance = new WeakMap();
const _senderPreviousBalance = new WeakMap();
const _senderSingleFee = new WeakMap();
const _senderNetFee = new WeakMap();
const _recipientCurrentBalance = new WeakMap();
const _recipientPreviousBalance = new WeakMap();
const _recipientNetFees = new WeakMap();
const _netTransfer = new WeakMap();
const _singleTransfer = new WeakMap();

const PAYMENT_RECEIPT_HASHED_PROPERTIES = [
    'seals.wallet.signature.v',
    'seals.wallet.signature.r',
    'seals.wallet.signature.s',
    'nonce',
    'sender.nonce',
    'sender.balances.current',
    'sender.balances.previous',
    'sender.fees.single.currency',
    'sender.fees.single.amount',
    'sender.fees.net.*.currency',
    'recipient.nonce',
    'recipient.balances.current',
    'recipient.balances.previous',
    'recipient.fees.net.*.currency',
    'transfers.single',
    'transfers.net',
];

/**
 * @class Receipt
 * A class for modelling a _hubii striim_ payment receipt.
 * @alias module:striim-sdk
 */
class Receipt {
    constructor(provider, payment) {
        _provider.set(this, provider);
        _payment.set(this, payment);
    }

    /**
     * Will hash and sign the receipt given a private key
     * @param {String|PrivateKey} privateKey - Operator private key
     */
    sign(privateKey) {
        const h = hashObject(this.toJSON(), PAYMENT_RECEIPT_HASHED_PROPERTIES);
        const s = sign(h, privateKey);

        _hash.set(this, h);
        _signature.set(this, s);
    }

    /**
     * Verifies that the receipt is signed by both sender and exchange, and has
     * not been tampered with since.
     * @returns {Boolean}
     */
    isSigned() {
        const payment = _payment.get(this);
        if (!payment)
            return false;

        if (!payment.isSigned())
            return false;

        const serializedReceipt = this.toJSON();
        const h = hashReceipt(serializedReceipt);

        if (!serializedReceipt.seals || !serializedReceipt.seals.exchange)
            return false;

        if (h !== serializedReceipt.seals.exchange.hash)
            return false;

        const operatorAddress = _provider.get(this).operatorAddress;

        return isSignedBy(
            ethHash(serializedReceipt.seals.exchange.hash),
            serializedReceipt.seals.exchange.signature,
            operatorAddress
        );
    }

    /**
     * Converts the receipt into a JSON object
     * @returns {Object}
     */
    toJSON() {
        const payment = _payment.get(this);
        if (!payment)
            return {};

        const result = payment.toJSON();

        result.nonce = _nonce.get(this);
        result.sender.nonce = _senderNonce.get(this);
        result.sender.balances = {
            current: _senderCurrentBalance.get(this),
            previous: _senderPreviousBalance.get(this)
        };

        result.sender.fees = {};
        const senderSingleFee = _senderSingleFee.get(this);
        if (senderSingleFee)
            result.sender.fees.single = senderSingleFee.toJSON();
        const senderNetFee = _senderNetFee.get(this);
        if (senderNetFee && senderNetFee.length)
            result.sender.fees.net = senderNetFee.map(f => f.toJSON());

        result.recipient.nonce = _recipientNonce.get(this);
        result.recipient.balances = {
            current: _recipientCurrentBalance.get(this),
            previous: _recipientPreviousBalance.get(this)
        };

        const recipientNetFee = _recipientNetFees.get(this);
        if (recipientNetFee && recipientNetFee.length) {
            result.recipient.fees = {
                net: recipientNetFee.map(f => f.toJSON())
            };
        }

        result.transfers = {
            net: _netTransfer.get(this),
            single: _singleTransfer.get(this)
        };

        const hash = _hash.get(this);
        const signature = _signature.get(this);

        if (hash && signature)
            result.seals.exchange = {hash, signature};

        return result;
    }

    /**
     * Factory/de-serializing method
     * @param {StriimProvider} provider - An instance of a StriimProvider
     * @param json - A JSON object that can be de-serialized to a Receipt instance
     * @returns {Receipt}
     */
    static from(provider, json) {
        const p = Payment.from(provider, json);
        const r = new Receipt(provider, p);

        _nonce.set(r, json.nonce);

        if (json.sender) {
            _senderNonce.set(r, json.sender.nonce);
            if (json.sender.balances) {
                _senderCurrentBalance.set(r, json.sender.balances.current);
                _senderPreviousBalance.set(r, json.sender.balances.previous);
            }
            if (json.sender.fees) {
                _senderSingleFee.set(r, MonetaryAmount.from(json.sender.fees.single));
                if (json.sender.fees.net) {
                    const netFees = json.sender.fees.net.map(f => MonetaryAmount.from(f));
                    _senderNetFee.set(r, netFees);
                }
            }
        }

        if (json.recipient) {
            _recipientNonce.set(r, json.recipient.nonce);
            if (json.recipient.balances) {
                _recipientCurrentBalance.set(r, json.recipient.balances.current);
                _recipientPreviousBalance.set(r, json.recipient.balances.previous);
            }
            if (json.recipient.fees && json.recipient.fees.net) {
                const netFees = json.recipient.fees.net.map(f => MonetaryAmount.from(f));
                _recipientNetFees.set(r, netFees);
            }
        }

        if (json.transfers) {
            _netTransfer.set(r, json.transfers.net);
            _singleTransfer.set(r, json.transfers.single);
        }

        if (json.seals && json.seals.exchange) {
            _hash.set(r, json.seals.exchange.hash);
            _signature.set(r, json.seals.exchange.signature);
        }
        return r;
    }
}

function hashReceipt(serializedReceipt) {
    return hashObject(serializedReceipt, PAYMENT_RECEIPT_HASHED_PROPERTIES);
}

module.exports = Receipt;