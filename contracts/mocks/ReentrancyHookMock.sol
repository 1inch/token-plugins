// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { IERC20Hooks } from "../interfaces/IERC20Hooks.sol";
import { IHook } from "../interfaces/IHook.sol";

contract ReentrancyHookMock is IHook {
    IERC20Hooks public immutable TOKEN;
    address public immutable ATTACKED_HOOK;

    constructor(IERC20Hooks _token, address _attackedHook) {
        TOKEN = _token;
        ATTACKED_HOOK = _attackedHook;
    }

    function updateBalances(address /* from */, address to, uint256 /* amount */) external {
        if (to == address(0)) {
           TOKEN.removeHook(ATTACKED_HOOK);
        }
    }

    function attack() external {
        TOKEN.addHook(address(this));
        TOKEN.addHook(ATTACKED_HOOK);
        TOKEN.removeAllHooks();
    }
}
