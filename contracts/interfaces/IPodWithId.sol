// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/// @title Pod interface for tokens of EIP-1155 standard
interface IPodWithId {
    /// Pod receives notifications about balance changes of participants
    /// @dev This function implementation MUST make sure `msg.sender` is designated token of this Pod
    /// @dev This function implementation MUST make sure `id` argument is designated token id of this Pod
    /// @param from The address of the sender or `address(0)` if the transfer is a mint or sender is not participating in this Pod
    /// @param to The address of the recipient or `address(0)` if the transfer is a burn or recipient is not participating in this Pod
    /// @param id The EIP-1155 `token_id` of the token being transferred
    /// @param amount The amount of tokens being transferred
    function updateBalancesWithTokenId(address from, address to, uint256 amount, uint256 id) external;
}
