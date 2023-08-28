// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @title ReentrancyGuardLib
 * @dev Library that provides reentrancy protection for functions.
 */
library ReentrancyGuardLib {

    /// @dev Emit when reentrancy detected
    error ReentrantCall();

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    /// @dev Struct to hold the current status of the contract.
    struct Data {
        uint256 _status;
    }

    /**
     * @dev Initializes the struct with the current status set to not entered.
     * @param self The storage reference to the struct.
     */
    function init(Data storage self) internal {
        self._status = _NOT_ENTERED;
    }

    /**
     * @dev Sets the status to entered if it is not already entered, otherwise reverts.
     * @param self The storage reference to the struct.
     */
    function enter(Data storage self) internal {
        if (self._status == _ENTERED) revert ReentrantCall();
        self._status = _ENTERED;
    }

    /**
     * @dev Resets the status to not entered.
     * @param self The storage reference to the struct.
     */
    function exit(Data storage self) internal {
        self._status = _NOT_ENTERED;
    }

    /**
     * @dev Checks the current status of the contract to ensure that it is not already entered.
     * @param self The storage reference to the struct.
     * @return Whether or not the contract is currently entered.
     */
    function check(Data storage self) internal view returns (bool) {
        return self._status == _ENTERED;
    }
}

/**
 * @title ReentrancyGuardExt
 * @dev Contract that uses the ReentrancyGuardLib to provide reentrancy protection.
 */
contract ReentrancyGuardExt {
    using ReentrancyGuardLib for ReentrancyGuardLib.Data;

    /**
     * @dev Modifier that prevents a contract from calling itself, directly or indirectly.
     * @param self The storage reference to the struct.
     */
    modifier nonReentrant(ReentrancyGuardLib.Data storage self) {
        self.enter();
        _;
        self.exit();
    }

    /**
     * @dev Modifier that prevents calls to a function from `nonReentrant` functions, directly or indirectly.
     * @param self The storage reference to the struct.
     */
    modifier nonReentrantView(ReentrancyGuardLib.Data storage self) {
        if (self.check()) revert ReentrancyGuardLib.ReentrantCall();
        _;
    }
}
