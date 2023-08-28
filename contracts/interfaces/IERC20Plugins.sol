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

    /**
     * @dev Returns the maximum allowed number of plugins per account.
     * @return pluginsLimit The maximum allowed number of plugins per account.
     */
    function maxPluginsPerAccount() external view returns(uint256 pluginsLimit);

    /**
     * @dev Returns the gas limit allowed to be spend by plugin per call.
     * @return gasLimit The gas limit allowed to be spend by plugin per call.
     */
    function pluginCallGasLimit() external view returns(uint256 gasLimit);

    /**
     * @dev Returns whether an account has a specific plugin.
     * @param account The address of the account.
     * @param plugin The address of the plugin.
     * @return hasPlugin A boolean indicating whether the account has the specified plugin.
     */
    function hasPlugin(address account, address plugin) external view returns(bool hasPlugin);

    /**
     * @dev Returns the number of plugins registered for an account.
     * @param account The address of the account.
     * @return count The number of plugins registered for the account.
     */
    function pluginsCount(address account) external view returns(uint256 count);

    /**
     * @dev Returns the address of a plugin at a specified index for a given account.
     * The function will revert if index is greater or equal than `pluginsCount(account)`.
     * @param account The address of the account.
     * @param index The index of the plugin to retrieve.
     * @return plugin The address of the plugin.
     */
    function pluginAt(address account, uint256 index) external view returns(address plugin);

    /**
     * @dev Returns an array of all plugins owned by a given account.
     * @param account The address of the account to query.
     * @return plugins An array of plugin addresses.
     */
    function plugins(address account) external view returns(address[] memory plugins);

    /**
     * @dev Returns the balance of a given account if a specified plugin is added or zero.
     * @param plugin The address of the plugin to query.
     * @param account The address of the account to query.
     * @return balance The account balance if the specified plugin is added and zero otherwise.
     */
    function pluginBalanceOf(address plugin, address account) external view returns(uint256 balance);

    /**
     * @dev Adds a new plugin for the calling account.
     * @param plugin The address of the plugin to add.
     */
    function addPlugin(address plugin) external;

    /**
     * @dev Removes a plugin for the calling account.
     * @param plugin The address of the plugin to remove.
     */
    function removePlugin(address plugin) external;

    /**
     * @dev Removes all plugins for the calling account.
     */
    function removeAllPlugins() external;
}
