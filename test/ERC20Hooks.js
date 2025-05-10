const { expect, ether } = require('@1inch/solidity-utils');
const hre = require('hardhat');
const { ethers } = hre;
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { shouldBehaveLikeERC20Hooks, shouldBehaveLikeERC20HooksTransfers } = require('./behaviors/ERC20Hooks.behavior');

const HOOK_COUNT_LIMITS = 10;
const HOOK_GAS_LIMIT = 200_000;

describe('ERC20Hooks', function () {
    let wallet1;

    before(async function () {
        [wallet1] = await ethers.getSigners();
    });

    async function initContracts () {
        const ERC20HooksMock = await ethers.getContractFactory('ERC20HooksMock');
        const erc20Hooks = await ERC20HooksMock.deploy('ERC20HooksMock', 'EHM', HOOK_COUNT_LIMITS, HOOK_GAS_LIMIT);
        await erc20Hooks.waitForDeployment();

        const amount = ether('1');
        await erc20Hooks.mint(wallet1, amount);
        return { erc20Hooks, HOOK_COUNT_LIMITS, amount };
    };

    async function initHook () {
        const { erc20Hooks, amount } = await initContracts();
        const HookMock = await ethers.getContractFactory('HookMock');
        const hook = await HookMock.deploy('HookMock', 'HM', erc20Hooks);
        await hook.waitForDeployment();
        return { erc20Hooks, hook, amount };
    };

    async function initWrongHook () {
        const { erc20Hooks, amount } = await initContracts();
        const BadHookMock = await ethers.getContractFactory('BadHookMock');
        const wrongHook = await BadHookMock.deploy('BadHookMock', 'WHM', erc20Hooks);
        await wrongHook.waitForDeployment();
        return { erc20Hooks, wrongHook, amount };
    };

    async function initGasLimitHookMock () {
        const { erc20Hooks, amount } = await initContracts();
        const GasLimitedHookMock = await ethers.getContractFactory('GasLimitedHookMock');
        const gasLimitHookMock = await GasLimitedHookMock.deploy(100_000, erc20Hooks);
        await gasLimitHookMock.waitForDeployment();
        return { erc20Hooks, gasLimitHookMock, amount };
    };

    shouldBehaveLikeERC20Hooks(initContracts);

    shouldBehaveLikeERC20HooksTransfers(initContracts);

    it('should work with MockHook with small gas limit', async function () {
        const { erc20Hooks, hook } = await loadFixture(initHook);
        const estimateGas = await erc20Hooks.addHook.estimateGas(hook);
        expect(estimateGas).to.be.lt(HOOK_GAS_LIMIT);

        const receipt = await (await erc20Hooks.addHook(hook, { gasLimit: estimateGas })).wait();
        expect(receipt.gasUsed).to.be.lt(HOOK_GAS_LIMIT);

        expect(await erc20Hooks.hooks(wallet1)).to.have.deep.equals([await hook.getAddress()]);
    });

    it('should not fail when updateBalance returns gas bomb', async function () {
        if (hre.__SOLIDITY_COVERAGE_RUNNING) { this.skip(); }
        const { erc20Hooks, wrongHook } = await loadFixture(initWrongHook);
        await wrongHook.setReturnGasBomb(true);
        const receipt = await (await erc20Hooks.addHook(wrongHook)).wait();
        expect(receipt.gasUsed).to.be.lt(HOOK_GAS_LIMIT * 2);
        expect(await erc20Hooks.hooks(wallet1)).to.have.deep.equals([await wrongHook.getAddress()]);
    });

    it('should handle low-gas-related reverts in hooks', async function () {
        if (hre.__SOLIDITY_COVERAGE_RUNNING) { this.skip(); }
        const { erc20Hooks, gasLimitHookMock } = await loadFixture(initGasLimitHookMock);

        const estimateGas = await erc20Hooks.addHook.estimateGas(gasLimitHookMock);
        expect(estimateGas).to.be.lt(HOOK_GAS_LIMIT * 2);

        const receipt = await (await erc20Hooks.addHook(gasLimitHookMock, { gasLimit: estimateGas })).wait();
        expect(receipt.gasUsed).to.be.lt(HOOK_GAS_LIMIT * 2);

        expect(await erc20Hooks.hooks(wallet1)).to.have.deep.equals(
            [await gasLimitHookMock.getAddress()],
        );
    });

    it('should fail with low-gas-related reverts in hooks', async function () {
        if (hre.__SOLIDITY_COVERAGE_RUNNING) { this.skip(); }
        const { erc20Hooks, gasLimitHookMock } = await loadFixture(initGasLimitHookMock);

        await expect(erc20Hooks.addHook(gasLimitHookMock, { gasLimit: HOOK_GAS_LIMIT }))
            .to.be.revertedWithCustomError(gasLimitHookMock, 'InsufficientGas');
    });
});
