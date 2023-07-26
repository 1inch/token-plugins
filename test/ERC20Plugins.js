const { expect, ether } = require('@1inch/solidity-utils');
const hre = require('hardhat');
const { ethers } = hre;
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { shouldBehaveLikeERC20Plugins, shouldBehaveLikeERC20PluginsTransfers } = require('./behaviors/ERC20Plugins.behavior');

const PLUGIN_COUNT_LIMITS = 10;
const PLUGIN_GAS_LIMIT = 200_000;

describe('ERC20Plugins', function () {
    let wallet1;

    before(async function () {
        [wallet1] = await ethers.getSigners();
    });

    async function initContracts () {
        const ERC20PluginsMock = await ethers.getContractFactory('ERC20PluginsMock');
        const erc20Plugins = await ERC20PluginsMock.deploy('ERC20PluginsMock', 'EPM', PLUGIN_COUNT_LIMITS, PLUGIN_GAS_LIMIT);
        await erc20Plugins.waitForDeployment();

        const amount = ether('1');
        await erc20Plugins.mint(wallet1, amount);
        return { erc20Plugins, PLUGIN_COUNT_LIMITS, amount };
    };

    async function initPlugin () {
        const { erc20Plugins, amount } = await initContracts();
        const PluginMock = await ethers.getContractFactory('PluginMock');
        const plugin = await PluginMock.deploy('PluginMock', 'PM', erc20Plugins);
        await plugin.waitForDeployment();
        return { erc20Plugins, plugin, amount };
    };

    async function initWrongPlugin () {
        const { erc20Plugins, amount } = await initContracts();
        const BadPluginMock = await ethers.getContractFactory('BadPluginMock');
        const wrongPlugin = await BadPluginMock.deploy('BadPluginMock', 'WPM', erc20Plugins);
        await wrongPlugin.waitForDeployment();
        return { erc20Plugins, wrongPlugin, amount };
    };

    async function initGasLimitPluginMock () {
        const { erc20Plugins, amount } = await initContracts();
        const GasLimitedPluginMock = await ethers.getContractFactory('GasLimitedPluginMock');
        const gasLimitPluginMock = await GasLimitedPluginMock.deploy(100_000, erc20Plugins);
        await gasLimitPluginMock.waitForDeployment();
        return { erc20Plugins, gasLimitPluginMock, amount };
    };

    shouldBehaveLikeERC20Plugins(initContracts);

    shouldBehaveLikeERC20PluginsTransfers(initContracts);

    it('should work with MockPlugin with small gas limit', async function () {
        const { erc20Plugins, plugin } = await loadFixture(initPlugin);
        const estimateGas = await erc20Plugins.addPlugin.estimateGas(plugin);
        expect(estimateGas).to.be.lt(PLUGIN_GAS_LIMIT);

        const receipt = await (await erc20Plugins.addPlugin(plugin, { gasLimit: estimateGas })).wait();
        expect(receipt.gasUsed).to.be.lt(PLUGIN_GAS_LIMIT);

        expect(await erc20Plugins.plugins(wallet1)).to.have.deep.equals([await plugin.getAddress()]);
    });

    it('should not fail when updateBalance returns gas bomb', async function () {
        if (hre.__SOLIDITY_COVERAGE_RUNNING) { this.skip(); }
        const { erc20Plugins, wrongPlugin } = await loadFixture(initWrongPlugin);
        await wrongPlugin.setReturnGasBomb(true);
        const receipt = await (await erc20Plugins.addPlugin(wrongPlugin)).wait();
        expect(receipt.gasUsed).to.be.lt(PLUGIN_GAS_LIMIT * 2);
        expect(await erc20Plugins.plugins(wallet1)).to.have.deep.equals([await wrongPlugin.getAddress()]);
    });

    it('should handle low-gas-related reverts in plugins', async function () {
        if (hre.__SOLIDITY_COVERAGE_RUNNING) { this.skip(); }
        const { erc20Plugins, gasLimitPluginMock } = await loadFixture(initGasLimitPluginMock);

        const estimateGas = await erc20Plugins.addPlugin.estimateGas(gasLimitPluginMock);
        expect(estimateGas).to.be.lt(PLUGIN_GAS_LIMIT * 2);

        const receipt = await (await erc20Plugins.addPlugin(gasLimitPluginMock, { gasLimit: estimateGas })).wait();
        expect(receipt.gasUsed).to.be.lt(PLUGIN_GAS_LIMIT * 2);

        expect(await erc20Plugins.plugins(wallet1)).to.have.deep.equals(
            [await gasLimitPluginMock.getAddress()],
        );
    });

    it('should fail with low-gas-related reverts in plugins', async function () {
        if (hre.__SOLIDITY_COVERAGE_RUNNING) { this.skip(); }
        const { erc20Plugins, gasLimitPluginMock } = await loadFixture(initGasLimitPluginMock);

        await expect(erc20Plugins.addPlugin(gasLimitPluginMock, { gasLimit: PLUGIN_GAS_LIMIT }))
            .to.be.revertedWithCustomError(gasLimitPluginMock, 'InsufficientGas');
    });
});
