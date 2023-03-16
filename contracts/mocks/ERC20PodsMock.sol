// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Pods } from "../ERC20Pods.sol";

contract ERC20PodsMock is ERC20Pods {
    constructor(string memory name, string memory symbol, uint256 podsLimit, uint256 podCallGasLimit)
        ERC20(name, symbol)
        ERC20Pods(podsLimit, podCallGasLimit)
    {} // solhint-disable-line no-empty-blocks

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}
