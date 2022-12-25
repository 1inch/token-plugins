// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./interfaces/IPod.sol";
import "./interfaces/IPodWithId.sol";
import "./interfaces/IERC20Pods.sol";

abstract contract Pod is IPod, IPodWithId {
    error AccessDenied();

    IERC20Pods public immutable token;
    uint256 public immutable tokenId;

    modifier onlyToken {
        if (msg.sender != address(token)) revert AccessDenied();
        _;
    }

    modifier onlyTokenId(uint256 id) {
        if (id != tokenId) revert AccessDenied();
        _;
    }

    constructor(IERC20Pods token_, uint256 tokenId_) {
        token = token_;
        tokenId = tokenId_;
    }

    function updateBalances(address from, address to, uint256 amount) external onlyToken {
        _updateBalances(from, to, amount);
    }

    function updateBalancesWithTokenId(address from, address to, uint256 amount, uint256 id) external onlyToken onlyTokenId(id) {
        _updateBalances(from, to, amount);
    }

    function _updateBalances(address from, address to, uint256 amount) internal virtual;
}
