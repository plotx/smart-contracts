const Master = artifacts.require('Master');
const Plotus = artifacts.require('Plotus');
const PlotusToken = artifacts.require('PlotusToken');
const MarketConfig = artifacts.require('MarketConfig');
const Market = artifacts.require('Market');
const MockchainLinkBTC = artifacts.require('MockChainLinkBTC');
const BN = web3.utils.BN;

module.exports = function(deployer, network, accounts){
  deployer.then(async () => {
      
      let deployPlotus = await deployer.deploy(Plotus);
      let deployPlotusToken = await deployer.deploy(PlotusToken);
      let deployMockchainLinkBTC = await deployer.deploy(MockchainLinkBTC);
      let deployMarketHourly = await deployer.deploy(MarketConfig, [0,3,3600,2,2,'1000000000000000000'],[accounts[0],accounts[1],deployMockchainLinkBTC.address]);
      let deployMaster = await deployer.deploy(Master , deployPlotus.address, [deployMarketHourly.address], deployPlotusToken.address);
      let plotusAddress = await deployMaster.plotusAddress();
      let plotus = await Plotus.at(plotusAddress);
  });
};

