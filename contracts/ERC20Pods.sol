// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@1inch/solidity-utils/contracts/libraries/AddressSet.sol";

import "./interfaces/IERC20Pods.sol";
import "./interfaces/IPod.sol";

abstract contract ERC20Pods is ERC20, IERC20Pods {
    using AddressSet for AddressSet.Data;
    using AddressArray for AddressArray.Data;

    error AlreadyJoined();
    error PodIsNotAttached();
    error InvalidPodAddress();
    error PodsLimitReachedForAccount();

    uint256 private constant _POD_CALL_GAS_LIMIT = 200_000;

    uint256 public immutable podsLimit;
    mapping(address => AddressSet.Data) private _pods;

    constructor(uint256 podsLimit_) {
        podsLimit = podsLimit_;
    }

    function hasPod(address account, address pod) external view returns(bool) {
        return _pods[account].contains(pod);
    }

    function podsCount(address account) external view returns(uint256) {
        return _pods[account].length();
    }

    function podAt(address account, uint256 index) external view returns(address) {
        return _pods[account].at(index);
    }

    function pods(address account) external view returns(address[] memory) {
        return _pods[account].items.get();
    }

    function addPod(address pod) external override {
        if (pod == address(0)) revert InvalidPodAddress();
        if (!_pods[msg.sender].add(pod)) revert AlreadyJoined();
        if (_pods[msg.sender].length() > podsLimit) revert PodsLimitReachedForAccount();
        uint256 balance = balanceOf(msg.sender);
        if (balance > 0) {
            _updateBalances(pod, address(0), msg.sender, balance);
        }
    }

    function removePod(address pod) public override {
        if (!_pods[msg.sender].remove(pod)) revert PodIsNotAttached();
        uint256 balance = balanceOf(msg.sender);
        if (balance > 0) {
            _updateBalances(pod, msg.sender, address(0), balance);
        }
    }

    function removeAllPods() external virtual {
        address[] memory items = _pods[msg.sender].items.get();
        unchecked {
            for (uint256 i = items.length; i > 0; i--) {
                removePod(items[i - 1]);
            }
        }
    }

    function _updateBalances(address pod, address from, address to, uint256 amount) private {
        try IPod(pod).updateBalances{gas: _POD_CALL_GAS_LIMIT}(from, to, amount) {} catch {} // solhint-disable-line no-empty-blocks
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

