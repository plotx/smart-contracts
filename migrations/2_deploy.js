const PlotusData = artifacts.require('PlotusData');
const Plotus = artifacts.require('Plotus');
// const Market = artifacts.require('Market');

const BN = web3.utils.BN;

module.exports = function(deployer, network, accounts){
  deployer.then(async () => {
      let deployPlotusData = await deployer.deploy(PlotusData);
      let deployPlotus = await deployer.deploy(Plotus ,deployPlotusData.address);
      
  });
};

