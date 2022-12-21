// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../Pod.sol";

contract PodMock is ERC20, Pod {
    constructor(string memory name, string memory symbol, IERC20Pods token_) ERC20(name, symbol) Pod(token_) {} // solhint-disable-line no-empty-blocks

    function updateBalances(address from, address to, uint256 amount) external {
        if (from == address(0)) {
            _mint(to, amount);
        } else if (to == address(0)) {
            _burn(from, amount);
        } else {
            _transfer(from, to, amount);
        }
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
