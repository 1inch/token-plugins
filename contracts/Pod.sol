// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./interfaces/IPod.sol";
import "./interfaces/IERC20Pods.sol";

abstract contract Pod is IPod {
    error AccessDenied();

    IERC20Pods public immutable token;

    modifier onlyToken {
        if (msg.sender != address(token)) revert AccessDenied();
        _;
    }

    constructor(IERC20Pods token_) {
        token = token_;
    }

    function updateBalances(address from, address to, uint256 amount) external onlyToken {
        _updateBalances(from, to, amount);
    }

    function _updateBalances(address from, address to, uint256 amount) internal virtual;
}
