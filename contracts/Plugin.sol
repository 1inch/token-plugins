// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { IPlugin } from "./interfaces/IPlugin.sol";
import { IERC20Plugins } from "./interfaces/IERC20Plugins.sol";


/// @dev ERC20 extension enabling external smart contract based plugins to track balances of those users who opted-in to these plugins.
/// Could be useful for farming / DAO voting and every case where you need to track user's balances without moving tokens to another contract.
abstract contract Plugin is IPlugin {
    error AccessDenied();

    IERC20Plugins public immutable TOKEN;

    /// @dev Throws an error if the caller is not the token contract
    modifier onlyToken {
        if (msg.sender != address(TOKEN)) revert AccessDenied();
        _;
    }

    /**
     * @dev Creates a new plugin contract, initialized with a reference to the parent token contract.
     * @param token_ The address of the token contract
     */
    constructor(IERC20Plugins token_) {
        TOKEN = token_;
    }

    /**
     * @notice See {IPlugin-updateBalances}.
     */
    function updateBalances(address from, address to, uint256 amount) external onlyToken {
        _updateBalances(from, to, amount);
    }

    /**
     * @dev Updates the balances of two addresses in the plugin as a result of any balance changes.
     * Only the Token contract is allowed to call this function.
     * @param from The address from which tokens were transferred
     * @param to The address to which tokens were transferred
     * @param amount The amount of tokens transferred
     */
    function _updateBalances(address from, address to, uint256 amount) internal virtual;
}
