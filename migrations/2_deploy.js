const PlotusData = artifacts.require('PlotusData');
const Plotus = artifacts.require('Plotus');
const Market = artifacts.require('Market');

const BN = web3.utils.BN;

module.exports = function(deployer, network, accounts){
  deployer.then(async () => {
  	let nowTime = new Date()/1000;
    nowTime = parseInt(nowTime);
    let thenTime = new BN(((nowTime/1+(60)).toString()));
      let deployPlotusData = await deployer.deploy(PlotusData);
      let deployPlotus = await deployer.deploy(Plotus ,deployPlotusData.address);
      let deploymarket = await deployer.deploy(Market ,[nowTime,thenTime,1,2,1,7,1000000000000000,10000,2,2,100],"firstBet","0x47",["0x81A69EE30637601356ff15d6c4a905079b53FCE1","0x81A69EE30637601356ff15d6c4a905079b53FCE1"]);
  });
};

