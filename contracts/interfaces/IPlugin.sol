// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { IERC20Plugins } from "./IERC20Plugins.sol";

interface IPlugin {
    /**
     * @dev Returns the token which this plugin belongs to.
     * @return erc20 The IERC20Plugins token.
     */
    function token() external view returns(IERC20Plugins erc20);

    /**
     * @dev Updates the balances of two addresses in the plugin as a result of any balance changes.
     * Only the Token contract is allowed to call this function.
     * @param from The address from which tokens were transferred.
     * @param to The address to which tokens were transferred.
     * @param amount The amount of tokens transferred.
     */
    function updateBalances(address from, address to, uint256 amount) external;
}
