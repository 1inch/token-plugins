# 1inch Token Plugins: A Comprehensive Guide for Extending ERC20 Functionalities

[Overview](#overview)

[Primary Benefits](#primary-benefits)

[Implementation](#implementation)

[Overview of Contract Structure](#overview-of-contract-structure)
   - [ERC20Plugins.sol (Abstract Plugin-enabled ERC20 contract)](#erc20pluginssol-plugin-enabled-erc20-token-contract)
   - [Plugin.sol (Abstract Plugin contract)](#pluginsol-abstract-plugin-contract)

[Deployed Examples](#deployed-examples)

[Helpful Links](#helpful-links)

## Overview

Token plugins are smart contracts that extend the capabilities of plugin-enabled and plugin-enabled wrapped ERC20 tokens. They allow for additional accounting to be added, without the need to deposit your tokens into a contract. **_This is a revolutionary step in the evolution of DeFi_**, as the entire ecosystem has historically relied upon the transfer of tokens in and out of external contracts to achieve enhanced capabilities! 

By design, token plugins prevent several common attack vectors and inherently create a fundamental level of security within every token incentive mechanism. Users no longer have to trust their funds in an external contract, whether it be for farming, borrowing/lending, or delegating, etc., therefore adding a fundamental layer of security.

## Primary Benefits
- 100% permissionless, open to all participants.
- Risk-free participation: Token plugins can only update with an account’s balance change. They cannot approve, mint, burn, transfer, or overwrite storage.
- Users can connect multiple plugins, allowing for simultaneous participation in multiple incentive programs or governance systems, etc.
- Implementation is less than 100 lines of code; very simple to adopt.
- Heavily audited by OpenZeppelin, providing the highest standard of security.
- Built-in [reentrancy protection](https://github.com/1inch/token-plugins/blob/master/contracts/libs/ReentrancyGuard.sol).
- A plugin can be represented by its very own associated ERC20 (custom inheritance).
- NFT (ERC721) and Multi-token (ERC1155) support are coming soon!

This new system embodies the core principles of Web3 technology - decentralization, security, and user empowerment. Token Plugins are designed to seamlessly integrate with and enhance existing token contracts and incentive structures, providing a simple solution for token utility and interoperability.

## Use-Cases

Token Plugins create a massive number of possibilities in the DeFi space. The sky's the limit! Here are several existing (and potential) examples:

- **Complex staking:** Can offer different tiers of rewards based on the duration of the stake (or amount staked).
- **Farming:** Allows token holders to participate in multiple farming activities simultaneously, providing a new level of diversification and automation, all without having to deposit tokens into a farming contract. (See [1inch Fusion pods](https://etherscan.io/address/0x806d9073136c8A4A3fD21E0e708a9e17C87129e8#code))
- **Delegation:** Useful in governance and voting, token plugins can track delegated balances, enhancing the utility of governance tokens. 
- **Conditional transactions and/or escrow:** A plugin could allow tokens to be locked until certain conditions are met, like the completion of a service, time-based milestones, or the achievement of any custom milestone. (Think service economy like Uber or AirBnB etc.)
- **Taxation or fee collection:** Token plugins can be used to track an account’s balances and automatically deduct a specific tax percentage based on pre-specified conditions.
- **Loyalty points and rewards programs:** Can be applied in systems that reward users for platform usage over time. (like airline miles, credit card points, or web3 loyalty points)

## Limitations

- **Plugin Quantity:** The contract deployer can establish a limit on the number of plugins managed under the plugin management contract.
- **Increased Gas Consumption:** Additional gas is consumed due to the processing logic of the token plugins. A custom gas limit constructor is included to mitigate this.


---

# Implementation

![ERC20Plugins](https://i.imgur.com/5195e7b.png)

Connecting a token contract with the 1inch Token Plugins is a straightforward process. If you’re creating a brand new token contract or migrating an existing one, you can simply inherit from the [plugin-enabled ERC20](https://github.com/1inch/token-plugins/blob/master/contracts/ERC20Plugins.sol) contract OR wrap an existing token and inherit plugin functionality within the wrapper (`contract MyWrapper is ERC20Wrapper, ERC20Plugins { ... }`). Subsequently, any plugin (deployed as a [separate contract](https://github.com/1inch/token-plugins/blob/master/contracts/Plugin.sol)) can be connected to your plugin-enabled ERC20, enabling it to track balance updates of the underlying asset efficiently. 

In other words, 1inch Token Plugins require inheritance from an independent, “plugin-enabled” ERC20 contract, which manages all related dependent plugin contracts. The plugin-enabled ERC20 contract is responsible for calling the `updateBalance` function with every change in an account’s balance.

All plugins will only track the balances of participating accounts. So all non-participants are represented as “0 addresses”. If an account is not participating in a plugin and receives a plugin-enabled token, the `From` and `To` amounts under `_updateBalances` will be represented as 0.

![participants](https://i.imgur.com/Igap8XI.png)

Therefore, if a non-participant sends a plugin-enabled token to an existing participant, it will effectively “mint” the tracked balance. If a participant sends a plugin-enabled token to a non-participant, it will effectively “burn” the tracked balance.

![Token Transfers](https://i.imgur.com/P0qgHdk.png)

For security purposes, plugins are designed with several fail-safes, including a maximum number of usable plugins, custom gas limits, a reentrancy guard, and native isolation from the main contract state. The maximum plugins and gas limit can be initialized as state variables using `MAX_PLUGINS_PER_ACCOUNT` and `PLUGIN_CALL_GAS_LIMIT`, respectively. For reentrancy prevention, `ReentrancyGuardExt` is included from OpenZeppelin’s library. Finally, for native isolation from the token contract, a single method with only three arguments (`To`, `From`, and `Amount`) is used. This simple architecture results in a dynamic (and risk-free!) enhancement of any ERC20 contract’s capabilities.

## How do accounts (users) add or remove a plugin?

To add a plugin to an account, a user-friendly web application can be developed and integrated with any injected wallet provider for simple account connection and signature. This simplifies the process of selecting and subscribing to plugins (see [1inch resolver plugins](https://app.1inch.io/#/1/dao/delegate)). Alternatively, an advanced user can subscribe to a plugin by directly interacting with the smart contract using a web3 wallet and the contract's ABI. Both methods require the user to initiate a transaction to call the `addPlugin` function of the token contract, which subscribes their account to the chosen plugin. To remove a plugin, the account needs to call either `removePlugin` or `removeAllPlugins`, depending on its needs.
 

---

# Overview of Contract Structure

## ERC20Plugins.sol (Plugin-enabled ERC20 Token Contract)
- Native inheritance from OpenZeppelin’s ERC20 library (for turnkey deployment)
-  token contract if creating a new ERC20 token, OR can be inherited as a wrapper for a pre-existing “non-plugin-enabled” token
- Main function: `updateBalances` - Calls to each connected plugin

### Includes

- **State Variables** (initialized in the constructor):
  - `MAX_PLUGINS_PER_ACCOUNT`: Restricts the maximum number of plugins that a token can connect to.
  - `PLUGIN_CALL_GAS_LIMIT`: Specifies the maximum amount of gas that can be spent for any given call.
  - `ReentrancyGuardExt`: Imported reentrancy protection from OpenZeppelin’s library.

#### Functions

- `_updateBalances` 
  - Returns balance updates from the plugin upon each relevant event. This allows the plugin to execute it's custom logic and extend the plugin-enabled ERC20 token's functionality.
  - Ensures gas usage does not breach the limit set within `PLUGIN_CALL_GAS_LIMIT`.
- `balanceOf`: Returns the entire token balance of an account.
- `pluginBalanceOf`: Returns the balance of a token for a specific plugin.
- `hasPlugin`: Checks to see if a specific plugin is associated with an account.
- `pluginsCount`: Returns the total number of plugins associated with a specific account.
- `pluginAt`: Returns the address for a specific plugin, based on its position in the list of total plugins associated with an account.
- `Plugins`: Returns a list of all plugins associated with a particular account.
- `addPlugin`: Connects an account with a specific plugin.
- `removePlugin`: Disables a specific plugin associated with an account.
- `removeAllPlugins`: Disables all plugins associated with an account.
- `Update`: Overrides the classic ERC20 balance update, and is expanded to include plugin mechanics (`updateBalances`). Only called on mint, burn, or transfer events.

## Plugin.sol (Plugin Contract)

- A basic template for plugin creation.
- Tracks an account’s balances through `_updateBalances`.
- Provides advanced functionalities, such as farming, delegation, etc., without moving tokens.

### Includes

#### Interfaces

- `IPlugin`: Interface for plugin functionalities.
- `IERC20Plugins`: Interface linking the plugin with a plugin-enabled ERC20 token.
  
#### State Variable

- `TOKEN`: Public immutable variable storing the reference to the parent ERC20 token contract.

#### Modifiers

- `onlyToken`: Ensures that certain functions can be called only by the associated plugin-enabled token contract.
  
#### Functions

- `updateBalances`: An external function that updates account balances within the plugin. It can only be called by the token contract itself. (see `onlyToken` modifier)
- `_updateBalances`: An abstract internal function, to be implemented in derived contracts. Responsible for the actual logic of updating balances within the plugin itself. 
  - Note: Within `_updateBalances`, 'from' and 'to' amounts can be 0 for non-participants.

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

## Other Helpful Links
- [Plugin-enabled ERC20 Token contract (abstract)](https://github.com/1inch/token-plugins/blob/master/contracts/ERC20Plugins.sol)
- [Plugin contract (abstract)](https://github.com/1inch/token-plugins/blob/master/contracts/Plugin.sol)
- [Anton Bukov speech at ETHCC](https://youtu.be/Is-T5Q2E0A8?feature=shared)
- [Kirill Kuznetcov speech at Nethermind Summit, Istanbul](https://youtu.be/BwehZHhR8Z4?feature=shared)
