// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IERC20Hooks is IERC20 {
    event HookAdded(address account, address hook);
    event HookRemoved(address account, address hook);

    error HookAlreadyAdded();
    error HookNotFound();
    error InvalidHookAddress();
    error InvalidTokenInHook();
    error HooksLimitReachedForAccount();
    error ZeroHooksLimit();

    /**
     * @dev Returns the maximum allowed number of hooks per account.
     * @return hooksLimit The maximum allowed number of hooks per account.
     */
    function MAX_HOOKS_PER_ACCOUNT() external view returns(uint256 hooksLimit); // solhint-disable-line func-name-mixedcase

    /**
     * @dev Returns the gas limit allowed to be spend by hook per call.
     * @return gasLimit The gas limit allowed to be spend by hook per call.
     */
    function HOOK_CALL_GAS_LIMIT() external view returns(uint256 gasLimit); // solhint-disable-line func-name-mixedcase

    /**
     * @dev Returns whether an account has a specific hook.
     * @param account The address of the account.
     * @param hook The address of the hook.
     * @return hasHook A boolean indicating whether the account has the specified hook.
     */
    function hasHook(address account, address hook) external view returns(bool hasHook);

    /**
     * @dev Returns the number of hooks registered for an account.
     * @param account The address of the account.
     * @return count The number of hooks registered for the account.
     */
    function hooksCount(address account) external view returns(uint256 count);

    /**
     * @dev Returns the address of a hook at a specified index for a given account.
     * The function will revert if index is greater or equal than `hooksCount(account)`.
     * @param account The address of the account.
     * @param index The index of the hook to retrieve.
     * @return hook The address of the hook.
     */
    function hookAt(address account, uint256 index) external view returns(address hook);

    /**
     * @dev Returns an array of all hooks owned by a given account.
     * @param account The address of the account to query.
     * @return hooks An array of hook addresses.
     */
    function hooks(address account) external view returns(address[] memory hooks);

    /**
     * @dev Returns the balance of a given account if a specified hook is added or zero.
     * @param hook The address of the hook to query.
     * @param account The address of the account to query.
     * @return balance The account balance if the specified hook is added and zero otherwise.
     */
    function hookBalanceOf(address hook, address account) external view returns(uint256 balance);

    /**
     * @dev Adds a new hook for the calling account.
     * @param hook The address of the hook to add.
     */
    function addHook(address hook) external;

    /**
     * @dev Removes a hook for the calling account.
     * @param hook The address of the hook to remove.
     */
    function removeHook(address hook) external;

    /**
     * @dev Removes all hooks for the calling account.
     */
    function removeAllHooks() external;
}
