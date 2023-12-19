// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20Plugins, Plugin } from "../Plugin.sol";

contract GasLimitedPluginMock is ERC20, Plugin {
    error InsufficientGas();

    uint256 public immutable GAS_LIMIT;

    constructor(uint256 gasLimit_, IERC20Plugins token)
        ERC20(type(GasLimitedPluginMock).name, "GLPM")
        Plugin(token)
    {
        GAS_LIMIT = gasLimit_;
    }

    function _updateBalances(address from, address to, uint256 amount) internal override {
        if (from == address(0)) {
            _mint(to, amount);
        } else if (to == address(0)) {
            _burn(from, amount);
        } else {
            _transfer(from, to, amount);
        }

        if (gasleft() < GAS_LIMIT) {
            revert InsufficientGas();
        }
    }
}
