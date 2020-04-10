const Master = artifacts.require('Master');
const Plotus = artifacts.require('Plotus');
const MarketDaily = artifacts.require('MarketDaily');
const MarketHourly = artifacts.require('MarketHourly');
const MarketWeekly = artifacts.require('MarketWeekly');

const BN = web3.utils.BN;

module.exports = function(deployer, network, accounts){
  deployer.then(async () => {
      
      let deployPlotus = await deployer.deploy(Plotus ,"0x39bE8E539972E15ff59A10c4ff1711b55164b49c");
      let deployMarketHourly = await deployer.deploy(MarketHourly);
      let deployMarketDaily = await deployer.deploy(MarketDaily);
      let deployMarketWeekly = await deployer.deploy(MarketWeekly);
      let deployMaster = await deployer.deploy(Master , deployPlotus.address, [deployMarketHourly.address, deployMarketDaily.address, deployMarketWeekly.address]);
      let plotusAddress = await deployMaster.plotusAddress();
      let plotus = await Plotus.at(plotusAddress);
  });
};

