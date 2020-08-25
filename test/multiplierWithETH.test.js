const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("Plotus");
const Master = artifacts.require("Master");
const PlotusToken = artifacts.require("PlotusToken");
const MockchainLinkBTC = artifacts.require("MockChainLinkAggregator");
const MockUniswapRouter = artifacts.require("MockUniswapRouter");
const TokenController = artifacts.require("MockTokenController");
const web3 = Market.web3;
const increaseTime = require("./utils/increaseTime.js").increaseTime;

contract("Market", async function ([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]) {
	let masterInstance, plotusToken, tokenControllerAdd, tokenController, plotusNewAddress, plotusNewInstance, openMarkets, marketInstance, MockUniswapRouterInstance;

	before(async () => {
		masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		plotusToken = await PlotusToken.deployed();
		MockUniswapRouterInstance = await MockUniswapRouter.deployed();

		tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
		tokenController = await TokenController.at(tokenControllerAdd);
		plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
		plotusNewInstance = await Plotus.at(plotusNewAddress);
		openMarkets = await plotusNewInstance.getOpenMarkets();
		marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
		await increaseTime(10001);
		assert.ok(marketInstance);
	});

	it("Place prediction with ETH and check multiplier", async () => {
		await tokenController.lock("0x534d", web3.utils.toWei("11000"), 86400 * 30, { from: user1 });

		await plotusToken.transfer(user2, web3.utils.toWei("1000"));
		await tokenController.lock("0x534d", web3.utils.toWei("1000"), 86400 * 30, { from: user2 });

		await plotusToken.transfer(user3, web3.utils.toWei("10000"));
		await tokenController.lock("0x534d", web3.utils.toWei("10000"), 86400 * 30, { from: user3 });

		await plotusToken.transfer(user4, web3.utils.toWei("20000"));
		await tokenController.lock("0x534d", web3.utils.toWei("20000"), 86400 * 30, { from: user4 });

		console.log(parseInt(await plotusToken.balanceOf(user1)));
		console.log(parseInt(await plotusToken.balanceOf(user2)));

		await marketInstance.setOptionPrice(1, 9);
		await marketInstance.setOptionPrice(2, 18);
		await marketInstance.setOptionPrice(3, 27);

		const predictionPointsBeforeUser1 = parseFloat(await marketInstance.estimatePredictionValue(1, web3.utils.toWei("10"), 4));
		const predictionPointsBeforeUser1_2 = parseFloat(await marketInstance.estimatePredictionValue(2, web3.utils.toWei("10"), 4));
		const predictionPointsBeforeUser2 = parseFloat(await marketInstance.estimatePredictionValue(2, web3.utils.toWei("10"), 4));
		const predictionPointsBeforeUser3 = parseFloat(await marketInstance.estimatePredictionValue(3, web3.utils.toWei("10"), 5));
		const predictionPointsBeforeUser4 = parseFloat(await marketInstance.estimatePredictionValue(1, web3.utils.toWei("10"), 5));

		console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser1_2, predictionPointsBeforeUser2, predictionPointsBeforeUser3, predictionPointsBeforeUser4);

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("10"), 1, 4, {
			from: user1,
			value: web3.utils.toWei("10"),
		});
		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("10"), 2, 4, {
			from: user1,
			value: web3.utils.toWei("10"),
		});
		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("10"), 2, 4, {
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

		const predictionPointsUser1 = parseFloat(await marketInstance.userPredictionPoints(user1, 1));
		const predictionPointsUser1_2 = parseFloat(await marketInstance.userPredictionPoints(user1, 2));
		const predictionPointsUser2 = parseFloat(await marketInstance.userPredictionPoints(user2, 2));
		const predictionPointsUser3 = parseFloat(await marketInstance.userPredictionPoints(user3, 3));
		const predictionPointsUser4 = parseFloat(await marketInstance.userPredictionPoints(user4, 1));

		console.log(predictionPointsUser1, predictionPointsUser1_2, predictionPointsUser2, predictionPointsUser3, predictionPointsUser4);

		assert.equal(predictionPointsUser1, parseInt(predictionPointsBeforeUser1 * 1.1));
		assert.equal(predictionPointsUser1_2, parseInt(predictionPointsBeforeUser1_2 * 1.1), "THIS SHOULD FAIL");
		assert.equal(predictionPointsUser2, predictionPointsBeforeUser2);
		assert.equal(predictionPointsUser3, predictionPointsBeforeUser3);
		assert.equal(predictionPointsUser4, parseInt(predictionPointsBeforeUser4 * 2));
	});
});
