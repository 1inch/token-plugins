// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../contracts/Pod.sol";

contract PodMock is ERC20, Pod {
    error PodsUpdateBalanceRevert();

    bool public isRevert;
    bool public isOutOfGas;

    constructor(string memory name, string memory symbol, address token_) ERC20(name, symbol) Pod(token_) {} // solhint-disable-line no-empty-blocks

    function updateBalances(address from, address to, uint256 amount) external {
        if (isRevert) revert PodsUpdateBalanceRevert();
        if (isOutOfGas) assert(false);
        if (from == address(0)) {
            _mint(to, amount);
        } else if (to == address(0)) {
            _burn(from, amount);
        } else {
            _transfer(from, to, amount);
        }
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setIsRevert(bool isRevert_) external {
        isRevert = isRevert_;
    }

    function setOutOfGas(bool isOutOfGas_) external {
        isOutOfGas = isOutOfGas_;
    }
}
