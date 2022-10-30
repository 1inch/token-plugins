const { ether, expect, constants } = require('@1inch/solidity-utils');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers } = require('hardhat');

const POD_LIMITS = 10;

describe('ERC20Pods', function () {
    let wallet1, wallet2, wallet3;

    before(async function () {
        [wallet1, wallet2, wallet3] = await ethers.getSigners();
    });

    async function initContracts () {
        const Erc20PodsMock = await ethers.getContractFactory('ERC20PodsMock');
        const erc20Pods = await Erc20PodsMock.deploy('ERC20PodsMock', 'EPM', POD_LIMITS);
        await erc20Pods.deployed();

        const pods = [];
        for (let i = 0; i < POD_LIMITS; i++) {
            const Token = await ethers.getContractFactory('TokenMock');
            const token = await Token.deploy(`TOKEN_${i}`, `TKN${i}`);
            await token.deployed();
            const PodMock = await ethers.getContractFactory('PodMock');
            pods[i] = await PodMock.deploy(`POD_TOKEN_${i}`, `PT${i}`, token.address);
            await pods[i].deployed();
        }
        return { erc20Pods, pods };
    };

    describe('addPod', function () {
        beforeEach(async function () {
            Object.assign(this, await loadFixture(initContracts));
        });

        it('should not add pod with zero-address', async function () {
            await expect(this.erc20Pods.addPod(constants.ZERO_ADDRESS))
                .to.be.revertedWithCustomError(this.erc20Pods, 'InvalidPodAddress');
        });

        it('should add pod', async function () {
            expect(await this.erc20Pods.hasPod(wallet1.address, this.pods[0].address)).to.be.equals(false);
            await this.erc20Pods.addPod(this.pods[0].address);
            expect(await this.erc20Pods.hasPod(wallet1.address, this.pods[0].address)).to.be.equals(true);
        });

        it('should not add pod twice from one wallet', async function () {
            await this.erc20Pods.addPod(constants.EEE_ADDRESS);
            await expect(this.erc20Pods.addPod(constants.EEE_ADDRESS))
                .to.be.revertedWithCustomError(this.erc20Pods, 'PodAlreadyAdded');
        });

        it('should add the same pod for different wallets', async function () {
            expect(await this.erc20Pods.hasPod(wallet1.address, this.pods[0].address)).to.be.equals(false);
            expect(await this.erc20Pods.hasPod(wallet2.address, this.pods[0].address)).to.be.equals(false);
            await this.erc20Pods.addPod(this.pods[0].address);
            await this.erc20Pods.connect(wallet2).addPod(this.pods[0].address);
            expect(await this.erc20Pods.hasPod(wallet1.address, this.pods[0].address)).to.be.equals(true);
            expect(await this.erc20Pods.hasPod(wallet2.address, this.pods[0].address)).to.be.equals(true);
        });

        it('should add different pod', async function () {
            expect(await this.erc20Pods.hasPod(wallet1.address, this.pods[0].address)).to.be.equals(false);
            expect(await this.erc20Pods.hasPod(wallet1.address, this.pods[1].address)).to.be.equals(false);
            await this.erc20Pods.addPod(this.pods[0].address);
            await this.erc20Pods.addPod(this.pods[1].address);
            expect(await this.erc20Pods.pods(wallet1.address)).to.have.deep.equals([this.pods[0].address, this.pods[1].address]);
        });

        it('should not add pod amounts more than limit', async function () {
            for (let i = 0; i < POD_LIMITS; i++) {
                await this.erc20Pods.addPod(this.pods[i].address);
            }
            await expect(this.erc20Pods.addPod(constants.EEE_ADDRESS))
                .to.be.revertedWithCustomError(this.erc20Pods, 'PodsLimitReachedForAccount');
        });

        it('should updateBalance via pod only for wallets with non-zero balance', async function () {
            await this.erc20Pods.mint(wallet1.address, ether('1'));
            // addPod for wallet with balance
            expect(await this.pods[0].balanceOf(wallet1.address)).to.be.equals('0');
            await this.erc20Pods.addPod(this.pods[0].address);
            expect(await this.pods[0].balanceOf(wallet1.address)).to.be.equals(ether('1'));
            // addPod for wallet without balance
            expect(await this.pods[0].balanceOf(wallet2.address)).to.be.equals('0');
            await this.erc20Pods.connect(wallet2).addPod(this.pods[0].address);
            expect(await this.pods[0].balanceOf(wallet2.address)).to.be.equals('0');
        });

        it('should not fail when updateBalance in pod reverts', async function () {
            await this.pods[0].setIsRevert(true);
            await expect(this.pods[0].updateBalances(wallet1.address, wallet2.address, ether('1')))
                .to.be.revertedWithCustomError(this.pods[0], 'PodsUpdateBalanceRevert');
            await this.erc20Pods.addPod(this.pods[0].address);
            expect(await this.erc20Pods.pods(wallet1.address)).to.have.deep.equals([this.pods[0].address]);
        });

        it('should not fail when updateBalance in pod has OutOfGas', async function () {
            await this.pods[0].setOutOfGas(true);
            await this.erc20Pods.addPod(this.pods[0].address);
            expect(await this.erc20Pods.pods(wallet1.address)).to.have.deep.equals([this.pods[0].address]);
        });
    });

    describe('removePod', function () {
        beforeEach(async function () {
            Object.assign(this, await loadFixture(initContracts));
            await this.erc20Pods.connect(wallet1).addPod(this.pods[0].address);
            await this.erc20Pods.connect(wallet2).addPod(this.pods[0].address);
        });

        it('should not remove non-added pod', async function () {
            await expect(this.erc20Pods.removePod(this.pods[1].address))
                .to.be.revertedWithCustomError(this.erc20Pods, 'PodNotFound');
        });

        it('should remove pod', async function () {
            expect(await this.erc20Pods.hasPod(wallet1.address, this.pods[0].address)).to.be.equals(true);
            await this.erc20Pods.removePod(this.pods[0].address);
            expect(await this.erc20Pods.hasPod(wallet1.address, this.pods[0].address)).to.be.equals(false);
        });

        it('should updateBalance via pod only for wallets with non-zero balance', async function () {
            await this.erc20Pods.mint(wallet1.address, ether('1'));
            await this.pods[0].mint(wallet2.address, ether('1'));
            // removePod for wallet with balance
            expect(await this.pods[0].balanceOf(wallet1.address)).to.be.equals(ether('1'));
            await this.erc20Pods.removePod(this.pods[0].address);
            expect(await this.pods[0].balanceOf(wallet1.address)).to.be.equals('0');
            // removePod for wallet without balance
            expect(await this.pods[0].balanceOf(wallet2.address)).to.be.equals(ether('1'));
            await this.erc20Pods.connect(wallet2).removePod(this.pods[0].address);
            expect(await this.pods[0].balanceOf(wallet2.address)).to.be.equals(ether('1'));
        });
    });
});
