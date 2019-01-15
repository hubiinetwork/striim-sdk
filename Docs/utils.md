## Modules

<dl>
<dt><a href="#module_nahmii-sdk/utils">nahmii-sdk/utils</a></dt>
<dd></dd>
</dl>

## Functions

<dl>
<dt><a href="#hash">hash(...args)</a> ⇒ <code>String</code></dt>
<dd><p>Hash according to <a href="https://en.wikipedia.org/wiki/SHA-3">sha3 (aka keccak-256)</a></p>
</dd>
<dt><a href="#hashObject">hashObject(obj, propertyNameGlobs, prevHashValue)</a> ⇒ <code>String</code></dt>
<dd><p>Plucks properties from an object, and hashes them according to <a href="https://en.wikipedia.org/wiki/SHA-3">sha3 (aka keccak-256)</a></p>
</dd>
<dt><a href="#prefix0x">prefix0x(str)</a> ⇒ <code>String</code></dt>
<dd><p>Make sure the string provided has a 0x prefix</p>
</dd>
<dt><a href="#strip0x">strip0x(str)</a> ⇒ <code>String</code></dt>
<dd><p>Removes 0x from the start of the string if present.</p>
</dd>
<dt><a href="#fromRpcSig">fromRpcSig(flatSig)</a> ⇒ <code>Object</code></dt>
<dd><p>Takes a flat format RPC signature and returns it in expanded form, with
s, r in hex string form, and v a number</p>
</dd>
<dt><a href="#sign">sign(message, privateKey)</a> ⇒ <code>Object</code></dt>
<dd><p>Creates a signature for the specified message the Ethereum way according to
<a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sign">eth_sign</a></p>
</dd>
<dt><a href="#isSignedBy">isSignedBy(message, signature, address)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Checks whether or not the address is the address of the private key used to
sign the specified message and signature.</p>
</dd>
<dt><a href="#sumBalances">sumBalances(...balances)</a> ⇒ <code>Object</code></dt>
<dd><p>Returns a single balance representing the sum of all balances passed
to the function.</p>
</dd>
</dl>

<a name="module_nahmii-sdk/utils"></a>

## nahmii-sdk/utils
<a name="hash"></a>

## hash(...args) ⇒ <code>String</code>
Hash according to [sha3 (aka keccak-256)](https://en.wikipedia.org/wiki/SHA-3)

**Kind**: global function  
**Returns**: <code>String</code> - 32 byte hash value as hex  

| Param |
| --- |
| ...args | 

<a name="hashObject"></a>

## hashObject(obj, propertyNameGlobs, prevHashValue) ⇒ <code>String</code>
Plucks properties from an object, and hashes them according to [sha3 (aka keccak-256)](https://en.wikipedia.org/wiki/SHA-3)

**Kind**: global function  
**Returns**: <code>String</code> - 32 byte hash value as hex  

| Param | Type |
| --- | --- |
| obj | <code>Object</code> | 
| propertyNameGlobs | <code>Array.&lt;String&gt;</code> | 
| prevHashValue | <code>String</code> | 

<a name="prefix0x"></a>

## prefix0x(str) ⇒ <code>String</code>
Make sure the string provided has a 0x prefix

**Kind**: global function  
**Returns**: <code>String</code> - Input prefixed with 0x if not already present.  

| Param |
| --- |
| str | 

<a name="strip0x"></a>

## strip0x(str) ⇒ <code>String</code>
Removes 0x from the start of the string if present.

**Kind**: global function  
**Returns**: <code>String</code> - Input without any 0x prefix.  

| Param |
| --- |
| str | 

<a name="fromRpcSig"></a>

## fromRpcSig(flatSig) ⇒ <code>Object</code>
Takes a flat format RPC signature and returns it in expanded form, with
s, r in hex string form, and v a number

**Kind**: global function  
**Returns**: <code>Object</code> - Expanded form signature  

| Param | Type | Description |
| --- | --- | --- |
| flatSig | <code>String</code> | Flat form signature |

<a name="sign"></a>

## sign(message, privateKey) ⇒ <code>Object</code>
Creates a signature for the specified message the Ethereum way according to
[eth_sign](https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sign)

**Kind**: global function  
**Returns**: <code>Object</code> - Signature as an object literal with r, s and v properties.  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>String</code> | hexadecimal string |
| privateKey | <code>String</code> | hexadecimal string |

<a name="isSignedBy"></a>

## isSignedBy(message, signature, address) ⇒ <code>Boolean</code>
Checks whether or not the address is the address of the private key used to
sign the specified message and signature.

**Kind**: global function  
**Returns**: <code>Boolean</code> - True if address belongs to the signed message  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>String</code> | A message hash as a hexadecimal string |
| signature | <code>Object</code> | The signature of the message given as V, R and S properties |
| address | <code>String</code> | A hexadecimal representation of the address to verify |


<a name="sumBalances"></a>

## sumBalances(...balances) ⇒ <code>Object</code>
Returns a single balance representing the sum of all balances passed
to the function.

**Kind**: global function  
**Returns**: <code>Object</code> - A single balance

| Param | Type | Description |
| --- | --- | --- |
| balances | <code>...Object</code> | Any amount of balances

**Example**  
```js
const bal1 = {
  ETH: '5'
}
const bal2 = {
  ETH: '5',
  HBT: '5'
}
console.log(sumBalances(bal1, bal2));
// { ETH: '10', HBT: '5' }
```
