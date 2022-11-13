const { ether } = require('@1inch/solidity-utils');
const { ethers } = require('hardhat');
const { shouldBehaveLikeERC20Pods } = require('./behaviors/ERC20Pods.behavior');

const POD_LIMITS = 10;

describe('ERC20Pods', function () {
    async function initContracts () {
        const ERC20PodsMock = await ethers.getContractFactory('ERC20PodsMock');
        const erc20Pods = await ERC20PodsMock.deploy('ERC20PodsMock', 'EPM', POD_LIMITS);
        await erc20Pods.deployed();

        const pods = [];
        for (let i = 0; i < POD_LIMITS; i++) {
            const token = await ERC20PodsMock.deploy(`TOKEN_${i}`, `TKN${i}`, POD_LIMITS);
            await token.deployed();
            const PodMock = await ethers.getContractFactory('PodMock');
            pods[i] = await PodMock.deploy(`POD_TOKEN_${i}`, `PT${i}`, token.address);
            await pods[i].deployed();
        }
        const amount = ether('1');
        return { erc20Pods, pods, amount };
    };

    shouldBehaveLikeERC20Pods(initContracts);
});
