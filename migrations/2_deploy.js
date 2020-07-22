const Master = artifacts.require('Master');
const Plotus = artifacts.require('Plotus');
const MarketConfig = artifacts.require('MarketConfig');
const Market = artifacts.require('Market');
const MockchainLinkBTC = artifacts.require('MockchainLinkBTC');
const BN = web3.utils.BN;

module.exports = function(deployer, network, accounts){
  deployer.then(async () => {
      
      let deployPlotus = await deployer.deploy(Plotus);
      let deployMockchainLinkBTC = await deployer.deploy(MockchainLinkBTC);
      let deployMarketHourly = await deployer.deploy(MarketConfig, [0,3,3600,2,2],[accounts[0],accounts[1],deployMockchainLinkBTC.address]);
      let deployMaster = await deployer.deploy(Master , deployPlotus.address, [deployMarketHourly.address]);
      let plotusAddress = await deployMaster.plotusAddress();
  });
};

