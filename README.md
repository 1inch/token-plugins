# Token Plugins

[![Build Status](https://github.com/1inch/token-plugins/workflows/CI/badge.svg)](https://github.com/1inch/token-plugins/actions)
[![Coverage Status](https://codecov.io/gh/1inch/token-plugins/branch/master/graph/badge.svg?token=Z3D5O3XUYV)](https://codecov.io/gh/1inch/token-plugins)
[![NPM Package](https://img.shields.io/npm/v/@1inch/token-plugins.svg)](https://www.npmjs.org/package/@1inch/token-plugins)

ERC20 extension enabling external smart contract based plugins to track balances of those users who opted-in to these plugins.

Examples of ERC20 plugins:
- [FarmingPlugin](https://github.com/1inch/farming)
- [DelegatingPlugin](https://github.com/1inch/delegating)

Usage:
- Inherit your tokens or tokenized protocol shares from `ERC20Plugins`

Contribution:
- Install dependencies: `yarn` 
- Run tests: `yarn test` or `run test:ci`
