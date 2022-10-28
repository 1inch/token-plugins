// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@1inch/solidity-utils/contracts/libraries/AddressSet.sol";

import "./interfaces/IPod.sol";

abstract contract Pod is IPod {
    error AccessDenied();

    address public immutable token;

    modifier onlyToken {
        if (msg.sender != token) revert AccessDenied();
        _;
    }

    constructor(address token_) {
        token = token_;
    }
}
