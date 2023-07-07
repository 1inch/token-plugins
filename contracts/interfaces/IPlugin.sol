// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { IERC20Plugins } from "./IERC20Plugins.sol";

interface IPlugin {
    function token() external view returns(IERC20Plugins);
    function updateBalances(address from, address to, uint256 amount) external;
}
