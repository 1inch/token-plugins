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
        const amount = ether('1');
        return { erc20Pods, pods, amount };
    };

    beforeEach(async function () {
        Object.assign(this, await loadFixture(initContracts));
    });

    describe('view methods', function () {
        it('hasPod should return true when pod added by wallet', async function () {
            await this.erc20Pods.addPod(this.pods[0].address);
            expect(await this.erc20Pods.hasPod(wallet1.address, this.pods[0].address)).to.be.equals(true);
            expect(await this.erc20Pods.hasPod(wallet2.address, this.pods[0].address)).to.be.equals(false);
        });

        it('podsCount should return pods amount which wallet using', async function () {
            for (let i = 0; i < this.pods.length; i++) {
                await this.erc20Pods.addPod(this.pods[i].address);
                expect(await this.erc20Pods.podsCount(wallet1.address)).to.be.equals(i + 1);
            }
            for (let i = 0; i < this.pods.length; i++) {
                await this.erc20Pods.removePod(this.pods[i].address);
                expect(await this.erc20Pods.podsCount(wallet1.address)).to.be.equals(this.pods.length - (i + 1));
            }
        });

        it('podAt should return pod by added pods index', async function () {
            for (let i = 0; i < this.pods.length; i++) {
                await this.erc20Pods.addPod(this.pods[i].address);
                expect(await this.erc20Pods.podAt(wallet1.address, i)).to.be.equals(this.pods[i].address);
                expect(await this.erc20Pods.podAt(wallet1.address, i + 1)).to.be.equals(constants.ZERO_ADDRESS);
            }
            for (let i = this.pods.length - 1; i >= 0; i--) {
                await this.erc20Pods.removePod(this.pods[i].address);
                for (let j = 0; j < this.pods.length; j++) {
                    expect(await this.erc20Pods.podAt(wallet1.address, j))
                        .to.be.equals(
                            j >= i
                                ? constants.ZERO_ADDRESS
                                : this.pods[j].address,
                        );
                };
            }
        });

        it('pods should return array of pods by wallet', async function () {
            const pods = this.pods.map(pod => pod.address);
            for (let i = 0; i < this.pods.length; i++) {
                await this.erc20Pods.addPod(this.pods[i].address);
                expect(await this.erc20Pods.pods(wallet1.address))
                    .to.be.deep.equals(
                        i < this.pods.length - 1
                            ? pods.slice(0, -this.pods.length + 1 + i)
                            : pods,
                    );
            }
        });

        describe('podBalanceOf', function () {
            beforeEach(async function () {
                await this.erc20Pods.mint(wallet1.address, this.amount);
            });

            it('should not return balance for non-added pod', async function () {
                expect(await this.erc20Pods.balanceOf(wallet1.address)).to.be.equals(this.amount);
                expect(await this.erc20Pods.podBalanceOf(this.pods[0].address, wallet1.address)).to.be.equals('0');
            });

            it('should return balance for added pod', async function () {
                await this.erc20Pods.addPod(this.pods[0].address);
                expect(await this.erc20Pods.balanceOf(wallet1.address)).to.be.equals(this.amount);
                expect(await this.erc20Pods.podBalanceOf(this.pods[0].address, wallet1.address)).to.be.equals(this.amount);
            });

            it('should not return balance for removed pod', async function () {
                await this.erc20Pods.addPod(this.pods[0].address);
                await this.erc20Pods.removePod(this.pods[0].address);
                expect(await this.erc20Pods.balanceOf(wallet1.address)).to.be.equals(this.amount);
                expect(await this.erc20Pods.podBalanceOf(this.pods[0].address, wallet1.address)).to.be.equals('0');
            });
        });
    });

    describe('addPod', function () {
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
            await this.erc20Pods.mint(wallet1.address, this.amount);
            // addPod for wallet with balance
            expect(await this.pods[0].balanceOf(wallet1.address)).to.be.equals('0');
            await this.erc20Pods.addPod(this.pods[0].address);
            expect(await this.pods[0].balanceOf(wallet1.address)).to.be.equals(this.amount);
            // addPod for wallet without balance
            expect(await this.pods[0].balanceOf(wallet2.address)).to.be.equals('0');
            await this.erc20Pods.connect(wallet2).addPod(this.pods[0].address);
            expect(await this.pods[0].balanceOf(wallet2.address)).to.be.equals('0');
        });
    });

    describe('removePod', function () {
        beforeEach(async function () {
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
            await this.erc20Pods.mint(wallet1.address, this.amount);
            await this.pods[0].mint(wallet2.address, this.amount);
            // removePod for wallet with balance
            expect(await this.pods[0].balanceOf(wallet1.address)).to.be.equals(this.amount);
            await this.erc20Pods.removePod(this.pods[0].address);
            expect(await this.pods[0].balanceOf(wallet1.address)).to.be.equals('0');
            // removePod for wallet without balance
            expect(await this.pods[0].balanceOf(wallet2.address)).to.be.equals(this.amount);
            await this.erc20Pods.connect(wallet2).removePod(this.pods[0].address);
            expect(await this.pods[0].balanceOf(wallet2.address)).to.be.equals(this.amount);
        });
    });

    describe('removeAllPods', function () {
        beforeEach(async function () {
            for (let i = 0; i < this.pods.length; i++) {
                await this.erc20Pods.connect(wallet1).addPod(this.pods[i].address);
                await this.erc20Pods.connect(wallet2).addPod(this.pods[i].address);
            }
        });

        it('should remove all pods', async function () {
            expect(await this.erc20Pods.podsCount(wallet1.address)).to.be.equals(this.pods.length);
            await this.erc20Pods.removeAllPods();
            expect(await this.erc20Pods.podsCount(wallet1.address)).to.be.equals(0);
        });

        it('should updateBalance via pods only for wallets with non-zero balance', async function () {
            await this.erc20Pods.mint(wallet1.address, this.amount);
            const wallet2BalancedPods = [0, 1, 5, 6, 7]; // random pods with non-zero balance on wallet2
            for (let i = 0; i < this.pods.length; i++) {
                if (wallet2BalancedPods.indexOf(i) !== -1) {
                    await this.pods[i].mint(wallet2.address, this.amount);
                }
            }
            for (let i = 0; i < this.pods.length; i++) {
                expect(await this.pods[i].balanceOf(wallet1.address)).to.be.equals(this.amount);
                expect(await this.pods[i].balanceOf(wallet2.address)).to.be.equals(wallet2BalancedPods.indexOf(i) !== -1 ? this.amount : '0');
            }
            await this.erc20Pods.removeAllPods();
            await this.erc20Pods.connect(wallet2).removeAllPods();
            for (let i = 0; i < this.pods.length; i++) {
                expect(await this.pods[i].balanceOf(wallet1.address)).to.be.equals('0');
                expect(await this.pods[i].balanceOf(wallet2.address)).to.be.equals(wallet2BalancedPods.indexOf(i) !== -1 ? this.amount : '0');
            }
        });
    });

    describe('_updateBalances', function () {
        beforeEach(async function () {
            await this.erc20Pods.mint(wallet1.address, this.amount);
        });

        it('should not fail when updateBalance in pod reverts', async function () {
            await this.pods[0].setIsRevert(true);
            await expect(this.pods[0].updateBalances(wallet1.address, wallet2.address, this.amount))
                .to.be.revertedWithCustomError(this.pods[0], 'PodsUpdateBalanceRevert');
            await this.erc20Pods.addPod(this.pods[0].address);
            expect(await this.erc20Pods.pods(wallet1.address)).to.have.deep.equals([this.pods[0].address]);
        });

        it('should not fail when updateBalance in pod has OutOfGas', async function () {
            await this.pods[0].setOutOfGas(true);
            await this.erc20Pods.addPod(this.pods[0].address);
            expect(await this.erc20Pods.pods(wallet1.address)).to.have.deep.equals([this.pods[0].address]);
        });

        it('should not fail when updateBalance returns gas bomb @skip-on-coverage', async function () {
            await this.pods[0].setReturnGasBomb(true);
            const tx = await this.erc20Pods.addPod(this.pods[0].address);
            const receipt = await tx.wait();
            expect(receipt.gasUsed).to.be.lt(272123); // 272123 with solidity instead of assembly
            expect(await this.erc20Pods.pods(wallet1.address)).to.have.deep.equals([this.pods[0].address]);
        });
    });

    describe('_beforeTokenTransfer', function () {
        beforeEach(async function () {
            await this.erc20Pods.mint(wallet1.address, this.amount);
            this.podsBalancesBeforeWallet1 = [];
            for (let i = 0; i < this.pods.length; i++) {
                await this.erc20Pods.connect(wallet1).addPod(this.pods[i].address);
                await this.pods[i].mint(wallet1.address, ether(i.toString()));
                this.podsBalancesBeforeWallet1[i] = await this.pods[i].balanceOf(wallet1.address);
            }
        });

        it('should not affect when amount is zero', async function () {
            await this.erc20Pods.transfer(wallet2.address, '0');
            for (let i = 0; i < this.pods.length; i++) {
                expect(await this.pods[i].balanceOf(wallet1.address)).to.be.equals(this.podsBalancesBeforeWallet1[i]);
                expect(await this.pods[i].balanceOf(wallet2.address)).to.be.equals('0');
            }
        });

        it('should not affect when sender equals to recipient', async function () {
            await this.erc20Pods.transfer(wallet1.address, this.amount);
            for (let i = 0; i < this.pods.length; i++) {
                expect(await this.pods[i].balanceOf(wallet1.address)).to.be.equals(this.podsBalancesBeforeWallet1[i]);
            }
        });

        it('should not affect recipient and affect sender: recipient without pods, sender with pods', async function () {
            const wallet1beforeBalance = await this.erc20Pods.balanceOf(wallet1.address);
            const wallet2beforeBalance = await this.erc20Pods.balanceOf(wallet2.address);
            await this.erc20Pods.transfer(wallet2.address, this.amount);
            for (let i = 0; i < this.pods.length; i++) {
                expect(await this.pods[i].balanceOf(wallet1.address)).to.be.equals(this.podsBalancesBeforeWallet1[i].sub(this.amount));
                expect(await this.pods[i].balanceOf(wallet2.address)).to.be.equals('0');
            }
            expect(await this.erc20Pods.balanceOf(wallet1.address)).to.be.equals(wallet1beforeBalance.sub(this.amount));
            expect(await this.erc20Pods.balanceOf(wallet2.address)).to.be.equals(wallet2beforeBalance.add(this.amount));
        });

        it('should affect recipient and not affect sender: recipient with pods, sender without pods', async function () {
            await this.erc20Pods.mint(wallet2.address, this.amount);
            const wallet1beforeBalance = await this.erc20Pods.balanceOf(wallet1.address);
            const wallet2beforeBalance = await this.erc20Pods.balanceOf(wallet2.address);
            await this.erc20Pods.connect(wallet2).transfer(wallet1.address, this.amount);
            for (let i = 0; i < this.pods.length; i++) {
                expect(await this.pods[i].balanceOf(wallet1.address)).to.be.equals(this.podsBalancesBeforeWallet1[i].add(this.amount));
                expect(await this.pods[i].balanceOf(wallet2.address)).to.be.equals('0');
            }
            expect(await this.erc20Pods.balanceOf(wallet1.address)).to.be.equals(wallet1beforeBalance.add(this.amount));
            expect(await this.erc20Pods.balanceOf(wallet2.address)).to.be.equals(wallet2beforeBalance.sub(this.amount));
        });

        it('should not affect recipient and sender: recipient without pods, sender without pods', async function () {
            await this.erc20Pods.mint(wallet2.address, this.amount);
            const wallet2beforeBalance = await this.erc20Pods.balanceOf(wallet2.address);
            const wallet3beforeBalance = await this.erc20Pods.balanceOf(wallet3.address);
            await this.erc20Pods.connect(wallet2).transfer(wallet3.address, this.amount);
            for (let i = 0; i < this.pods.length; i++) {
                expect(await this.pods[i].balanceOf(wallet2.address)).to.be.equals('0');
                expect(await this.pods[i].balanceOf(wallet3.address)).to.be.equals('0');
            }
            expect(await this.erc20Pods.balanceOf(wallet2.address)).to.be.equals(wallet2beforeBalance.sub(this.amount));
            expect(await this.erc20Pods.balanceOf(wallet3.address)).to.be.equals(wallet3beforeBalance.add(this.amount));
        });

        it('should affect recipient and sender with different pods', async function () {
            await this.erc20Pods.mint(wallet2.address, this.amount);

            const podsBalancesBeforeWallet2 = [];
            const podsBalancesBeforeWallet3 = [];
            for (let i = 0; i < this.pods.length; i++) {
                if (i <= this.pods.length / 2 + 2) {
                    await this.erc20Pods.connect(wallet2).addPod(this.pods[i].address);
                    await this.pods[i].mint(wallet2.address, ether((i + 1).toString()));
                }
                if (i >= this.pods.length / 2 - 2) {
                    await this.erc20Pods.connect(wallet3).addPod(this.pods[i].address);
                    await this.pods[i].mint(wallet3.address, ether((i + 1).toString()));
                }
                podsBalancesBeforeWallet2[i] = await this.pods[i].balanceOf(wallet2.address);
                podsBalancesBeforeWallet3[i] = await this.pods[i].balanceOf(wallet3.address);
            }

            const wallet2beforeBalance = await this.erc20Pods.balanceOf(wallet2.address);
            const wallet3beforeBalance = await this.erc20Pods.balanceOf(wallet3.address);

            await this.erc20Pods.connect(wallet2).transfer(wallet3.address, this.amount);

            for (let i = 0; i < this.pods.length; i++) {
                expect(await this.pods[i].balanceOf(wallet2.address))
                    .to.be.equals(
                        i <= this.pods.length / 2 + 2
                            ? podsBalancesBeforeWallet2[i].sub(this.amount)
                            : '0',
                    );
                expect(await this.pods[i].balanceOf(wallet3.address))
                    .to.be.equals(
                        i >= this.pods.length / 2 - 2
                            ? podsBalancesBeforeWallet3[i].add(this.amount)
                            : '0',
                    );
            }
            expect(await this.erc20Pods.balanceOf(wallet2.address)).to.be.equals(wallet2beforeBalance.sub(this.amount));
            expect(await this.erc20Pods.balanceOf(wallet3.address)).to.be.equals(wallet3beforeBalance.add(this.amount));
        });
    });
});
