const hre = require('hardhat');
const { getChainId, ethers } = hre;

module.exports = async ({ deployments, getNamedAccounts }) => {
    console.log('running deploy script');
    console.log('network id ', await getChainId());

    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const tokenMockDeployment = await deploy('TokenMock', {
        from: deployer,
    });

    console.log('TokenMock deployed to:', tokenMockDeployment.address);

    const TokenMock = await ethers.getContractFactory('TokenMock');
    const tokenMock = TokenMock.attach(tokenMockDeployment.address);

    const txn = await tokenMock.func('1234');
    await txn;

    if (await getChainId() !== '31337') {
        await hre.run('verify:verify', {
            address: tokenMockDeployment.address,
        });
    }
};

module.exports.skip = async () => true;
