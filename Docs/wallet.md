<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [Wallet](#exp_module_nahmii-sdk--Wallet) ⏏
        * [new Wallet(signer, provider)](#new_module_nahmii-sdk--Wallet_new)
        * [.provider](#module_nahmii-sdk--Wallet+provider) ⇒ <code>NahmiiProvider</code>
        * [.address](#module_nahmii-sdk--Wallet+address) ⇒ <code>String</code>
        * [.signerKey](#module_nahmii-sdk--Wallet+signerKey) ⇒ <code>ethers.SignerKey</code> \| <code>undefined</code>
        * [.getNahmiiBalance()](#module_nahmii-sdk--Wallet+getNahmiiBalance) ⇒ <code>Promise</code>
        * [.depositEth(amountEth, [options])](#module_nahmii-sdk--Wallet+depositEth) ⇒ <code>Promise</code>
        * [.approveTokenDeposit(amount, symbol, [options])](#module_nahmii-sdk--Wallet+approveTokenDeposit) ⇒ <code>Promise</code>
        * [.completeTokenDeposit(amount, symbol, [options])](#module_nahmii-sdk--Wallet+completeTokenDeposit) ⇒ <code>Promise</code>
        * [.withdraw(monetaryAmount, [options])](#module_nahmii-sdk--Wallet+withdraw) ⇒ <code>Promise</code>
        * [.unstage(monetaryAmount, [options])](#module_nahmii-sdk--Wallet+unstage) ⇒ <code>Promise</code>
        * [.getAddress()](#module_nahmii-sdk--Wallet+getAddress) ⇒ <code>Promise.&lt;string&gt;</code>
        * [.signMessage(message)](#module_nahmii-sdk--Wallet+signMessage) ⇒ <code>Promise.&lt;string&gt;</code>
        * [.sign(transaction)](#module_nahmii-sdk--Wallet+sign) ⇒ <code>Promise.&lt;string&gt;</code>
        * [.getBalance([blockTag])](#module_nahmii-sdk--Wallet+getBalance) ⇒ <code>Promise.&lt;BigNumber&gt;</code>
        * [.getTransactionCount([blockTag])](#module_nahmii-sdk--Wallet+getTransactionCount) ⇒ <code>Promise.&lt;number&gt;</code>
        * [.sendTransaction(transaction)](#module_nahmii-sdk--Wallet+sendTransaction) ⇒ <code>Promise.&lt;TransactionResponse&gt;</code>

<a name="exp_module_nahmii-sdk--Wallet"></a>

### Wallet ⏏
Wallet
A class for performing various operations on a wallet.

**Kind**: Exported class  
<a name="new_module_nahmii-sdk--Wallet_new"></a>

#### new Wallet(signer, provider)
Create a Wallet from either a private key or custom signing functions


| Param | Type | Description |
| --- | --- | --- |
| signer | <code>string</code> \| <code>object</code> | A private key, or information required for the wallet to have signing capabilities |
| provider | <code>NahmiiProvider</code> | A NahmiiProvider instance |

<a name="module_nahmii-sdk--Wallet+provider"></a>

#### wallet.provider ⇒ <code>NahmiiProvider</code>
The Nahmii Provider used by this wallet instance.

**Kind**: instance property of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
<a name="module_nahmii-sdk--Wallet+address"></a>

#### wallet.address ⇒ <code>String</code>
Returns the address for this wallet, required by ethers Wallet
methods.

**Kind**: instance property of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
<a name="module_nahmii-sdk--Wallet+signerKey"></a>

#### wallet.signerKey ⇒ <code>ethers.SignerKey</code> \| <code>undefined</code>
If used with software wallet, returns an object containing signer related
information and logic such as the private key, otherwise undefined

**Kind**: instance property of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>ethers.SignerKey</code> \| <code>undefined</code> - The private key or undefined  
<a name="module_nahmii-sdk--Wallet+getNahmiiBalance"></a>

#### wallet.getAvaliableBalances() ⇒ <code>Promise</code>
Retrieves the avaliable nahmii balance for current wallet.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a mapping from symbol to human readable amount.  

<a name="module_nahmii-sdk--Wallet+getStagingBalances"></a>

#### wallet.getStagingBalances() ⇒ <code>Promise</code>
Retrieves all balances locked up in the process of staging for the wallet.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a mapping from symbol to human readable amount.  

<a name="module_nahmii-sdk--Wallet+getStagedBalances"></a>

#### wallet.getStagedBalances() ⇒ <code>Promise</code>
Retrieves all staged balances for current wallet.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a mapping from symbol to human readable amount.  

<a name="module_nahmii-sdk--Wallet+depositEth"></a>

#### wallet.depositEth(amountEth, [options]) ⇒ <code>Promise</code>
Initiates the deposit of ETH from the on-chain balance of the wallet to
nahmii.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a transaction with a hash.  

| Param | Type | Description |
| --- | --- | --- |
| amountEth | <code>number</code> \| <code>string</code> | The amount of ETH to deposit. |
| [options] |  |  |

**Example**  
```js
const {hash} = await wallet.depositEth('1.1', {gasLimit: 200000});
const receipt = await wallet.provider.getTransactionConfirmation(hash);
```
<a name="module_nahmii-sdk--Wallet+approveTokenDeposit"></a>

#### wallet.approveTokenDeposit(amount, symbol, [options]) ⇒ <code>Promise</code>
Initiates the deposit of a token from the wallet's on-chain balance to
nahmii by calling the approve method of the token smart contract.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a transaction with a hash.  
**See**: https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-receipts  

| Param | Type | Description |
| --- | --- | --- |
| amount | <code>number</code> \| <code>string</code> | The amount of currency to deposit. |
| symbol | <code>string</code> | The currency symbol |
| [options] |  |  |

**Example**  
```js
const {hash} = await wallet.depositToken('1.1', 'HBT', {gasLimit: 200000});
const receipt = await wallet.provider.getTransactionConfirmation(hash);
```
<a name="module_nahmii-sdk--Wallet+completeTokenDeposit"></a>

#### wallet.completeTokenDeposit(amount, symbol, [options]) ⇒ <code>Promise</code>
Initiates the completion of a deposit of a token from a wallet's on-chain
balance to nahmii by calling the depositTokens method of the nahmii
clientFund smart contract.
Requires approveTokenDeposit to have been called first.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a transaction with a hash.  

| Param | Type | Description |
| --- | --- | --- |
| amount | <code>number</code> \| <code>string</code> | The amount of currency to deposit. |
| symbol | <code>string</code> | The currency symbol |
| [options] |  |  |

**Example**  
```js
const {hash} = await wallet.completeTokenDepsoit('1.1', 'HBT', {gasLimit: 200000});
const receipt = await wallet.provider.getTransactionConfirmation(hash);
```
<a name="module_nahmii-sdk--Wallet+withdraw"></a>

#### wallet.withdraw(monetaryAmount, [options]) ⇒ <code>Promise</code>
Withdraw an amount of ETH or ERC20 tokens from nahmii to base layer.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into transaction hash.  

| Param | Type | Description |
| --- | --- | --- |
| monetaryAmount | <code>MonetaryAmount</code> | The amount to withdraw from nahmii. |
| [options] |  |  |

**Example**  
```js
let amountBN = ethers.utils.parseUnits('1.1', 18);
let currency = '0x0000000000000000000000000000000000000000'
let monetaryAmount = new nahmii.MonetaryAmount(amountBN, currency, 0)
let hashObj = await wallet.withdraw(monetaryAmount, {gasLimit: 200000});
```
<a name="module_nahmii-sdk--Wallet+unstage"></a>

#### wallet.unstage(monetaryAmount, [options]) ⇒ <code>Promise</code>
Unstage an amount of ETH or ERC20 tokens from staged balance back to
nahmii available balance.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into transaction hash.  

| Param | Type | Description |
| --- | --- | --- |
| monetaryAmount | <code>MonetaryAmount</code> | The amount unstage from staged balance. |
| [options] |  |  |

**Example**  
```js
let amountBN = ethers.utils.parseUnits('1.1', 18);
let currency = '0x0000000000000000000000000000000000000000'
let monetaryAmount = new nahmii.MonetaryAmount(amountBN, currency, 0)
let hashObj = await wallet.unstage(monetaryAmount, {gasLimit: 200000});
```
<a name="module_nahmii-sdk--Wallet+getAddress"></a>

#### wallet.getAddress() ⇒ <code>Promise.&lt;string&gt;</code>
Retrieves the wallet address.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise.&lt;string&gt;</code> - - The wallet address as a hexadecimal string  
<a name="module_nahmii-sdk--Wallet+signMessage"></a>

#### wallet.signMessage(message) ⇒ <code>Promise.&lt;string&gt;</code>
Signs message and returns a Promise that resolves to the flat-format
signature. If message is a string, it is converted to UTF-8 bytes,
otherwise it is preserved as a binary representation of the Arrayish data.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  

| Param |
| --- |
| message | 

<a name="module_nahmii-sdk--Wallet+sign"></a>

#### wallet.sign(transaction) ⇒ <code>Promise.&lt;string&gt;</code>
Signs transaction and returns a Promise that resolves to the signed
transaction as a hex string.
In general, the sendTransaction method is preferred to sign, as it can
automatically populate values asynchronously.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  

| Param |
| --- |
| transaction | 

<a name="module_nahmii-sdk--Wallet+getBalance"></a>

#### wallet.getBalance([blockTag]) ⇒ <code>Promise.&lt;BigNumber&gt;</code>
Returns the wallet instance on-chain ETH balance

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  

| Param | Type | Description |
| --- | --- | --- |
| [blockTag] | <code>string</code> | A block number to calculate from |

<a name="module_nahmii-sdk--Wallet+getTransactionCount"></a>

#### wallet.getTransactionCount([blockTag]) ⇒ <code>Promise.&lt;number&gt;</code>
Returns the wallet instance on-chain transaction count

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  

| Param | Type | Description |
| --- | --- | --- |
| [blockTag] | <code>string</code> | A block number to calculate from |

<a name="module_nahmii-sdk--Wallet+sendTransaction"></a>

#### wallet.sendTransaction(transaction) ⇒ <code>Promise.&lt;TransactionResponse&gt;</code>
Sends the transaction to the network and returns a Promise that resolves
to a Transaction Response.
Any properties that are not provided will be populated from the network.
See: https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-request

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  

| Param | Type | Description |
| --- | --- | --- |
| transaction | <code>object</code> | An unsigned Ethereum transaction |

