// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20Hooks, Hook } from "../Hook.sol";

contract BadHookMock is ERC20, Hook {
    bool public isRevert;
    bool public outOfGas;
    bool public returnGasBomb;

    constructor(string memory name, string memory symbol, IERC20Hooks token)
        ERC20(name, symbol)
        Hook(token)
    {}

    function setIsRevert(bool v) external {
        isRevert = v;
    }
    function setOutOfGas(bool v) external {
        outOfGas = v;
    }
    function setReturnGasBomb(bool v) external {
        returnGasBomb = v;
    }

    function _updateBalances(address, address, uint256) internal override {
        if (isRevert) revert("revert");
        if (outOfGas) while (true) {}
        if (returnGasBomb) assembly { invalid() }
    }
}
