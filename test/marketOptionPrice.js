const { assert } = require("chai");
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("Plotus");
const Master = artifacts.require("Master");
const PlotusToken = artifacts.require("PlotusToken");
const BLOT = artifacts.require("BLOT");
const web3 = Market.web3;
const increaseTime = require("./utils/increaseTime.js").increaseTime;

contract("Market", async function ([user1,user2,user3,user4,user5,user6,user7,user8,user9,user10]) {

  it("1.Scenario 1 - Stake in ETH < minstake (no stake in LOT) and time passed < min time passed", async () => {
  masterInstance = await Master.deployed();
  plotusToken = await PlotusToken.deployed();
  BLOTInstance = await BLOT.deployed();

  plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
  plotusNewInstance = await Plotus.at(plotusNewAddress);
  const openMarkets = await plotusNewInstance.getOpenMarkets();
  marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
  await increaseTime(10001);
  assert.ok(marketInstance);
  await marketInstance.setMockPriceFlag(false);
  // setting option price in eth
  let priceOption1 = await marketInstance.getOptionPrice(1);
  let priceOption2 = await marketInstance.getOptionPrice(2);
  let priceOption3 = await marketInstance.getOptionPrice(3);
  console.log(priceOption1/1,priceOption2/1,priceOption3/1)
 
  // await marketInstance.setOptionPrice(1, 9);
  // await marketInstance.setOptionPrice(2, 18);
  // await marketInstance.setOptionPrice(3, 27);

  // user 10
  await marketInstance.placePrediction(
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "2000000000000000000",
    2,
    4,
    { value: "2000000000000000000", from: user1 }
  );

  });

});
