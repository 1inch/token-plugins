// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@1inch/solidity-utils/contracts/libraries/AddressSet.sol";

import "./interfaces/IERC20Pods.sol";
import "./TokenPodsLib.sol";
import "./libs/ReentrancyGuard.sol";

abstract contract ERC20Pods is ERC20, IERC20Pods, ReentrancyGuardExt {
    using TokenPodsLib for TokenPodsLib.Data;
    using ReentrancyGuardLib for ReentrancyGuardLib.Data;

    error PodsLimitReachedForAccount();

    uint256 public immutable podsLimit;

    ReentrancyGuardLib.Data private _guard;
    TokenPodsLib.Data private _pods;

    constructor(uint256 podsLimit_) {
        podsLimit = podsLimit_;
        _guard.init();
    }

    function hasPod(address account, address pod) public view virtual returns(bool) {
        return _pods.hasPod(account, pod);
    }

    function podsCount(address account) public view virtual returns(uint256) {
        return _pods.podsCount(account);
    }

    function podAt(address account, uint256 index) public view virtual returns(address) {
        return _pods.podAt(account, index);
    }

    function pods(address account) public view virtual returns(address[] memory) {
        return _pods.pods(account);
    }

    function balanceOf(address account) public nonReentrantView(_guard) view override(IERC20, ERC20) virtual returns(uint256) {
        return super.balanceOf(account);
    }

    function podBalanceOf(address pod, address account) public nonReentrantView(_guard) view virtual returns(uint256) {
        return _pods.podBalanceOf(account, pod, super.balanceOf(account));
    }

    function addPod(address pod) public virtual {
        if (_pods.addPod(msg.sender, pod, balanceOf(msg.sender)) > podsLimit) revert PodsLimitReachedForAccount();
    }

    function removePod(address pod) public virtual {
        _pods.removePod(msg.sender, pod, balanceOf(msg.sender));
    }

    function removeAllPods() public virtual {
        _pods.removeAllPods(msg.sender, balanceOf(msg.sender));
    }

    // ERC20 Overrides

    function _afterTokenTransfer(address from, address to, uint256 amount) internal nonReentrant(_guard) override virtual {
        super._afterTokenTransfer(from, to, amount);
        _pods.updateBalances(from, to, amount);
    }
}
