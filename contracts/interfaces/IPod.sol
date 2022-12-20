// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/// @title Pod interface
interface IPod {
    /// Pod receives notifications about balance changes of participants
    /// @dev This function implementation should make sure `msg.sender` is designated token of this Pod
    /// @param from The address of the sender or `address(0)` if the transfer is a mint or sender is not participating in this Pod
    /// @param to The address of the recipient or `address(0)` if the transfer is a burn or recipient is not participating in this Pod
    /// @param amount The amount of tokens being transferred
    function updateBalances(address from, address to, uint256 amount) external;
}
