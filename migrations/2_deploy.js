const PlotusData = artifacts.require('PlotusData');
const Plotus = artifacts.require('Plotus');
const Market = artifacts.require('Market');

const BN = web3.utils.BN;

module.exports = function(deployer, network, accounts){
  deployer.then(async () => {
  	let nowTime = new Date()/1000;
    nowTime = parseInt(nowTime);
    let thenTime = new BN(((nowTime/1+(1800)).toString()));
    // let thenTime = new BN(((nowTime/1+(3600)).toString()));
    const start = nowTime/1
    const end = thenTime/1
      let deployPlotusData = await deployer.deploy(PlotusData);
      let deployPlotus = await deployer.deploy(Plotus ,deployPlotusData.address);
       // for deploy test case "place bet from nine users with 2% commision and 2% donation" uncomment line 18  code 
      let deploymarket = await deployer.deploy(Market ,[start,end,1,2,1,7,1000000000000000,10000,2,2,100],"firstBet","0x47",["0x81A69EE30637601356ff15d6c4a905079b53FCE1","0x81A69EE30637601356ff15d6c4a905079b53FCE1"],deployPlotusData.address);
      //  for deploy test case "place bet from nine users with 0% commision and 0% donation" uncomment line 20  code
      // let deploymarket = await deployer.deploy(Market ,[start,end,1,2,1,7,1000000000000000,10000,0,0,100],"firstBet","0x47",["0x81A69EE30637601356ff15d6c4a905079b53FCE1","0x81A69EE30637601356ff15d6c4a905079b53FCE1"],deployPlotusData.address);
  });
};

