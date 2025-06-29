// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20Hooks, Hook } from "../Hook.sol";

contract AccountingOnlyHookMock is ERC20, Hook {
    uint256 public updateBalanceBurnCounter = 0;
    uint256 public updateBalanceMintCounter = 0;

    constructor(string memory name, string memory symbol, IERC20Hooks token_)
        ERC20(name, symbol)
        Hook(token_)
    {} // solhint-disable-line no-empty-blocks

    function _updateBalances(address from, address to, uint256 /* amount */) internal override {
        if (from == address(0)) {
            updateBalanceMintCounter++;
        } else if (to == address(0)) {
            updateBalanceBurnCounter++;
        } else {
            updateBalanceBurnCounter++;
            updateBalanceMintCounter++;
        }
    }
}
