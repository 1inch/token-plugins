// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { IERC20Plugins } from "../interfaces/IERC20Plugins.sol";
import { IPlugin } from "../interfaces/IPlugin.sol";

contract ReentrancyPluginMock is IPlugin {
    IERC20Plugins public immutable TOKEN;
    address public immutable ATTACKED_PLUGIN;

    constructor(IERC20Plugins _token, address _attackedPlugin) {
        TOKEN = _token;
        ATTACKED_PLUGIN = _attackedPlugin;
    }

    function updateBalances(address /* from */, address to, uint256 /* amount */) external {
        if (to == address(0)) {
           TOKEN.removePlugin(ATTACKED_PLUGIN);
        }
    }

    function attack() external {
        TOKEN.addPlugin(address(this));
        TOKEN.addPlugin(ATTACKED_PLUGIN);
        TOKEN.removeAllPlugins();
    }
}
