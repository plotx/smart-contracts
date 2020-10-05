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
const assertRevert = require("./utils/assertRevert").assertRevert;
const latestTime = require("./utils/latestTime").latestTime;

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
			let marketConfig = await plotusNewInstance.marketUtility();
			marketConfig = await MarketConfig.at(marketConfig);
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

			await marketConfig.setOptionPrice(1, 9);
			await marketConfig.setOptionPrice(2, 18);
			await marketConfig.setOptionPrice(3, 27);
			await plotusToken.approve(marketInstance.address, "10000000000000000000000");
			await plotusToken.approve(marketInstance.address, "10000000000000000000000", { from: user2 });

			// await marketConfig.setAMLComplianceStatus(user1, true);
			// await marketConfig.setKYCComplianceStatus(user1, true);
			await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 2, 1, {
				from: user1,
			});
			// await marketConfig.setAMLComplianceStatus(user2, true);
			// await marketConfig.setAMLComplianceStatus(user3, true);
			// await marketConfig.setAMLComplianceStatus(user4, true);
			// await marketConfig.setAMLComplianceStatus(user5, true);

			// await marketConfig.setKYCComplianceStatus(user1, true);
			// await marketConfig.setKYCComplianceStatus(user2, true);
			// await marketConfig.setKYCComplianceStatus(user3, true);
			// await marketConfig.setKYCComplianceStatus(user4, true);
			// await marketConfig.setKYCComplianceStatus(user5, true);

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
			predictionPointsBeforeUser1 = parseFloat(await marketInstance.getUserPredictionPoints(user1, 2)) / 1000;
			predictionPointsBeforeUser2 = parseFloat(await marketInstance.getUserPredictionPoints(user2, 2)) / 1000;
			predictionPointsBeforeUser3 = parseFloat(await marketInstance.getUserPredictionPoints(user3, 1)) / 1000;
			predictionPointsBeforeUser4 = parseFloat(await marketInstance.getUserPredictionPoints(user4, 3)) / 1000;
			predictionPointsBeforeUser5 = parseFloat(await marketInstance.getUserPredictionPoints(user5, 3)) / 1000;
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
			let marketConfig = await plotusNewInstance.marketUtility();
			marketConfig = await MarketConfig.at(marketConfig);
			const openMarkets = await plotusNewInstance.getOpenMarkets();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			// await marketInstance.setMockPriceFlag(false);
			await increaseTime(10001);
			assert.ok(marketInstance);
			await plotusToken.approve(tokenController.address, "10000000000000000000000", { from: user1 });
			await tokenController.lock("0x534d", "1100000000000000000000", 86400 * 30, { from: user1 });
			await plotusToken.transfer(user2, "2500000000000000000000");
			await plotusToken.approve(tokenController.address, "10000000000000000000000", { from: user2 });
			await tokenController.lock("0x534d", "1600000000000000000000", 86400 * 30, { from: user2 });
			await plotusToken.transfer(user3, "2500000000000000000000");
			await plotusToken.approve(tokenController.address, "10000000000000000000000", { from: user3 });
			await tokenController.lock("0x534d", "1100000000000000000000", 86400 * 30, { from: user3 });
			await plotusToken.transfer(user4, "2500000000000000000000");
			await plotusToken.approve(tokenController.address, "10000000000000000000000", { from: user4 });
			await tokenController.lock("0x534d", "1100000000000000000000", 86400 * 30, { from: user4 });
			await plotusToken.transfer(user5, "2500000000000000000000");
			await plotusToken.approve(tokenController.address, "10000000000000000000000", { from: user5 });
			await tokenController.lock("0x534d", "1100", 86400 * 30, { from: user5 });

			await marketConfig.setOptionPrice(1, 9);
			await marketConfig.setOptionPrice(2, 18);
			await marketConfig.setOptionPrice(3, 27);

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
			let predictionPointsUser1 = parseFloat(await marketInstance.getUserPredictionPoints(user1, 2)) / 1000;
			let predictionPointsUser2 = parseFloat(await marketInstance.getUserPredictionPoints(user2, 2)) / 1000;
			let predictionPointsUser3 = parseFloat(await marketInstance.getUserPredictionPoints(user3, 1)) / 1000;
			let predictionPointsUser4 = parseFloat(await marketInstance.getUserPredictionPoints(user4, 3)) / 1000;
			let predictionPointsUser5 = parseFloat(await marketInstance.getUserPredictionPoints(user5, 3)) / 1000;

			//console.log(predictionPointsUser1, predictionPointsUser2, predictionPointsUser3, predictionPointsUser4, predictionPointsUser5);
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

			await marketConfig.setOptionPrice(1, 9);
			await marketConfig.setOptionPrice(2, 18);
			await marketConfig.setOptionPrice(3, 27);
		});

		it("2.1", async () => {
			await plotusToken.transfer(user2, web3.utils.toWei("1000"));
			await plotusToken.transfer(user3, web3.utils.toWei("10000"));
			await plotusToken.transfer(user4, web3.utils.toWei("20000"));

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

			predictionPointsUser1 = parseFloat(await marketInstance.getUserPredictionPoints(user1, 1)) / 1000;
			predictionPointsUser1_2 = parseFloat(await marketInstance.getUserPredictionPoints(user1, 2)) / 1000;
			predictionPointsUser2 = parseFloat(await marketInstance.getUserPredictionPoints(user2, 2)) / 1000;
			predictionPointsUser3 = parseFloat(await marketInstance.getUserPredictionPoints(user3, 3)) / 1000;
			predictionPointsUser4 = parseFloat(await marketInstance.getUserPredictionPoints(user4, 1)) / 1000;
			predictionPointsUser5 = parseFloat(await marketInstance.getUserPredictionPoints(user5, 2)) / 1000;
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

			await marketConfig.setOptionPrice(1, 9);
			await marketConfig.setOptionPrice(2, 18);
			await marketConfig.setOptionPrice(3, 27);
		});
		it("2.2", async () => {
			await plotusToken.approve(tokenController.address, "1000000000000000000000000", { from: user1 });
			await tokenController.lock("0x534d", web3.utils.toWei("110000"), 86400 * 30, { from: user1 });

			await plotusToken.transfer(user2, web3.utils.toWei("1000"));
			await plotusToken.approve(tokenController.address, "1000000000000000000000000", { from: user2 });
			await tokenController.lock("0x534d", web3.utils.toWei("1000"), 86400 * 30, { from: user2 });

			await plotusToken.transfer(user3, web3.utils.toWei("100000"));
			await plotusToken.approve(tokenController.address, "1000000000000000000000000", { from: user3 });
			await tokenController.lock("0x534d", web3.utils.toWei("100000"), 86400 * 30, { from: user3 });

			await plotusToken.transfer(user4, web3.utils.toWei("200000"));
			await plotusToken.approve(tokenController.address, "1000000000000000000000000", { from: user4 });
			await tokenController.lock("0x534d", web3.utils.toWei("200000"), 86400 * 30, { from: user4 });

			await plotusToken.transfer(user5, web3.utils.toWei("11000"));
			await plotusToken.approve(tokenController.address, "1000000000000000000000000", { from: user5 });
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

			let predictionPointsWithLockUser1 = parseFloat(await marketInstance.getUserPredictionPoints(user1, 1)) / 1000;
			let predictionPointsWithLockUser1_2 = parseFloat(await marketInstance.getUserPredictionPoints(user1, 2)) / 1000;
			let predictionPointsWithLockUser2 = parseFloat(await marketInstance.getUserPredictionPoints(user2, 2)) / 1000;
			let predictionPointsWithLockUser3 = parseFloat(await marketInstance.getUserPredictionPoints(user3, 3)) / 1000;
			let predictionPointsWithLockUser4 = parseFloat(await marketInstance.getUserPredictionPoints(user4, 1)) / 1000;
			let predictionPointsWithLockUser5 = parseFloat(await marketInstance.getUserPredictionPoints(user5, 2)) / 1000;

			// console.log(
			// 	predictionPointsWithLockUser1,
			// 	predictionPointsWithLockUser1_2,
			// 	predictionPointsWithLockUser2,
			// 	predictionPointsWithLockUser3,
			// 	predictionPointsWithLockUser4,
			// 	predictionPointsWithLockUser5
			// );

			assert.equal(Math.floor(predictionPointsWithLockUser1), Math.floor(33890.707));
			assert.equal(Math.floor(predictionPointsWithLockUser1_2), Math.floor(8069.216));
			assert.equal(Math.floor(predictionPointsWithLockUser2), Math.floor(10525.064));
			assert.equal(Math.floor(predictionPointsWithLockUser3), Math.floor(14033.418));
			assert.equal(Math.floor(predictionPointsWithLockUser4), Math.floor(63150.384));
			assert.equal(Math.floor(predictionPointsWithLockUser5), Math.floor(10.41933533));
		});
	});
});

describe("3. Multiple Option predictions", () => {
	contract("Market", async function([user1, user2, user3, user4, user5]) {
		let masterInstance, marketConfig, plotusToken, tokenControllerAdd, tokenController, plotusNewAddress, plotusNewInstance;
		before(async () => {
			masterInstance = await OwnedUpgradeabilityProxy.deployed();
			masterInstance = await Master.at(masterInstance.address);
			plotusToken = await PlotusToken.deployed();
			tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
			tokenController = await TokenController.at(tokenControllerAdd);
			plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			plotusNewInstance = await Plotus.at(plotusNewAddress);
			marketConfig = await plotusNewInstance.marketUtility();
			marketConfig = await MarketConfig.at(marketConfig);
			openMarkets = await plotusNewInstance.getOpenMarkets();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			assert.ok(marketInstance);
			await increaseTime(10001);
			// Transfer Tokens
			await plotusToken.transfer(user2, web3.utils.toWei("5000"));
			await plotusToken.transfer(user3, web3.utils.toWei("5000"));

			await marketConfig.setOptionPrice(1, 9);
			await marketConfig.setOptionPrice(2, 18);
			await marketConfig.setOptionPrice(3, 27);

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

			const predictionPointsUser1 = parseFloat(await marketInstance.getUserPredictionPoints(user1, 1));
			const predictionPointsUser2 = parseFloat(await marketInstance.getUserPredictionPoints(user2, 1));
			const predictionPointsUser3 = parseFloat(await marketInstance.getUserPredictionPoints(user3, 2));

			await increaseTime(36001);
			await marketInstance.calculatePredictionResult(1);
			await increaseTime(36001);

			let returnUser1 = parseFloat((await marketInstance.getReturn(user1))[0][0]);
			let returnUser2 = parseFloat((await marketInstance.getReturn(user2))[0][0]);
			let returnUser3 = parseFloat((await marketInstance.getReturn(user3))[0][0]);
			returnUser1 = web3.utils.fromWei(returnUser1.toString());
			returnUser2 = web3.utils.fromWei(returnUser2.toString());
			returnUser3 = web3.utils.fromWei(returnUser3.toString());
			
            //console.log("(predictionPointsUser1 / 10000).toFixed(1)", predictionPointsUser1 );
            //console.log("(predictionPointsUser2 / 10000).toFixed(1)", predictionPointsUser2 );
            //console.log("(predictionPointsUser3 / 10000).toFixed(1)", predictionPointsUser3 );
            //console.log("parseFloat(returnUser1).toFixed(3)", parseFloat(returnUser1));
            //console.log("parseFloat(returnUser2).toFixed(3)", parseFloat(returnUser2));
            //console.log("parseFloat(returnUser3).toFixed(3)", parseFloat(returnUser3));
			
			assert.equal((predictionPointsUser1 / 10000).toFixed(1), (197.629463).toFixed(1));
			assert.equal((predictionPointsUser2 / 10000).toFixed(1), (186.5266842).toFixed(1));
			assert.equal((predictionPointsUser3 / 10000).toFixed(1), (93.26334208).toFixed(1));
			assert.equal(parseFloat(returnUser1).toFixed(), (581.9592486).toFixed());
			assert.equal(parseFloat(returnUser2).toFixed(), (477.3907514).toFixed());
			assert.equal(parseFloat(returnUser3).toFixed(), (240).toFixed());

			const newPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));
            //console.log("(newPlotusTokenBalance - oldPlotusTokenBalance).toFixed(2)", (newPlotusTokenBalance - oldPlotusTokenBalance).toFixed(2))
			assert.equal((newPlotusTokenBalance - oldPlotusTokenBalance).toFixed(2), (0.65).toFixed(2));
		});
	});
	contract("Market", async function([user1, user2, user3, user4, user5]) {
		let masterInstance, marketConfig, plotusToken, tokenControllerAdd, tokenController, plotusNewAddress, plotusNewInstance;
		before(async () => {
			masterInstance = await OwnedUpgradeabilityProxy.deployed();
			masterInstance = await Master.at(masterInstance.address);
			plotusToken = await PlotusToken.deployed();
			tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
			tokenController = await TokenController.at(tokenControllerAdd);
			plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			plotusNewInstance = await Plotus.at(plotusNewAddress);
			marketConfig = await plotusNewInstance.marketUtility();
			marketConfig = await MarketConfig.at(marketConfig);
			openMarkets = await plotusNewInstance.getOpenMarkets();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			assert.ok(marketInstance);
			await increaseTime(10001);
			// Transfer Tokens
			await plotusToken.transfer(user2, web3.utils.toWei("5000"));
			await plotusToken.transfer(user3, web3.utils.toWei("5000"));

			await marketConfig.setOptionPrice(1, 9);
			await marketConfig.setOptionPrice(2, 18);
			await marketConfig.setOptionPrice(3, 27);

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

			const predictionPointsUser1 = parseFloat(await marketInstance.getUserPredictionPoints(user1, 2));
			const predictionPointsUser2 = parseFloat(await marketInstance.getUserPredictionPoints(user2, 1));
			const predictionPointsUser3 = parseFloat(await marketInstance.getUserPredictionPoints(user3, 2));

			await increaseTime(36001);
			await marketInstance.calculatePredictionResult(1);
			await increaseTime(36001);

			let returnUser1 = parseFloat((await marketInstance.getReturn(user1))[0][0]);
			let returnUser2 = parseFloat((await marketInstance.getReturn(user2))[0][0]);
			let returnUser3 = parseFloat((await marketInstance.getReturn(user3))[0][0]);
			returnUser1 = web3.utils.fromWei(returnUser1.toString());
			returnUser2 = web3.utils.fromWei(returnUser2.toString());
			returnUser3 = web3.utils.fromWei(returnUser3.toString());

			//console.log("(predictionPointsUser1 / 10000).toFixed(1)", predictionPointsUser1 );
            //console.log("(predictionPointsUser2 / 10000).toFixed(1)", predictionPointsUser2 );
            //console.log("(predictionPointsUser3 / 10000).toFixed(1)", predictionPointsUser3 );
            //console.log("parseFloat(returnUser1).toFixed(3)", parseFloat(returnUser1));
            //console.log("parseFloat(returnUser2).toFixed(3)", parseFloat(returnUser2));
            //console.log("parseFloat(returnUser3).toFixed(3)", parseFloat(returnUser3));

			assert.equal((predictionPointsUser1 / 10000).toFixed(1), (98.81473149).toFixed(1));
			assert.equal((predictionPointsUser2 / 10000).toFixed(1), (186.5266842).toFixed(1));
			assert.equal((predictionPointsUser3 / 10000).toFixed(1), (93.26334208).toFixed(1));
			assert.equal(parseFloat(returnUser1).toFixed(3), (319.84).toFixed(3));
			assert.equal(parseFloat(returnUser2).toFixed(3), (739.63).toFixed(3));
			assert.equal(parseFloat(returnUser3).toFixed(3), (239.88).toFixed(3));

			const newPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));
			assert.equal((newPlotusTokenBalance - oldPlotusTokenBalance).toFixed(2), "0.65");
		});
	});
	contract("Market", async function([user1, user2, user3, user4, user5]) {
		let masterInstance, marketConfig, plotusToken, tokenControllerAdd, tokenController, plotusNewAddress, plotusNewInstance;
		before(async () => {
			masterInstance = await OwnedUpgradeabilityProxy.deployed();
			masterInstance = await Master.at(masterInstance.address);
			plotusToken = await PlotusToken.deployed();
			tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
			tokenController = await TokenController.at(tokenControllerAdd);
			plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			plotusNewInstance = await Plotus.at(plotusNewAddress);
			marketConfig = await plotusNewInstance.marketUtility();
			marketConfig = await MarketConfig.at(marketConfig);
			openMarkets = await plotusNewInstance.getOpenMarkets();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			assert.ok(marketInstance);
			await increaseTime(10001);
			// Transfer Tokens
			await plotusToken.transfer(user2, web3.utils.toWei("5000"));
			await plotusToken.transfer(user3, web3.utils.toWei("5000"));

			await marketConfig.setOptionPrice(1, 9);
			await marketConfig.setOptionPrice(2, 18);
			await marketConfig.setOptionPrice(3, 27);

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

			const predictionPointsUser1 = parseFloat(await marketInstance.getUserPredictionPoints(user1, 1));
			const predictionPointsUser1_2 = parseFloat(await marketInstance.getUserPredictionPoints(user1, 2));
			const predictionPointsUser2 = parseFloat(await marketInstance.getUserPredictionPoints(user2, 1));
			const predictionPointsUser3 = parseFloat(await marketInstance.getUserPredictionPoints(user3, 2));

			await increaseTime(36001);
			await marketInstance.calculatePredictionResult(1);
			await increaseTime(36001);

			let returnUser1 = parseFloat((await marketInstance.getReturn(user1))[0][0]);
			let returnUser2 = parseFloat((await marketInstance.getReturn(user2))[0][0]);
			let returnUser3 = parseFloat((await marketInstance.getReturn(user3))[0][0]);
			returnUser1 = web3.utils.fromWei(returnUser1.toString());
			returnUser2 = web3.utils.fromWei(returnUser2.toString());
			returnUser3 = web3.utils.fromWei(returnUser3.toString());

			//console.log("(predictionPointsUser1 / 10000).toFixed(1)", predictionPointsUser1 );
            //console.log("(predictionPointsUser2 / 10000).toFixed(1)", predictionPointsUser2 );
            //console.log("(predictionPointsUser3 / 10000).toFixed(1)", predictionPointsUser3 );
            //console.log("parseFloat(returnUser1).toFixed(3)", parseFloat(returnUser1));
            //console.log("parseFloat(returnUser2).toFixed(3)", parseFloat(returnUser2));
            //console.log("parseFloat(returnUser3).toFixed(3)", parseFloat(returnUser3));

			assert.equal((predictionPointsUser1 / 10000).toFixed(1), (11.10277882).toFixed(1));
			assert.equal((predictionPointsUser1_2 / 10000).toFixed(1), (93.26334208).toFixed(1));
			assert.equal((predictionPointsUser2 / 10000).toFixed(1), (186.5266842).toFixed(1));
			assert.equal((predictionPointsUser3 / 10000).toFixed(1), (93.26334208).toFixed(1));
			assert.equal(parseFloat(returnUser1).toFixed(2), (357.7985393).toFixed(2));
			assert.equal(parseFloat(returnUser2).toFixed(2), (701.6714607).toFixed(2));
			assert.equal(parseFloat(returnUser3).toFixed(2), (239.88).toFixed(2));

			const newPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));
			assert.equal((newPlotusTokenBalance - oldPlotusTokenBalance).toFixed(2), "0.65");
		});
	});
	contract("Market", async function([user1, user2, user3, user4, user5]) {
		let masterInstance, marketConfig, plotusToken, tokenControllerAdd, tokenController, plotusNewAddress, plotusNewInstance;
		before(async () => {
			masterInstance = await OwnedUpgradeabilityProxy.deployed();
			masterInstance = await Master.at(masterInstance.address);
			plotusToken = await PlotusToken.deployed();
			tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
			tokenController = await TokenController.at(tokenControllerAdd);
			plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			plotusNewInstance = await Plotus.at(plotusNewAddress);
			marketConfig = await plotusNewInstance.marketUtility();
			marketConfig = await MarketConfig.at(marketConfig);
			openMarkets = await plotusNewInstance.getOpenMarkets();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			assert.ok(marketInstance);
			await increaseTime(10001);
			// Transfer Tokens
			await plotusToken.transfer(user2, web3.utils.toWei("5000"));
			await plotusToken.transfer(user3, web3.utils.toWei("5000"));

			await marketConfig.setOptionPrice(1, 9);
			await marketConfig.setOptionPrice(2, 18);
			await marketConfig.setOptionPrice(3, 27);

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

			const predictionPointsUser1 = parseFloat(await marketInstance.getUserPredictionPoints(user1, 1));
			const predictionPointsUser2 = parseFloat(await marketInstance.getUserPredictionPoints(user2, 3));
			const predictionPointsUser3 = parseFloat(await marketInstance.getUserPredictionPoints(user3, 2));

			assert.equal((predictionPointsUser1 / 10000).toFixed(1), (275.2822731).toFixed(1));
			assert.equal((predictionPointsUser2 / 10000).toFixed(1), (62.17556139).toFixed(1));
			assert.equal((predictionPointsUser3 / 10000).toFixed(1), (93.26334208).toFixed(1));

			let oldOwnerBalance1 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user1)).toString()));
			let oldOwnerBalance2 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user2)).toString()));
			let oldOwnerBalance3 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user3)).toString()));

			await increaseTime(360001);
			await marketInstance.calculatePredictionResult(1);
			await increaseTime(360001);
			await marketInstance.claimReturn(user1);
			await marketInstance.claimReturn(user2);
			await marketInstance.claimReturn(user3);

			let newOwnerBalance1 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user1)).toString()));
			let newOwnerBalance2 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user2)).toString()));
			let newOwnerBalance3 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user3)).toString()));

            //console.log("(newOwnerBalance1 - oldOwnerBalance1).toFixed(2)", newOwnerBalance1 - oldOwnerBalance1);
            //console.log("(newOwnerBalance2 - oldOwnerBalance2).toFixed(2)", newOwnerBalance2 - oldOwnerBalance2);
			//console.log("(newOwnerBalance3 - oldOwnerBalance3).toFixed(2)", newOwnerBalance3 - oldOwnerBalance3);
			
			assert.equal((newOwnerBalance1 - oldOwnerBalance1).toFixed(2), (719.64).toFixed(2));
			assert.equal((newOwnerBalance2 - oldOwnerBalance2).toFixed(2), (239.88).toFixed(2));
			assert.equal((newOwnerBalance3 - oldOwnerBalance3).toFixed(2), (239.88).toFixed(2));

			// let returnTokenIncentiveUser1 = parseFloat(web3.utils.fromWei((await marketInstance.getReturn(user1)).incentive[0].toString()));
			// let returnTokenIncentiveUser2 = parseFloat(web3.utils.fromWei((await marketInstance.getReturn(user2)).incentive[0].toString()));
			// let returnTokenIncentiveUser3 = parseFloat(web3.utils.fromWei((await marketInstance.getReturn(user3)).incentive[0].toString()));

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

            //console.log("(parseFloat(returnTokenUser1) + returnTokenIncentiveUser1).toFixed(2)", parseFloat(returnTokenUser1))
            //console.log("(parseFloat(returnTokenUser2) + returnTokenIncentiveUser2).toFixed(2)", parseFloat(returnTokenUser2))
            //console.log("(parseFloat(returnTokenUser3) + returnTokenIncentiveUser3).toFixed(2)", parseFloat(returnTokenUser3))
            //console.log("parseFloat(returnETHUser1).toFixed(2)", parseFloat(returnETHUser1))
            //console.log("parseFloat(returnETHUser2).toFixed(2)", parseFloat(returnETHUser2))
			//console.log("parseFloat(returnETHUser3).toFixed(2)", parseFloat(returnETHUser3))
			
			assert.equal(parseFloat(returnTokenUser1).toFixed(2), (719.64).toFixed(2));
			assert.equal(parseFloat(returnTokenUser2).toFixed(2), (239.88).toFixed(2));
			assert.equal(parseFloat(returnTokenUser3).toFixed(2), (239.88).toFixed(2));
			assert.equal(parseFloat(returnETHUser1).toFixed(2), (3.996).toFixed(2));
			assert.equal(parseFloat(returnETHUser2).toFixed(2), (0).toFixed(2));
			assert.equal(parseFloat(returnETHUser3).toFixed(2), (0).toFixed(2));

			const newPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));
			const newPlotusETHBalance = parseFloat(web3.utils.fromWei(await web3.eth.getBalance(plotusNewInstance.address)));
			//console.log((newPlotusTokenBalance - oldPlotusTokenBalance));
			assert.equal((newPlotusTokenBalance - oldPlotusTokenBalance).toFixed(2), "0.60");
			//console.log(newPlotusETHBalance);
			assert.equal(newPlotusETHBalance, 0.004);
			//console.log(parseFloat(await plotusToken.balanceOf(marketInstance.address)));
			//console.log(parseFloat(web3.utils.fromWei(await web3.eth.getBalance(marketInstance.address))));

		});
	});
	contract("Market", async function([user1, user2, user3, user4, user5]) {
		let masterInstance, marketConfig, plotusToken, tokenControllerAdd, tokenController, plotusNewAddress, plotusNewInstance;
		before(async () => {
			masterInstance = await OwnedUpgradeabilityProxy.deployed();
			masterInstance = await Master.at(masterInstance.address);
			plotusToken = await PlotusToken.deployed();
			tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
			tokenController = await TokenController.at(tokenControllerAdd);
			plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			plotusNewInstance = await Plotus.at(plotusNewAddress);
			marketConfig = await plotusNewInstance.marketUtility();
			marketConfig = await MarketConfig.at(marketConfig);
			openMarkets = await plotusNewInstance.getOpenMarkets();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			assert.ok(marketInstance);
			await increaseTime(10001);
			// Transfer Tokens
			await plotusToken.transfer(user2, web3.utils.toWei("5000"));
			await plotusToken.transfer(user3, web3.utils.toWei("5000"));

			await marketConfig.setOptionPrice(1, 9);
			await marketConfig.setOptionPrice(2, 18);
			await marketConfig.setOptionPrice(3, 27);

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

			const predictionPointsUser1 = parseFloat(await marketInstance.getUserPredictionPoints(user1, 2));
			const predictionPointsUser2 = parseFloat(await marketInstance.getUserPredictionPoints(user2, 3));
			const predictionPointsUser3 = parseFloat(await marketInstance.getUserPredictionPoints(user3, 1));

			assert.equal((predictionPointsUser1 / 10000).toFixed(1), (98.74475775).toFixed(1));
			assert.equal((predictionPointsUser2 / 10000).toFixed(1), (62.17556139).toFixed(1));
			assert.equal(parseInt(predictionPointsUser3 / 10000), parseInt(186.3867367));

			let oldOwnerBalance1 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user1)).toString()));
			let oldOwnerBalance2 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user2)).toString()));
			let oldOwnerBalance3 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user3)).toString()));

			await increaseTime(360001);
			await marketInstance.calculatePredictionResult(1);
			await increaseTime(360001);
			await marketInstance.claimReturn(user1);
			await marketInstance.claimReturn(user2);
			await marketInstance.claimReturn(user3);

			let newOwnerBalance1 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user1)).toString()));
			let newOwnerBalance2 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user2)).toString()));
			let newOwnerBalance3 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user3)).toString()));

			assert.equal((newOwnerBalance1 - oldOwnerBalance1).toFixed(2), (79.96).toFixed(2));
			assert.equal((newOwnerBalance2 - oldOwnerBalance2).toFixed(2), (239.88).toFixed(2));
			assert.equal((newOwnerBalance3 - oldOwnerBalance3).toFixed(2), (579.71).toFixed(2));

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

			//console.log("(parseFloat(returnTokenUser1) + returnTokenIncentiveUser1).toFixed(2)", parseFloat(returnTokenUser1))
            //console.log("(parseFloat(returnTokenUser2) + returnTokenIncentiveUser2).toFixed(2)", parseFloat(returnTokenUser2))
            //console.log("(parseFloat(returnTokenUser3) + returnTokenIncentiveUser3).toFixed(2)", parseFloat(returnTokenUser3))
            //console.log("parseFloat(returnETHUser1).toFixed(2)", parseFloat(returnETHUser1))
            //console.log("parseFloat(returnETHUser2).toFixed(2)", parseFloat(returnETHUser2))
			//console.log("parseFloat(returnETHUser3).toFixed(2)", parseFloat(returnETHUser3))

			assert.equal((parseFloat(returnTokenUser1)).toFixed(2), (79.96).toFixed(2));
			assert.equal((parseFloat(returnTokenUser2)).toFixed(2), (239.88).toFixed(2));
			assert.equal((parseFloat(returnTokenUser3)).toFixed(2), (579.71).toFixed(2));
			assert.equal(parseFloat(returnETHUser1).toFixed(2), (2.3976).toFixed(2));
			assert.equal(parseFloat(returnETHUser2).toFixed(2), (0).toFixed(2));
			assert.equal(parseFloat(returnETHUser3).toFixed(2), (1.5984).toFixed(2));

			const newPlotusTokenBalance = parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address)));
			const newPlotusETHBalance = parseFloat(web3.utils.fromWei(await web3.eth.getBalance(plotusNewInstance.address)));
			//console.log((newPlotusTokenBalance - oldPlotusTokenBalance));
			//console.log(newPlotusETHBalance);
			//console.log(parseFloat(await plotusToken.balanceOf(marketInstance.address)));
			//console.log(parseFloat(web3.utils.fromWei(await web3.eth.getBalance(marketInstance.address))));

			assert.equal((newPlotusTokenBalance - oldPlotusTokenBalance).toFixed(2), "0.45");
			assert.equal(newPlotusETHBalance, 0.004);
		});
	});
});

describe("4. New cases", () => {
	contract("Market", async function([user1, user2, user3, user4, user5]) {
		let masterInstance, marketConfig, plotusToken, tokenControllerAdd, tokenController, plotusNewAddress, plotusNewInstance;
		before(async () => {
			masterInstance = await OwnedUpgradeabilityProxy.deployed();
			masterInstance = await Master.at(masterInstance.address);
			plotusToken = await PlotusToken.deployed();
			tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
			tokenController = await TokenController.at(tokenControllerAdd);
			plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			plotusNewInstance = await Plotus.at(plotusNewAddress);
			marketConfig = await plotusNewInstance.marketUtility();
			marketConfig = await MarketConfig.at(marketConfig);
			openMarkets = await plotusNewInstance.getOpenMarkets();
			//console.log(openMarkets);
			marketInstance = await Market.at(openMarkets["_openMarkets"][2]);
			assert.ok(marketInstance);
			await increaseTime(10001);
			// Transfer Tokens
			await plotusToken.transfer(user2, web3.utils.toWei("5000"));
			await plotusToken.transfer(user3, web3.utils.toWei("5000"));

			await marketConfig.setOptionPrice(1, 9);
			await marketConfig.setOptionPrice(2, 18);
			await marketConfig.setOptionPrice(3, 27);

			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"));
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user2 });
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user3 });
		});

		it("Multiple Market claim, scenario 6,7,8", async () => {
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
			let predictionPointsUser1 = parseFloat(await marketInstance.getUserPredictionPoints(user1, 1));
			let predictionPointsUser1_2 = parseFloat(await marketInstance.getUserPredictionPoints(user1, 2));
			let predictionPointsUser2 = parseFloat(await marketInstance.getUserPredictionPoints(user2, 3));
			let predictionPointsUser3 = parseFloat(await marketInstance.getUserPredictionPoints(user3, 1));
			assert.equal((predictionPointsUser1 / 10000).toFixed(1), (11.10277882).toFixed(1));
			assert.equal((predictionPointsUser1_2 / 10000).toFixed(1), (93.19336834).toFixed(1));
			assert.equal((predictionPointsUser2 / 10000).toFixed(1), (62.17556139).toFixed(1));
            assert.equal((predictionPointsUser3 / 10000).toFixed(1), (186.3867367).toFixed(1));
            
            const dailyMarketInstance = marketInstance;
			// await increaseTime(60*60*24*2);
            // await marketInstance.calculatePredictionResult(1);
            
			await increaseTime(60*60*2);
			await plotusNewInstance.createMarket(0,0);
			await plotusNewInstance.createMarket(0,1);

			openMarkets = await plotusNewInstance.getOpenMarkets();
			//console.log(openMarkets);
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			assert.ok(marketInstance);
			await marketConfig.setOptionPrice(1, 9);
			await marketConfig.setOptionPrice(2, 18);
			await marketConfig.setOptionPrice(3, 27);
			// let marketStartTime = parseFloat((await marketInstance.marketData())[0]);
            // console.log("marketStartTime", marketStartTime)
			// console.log(await latestTime());
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"));
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user2 });
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user3 });
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
			predictionPointsUser1 = parseFloat(await marketInstance.getUserPredictionPoints(user1, 1));
			predictionPointsUser1_2 = parseFloat(await marketInstance.getUserPredictionPoints(user1, 2));
			predictionPointsUser2 = parseFloat(await marketInstance.getUserPredictionPoints(user2, 3));
			predictionPointsUser3 = parseFloat(await marketInstance.getUserPredictionPoints(user3, 1));
			assert.equal((predictionPointsUser1 / 10000).toFixed(), (11.10277882).toFixed());
			assert.equal((predictionPointsUser1_2 / 10000).toFixed(), (93.19336834).toFixed());
			assert.equal((predictionPointsUser2 / 10000).toFixed(), (62.17556139).toFixed());
			assert.equal((predictionPointsUser3 / 10000).toFixed(), (186.3867367).toFixed());

            await increaseTime(60*60*2);
            marketData = await marketInstance.getData();
			minValueOption2 = parseFloat(marketData[1][1]);
			maxValueOption2 = parseFloat(marketData[2][1]);
			optionValue = (minValueOption2 + maxValueOption2) / 2;
            await marketInstance.calculatePredictionResult(optionValue);

            await plotusNewInstance.createMarket(0,0);
			await plotusNewInstance.createMarket(0,1);

            openMarkets = await plotusNewInstance.getOpenMarkets();

			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			assert.ok(marketInstance);

			await marketConfig.setOptionPrice(1, 9);
			await marketConfig.setOptionPrice(2, 18);
			await marketConfig.setOptionPrice(3, 27);            
            await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"));
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user2 });
			await plotusToken.approve(marketInstance.address, web3.utils.toWei("500"), { from: user3 });
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
			predictionPointsUser1 = parseFloat(await marketInstance.getUserPredictionPoints(user1, 1));
			predictionPointsUser1_2 = parseFloat(await marketInstance.getUserPredictionPoints(user1, 2));
			predictionPointsUser2 = parseFloat(await marketInstance.getUserPredictionPoints(user2, 3));
			predictionPointsUser3 = parseFloat(await marketInstance.getUserPredictionPoints(user3, 1));
			assert.equal((predictionPointsUser1 / 10000).toFixed(1), (11.10277882).toFixed(1));
			assert.equal((predictionPointsUser1_2 / 10000).toFixed(1), (93.19336834).toFixed(1));
			assert.equal((predictionPointsUser2 / 10000).toFixed(1), (62.17556139).toFixed(1));
            assert.equal((predictionPointsUser3 / 10000).toFixed(1), (186.3867367).toFixed(1));
            
            await increaseTime(60*60*2);
            marketData = await marketInstance.getData();
			maxValueOption2 = parseFloat(marketData[2][1]);
			optionValue = maxValueOption2 + 1;
            await marketInstance.calculatePredictionResult(optionValue);

            await increaseTime(60*60);

            let oldOwnerBalance1 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user1)).toString()));
			let oldOwnerBalance2 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user2)).toString()));
			let oldOwnerBalance3 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user3)).toString()));
            let oldOwnerETHBalance1 = parseFloat(web3.utils.fromWei((await web3.eth.getBalance(user1)).toString()));
			let oldOwnerETHBalance2 = parseFloat(web3.utils.fromWei((await web3.eth.getBalance(user2)).toString()));
			let oldOwnerETHBalance3 = parseFloat(web3.utils.fromWei((await web3.eth.getBalance(user3)).toString()));

            await plotusNewInstance.claimPendingReturn(10, {from: user1})
            await plotusNewInstance.claimPendingReturn(10, {from: user2})
            await plotusNewInstance.claimPendingReturn(10, {from: user3})

            let newOwnerBalance1 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user1)).toString()));
			let newOwnerBalance2 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user2)).toString()));
            let newOwnerBalance3 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user3)).toString()));
            let newOwnerETHBalance1 = parseFloat(web3.utils.fromWei((await web3.eth.getBalance(user1)).toString()));
			let newOwnerETHBalance2 = parseFloat(web3.utils.fromWei((await web3.eth.getBalance(user2)).toString()));
			let newOwnerETHBalance3 = parseFloat(web3.utils.fromWei((await web3.eth.getBalance(user3)).toString()));
            
            //console.log("(newOwnerBalance1 - oldOwnerBalance1).toFixed(2)", (newOwnerBalance1 - oldOwnerBalance1).toFixed(2))
            //console.log("(newOwnerBalance2 - oldOwnerBalance2).toFixed(2)", (newOwnerBalance2 - oldOwnerBalance2).toFixed(2))
            //console.log("(newOwnerBalance3 - oldOwnerBalance3).toFixed(2)", (newOwnerBalance3 - oldOwnerBalance3).toFixed(2))
            assert.equal((newOwnerBalance1 - oldOwnerBalance1).toFixed(2), (339.83).toFixed(2));
			assert.equal((newOwnerBalance2 - oldOwnerBalance2).toFixed(2), (659.67).toFixed(2));
            assert.equal((newOwnerBalance3 - oldOwnerBalance3).toFixed(2), (0).toFixed(2));

            assert.equal((newOwnerETHBalance1 - oldOwnerETHBalance1).toFixed(2), (7.992).toFixed(2));
			expect((newOwnerETHBalance2 - oldOwnerETHBalance2)).to.be.closeTo(3.19, 3.2);//3.1968
			expect((newOwnerETHBalance3 - oldOwnerETHBalance3)).to.be.closeTo(4.7, 4.8);//4.7952
            
            await increaseTime(60*60*24*2);
            await dailyMarketInstance.calculatePredictionResult(1);
            await increaseTime(60*60*24);

            oldOwnerBalance1 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user1)).toString()));
			oldOwnerBalance2 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user2)).toString()));
			oldOwnerBalance3 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user3)).toString()));
            oldOwnerETHBalance1 = parseFloat(web3.utils.fromWei((await web3.eth.getBalance(user1)).toString()));
			oldOwnerETHBalance2 = parseFloat(web3.utils.fromWei((await web3.eth.getBalance(user2)).toString()));
			oldOwnerETHBalance3 = parseFloat(web3.utils.fromWei((await web3.eth.getBalance(user3)).toString()));
            
            await plotusNewInstance.claimPendingReturn(10, {from: user1})
            await plotusNewInstance.claimPendingReturn(10, {from: user2})
            await plotusNewInstance.claimPendingReturn(10, {from: user3})

            newOwnerBalance1 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user1)).toString()));
			newOwnerBalance2 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user2)).toString()));
            newOwnerBalance3 = parseFloat(web3.utils.fromWei((await plotusToken.balanceOf(user3)).toString()));
            newOwnerETHBalance1 = parseFloat(web3.utils.fromWei((await web3.eth.getBalance(user1)).toString()));
			newOwnerETHBalance2 = parseFloat(web3.utils.fromWei((await web3.eth.getBalance(user2)).toString()));
			newOwnerETHBalance3 = parseFloat(web3.utils.fromWei((await web3.eth.getBalance(user3)).toString()));

            //console.log("(newOwnerBalance1 - oldOwnerBalance1).toFixed(2)", (newOwnerBalance1 - oldOwnerBalance1).toFixed(2))
            //console.log("(newOwnerBalance2 - oldOwnerBalance2).toFixed(2)", (newOwnerBalance2 - oldOwnerBalance2).toFixed(2))
            //console.log("(newOwnerBalance3 - oldOwnerBalance3).toFixed(2)", (newOwnerBalance3 - oldOwnerBalance3).toFixed(2))
            assert.equal((newOwnerBalance1 - oldOwnerBalance1).toFixed(2), (108.9406362).toFixed(2));
			assert.equal((newOwnerBalance2 - oldOwnerBalance2).toFixed(2), (239.88).toFixed(2));
            assert.equal((newOwnerBalance3 - oldOwnerBalance3).toFixed(2), (150.9293638).toFixed(2));

			expect((newOwnerETHBalance1 - oldOwnerETHBalance1)).to.be.closeTo(2.2, 2.3);//2.487461386
			assert.equal((newOwnerETHBalance2 - oldOwnerETHBalance2).toFixed(2), (0).toFixed(2));
			expect((newOwnerETHBalance3 - oldOwnerETHBalance3)).to.be.closeTo(5.5, 5.6);//5.504538614

		});
	});
})