// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

import "./interfaces/IERC1155Pods.sol";
import "./TokenPodsLib.sol";
import "./libs/ReentrancyGuard.sol";

abstract contract ERC1155Pods is ERC1155, IERC1155Pods, ReentrancyGuardExt {
    using TokenPodsLib for TokenPodsLib.Data;

    error PodsLimitReachedForAccount();

    uint256 public immutable podsLimit;

    ReentrancyGuardLib.Data private _guard;
    mapping(uint256 => TokenPodsLib.Data) private _pods;

    constructor(uint256 podsLimit_) {
        podsLimit = podsLimit_;
    }

    function hasPod(address account, address pod, uint256 id) public view virtual returns(bool) {
        return _pods[id].hasPod(account, pod);
    }

    function podsCount(address account, uint256 id) public view virtual returns(uint256) {
        return _pods[id].podsCount(account);
    }

    function podAt(address account, uint256 index, uint256 id) public view virtual returns(address) {
        return _pods[id].podAt(account, index);
    }

    function pods(address account, uint256 id) public view virtual returns(address[] memory) {
        return _pods[id].pods(account);
    }

    function balanceOf(address account, uint256 id) public nonReentrantView(_guard) view override(IERC1155, ERC1155) virtual returns(uint256) {
        return super.balanceOf(account, id);
    }

    function podBalanceOf(address pod, address account, uint256 id) public nonReentrantView(_guard) view returns(uint256) {
        return _pods[id].podBalanceOf(account, pod, balanceOf(msg.sender, id));
    }

    function addPod(address pod, uint256 id) public virtual {
        if (_pods[id].addPod(msg.sender, pod, balanceOf(msg.sender, id)) > podsLimit) revert PodsLimitReachedForAccount();
    }

    function removePod(address pod, uint256 id) public virtual {
        _pods[id].removePod(msg.sender, pod, balanceOf(msg.sender, id));
    }

    function removeAllPods(uint256 id) public virtual {
        _pods[id].removeAllPods(msg.sender, balanceOf(msg.sender, id));
    }

    // ERC1155 Overrides

    function _afterTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override virtual {
        super._afterTokenTransfer(operator, from, to, ids, amounts, data);

        unchecked {
            for (uint256 i = 0; i < ids.length; i++) {
                _pods[ids[i]].updateBalancesWithTokenId(from, to, amounts[i], ids[i]);
            }
        }
    }
}
