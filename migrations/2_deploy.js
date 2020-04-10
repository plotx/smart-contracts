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
      await plotus.addNewMarket([Math.round(Date.now()/1000) + 100,1,2,1,7,1000000000000000,10000,2,2,100],"firstBet","0x47",["0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567","0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567"]);
  });
};

