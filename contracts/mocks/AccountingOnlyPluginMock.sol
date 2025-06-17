// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20Plugins, Plugin } from "../Plugin.sol";

contract AccountingOnlyPluginMock is ERC20, Plugin {
    uint256 public updateBalanceBurnCounter = 0;
    uint256 public udateBalanceMintCounter = 0;

    constructor(string memory name, string memory symbol, IERC20Plugins token_)
        ERC20(name, symbol)
        Plugin(token_)
    {} // solhint-disable-line no-empty-blocks

    function _updateBalances(address from, address to, uint256 /* amount */) internal override {
        if (from == address(0)) {
            udateBalanceMintCounter++;
        } else if (to == address(0)) {
            updateBalanceBurnCounter++;
        } else {
            updateBalanceBurnCounter++;
            udateBalanceMintCounter++;
        }
    }
}
