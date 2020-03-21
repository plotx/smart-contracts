// const DAI  = artifacts.require('DAI');
// const KDAI = artifacts.require('KDAI');
// const POOL = artifacts.require('POOL');
const PlotusToken = artifacts.require('PlotusToken');
const BN = web3.utils.BN;

module.exports = function(deployer, network, accounts){
  deployer.then(async () => {

      // let deployDai = await deployer.deploy(DAI)
      // await deployer.deploy(KDAI)
      // await deployer.deploy(POOL, deployDai.address)
      await deployer.deploy(PlotusToken , 10000 ,new BN("1000000000000000000000"),"PLOTUS","PLOTUS",18);
  
  });
};
