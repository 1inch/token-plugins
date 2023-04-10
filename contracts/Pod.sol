// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { IPod } from "./interfaces/IPod.sol";
import { IERC20Pods } from "./interfaces/IERC20Pods.sol";


/// @dev ERC20 extension enabling external smart contract based Pods to track balances of those users who opted-in to these Pods.
/// Could be useful for farming / DAO voting and every case where you need to track user's balances without moving tokens to another contract.
abstract contract Pod is IPod {
    error AccessDenied();

    IERC20Pods public immutable token;

    /// @dev Throws an error if the caller is not the token contract
    modifier onlyToken {
        if (msg.sender != address(token)) revert AccessDenied();
        _;
    }

    /// @dev Creates a new Pod contract, initialized with a reference to the parent token contract.
    /// @param token_ The address of the token contract
    constructor(IERC20Pods token_) {
        token = token_;
    }

    /// @dev Updates the balances of two addresses in the pod as a result of any balance changes.
    /// Only the Token contract is allowed to call this function.
    /// @param from The address from which tokens were transferred
    /// @param to The address to which tokens were transferred
    /// @param amount The amount of tokens transferred
    function updateBalances(address from, address to, uint256 amount) external onlyToken {
        _updateBalances(from, to, amount);
    }

    /// @dev Updates the balances of two addresses in the pod as a result of any balance changes.
    /// Only the Token contract is allowed to call this function.
    /// @param from The address from which tokens were transferred
    /// @param to The address to which tokens were transferred
    /// @param amount The amount of tokens transferred
    function _updateBalances(address from, address to, uint256 amount) internal virtual;
}
