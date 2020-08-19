const { assert } = require("chai");

const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("Plotus");
const Master = artifacts.require("Master");
const PlotusToken = artifacts.require("PlotusToken");
const BLOT = artifacts.require("BLOT");

const web3 = Market.web3;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
// get etherum accounts
// swap ether with LOT

contract("Market", async function ([
  user1,
  user2,
  user3,
  user4,
  user5,
  user6,
  user7,
  user8,
  user9,
  user10,
]) {
  masterInstance = await Master.deployed();
  plotusToken = await PlotusToken.deployed();
  BLOTInstance = await BLOT.deployed();

  plotusNewAddress = await masterInstance.getLatestAddress(
    web3.utils.toHex("PL")
  );
  plotusNewInstance = await Plotus.at(plotusNewAddress);
  // console.log(await plotusNewInstance.getOpenMarkets());
  const openMarkets = await plotusNewInstance.getOpenMarkets();

  console.log(`OpenMaket : ${openMarkets["_openMarkets"][0]}`);

  marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
  await increaseTime(10001);
  assert.ok(marketInstance);
  getReturnsInEth = async (user) => {
    // return userReturn in eth
    const response = await marketInstance.getReturn();
    let returnAmountInEth = response[0][1];
    return returnAmountInEth;
  };
  getReturnTotalLot = async (user) => {
    // return userReturn in Lot
    const response = await marketInstance.getReturn();
    let returnAmountInLot = response[0][0];
    return returnAmountInLot;
  };
  getBetPoints = async (user) => {
    // return bet points of user
    let betPoins = await marketInstance.userPredictionPoints();
    return betPoins;
  };

  // setting option price in eth
  await marketInstance.setOptionPrice(1, 9);
  marketInstance.setOptionPrice(2, 18);
  marketInstance.setOptionPrice(3, 27);

  // user 1
  await plotusToken.approve(
    openMarkets["_openMarkets"][0],
    "100000000000000000000",
    2,
    1,
    {
      from: user1,
    }
  );
  await marketInstance.placePrediction(
    plotusToken.address,
    "100000000000000000000",
    { from: user1 }
  );

  // user 2
  await plotusToken.transferFrom(user1, user2, "500000000000000000000");

  await plotusToken.approve(BLOTInstance.address, "400000000000000000000");
  await BLOTInstance.mint(user2, "400000000000000000000");

  // user 3

  await plotusToken.transferFrom(user1, user3, "500000000000000000000");
  await plotusToken.approve(
    openMarkets["_openMarkets"][0],
    "210000000000000000000",
    {
      from: user3,
    }
  );
  await marketInstance.placePrediction(
    plotusToken.address,
    "210000000000000000000",
    2,
    2,
    { from: user3 }
  );
  // user 4
  // place bets with ether
  await marketInstance.placePrediction(
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "1000000000000000000",
    1,
    4,
    { value: "1000000000000000000", from: user4 }
  );
  // user 5
  await marketInstance.placePrediction(
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "2000000000000000000",
    1,
    5,
    { value: "2000000000000000000", from: user5 }
  );

  // user 6
  await marketInstance.placePrediction(
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "2000000000000000000",
    1,
    5,
    { value: "2000000000000000000", from: user6 }
  );
  // user 7
  await marketInstance.placePrediction(
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "1000000000000000000",
    2,
    2,
    { value: "1000000000000000000", from: user7 }
  );
  // user 8
  await marketInstance.placePrediction(
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "3000000000000000000",
    3,
    3,
    { value: "3000000000000000000", from: user8 }
  );
  // user 9
  await marketInstance.placePrediction(
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "1000000000000000000",
    3,
    1,
    { value: "1000000000000000000", from: user9 }
  );
  // user 10
  await marketInstance.placePrediction(
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "2000000000000000000",
    2,
    4,
    { value: "2000000000000000000", from: user10 }
  );
  const accounts = [
    user1,
    user2,
    user3,
    user4,
    user5,
    user6,
    user7,
    user8,
    user9,
    user10,
  ];

  it("1.Bet Points allocated properly", async () => {
    {
      const betPointsExpected = [
        5.552777778,
        222.1111111,
        23.32166667,
        341.4958333,
        444.0,
        1110,
        111,
        333,
        37,
        444,
      ];

      for (let user of accounts) {
        let index = accounts.indexOf(user);
        assert.isTrue(getBetPoints(user) === betPointsExpected[index]);
      }
    }
  });

  console.log(await plotusToken.balanceOf(user1));

  // close market
  await marketInstance.calculatePredictionResult(1);

  it("2.check total return for each user bet values in eth", async () => {
    const returnInEthExpected = [
      0,
      0,
      0,
      0,
      2.140714286,
      4.852285714,
      0.5994,
      1.1988,
      0.7992,
      0.3996,
    ];
    // calulate  rewards for every user in eth

    console.log("Testing Rewards");
    for (let user of accounts) {
      let index = accounts.indexOf(user);
      // check eth rewards
      assert.isTrue(getReturnsInEth(user) === returnInEthExpected[index]);
    }
  });

  it("3.check total return for each user bet values in lot tokens", async () => {
    const totalReturnLotExpexted = [
      79.96903925,
      0.3615700097,
      125.9749649,
      0.5559138899,
      179.776064,
      449.44016,
      0.1806945671,
      0.5420837014,
      0.06023152238,
      0.7227782685,
    ];
    console.log("Testing Rewards");
    for (let user of accounts) {
      let index = accounts.indexOf(user);
      assert.isTrue(getReturnTotalLot(user) === totalReturnLotExpexted[index]);
    }
  });
});
