const { assert } = require("chai");

const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("Plotus");
const Master = artifacts.require("Master");
const MarketConfig = artifacts.require("MockConfig");
const PlotusToken = artifacts.require("MockPLOT");
const BLOT = artifacts.require("BLOT");
const MockUniswapRouter = artifacts.require("MockUniswapRouter");
const BigNumber = require("bignumber.js");
const { increaseTimeTo } = require("./utils/increaseTime.js");

const web3 = Market.web3;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const latestTime = require("./utils/latestTime.js").latestTime;
// get etherum accounts
// swap ether with LOT
let timeNow,
	marketData,
	expireTme,
	priceOption1,
	priceOption2,
	priceOption3,
	option1RangeMIN,
	option1RangeMAX,
	option2RangeMIN,
	option2RangeMAX,
	option3RangeMIX,
	marketStatus,
	option3RangeMAX;

contract("Market", async function ([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]) {
	describe("Place the bets with ether", async () => {
		it("0.0", async () => {
			masterInstance = await OwnedUpgradeabilityProxy.deployed();
			masterInstance = await Master.at(masterInstance.address);
			plotusToken = await PlotusToken.deployed();
			BLOTInstance = await BLOT.deployed();
			MockUniswapRouterInstance = await MockUniswapRouter.deployed();
			plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			plotusNewInstance = await Plotus.at(plotusNewAddress);
			marketConfig = await plotusNewInstance.marketConfig();
			marketConfig = await MarketConfig.at(marketConfig);
			// console.log(await plotusNewInstance.getOpenMarkets());
			openMarkets = await plotusNewInstance.getOpenMarkets();
			timeNow = await latestTime();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);

			marketData = await marketInstance.getData();
			// expireTme = parseFloat(marketData._expireTime);
			// console.log("expireTme", expireTme);
			// console.log("timeNow", timeNow);

			priceOption1 = parseFloat(await marketInstance.getOptionPrice(1));
			priceOption2 = parseFloat(await marketInstance.getOptionPrice(2));
			priceOption3 = parseFloat(await marketInstance.getOptionPrice(3));

			option1RangeMIN = parseFloat(marketData[1][0]);
			option1RangeMAX = parseFloat(marketData[2][0]);
			option2RangeMIN = parseFloat(marketData[1][1]);
			option2RangeMAX = parseFloat(marketData[2][1]);
			option3RangeMIX = parseFloat(marketData[1][2]);
			option3RangeMAX = parseFloat(marketData[2][2]);
		});

		it("0.1 Assert values from getData()", async () => {
			assert.equal(option1RangeMIN, 0);
			assert.equal(option1RangeMAX, 899999999999);
			assert.equal(option2RangeMIN, 900000000000);
			assert.equal(option2RangeMAX, 1000000000000);
			assert.equal(option3RangeMIX, 1000000000001);
			assert.equal(option3RangeMAX, 1.157920892373162e77);
			assert.equal(parseFloat(marketData._optionPrice[0]), priceOption1);
			assert.equal(parseFloat(marketData._optionPrice[1]), priceOption2);
			assert.equal(parseFloat(marketData._optionPrice[2]), priceOption3);
			assert.equal(marketData._marketCurrency, openMarkets._marketCurrencies[0]);
			assert.equal(parseFloat(marketData._assetStaked[0]), 0);
			assert.equal(parseFloat(marketData._assetStaked[1]), 0);
			assert.equal(parseFloat(marketData._assetStaked[2]), 0);
			assert.equal(parseFloat(marketData._predictionType), 0);
		});

		it("0.2", async () => {
			await increaseTime(10001);
			assert.ok(marketInstance);

			// setting option price in eth
			await marketInstance.setOptionPrice(1, 9);
			await marketInstance.setOptionPrice(2, 18);
			await marketInstance.setOptionPrice(3, 27);

			marketData = await marketInstance.getData();
			priceOption1 = parseFloat(await marketInstance.getOptionPrice(1));
			priceOption2 = parseFloat(await marketInstance.getOptionPrice(2));
			priceOption3 = parseFloat(await marketInstance.getOptionPrice(3));
		});

		it("0.3 Assert values from getData()", async () => {
			assert.equal(parseFloat(marketData._optionPrice[0]), priceOption1);
			assert.equal(parseFloat(marketData._optionPrice[1]), priceOption2);
			assert.equal(parseFloat(marketData._optionPrice[2]), priceOption3);
			assert.equal(parseFloat(marketData._optionPrice[0]), 9);
			assert.equal(parseFloat(marketData._optionPrice[1]), 18);
			assert.equal(parseFloat(marketData._optionPrice[2]), 27);
		});

		it("0.4 Assert values from getData()", async () => {
			// set price
			// user 1
			// set price lot
			await MockUniswapRouterInstance.setPrice("1000000000000000");
			await marketConfig.setPrice("1000000000000000");
			await plotusToken.approve(openMarkets["_openMarkets"][0], "100000000000000000000", {
				from: user1,
			});
			await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 2, 1, { from: user1 });

			// user 2
			await MockUniswapRouterInstance.setPrice("2000000000000000");
			await marketConfig.setPrice("2000000000000000");
			await plotusToken.transfer(user2, "500000000000000000000");

			await plotusToken.approve(openMarkets["_openMarkets"][0], "400000000000000000000", {
				from: user2,
			});
			await marketInstance.placePrediction(plotusToken.address, "400000000000000000000", 2, 2, { from: user2 });
			// await plotusToken.approve(BLOTInstance.address, "1000000000000000000000");
			// await BLOTInstance.mint(user2, "1000000000000000000000");
			// // await BLOTInstance.transferFrom(user1, user2, "500000000000000000000", {
			// //   from: user1,
			// // });

			// await BLOTInstance.approve(
			//   openMarkets["_openMarkets"][0],
			//   "40000000000000000000",
			//   {
			//     from: user2,
			//   }
			// );
			// console.log(await BLOTInstance.balanceOf(user1));
			// await BLOTInstance.addMinter(marketInstance.address);
			// await marketInstance.placePrediction(
			//   BLOTInstance.address,
			//   "40000000000000000000",
			//   2,
			//   5,
			//   { from: user2 }
			// );

			// user 3
			await MockUniswapRouterInstance.setPrice("1000000000000000");
			await marketConfig.setPrice("1000000000000000");
			await plotusToken.transfer(user3, "500000000000000000000");
			await plotusToken.approve(openMarkets["_openMarkets"][0], "210000000000000000000", {
				from: user3,
			});
			await marketInstance.placePrediction(plotusToken.address, "210000000000000000000", 2, 2, { from: user3 });
			// user 4
			// place bets with ether
			// await BLOTInstance.approve(
			//   openMarkets["_openMarkets"][0],
			//   "123000000000000000000",
			//   {
			//     from: user4,
			//   }
			// );
			// await marketInstance.placePrediction(
			//   BLOTInstance.address,
			//   "123000000000000000000",
			//   3,
			//   5,
			//   { from: user4 }
			// );

			await MockUniswapRouterInstance.setPrice("15000000000000000");
			await marketConfig.setPrice("15000000000000000");

			await plotusToken.transfer(user4, "200000000000000000000");

			await plotusToken.approve(openMarkets["_openMarkets"][0], "123000000000000000000", {
				from: user4,
			});
			await marketInstance.placePrediction(plotusToken.address, "123000000000000000000", 3, 3, { from: user4 });

			// user 5
			await MockUniswapRouterInstance.setPrice("12000000000000000");
			await marketConfig.setPrice("12000000000000000");
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "1000000000000000000", 1, 4, {
				value: "1000000000000000000",
				from: user5,
			});

			// user 6
			await MockUniswapRouterInstance.setPrice("14000000000000000");
			await marketConfig.setPrice("14000000000000000");
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "2000000000000000000", 1, 5, {
				value: "2000000000000000000",
				from: user6,
			});
			// user 7
			await MockUniswapRouterInstance.setPrice("10000000000000000");
			await marketConfig.setPrice("10000000000000000");

			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "1000000000000000000", 2, 2, {
				value: "1000000000000000000",
				from: user7,
			});
			// user 8
			await MockUniswapRouterInstance.setPrice("45000000000000000");
			await marketConfig.setPrice("45000000000000000");
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "3000000000000000000", 3, 3, {
				value: "3000000000000000000",
				from: user8,
			});
			// user 9
			await MockUniswapRouterInstance.setPrice("51000000000000000");
			await marketConfig.setPrice("51000000000000000");
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "1000000000000000000", 3, 1, {
				value: "1000000000000000000",
				from: user9,
			});
			// user 10
			await MockUniswapRouterInstance.setPrice("12000000000000000");
			await marketConfig.setPrice("12000000000000000");
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "2000000000000000000", 2, 4, {
				value: "2000000000000000000",
				from: user10,
			});
		});

		it("0.5 Assert values from getData() _assetStaked", async () => {
			marketData = await marketInstance.getData();
			assert.equal(parseFloat(web3.utils.fromWei(marketData._assetStaked[0])).toFixed(1), (2.99).toFixed(1));
			assert.equal(parseFloat(web3.utils.fromWei(marketData._assetStaked[1])).toFixed(1), (11.52).toFixed(1));
			assert.equal(parseFloat(web3.utils.fromWei(marketData._assetStaked[2])).toFixed(1), (5.47).toFixed(1));
		});

		it("1.0 Bet Points allocated properly in ether", async () => {
			accounts = [user1, user2, user3, user4, user5, user6, user7, user8, user9, user10];
			options = [2, 2, 2, 3, 1, 1, 2, 3, 3, 2];
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
				510.3446361,
				1882.790363,
				116.4917104,
				634.1329064,
				36.98149537,
				721.7363059,
			];
			// console.log("bet points for user 1");
			// betPointsUser1 = await getBetPoints(accounts[0], options[0]);
			// betPointsUser3 = await getBetPoints(accounts[2], options[2]);

			// console.log(
			//   `bet points : ${betPointsUser1} expected : ${betPointsExpected[0]} `
			// );
			// console.log("bet points for user 3");
			// console.log(
			//   `bet points : ${betPointsUser3} expected : ${betPointsExpected[2]} `
			// );

			for (let index = 0; index < 10; index++) {
				let betPoints = await getBetPoints(accounts[index], options[index]);
				betPoints = betPoints / 1000;
				betPoints = betPoints.toFixed(1);
				await assert(betPoints === betPointsExpected[index].toFixed(1));
				// commented by parv (added a assert above)
				// console.log(`user${index + 1} : option : ${options[index]}  `);
				// console.log(`bet points : ${betPoints} expected : ${betPointsExpected[index].toFixed(1)} `);
			}
			// console.log(await plotusToken.balanceOf(user1));
		});

		it("1.1 Assert values from getData() prediction status before", async () => {
			marketData = await marketInstance.getData();
			assert.equal(parseFloat(marketData._predictionStatus), 0);
		});

		it("1.2", async () => {
			// close market
			await increaseTime(36001);
			await marketInstance.calculatePredictionResult(1);
			await increaseTime(36001);
		});
		it("1.3 Assert values from getData() prediction status after", async () => {
			marketData = await marketInstance.getData();
			assert.equal(parseFloat(marketData._predictionStatus), 4);
		});
		it("1.4", async () => {
			// plotus contract balance eth balance
			plotusBalanceBefore = await web3.eth.getBalance(plotusNewAddress);
			lotBalanceBefore = await plotusToken.balanceOf(openMarkets["_openMarkets"][0]);
			assert.equal(parseFloat(plotusBalanceBefore), 0);
			assert.equal(parseFloat(web3.utils.fromWei(lotBalanceBefore)).toFixed(2), (833).toFixed(2));
			// commented by parv (added a assert above)
			// console.log(`plotus eth balance before commision : ${plotusBalanceBefore}`);
			// lotBalanceBefore = lotBalanceBefore / 1;
			// console.log(`Lot Balance of market before commision : ${lotBalanceBefore}`);
			// lot supply , lot balance of market
			await MockUniswapRouterInstance.setPrice("1000000000000000");
			await marketConfig.setPrice("1000000000000000");

			await marketInstance.exchangeCommission();
			await increaseTime(360001);

			plotusBalanceAfter = await web3.eth.getBalance(plotusNewAddress);
			assert.equal(parseFloat(plotusBalanceAfter), web3.utils.toWei("0.005"));
			lotBalanceAfter = await plotusToken.balanceOf(openMarkets["_openMarkets"][0]);
			assert.equal(parseFloat(web3.utils.fromWei(lotBalanceAfter)).toFixed(2), (837.5835).toFixed(2));
			assert.equal(
				parseFloat(web3.utils.fromWei(String(parseFloat(lotBalanceAfter) - parseFloat(lotBalanceBefore)))).toFixed(2),
				(4.5835).toFixed(2)
			);
			// commented by parv (added a assert above)
			// console.log(`plotus balance after commision : ${plotusBalanceAfter}`);
			// lotBalanceAfter = lotBalanceAfter / 1;
			// console.log(`Lot Balance of market before commision : ${lotBalanceAfter}`);
			// console.log(`Difference : ${lotBalanceAfter - lotBalanceBefore}`);
		});

		it("2.check total return for each user bet values in eth", async () => {
			accounts = [user1, user2, user3, user4, user5, user6, user7, user8, user9, user10];
			options = [2, 2, 2, 3, 1, 1, 2, 3, 3, 2];
			getReturnsInEth = async (user) => {
				// return userReturn in eth
				const response = await marketInstance.getReturn(user);
				let returnAmountInEth = web3.utils.fromWei(response[0][1]);
				return returnAmountInEth;
			};

			const returnInEthExpected = [0, 0, 0, 0, 1.851161356, 5.141838644, 0.5994, 1.1988, 0.7992, 0.3996];
			// calulate  rewards for every user in eth
			// console.log("Rewards in Eth");

			for (let index = 0; index < 10; index++) {
				// check eth returns
				let returns = await getReturnsInEth(accounts[index]);
				// commented by parv as already added assert
				// console.log(`return : ${returns} Expected :${returnInEthExpected[index]}`);
				assert.equal(parseFloat(returns).toFixed(2), returnInEthExpected[index].toFixed(2));
			}
		});
		it("3.Check User Recived The appropriate amount", async () => {
			accounts = [user1, user2, user3, user4, user5, user6, user7, user8, user9, user10];
			const totalReturnLotExpexted = [
				79.96203894,
				239.9768856,
				125.9500303,
				49.53088563,
				72.59378838,
				267.816835,
				0.135300109,
				0.7365180841,
				0.04295241557,
				0.8382656631,
			];
			const returnInEthExpected = [0, 0, 0, 0, 1.851161356, 5.141838644, 0.5994, 1.1988, 0.7992, 0.3996];

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
				diffToken = diffToken.toFixed(2);
				expectedInLot = totalReturnLotExpexted[accounts.indexOf(account)].toFixed(2);
				assert.equal(diffToken, expectedInLot);
				// commented by parv (as already added assert above)
				// console.log(`User ${accounts.indexOf(account) + 1}`);
				// console.log(`Returned in Eth : ${diff}  Expected : ${expectedInEth} `);
				// console.log(`Returned in Lot : ${diffToken}  Expected : ${expectedInLot} `);
			}
		});
		it("4. Market should have 0 balance after all claims", async () => {
			console.log("Market Balance after claim" + (await web3.eth.getBalance(marketInstance.address)) / 1);
			assert.equal(parseFloat(await web3.eth.getBalance(marketInstance.address)), 0, "Market Balance must be 0 after all claims");
		});
		it("5. Option price must be 0 after expire time", async () => {
			await marketInstance.setMockPriceFlag(false);
			let marketData = await marketInstance.getData();
			let optionPrice1 = parseFloat(marketData._optionPrice[0]);
			let optionPrice2 = parseFloat(marketData._optionPrice[1]);
			let optionPrice3 = parseFloat(marketData._optionPrice[2]);
			assert.equal(optionPrice1, 0);
			assert.equal(optionPrice2, 0);
			assert.equal(optionPrice3, 0);
		});
	});
});
