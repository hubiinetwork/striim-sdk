# NAHMII BY HUBII SDK

## About the SDK

This is a javascript library that wraps the _hubii nahmii_ APIs making them
easier to get started with.

## About nahmii

_nahmii_ is _hubii_'s scaling solution for the Ethereum block chain. It is a
hybrid centralized/decentralized solution that enables instant
(micro-) payments, trading and trustless settlements.

## About hubii

See www.hubii.com for more information.

## Prerequisites

* To use this software you need a modern version of **NodeJS and NPM**.
  We recommend having the current LTS version (v8.x) installed, or
  later, and updating NPM to the latest available version.
* You will also need an **API key** for access to _hubii_'s APIs.

## Installation

To install the SDK into your project, simply run:

    npm install nahmii-sdk

## Usage

Create a provider to gain access to the low-level SDK:

```javascript

    const nahmii = require('nahmii-sdk');

    const provider = new nahmii.NahmiiProvider(nahmii_base_url, nahmii_app_id, nahmii_app_secret);

```

The provider can be used to gain access to the API resources, such as a
wallet's balance:

```javascript

    const nahmii = require('nahmii-sdk');
    const provider = new nahmii.NahmiiProvider(nahmii_base_url, nahmii_app_id, nahmii_app_secret);

    // Logs all avaliable assets of the specified wallet to the console
    provider.getAvaliableBalances(wallet_address).then(console.log);

```

To do make more advanced workflows as easy as possible there is also a higher
level SDK, e.g.: the Wallet class and the Payment class. In this example we
create a payment, sign it and register it with the API:

```javascript

    const nahmii = require('nahmii-sdk');
    const provider = new nahmii.NahmiiProvider(nahmii_base_url, nahmii_app_id, nahmii_app_secret);
    const wallet = new nahmii.Wallet(private_key, provider);

    // Creates a new Payment, providing essential inputs such as the amount,
    // the currency, the sender, and the recipient.
    const monetaryAmount = new nahmii.MonetaryAmount(amount, erc20_token_address);
    const payment = new nahmii.Payment(wallet, monetaryAmount, wallet_address, recipient_address);

    // Signs the payment with the wallet passed during instantiation
    payment.sign();

    // Sends the signed payment to the API for registration and execution and
    // logs the API response to the console.
    payment.register().then(console.log);

```

## Reference manual

* [class NahmiiProvider](Docs/nahmii-provider.md)
* [class Wallet](Docs/wallet.md)
* [class Payment](Docs/payment.md)
* [class Receipt](Docs/receipt.md)
* [class MonetaryAmount](Docs/monetary-amount.md)
* [class utils](Docs/utils.md)
