// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Hooks } from "../ERC20Hooks.sol";

contract ERC20HooksMock is ERC20Hooks {
    constructor(string memory name, string memory symbol, uint256 maxHooksPerAccount, uint256 hookCallGasLimit)
        ERC20(name, symbol)
        ERC20Hooks(maxHooksPerAccount, hookCallGasLimit)
    {} // solhint-disable-line no-empty-blocks

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}
