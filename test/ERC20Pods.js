const { expect, ether } = require('@1inch/solidity-utils');
const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { shouldBehaveLikeERC20Pods, shouldBehaveLikeERC20PodsTransfers } = require('./behaviors/ERC20Pods.behavior');

const POD_LIMITS = 10;

describe('ERC20Pods', function () {
    let wallet1;

    before(async function () {
        [wallet1] = await ethers.getSigners();
    });

    async function initContracts () {
        const ERC20PodsMock = await ethers.getContractFactory('ERC20PodsMock');
        const erc20Pods = await ERC20PodsMock.deploy('ERC20PodsMock', 'EPM', POD_LIMITS);
        await erc20Pods.deployed();

        const pods = [];
        for (let i = 0; i < POD_LIMITS; i++) {
            const PodMock = await ethers.getContractFactory('PodMock');
            pods[i] = await PodMock.deploy(`POD_TOKEN_${i}`, `PT${i}`, erc20Pods.address);
            await pods[i].deployed();
        }
        const amount = ether('1');
        return { erc20Pods, pods, amount };
    };

    async function initWrongPodAndMint () {
        const { erc20Pods, amount } = await initContracts();
        await erc20Pods.mint(wallet1.address, amount);
        const WrongPodMock = await ethers.getContractFactory('WrongPodMock');
        const wrongPod = await WrongPodMock.deploy('WrongPodMock', 'WPM', erc20Pods.address);
        await wrongPod.deployed();
        return { erc20Pods, wrongPod, amount };
    };

    shouldBehaveLikeERC20Pods(initContracts);

    shouldBehaveLikeERC20PodsTransfers(initContracts);

    it('should not fail when updateBalance returns gas bomb @skip-on-coverage', async function () {
        const { erc20Pods, wrongPod } = await loadFixture(initWrongPodAndMint);
        await wrongPod.setReturnGasBomb(true);
        const tx = await erc20Pods.addPod(wrongPod.address);
        const receipt = await tx.wait();
        expect(receipt.gasUsed).to.be.lt(275883);
        expect(await erc20Pods.pods(wallet1.address)).to.have.deep.equals([wrongPod.address]);
    });
});
