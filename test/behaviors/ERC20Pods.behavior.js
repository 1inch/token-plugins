const { expect, constants } = require('@1inch/solidity-utils');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers } = require('hardhat');

function shouldBehaveLikeERC20Pods (initContracts) {
    // Behavior test scenarios
    describe('should behave like ERC20 Pods', function () {
        let wallet1, wallet2;

        before(async function () {
            [wallet1, wallet2] = await ethers.getSigners();
        });

        async function initAndCreatePods () {
            const { erc20Pods, POD_LIMITS, amount } = await initContracts();

            const PodMock = await ethers.getContractFactory('PodMock');
            const pods = [];
            for (let i = 0; i < POD_LIMITS; i++) {
                pods[i] = await PodMock.deploy(`POD_TOKEN_${i}`, `PT${i}`, erc20Pods.address);
                await pods[i].deployed();
            }
            return { erc20Pods, pods, amount };
        }

        async function initAndAddAllPods () {
            const { erc20Pods, pods, amount } = await initAndCreatePods();
            for (let i = 0; i < pods.length; i++) {
                await erc20Pods.connect(wallet1).addPod(pods[i].address);
                await erc20Pods.connect(wallet2).addPod(pods[i].address);
            }
            return { erc20Pods, pods, amount };
        }

        async function initAndAddOnePod () {
            const { erc20Pods, pods, amount } = await initAndCreatePods();
            await erc20Pods.connect(wallet1).addPod(pods[0].address);
            await erc20Pods.connect(wallet2).addPod(pods[0].address);
            return { erc20Pods, pods, amount };
        };

        async function initWrongPod () {
            const { erc20Pods, amount } = await initContracts();
            const WrongPodMock = await ethers.getContractFactory('WrongPodMock');
            const wrongPod = await WrongPodMock.deploy('WrongPodMock', 'WPM', erc20Pods.address);
            await wrongPod.deployed();
            return { erc20Pods, wrongPod, amount };
        };

        describe('view methods', function () {
            it('hasPod should return true when pod added by wallet', async function () {
                const { erc20Pods, pods } = await loadFixture(initAndCreatePods);
                await erc20Pods.addPod(pods[0].address);
                expect(await erc20Pods.hasPod(wallet1.address, pods[0].address)).to.be.equals(true);
                expect(await erc20Pods.hasPod(wallet2.address, pods[0].address)).to.be.equals(false);
            });

            it('podsCount should return pods amount which wallet using', async function () {
                const { erc20Pods, pods } = await loadFixture(initAndCreatePods);
                for (let i = 0; i < pods.length; i++) {
                    await erc20Pods.addPod(pods[i].address);
                    expect(await erc20Pods.podsCount(wallet1.address)).to.be.equals(i + 1);
                }
                for (let i = 0; i < pods.length; i++) {
                    await erc20Pods.removePod(pods[i].address);
                    expect(await erc20Pods.podsCount(wallet1.address)).to.be.equals(pods.length - (i + 1));
                }
            });

            it('podAt should return pod by added pods index', async function () {
                const { erc20Pods, pods } = await loadFixture(initAndCreatePods);
                for (let i = 0; i < pods.length; i++) {
                    await erc20Pods.addPod(pods[i].address);
                    expect(await erc20Pods.podAt(wallet1.address, i)).to.be.equals(pods[i].address);
                    expect(await erc20Pods.podAt(wallet1.address, i + 1)).to.be.equals(constants.ZERO_ADDRESS);
                }
                for (let i = pods.length - 1; i >= 0; i--) {
                    await erc20Pods.removePod(pods[i].address);
                    for (let j = 0; j < pods.length; j++) {
                        expect(await erc20Pods.podAt(wallet1.address, j))
                            .to.be.equals(
                                j >= i
                                    ? constants.ZERO_ADDRESS
                                    : pods[j].address,
                            );
                    };
                }
            });

            it('pods should return array of pods by wallet', async function () {
                const { erc20Pods, pods } = await loadFixture(initAndCreatePods);
                const podsAddrs = pods.map(pod => pod.address);
                for (let i = 0; i < pods.length; i++) {
                    await erc20Pods.addPod(pods[i].address);
                    expect(await erc20Pods.pods(wallet1.address)).to.be.deep.equals(podsAddrs.slice(0, i + 1));
                }
            });

            describe('podBalanceOf', function () {
                it('should not return balance for non-added pod', async function () {
                    const { erc20Pods, pods, amount } = await loadFixture(initAndCreatePods);
                    expect(await erc20Pods.balanceOf(wallet1.address)).to.be.equals(amount);
                    expect(await erc20Pods.podBalanceOf(pods[0].address, wallet1.address)).to.be.equals('0');
                });

                it('should return balance for added pod', async function () {
                    const { erc20Pods, pods, amount } = await loadFixture(initAndCreatePods);
                    await erc20Pods.addPod(pods[0].address);
                    expect(await erc20Pods.balanceOf(wallet1.address)).to.be.equals(amount);
                    expect(await erc20Pods.podBalanceOf(pods[0].address, wallet1.address)).to.be.equals(amount);
                });

                it('should not return balance for removed pod', async function () {
                    const { erc20Pods, pods, amount } = await loadFixture(initAndCreatePods);
                    await erc20Pods.addPod(pods[0].address);
                    await erc20Pods.removePod(pods[0].address);
                    expect(await erc20Pods.balanceOf(wallet1.address)).to.be.equals(amount);
                    expect(await erc20Pods.podBalanceOf(pods[0].address, wallet1.address)).to.be.equals('0');
                });
            });
        });

        describe('addPod', function () {
            it('should not add pod with zero-address', async function () {
                const { erc20Pods } = await loadFixture(initContracts);
                await expect(erc20Pods.addPod(constants.ZERO_ADDRESS))
                    .to.be.revertedWithCustomError(erc20Pods, 'InvalidPodAddress');
            });

            it('should add pod', async function () {
                const { erc20Pods, pods } = await loadFixture(initAndCreatePods);
                expect(await erc20Pods.hasPod(wallet1.address, pods[0].address)).to.be.equals(false);
                await erc20Pods.addPod(pods[0].address);
                expect(await erc20Pods.hasPod(wallet1.address, pods[0].address)).to.be.equals(true);
            });

            it('should not add pod twice from one wallet', async function () {
                const { erc20Pods, pods } = await loadFixture(initAndCreatePods);
                await erc20Pods.addPod(pods[0].address);
                await expect(erc20Pods.addPod(pods[0].address))
                    .to.be.revertedWithCustomError(erc20Pods, 'PodAlreadyAdded');
            });

            it('should add the same pod for different wallets', async function () {
                const { erc20Pods, pods } = await loadFixture(initAndCreatePods);
                expect(await erc20Pods.hasPod(wallet1.address, pods[0].address)).to.be.equals(false);
                expect(await erc20Pods.hasPod(wallet2.address, pods[0].address)).to.be.equals(false);
                await erc20Pods.addPod(pods[0].address);
                await erc20Pods.connect(wallet2).addPod(pods[0].address);
                expect(await erc20Pods.hasPod(wallet1.address, pods[0].address)).to.be.equals(true);
                expect(await erc20Pods.hasPod(wallet2.address, pods[0].address)).to.be.equals(true);
            });

            it('should add different pod', async function () {
                const { erc20Pods, pods } = await loadFixture(initAndCreatePods);
                expect(await erc20Pods.hasPod(wallet1.address, pods[0].address)).to.be.equals(false);
                expect(await erc20Pods.hasPod(wallet1.address, pods[1].address)).to.be.equals(false);
                await erc20Pods.addPod(pods[0].address);
                await erc20Pods.addPod(pods[1].address);
                expect(await erc20Pods.pods(wallet1.address)).to.have.deep.equals([pods[0].address, pods[1].address]);
            });

            it('should updateBalance via pod only for wallets with non-zero balance', async function () {
                const { erc20Pods, pods, amount } = await loadFixture(initAndCreatePods);
                expect(await erc20Pods.balanceOf(wallet1.address)).to.be.equals(amount);
                expect(await erc20Pods.balanceOf(wallet2.address)).to.be.equals('0');
                // addPod for wallet with balance
                expect(await pods[0].balanceOf(wallet1.address)).to.be.equals('0');
                await erc20Pods.addPod(pods[0].address);
                expect(await pods[0].balanceOf(wallet1.address)).to.be.equals(amount);
                // addPod for wallet without balance
                expect(await pods[0].balanceOf(wallet2.address)).to.be.equals('0');
                await erc20Pods.connect(wallet2).addPod(pods[0].address);
                expect(await pods[0].balanceOf(wallet2.address)).to.be.equals('0');
            });
        });

        describe('removePod', function () {
            it('should not remove non-added pod', async function () {
                const { erc20Pods, pods } = await loadFixture(initAndAddOnePod);
                await expect(erc20Pods.removePod(pods[1].address))
                    .to.be.revertedWithCustomError(erc20Pods, 'PodNotFound');
            });

            it('should remove pod', async function () {
                const { erc20Pods, pods } = await loadFixture(initAndAddOnePod);
                expect(await erc20Pods.hasPod(wallet1.address, pods[0].address)).to.be.equals(true);
                await erc20Pods.removePod(pods[0].address);
                expect(await erc20Pods.hasPod(wallet1.address, pods[0].address)).to.be.equals(false);
            });

            it('should updateBalance via pod only for wallets with non-zero balance', async function () {
                const { erc20Pods, pods, amount } = await loadFixture(initAndAddOnePod);
                expect(await erc20Pods.balanceOf(wallet1.address)).to.be.equals(amount);
                expect(await erc20Pods.balanceOf(wallet2.address)).to.be.equals('0');
                // removePod for wallet with balance
                await erc20Pods.removePod(pods[0].address);
                expect(await pods[0].balanceOf(wallet1.address)).to.be.equals('0');
                // removePod for wallet without balance
                await erc20Pods.connect(wallet2).removePod(pods[0].address);
                expect(await pods[0].balanceOf(wallet2.address)).to.be.equals('0');
            });
        });

        describe('removeAllPods', function () {
            it('should remove all pods', async function () {
                const { erc20Pods, pods } = await loadFixture(initAndAddAllPods);
                expect(await erc20Pods.podsCount(wallet1.address)).to.be.equals(pods.length);
                await erc20Pods.removeAllPods();
                expect(await erc20Pods.podsCount(wallet1.address)).to.be.equals(0);
            });
        });

        describe('_updateBalances', function () {
            it('should not fail when updateBalance in pod reverts', async function () {
                const { erc20Pods, wrongPod } = await loadFixture(initWrongPod);
                await wrongPod.setIsRevert(true);
                await erc20Pods.addPod(wrongPod.address);
                expect(await erc20Pods.pods(wallet1.address)).to.have.deep.equals([wrongPod.address]);
            });

            it('should not fail when updateBalance in pod has OutOfGas', async function () {
                const { erc20Pods, wrongPod } = await loadFixture(initWrongPod);
                await wrongPod.setOutOfGas(true);
                await erc20Pods.addPod(wrongPod.address);
                expect(await erc20Pods.pods(wallet1.address)).to.have.deep.equals([wrongPod.address]);
            });
        });

        it('should not add more pods than limit', async function () {
            const { erc20Pods, pods } = await loadFixture(initAndCreatePods);
            const podsLimit = await erc20Pods.podsLimit();
            for (let i = 0; i < podsLimit; i++) {
                await erc20Pods.addPod(pods[i].address);
            }

            const PodMock = await ethers.getContractFactory('PodMock');
            const extraPod = await PodMock.deploy('EXTRA_POD_TOKEN', 'EPT', erc20Pods.address);
            await extraPod.deployed();

            await expect(erc20Pods.addPod(extraPod.address))
                .to.be.revertedWithCustomError(erc20Pods, 'PodsLimitReachedForAccount');
        });
    });
};

function shouldBehaveLikeERC20PodsTransfers (initContracts) {
    // Behavior test scenarios
    describe('transfers should behave like ERC20 Pods transfers', function () {
        let wallet1, wallet2, wallet3;

        before(async function () {
            [wallet1, wallet2, wallet3] = await ethers.getSigners();
        });

        async function initAndCreatePods () {
            const { erc20Pods, POD_LIMITS, amount } = await initContracts();

            const PodMock = await ethers.getContractFactory('PodMock');
            const pods = [];
            for (let i = 0; i < POD_LIMITS; i++) {
                pods[i] = await PodMock.deploy(`POD_TOKEN_${i}`, `PT${i}`, erc20Pods.address);
                await pods[i].deployed();
            }
            return { erc20Pods, pods, amount };
        }

        async function initAndAddPods () {
            const { erc20Pods, pods, amount } = await initAndCreatePods();
            for (let i = 0; i < pods.length; i++) {
                await erc20Pods.connect(wallet1).addPod(pods[i].address);
            }
            return { erc20Pods, pods, amount };
        };

        describe('_afterTokenTransfer', function () {
            it('should not affect when amount is zero', async function () {
                const { erc20Pods, pods, amount } = await loadFixture(initAndAddPods);
                for (let i = 0; i < pods.length; i++) {
                    expect(await pods[i].balanceOf(wallet1.address)).to.be.equals(amount);
                    expect(await pods[i].balanceOf(wallet2.address)).to.be.equals('0');
                }
                await erc20Pods.transfer(wallet2.address, '0');
                for (let i = 0; i < pods.length; i++) {
                    expect(await pods[i].balanceOf(wallet1.address)).to.be.equals(amount);
                    expect(await pods[i].balanceOf(wallet2.address)).to.be.equals('0');
                }
            });

            it('should not affect when sender equals to recipient', async function () {
                const { erc20Pods, pods, amount } = await loadFixture(initAndAddPods);
                await erc20Pods.transfer(wallet1.address, amount);
                for (let i = 0; i < pods.length; i++) {
                    expect(await pods[i].balanceOf(wallet1.address)).to.be.equals(amount);
                }
            });

            it('should not affect recipient and affect sender: recipient without pods, sender with pods', async function () {
                const { erc20Pods, pods, amount } = await loadFixture(initAndAddPods);
                const wallet1beforeBalance = await erc20Pods.balanceOf(wallet1.address);
                const wallet2beforeBalance = await erc20Pods.balanceOf(wallet2.address);
                for (let i = 0; i < pods.length; i++) {
                    expect(await pods[i].balanceOf(wallet1.address)).to.be.equals(amount);
                    expect(await pods[i].balanceOf(wallet2.address)).to.be.equals('0');
                }
                await erc20Pods.transfer(wallet2.address, amount);
                for (let i = 0; i < pods.length; i++) {
                    expect(await pods[i].balanceOf(wallet1.address)).to.be.equals('0');
                    expect(await pods[i].balanceOf(wallet2.address)).to.be.equals('0');
                }
                expect(await erc20Pods.balanceOf(wallet1.address)).to.be.equals(wallet1beforeBalance.sub(amount));
                expect(await erc20Pods.balanceOf(wallet2.address)).to.be.equals(wallet2beforeBalance.add(amount));
            });

            it('should affect recipient and not affect sender: recipient with pods, sender without pods', async function () {
                const { erc20Pods, pods, amount } = await loadFixture(initAndAddPods);
                await erc20Pods.transfer(wallet2.address, amount);
                for (let i = 0; i < pods.length; i++) {
                    expect(await pods[i].balanceOf(wallet1.address)).to.be.equals('0');
                    expect(await pods[i].balanceOf(wallet2.address)).to.be.equals('0');
                }
                const wallet1beforeBalance = await erc20Pods.balanceOf(wallet1.address);
                const wallet2beforeBalance = await erc20Pods.balanceOf(wallet2.address);
                await erc20Pods.connect(wallet2).transfer(wallet1.address, amount);
                for (let i = 0; i < pods.length; i++) {
                    expect(await pods[i].balanceOf(wallet1.address)).to.be.equals(amount);
                    expect(await pods[i].balanceOf(wallet2.address)).to.be.equals('0');
                }
                expect(await erc20Pods.balanceOf(wallet1.address)).to.be.equals(wallet1beforeBalance.add(amount));
                expect(await erc20Pods.balanceOf(wallet2.address)).to.be.equals(wallet2beforeBalance.sub(amount));
            });

            it('should not affect recipient and sender: recipient without pods, sender without pods', async function () {
                const { erc20Pods, pods, amount } = await loadFixture(initAndAddPods);
                await erc20Pods.mint(wallet2.address, amount);
                const wallet2beforeBalance = await erc20Pods.balanceOf(wallet2.address);
                const wallet3beforeBalance = await erc20Pods.balanceOf(wallet3.address);
                await erc20Pods.connect(wallet2).transfer(wallet3.address, amount);
                for (let i = 0; i < pods.length; i++) {
                    expect(await pods[i].balanceOf(wallet2.address)).to.be.equals('0');
                    expect(await pods[i].balanceOf(wallet3.address)).to.be.equals('0');
                }
                expect(await erc20Pods.balanceOf(wallet2.address)).to.be.equals(wallet2beforeBalance.sub(amount));
                expect(await erc20Pods.balanceOf(wallet3.address)).to.be.equals(wallet3beforeBalance.add(amount));
            });

            it('should affect recipient and sender with different pods', async function () {
                const { erc20Pods, pods, amount } = await loadFixture(initAndCreatePods);

                const podsBalancesBeforeWallet1 = [];
                const podsBalancesBeforeWallet2 = [];
                for (let i = 0; i < pods.length; i++) {
                    if (i <= pods.length / 2 + 2) {
                        await erc20Pods.connect(wallet1).addPod(pods[i].address);
                    }
                    if (i >= pods.length / 2 - 2) {
                        await erc20Pods.connect(wallet2).addPod(pods[i].address);
                    }
                    podsBalancesBeforeWallet1[i] = await pods[i].balanceOf(wallet1.address);
                    podsBalancesBeforeWallet2[i] = await pods[i].balanceOf(wallet2.address);
                }

                const wallet1beforeBalance = await erc20Pods.balanceOf(wallet1.address);
                const wallet2beforeBalance = await erc20Pods.balanceOf(wallet2.address);

                await erc20Pods.connect(wallet1).transfer(wallet2.address, amount);

                for (let i = 0; i < pods.length; i++) {
                    expect(await pods[i].balanceOf(wallet1.address))
                        .to.be.equals(
                            i <= pods.length / 2 + 2
                                ? podsBalancesBeforeWallet1[i].sub(amount)
                                : '0',
                        );
                    expect(await pods[i].balanceOf(wallet2.address))
                        .to.be.equals(
                            i >= pods.length / 2 - 2
                                ? podsBalancesBeforeWallet2[i].add(amount)
                                : '0',
                        );
                }
                expect(await erc20Pods.balanceOf(wallet1.address)).to.be.equals(wallet1beforeBalance.sub(amount));
                expect(await erc20Pods.balanceOf(wallet2.address)).to.be.equals(wallet2beforeBalance.add(amount));
            });
        });
    });
};

module.exports = {
    shouldBehaveLikeERC20Pods,
    shouldBehaveLikeERC20PodsTransfers,
};
