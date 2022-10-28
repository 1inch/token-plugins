const { expect } = require('@1inch/solidity-utils');
const { ethers } = require('hardhat');

const TokenMock = artifacts.require('TokenMock');

describe('ERC20Pods', function () {
    let wallet1, wallet2, wallet3;

    before(async function () {
        [wallet1, wallet2, wallet3] = await ethers.getSigners();
    });

    beforeEach(async function () {
        this.token = await TokenMock.new('Token', 'TKN', 10);
    });

    it('should be ok', async function () {
        expect(await this.token.balanceOf(wallet1.address)).to.be.equal(0);
        expect(await this.token.balanceOf(wallet2.address)).to.be.equal(0);
        expect(await this.token.balanceOf(wallet3.address)).to.be.equal(0);
    });
});
