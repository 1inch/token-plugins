[![Build Status](https://github.com/1inch/token-hooks/workflows/CI/badge.svg)](https://github.com/1inch/token-hooks/actions)
[![Coverage Status](https://codecov.io/gh/1inch/token-hooks/branch/master/graph/badge.svg?token=Z3D5O3XUYV)](https://codecov.io/gh/1inch/token-hooks)
[![NPM Package](https://img.shields.io/npm/v/@1inch/token-hooks.svg)](https://www.npmjs.org/package/@1inch/token-hooks)

# 1inch Token Hooks: A Comprehensive Guide for Extending ERC20 Functionalities

[Overview](#overview)

[Primary Benefits](#primary-benefits)

[Implementation](#implementation)

[Generic Examples](#generic-examples)
     
[Deployed Examples](#deployed-examples)

[Helpful Links](#other-helpful-links)

## Overview
> **Note:** Token Hooks were previously known as Token Plugins. The name was changed to better reflect their role as token balance hooks that respond to balance changes in ERC20 tokens.

Token hooks are smart contracts that extend the capabilities of ERC20 tokens and wrappers by adding custom accounting features to the original token. Inspired by the hook concept widely used in the web 2.0 world, these hooks enable users to **dynamically increase the functionality of their tokens on-demand** without the need to transfer tokens to a special smart contract.

The major benefit, and a key difference from existing solutions, is that these do not require token transfers to a special smart contract, as is commonly seen in farming or delegating protocols. Another beneficial point is that once an ERC20 hook code is deployed, it can be reused by any tokens that support the 1inch hook standard.

Support for hooks on the token side is similar to the implementation of classic ERC20 extensions (i.e., OpenZeppelin ERC20 extensions). The deployment and usage are permissionless from the perspective of a token contract owner, since the holder is the actor who decides which hook to subscribe to.

Technically, hooks are a collection of smart contracts that track changes in ERC20 token balances and perform supplementary accounting tasks for those balances. They are particularly useful when you need to track, for example, token shares without actually transferring tokens to a dedicated accounting contract.

The token hooks standard is designed to be secure and to prevent asset loss, gas, and DoS attacks on transfers.

***Note: ERC721 (NFT) and ERC1155 (Multi-token) support is coming soon!***

## Hook Flexibility

Token Hooks offer an elegant solution for extending token functionality **selectively for holders who need it**. This opt-in approach means:
- Individual holders can customize their token experience based on their unique needs
- DAOs can govern which hooks are recommended or incentivized without forcing changes on all token holders
- Different user segments can have different token capabilities within the same token ecosystem

## Primary Benefits
- **100% permissionless from the token contract owner**: Open to all participants.
- **Risk-free participation**: Token hooks do not require any approval, deposit, or transfer of funds into an external contract for participation.
- **Multiple hook connections**: Users can connect with multiple hooks, allowing for simultaneous involvement in multiple incentive programs or governance systems, etc. (subject to a predefined limit, set at deployment).
- **On-demand functionality**: Users can add or remove hooks as needed, enabling dynamic feature activation without token migrations or protocol upgrades.
- **Simple to adopt**: Implementation is only 150 lines of code.
- **High security**: 1inch Token Hooks have gone through extensive [audits](https://github.com/1inch/1inch-audits/tree/master/Fusion%20mode%20and%20Token-hooks) by multiple top-tier companies.
- **Built-in reentrancy protection**: This feature ensures that the balances cannot be tampered with by manipulating hook accounting. 
- **Custom ERC20 representation**: A hook can be represented by its own associated ERC20 (custom inheritance), enabling building complex and multi-layered accounting systems like 1inch Fusion.

## Security Model

Token Hooks implement a clean security model that provides maximum flexibility without compromising token integrity:
- Hooks operate as **passive observers** that react to balance changes but cannot block transfers
- The underlying token remains fully functional and secure, regardless of hook behavior
- Gas limits and failure isolation prevent malicious hooks from disrupting token operations

## Use-Cases
Here are some examples of how Token Hooks is currently being (or could be used) today, showcasing its ability to power automated governance systems and on-demand token functionality:

- **st1INCH resolver delegation**
  Through staking 1INCH, token holders receive Unicorn Power (UP), and can earn rewards from Resolvers in the Intent Swap system. In order to earn these rewards, the UP received from staking can be delegated (see contract) to a specific Resolver. The resolver is incentivized to have UP delegated to them, so they will reward delegators with some amount of funds. The delegation of st1INCH is done with a token hook, so there is no need to transfer the tokens to another contract. ([see dst1inch contract](https://etherscan.io/token/0xAccfAc2339e16DC80c50d2fa81b5c2B049B4f947#code))

- **Weighted voting power & Automated governance**
  VE governance models like veCRV require the user to lock tokens for a certain amount of time to earn voting rights. This signals to the protocol a long-term vested interest and greatly reduces the surface area for governance attacks. With Token Hooks, the VE token model can be replaced with logic that gives the wallet ramping voting power by simply holding the base governance token for long periods of time. When a wallet first holds the governance token, its voting power will be nearly zero, but over time (e.g. 2 years), it will increase until it reaches a set maximum. This creates an automated governance system where voting power evolves dynamically based on holding patterns without requiring manual lock-ups.

- **LP-Token farming**
  Some protocols incentivize LP token holders with additional rewards beyond swap fees through an additional yield contract that holds the LP tokens and distributes the rewards proportionally to the participating LPs. With token hooks, these extra rewards for LP holders can continue to be opt-in without the need to deposit those LP tokens into a secondary contract. ([See 1inch Fusion pods](https://etherscan.io/address/0x1A87c0F9CCA2f0926A155640e8958a8A6B0260bE#code))

- **Shadow staking**
  If a protocol wanted to simply reward holders of their token, they could reward them similarly to the weighted voting power method, but instead of increasing voting power over time, the APR of holding the token can increase. Long-term holders will receive rewards and short-term holders/traders would not receive the same benefit.

- **Borrow/lending rewards**
  In traditional lending protocols, users must transfer assets and hold both lending and debt tokens in their wallets, limiting farming opportunities. With 1inch Token Hooks, users are able to maintain custody of their assets while a hook tracks balances, distributing rewards seamlessly and securely without ever having to move the assets.

## Limitations
- Any hook's processing logic consumes additional gas, with external operations that change an account balance incurring higher costs. To mitigate this, the hook extension sets a limit on the gas consumption per hook and caps the maximum amount of gas that can be spent.
- **Hook Quantity**: The contract deployer should establish a limit on the number of hooks managed under the hook management contract.
- **Maximum gas usage**: The hook management contract limits the amount of gas any hook can use to avoid overspent and gas attacks. It is highly recommended not to change beyond the recommended amount of 140,000.
- **Only works with transferrable tokens**: By fundamental design, hooks are unable to integrate with tokens whose balances can update without transfers (such as rebase tokens).

## Implementation

![ERC20Hooks](/src/img/HooksDiagram.png)

Connecting a token contract with the 1inch Token Hooks is a straightforward process. If you're creating a brand new token contract or migrating an existing one, you can simply inherit from the hook-enabled ERC20 contract OR wrap an existing token and inherit hook functionality within the wrapper (`contract MyWrapper is ERC20Wrapper, ERC20Hooks { ... }`). Subsequently, any hook (deployed as a separate contract) can be connected to your hook-enabled ERC20, enabling it to track balance updates of the underlying asset efficiently.

In other words, 1inch Token Hooks require inheritance from an independent, "hook-enabled" ERC20 contract, which manages all related dependent hook contracts. The hook-enabled ERC20 contract is responsible for calling the `updateBalance` function with every change in an account's balance.

All hooks will only track the balances of participating accounts. So all non-participants are represented as "0 addresses". If an account is not participating in a hook and receives a hook-enabled token, the `From` and `To` amounts under `_updateBalances` will be represented as 0. Therefore, if a non-participant sends a hook-enabled token to an existing participant, it will effectively "mint" the tracked balance. If a participant sends a hook-enabled token to a non-participant, it will effectively "burn" the tracked balance.

![Token Transfers](/src/img/TokenTransferDiagram.png)

For security purposes, hooks are designed with several fail-safes, including a maximum number of usable hooks, custom gas limits, a reentrancy guard, and native isolation from the main contract state. The maximum hooks and gas limit can be initialized as state variables using `MAX_HOOKS_PER_ACCOUNT` and `HOOK_CALL_GAS_LIMIT`, respectively. For reentrancy prevention, `ReentrancyGuardExt` is included from OpenZeppelin's library. Finally, for native isolation from the token contract, a single method with only three arguments (`To`, `From`, and `Amount`) is used. This simple architecture results in a dynamic (and risk-free!) enhancement of any ERC20 contract's capabilities.

## Integrating hook support in your token implementation
To integrate hooks in a smart contract, a "mothership" or parent contract must be used to manage all related hooks. This includes adding, removing, and viewing hooks, as well as connecting multiple hooks. The parent contract calls the `updateBalance` function for each hook on every update of an account's balance. The hook then executes its logic based on the updated balance information. An account must connect a hook to utilize its logic.

- **Inherit token**: `contract MyToken is ERC20Hooks { ... }`
- **Or wrap it**: `contract MyWrapper is ERC20Wrapper, ERC20Hooks { ... }`

This will add support for the hook infrastructure.

- **Wallets can hook**: `MyToken.addHook(hook)`, where `hook` is the address of your or a third-party deployed hook.
  - Now every time a wallet balance changes, the hook will know about it.

## How to create your own hook
To create your own hook, it is necessary to inherit the Hook contract and implement its abstract function `_updateBalances`.

- **Inherit hook**: `contract MyHook is Hook { ... }`
- **Implement _updateBalances** function to process wallet balance changes.

## Generic Examples

Below are examples of implementing Token Hooks through either creating a new token with built-in hook support, or wrapping an existing token to add hook functionality on-demand.

### Example 1: Creating a new token with hook support

```solidity
// SPDX-License-Identifier: MIT
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Hooks } from "@1inch/token-hooks/contracts/ERC20Hooks.sol";

// Minimalistic inherited token example
contract MyToken is ERC20, ERC20Hooks {
    constructor(string memory name, string memory symbol)
        ERC20(name, symbol)
        ERC20Hooks(10, 140000) // Max 10 hooks, 140k gas limit per hook
    {}
    
    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}
```

### Example 2: Wrapping an existing token to add hook functionality

```solidity
// SPDX-License-Identifier: MIT
import { ERC20Wrapper, IERC20, ERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Wrapper.sol";
import { ERC20Hooks } from "@1inch/token-hooks/contracts/ERC20Hooks.sol";

// Minimalistic token wrapper example
contract TokenWrapper is ERC20Wrapper, ERC20Hooks {
    constructor(IERC20 underlyingToken)
        ERC20("Wrapped Token", "wTKN")
        ERC20Wrapper(underlyingToken)
        ERC20Hooks(10, 140000) // Max 10 hooks, 140k gas limit per hook
    {}
}
```

### Example 3: A hook that mints/burns based on token balances

```solidity
// SPDX-License-Identifier: MIT
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Hook } from "@1inch/token-hooks/contracts/Hook.sol";
import { IERC20Hooks } from "@1inch/token-hooks/contracts/interfaces/IERC20Hooks.sol";

contract MyHook is ERC20, Hook {
    constructor(string memory name, string memory symbol, IERC20Hooks token_)
        ERC20(name, symbol)
        Hook(token_)
    {} // solhint-disable-line no-empty-blocks

    function _updateBalances(address from, address to, uint256 amount) internal override {
        if (from == address(0)) {
            _mint(to, amount);
        } else if (to == address(0)) {
            _burn(from, amount);
        } else {
            _transfer(from, to, amount);
        }
    }
}
```

The dynamic nature of Token Hooks makes them perfect for building automated governance systems. Users can opt in to governance mechanisms on-demand, and governance parameters can automatically adjust based on token activity without requiring manual interactions.

## Deployed Examples
- [Hook-enabled ERC20 contract](https://arbiscan.io/token/0x36a8747fc5F09cDE48e7b8Eb073Ae911b2cBa933#code)
- [Simple Hook contract](https://arbiscan.io/address/0x7f75495bf9a3f20b253a68a34a152c5f5587a742#code)
- [1inch Fusion (Delegated Staked 1INCH) Hook Contract](https://etherscan.io/address/0x806d9073136c8A4A3fD21E0e708a9e17C87129e8#code)
- [1inch Fusion Staking Farm](https://etherscan.io/address/0x1A87c0F9CCA2f0926A155640e8958a8A6B0260bE#code)

## Other Helpful Links
- [Hook-enabled ERC20 Token contract (abstract)](https://github.com/1inch/token-hooks/blob/master/contracts/ERC20Hooks.sol)
- [Hook contract (abstract)](https://github.com/1inch/token-hooks/blob/master/contracts/Hook.sol)
- [Anton Bukov speech at ETHCC](https://youtu.be/Is-T5Q2E0A8?feature=shared)
- [Kirill Kuznetcov speech at Nethermind Summit, Istanbul](https://youtu.be/BwehZHhR8Z4?feature=shared)
