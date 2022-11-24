// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

library ReentrancyGuardLib {
    error ReentrantCall();

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    struct Data {
        uint256 _status;
    }

    function init(Data storage self) internal {
        self._status = _NOT_ENTERED;
    }

    function enter(Data storage self) internal {
        if (self._status == _ENTERED) revert ReentrantCall();
        self._status = _ENTERED;
    }

    function exit(Data storage self) internal {
        self._status = _NOT_ENTERED;
    }

    function check(Data storage self) internal view returns (bool) {
        return self._status == _ENTERED;
    }
}

contract ReentrancyGuardExt {
    using ReentrancyGuardLib for ReentrancyGuardLib.Data;

    modifier nonReentrant(ReentrancyGuardLib.Data storage self) {
        self.enter();
        _;
        self.exit();
    }

    modifier nonReentrantView(ReentrancyGuardLib.Data storage self) {
        if (self.check()) revert ReentrancyGuardLib.ReentrantCall();
        _;
    }
}
