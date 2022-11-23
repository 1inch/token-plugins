// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@1inch/solidity-utils/contracts/libraries/AddressSet.sol";

import "./interfaces/IPod.sol";

library TokenPodsLib {
    using AddressSet for AddressSet.Data;
    using AddressArray for AddressArray.Data;

    error PodAlreadyAdded();
    error PodNotFound();
    error InvalidPodAddress();
    error InsufficientGas();

    struct Data {
        mapping(address => AddressSet.Data) _pods;
    }

    uint256 private constant _POD_CALL_GAS_LIMIT = 200_000;

    function hasPod(Data storage self, address account, address pod) internal view returns(bool) {
        return self._pods[account].contains(pod);
    }

    function podsCount(Data storage self, address account) internal view returns(uint256) {
        return self._pods[account].length();
    }

    function podAt(Data storage self, address account, uint256 index) internal view returns(address) {
        return self._pods[account].at(index);
    }

    function pods(Data storage self, address account) internal view returns(address[] memory) {
        return self._pods[account].items.get();
    }

    function podBalanceOf(Data storage self, address account, address pod, uint256 balance) internal view returns(uint256) {
        if (self._pods[account].contains(pod)) {
            return balance;
        }
        return 0;
    }

    function addPod(Data storage self, address account, address pod, uint256 balance) internal returns(uint256) {
        return _addPod(self, account, pod, balance);
    }

    function removePod(Data storage self, address account, address pod, uint256 balance) internal {
        _removePod(self, account, pod, balance);
    }

    function removeAllPods(Data storage self, address account, uint256 balance) internal {
        _removeAllPods(self, account, balance);
    }

    function _addPod(Data storage self, address account, address pod, uint256 balance) private returns(uint256) {
        if (pod == address(0)) revert InvalidPodAddress();
        if (!self._pods[account].add(pod)) revert PodAlreadyAdded();
        if (balance > 0) {
            _notifyPod(pod, address(0), account, balance, 0, false);
        }
        return self._pods[account].length();
    }

    function _removePod(Data storage self, address account, address pod, uint256 balance) private {
        if (!self._pods[account].remove(pod)) revert PodNotFound();
        if (balance > 0) {
            _notifyPod(pod, account, address(0), balance, 0, false);
        }
    }

    function _removeAllPods(Data storage self, address account, uint256 balance) private {
        address[] memory items = self._pods[account].items.get();
        unchecked {
            for (uint256 i = items.length; i > 0; i--) {
                if (balance > 0) {
                    _notifyPod(items[i - 1], account, address(0), balance, 0, false);
                }
                self._pods[account].remove(items[i - 1]);
            }
        }
    }

    function updateBalances(Data storage self, address from, address to, uint256 amount) internal {
        _updateBalances(self, from, to, amount, 0, false);
    }

    function updateBalancesWithTokenId(Data storage self, address from, address to, uint256 amount, uint256 id) internal {
        _updateBalances(self, from, to, amount, id, true);
    }

    function _updateBalances(Data storage self, address from, address to, uint256 amount, uint256 id, bool hasId) private {
        unchecked {
            if (amount > 0 && from != to) {
                address[] memory a = self._pods[from].items.get();
                address[] memory b = self._pods[to].items.get();
                uint256 aLength = a.length;
                uint256 bLength = b.length;

                for (uint256 i = 0; i < aLength; i++) {
                    address pod = a[i];

                    uint256 j;
                    for (j = 0; j < bLength; j++) {
                        if (pod == b[j]) {
                            // Both parties are participating of the same Pod
                            _notifyPod(pod, from, to, amount, id, hasId);
                            b[j] = address(0);
                            break;
                        }
                    }

                    if (j == bLength) {
                        // Sender is participating in a Pod, but receiver is not
                        _notifyPod(pod, from, address(0), amount, id, hasId);
                    }
                }

                for (uint256 j = 0; j < bLength; j++) {
                    address pod = b[j];
                    if (pod != address(0)) {
                        // Receiver is participating in a Pod, but sender is not
                        _notifyPod(pod, address(0), to, amount, id, hasId);
                    }
                }
            }
        }
    }

    /// @notice Assembly implementation of the gas limited call to avoid return gas bomb,
    // moreover call to a destructed pod would also revert even inside try-catch block in Solidity 0.8.17
    /// @dev try IPod(pod).updateBalances{gas: _POD_CALL_GAS_LIMIT}(from, to, amount) {} catch {}
    function _notifyPod(address pod, address from, address to, uint256 amount, uint256 id, bool hasId) private {
        bytes4 selector = IPod.updateBalances.selector;
        if (hasId) {
            selector = IPod.updateBalancesWithTokenId.selector;
        }
        bytes4 exception = InsufficientGas.selector;
        assembly {  // solhint-disable-line no-inline-assembly
            let ptr := mload(0x40)
            mstore(ptr, selector)
            mstore(add(ptr, 0x04), from)
            mstore(add(ptr, 0x24), to)
            mstore(add(ptr, 0x44), amount)
            if hasId {
                mstore(add(ptr, 0x64), id)
            }

            if lt(div(mul(gas(), 63), 64), _POD_CALL_GAS_LIMIT) {
                mstore(0, exception)
                revert(0, 4)
            }
            pop(call(_POD_CALL_GAS_LIMIT, pod, 0, ptr, add(0x64, mul(hasId, 0x20)), 0, 0))
        }
    }
}
