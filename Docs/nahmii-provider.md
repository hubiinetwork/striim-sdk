<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [NahmiiProvider](#exp_module_nahmii-sdk--NahmiiProvider) ⏏
        * [new NahmiiProvider(nahmiiBaseUrl, apiAppId, apiAppSecret)](#new_module_nahmii-sdk--NahmiiProvider_new)
        * [.isUpdating](#module_nahmii-sdk--NahmiiProvider+isUpdating) ⇒ <code>boolean</code>
        * [.startUpdate()](#module_nahmii-sdk--NahmiiProvider+startUpdate)
        * [.stopUpdate()](#module_nahmii-sdk--NahmiiProvider+stopUpdate)
        * [.getApiAccessToken()](#module_nahmii-sdk--NahmiiProvider+getApiAccessToken) ⇒ <code>Promise</code>
        * [.getSupportedTokens()](#module_nahmii-sdk--NahmiiProvider+getSupportedTokens) ⇒ <code>Promise</code>
        * [.getNahmiiBalances(address)](#module_nahmii-sdk--NahmiiProvider+getNahmiiBalances) ⇒ <code>Promise</code>
        * [.getPendingPayments()](#module_nahmii-sdk--NahmiiProvider+getPendingPayments) ⇒ <code>Promise</code>
        * [.registerPayment(payment)](#module_nahmii-sdk--NahmiiProvider+registerPayment) ⇒ <code>Promise</code>
        * [.effectuatePayment(receipt)](#module_nahmii-sdk--NahmiiProvider+effectuatePayment) ⇒ <code>Promise</code>
        * [.getAllReceipts()](#module_nahmii-sdk--NahmiiProvider+getAllReceipts) ⇒ <code>Promise</code>
        * [.getTransactionConfirmation()](#module_nahmii-sdk--NahmiiProvider+getTransactionConfirmation) ⇒ <code>Promise</code>

<a name="exp_module_nahmii-sdk--NahmiiProvider"></a>

### NahmiiProvider ⏏
NahmiiProvider
A class providing low-level access to the _hubii nahmii_ APIs.

**Kind**: Exported class  
<a name="new_module_nahmii-sdk--NahmiiProvider_new"></a>

#### new NahmiiProvider(nahmiiBaseUrl, apiAppId, apiAppSecret)
Construct a new NahmiiProvider.


| Param | Type | Description |
| --- | --- | --- |
| nahmiiBaseUrl | <code>string</code> | The base URL (domain name) for the nahmii API |
| apiAppId | <code>string</code> | nahmii API app-ID |
| apiAppSecret | <code>string</code> | nahmii API app-secret |

<a name="module_nahmii-sdk--NahmiiProvider+isUpdating"></a>

#### nahmiiProvider.isUpdating ⇒ <code>boolean</code>
Returns the state of the API access token update process.

**Kind**: instance property of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>boolean</code> - True if the update is running, false otherwise.  
<a name="module_nahmii-sdk--NahmiiProvider+startUpdate"></a>

#### nahmiiProvider.startUpdate()
Force provider to start updating the API access token once a minute. The
update will continue until stopUpdate() is called.
Using any methods that require an API access token will automatically
start the update process.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
<a name="module_nahmii-sdk--NahmiiProvider+stopUpdate"></a>

#### nahmiiProvider.stopUpdate()
Stops the automatic update of API access tokens. This should be called
when you want to terminate/delete the provider to ensure there are no
lingering references.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
<a name="module_nahmii-sdk--NahmiiProvider+getApiAccessToken"></a>

#### nahmiiProvider.getApiAccessToken() ⇒ <code>Promise</code>
Resolves into the current token, or will obtain a new token from the
server as needed.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into an API access token  
<a name="module_nahmii-sdk--NahmiiProvider+getSupportedTokens"></a>

#### nahmiiProvider.getSupportedTokens() ⇒ <code>Promise</code>
Retrieves the list of tokens (currencies) supported by _hubii nahmii_.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into an array of token definitions.  
<a name="module_nahmii-sdk--NahmiiProvider+getNahmiiBalances"></a>

#### nahmiiProvider.getNahmiiBalances(address) ⇒ <code>Promise</code>
Retrieves the balances for all available tokens for the specified wallet address.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into a array of balance information.  

| Param | Type |
| --- | --- |
| address | <code>Address</code> | 

<a name="module_nahmii-sdk--NahmiiProvider+getPendingPayments"></a>

#### nahmiiProvider.getPendingPayments() ⇒ <code>Promise</code>
Retrieves all pending payments that have not yet been effectuated by the
server.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into an array of registered payments  
<a name="module_nahmii-sdk--NahmiiProvider+registerPayment"></a>

#### nahmiiProvider.registerPayment(payment) ⇒ <code>Promise</code>
Registers a payment with the server to have it effectuated. The payment
is expected to be hashed and signed according to the _hubii nahmii_
protocol.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into a registered payment payload  

| Param | Description |
| --- | --- |
| payment | A JSON object of a serialized signed Payment |

<a name="module_nahmii-sdk--NahmiiProvider+effectuatePayment"></a>

#### nahmiiProvider.effectuatePayment(receipt) ⇒ <code>Promise</code>
Registers a receipt with the server to effectuate the transfer. The
receipt is expected to be hashed and signed according to the
_hubii nahmii_ protocol.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolved into a receipt registration payload  

| Param | Description |
| --- | --- |
| receipt | A JSON object of a serialized signed Receipt |

<a name="module_nahmii-sdk--NahmiiProvider+getAllReceipts"></a>

#### nahmiiProvider.getAllReceipts() ⇒ <code>Promise</code>
Retrieves all receipts for effectuated payments from the server.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into an array of payment receipts  

<a name="module_nahmii-sdk--NahmiiProvider+getTransactionConfirmation"></a>

#### nahmiiProvider.getTransactionConfirmation() ⇒ <code>Promise</code>
Waits for a transaction to be mined, polling every second. Rejects if a transaction is mined, but fails to execute, for example in an out of gas scenario.
**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into an a transaction receipt  