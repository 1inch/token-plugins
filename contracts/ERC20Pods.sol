// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { IERC20, ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { AddressSet, AddressArray } from "@1inch/solidity-utils/contracts/libraries/AddressSet.sol";

import { IERC20Pods } from "./interfaces/IERC20Pods.sol";
import { IPod } from "./interfaces/IPod.sol";
import { ReentrancyGuardExt, ReentrancyGuardLib } from "./libs/ReentrancyGuard.sol";

/**
 * @title ERC20Pods
 * @dev A base implementation of token contract to hold and manage pods of an ERC20 token with a limited number of pods per account.
 * Each pod is a contract that implements IPod interface (and/or derived from Pod).
 */
abstract contract ERC20Pods is ERC20, IERC20Pods, ReentrancyGuardExt {
    using AddressSet for AddressSet.Data;
    using AddressArray for AddressArray.Data;
    using ReentrancyGuardLib for ReentrancyGuardLib.Data;

    error PodAlreadyAdded();
    error PodNotFound();
    error InvalidPodAddress();
    error InvalidTokenInPod();
    error PodsLimitReachedForAccount();
    error InsufficientGas();
    error ZeroPodsLimit();

    /// @dev Limit of pods per account
    uint256 public immutable podsLimit;
    /// @dev Gas limit for a single pod call
    uint256 public immutable podCallGasLimit;

    ReentrancyGuardLib.Data private _guard;
    mapping(address => AddressSet.Data) private _pods;

    /**
     * @dev Constructor that sets the limit of pods per account and the gas limit for a pod call.
     * @param podsLimit_ The limit of pods per account.
     * @param podCallGasLimit_ The gas limit for a pod call. Intended to prevent gas bomb attacks
     */
    constructor(uint256 podsLimit_, uint256 podCallGasLimit_) {
        if (podsLimit_ == 0) revert ZeroPodsLimit();
        podsLimit = podsLimit_;
        podCallGasLimit = podCallGasLimit_;
        _guard.init();
    }

    /**
     * @dev Returns whether an account has a specific pod.
     * @param account The address of the account.
     * @param pod The address of the pod.
     * @return bool A boolean indicating whether the account has the specified pod.
     */
    function hasPod(address account, address pod) public view virtual returns(bool) {
        return _pods[account].contains(pod);
    }

    /**
     * @dev Returns the number of Pods registered for an account.
     * @param account The address of the account.
     * @return uint256 A number of pods registered for the account.
     */
    function podsCount(address account) public view virtual returns(uint256) {
        return _pods[account].length();
    }

    /**
     * @dev Returns the address of a pod at a specified index for a given account .
     * @param account The address of the account.
     * @param index The index of the pod to retrieve.
     * @return pod The address of the pod.
     */
    function podAt(address account, uint256 index) public view virtual returns(address) {
        return _pods[account].at(index);
    }

    /**
     * @dev Returns an array of all pods owned by a given account.
     * @param account The address of the account to query.
     * @return pods An array of pod addresses.
     */
    function pods(address account) public view virtual returns(address[] memory) {
        return _pods[account].items.get();
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
     * @dev Returns the balance of a given account if a specified pod is added or zero.
     * @param pod The address of the pod to query.
     * @param account The address of the account to query.
     * @return balance The account balance if the specified pod is added and zero otherwise. 
     */
    function podBalanceOf(address pod, address account) public nonReentrantView(_guard) view virtual returns(uint256) {
        if (hasPod(account, pod)) {
            return super.balanceOf(account);
        }
        return 0;
    }

    /**
     * @dev Adds a new pod for the calling account.
     * @param pod The address of the pod to add.
     */
    function addPod(address pod) public virtual {
        _addPod(msg.sender, pod);
    }

    /**
     * @dev Removes a pod for the calling account.
     * @param pod The address of the pod to remove.
     */
    function removePod(address pod) public virtual {
        _removePod(msg.sender, pod);
    }

    /**
     * @dev Removes all pods for the calling account.
     */
    function removeAllPods() public virtual {
        _removeAllPods(msg.sender);
    }

    function _addPod(address account, address pod) internal virtual {
        if (pod == address(0)) revert InvalidPodAddress();
        if (IPod(pod).token() != IERC20Pods(address(this))) revert InvalidTokenInPod();
        if (!_pods[account].add(pod)) revert PodAlreadyAdded();
        if (_pods[account].length() > podsLimit) revert PodsLimitReachedForAccount();

        emit PodAdded(account, pod);
        uint256 balance = balanceOf(account);
        if (balance > 0) {
            _updateBalances(pod, address(0), account, balance);
        }
    }

    function _removePod(address account, address pod) internal virtual {
        if (!_pods[account].remove(pod)) revert PodNotFound();

        emit PodRemoved(account, pod);
        uint256 balance = balanceOf(account);
        if (balance > 0) {
            _updateBalances(pod, account, address(0), balance);
        }
    }

    function _removeAllPods(address account) internal virtual {
        address[] memory items = _pods[account].items.get();
        uint256 balance = balanceOf(account);
        unchecked {
            for (uint256 i = items.length; i > 0; i--) {
                _pods[account].remove(items[i - 1]);
                emit PodRemoved(account, items[i - 1]);
                if (balance > 0) {
                    _updateBalances(items[i - 1], account, address(0), balance);
                }
            }
        }
    }

    /// @notice Assembly implementation of the gas limited call to avoid return gas bomb,
    // moreover call to a destructed pod would also revert even inside try-catch block in Solidity 0.8.17
    /// @dev try IPod(pod).updateBalances{gas: _POD_CALL_GAS_LIMIT}(from, to, amount) {} catch {}
    function _updateBalances(address pod, address from, address to, uint256 amount) private {
        bytes4 selector = IPod.updateBalances.selector;
        bytes4 exception = InsufficientGas.selector;
        uint256 gasLimit = podCallGasLimit;
        assembly ("memory-safe") { // solhint-disable-line no-inline-assembly
            let ptr := mload(0x40)
            mstore(ptr, selector)
            mstore(add(ptr, 0x04), from)
            mstore(add(ptr, 0x24), to)
            mstore(add(ptr, 0x44), amount)

            if lt(div(mul(gas(), 63), 64), gasLimit) {
                mstore(0, exception)
                revert(0, 4)
            }
            pop(call(gasLimit, pod, 0, ptr, 0x64, 0, 0))
        }
    }

    // ERC20 Overrides

    function _afterTokenTransfer(address from, address to, uint256 amount) internal nonReentrant(_guard) override virtual {
        super._afterTokenTransfer(from, to, amount);

        unchecked {
            if (amount > 0 && from != to) {
                address[] memory a = _pods[from].items.get();
                address[] memory b = _pods[to].items.get();
                uint256 aLength = a.length;
                uint256 bLength = b.length;

                for (uint256 i = 0; i < aLength; i++) {
                    address pod = a[i];

                    uint256 j;
                    for (j = 0; j < bLength; j++) {
                        if (pod == b[j]) {
                            // Both parties are participating of the same Pod
                            _updateBalances(pod, from, to, amount);
                            b[j] = address(0);
                            break;
                        }
                    }

                    if (j == bLength) {
                        // Sender is participating in a Pod, but receiver is not
                        _updateBalances(pod, from, address(0), amount);
                    }
                }

                for (uint256 j = 0; j < bLength; j++) {
                    address pod = b[j];
                    if (pod != address(0)) {
                        // Receiver is participating in a Pod, but sender is not
                        _updateBalances(pod, address(0), to, amount);
                    }
                }
            }
        }
    }
}
