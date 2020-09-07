const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("MarketRegistry");
const Master = artifacts.require("Master");
const PlotusToken = artifacts.require("MockPLOT");
const MarketConfig = artifacts.require("MockConfig");
const MockUniswapRouter = artifacts.require("MockUniswapRouter");
// const MockchainLinkBTC = artifacts.require("MockChainLinkAggregator");
const TokenController = artifacts.require("MockTokenController");
const web3 = Market.web3;
const increaseTime = require("./utils/increaseTime.js").increaseTime;

describe("1. Players are incentivized to stake DAO tokens to earn a multiplier on their positions", () => {
	let predictionPointsBeforeUser1, predictionPointsBeforeUser2, predictionPointsBeforeUser3, predictionPointsBeforeUser4;
	contract("Market", async function([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]) {
		it("1.1 Position without locking PLOT tokens", async () => {
			let masterInstance = await OwnedUpgradeabilityProxy.deployed();
			masterInstance = await Master.at(masterInstance.address);
			let plotusToken = await PlotusToken.deployed();
			let tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
			let tokenController = await TokenController.at(tokenControllerAdd);
			let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			let plotusNewInstance = await Plotus.at(plotusNewAddress);
			const openMarkets = await plotusNewInstance.getOpenMarkets();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			// await marketInstance.setMockPriceFlag(false);
			await increaseTime(10001);
			assert.ok(marketInstance);
			await plotusToken.approve(tokenController.address, "10000000000000000000000");
			await plotusToken.transfer(user2, "2500000000000000000000");
			await plotusToken.transfer(user3, "2500000000000000000000");
			await plotusToken.transfer(user4, "2500000000000000000000");
			await plotusToken.transfer(user5, "2500000000000000000000");

			await marketInstance.setOptionPrice(1, 9);
			await marketInstance.setOptionPrice(2, 18);
			await marketInstance.setOptionPrice(3, 27);

			await plotusToken.approve(marketInstance.address, "10000000000000000000000");
			await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 2, 1, {
				from: user1,
			});
			await plotusToken.approve(marketInstance.address, "10000000000000000000000", { from: user2 });
			await marketInstance.placePrediction(plotusToken.address, "400000000000000000000", 2, 2, {
				from: user2,
			});
			await plotusToken.approve(marketInstance.address, "10000000000000000000000", { from: user3 });
			await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 1, 3, {
				from: user3,
			});
			await plotusToken.approve(marketInstance.address, "10000000000000000000000", { from: user4 });
			await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 3, 4, {
				from: user4,
			});
			await plotusToken.approve(marketInstance.address, "10000000000000000000000", { from: user5 });
			await marketInstance.placePrediction(plotusToken.address, "10000000000000000000", 3, 4, {
				from: user5,
			});
			predictionPointsBeforeUser1 = parseFloat(await marketInstance.userPredictionPoints(user1, 2)) / 1000;
			predictionPointsBeforeUser2 = parseFloat(await marketInstance.userPredictionPoints(user2, 2)) / 1000;
			predictionPointsBeforeUser3 = parseFloat(await marketInstance.userPredictionPoints(user3, 1)) / 1000;
			predictionPointsBeforeUser4 = parseFloat(await marketInstance.userPredictionPoints(user4, 3)) / 1000;
			predictionPointsBeforeUser5 = parseFloat(await marketInstance.userPredictionPoints(user5, 3)) / 1000;
			// console.log(
			// 	predictionPointsBeforeUser1,
			// 	predictionPointsBeforeUser2,
			// 	predictionPointsBeforeUser3,
			// 	predictionPointsBeforeUser4,
			// 	predictionPointsBeforeUser5
			// );
			assert.equal(predictionPointsBeforeUser1.toFixed(1), (55.5138941).toFixed(1));
			assert.equal(predictionPointsBeforeUser2.toFixed(1), (932.6334208).toFixed(1));
			assert.equal(predictionPointsBeforeUser3.toFixed(1), (366.391701).toFixed(1));
			assert.equal(predictionPointsBeforeUser4.toFixed(1), (170.2426086).toFixed(1));
			assert.equal(predictionPointsBeforeUser5.toFixed(1), (5.383543979).toFixed(1));
		});
	});
	contract("Market", async function([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]) {
		it("1.2 Positions After locking PLOT tokens", async () => {
			let masterInstance = await OwnedUpgradeabilityProxy.deployed();
			masterInstance = await Master.at(masterInstance.address);
			let plotusToken = await PlotusToken.deployed();
			let tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
			let tokenController = await TokenController.at(tokenControllerAdd);
			let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			let plotusNewInstance = await Plotus.at(plotusNewAddress);
			const openMarkets = await plotusNewInstance.getOpenMarkets();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			// await marketInstance.setMockPriceFlag(false);
			await increaseTime(10001);
			assert.ok(marketInstance);
			await plotusToken.approve(tokenController.address, "10000000000000000000000");
			await tokenController.lock("0x534d", "1100000000000000000000", 86400 * 30, { from: user1 });
			await plotusToken.transfer(user2, "2500000000000000000000");
			await tokenController.lock("0x534d", "1600000000000000000000", 86400 * 30, { from: user2 });
			await plotusToken.transfer(user3, "2500000000000000000000");
			await tokenController.lock("0x534d", "1100000000000000000000", 86400 * 30, { from: user3 });
			await plotusToken.transfer(user4, "2500000000000000000000");
			await tokenController.lock("0x534d", "1100000000000000000000", 86400 * 30, { from: user4 });
			await plotusToken.transfer(user5, "2500000000000000000000");
			await tokenController.lock("0x534d", "1100", 86400 * 30, { from: user5 });

			await marketInstance.setOptionPrice(1, 9);
			await marketInstance.setOptionPrice(2, 18);
			await marketInstance.setOptionPrice(3, 27);

			await plotusToken.approve(marketInstance.address, "10000000000000000000000");
			await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 2, 1, {
				from: user1,
			});
			await plotusToken.approve(marketInstance.address, "10000000000000000000000", { from: user2 });
			await marketInstance.placePrediction(plotusToken.address, "400000000000000000000", 2, 2, {
				from: user2,
			});
			await plotusToken.approve(marketInstance.address, "10000000000000000000000", { from: user3 });
			await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 1, 3, {
				from: user3,
			});
			await plotusToken.approve(marketInstance.address, "10000000000000000000000", { from: user4 });
			await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 3, 4, {
				from: user4,
			});
			await plotusToken.approve(marketInstance.address, "10000000000000000000000", { from: user5 });
			await marketInstance.placePrediction(plotusToken.address, "10000000000000000000", 3, 4, {
				from: user5,
			});
			let predictionPointsUser1 = parseFloat(await marketInstance.userPredictionPoints(user1, 2)) / 1000;
			let predictionPointsUser2 = parseFloat(await marketInstance.userPredictionPoints(user2, 2)) / 1000;
			let predictionPointsUser3 = parseFloat(await marketInstance.userPredictionPoints(user3, 1)) / 1000;
			let predictionPointsUser4 = parseFloat(await marketInstance.userPredictionPoints(user4, 3)) / 1000;
			let predictionPointsUser5 = parseFloat(await marketInstance.userPredictionPoints(user5, 3)) / 1000;

			// console.log(predictionPointsUser1, predictionPointsUser2, predictionPointsUser3, predictionPointsUser4, predictionPointsUser5);
			assert.equal(predictionPointsUser1.toFixed(1), (116.5791776).toFixed(1));
			assert.equal(predictionPointsUser2.toFixed(1), (1305.686789).toFixed(1));
			assert.equal(predictionPointsUser3.toFixed(1), (769.4225722).toFixed(1));
			assert.equal(predictionPointsUser4.toFixed(1), (357.509478).toFixed(1));
			assert.equal(predictionPointsUser5.toFixed(1), (5.383543979).toFixed(1));
		});
	});
});

describe("2. Place prediction with ETH and check multiplier ", () => {
	let predictionPointsUser1, predictionPointsUser1_2, predictionPointsUser2, predictionPointsUser3, predictionPointsUser4;
	contract("Market", async function([user1, user2, user3, user4, user5]) {
		let masterInstance,
			plotusToken,
			marketConfig,
			MockUniswapRouterInstance,
			tokenControllerAdd,
			tokenController,
			plotusNewAddress,
			plotusNewInstance;
		before(async () => {
			masterInstance = await OwnedUpgradeabilityProxy.deployed();
			masterInstance = await Master.at(masterInstance.address);
			plotusToken = await PlotusToken.deployed();
			tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
			tokenController = await TokenController.at(tokenControllerAdd);
			plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			MockUniswapRouterInstance = await MockUniswapRouter.deployed();
			plotusNewInstance = await Plotus.at(plotusNewAddress);
			marketConfig = await plotusNewInstance.marketUtility();
			marketConfig = await MarketConfig.at(marketConfig);

			openMarkets = await plotusNewInstance.getOpenMarkets();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			assert.ok(marketInstance);
			await increaseTime(10001);

			await MockUniswapRouterInstance.setPrice("1000000000000000");
			await marketConfig.setPrice("1000000000000000");

			await marketInstance.setOptionPrice(1, 9);
			await marketInstance.setOptionPrice(2, 18);
			await marketInstance.setOptionPrice(3, 27);
		});

		it("2.1", async () => {
			await plotusToken.transfer(user2, web3.utils.toWei("1000"));
			await plotusToken.transfer(user3, web3.utils.toWei("10000"));
			await plotusToken.transfer(user4, web3.utils.toWei("20000"));

			await marketInstance.setOptionPrice(1, 9);
			await marketInstance.setOptionPrice(2, 18);
			await marketInstance.setOptionPrice(3, 27);

			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("10"), 1, 4, {
				from: user1,
				value: web3.utils.toWei("10"),
			});
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("10"), 2, 4, {
				from: user1,
				value: web3.utils.toWei("10"),
			});
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("10"), 2, 5, {
				from: user2,
				value: web3.utils.toWei("10"),
			});
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("10"), 3, 5, {
				from: user3,
				value: web3.utils.toWei("10"),
			});
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("10"), 1, 5, {
				from: user4,
				value: web3.utils.toWei("10"),
			});
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("0.2"), 2, 2, {
				from: user5,
				value: web3.utils.toWei("0.2"),
			});

			predictionPointsUser1 = parseFloat(await marketInstance.userPredictionPoints(user1, 1)) / 1000;
			predictionPointsUser1_2 = parseFloat(await marketInstance.userPredictionPoints(user1, 2)) / 1000;
			predictionPointsUser2 = parseFloat(await marketInstance.userPredictionPoints(user2, 2)) / 1000;
			predictionPointsUser3 = parseFloat(await marketInstance.userPredictionPoints(user3, 3)) / 1000;
			predictionPointsUser4 = parseFloat(await marketInstance.userPredictionPoints(user4, 1)) / 1000;
			predictionPointsUser5 = parseFloat(await marketInstance.userPredictionPoints(user5, 2)) / 1000;
			// console.log(
			// 	predictionPointsUser1,
			// 	predictionPointsUser1_2,
			// 	predictionPointsUser2,
			// 	predictionPointsUser3,
			// 	predictionPointsUser4,
			// 	predictionPointsUser5
			// );

			assert.equal(Math.floor(predictionPointsUser1), Math.floor(16138.51442));
			assert.equal(Math.floor(predictionPointsUser1_2), Math.floor(8069.257209));
			assert.equal(Math.floor(predictionPointsUser2), Math.floor(10525.1181));
			assert.equal(Math.floor(predictionPointsUser3), Math.floor(7016.745399));
			assert.equal(Math.floor(predictionPointsUser4), Math.floor(21050.2362));
			assert.equal(Math.floor(predictionPointsUser5), Math.floor(10.41933533));
		});
	});
	contract("Market", async function([user1, user2, user3, user4, user5]) {
		let masterInstance,
			plotusToken,
			marketConfig,
			MockUniswapRouterInstance,
			tokenControllerAdd,
			tokenController,
			plotusNewAddress,
			plotusNewInstance;
		before(async () => {
			masterInstance = await OwnedUpgradeabilityProxy.deployed();
			masterInstance = await Master.at(masterInstance.address);
			plotusToken = await PlotusToken.deployed();
			tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
			tokenController = await TokenController.at(tokenControllerAdd);
			plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			MockUniswapRouterInstance = await MockUniswapRouter.deployed();
			plotusNewInstance = await Plotus.at(plotusNewAddress);
			marketConfig = await plotusNewInstance.marketUtility();
			marketConfig = await MarketConfig.at(marketConfig);

			openMarkets = await plotusNewInstance.getOpenMarkets();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			assert.ok(marketInstance);
			await increaseTime(10001);

			await MockUniswapRouterInstance.setPrice("1000000000000000");
			await marketConfig.setPrice("1000000000000000");

			await marketInstance.setOptionPrice(1, 9);
			await marketInstance.setOptionPrice(2, 18);
			await marketInstance.setOptionPrice(3, 27);
		});
		it("2.2", async () => {
			await tokenController.lock("0x534d", web3.utils.toWei("110000"), 86400 * 30, { from: user1 });

			await plotusToken.transfer(user2, web3.utils.toWei("1000"));
			await tokenController.lock("0x534d", web3.utils.toWei("1000"), 86400 * 30, { from: user2 });

			await plotusToken.transfer(user3, web3.utils.toWei("100000"));
			await tokenController.lock("0x534d", web3.utils.toWei("100000"), 86400 * 30, { from: user3 });

			await plotusToken.transfer(user4, web3.utils.toWei("200000"));
			await tokenController.lock("0x534d", web3.utils.toWei("200000"), 86400 * 30, { from: user4 });

			await plotusToken.transfer(user5, web3.utils.toWei("11000"));
			await tokenController.lock("0x534d", web3.utils.toWei("11000"), 86400 * 30, { from: user5 });

			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("10"), 1, 4, {
				from: user1,
				value: web3.utils.toWei("10"),
			});
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("10"), 2, 4, {
				from: user1,
				value: web3.utils.toWei("10"),
			});
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("10"), 2, 5, {
				from: user2,
				value: web3.utils.toWei("10"),
			});
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("10"), 3, 5, {
				from: user3,
				value: web3.utils.toWei("10"),
			});
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("10"), 1, 5, {
				from: user4,
				value: web3.utils.toWei("10"),
			});
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("0.2"), 2, 2, {
				from: user5,
				value: web3.utils.toWei("0.2"),
			});

			let predictionPointsWithLockUser1 = parseFloat(await marketInstance.userPredictionPoints(user1, 1)) / 1000;
			let predictionPointsWithLockUser1_2 = parseFloat(await marketInstance.userPredictionPoints(user1, 2)) / 1000;
			let predictionPointsWithLockUser2 = parseFloat(await marketInstance.userPredictionPoints(user2, 2)) / 1000;
			let predictionPointsWithLockUser3 = parseFloat(await marketInstance.userPredictionPoints(user3, 3)) / 1000;
			let predictionPointsWithLockUser4 = parseFloat(await marketInstance.userPredictionPoints(user4, 1)) / 1000;
			let predictionPointsWithLockUser5 = parseFloat(await marketInstance.userPredictionPoints(user5, 2)) / 1000;

			// console.log(
			// 	predictionPointsWithLockUser1,
			// 	predictionPointsWithLockUser1_2,
			// 	predictionPointsWithLockUser2,
			// 	predictionPointsWithLockUser3,
			// 	predictionPointsWithLockUser4,
			// 	predictionPointsWithLockUser5
			// );

			assert.equal(Math.floor(predictionPointsWithLockUser1), Math.floor(33890.88028));
			assert.equal(Math.floor(predictionPointsWithLockUser1_2), Math.floor(8069.257209));
			assert.equal(Math.floor(predictionPointsWithLockUser2), Math.floor(10525.1181));
			assert.equal(Math.floor(predictionPointsWithLockUser3), Math.floor(14033.4908));
			assert.equal(Math.floor(predictionPointsWithLockUser4), Math.floor(63150.70859));
			assert.equal(Math.floor(predictionPointsWithLockUser5), Math.floor(10.41933533));
		});
	});
});

describe("3. Multiple Option bets", () => {
	contract("Market", async function([user1, user2, user3]) {
		let masterInstance, plotusToken, tokenControllerAdd, tokenController, plotusNewAddress, plotusNewInstance;
		before(async () => {
			masterInstance = await OwnedUpgradeabilityProxy.deployed();
			masterInstance = await Master.at(masterInstance.address);
			plotusToken = await PlotusToken.deployed();
			tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
			tokenController = await TokenController.at(tokenControllerAdd);
			plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			plotusNewInstance = await Plotus.at(plotusNewAddress);
			openMarkets = await plotusNewInstance.getOpenMarkets();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			assert.ok(marketInstance);
			await increaseTime(10001);
			// Transfer Tokens
			await plotusToken.transfer(user2, web3.utils.toWei("5000"));
			await plotusToken.transfer(user3, web3.utils.toWei("5000"));

			await marketInstance.setOptionPrice(1, 9);
			await marketInstance.setOptionPrice(2, 18);
			await marketInstance.setOptionPrice(3, 27);

			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"));
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user2 });
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user3 });
		});

		it("3.1. Scenario 1 ", async () => {
			const oldPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));

			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("100"), 1, 1, { from: user1 });
			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("400"), 1, 2, { from: user1 });
			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("400"), 1, 2, { from: user2 });
			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("400"), 2, 2, { from: user3 });

			const predictionPointsUser1 = parseFloat(await marketInstance.userPredictionPoints(user1, 1));
			const predictionPointsUser2 = parseFloat(await marketInstance.userPredictionPoints(user2, 1));
			const predictionPointsUser3 = parseFloat(await marketInstance.userPredictionPoints(user3, 2));

			await increaseTime(36001);
			await marketInstance.calculatePredictionResult(1);
			await increaseTime(36001);

			let returnUser1 = parseFloat((await marketInstance.getReturn(user1))[0][0]);
			let returnUser2 = parseFloat((await marketInstance.getReturn(user2))[0][0]);
			let returnUser3 = parseFloat((await marketInstance.getReturn(user3))[0][0]);
			returnUser1 = web3.utils.fromWei(returnUser1.toString());
			returnUser2 = web3.utils.fromWei(returnUser2.toString());
			returnUser3 = web3.utils.fromWei(returnUser3.toString());

			assert.equal((predictionPointsUser1 / 10000).toFixed(1), (197.629).toFixed(1));
			assert.equal((predictionPointsUser2 / 10000).toFixed(1), (186.5266842).toFixed(1));
			assert.equal((predictionPointsUser3 / 10000).toFixed(1), (93.26334208).toFixed(1));
			assert.equal(parseFloat(returnUser1).toFixed(3), (580.375563).toFixed(3));
			assert.equal(parseFloat(returnUser2).toFixed(3), (475.896037).toFixed(3));
			assert.equal(parseFloat(returnUser3).toFixed(3), (239.88).toFixed(3));

			const newPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));
			assert.equal((newPlotusTokenBalance - oldPlotusTokenBalance).toFixed(4), "3.1984");
		});
	});
	contract("Market", async function([user1, user2, user3]) {
		let masterInstance, plotusToken, tokenControllerAdd, tokenController, plotusNewAddress, plotusNewInstance;
		before(async () => {
			masterInstance = await OwnedUpgradeabilityProxy.deployed();
			masterInstance = await Master.at(masterInstance.address);
			plotusToken = await PlotusToken.deployed();
			tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
			tokenController = await TokenController.at(tokenControllerAdd);
			plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			plotusNewInstance = await Plotus.at(plotusNewAddress);
			openMarkets = await plotusNewInstance.getOpenMarkets();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			assert.ok(marketInstance);
			await increaseTime(10001);
			// Transfer Tokens
			await plotusToken.transfer(user2, web3.utils.toWei("5000"));
			await plotusToken.transfer(user3, web3.utils.toWei("5000"));

			await marketInstance.setOptionPrice(1, 9);
			await marketInstance.setOptionPrice(2, 18);
			await marketInstance.setOptionPrice(3, 27);

			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"));
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user2 });
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user3 });
		});

		it("3.2. Scenario 2", async () => {
			const oldPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));

			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("100"), 2, 1, { from: user1 });
			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("400"), 2, 2, { from: user1 });
			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("400"), 1, 2, { from: user2 });
			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("400"), 2, 2, { from: user3 });

			const predictionPointsUser1 = parseFloat(await marketInstance.userPredictionPoints(user1, 2));
			const predictionPointsUser2 = parseFloat(await marketInstance.userPredictionPoints(user2, 1));
			const predictionPointsUser3 = parseFloat(await marketInstance.userPredictionPoints(user3, 2));

			await increaseTime(36001);
			await marketInstance.calculatePredictionResult(1);
			await increaseTime(36001);

			let returnUser1 = parseFloat((await marketInstance.getReturn(user1))[0][0]);
			let returnUser2 = parseFloat((await marketInstance.getReturn(user2))[0][0]);
			let returnUser3 = parseFloat((await marketInstance.getReturn(user3))[0][0]);
			returnUser1 = web3.utils.fromWei(returnUser1.toString());
			returnUser2 = web3.utils.fromWei(returnUser2.toString());
			returnUser3 = web3.utils.fromWei(returnUser3.toString());

			assert.equal((predictionPointsUser1 / 10000).toFixed(1), (98.8147).toFixed(1));
			assert.equal((predictionPointsUser2 / 10000).toFixed(1), (186.5266842).toFixed(1));
			assert.equal((predictionPointsUser3 / 10000).toFixed(1), (93.26334208).toFixed(1));
			assert.equal(parseFloat(returnUser1).toFixed(3), (319.84).toFixed(3));
			assert.equal(parseFloat(returnUser2).toFixed(3), (732.8334).toFixed(3));
			assert.equal(parseFloat(returnUser3).toFixed(3), (239.88).toFixed(3));

			const newPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));
			assert.equal((newPlotusTokenBalance - oldPlotusTokenBalance).toFixed(4), "6.7966");
		});
	});
	contract("Market", async function([user1, user2, user3]) {
		let masterInstance, plotusToken, tokenControllerAdd, tokenController, plotusNewAddress, plotusNewInstance;
		before(async () => {
			masterInstance = await OwnedUpgradeabilityProxy.deployed();
			masterInstance = await Master.at(masterInstance.address);
			plotusToken = await PlotusToken.deployed();
			tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
			tokenController = await TokenController.at(tokenControllerAdd);
			plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			plotusNewInstance = await Plotus.at(plotusNewAddress);
			openMarkets = await plotusNewInstance.getOpenMarkets();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			assert.ok(marketInstance);
			await increaseTime(10001);
			// Transfer Tokens
			await plotusToken.transfer(user2, web3.utils.toWei("5000"));
			await plotusToken.transfer(user3, web3.utils.toWei("5000"));

			await marketInstance.setOptionPrice(1, 9);
			await marketInstance.setOptionPrice(2, 18);
			await marketInstance.setOptionPrice(3, 27);

			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"));
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user2 });
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user3 });
		});

		it("3.3. Scenario 3 ", async () => {
			const oldPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));
			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("100"), 1, 1, { from: user1 });
			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("400"), 2, 2, { from: user1 });
			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("400"), 1, 2, { from: user2 });
			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("400"), 2, 2, { from: user3 });

			const predictionPointsUser1 = parseFloat(await marketInstance.userPredictionPoints(user1, 1));
			const predictionPointsUser1_2 = parseFloat(await marketInstance.userPredictionPoints(user1, 2));
			const predictionPointsUser2 = parseFloat(await marketInstance.userPredictionPoints(user2, 1));
			const predictionPointsUser3 = parseFloat(await marketInstance.userPredictionPoints(user3, 2));

			await increaseTime(36001);
			await marketInstance.calculatePredictionResult(1);
			await increaseTime(36001);

			let returnUser1 = parseFloat((await marketInstance.getReturn(user1))[0][0]);
			let returnUser2 = parseFloat((await marketInstance.getReturn(user2))[0][0]);
			let returnUser3 = parseFloat((await marketInstance.getReturn(user3))[0][0]);
			returnUser1 = web3.utils.fromWei(returnUser1.toString());
			returnUser2 = web3.utils.fromWei(returnUser2.toString());
			returnUser3 = web3.utils.fromWei(returnUser3.toString());

			assert.equal((predictionPointsUser1 / 10000).toFixed(1), (11.10277882).toFixed(1));
			assert.equal((predictionPointsUser1_2 / 10000).toFixed(1), (93.26334208).toFixed(1));
			assert.equal((predictionPointsUser2 / 10000).toFixed(1), (186.5266842).toFixed(1));
			assert.equal((predictionPointsUser3 / 10000).toFixed(1), (93.26334208).toFixed(1));
			assert.equal(parseFloat(returnUser1).toFixed(2), (357.4391685).toFixed(2));
			assert.equal(parseFloat(returnUser2).toFixed(2), (695.6340315).toFixed(2));
			assert.equal(parseFloat(returnUser3).toFixed(2), (239.88).toFixed(2));

			const newPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));
			assert.equal((newPlotusTokenBalance - oldPlotusTokenBalance).toFixed(4), "6.3968");
		});
	});
	contract("Market", async function([user1, user2, user3]) {
		let masterInstance, plotusToken, tokenControllerAdd, tokenController, plotusNewAddress, plotusNewInstance;
		before(async () => {
			masterInstance = await OwnedUpgradeabilityProxy.deployed();
			masterInstance = await Master.at(masterInstance.address);
			plotusToken = await PlotusToken.deployed();
			tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
			tokenController = await TokenController.at(tokenControllerAdd);
			plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			plotusNewInstance = await Plotus.at(plotusNewAddress);
			openMarkets = await plotusNewInstance.getOpenMarkets();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			assert.ok(marketInstance);
			await increaseTime(10001);
			// Transfer Tokens
			await plotusToken.transfer(user2, web3.utils.toWei("5000"));
			await plotusToken.transfer(user3, web3.utils.toWei("5000"));

			await marketInstance.setOptionPrice(1, 9);
			await marketInstance.setOptionPrice(2, 18);
			await marketInstance.setOptionPrice(3, 27);

			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"));
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user2 });
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user3 });
		});

		it("3.4. Scenario 4", async () => {
			const oldPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));
			const oldPlotusETHBalance = parseFloat(await web3.eth.getBalance(plotusNewInstance.address));
			assert.equal(oldPlotusETHBalance, 0);

			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("4"), 1, 1, {
				from: user1,
				value: web3.utils.toWei("4"),
			});
			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("400"), 1, 2, { from: user1 });
			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("400"), 3, 2, { from: user2 });
			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("400"), 2, 2, { from: user3 });

			const predictionPointsUser1 = parseFloat(await marketInstance.userPredictionPoints(user1, 1));
			const predictionPointsUser2 = parseFloat(await marketInstance.userPredictionPoints(user2, 3));
			const predictionPointsUser3 = parseFloat(await marketInstance.userPredictionPoints(user3, 2));

			assert.equal((predictionPointsUser1 / 10000).toFixed(1), (275.2822731).toFixed(1));
			assert.equal((predictionPointsUser2 / 10000).toFixed(1), (62.17556139).toFixed(1));
			assert.equal((predictionPointsUser3 / 10000).toFixed(1), (93.26334208).toFixed(1));

			let oldOwnerBalance1 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user1)).toString()));
			let oldOwnerBalance2 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user2)).toString()));
			let oldOwnerBalance3 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user3)).toString()));

			await increaseTime(360001);
			await marketInstance.calculatePredictionResult(1);
			await increaseTime(360001);
			await marketInstance.exchangeCommission();
			await marketInstance.claimReturn(user1);
			await marketInstance.claimReturn(user2);
			await marketInstance.claimReturn(user3);

			let newOwnerBalance1 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user1)).toString()));
			let newOwnerBalance2 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user2)).toString()));
			let newOwnerBalance3 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user3)).toString()));

			assert.equal((newOwnerBalance1 - oldOwnerBalance1).toFixed(2), (713.3710239).toFixed(2));
			assert.equal((newOwnerBalance2 - oldOwnerBalance2).toFixed(2), (239.9088704).toFixed(2));
			assert.equal((newOwnerBalance3 - oldOwnerBalance3).toFixed(2), (239.9233057).toFixed(2));

			let returnTokenIncentiveUser1 = parseFloat(web3.utils.fromWei((await marketInstance.getReturn(user1)).incentive[0].toString()));
			let returnTokenIncentiveUser2 = parseFloat(web3.utils.fromWei((await marketInstance.getReturn(user2)).incentive[0].toString()));
			let returnTokenIncentiveUser3 = parseFloat(web3.utils.fromWei((await marketInstance.getReturn(user3)).incentive[0].toString()));

			let returnTokenUser1 = parseFloat((await marketInstance.getReturn(user1))[0][0]);
			let returnTokenUser2 = parseFloat((await marketInstance.getReturn(user2))[0][0]);
			let returnTokenUser3 = parseFloat((await marketInstance.getReturn(user3))[0][0]);
			let returnETHUser1 = parseFloat((await marketInstance.getReturn(user1))[0][1]);
			let returnETHUser2 = parseFloat((await marketInstance.getReturn(user2))[0][1]);
			let returnETHUser3 = parseFloat((await marketInstance.getReturn(user3))[0][1]);
			returnTokenUser1 = web3.utils.fromWei(returnTokenUser1.toString());
			returnTokenUser2 = web3.utils.fromWei(returnTokenUser2.toString());
			returnTokenUser3 = web3.utils.fromWei(returnTokenUser3.toString());
			returnETHUser1 = web3.utils.fromWei(returnETHUser1.toString());
			returnETHUser2 = web3.utils.fromWei(returnETHUser2.toString());
			returnETHUser3 = web3.utils.fromWei(returnETHUser3.toString());

			assert.equal((parseFloat(returnTokenUser1) + returnTokenIncentiveUser1).toFixed(2), (713.3710239).toFixed(2));
			assert.equal((parseFloat(returnTokenUser2) + returnTokenIncentiveUser2).toFixed(2), (239.9088704).toFixed(2));
			assert.equal((parseFloat(returnTokenUser3) + returnTokenIncentiveUser3).toFixed(2), (239.9233057).toFixed(2));
			assert.equal(parseFloat(returnETHUser1).toFixed(2), (3.996).toFixed(2));
			assert.equal(parseFloat(returnETHUser2).toFixed(2), (0).toFixed(2));
			assert.equal(parseFloat(returnETHUser3).toFixed(2), (0).toFixed(2));

			
			const newPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));
			const newPlotusETHBalance = parseFloat(web3.utils.fromWei(await web3.eth.getBalance(plotusNewInstance.address)));
			assert.equal((newPlotusTokenBalance - oldPlotusTokenBalance).toFixed(4), "6.3968");
			assert.equal(newPlotusETHBalance, 0.002);
		});
	});
	contract("Market", async function([user1, user2, user3]) {
		let masterInstance, plotusToken, tokenControllerAdd, tokenController, plotusNewAddress, plotusNewInstance;
		before(async () => {
			masterInstance = await OwnedUpgradeabilityProxy.deployed();
			masterInstance = await Master.at(masterInstance.address);
			plotusToken = await PlotusToken.deployed();
			tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
			tokenController = await TokenController.at(tokenControllerAdd);
			plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			plotusNewInstance = await Plotus.at(plotusNewAddress);
			openMarkets = await plotusNewInstance.getOpenMarkets();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			assert.ok(marketInstance);
			await increaseTime(10001);
			// Transfer Tokens
			await plotusToken.transfer(user2, web3.utils.toWei("5000"));
			await plotusToken.transfer(user3, web3.utils.toWei("5000"));

			await marketInstance.setOptionPrice(1, 9);
			await marketInstance.setOptionPrice(2, 18);
			await marketInstance.setOptionPrice(3, 27);

			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"));
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user2 });
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user3 });
		});

		it("3.5. Scenario 5", async () => {
			const oldPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));

			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("100"), 2, 1, { from: user1 });
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("4"), 2, 2, {
				from: user1,
				value: web3.utils.toWei("4"),
			});
			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("400"), 3, 2, { from: user2 });
			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("400"), 1, 2, { from: user3 });

			const predictionPointsUser1 = parseFloat(await marketInstance.userPredictionPoints(user1, 2));
			const predictionPointsUser2 = parseFloat(await marketInstance.userPredictionPoints(user2, 3));
			const predictionPointsUser3 = parseFloat(await marketInstance.userPredictionPoints(user3, 1));

			assert.equal((predictionPointsUser1 / 10000).toFixed(1), (98.74475775).toFixed(1));
			assert.equal((predictionPointsUser2 / 10000).toFixed(1), (62.17556139).toFixed(1));
			assert.equal((predictionPointsUser3 / 10000).toFixed(1), (186.5266842).toFixed(1));

			let oldOwnerBalance1 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user1)).toString()));
			let oldOwnerBalance2 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user2)).toString()));
			let oldOwnerBalance3 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user3)).toString()));

			await increaseTime(360001);
			await marketInstance.calculatePredictionResult(1);
			await increaseTime(360001);
			await marketInstance.exchangeCommission();
			await marketInstance.claimReturn(user1);
			await marketInstance.claimReturn(user2);
			await marketInstance.claimReturn(user3);

			let newOwnerBalance1 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user1)).toString()));
			let newOwnerBalance2 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user2)).toString()));
			let newOwnerBalance3 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user3)).toString()));

			assert.equal((newOwnerBalance1 - oldOwnerBalance1).toFixed(2), (80.01684018).toFixed(2));
			assert.equal((newOwnerBalance2 - oldOwnerBalance2).toFixed(2), (239.91579).toFixed(2));
			assert.equal((newOwnerBalance3 - oldOwnerBalance3).toFixed(2), (576.2191699).toFixed(2));

			let returnTokenIncentiveUser1 = parseFloat(web3.utils.fromWei((await marketInstance.getReturn(user1)).incentive[0].toString()));
			let returnTokenIncentiveUser2 = parseFloat(web3.utils.fromWei((await marketInstance.getReturn(user2)).incentive[0].toString()));
			let returnTokenIncentiveUser3 = parseFloat(web3.utils.fromWei((await marketInstance.getReturn(user3)).incentive[0].toString()));

			let returnTokenUser1 = parseFloat((await marketInstance.getReturn(user1))[0][0]);
			let returnTokenUser2 = parseFloat((await marketInstance.getReturn(user2))[0][0]);
			let returnTokenUser3 = parseFloat((await marketInstance.getReturn(user3))[0][0]);
			let returnETHUser1 = parseFloat((await marketInstance.getReturn(user1))[0][1]);
			let returnETHUser2 = parseFloat((await marketInstance.getReturn(user2))[0][1]);
			let returnETHUser3 = parseFloat((await marketInstance.getReturn(user3))[0][1]);
			returnTokenUser1 = web3.utils.fromWei(returnTokenUser1.toString());
			returnTokenUser2 = web3.utils.fromWei(returnTokenUser2.toString());
			returnTokenUser3 = web3.utils.fromWei(returnTokenUser3.toString());
			returnETHUser1 = web3.utils.fromWei(returnETHUser1.toString());
			returnETHUser2 = web3.utils.fromWei(returnETHUser2.toString());
			returnETHUser3 = web3.utils.fromWei(returnETHUser3.toString());

			assert.equal((parseFloat(returnTokenUser1) + returnTokenIncentiveUser1).toFixed(2), (80.01684018).toFixed(2));
			assert.equal((parseFloat(returnTokenUser2) + returnTokenIncentiveUser2).toFixed(2), (239.91579).toFixed(2));
			assert.equal((parseFloat(returnTokenUser3) + returnTokenIncentiveUser3).toFixed(2), (576.2191699).toFixed(2));
			assert.equal(parseFloat(returnETHUser1).toFixed(2), (2.3976).toFixed(2));
			assert.equal(parseFloat(returnETHUser2).toFixed(2), (0).toFixed(2));
			assert.equal(parseFloat(returnETHUser3).toFixed(2), (1.566432).toFixed(2));

			const newPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));
			const newPlotusETHBalance = parseFloat(web3.utils.fromWei(await web3.eth.getBalance(plotusNewInstance.address)));

			assert.equal((newPlotusTokenBalance - oldPlotusTokenBalance).toFixed(4), "3.5982");
			assert.equal(newPlotusETHBalance, 0.033968);
		});
	});
	contract("Market", async function([user1, user2, user3]) {
		let masterInstance, plotusToken, tokenControllerAdd, tokenController, plotusNewAddress, plotusNewInstance;
		before(async () => {
			masterInstance = await OwnedUpgradeabilityProxy.deployed();
			masterInstance = await Master.at(masterInstance.address);
			plotusToken = await PlotusToken.deployed();
			tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
			tokenController = await TokenController.at(tokenControllerAdd);
			plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			plotusNewInstance = await Plotus.at(plotusNewAddress);
			openMarkets = await plotusNewInstance.getOpenMarkets();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			assert.ok(marketInstance);
			await increaseTime(10001);
			// Transfer Tokens
			await plotusToken.transfer(user2, web3.utils.toWei("5000"));
			await plotusToken.transfer(user3, web3.utils.toWei("5000"));

			await marketInstance.setOptionPrice(1, 9);
			await marketInstance.setOptionPrice(2, 18);
			await marketInstance.setOptionPrice(3, 27);

			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"));
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user2 });
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user3 });
		});

		it("3.6. Scenario 6", async () => {
			const oldPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));

			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("100"), 1, 1, { from: user1 });
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("4"), 2, 2, {
				from: user1,
				value: web3.utils.toWei("4"),
			});
			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("400"), 3, 2, { from: user2 });
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("4"), 1, 2, {
				from: user3,
				value: web3.utils.toWei("4"),
			});

			const predictionPointsUser1 = parseFloat(await marketInstance.userPredictionPoints(user1, 1));
			const predictionPointsUser1_2 = parseFloat(await marketInstance.userPredictionPoints(user1, 2));
			const predictionPointsUser2 = parseFloat(await marketInstance.userPredictionPoints(user2, 3));
			const predictionPointsUser3 = parseFloat(await marketInstance.userPredictionPoints(user3, 1));

			assert.equal((predictionPointsUser1 / 10000).toFixed(1), (11.10277882).toFixed(1));
			assert.equal((predictionPointsUser1_2 / 10000).toFixed(1), (93.19336834).toFixed(1));
			assert.equal((predictionPointsUser2 / 10000).toFixed(1), (62.17556139).toFixed(1));
			assert.equal((predictionPointsUser3 / 10000).toFixed(1), (186.3867367).toFixed(1));

			let oldOwnerBalance1 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user1)).toString()));
			let oldOwnerBalance2 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user2)).toString()));
			let oldOwnerBalance3 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user3)).toString()));

			await increaseTime(360001);
			await marketInstance.calculatePredictionResult(1);
			await increaseTime(360001);

			await marketInstance.exchangeCommission();
			await marketInstance.claimReturn(user1);
			await marketInstance.claimReturn(user2);
			await marketInstance.claimReturn(user3);

			let newOwnerBalance1 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user1)).toString()));
			let newOwnerBalance2 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user2)).toString()));
			let newOwnerBalance3 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user3)).toString()));

			assert.equal((newOwnerBalance1 - oldOwnerBalance1).toFixed(2), (108.8790535).toFixed(2));
			assert.equal((newOwnerBalance2 - oldOwnerBalance2).toFixed(2), (239.9504822).toFixed(2));
			assert.equal((newOwnerBalance3 - oldOwnerBalance3).toFixed(2), (148.1220643).toFixed(2));

			let returnTokenIncentiveUser1 = parseFloat(web3.utils.fromWei((await marketInstance.getReturn(user1)).incentive[0].toString()));
			let returnTokenIncentiveUser2 = parseFloat(web3.utils.fromWei((await marketInstance.getReturn(user2)).incentive[0].toString()));
			let returnTokenIncentiveUser3 = parseFloat(web3.utils.fromWei((await marketInstance.getReturn(user3)).incentive[0].toString()));

			let returnTokenUser1 = parseFloat((await marketInstance.getReturn(user1))[0][0]);
			let returnTokenUser2 = parseFloat((await marketInstance.getReturn(user2))[0][0]);
			let returnTokenUser3 = parseFloat((await marketInstance.getReturn(user3))[0][0]);
			let returnETHUser1 = parseFloat((await marketInstance.getReturn(user1))[0][1]);
			let returnETHUser2 = parseFloat((await marketInstance.getReturn(user2))[0][1]);
			let returnETHUser3 = parseFloat((await marketInstance.getReturn(user3))[0][1]);
			returnTokenUser1 = web3.utils.fromWei(returnTokenUser1.toString());
			returnTokenUser2 = web3.utils.fromWei(returnTokenUser2.toString());
			returnTokenUser3 = web3.utils.fromWei(returnTokenUser3.toString());
			returnETHUser1 = web3.utils.fromWei(returnETHUser1.toString());
			returnETHUser2 = web3.utils.fromWei(returnETHUser2.toString());
			returnETHUser3 = web3.utils.fromWei(returnETHUser3.toString());

			assert.equal((parseFloat(returnTokenUser1) + returnTokenIncentiveUser1).toFixed(2), (108.8790535).toFixed(2));
			assert.equal((parseFloat(returnTokenUser2) + returnTokenIncentiveUser2).toFixed(2), (239.9504822).toFixed(2));
			assert.equal((parseFloat(returnTokenUser3) + returnTokenIncentiveUser3).toFixed(2), (148.1220643).toFixed(2));
			assert.equal(parseFloat(returnETHUser1).toFixed(2), (2.485664159).toFixed(2));
			assert.equal(parseFloat(returnETHUser2).toFixed(2), (0).toFixed(2));
			assert.equal(parseFloat(returnETHUser3).toFixed(2), (5.474367841).toFixed(2));

			const newPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));
			const newPlotusETHBalance = parseFloat(web3.utils.fromWei(await web3.eth.getBalance(plotusNewInstance.address)));

			assert.equal((newPlotusTokenBalance - oldPlotusTokenBalance).toFixed(4), "3.1984");
			assert.equal(newPlotusETHBalance, 0.035968);
		});
	});
});

describe("4. Option 2 for winning", () => {
	contract("Market", async function([user1, user2, user3]) {
		let masterInstance, plotusToken, tokenControllerAdd, tokenController, plotusNewAddress, plotusNewInstance;
		before(async () => {
			masterInstance = await OwnedUpgradeabilityProxy.deployed();
			masterInstance = await Master.at(masterInstance.address);
			plotusToken = await PlotusToken.deployed();
			tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
			tokenController = await TokenController.at(tokenControllerAdd);
			plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			plotusNewInstance = await Plotus.at(plotusNewAddress);
			openMarkets = await plotusNewInstance.getOpenMarkets();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			assert.ok(marketInstance);
			await increaseTime(10001);
			// Transfer Tokens
			await plotusToken.transfer(user2, web3.utils.toWei("5000"));
			await plotusToken.transfer(user3, web3.utils.toWei("5000"));

			await marketInstance.setOptionPrice(1, 9);
			await marketInstance.setOptionPrice(2, 18);
			await marketInstance.setOptionPrice(3, 27);

			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"));
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user2 });
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user3 });
		});

		it("4.1. Scenario 7", async () => {
			const oldPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));

			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("100"), 1, 1, { from: user1 });
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("4"), 2, 2, {
				from: user1,
				value: web3.utils.toWei("4"),
			});
			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("400"), 3, 2, { from: user2 });
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("4"), 1, 2, {
				from: user3,
				value: web3.utils.toWei("4"),
			});

			const predictionPointsUser1 = parseFloat(await marketInstance.userPredictionPoints(user1, 1));
			const predictionPointsUser1_2 = parseFloat(await marketInstance.userPredictionPoints(user1, 2));
			const predictionPointsUser2 = parseFloat(await marketInstance.userPredictionPoints(user2, 3));
			const predictionPointsUser3 = parseFloat(await marketInstance.userPredictionPoints(user3, 1));

			assert.equal((predictionPointsUser1 / 10000).toFixed(1), (11.10277882).toFixed(1));
			assert.equal((predictionPointsUser1_2 / 10000).toFixed(1), (93.19336834).toFixed(1));
			assert.equal((predictionPointsUser2 / 10000).toFixed(1), (62.17556139).toFixed(1));
			assert.equal((predictionPointsUser3 / 10000).toFixed(1), (186.3867367).toFixed(1));

			let oldOwnerBalance1 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user1)).toString()));
			let oldOwnerBalance2 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user2)).toString()));
			let oldOwnerBalance3 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user3)).toString()));

			await increaseTime(360001);
			const marketData = await marketInstance.getData();
			const minValueOption2 = parseFloat(marketData[1][1]);
			const maxValueOption2 = parseFloat(marketData[2][1]);
			const optionValue = (minValueOption2 + maxValueOption2) / 2;
			await marketInstance.calculatePredictionResult(optionValue);
			await increaseTime(360001);

			await marketInstance.exchangeCommission();
			await marketInstance.claimReturn(user1);
			await marketInstance.claimReturn(user2);
			await marketInstance.claimReturn(user3);

			let newOwnerBalance1 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user1)).toString()));
			let newOwnerBalance2 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user2)).toString()));
			let newOwnerBalance3 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user3)).toString()));

			assert.equal((newOwnerBalance1 - oldOwnerBalance1).toFixed(2), (256.39003).toFixed(2));
			assert.equal((newOwnerBalance2 - oldOwnerBalance2).toFixed(2), (239.9504822).toFixed(2));
			assert.equal((newOwnerBalance3 - oldOwnerBalance3).toFixed(2), (0.2112878285).toFixed(2));

			let returnTokenIncentiveUser1 = parseFloat(web3.utils.fromWei((await marketInstance.getReturn(user1)).incentive[0].toString()));
			let returnTokenIncentiveUser2 = parseFloat(web3.utils.fromWei((await marketInstance.getReturn(user2)).incentive[0].toString()));
			let returnTokenIncentiveUser3 = parseFloat(web3.utils.fromWei((await marketInstance.getReturn(user3)).incentive[0].toString()));

			let returnTokenUser1 = parseFloat((await marketInstance.getReturn(user1))[0][0]);
			let returnTokenUser2 = parseFloat((await marketInstance.getReturn(user2))[0][0]);
			let returnTokenUser3 = parseFloat((await marketInstance.getReturn(user3))[0][0]);
			let returnETHUser1 = parseFloat((await marketInstance.getReturn(user1))[0][1]);
			let returnETHUser2 = parseFloat((await marketInstance.getReturn(user2))[0][1]);
			let returnETHUser3 = parseFloat((await marketInstance.getReturn(user3))[0][1]);
			returnTokenUser1 = web3.utils.fromWei(returnTokenUser1.toString());
			returnTokenUser2 = web3.utils.fromWei(returnTokenUser2.toString());
			returnTokenUser3 = web3.utils.fromWei(returnTokenUser3.toString());
			returnETHUser1 = web3.utils.fromWei(returnETHUser1.toString());
			returnETHUser2 = web3.utils.fromWei(returnETHUser2.toString());
			returnETHUser3 = web3.utils.fromWei(returnETHUser3.toString());

			assert.equal((parseFloat(returnTokenUser1) + returnTokenIncentiveUser1).toFixed(2), (256.39003).toFixed(2));
			assert.equal((parseFloat(returnTokenUser2) + returnTokenIncentiveUser2).toFixed(2), (239.9504822).toFixed(2));
			assert.equal((parseFloat(returnTokenUser3) + returnTokenIncentiveUser3).toFixed(2), (0.2112878285).toFixed(2));
			assert.equal(parseFloat(returnETHUser1).toFixed(2), (5.562432).toFixed(2));
			assert.equal(parseFloat(returnETHUser2).toFixed(2), (0).toFixed(2));
			assert.equal(parseFloat(returnETHUser3).toFixed(2), (2.3976).toFixed(2));

			const newPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));
			const newPlotusETHBalance = parseFloat(web3.utils.fromWei(await web3.eth.getBalance(plotusNewInstance.address)));

			assert.equal((newPlotusTokenBalance - oldPlotusTokenBalance).toFixed(4), "3.5982");
			assert.equal(newPlotusETHBalance, 0.035968);
		});
	});
});
describe("5. Option 3 for winning", () => {
	contract("Market", async function([user1, user2, user3]) {
		let masterInstance, plotusToken, tokenControllerAdd, tokenController, plotusNewAddress, plotusNewInstance;
		before(async () => {
			masterInstance = await OwnedUpgradeabilityProxy.deployed();
			masterInstance = await Master.at(masterInstance.address);
			plotusToken = await PlotusToken.deployed();
			tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
			tokenController = await TokenController.at(tokenControllerAdd);
			plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			plotusNewInstance = await Plotus.at(plotusNewAddress);
			openMarkets = await plotusNewInstance.getOpenMarkets();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			assert.ok(marketInstance);
			await increaseTime(10001);
			// Transfer Tokens
			await plotusToken.transfer(user2, web3.utils.toWei("5000"));
			await plotusToken.transfer(user3, web3.utils.toWei("5000"));

			await marketInstance.setOptionPrice(1, 9);
			await marketInstance.setOptionPrice(2, 18);
			await marketInstance.setOptionPrice(3, 27);

			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"));
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user2 });
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user3 });
		});

		it("5.1. Scenario 8", async () => {
			const oldPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));

			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("100"), 1, 1, { from: user1 });
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("4"), 2, 2, {
				from: user1,
				value: web3.utils.toWei("4"),
			});
			await marketInstance.placePrediction(plotusToken.address, web3.utils.toWei("400"), 3, 2, { from: user2 });
			await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("4"), 1, 2, {
				from: user3,
				value: web3.utils.toWei("4"),
			});

			const predictionPointsUser1 = parseFloat(await marketInstance.userPredictionPoints(user1, 1));
			const predictionPointsUser1_2 = parseFloat(await marketInstance.userPredictionPoints(user1, 2));
			const predictionPointsUser2 = parseFloat(await marketInstance.userPredictionPoints(user2, 3));
			const predictionPointsUser3 = parseFloat(await marketInstance.userPredictionPoints(user3, 1));

			assert.equal((predictionPointsUser1 / 10000).toFixed(1), (11.10277882).toFixed(1));
			assert.equal((predictionPointsUser1_2 / 10000).toFixed(1), (93.19336834).toFixed(1));
			assert.equal((predictionPointsUser2 / 10000).toFixed(1), (62.17556139).toFixed(1));
			assert.equal((predictionPointsUser3 / 10000).toFixed(1), (186.3867367).toFixed(1));

			let oldOwnerBalance1 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user1)).toString()));
			let oldOwnerBalance2 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user2)).toString()));
			let oldOwnerBalance3 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user3)).toString()));

			await increaseTime(360001);
			const marketData = await marketInstance.getData();
			const maxValueOption2 = parseFloat(marketData[2][1]);
			const optionValue = maxValueOption2 + 1;
			await marketInstance.calculatePredictionResult(optionValue);
			await increaseTime(360001);

			await marketInstance.exchangeCommission();
			await marketInstance.claimReturn(user1);
			await marketInstance.claimReturn(user2);
			await marketInstance.claimReturn(user3);

			let newOwnerBalance1 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user1)).toString()));
			let newOwnerBalance2 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user2)).toString()));
			let newOwnerBalance3 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user3)).toString()));

			assert.equal((newOwnerBalance1 - oldOwnerBalance1).toFixed(2), (80.07823001).toFixed(2));
			assert.equal((newOwnerBalance2 - oldOwnerBalance2).toFixed(2), (419.4606822).toFixed(2));
			assert.equal((newOwnerBalance3 - oldOwnerBalance3).toFixed(2), (0.2112878285).toFixed(2));

			let returnTokenIncentiveUser1 = parseFloat(web3.utils.fromWei((await marketInstance.getReturn(user1)).incentive[0].toString()));
			let returnTokenIncentiveUser2 = parseFloat(web3.utils.fromWei((await marketInstance.getReturn(user2)).incentive[0].toString()));
			let returnTokenIncentiveUser3 = parseFloat(web3.utils.fromWei((await marketInstance.getReturn(user3)).incentive[0].toString()));

			let returnTokenUser1 = parseFloat((await marketInstance.getReturn(user1))[0][0]);
			let returnTokenUser2 = parseFloat((await marketInstance.getReturn(user2))[0][0]);
			let returnTokenUser3 = parseFloat((await marketInstance.getReturn(user3))[0][0]);
			let returnETHUser1 = parseFloat((await marketInstance.getReturn(user1))[0][1]);
			let returnETHUser2 = parseFloat((await marketInstance.getReturn(user2))[0][1]);
			let returnETHUser3 = parseFloat((await marketInstance.getReturn(user3))[0][1]);
			returnTokenUser1 = web3.utils.fromWei(returnTokenUser1.toString());
			returnTokenUser2 = web3.utils.fromWei(returnTokenUser2.toString());
			returnTokenUser3 = web3.utils.fromWei(returnTokenUser3.toString());
			returnETHUser1 = web3.utils.fromWei(returnETHUser1.toString());
			returnETHUser2 = web3.utils.fromWei(returnETHUser2.toString());
			returnETHUser3 = web3.utils.fromWei(returnETHUser3.toString());

			assert.equal((parseFloat(returnTokenUser1) + returnTokenIncentiveUser1).toFixed(2), (80.07823001).toFixed(2));
			assert.equal((parseFloat(returnTokenUser2) + returnTokenIncentiveUser2).toFixed(2), (419.4606822).toFixed(2));
			assert.equal((parseFloat(returnTokenUser3) + returnTokenIncentiveUser3).toFixed(2), (0.2112878285).toFixed(2));
			assert.equal(parseFloat(returnETHUser1).toFixed(2), (2.3976).toFixed(2));
			assert.equal(parseFloat(returnETHUser2).toFixed(2), (3.132864).toFixed(2));
			assert.equal(parseFloat(returnETHUser3).toFixed(2), (2.3976).toFixed(2));

			const newPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));
			const newPlotusETHBalance = parseFloat(web3.utils.fromWei(await web3.eth.getBalance(plotusNewInstance.address)));

			assert.equal((newPlotusTokenBalance - oldPlotusTokenBalance).toFixed(4), "0.3998");
			assert.equal(newPlotusETHBalance, 0.067936);
		});
	});
});
