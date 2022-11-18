
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@1inch/solidity-utils/contracts/libraries/AddressSet.sol";

import "./interfaces/ITokenPods.sol";
import "./TokenPods.sol";

abstract contract ERC721Pods is ERC721, TokenPods {
    constructor(uint256 podsLimit) TokenPods(podsLimit) {}

    function _balanceOf(address account) internal view override virtual returns(uint256) {
        return balanceOf(account);
    }

    function _afterTokenTransfer(address from, address to, uint256 firstTokenId, uint256 batchSize) internal override virtual {
        super._afterTokenTransfer(from, to, firstTokenId, batchSize);
        _updatePodsBalances(from, to, batchSize);
    }
}
