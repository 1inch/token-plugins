// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/IERC20Pods.sol";
import "../Pod.sol";

contract WhitelistedPodMock is ERC20, Pod, Ownable {
    error AlreadyWhitelisted();

    constructor(string memory name, string memory symbol, address token_)
        ERC20(name, symbol)
        Pod(token_, 0)
    {} // solhint-disable-line no-empty-blocks

    mapping(address => bool) public isWhitelisted;

    function whitelist(address account) external onlyOwner {
        if (isWhitelisted[account]) revert AlreadyWhitelisted();
        isWhitelisted[account] = true;
        uint256 balance = IERC20Pods(token).podBalanceOf(address(this), account);
        if (balance > 0) {
            _updateBalances(address(0), account, balance);
        }
    }

    function _updateBalances(address from, address to, uint256 amount) internal override {
        // Replace non-whitelisted accounts with address(0)
        if (!isWhitelisted[from]) {
            from = address(0);
        }
        if (!isWhitelisted[to]) {
            to = address(0);
        }

        // Replicate balances
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
