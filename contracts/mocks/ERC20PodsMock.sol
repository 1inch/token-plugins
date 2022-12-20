// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../ERC20Pods.sol";

contract ERC20PodsMock is ERC20Pods {
    uint256 private constant _POD_CALL_GAS_LIMIT = 200_000;

    constructor(string memory name, string memory symbol, uint256 podsLimit)
        ERC20(name, symbol)
        ERC20Pods(podsLimit, _POD_CALL_GAS_LIMIT)
    {} // solhint-disable-line no-empty-blocks

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}
