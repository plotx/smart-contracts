const Master = artifacts.require('Master');
const Plotus = artifacts.require('Plotus');
const MarketConfig = artifacts.require('MarketConfig');
const Market = artifacts.require('Market');

const BN = web3.utils.BN;

module.exports = function(deployer, network, accounts){
  deployer.then(async () => {
      
      let deployPlotus = await deployer.deploy(Plotus);
      let deployMarketHourly = await deployer.deploy(MarketConfig, [0,100,3,3600,1,1],[accounts[0],accounts[1]]);
      let deployMarketDaily = await deployer.deploy(MarketConfig, [1,100,3,3600*24,1,1],[accounts[0],accounts[1]]);
      let deployMarketWeekly = await deployer.deploy(MarketConfig, [2,100,3,3600*24*7,1,1],[accounts[0],accounts[1]]);
      let deployMaster = await deployer.deploy(Master , deployPlotus.address, [deployMarketHourly.address, deployMarketDaily.address, deployMarketWeekly.address]);
      let plotusAddress = await deployMaster.plotusAddress();
      // let plotus = await Plotus.at(plotusAddress);
      // let date = Math.round(Date.now()/1000) + 500;
      // const addNewMarket = await plotus.addNewMarket(0,[date,100,5,3],"firstBet","0x47")

  });
};

