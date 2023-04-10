// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IERC20Pods is IERC20 {
    event PodAdded(address account, address pod);
    event PodRemoved(address account, address pod);

    function podsLimit() external view returns(uint256);
    function podCallGasLimit() external view returns(uint256);
    function hasPod(address account, address pod) external view returns(bool);
    function podsCount(address account) external view returns(uint256);
    function podAt(address account, uint256 index) external view returns(address);
    function pods(address account) external view returns(address[] memory);
    function podBalanceOf(address pod, address account) external view returns(uint256);

    function addPod(address pod) external;
    function removePod(address pod) external;
    function removeAllPods() external;
}
