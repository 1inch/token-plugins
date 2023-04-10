const { expect, ether } = require('@1inch/solidity-utils');
const hre = require('hardhat');
const { ethers } = hre;
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { shouldBehaveLikeERC20Pods, shouldBehaveLikeERC20PodsTransfers } = require('./behaviors/ERC20Pods.behavior');

const POD_LIMITS = 10;
const POD_GAS_LIMIT = 200_000;

describe('ERC20Pods', function () {
    let wallet1;

    before(async function () {
        [wallet1] = await ethers.getSigners();
    });

    async function initContracts () {
        const ERC20PodsMock = await ethers.getContractFactory('ERC20PodsMock');
        const erc20Pods = await ERC20PodsMock.deploy('ERC20PodsMock', 'EPM', POD_LIMITS, POD_GAS_LIMIT);
        await erc20Pods.deployed();

        const amount = ether('1');
        await erc20Pods.mint(wallet1.address, amount);
        return { erc20Pods, POD_LIMITS, amount };
    };

    async function initWrongPod () {
        const { erc20Pods, amount } = await initContracts();
        const WrongPodMock = await ethers.getContractFactory('WrongPodMock');
        const wrongPod = await WrongPodMock.deploy('WrongPodMock', 'WPM', erc20Pods.address);
        await wrongPod.deployed();
        return { erc20Pods, wrongPod, amount };
    };

    shouldBehaveLikeERC20Pods(initContracts);

    shouldBehaveLikeERC20PodsTransfers(initContracts);

    it('should not fail when updateBalance returns gas bomb', async function () {
        if (hre.__SOLIDITY_COVERAGE_RUNNING) { this.skip(); }
        const { erc20Pods, wrongPod } = await loadFixture(initWrongPod);
        await wrongPod.setReturnGasBomb(true);
        const receipt = await (await erc20Pods.addPod(wrongPod.address)).wait();
        expect(receipt.gasUsed).to.be.lt(POD_GAS_LIMIT * 2);
        expect(await erc20Pods.pods(wallet1.address)).to.have.deep.equals([wrongPod.address]);
    });
});
