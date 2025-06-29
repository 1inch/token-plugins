// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { IERC20Hooks } from "./IERC20Hooks.sol";

interface IHook {
    /**
     * @dev Returns the token which this hook belongs to.
     * @return erc20 The IERC20Hooks token.
     */
    function TOKEN() external view returns(IERC20Hooks erc20); // solhint-disable-line func-name-mixedcase

    /**
     * @dev Updates the balances of two addresses in the hook as a result of any balance changes.
     * Only the Token contract is allowed to call this function.
     * @param from The address from which tokens were transferred.
     * @param to The address to which tokens were transferred.
     * @param amount The amount of tokens transferred.
     */
    function updateBalances(address from, address to, uint256 amount) external;
}
