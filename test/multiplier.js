const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("Plotus");
const Master = artifacts.require("Master");
const PlotusToken = artifacts.require("PlotusToken");
const MockchainLinkBTC = artifacts.require("MockChainLinkAggregator");
const TokenController = artifacts.require("MockTokenController");
const web3 = Market.web3;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
contract("Market", async function ([user1,user2,user3,user4,user5,user6,user7,user8,user9,user10]) {
  it("1. Players are incentivized to stake DAO tokens to earn a multiplier on their positions", async () => {
  let masterInstance = await OwnedUpgradeabilityProxy.deployed();
  masterInstance = await Master.at(masterInstance.address);
  let plotusToken = await PlotusToken.deployed();
  let tokenControllerAdd  = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
  let tokenController = await TokenController.at(tokenControllerAdd);
  let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
  let plotusNewInstance = await Plotus.at(plotusNewAddress);
  const openMarkets = await plotusNewInstance.getOpenMarkets();
  marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
  // await marketInstance.setMockPriceFlag(false);
  await increaseTime(10001);
  assert.ok(marketInstance);
  await plotusToken.approve(tokenController.address, "10000000000000000000000");
  await tokenController.lock("0x534d","1500000000000000000000",(86400*30),{from : user1});
  await plotusToken.transfer(user2, "2500000000000000000000");
  await tokenController.lock("0x534d","1600000000000000000000",(86400*30),{from : user2});
  await plotusToken.transfer(user3, "2500000000000000000000");
  await tokenController.lock("0x534d","1100000000000000000000",(86400*30),{from : user3});
  await plotusToken.transfer(user4, "2500000000000000000000");
  await tokenController.lock("0x534d","1100000000000000000000",(86400*30),{from : user4});
  
  await marketInstance.setOptionPrice(1, 9);
  await marketInstance.setOptionPrice(2, 18);
  await marketInstance.setOptionPrice(3, 27);
  
  let predictionPointsBeforeUser1 = await marketInstance.estimatePredictionValue(2,"1000000000000000000",1);
  let predictionPointsBeforeUser2 = await marketInstance.estimatePredictionValue(2,"4000000000000000000",2);
  let predictionPointsBeforeUser3 = await marketInstance.estimatePredictionValue(1,"1000000000000000000",1);
  let predictionPointsBeforeUser4 = await marketInstance.estimatePredictionValue(3,"1000000000000000000",2);
  console.log(predictionPointsBeforeUser1/1,predictionPointsBeforeUser2/1,predictionPointsBeforeUser3/1,predictionPointsBeforeUser4/1)
  await plotusToken.approve(marketInstance.address, "10000000000000000000000");
  await marketInstance.placePrediction(
    plotusToken.address,
    "100000000000000000000",
    2,
    1,
    {
      from: user1,
    }
  );
   await plotusToken.approve(marketInstance.address, "10000000000000000000000",{from : user2});
   await marketInstance.placePrediction(
    plotusToken.address,
    "400000000000000000000",
    2,
    2,
    {
      from: user2,
    }
  );
   await plotusToken.approve(marketInstance.address, "10000000000000000000000",{from : user3});
   await marketInstance.placePrediction(
    plotusToken.address,
    "100000000000000000000",
    1,
    1,
    {
      from: user3,
    }
  );
   await plotusToken.approve(marketInstance.address, "10000000000000000000000",{from : user4});
   await marketInstance.placePrediction(
    plotusToken.address,
    "100000000000000000000",
    3,
    2,
    {
      from: user4,
    }
  );
  let predictionPointsUser1 = await marketInstance.userPredictionPoints(user1, 2);
  let predictionPointsUser2 = await marketInstance.userPredictionPoints(user2, 2);
  let predictionPointsUser3 = await marketInstance.userPredictionPoints(user3, 1);
  let predictionPointsUser4 = await marketInstance.userPredictionPoints(user4, 3);
  console.log(predictionPointsUser1/1,predictionPointsUser2/1,predictionPointsUser3/1,predictionPointsUser4/1)
 
  });
});