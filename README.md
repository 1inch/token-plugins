# Token Plugins

[![Build Status](https://github.com/1inch/token-plugins/workflows/CI/badge.svg)](https://github.com/1inch/token-plugins/actions)
[![Coverage Status](https://codecov.io/gh/1inch/token-plugins/branch/master/graph/badge.svg?token=Z3D5O3XUYV)](https://codecov.io/gh/1inch/token-plugins)
[![NPM Package](https://img.shields.io/npm/v/@1inch/token-plugins.svg)](https://www.npmjs.org/package/@1inch/token-plugins)

### Overview

This library introduces an extendable and secure system for ERC20-based tokens, inspired by the plugin concept widely used in the web 2.0 world. By subscribing an account to various plugins, users can dynamically enhance the functionality of their tokens.

### Functionality and Extension Capabilities
Each time a balance of a connected account changes, the token contract notifies all plugins that the account has subscribed to. Each plugin implements the `_updateBalances` function, which processes change requests for a balance alteration, inclusive of balance change data (from/to addresses and amount). The plugin can then perform necessary actions according to its logic to extend the base token functionality.

Keep in mind that the plugin's processing logic consumes additional gas. Although there's a limit on the amount of gas that a plugin can expend, the account owner has autonomy in selecting which plugins to subscribe their account to.

### Examples of Plugins
* [FarmingPlugin](https://github.com/1inch/farming) - *The 1inch staking reward farming is based on this plugin.*
This plugin facilitates farming without the need for asset transfer or locking on a farm. An account owner can join the farm by simply adding this plugin to their account. The plugin handles all necessary accounting for joined farmers and distributes rewards based on the actual farming token balance of the account during the farming period. This is particularly useful for non-transferable tokens, such as debt tokens in lending protocols.

* [DelegatingPlugin](https://github.com/1inch/delegating) - *The 1inch fusion mode resolver delegation is based on this plugin.*
 This plugin allows an account balance to be delegated to another address. This can be advantageous for governance tokens if an account owner wants to delegate their voting power to another account without a physical token transfer. The owner can recall or redelegate their delegation at any time without locking their tokens in a governance contract.

 ### Security and limitations
The plugin system operates under the assumption that an account may subscribe to a malicious plugin. That is the reason why the following restrictions apply to each call:

* If a plugin fails its execution and reverts, it won't impact the main flow. The failed plugin is bypassed, and execution continues.
* Each plugin has a gas limit set by the parent contract. If there is insufficient gas, it won't affect the main flow's execution.
* An account can have a limited number of plugins connected, set by host contract.
* Plugins are executed in the context specified in their contract (parent contract uses a call, not delegatecall).
* Plugins cannot alter the calling contract state
* Plugins cannot be reentered

### Integrating Plugin Support in Your Token Implementation

1. Inherit token using `contract MyToken is ERC20Plugins { ... }`.
Or wrap it using `contract MyWrapper is ERC20Wrapper, ERC20Plugins { ... }`.
This adds support for the plugin infrastructure.
2. Now any wallet can add the plugin to a wallet using `MyToken.addPlugin(plugin)` to utilize plugin features.
3. Now every time the wallet balance changes, the plugin will be informed.

### Creating Your Own Plugin
1. Inherit the plugin using `contract MyPlugin is Plugin { ... }.`
2. Implement the `_updateBalances` function to handle wallet balance changes.

### Examples of simple token and plugin
```Solidity
// Simple token contract with plugin support
contract HostTokenExample is ERC20Plugins {
    constructor(string memory name, string memory symbol, uint256 pluginsCountLimit, uint256 pluginsCallGasLimit)
        ERC20(name, symbol)
        ERC20Plugins(pluginsCountLimit, pluginsCallGasLimit)
    {} // solhint-disable-line no-empty-blocks

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}

// Simple plugin
contract PluginExample is ERC20, Plugin {
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