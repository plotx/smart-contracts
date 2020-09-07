const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("MarketRegistry");
const Master = artifacts.require("Master");
const PlotusToken = artifacts.require("MockPLOT");
const MarketConfig = artifacts.require('MockConfig');
const BLOT = artifacts.require("BLOT");
const MockUniswapRouter = artifacts.require("MockUniswapRouter");
const BigNumber = require("bignumber.js");

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
  it("Place the bets with ether", async () => {
      masterInstance = await OwnedUpgradeabilityProxy.deployed();
      masterInstance = await Master.at(masterInstance.address);
      plotusToken = await PlotusToken.deployed();
      BLOTInstance = await BLOT.deployed();
      MockUniswapRouterInstance = await MockUniswapRouter.deployed();
      plotusNewAddress = await masterInstance.getLatestAddress(
        web3.utils.toHex("PL")
      );
      plotusNewInstance = await Plotus.at(plotusNewAddress);
      marketConfig = await plotusNewInstance.marketUtility();
      marketConfig = await MarketConfig.at(marketConfig);
      // console.log(await plotusNewInstance.getOpenMarkets());
      openMarkets = await plotusNewInstance.getOpenMarkets();

      // console.log(`OpenMaket : ${openMarkets["_openMarkets"][0]}`);

      marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
      await increaseTime(10001);
      assert.ok(marketInstance);

      // setting option price in eth
      await marketInstance.setOptionPrice(1, 9);
      await marketInstance.setOptionPrice(2, 18);
      await marketInstance.setOptionPrice(3, 27);

      // set price
      // user 1
      // set price lot
      await MockUniswapRouterInstance.setPrice("1000000000000000");
      await marketConfig.setPrice("1000000000000000");
      await plotusToken.approve(
        openMarkets["_openMarkets"][0],
        "100000000000000000000",
        {
          from: user1,
        }
      );
      await marketInstance.placePrediction(
        plotusToken.address,
        "100000000000000000000",
        2,
        1,
        { from: user1 }
      );

      // user 2
      await MockUniswapRouterInstance.setPrice("2000000000000000");
      await marketConfig.setPrice("2000000000000000");
      await plotusToken.transfer(user2, "500000000000000000000");

      await plotusToken.approve(
        openMarkets["_openMarkets"][0],
        "400000000000000000000",
        {
          from: user2,
        }
      );
      await marketInstance.placePrediction(
        plotusToken.address,
        "400000000000000000000",
        2,
        2,
        { from: user2 }
      );
      // user 3
      await MockUniswapRouterInstance.setPrice("1000000000000000");
      await marketConfig.setPrice("1000000000000000");
      await plotusToken.transfer(user3, "500000000000000000000");
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
      await MockUniswapRouterInstance.setPrice("15000000000000000");
      await marketConfig.setPrice("15000000000000000");

      await plotusToken.transfer(user4, "200000000000000000000");

      await plotusToken.approve(
        openMarkets["_openMarkets"][0],
        "123000000000000000000",
        {
          from: user4,
        }
      );
      await marketInstance.placePrediction(
        plotusToken.address,
        "123000000000000000000",
        3,
        3,
        { from: user4 }
      );

      // user 5
      await MockUniswapRouterInstance.setPrice("12000000000000000");
      await marketConfig.setPrice("12000000000000000");
      await marketInstance.placePrediction(
        "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        "1000000000000000000",
        2,
        4,
        { value: "1000000000000000000", from: user5 }
      );

      // user 6
      await MockUniswapRouterInstance.setPrice("14000000000000000");
      await marketConfig.setPrice("14000000000000000");
      await marketInstance.placePrediction(
        "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        "2000000000000000000",
        3,
        5,
        { value: "2000000000000000000", from: user6 }
      );
      // user 7
      await MockUniswapRouterInstance.setPrice("10000000000000000");
      await marketConfig.setPrice("10000000000000000");

      await marketInstance.placePrediction(
        "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        "1000000000000000000",
        2,
        2,
        { value: "1000000000000000000", from: user7 }
      );
      // user 8
      await MockUniswapRouterInstance.setPrice("45000000000000000");
      await marketConfig.setPrice("45000000000000000");
      await marketInstance.placePrediction(
        "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        "3000000000000000000",
        3,
        3,
        { value: "3000000000000000000", from: user8 }
      );
      // user 9
      await MockUniswapRouterInstance.setPrice("51000000000000000");
      await marketConfig.setPrice("51000000000000000");
      await marketInstance.placePrediction(
        "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        "1000000000000000000",
        3,
        1,
        { value: "1000000000000000000", from: user9 }
      );
      // user 10
      await MockUniswapRouterInstance.setPrice("12000000000000000");
      await marketConfig.setPrice("12000000000000000");
      await marketInstance.placePrediction(
        "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        "2000000000000000000",
        2,
        4,
        { value: "2000000000000000000", from: user10 }
      );
    });

    it("1.0 Bet Points allocated properly in ether", async () => {
			accounts = [user1, user2, user3, user4, user5, user6, user7, user8, user9, user10];
			options = [2, 2, 2, 3, 2, 3, 2, 3, 3, 2];
			getBetPoints = async (user, option, expected) => {
				// return bet points of user
				let betPoins = await marketInstance.userPredictionPoints(user, option);
				betPoins = betPoins / 1;
				return betPoins;
			};
			betPointsExpected = [
				1.755503471,
				83.41726908,
				11.21889102,
				306.0687072,
				255.1723181,
				627.5967878,
				116.4917104,
				634.1329064,
				36.98149537,
				721.7363059,
			];

			for (let index = 0; index < 10; index++) {
				let betPoints = await getBetPoints(accounts[index], options[index]);
				betPoints = betPoints / 1000;
				betPoints = betPoints.toFixed(1);
        await assert.equal(betPoints, betPointsExpected[index].toFixed(1));
			}
      await increaseTime(36001);
      await marketInstance.calculatePredictionResult(1);
      await increaseTime(36001);
      // plotus contract balance eth balance

      plotusBalanceBefore = web3.utils.fromWei(await web3.eth.getBalance(plotusNewAddress));
			lotBalanceBefore = await plotusToken.balanceOf(openMarkets["_openMarkets"][0]);
			assert.equal(parseFloat(plotusBalanceBefore), (6.7982-0.01*0.5).toFixed(5)); //stake-amount lost
      assert.equal(parseFloat(web3.utils.fromWei(lotBalanceBefore)).toFixed(2), (833-337.6311).toFixed(2));
      
			await MockUniswapRouterInstance.setPrice("1000000000000000");
			await marketConfig.setPrice("1000000000000000");
			await marketInstance.exchangeCommission();
			await increaseTime(360001);

			plotusBalanceAfter = await web3.eth.getBalance(plotusNewAddress);
			lotBalanceAfter = await plotusToken.balanceOf(openMarkets["_openMarkets"][0]);
			assert.equal(parseFloat(plotusBalanceAfter), web3.utils.toWei("6.7982"));
			assert.equal(parseFloat(web3.utils.fromWei(lotBalanceAfter)).toFixed(2), (499.9524).toFixed(2));
			assert.equal(
				parseFloat(web3.utils.fromWei(String(parseFloat(lotBalanceAfter) - parseFloat(lotBalanceBefore)))).toFixed(2),
				(4.5835).toFixed(2)
      );
      });
    it("2.check total return for each user bet values in eth", async () => {
      accounts = [
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
      options = [2, 2, 2, 3, 2, 3, 2, 3, 3, 2];
      getReturnsInEth = async (user) => {
				// return userReturn in eth
				const response = await marketInstance.getReturn(user);
				let returnAmountInEth = web3.utils.fromWei(response[0][1]);
				return returnAmountInEth;
			};
      const returnInEthExpected = [0, 0, 0, 0, 0.1998, 0, 0.5994, 1.1988, 0.7992, 0.3996];
      // calulate  rewards for every user in eth
      for (let index = 0; index < 10; index++) {
				// check eth returns
				let returns = await getReturnsInEth(accounts[index]);
				assert.equal(parseFloat(returns).toFixed(2), returnInEthExpected[index].toFixed(2));
			}
    });
    it("3.Check User Recived The appropriate amount", async () => {
      accounts = [
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
      const totalReturnLotExpexted = [
				79.96314092,
				240.0292487,
				125.9570726,
				49.72301287,
				0.4565499255,
				1.122885385,
				0.208424966,
				1.134579696,
				0.06616665587,
				1.291318193,
			];
      const returnInEthExpected = [0, 0, 0, 0, 0.1998, 0, 0.5994, 1.1988, 0.7992, 0.3996];

      for (let account of accounts) {
        beforeClaim = await web3.eth.getBalance(account);
				beforeClaimToken = await plotusToken.balanceOf(account);
				await marketInstance.claimReturn(account);
				afterClaim = await web3.eth.getBalance(account);
				afterClaimToken = await plotusToken.balanceOf(account);
				diff = afterClaim - beforeClaim;
				diff = new BigNumber(diff);
				conv = new BigNumber(1000000000000000000);
				diff = diff / conv;
				diff = diff.toFixed(2);
				expectedInEth = returnInEthExpected[accounts.indexOf(account)].toFixed(2);
				assert.equal(diff, expectedInEth);

				diffToken = afterClaimToken - beforeClaimToken;
				diffToken = diffToken / conv;
				diffToken = diffToken.toFixed(1);
				expectedInLot = totalReturnLotExpexted[accounts.indexOf(account)].toFixed(1);
				assert.equal(diffToken, expectedInLot);
      }
      // console.log((await web3.eth.getBalance(marketInstance.address)) / 1);
    });
});  