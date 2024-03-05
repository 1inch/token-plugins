# 1inch Token Plugins: A Comprehensive Guide for Extending ERC20 Functionalities

[Overview](#overview)

[Primary Benefits](#primary-benefits)

[Implementation](#implementation)

[Deployed Examples](#deployed-examples)

[Helpful Links](#helpful-links)

## Overview

Token plugins are smart contracts that extend the capabilities of ERC20 tokens and wrappers by adding custom accounting features to the original token. The major benefit, and a key difference from existing solutions, is that these do not require token transfers to a special smart contract, as is commonly seen in farming or delegating protocols. Another beneficial point is that once an ERC20 plugin code is deployed, it can be reused by any tokens that support the 1inch plugin standard.

Support for plugins on the side of a token is as straightforward as the usage of any other ERC20 extensions (e.g., OpenZeppelin ERC20 extensions). The deployment and usage are permissionless from the perspective of a token contract owner, since the holder is the actor who decides which plugin to subscribe to.

The token plugins standard is designed to be secure and to prevent asset loss, gas, and DoS attacks on transfers.

## Primary Benefits
- 100% permissionless from the token contract owner; open to all participants.
- Risk-free participation: Token plugins do not require any approval, deposit, or transfer of funds into an external contract for participation.
- Users can connect with multiple plugins, allowing for simultaneous involvement in multiple incentive programs or governance systems, etc. (subject to a predefined limit, set at deployment).
- Implementation is only 150 lines of code; very simple to adopt.
- Audited by top-notch firms such as OpenZeppelin, providing the highest standard of security.
- Built-in [reentrancy protection](https://github.com/1inch/token-plugins/blob/master/contracts/libs/ReentrancyGuard.sol).
- A plugin can be represented by its very own associated ERC20 (custom inheritance), enabling a participant to receive benefits for simply holding the token.
- NFT (ERC721) and Multi-token (ERC1155) support are coming soon!

## Use-Cases

Token Plugins create a massive number of possibilities in the DeFi space. The sky's the limit! 

Here are several existing (and potential) examples:
- **Alternative to staking:** Can account for different tiers of rewards based on the duration of time that a plugin-associated ERC20’s is held.
- **Farming:** Allows token holders to participate in multiple farming activities simultaneously, providing a new level of diversification and automation, all without having to deposit tokens into a farming contract.
(See [1inch Fusion pods](https://etherscan.io/address/0x806d9073136c8A4A3fD21E0e708a9e17C87129e8#code))
- **Delegation:** Useful in governance and voting, token plugins can track delegated balances, enhancing the utility of governance tokens.
- **Taxation or fee collection:** Token plugins could be used to track an account’s balances, and then call an external contract to automatically deduct a specific tax percentage based on pre-specified conditions. 
- **Loyalty points and rewards programs:** Can be applied in systems that reward users for platform usage over time. (like airline miles, credit card points, or web3 loyalty points)


## Limitations

Any plugin's processing logic consumes additional gas, with external operations that change an account balance incurring higher costs. To mitigate this, the plugin extension sets a limit on the gas consumption per plugin and caps the maximum amount of gas that can be spent.

- **Plugin Quantity:** The contract deployer should establish a limit on the number of plugins managed under the plugin management contract. 
- **Maximum amount of gas usage:** the plugin management contract limits the amount of gas any plugin can use to avoid overspent and gas attacks. It is highly recommended not to change beyond the recommended amount of 140,000.
- **Only works with transferrable tokens:** By fundamental design, plugins are unable to integrate with tokens whose balances can update without transfers (such as rebase tokens).


---

# Implementation

![ERC20Plugins](./src/img/PluginsDiagram.png)

Connecting a token contract with the 1inch Token Plugins is a straightforward process. If you’re creating a brand new token contract or migrating an existing one, you can simply inherit from the [plugin-enabled ERC20](https://github.com/1inch/token-plugins/blob/master/contracts/ERC20Plugins.sol) contract OR wrap an existing token and inherit plugin functionality within the wrapper (`contract MyWrapper is ERC20Wrapper, ERC20Plugins { ... }`). Subsequently, any plugin (deployed as a [separate contract](https://github.com/1inch/token-plugins/blob/master/contracts/Plugin.sol)) can be connected to your plugin-enabled ERC20, enabling it to track balance updates of the underlying asset efficiently. 

In other words, 1inch Token Plugins require inheritance from an independent, “plugin-enabled” ERC20 contract, which manages all related dependent plugin contracts. The plugin-enabled ERC20 contract is responsible for calling the `updateBalance` function with every change in an account’s balance.

All plugins will only track the balances of participating accounts. So all non-participants are represented as “0 addresses”. If an account is not participating in a plugin and receives a plugin-enabled token, the `From` and `To` amounts under `_updateBalances` will be represented as 0.

![participants](./src/img/_updateBalances2.png)

For security purposes, plugins are designed with several fail-safes, including a maximum number of usable plugins, custom gas limits, a reentrancy guard, and native isolation from the main contract state. The maximum plugins and gas limit can be initialized as state variables using `MAX_PLUGINS_PER_ACCOUNT` and `PLUGIN_CALL_GAS_LIMIT`, respectively. For reentrancy prevention, `ReentrancyGuardExt` is included from OpenZeppelin’s library. Finally, for native isolation from the token contract, a single method with only three arguments (`To`, `From`, and `Amount`) is used. This simple architecture results in a dynamic (and risk-free!) enhancement of any ERC20 contract’s capabilities.

When developing a new plugin, you'll have to keep the following security restrictions in mind:

- If a plugin's execution fails and reverts, it won't impact the main flow. The failed plugin is bypassed, and execution continues.
- Each plugin has a gas limit set by the parent contract. If there is insufficient gas, it won't affect the execution of the main flow.
- An account can have a limited number of plugins connected, as set by the plugin-enabled ERC20 "host" contract.
- Plugins are executed in the context specified in their contract (the parent contract uses a call, not delegatecall).
- Plugins cannot alter the state of the calling contract.
- Plugins cannot be reentered.

## How do accounts (users) add or remove a plugin?

To add a plugin to an account, a user-friendly web application can be developed and integrated with any injected wallet provider for simple account connection and signature. This simplifies the process of selecting and subscribing to plugins (see [1inch resolver plugins](https://app.1inch.io/#/1/dao/delegate)). Alternatively, an advanced user can subscribe to a plugin by directly interacting with the smart contract using a web3 wallet and the contract's ABI. Both methods require the user to initiate a transaction to call the `addPlugin` function of the token contract, which subscribes their account to the chosen plugin. To remove a plugin, the account needs to call either `removePlugin` or `removeAllPlugins`, depending on its needs.
 
---

## Examples:
**Simple plugin-enabled token contract**
```
contract NewToken is ERC20Plugins {
    constructor(string memory name, string memory symbol, uint256 maxPluginsPerAccount, uint256 pluginCallGasLimit)
        ERC20(name, symbol)
        ERC20Plugins(maxPluginsPerAccount, pluginCallGasLimit)
    {} // solhint-disable-line no-empty-blocks

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}
```
**Simple plugin contract**
```
contract MyPlugin is ERC20, Plugin {
    constructor(string memory name, string memory symbol, IERC20Plugins token_)
        ERC20(name, symbol)
        Plugin(token_)
    {} // solhint-disable-line no-empty-blocks

    function _updateBalances(address from, address to, uint256 amount) internal override {
        if (from == address(0)) {
            _mint(to, amount);
        } else if (to == address(0)) {
            _burn(from, amount);
        } else {
            _transfer(from, to, amount);
        }
    }
}
```

### Deployed Examples
- [Plugin-enabled ERC20 contract](https://arbiscan.io/token/0x36a8747fc5F09cDE48e7b8Eb073Ae911b2cBa933#code)
- [Simple Plugin contract](https://arbiscan.io/address/0x7f75495bf9a3f20b253a68a34a152c5f5587a742#code)
- [1inch Fusion (Delegated Staked 1INCH) Plugin Contract](https://etherscan.io/address/0x806d9073136c8A4A3fD21E0e708a9e17C87129e8#code)
- [1inch Fusion Staking Farm](https://etherscan.io/address/0x1A87c0F9CCA2f0926A155640e8958a8A6B0260bE#code)

## Helpful Links
- [Plugin-enabled ERC20 Token contract (abstract)](https://github.com/1inch/token-plugins/blob/master/contracts/ERC20Plugins.sol)
- [Plugin contract (abstract)](https://github.com/1inch/token-plugins/blob/master/contracts/Plugin.sol)
- [Anton Bukov speech at ETHCC](https://youtu.be/Is-T5Q2E0A8?feature=shared)
- [Kirill Kuznetcov speech at Nethermind Summit, Istanbul](https://youtu.be/BwehZHhR8Z4?feature=shared)
