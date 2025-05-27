const { expect, constants } = require('@1inch/solidity-utils');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers } = require('hardhat');

function shouldBehaveLikeERC20Hooks (initContracts) {
    // Behavior test scenarios
    describe('should behave like ERC20 hooks', function () {
        let wallet1, wallet2;

        before(async function () {
            [wallet1, wallet2] = await ethers.getSigners();
        });

        async function initAndCreateHooks () {
            const { erc20Hooks, HOOK_COUNT_LIMITS, amount } = await initContracts();

            const HookMock = await ethers.getContractFactory('HookMock');
            const hooks = [];
            for (let i = 0; i < HOOK_COUNT_LIMITS; i++) {
                hooks[i] = await HookMock.deploy(`HOOK_TOKEN_${i}`, `HT${i}`, erc20Hooks);
                await hooks[i].waitForDeployment();
            }
            return { erc20Hooks, hooks, amount };
        }

        async function initAndAddAllHooks () {
            const { erc20Hooks, hooks, amount } = await initAndCreateHooks();
            for (let i = 0; i < hooks.length; i++) {
                await erc20Hooks.connect(wallet1).addHook(hooks[i]);
                await erc20Hooks.connect(wallet2).addHook(hooks[i]);
            }
            return { erc20Hooks, hooks, amount };
        }

        async function initAndAddOneHook () {
            const { erc20Hooks, hooks, amount } = await initAndCreateHooks();
            await erc20Hooks.connect(wallet1).addHook(hooks[0]);
            await erc20Hooks.connect(wallet2).addHook(hooks[0]);
            return { erc20Hooks, hooks, amount };
        };

        async function initWrongHook () {
            const { erc20Hooks, amount } = await initContracts();
            const BadHookMock = await ethers.getContractFactory('BadHookMock');
            const wrongHook = await BadHookMock.deploy('BadHookMock', 'WHM', erc20Hooks);
            await wrongHook.waitForDeployment();
            return { erc20Hooks, wrongHook, amount };
        };

        describe('view methods', function () {
            it('hasHook should return true when hook added by wallet', async function () {
                const { erc20Hooks, hooks } = await loadFixture(initAndCreateHooks);
                await erc20Hooks.addHook(hooks[0]);
                expect(await erc20Hooks.hasHook(wallet1, hooks[0])).to.be.true;
                expect(await erc20Hooks.hasHook(wallet2, hooks[0])).to.be.false;
            });

            it('hooksCount should return hooks amount which wallet using', async function () {
                const { erc20Hooks, hooks } = await loadFixture(initAndCreateHooks);
                for (let i = 0; i < hooks.length; i++) {
                    await erc20Hooks.addHook(hooks[i]);
                    expect(await erc20Hooks.hooksCount(wallet1)).to.be.equals(i + 1);
                }
                for (let i = 0; i < hooks.length; i++) {
                    await erc20Hooks.removeHook(hooks[i]);
                    expect(await erc20Hooks.hooksCount(wallet1)).to.be.equals(hooks.length - (i + 1));
                }
            });

            it('hookAt should return hook by added hooks index', async function () {
                const { erc20Hooks, hooks } = await loadFixture(initAndCreateHooks);
                for (let i = 0; i < hooks.length; i++) {
                    await erc20Hooks.addHook(hooks[i]);
                    expect(await erc20Hooks.hookAt(wallet1, i)).to.be.equals(await hooks[i].getAddress());
                    expect(await erc20Hooks.hookAt(wallet1, i + 1)).to.be.equals(constants.ZERO_ADDRESS);
                }
                for (let i = hooks.length - 1; i >= 0; i--) {
                    await erc20Hooks.removeHook(hooks[i]);
                    for (let j = 0; j < hooks.length; j++) {
                        expect(await erc20Hooks.hookAt(wallet1, j))
                            .to.be.equals(
                                j >= i
                                    ? constants.ZERO_ADDRESS
                                    : await hooks[j].getAddress(),
                            );
                    };
                }
            });

            it('hooks should return array of hooks by wallet', async function () {
                const { erc20Hooks, hooks } = await loadFixture(initAndCreateHooks);
                const hooksAddrs = await Promise.all(hooks.map(hook => hook.getAddress()));
                for (let i = 0; i < hooks.length; i++) {
                    await erc20Hooks.addHook(hooks[i]);
                    expect(await erc20Hooks.hooks(wallet1)).to.be.deep.equals(hooksAddrs.slice(0, i + 1));
                }
            });

            describe('hookBalanceOf', function () {
                it('should not return balance for non-added hook', async function () {
                    const { erc20Hooks, hooks, amount } = await loadFixture(initAndCreateHooks);
                    expect(await erc20Hooks.balanceOf(wallet1)).to.be.equals(amount);
                    expect(await erc20Hooks.hookBalanceOf(hooks[0], wallet1)).to.be.equals('0');
                });

                it('should return balance for added hook', async function () {
                    const { erc20Hooks, hooks, amount } = await loadFixture(initAndCreateHooks);
                    await erc20Hooks.addHook(hooks[0]);
                    expect(await erc20Hooks.balanceOf(wallet1)).to.be.equals(amount);
                    expect(await erc20Hooks.hookBalanceOf(hooks[0], wallet1)).to.be.equals(amount);
                });

                it('should not return balance for removed hook', async function () {
                    const { erc20Hooks, hooks, amount } = await loadFixture(initAndCreateHooks);
                    await erc20Hooks.addHook(hooks[0]);
                    await erc20Hooks.removeHook(hooks[0]);
                    expect(await erc20Hooks.balanceOf(wallet1)).to.be.equals(amount);
                    expect(await erc20Hooks.hookBalanceOf(hooks[0], wallet1)).to.be.equals('0');
                });
            });
        });

        describe('addHook', function () {
            it('should not add hook with zero-address', async function () {
                const { erc20Hooks } = await loadFixture(initContracts);
                await expect(erc20Hooks.addHook(constants.ZERO_ADDRESS))
                    .to.be.revertedWithCustomError(erc20Hooks, 'InvalidHookAddress');
            });

            it('should add hook', async function () {
                const { erc20Hooks, hooks } = await loadFixture(initAndCreateHooks);
                expect(await erc20Hooks.hasHook(wallet1, hooks[0])).to.be.false;
                await erc20Hooks.addHook(hooks[0]);
                expect(await erc20Hooks.hasHook(wallet1, hooks[0])).to.be.true;
            });

            it('should not add hook twice from one wallet', async function () {
                const { erc20Hooks, hooks } = await loadFixture(initAndCreateHooks);
                await erc20Hooks.addHook(hooks[0]);
                await expect(erc20Hooks.addHook(hooks[0]))
                    .to.be.revertedWithCustomError(erc20Hooks, 'HookAlreadyAdded');
            });

            it('should add the same hook for different wallets', async function () {
                const { erc20Hooks, hooks } = await loadFixture(initAndCreateHooks);
                expect(await erc20Hooks.hasHook(wallet1, hooks[0])).to.be.false;
                expect(await erc20Hooks.hasHook(wallet2, hooks[0])).to.be.false;
                await erc20Hooks.addHook(hooks[0]);
                await erc20Hooks.connect(wallet2).addHook(hooks[0]);
                expect(await erc20Hooks.hasHook(wallet1, hooks[0])).to.be.true;
                expect(await erc20Hooks.hasHook(wallet2, hooks[0])).to.be.true;
            });

            it('should add different hook', async function () {
                const { erc20Hooks, hooks } = await loadFixture(initAndCreateHooks);
                expect(await erc20Hooks.hasHook(wallet1, hooks[0])).to.be.false;
                expect(await erc20Hooks.hasHook(wallet1, hooks[1])).to.be.false;
                await erc20Hooks.addHook(hooks[0]);
                await erc20Hooks.addHook(hooks[1]);
                expect(await erc20Hooks.hooks(wallet1)).to.have.deep.equals([await hooks[0].getAddress(), await hooks[1].getAddress()]);
            });

            it('should updateBalance via hook only for wallets with non-zero balance', async function () {
                const { erc20Hooks, hooks, amount } = await loadFixture(initAndCreateHooks);
                expect(await erc20Hooks.balanceOf(wallet1)).to.be.equals(amount);
                expect(await erc20Hooks.balanceOf(wallet2)).to.be.equals('0');
                // addHook for wallet with balance
                expect(await hooks[0].balanceOf(wallet1)).to.be.equals('0');
                await erc20Hooks.addHook(hooks[0]);
                expect(await hooks[0].balanceOf(wallet1)).to.be.equals(amount);
                // addHook for wallet without balance
                expect(await hooks[0].balanceOf(wallet2)).to.be.equals('0');
                await erc20Hooks.connect(wallet2).addHook(hooks[0]);
                expect(await hooks[0].balanceOf(wallet2)).to.be.equals('0');
            });
        });

        describe('removeHook', function () {
            it('should not remove non-added hook', async function () {
                const { erc20Hooks, hooks } = await loadFixture(initAndAddOneHook);
                await expect(erc20Hooks.removeHook(hooks[1]))
                    .to.be.revertedWithCustomError(erc20Hooks, 'HookNotFound');
            });

            it('should remove hook', async function () {
                const { erc20Hooks, hooks } = await loadFixture(initAndAddOneHook);
                expect(await erc20Hooks.hasHook(wallet1, hooks[0])).to.be.true;
                await erc20Hooks.removeHook(hooks[0]);
                expect(await erc20Hooks.hasHook(wallet1, hooks[0])).to.be.false;
            });

            it('should updateBalance via hook only for wallets with non-zero balance', async function () {
                const { erc20Hooks, hooks, amount } = await loadFixture(initAndAddOneHook);
                expect(await erc20Hooks.balanceOf(wallet1)).to.be.equals(amount);
                expect(await erc20Hooks.balanceOf(wallet2)).to.be.equals('0');
                // removeHook for wallet with balance
                await erc20Hooks.removeHook(hooks[0]);
                expect(await hooks[0].balanceOf(wallet1)).to.be.equals('0');
                // removeHook for wallet without balance
                await erc20Hooks.connect(wallet2).removeHook(hooks[0]);
                expect(await hooks[0].balanceOf(wallet2)).to.be.equals('0');
            });
        });

        describe('removeAllHooks', function () {
            it('should remove all hooks', async function () {
                const { erc20Hooks, hooks } = await loadFixture(initAndAddAllHooks);
                expect(await erc20Hooks.hooksCount(wallet1)).to.be.equals(hooks.length);
                await erc20Hooks.removeAllHooks();
                expect(await erc20Hooks.hooksCount(wallet1)).to.be.equals(0);
            });
        });

        describe('_updateBalances', function () {
            it('should not fail when updateBalance in hook reverts', async function () {
                const { erc20Hooks, wrongHook } = await loadFixture(initWrongHook);
                await wrongHook.setIsRevert(true);
                await erc20Hooks.addHook(wrongHook);
                expect(await erc20Hooks.hooks(wallet1)).to.have.deep.equals([await wrongHook.getAddress()]);
            });

            it('should not fail when updateBalance in hook has OutOfGas', async function () {
                const { erc20Hooks, wrongHook } = await loadFixture(initWrongHook);
                await wrongHook.setOutOfGas(true);
                await erc20Hooks.addHook(wrongHook);
                expect(await erc20Hooks.hooks(wallet1)).to.have.deep.equals([await wrongHook.getAddress()]);
            });
        });

        it('should not add more hooks than limit', async function () {
            const { erc20Hooks, hooks } = await loadFixture(initAndCreateHooks);
            const maxHooksPerAccount = await erc20Hooks.MAX_HOOKS_PER_ACCOUNT();
            for (let i = 0; i < maxHooksPerAccount; i++) {
                await erc20Hooks.addHook(hooks[i]);
            }

            const HookMock = await ethers.getContractFactory('HookMock');
            const extraHook = await HookMock.deploy('EXTRA_HOOK_TOKEN', 'EHT', erc20Hooks);
            await extraHook.waitForDeployment();

            await expect(erc20Hooks.addHook(extraHook))
                .to.be.revertedWithCustomError(erc20Hooks, 'HooksLimitReachedForAccount');
        });
    });
};

function shouldBehaveLikeERC20HooksTransfers (initContracts) {
    // Behavior test scenarios
    describe('transfers should behave like ERC20 hooks transfers', function () {
        let wallet1, wallet2, wallet3;

        before(async function () {
            [wallet1, wallet2, wallet3] = await ethers.getSigners();
        });

        async function initAndCreateHooks () {
            const { erc20Hooks, HOOK_COUNT_LIMITS, amount } = await initContracts();

            const HookMock = await ethers.getContractFactory('HookMock');
            const hooks = [];
            for (let i = 0; i < HOOK_COUNT_LIMITS; i++) {
                hooks[i] = await HookMock.deploy(`HOOK_TOKEN_${i}`, `HT${i}`, erc20Hooks);
                await hooks[i].waitForDeployment();
            }
            return { erc20Hooks, hooks, amount };
        }

        async function initAndAddHooks () {
            const { erc20Hooks, hooks, amount } = await initAndCreateHooks();
            for (let i = 0; i < hooks.length; i++) {
                await erc20Hooks.connect(wallet1).addHook(hooks[i]);
            }
            return { erc20Hooks, hooks, amount };
        };

        describe('_afterTokenTransfer', function () {
            it('should not affect when amount is zero', async function () {
                const { erc20Hooks, hooks, amount } = await loadFixture(initAndAddHooks);
                for (let i = 0; i < hooks.length; i++) {
                    expect(await hooks[i].balanceOf(wallet1)).to.be.equals(amount);
                    expect(await hooks[i].balanceOf(wallet2)).to.be.equals('0');
                }
                await erc20Hooks.transfer(wallet2, '0');
                for (let i = 0; i < hooks.length; i++) {
                    expect(await hooks[i].balanceOf(wallet1)).to.be.equals(amount);
                    expect(await hooks[i].balanceOf(wallet2)).to.be.equals('0');
                }
            });

            it('should not affect when sender equals to recipient', async function () {
                const { erc20Hooks, hooks, amount } = await loadFixture(initAndAddHooks);
                await erc20Hooks.transfer(wallet1, amount);
                for (let i = 0; i < hooks.length; i++) {
                    expect(await hooks[i].balanceOf(wallet1)).to.be.equals(amount);
                }
            });

            it('should not affect recipient and affect sender: recipient without hooks, sender with hooks', async function () {
                const { erc20Hooks, hooks, amount } = await loadFixture(initAndAddHooks);
                const wallet1beforeBalance = await erc20Hooks.balanceOf(wallet1);
                const wallet2beforeBalance = await erc20Hooks.balanceOf(wallet2);
                for (let i = 0; i < hooks.length; i++) {
                    expect(await hooks[i].balanceOf(wallet1)).to.be.equals(amount);
                    expect(await hooks[i].balanceOf(wallet2)).to.be.equals('0');
                }
                await erc20Hooks.transfer(wallet2, amount);
                for (let i = 0; i < hooks.length; i++) {
                    expect(await hooks[i].balanceOf(wallet1)).to.be.equals('0');
                    expect(await hooks[i].balanceOf(wallet2)).to.be.equals('0');
                }
                expect(await erc20Hooks.balanceOf(wallet1)).to.be.equals(wallet1beforeBalance - amount);
                expect(await erc20Hooks.balanceOf(wallet2)).to.be.equals(wallet2beforeBalance + amount);
            });

            it('should affect recipient and not affect sender: recipient with hooks, sender without hooks', async function () {
                const { erc20Hooks, hooks, amount } = await loadFixture(initAndAddHooks);
                await erc20Hooks.transfer(wallet2, amount);
                for (let i = 0; i < hooks.length; i++) {
                    expect(await hooks[i].balanceOf(wallet1)).to.be.equals('0');
                    expect(await hooks[i].balanceOf(wallet2)).to.be.equals('0');
                }
                const wallet1beforeBalance = await erc20Hooks.balanceOf(wallet1);
                const wallet2beforeBalance = await erc20Hooks.balanceOf(wallet2);
                await erc20Hooks.connect(wallet2).transfer(wallet1, amount);
                for (let i = 0; i < hooks.length; i++) {
                    expect(await hooks[i].balanceOf(wallet1)).to.be.equals(amount);
                    expect(await hooks[i].balanceOf(wallet2)).to.be.equals('0');
                }
                expect(await erc20Hooks.balanceOf(wallet1)).to.be.equals(wallet1beforeBalance + amount);
                expect(await erc20Hooks.balanceOf(wallet2)).to.be.equals(wallet2beforeBalance - amount);
            });

            it('should not affect recipient and sender: recipient without hooks, sender without hooks', async function () {
                const { erc20Hooks, hooks, amount } = await loadFixture(initAndAddHooks);
                await erc20Hooks.mint(wallet2, amount);
                const wallet2beforeBalance = await erc20Hooks.balanceOf(wallet2);
                const wallet3beforeBalance = await erc20Hooks.balanceOf(wallet3);
                await erc20Hooks.connect(wallet2).transfer(wallet3, amount);
                for (let i = 0; i < hooks.length; i++) {
                    expect(await hooks[i].balanceOf(wallet2)).to.be.equals('0');
                    expect(await hooks[i].balanceOf(wallet3)).to.be.equals('0');
                }
                expect(await erc20Hooks.balanceOf(wallet2)).to.be.equals(wallet2beforeBalance - amount);
                expect(await erc20Hooks.balanceOf(wallet3)).to.be.equals(wallet3beforeBalance + amount);
            });

            it('should affect recipient and sender with different hooks', async function () {
                const { erc20Hooks, hooks, amount } = await loadFixture(initAndCreateHooks);

                const hooksBalancesBeforeWallet1 = [];
                const hooksBalancesBeforeWallet2 = [];
                for (let i = 0; i < hooks.length; i++) {
                    if (i <= hooks.length / 2 + 2) {
                        await erc20Hooks.connect(wallet1).addHook(hooks[i]);
                    }
                    if (i >= hooks.length / 2 - 2) {
                        await erc20Hooks.connect(wallet2).addHook(hooks[i]);
                    }
                    hooksBalancesBeforeWallet1[i] = await hooks[i].balanceOf(wallet1);
                    hooksBalancesBeforeWallet2[i] = await hooks[i].balanceOf(wallet2);
                }

                const wallet1beforeBalance = await erc20Hooks.balanceOf(wallet1);
                const wallet2beforeBalance = await erc20Hooks.balanceOf(wallet2);

                await erc20Hooks.connect(wallet1).transfer(wallet2, amount);

                for (let i = 0; i < hooks.length; i++) {
                    expect(await hooks[i].balanceOf(wallet1))
                        .to.be.equals(
                            i <= hooks.length / 2 + 2
                                ? hooksBalancesBeforeWallet1[i] - amount
                                : '0',
                        );
                    expect(await hooks[i].balanceOf(wallet2))
                        .to.be.equals(
                            i >= hooks.length / 2 - 2
                                ? hooksBalancesBeforeWallet2[i] + amount
                                : '0',
                        );
                }
                expect(await erc20Hooks.balanceOf(wallet1)).to.be.equals(wallet1beforeBalance - amount);
                expect(await erc20Hooks.balanceOf(wallet2)).to.be.equals(wallet2beforeBalance + amount);
            });
        });
    });
};

module.exports = {
    shouldBehaveLikeERC20Hooks,
    shouldBehaveLikeERC20HooksTransfers,
};
