// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { IERC20, ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { AddressSet, AddressArray } from "@1inch/solidity-utils/contracts/libraries/AddressSet.sol";

import { IERC20Hooks } from "./interfaces/IERC20Hooks.sol";
import { IHook } from "./interfaces/IHook.sol";
import { ReentrancyGuardExt, ReentrancyGuardLib } from "./libs/ReentrancyGuard.sol";

/**
 * @title ERC20Hooks
 * @dev A base implementation of token contract to hold and manage hooks of an ERC20 token with a limited number of hooks per account.
 * Each hook is a contract that implements IHook interface (and/or derived from hook).
 */
abstract contract ERC20Hooks is ERC20, IERC20Hooks, ReentrancyGuardExt {
    using AddressSet for AddressSet.Data;
    using AddressArray for AddressArray.Data;
    using ReentrancyGuardLib for ReentrancyGuardLib.Data;

    /// @dev Limit of hooks per account
    uint256 public immutable MAX_HOOKS_PER_ACCOUNT;
    /// @dev Gas limit for a single hook call
    uint256 public immutable HOOK_CALL_GAS_LIMIT;

    ReentrancyGuardLib.Data private _guard;
    mapping(address => AddressSet.Data) private _hooks;

    /**
     * @dev Constructor that sets the limit of hooks per account and the gas limit for a hook call.
     * @param hooksLimit_ The limit of hooks per account.
     * @param hookCallGasLimit_ The gas limit for a hook call. Intended to prevent gas bomb attacks
     */
    constructor(uint256 hooksLimit_, uint256 hookCallGasLimit_) {
        if (hooksLimit_ == 0) revert ZeroHooksLimit();
        MAX_HOOKS_PER_ACCOUNT = hooksLimit_;
        HOOK_CALL_GAS_LIMIT = hookCallGasLimit_;
        _guard.init();
    }

    /**
     * @notice See {IERC20Hooks-hasHook}.
     */
    function hasHook(address account, address hook) public view virtual returns(bool) {
        return _hooks[account].contains(hook);
    }

    /**
     * @notice See {IERC20Hooks-hooksCount}.
     */
    function hooksCount(address account) public view virtual returns(uint256) {
        return _hooks[account].length();
    }

    /**
     * @notice See {IERC20Hooks-hookAt}.
     */
    function hookAt(address account, uint256 index) public view virtual returns(address) {
        return _hooks[account].at(index);
    }

    /**
     * @notice See {IERC20Hooks-hooks}.
     */
    function hooks(address account) public view virtual returns(address[] memory) {
        return _hooks[account].items.get();
    }

    /**
     * @dev Returns the balance of a given account.
     * @param account The address of the account.
     * @return balance The account balance.
     */
    function balanceOf(address account) public nonReentrantView(_guard) view override(IERC20, ERC20) virtual returns(uint256) {
        return super.balanceOf(account);
    }

    /**
     * @notice See {IERC20Hooks-hookBalanceOf}.
     */
    function hookBalanceOf(address hook, address account) public nonReentrantView(_guard) view virtual returns(uint256) {
        if (hasHook(account, hook)) {
            return super.balanceOf(account);
        }
        return 0;
    }

    /**
     * @notice See {IERC20Hooks-addHook}.
     */
    function addHook(address hook) public virtual {
        _addHook(msg.sender, hook);
    }

    /**
     * @notice See {IERC20Hooks-removeHook}.
     */
    function removeHook(address hook) public virtual {
        _removeHook(msg.sender, hook);
    }

    /**
     * @notice See {IERC20Hooks-removeAllHooks}.
     */
    function removeAllHooks() public virtual {
        _removeAllHooks(msg.sender);
    }

    function _addHook(address account, address hook) internal virtual {
        if (hook == address(0)) revert InvalidHookAddress();
        if (IHook(hook).TOKEN() != IERC20Hooks(address(this))) revert InvalidTokenInHook();
        if (!_hooks[account].add(hook)) revert HookAlreadyAdded();
        if (_hooks[account].length() > MAX_HOOKS_PER_ACCOUNT) revert HooksLimitReachedForAccount();

        emit HookAdded(account, hook);
        uint256 balance = balanceOf(account);
        if (balance > 0) {
            _updateBalances(hook, address(0), account, balance);
        }
    }

    function _removeHook(address account, address hook) internal virtual {
        if (!_hooks[account].remove(hook)) revert HookNotFound();

        emit HookRemoved(account, hook);
        uint256 balance = balanceOf(account);
        if (balance > 0) {
            _updateBalances(hook, account, address(0), balance);
        }
    }

    function _removeAllHooks(address account) internal virtual {
        address[] memory hookItems = _hooks[account].erase();
        uint256 balance = balanceOf(account);
        unchecked {
            for (uint256 i = 0; i < hookItems.length; i++) {
                address item = hookItems[i];
                emit HookRemoved(account, item);
                if (balance > 0) {
                    _updateBalances(item, account, address(0), balance);
                }
            }
        }
    }

    /// @notice Assembly implementation of the gas limited call to avoid return gas bomb,
    // moreover call to a destructed hook would also revert even inside try-catch block in Solidity 0.8.17
    /// @dev try IHook(hook).updateBalances{gas: _HOOK_CALL_GAS_LIMIT}(from, to, amount) {} catch {}
    function _updateBalances(address hook, address from, address to, uint256 amount) private {
        bytes4 selector = IHook.updateBalances.selector;
        uint256 gasLimit = HOOK_CALL_GAS_LIMIT;
        assembly ("memory-safe") { // solhint-disable-line no-inline-assembly
            let ptr := mload(0x40)
            mstore(ptr, selector)
            mstore(add(ptr, 0x04), from)
            mstore(add(ptr, 0x24), to)
            mstore(add(ptr, 0x44), amount)

            let gasLeft := gas()
            if iszero(call(gasLimit, hook, 0, ptr, 0x64, 0, 0)) {
                if lt(div(mul(gasLeft, 63), 64), gasLimit) {
                    returndatacopy(ptr, 0, returndatasize())
                    revert(ptr, returndatasize())
                }
            }
        }
    }

    function _update(address from, address to, uint256 amount) internal nonReentrant(_guard) override virtual {
        super._update(from, to, amount);

        unchecked {
            if (amount > 0 && from != to) {
                address[] memory hooksFrom = _hooks[from].items.get();
                address[] memory hooksTo = _hooks[to].items.get();
                uint256 hooksFromLength = hooksFrom.length;
                uint256 hooksToLength = hooksTo.length;

                for (uint256 i = 0; i < hooksFromLength; i++) {
                    address hook = hooksFrom[i];

                    uint256 j;
                    for (j = 0; j < hooksToLength; j++) {
                        if (hook == hooksTo[j]) {
                            // Both parties are participating in the same hook
                            _updateBalances(hook, from, to, amount);
                            hooksTo[j] = address(0);
                            break;
                        }
                    }

                    if (j == hooksToLength) {
                        // Sender is participating in a hook, but receiver is not
                        _updateBalances(hook, from, address(0), amount);
                    }
                }

                for (uint256 j = 0; j < hooksToLength; j++) {
                    address hook = hooksTo[j];
                    if (hook != address(0)) {
                        // Receiver is participating in a hook, but sender is not
                        _updateBalances(hook, address(0), to, amount);
                    }
                }
            }
        }
    }
}
