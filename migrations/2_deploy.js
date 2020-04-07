const Master = artifacts.require('Master');
const Plotus = artifacts.require('Plotus');
// const Market = artifacts.require('Market');

const BN = web3.utils.BN;

module.exports = function(deployer, network, accounts){
  deployer.then(async () => {
      
      let deployPlotus = await deployer.deploy(Plotus ,"0x81A69EE30637601356ff15d6c4a905079b53FCE1");
      let deployMaster = await deployer.deploy(Master , deployPlotus.address);
      
  });
};

