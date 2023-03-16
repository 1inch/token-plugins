// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20Pods, Pod } from "../Pod.sol";

contract WrongPodMock is ERC20, Pod {
    error PodsUpdateBalanceRevert();

    bool public isRevert;
    bool public isOutOfGas;
    bool public isReturnGasBomb;

    constructor(string memory name, string memory symbol, IERC20Pods token_) ERC20(name, symbol) Pod(token_) {} // solhint-disable-line no-empty-blocks

    function _updateBalances(address /*from*/, address /*to*/, uint256 /*amount*/) internal view override {
        if (isRevert) revert PodsUpdateBalanceRevert();
        if (isOutOfGas) assert(false);
        if (isReturnGasBomb) { assembly ("memory-safe") { return(0, 1000000) } } // solhint-disable-line no-inline-assembly
    }

    function setIsRevert(bool isRevert_) external {
        isRevert = isRevert_;
    }

    function setOutOfGas(bool isOutOfGas_) external {
        isOutOfGas = isOutOfGas_;
    }

    function setReturnGasBomb(bool isReturnGasBomb_) external {
        isReturnGasBomb = isReturnGasBomb_;
    }
}
