// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { IERC20Pods } from "./IERC20Pods.sol";

interface IPod {
    function token() external view returns(IERC20Pods);
    function updateBalances(address from, address to, uint256 amount) external;
}
