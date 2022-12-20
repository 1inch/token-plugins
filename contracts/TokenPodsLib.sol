// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@1inch/solidity-utils/contracts/libraries/AddressSet.sol";

import "./interfaces/IPod.sol";
import "./interfaces/IPodWithId.sol";

library TokenPodsLib {
    using AddressSet for AddressSet.Data;
    using AddressArray for AddressArray.Data;

    error PodAlreadyAdded();
    error PodNotFound();
    error InvalidPodAddress();
    error InsufficientGas();

    event PodAdded(address account, address pod);
    event PodRemoved(address account, address pod);

    type DataPtr is uint256;

    struct Data {
        mapping(address => AddressSet.Data) pods;
    }

    struct Info {
        DataPtr data;
        uint256 podCallGasLimit;
    }

    function makeInfo(Data storage data, uint256 podCallGasLimit_) internal pure returns(Info memory info) {
        DataPtr ptr;
        assembly {  // solhint-disable-line no-inline-assembly
            ptr := data.slot
        }
        info.data = ptr;
        info.podCallGasLimit = podCallGasLimit_;
    }

    function hasPod(Info memory self, address account, address pod) internal view returns(bool) {
        return _getData(self).pods[account].contains(pod);
    }

    function podsCount(Info memory self, address account) internal view returns(uint256) {
        return _getData(self).pods[account].length();
    }

    function podAt(Info memory self, address account, uint256 index) internal view returns(address) {
        return _getData(self).pods[account].at(index);
    }

    function pods(Info memory self, address account) internal view returns(address[] memory) {
        return _getData(self).pods[account].items.get();
    }

    function podBalanceOf(Info memory self, address account, address pod, uint256 balance) internal view returns(uint256) {
        if (_getData(self).pods[account].contains(pod)) {
            return balance;
        }
        return 0;
    }

    function addPod(Info memory self, address account, address pod, uint256 balance) internal returns(uint256) {
        return _addPod(self, account, pod, balance);
    }

    function removePod(Info memory self, address account, address pod, uint256 balance) internal {
        _removePod(self, account, pod, balance);
    }

    function removeAllPods(Info memory self, address account, uint256 balance) internal {
        _removeAllPods(self, account, balance);
    }

    function _addPod(Info memory self, address account, address pod, uint256 balance) private returns(uint256) {
        if (pod == address(0)) revert InvalidPodAddress();
        if (!_getData(self).pods[account].add(pod)) revert PodAlreadyAdded();

        emit PodAdded(account, pod);
        if (balance > 0) {
            _notifyPod(pod, address(0), account, balance, 0, false, self.podCallGasLimit);
        }
        return _getData(self).pods[account].length();
    }

    function _removePod(Info memory self, address account, address pod, uint256 balance) private {
        if (!_getData(self).pods[account].remove(pod)) revert PodNotFound();
        if (balance > 0) {
            _notifyPod(pod, account, address(0), balance, 0, false, self.podCallGasLimit);
        }
    }

    function _removeAllPods(Info memory self, address account, uint256 balance) private {
        address[] memory items = _getData(self).pods[account].items.get();
        unchecked {
            for (uint256 i = items.length; i > 0; i--) {
                _getData(self).pods[account].remove(items[i - 1]);
                emit PodRemoved(account, items[i - 1]);
                if (balance > 0) {
                    _notifyPod(items[i - 1], account, address(0), balance, 0, false, self.podCallGasLimit);
                }
            }
        }
    }

    function updateBalances(Info memory self, address from, address to, uint256 amount) internal {
        _updateBalances(self, from, to, amount, 0, false);
    }

    function updateBalancesWithTokenId(Info memory self, address from, address to, uint256 amount, uint256 id) internal {
        _updateBalances(self, from, to, amount, id, true);
    }

    function _updateBalances(Info memory self, address from, address to, uint256 amount, uint256 id, bool hasId) private {
        unchecked {
            if (amount > 0 && from != to) {
                uint256 gasLimit = self.podCallGasLimit;
                address[] memory a = _getData(self).pods[from].items.get();
                address[] memory b = _getData(self).pods[to].items.get();
                uint256 aLength = a.length;
                uint256 bLength = b.length;

                for (uint256 i = 0; i < aLength; i++) {
                    address pod = a[i];

                    uint256 j;
                    for (j = 0; j < bLength; j++) {
                        if (pod == b[j]) {
                            // Both parties are participating of the same Pod
                            _notifyPod(pod, from, to, amount, id, hasId, gasLimit);
                            b[j] = address(0);
                            break;
                        }
                    }

                    if (j == bLength) {
                        // Sender is participating in a Pod, but receiver is not
                        _notifyPod(pod, from, address(0), amount, id, hasId, gasLimit);
                    }
                }

                for (uint256 j = 0; j < bLength; j++) {
                    address pod = b[j];
                    if (pod != address(0)) {
                        // Receiver is participating in a Pod, but sender is not
                        _notifyPod(pod, address(0), to, amount, id, hasId, gasLimit);
                    }
                }
            }
        }
    }

    /// @notice Assembly implementation of the gas limited call to avoid return gas bomb,
    // moreover call to a destructed pod would also revert even inside try-catch block in Solidity 0.8.17
    /// @dev try IPod(pod).updateBalances{gas: _POD_CALL_GAS_LIMIT}(from, to, amount) {} catch {}
    function _notifyPod(address pod, address from, address to, uint256 amount, uint256 id, bool hasId, uint256 gasLimit) private {
        bytes4 selector = hasId ? IPodWithId.updateBalancesWithTokenId.selector : IPod.updateBalances.selector;
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

            if lt(div(mul(gas(), 63), 64), gasLimit) {
                mstore(0, exception)
                revert(0, 4)
            }
            pop(call(gasLimit, pod, 0, ptr, add(0x64, mul(hasId, 0x20)), 0, 0))
        }
    }

    function _getData(Info memory info) private pure returns(Data storage data) {
        DataPtr ptr = info.data;
        assembly {  // solhint-disable-line no-inline-assembly
            data.slot := ptr
        }
    }
}
