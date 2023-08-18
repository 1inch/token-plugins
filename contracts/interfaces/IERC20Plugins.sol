// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IERC20Plugins is IERC20 {
    event PluginAdded(address account, address plugin);
    event PluginRemoved(address account, address plugin);

    error PluginAlreadyAdded();
    error PluginNotFound();
    error InvalidPluginAddress();
    error InvalidTokenInPlugin();
    error PluginsLimitReachedForAccount();
    error ZeroPluginsLimit();

    function maxPluginsPerAccount() external view returns(uint256);
    function pluginCallGasLimit() external view returns(uint256);
    function hasPlugin(address account, address plugin) external view returns(bool);
    function pluginsCount(address account) external view returns(uint256);
    function pluginAt(address account, uint256 index) external view returns(address);
    function plugins(address account) external view returns(address[] memory);
    function pluginBalanceOf(address plugin, address account) external view returns(uint256);

    function addPlugin(address plugin) external;
    function removePlugin(address plugin) external;
    function removeAllPlugins() external;
}
