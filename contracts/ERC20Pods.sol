// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@1inch/solidity-utils/contracts/libraries/AddressSet.sol";

import "./interfaces/IERC20Pods.sol";
import "./interfaces/IPod.sol";

abstract contract ERC20Pods is ERC20, IERC20Pods {
    using AddressSet for AddressSet.Data;
    using AddressArray for AddressArray.Data;

    error PodAlreadyAdded();
    error PodNotFound();
    error InvalidPodAddress();
    error PodsLimitReachedForAccount();

    uint256 private constant _POD_CALL_GAS_LIMIT = 200_000;

    uint256 public immutable podsLimit;

    mapping(address => AddressSet.Data) private _pods;

    constructor(uint256 podsLimit_) {
        podsLimit = podsLimit_;
    }

    function hasPod(address account, address pod) public view virtual returns(bool) {
        return _pods[account].contains(pod);
    }

    function podsCount(address account) public view virtual returns(uint256) {
        return _pods[account].length();
    }

    function podAt(address account, uint256 index) public view virtual returns(address) {
        return _pods[account].at(index);
    }

    function pods(address account) public view virtual returns(address[] memory) {
        return _pods[account].items.get();
    }

    function podBalanceOf(address pod, address account) public view returns(uint256) {
        if (hasPod(account, pod)) {
            return balanceOf(account);
        }
        return 0;
    }

    function addPod(address pod) public virtual {
        _addPod(msg.sender, pod);
    }

    function removePod(address pod) public virtual {
        _removePod(msg.sender, pod);
    }

    function removeAllPods() public virtual {
        _removeAllPods(msg.sender);
    }

    function _addPod(address account, address pod) internal virtual {
        if (pod == address(0)) revert InvalidPodAddress();
        if (!_pods[account].add(pod)) revert PodAlreadyAdded();
        if (_pods[account].length() > podsLimit) revert PodsLimitReachedForAccount();

        uint256 balance = balanceOf(account);
        if (balance > 0) {
            _updateBalances(pod, address(0), account, balance);
        }
    }

    function _removePod(address account, address pod) internal virtual {
        if (!_pods[account].remove(pod)) revert PodNotFound();

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
                if (balance > 0) {
                    _updateBalances(items[i - 1], account, address(0), balance);
                }
                _pods[account].remove(items[i - 1]);
            }
        }
    }

    /// @notice Assembly implementation of the gas limited call to avoid return gas bomb
    /// @dev try IPod(pod).updateBalances{gas: _POD_CALL_GAS_LIMIT}(from, to, amount) {} catch {}
    function _updateBalances(address pod, address from, address to, uint256 amount) private {
        bytes4 selector = IPod.updateBalances.selector;
        assembly {  // solhint-disable-line no-inline-assembly
            let ptr := mload(0x40)
            mstore(ptr, selector)
            mstore(add(ptr, 0x04), from)
            mstore(add(ptr, 0x24), to)
            mstore(add(ptr, 0x44), amount)

            pop(call(_POD_CALL_GAS_LIMIT, pod, 0, ptr, 0x64, 0, 0))
        }
    }

    // ERC20 Overrides

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override virtual {
        super._beforeTokenTransfer(from, to, amount);

        if (amount > 0 && from != to) {
            address[] memory a = _pods[from].items.get();
            address[] memory b = _pods[to].items.get();

            for (uint256 i = 0; i < a.length; i++) {
                address pod = a[i];

                uint256 j;
                for (j = 0; j < b.length; j++) {
                    if (pod == b[j]) {
                        // Both parties are participating of the same Pod
                        _updateBalances(pod, from, to, amount);
                        b[j] = address(0);
                        break;
                    }
                }

                if (j == b.length) {
                    // Sender is participating in a Pod, but receiver is not
                    _updateBalances(pod, from, address(0), amount);
                }
            }

            for (uint256 j = 0; j < b.length; j++) {
                address pod = b[j];
                if (pod != address(0)) {
                    // Receiver is participating in a Pod, but sender is not
                    _updateBalances(pod, address(0), to, amount);
                }
            }
        }
    }
}
