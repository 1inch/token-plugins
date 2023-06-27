// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20Pods, Pod } from "../Pod.sol";

contract GasLimitPodMock is ERC20, Pod {
    error InsufficientGas();

    uint256 public immutable gasLimit;

    constructor(uint256 gasLimit_, IERC20Pods token)
        ERC20(type(GasLimitPodMock).name, "GLPM")
        Pod(token)
    {
        gasLimit = gasLimit_;
    }

    function _updateBalances(address from, address to, uint256 amount) internal override {
        if (from == address(0)) {
            _mint(to, amount);
        } else if (to == address(0)) {
            _burn(from, amount);
        } else {
            _transfer(from, to, amount);
        }

        if (gasleft() < gasLimit) {
            revert InsufficientGas();
        }
    }
}
