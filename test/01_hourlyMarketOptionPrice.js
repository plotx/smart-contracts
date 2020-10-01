const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("MarketRegistry");
const Master = artifacts.require("Master");
const PlotusToken = artifacts.require("MockPLOT");
const MockchainLinkBTC = artifacts.require("MockChainLinkAggregator");
const MarketConfig = artifacts.require("MockConfig");
const MockUniswapRouter = artifacts.require("MockUniswapRouter");
const BLOT = artifacts.require("BLOT");
const web3 = Market.web3;
const increaseTime = require("./utils/increaseTime.js").increaseTime;

contract("Market", async function([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]) {
	it("1.Scenario 1 - Stake in ETH < minstake (no stake in LOT) and time passed < min time passed", async () => {
		let tokenPrice = 0.012;
		let masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		let plotusToken = await PlotusToken.deployed();
		let BLOTInstance = await BLOT.deployed();
		let MockchainLinkInstance = await MockchainLinkBTC.deployed();
		let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
		let MockUniswapRouterInstance = await MockUniswapRouter.deployed();
		let plotusNewInstance = await Plotus.at(plotusNewAddress);
		let marketConfig = await plotusNewInstance.marketUtility();
		marketConfig = await MarketConfig.at(marketConfig);
		const openMarkets = await plotusNewInstance.getOpenMarkets();

		//console.log("marketType", openMarkets["_marketTypes"][0] / 1);
		marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
		await marketConfig.setMockPriceFlag(false);
		await increaseTime(10001);
		assert.ok(marketInstance);

		await MockchainLinkInstance.setLatestAnswer(1195000000000);
		let currentPriceAfter = await MockchainLinkInstance.latestAnswer();
		//console.log(currentPriceAfter / 1);

		await marketInstance.setOptionRangesPublic(11900, 12000);
		let priceOption1 = await marketInstance.getOptionPrice(1);
		let priceOption2 = await marketInstance.getOptionPrice(2);
		let priceOption3 = await marketInstance.getOptionPrice(3);
		//console.log(priceOption1 / 1, priceOption2 / 1, priceOption3 / 1);

		await MockUniswapRouterInstance.setPrice("12000000000000000");
		await marketConfig.setPrice("12000000000000000");

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "1000000000000000000", 1, 1, {
			value: "1000000000000000000",
			from: user1,
		});

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "2000000000000000000", 2, 1, {
			value: "2000000000000000000",
			from: user2,
		});

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "10000000000000000000", 3, 1, {
			value: "10000000000000000000",
			from: user3,
		});

		await increaseTime(360);
		let currentPriceAfter_af = await MockchainLinkInstance.latestAnswer();
		//console.log(currentPriceAfter_af / 1);
		let priceOption1_af = await marketInstance.getOptionPrice(1);
		let priceOption2_af = await marketInstance.getOptionPrice(2);
		let priceOption3_af = await marketInstance.getOptionPrice(3);
		let optionPriceETH1 = priceOption1_af / 1;
		let optionPriceLOT1 = priceOption1_af / tokenPrice;
		//console.log("Round off ETH price of option1", optionPriceETH1 / 1000);
		//console.log("Round off LOT price of option1", optionPriceLOT1 / 1000);
		let optionPriceETH2 = priceOption2_af / 1;
		let optionPriceLOT2 = priceOption2_af / 1 / tokenPrice;
		//console.log("Round off ETH price of option2", optionPriceETH2 / 1000);
		//console.log("Round off LOT price of option2", optionPriceLOT2 / 1000);
		let optionPriceETH3 = priceOption3_af / 1;
		let optionPriceLOT3 = priceOption3_af / 1 / tokenPrice;
		//console.log("Round off ETH price of option3", optionPriceETH3 / 1000);
		//console.log("Round off LOT price of option3", optionPriceLOT3 / 1000);

		assert.equal(parseFloat((optionPriceETH1 / 1000).toFixed(3)), 0.013);
		assert.equal(parseFloat((optionPriceETH2 / 1000).toFixed(3)), 0.027);
		assert.equal(parseFloat((optionPriceETH3 / 1000).toFixed(3)), 0.013);
		assert.equal(parseFloat((optionPriceLOT1 / 1000).toFixed(3)), 1.083);
		assert.equal(parseFloat((optionPriceLOT2 / 1000).toFixed(3)), 2.25);
		assert.equal(parseFloat((optionPriceLOT3 / 1000).toFixed(3)), 1.083);
	});
});

contract("Market", async function([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]) {
	it("2.Scenario 2 - Stake in LOT< minstake (no stake in ETH) and time passed < min time passed", async () => {
		let tokenPrice = 0.012;
		let masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		let plotusToken = await PlotusToken.deployed();
		let BLOTInstance = await BLOT.deployed();
		let MockchainLinkInstance = await MockchainLinkBTC.deployed();
		let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
		let MockUniswapRouterInstance = await MockUniswapRouter.deployed();
		let plotusNewInstance = await Plotus.at(plotusNewAddress);
		let marketConfig = await plotusNewInstance.marketUtility();
		marketConfig = await MarketConfig.at(marketConfig);
		const openMarkets = await plotusNewInstance.getOpenMarkets();

		//console.log("marketType", openMarkets["_marketTypes"][0] / 1);
		marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
		await marketConfig.setMockPriceFlag(false);
		await increaseTime(10001);
		assert.ok(marketInstance);

		await MockchainLinkInstance.setLatestAnswer(1195000000000);
		let currentPriceAfter = await MockchainLinkInstance.latestAnswer();
		//console.log(currentPriceAfter / 1);

		await marketInstance.setOptionRangesPublic(11900, 12000);
		let priceOption1 = await marketInstance.getOptionPrice(1);
		let priceOption2 = await marketInstance.getOptionPrice(2);
		let priceOption3 = await marketInstance.getOptionPrice(3);
		//console.log(priceOption1 / 1, priceOption2 / 1, priceOption3 / 1);

		await MockUniswapRouterInstance.setPrice("12000000000000000");
		await marketConfig.setPrice("12000000000000000");

		await plotusToken.approve(marketInstance.address, "10000000000000000000000");
		await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 1, 1, {
			from: user1,
		});

		await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 2, 1, {
			from: user1,
		});

		await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 3, 1, {
			from: user1,
		});

		await increaseTime(360);
		let currentPriceAfter_af = await MockchainLinkInstance.latestAnswer();
		//console.log(currentPriceAfter_af / 1);
		let priceOption1_af = await marketInstance.getOptionPrice(1);
		let priceOption2_af = await marketInstance.getOptionPrice(2);
		let priceOption3_af = await marketInstance.getOptionPrice(3);
		let optionPriceETH1 = priceOption1_af / 1;
		let optionPriceLOT1 = priceOption1_af / tokenPrice;
		//console.log("Round off ETH price of option1", optionPriceETH1 / 1000);
		//console.log("Round off LOT price of option1", optionPriceLOT1 / 1000);
		let optionPriceETH2 = priceOption2_af / 1;
		let optionPriceLOT2 = priceOption2_af / 1 / tokenPrice;
		//console.log("Round off ETH price of option2", optionPriceETH2 / 1000);
		//console.log("Round off LOT price of option2", optionPriceLOT2 / 1000);
		let optionPriceETH3 = priceOption3_af / 1;
		let optionPriceLOT3 = priceOption3_af / 1 / tokenPrice;
		//console.log("Round off ETH price of option3", optionPriceETH3 / 1000);
		//console.log("Round off LOT price of option3", optionPriceLOT3 / 1000);

		assert.equal(parseFloat((optionPriceETH1 / 1000).toFixed(3)), 0.013);
		assert.equal(parseFloat((optionPriceETH2 / 1000).toFixed(3)), 0.027);
		assert.equal(parseFloat((optionPriceETH3 / 1000).toFixed(3)), 0.013);
		assert.equal(parseFloat((optionPriceLOT1 / 1000).toFixed(3)), 1.083);
		assert.equal(parseFloat((optionPriceLOT2 / 1000).toFixed(3)), 2.25);
		assert.equal(parseFloat((optionPriceLOT3 / 1000).toFixed(3)), 1.083);
	});
});

contract("Market", async function([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]) {
	it("3.Scenario 3 - Stake in LOT+ETH> minstake and time passed < min time passed", async () => {
		let tokenPrice = 0.012;
		let masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		let plotusToken = await PlotusToken.deployed();
		let BLOTInstance = await BLOT.deployed();
		let MockchainLinkInstance = await MockchainLinkBTC.deployed();
		let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
		let MockUniswapRouterInstance = await MockUniswapRouter.deployed();
		let plotusNewInstance = await Plotus.at(plotusNewAddress);
		let marketConfig = await plotusNewInstance.marketUtility();
		marketConfig = await MarketConfig.at(marketConfig);
		const openMarkets = await plotusNewInstance.getOpenMarkets();

		//console.log("marketType", openMarkets["_marketTypes"][0] / 1);
		marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
		await marketConfig.setMockPriceFlag(false);
		await increaseTime(10001);
		assert.ok(marketInstance);

		await MockchainLinkInstance.setLatestAnswer(1195000000000);
		let currentPriceAfter = await MockchainLinkInstance.latestAnswer();
		//console.log(currentPriceAfter / 1);

		await marketInstance.setOptionRangesPublic(11900, 12000);
		let priceOption1 = await marketInstance.getOptionPrice(1);
		let priceOption2 = await marketInstance.getOptionPrice(2);
		let priceOption3 = await marketInstance.getOptionPrice(3);
		//console.log(priceOption1 / 1, priceOption2 / 1, priceOption3 / 1);

		await MockUniswapRouterInstance.setPrice("12000000000000000");
		await marketConfig.setPrice("12000000000000000");

		await plotusToken.approve(marketInstance.address, "10000000000000000000000");
		await marketInstance.placePrediction(plotusToken.address, "1000000000000000000000", 1, 1, {
			from: user1,
		});

		await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 2, 1, {
			from: user1,
		});

		await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 3, 1, {
			from: user1,
		});

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "1000000000000000000", 1, 1, {
			value: "1000000000000000000",
			from: user1,
		});

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "10000000000000000000", 2, 1, {
			value: "10000000000000000000",
			from: user2,
		});

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "5000000000000000000", 3, 1, {
			value: "5000000000000000000",
			from: user2,
		});

		await increaseTime(360);
		let currentPriceAfter_af = await MockchainLinkInstance.latestAnswer();
		//console.log(currentPriceAfter_af / 1);
		let priceOption1_af = await marketInstance.getOptionPrice(1);
		let priceOption2_af = await marketInstance.getOptionPrice(2);
		let priceOption3_af = await marketInstance.getOptionPrice(3);
		let optionPriceETH1 = priceOption1_af / 1;
		let optionPriceLOT1 = priceOption1_af / tokenPrice;
		//console.log("Round off ETH price of option1", optionPriceETH1 / 1000);
		//console.log("Round off LOT price of option1", optionPriceLOT1 / 1000);
		let optionPriceETH2 = priceOption2_af / 1;
		let optionPriceLOT2 = priceOption2_af / 1 / tokenPrice;
		//console.log("Round off ETH price of option2", optionPriceETH2 / 1000);
		//console.log("Round off LOT price of option2", optionPriceLOT2 / 1000);
		let optionPriceETH3 = priceOption3_af / 1;
		let optionPriceLOT3 = priceOption3_af / 1 / tokenPrice;
		//console.log("Round off ETH price of option3", optionPriceETH3 / 1000);
		//console.log("Round off LOT price of option3", optionPriceLOT3 / 1000);

		assert.equal(parseFloat((optionPriceETH1 / 1000).toFixed(3)), 0.12);
		assert.equal(parseFloat((optionPriceETH2 / 1000).toFixed(3)), 0.119);
		assert.equal(parseFloat((optionPriceETH3 / 1000).toFixed(3)), 0.064);
		assert.equal(parseFloat((optionPriceLOT1 / 1000).toFixed(3)), 10.0);
		assert.equal(parseFloat((optionPriceLOT2 / 1000).toFixed(3)), 9.917);
		assert.equal(parseFloat((optionPriceLOT3 / 1000).toFixed(3)), 5.333);
	});
});

contract("Market", async function([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]) {
	it("4.Scenario 3 - Stake in LOT+ETH> minstake and time passed < min time passed", async () => {
		let tokenPrice = 0.012;
		let masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		let plotusToken = await PlotusToken.deployed();
		let BLOTInstance = await BLOT.deployed();
		let MockchainLinkInstance = await MockchainLinkBTC.deployed();
		let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
		let MockUniswapRouterInstance = await MockUniswapRouter.deployed();
		let plotusNewInstance = await Plotus.at(plotusNewAddress);
		let marketConfig = await plotusNewInstance.marketUtility();
		marketConfig = await MarketConfig.at(marketConfig);
		const openMarkets = await plotusNewInstance.getOpenMarkets();

		//console.log("marketType", openMarkets["_marketTypes"][0] / 1);
		marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
		await marketConfig.setMockPriceFlag(false);
		await increaseTime(10001);
		assert.ok(marketInstance);

		await MockchainLinkInstance.setLatestAnswer(1195000000000);
		let currentPriceAfter = await MockchainLinkInstance.latestAnswer();
		//console.log(currentPriceAfter / 1);

		await marketInstance.setOptionRangesPublic(11900, 12000);
		let priceOption1 = await marketInstance.getOptionPrice(1);
		let priceOption2 = await marketInstance.getOptionPrice(2);
		let priceOption3 = await marketInstance.getOptionPrice(3);
		//console.log(priceOption1 / 1, priceOption2 / 1, priceOption3 / 1);

		await MockUniswapRouterInstance.setPrice("12000000000000000");
		await marketConfig.setPrice("12000000000000000");

		await plotusToken.approve(marketInstance.address, "10000000000000000000000");
		await marketInstance.placePrediction(plotusToken.address, "1000000000000000000000", 1, 1, {
			from: user1,
		});

		await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 2, 1, {
			from: user1,
		});

		await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 3, 1, {
			from: user1,
		});

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "1000000000000000000", 1, 1, {
			value: "1000000000000000000",
			from: user1,
		});

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "10000000000000000000", 2, 1, {
			value: "10000000000000000000",
			from: user2,
		});

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "5000000000000000000", 3, 1, {
			value: "5000000000000000000",
			from: user2,
		});

		await increaseTime(360);
		let currentPriceAfter_af = await MockchainLinkInstance.latestAnswer();
		//console.log(currentPriceAfter_af / 1);
		let priceOption1_af = await marketInstance.getOptionPrice(1);
		let priceOption2_af = await marketInstance.getOptionPrice(2);
		let priceOption3_af = await marketInstance.getOptionPrice(3);
		let optionPriceETH1 = priceOption1_af / 1;
		let optionPriceLOT1 = priceOption1_af / tokenPrice;
		//console.log("Round off ETH price of option1", optionPriceETH1 / 1000);
		//console.log("Round off LOT price of option1", optionPriceLOT1 / 1000);
		let optionPriceETH2 = priceOption2_af / 1;
		let optionPriceLOT2 = priceOption2_af / 1 / tokenPrice;
		//console.log("Round off ETH price of option2", optionPriceETH2 / 1000);
		//console.log("Round off LOT price of option2", optionPriceLOT2 / 1000);
		let optionPriceETH3 = priceOption3_af / 1;
		let optionPriceLOT3 = priceOption3_af / 1 / tokenPrice;
		//console.log("Round off ETH price of option3", optionPriceETH3 / 1000);
		//console.log("Round off LOT price of option3", optionPriceLOT3 / 1000);

		assert.equal(parseFloat((optionPriceETH1 / 1000).toFixed(3)), 0.12);
		assert.equal(parseFloat((optionPriceETH2 / 1000).toFixed(3)), 0.119);
		assert.equal(parseFloat((optionPriceETH3 / 1000).toFixed(3)), 0.064);
		assert.equal(parseFloat((optionPriceLOT1 / 1000).toFixed(3)), 10);
		assert.equal(parseFloat((optionPriceLOT2 / 1000).toFixed(3)), 9.917);
		assert.equal(parseFloat((optionPriceLOT3 / 1000).toFixed(3)), 5.333);
	});
});

contract("Market", async function([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]) {
	it("5.Scenario 4 - Stake in LOT+ETH> minstake and time passed > min time passed", async () => {
		let tokenPrice = 0.012;
		let masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		let plotusToken = await PlotusToken.deployed();
		let BLOTInstance = await BLOT.deployed();
		let MockchainLinkInstance = await MockchainLinkBTC.deployed();
		let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
		let MockUniswapRouterInstance = await MockUniswapRouter.deployed();
		let plotusNewInstance = await Plotus.at(plotusNewAddress);
		let marketConfig = await plotusNewInstance.marketUtility();
		marketConfig = await MarketConfig.at(marketConfig);
		const openMarkets = await plotusNewInstance.getOpenMarkets();

		//console.log("marketType", openMarkets["_marketTypes"][0] / 1);
		marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
		await marketConfig.setMockPriceFlag(false);
		await increaseTime(10001);
		assert.ok(marketInstance);

		await MockchainLinkInstance.setLatestAnswer(1195000000000);
		let currentPriceAfter = await MockchainLinkInstance.latestAnswer();
		//console.log(currentPriceAfter / 1);

		await marketInstance.setOptionRangesPublic(11900, 12000);
		let priceOption1 = await marketInstance.getOptionPrice(1);
		let priceOption2 = await marketInstance.getOptionPrice(2);
		let priceOption3 = await marketInstance.getOptionPrice(3);
		//console.log(priceOption1 / 1, priceOption2 / 1, priceOption3 / 1);

		await MockUniswapRouterInstance.setPrice("12000000000000000");
		await marketConfig.setPrice("12000000000000000");

		await plotusToken.approve(marketInstance.address, "10000000000000000000000");
		await marketInstance.placePrediction(plotusToken.address, "1000000000000000000000", 1, 1, {
			from: user1,
		});

		await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 2, 1, {
			from: user1,
		});

		await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 3, 1, {
			from: user1,
		});

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "1000000000000000000", 1, 1, {
			value: "1000000000000000000",
			from: user1,
		});

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "10000000000000000000", 2, 1, {
			value: "10000000000000000000",
			from: user2,
		});

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "5000000000000000000", 3, 1, {
			value: "5000000000000000000",
			from: user2,
		});

		await increaseTime(1260);
		let currentPriceAfter_af = await MockchainLinkInstance.latestAnswer();
		//console.log(currentPriceAfter_af / 1);
		let priceOption1_af = await marketInstance.getOptionPrice(1);
		let priceOption2_af = await marketInstance.getOptionPrice(2);
		let priceOption3_af = await marketInstance.getOptionPrice(3);
		let optionPriceETH1 = priceOption1_af / 1;
		let optionPriceLOT1 = priceOption1_af / tokenPrice;
		//console.log("Round off ETH price of option1", optionPriceETH1 / 1000);
		//console.log("Round off LOT price of option1", optionPriceLOT1 / 1000);
		let optionPriceETH2 = priceOption2_af / 1;
		let optionPriceLOT2 = priceOption2_af / 1 / tokenPrice;
		//console.log("Round off ETH price of option2", optionPriceETH2 / 1000);
		//console.log("Round off LOT price of option2", optionPriceLOT2 / 1000);
		let optionPriceETH3 = priceOption3_af / 1;
		let optionPriceLOT3 = priceOption3_af / 1 / tokenPrice;
		//console.log("Round off ETH price of option3", optionPriceETH3 / 1000);
		//console.log("Round off LOT price of option3", optionPriceLOT3 / 1000);

		assert.equal(parseFloat(Math.floor((optionPriceETH1 / 1000) * 100) / 100), 0.13);
		assert.equal(parseFloat(Math.floor((optionPriceETH2 / 1000) * 100) / 100), 0.15);
		assert.equal(parseFloat(Math.floor((optionPriceETH3 / 1000) * 100) / 100), 0.08);
		assert.equal(parseInt(optionPriceLOT1 / 1000) , parseInt(11.33));
		assert.equal(parseInt(optionPriceLOT2 / 1000) , parseInt(12.5));
		assert.equal(parseInt(optionPriceLOT3 / 1000) , parseInt(6.66));
	});
});

contract("Market", async function([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]) {
	it("6.Scenario 5 - Stake in LOT+ETH> minstake and time passed > min time passed, max distance = 2", async () => {
		let tokenPrice = 0.012;
		let masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		let plotusToken = await PlotusToken.deployed();
		let BLOTInstance = await BLOT.deployed();
		let MockchainLinkInstance = await MockchainLinkBTC.deployed();
		let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
		let MockUniswapRouterInstance = await MockUniswapRouter.deployed();
		let plotusNewInstance = await Plotus.at(plotusNewAddress);
		let marketConfig = await plotusNewInstance.marketUtility();
		marketConfig = await MarketConfig.at(marketConfig);
		const openMarkets = await plotusNewInstance.getOpenMarkets();

		//console.log("marketType", openMarkets["_marketTypes"][0] / 1);
		marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
		await marketConfig.setMockPriceFlag(false);
		await increaseTime(10001);
		assert.ok(marketInstance);

		await MockchainLinkInstance.setLatestAnswer(1222000000000);
		let currentPriceAfter = await MockchainLinkInstance.latestAnswer();
		//console.log(currentPriceAfter / 1);

		await marketInstance.setOptionRangesPublic(11900, 12000);
		let priceOption1 = await marketInstance.getOptionPrice(1);
		let priceOption2 = await marketInstance.getOptionPrice(2);
		let priceOption3 = await marketInstance.getOptionPrice(3);
		//console.log(priceOption1 / 1, priceOption2 / 1, priceOption3 / 1);

		await MockUniswapRouterInstance.setPrice("12000000000000000");
		await marketConfig.setPrice("12000000000000000");

		await plotusToken.approve(marketInstance.address, "10000000000000000000000");
		await marketInstance.placePrediction(plotusToken.address, "1000000000000000000000", 1, 1, {
			from: user1,
		});

		await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 2, 1, {
			from: user1,
		});

		await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 3, 1, {
			from: user1,
		});

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "1000000000000000000", 1, 1, {
			value: "1000000000000000000",
			from: user1,
		});

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "10000000000000000000", 2, 1, {
			value: "10000000000000000000",
			from: user2,
		});

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "5000000000000000000", 3, 1, {
			value: "5000000000000000000",
			from: user2,
		});

		await increaseTime(1211);
		let currentPriceAfter_af = await MockchainLinkInstance.latestAnswer();
		//console.log(currentPriceAfter_af / 1);
		let priceOption1_af = await marketInstance.getOptionPrice(1);
		let priceOption2_af = await marketInstance.getOptionPrice(2);
		let priceOption3_af = await marketInstance.getOptionPrice(3);
		let optionPriceETH1 = priceOption1_af / 1;
		let optionPriceLOT1 = priceOption1_af / tokenPrice;
		//console.log("Round off ETH price of option1", optionPriceETH1 / 1000);
		//console.log("Round off LOT price of option1", optionPriceLOT1 / 1000);
		let optionPriceETH2 = priceOption2_af / 1;
		let optionPriceLOT2 = priceOption2_af / 1 / tokenPrice;
		//console.log("Round off ETH price of option2", optionPriceETH2 / 1000);
		//console.log("Round off LOT price of option2", optionPriceLOT2 / 1000);
		let optionPriceETH3 = priceOption3_af / 1;
		let optionPriceLOT3 = priceOption3_af / 1 / tokenPrice;
		//console.log("Round off ETH price of option3", optionPriceETH3 / 1000);
		//console.log("Round off LOT price of option3", optionPriceLOT3 / 1000);

		assert.equal(parseFloat(Math.floor((optionPriceETH1 / 1000) * 100) / 100), 0.12);
		assert.equal(parseFloat(Math.floor((optionPriceETH2 / 1000) * 100) / 100), 0.13);
		assert.equal((optionPriceETH3 / 1000).toFixed(2), (0.109).toFixed(2));
		assert.equal(parseInt(optionPriceLOT1 / 1000) , parseInt(10.5));
		expect(optionPriceLOT2 / 1000).to.be.closeTo(10.8, 11.2);//10.83
		expect(optionPriceLOT3 / 1000).to.be.closeTo(9, 9.4);//9.08
	});
});
contract("Market", async function([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]) {
	it("7.Scenario 7 - Stake in LOT+ETH> minstake and time passed > min time passed", async () => {
		let tokenPrice = 0.012;
		let masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		let plotusToken = await PlotusToken.deployed();
		let BLOTInstance = await BLOT.deployed();
		let MockchainLinkInstance = await MockchainLinkBTC.deployed();
		let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
		let MockUniswapRouterInstance = await MockUniswapRouter.deployed();
		let plotusNewInstance = await Plotus.at(plotusNewAddress);
		let marketConfig = await plotusNewInstance.marketUtility();
		marketConfig = await MarketConfig.at(marketConfig);
		const openMarkets = await plotusNewInstance.getOpenMarkets();

		//console.log("marketType", openMarkets["_marketTypes"][0] / 1);
		marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
		await marketConfig.setMockPriceFlag(false);
		await increaseTime(10001);
		assert.ok(marketInstance);

		await MockchainLinkInstance.setLatestAnswer(1195000000000);
		let currentPriceAfter = await MockchainLinkInstance.latestAnswer();
		//console.log(currentPriceAfter / 1);

		await marketInstance.setOptionRangesPublic(11900, 12000);
		let priceOption1 = await marketInstance.getOptionPrice(1);
		let priceOption2 = await marketInstance.getOptionPrice(2);
		let priceOption3 = await marketInstance.getOptionPrice(3);
		//console.log(priceOption1 / 1, priceOption2 / 1, priceOption3 / 1);

		await MockUniswapRouterInstance.setPrice("12000000000000000");
		await marketConfig.setPrice("12000000000000000");

		await plotusToken.approve(marketInstance.address, "10000000000000000000000");
		await marketInstance.placePrediction(plotusToken.address, "1000000000000000000000", 1, 1, {
			from: user1,
		});

		await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 2, 1, {
			from: user1,
		});

		await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 3, 1, {
			from: user1,
		});

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "1000000000000000000", 1, 1, {
			value: "1000000000000000000",
			from: user1,
		});

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "11000000000000000000", 2, 1, {
			value: "11000000000000000000",
			from: user2,
		});

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "5000000000000000000", 3, 1, {
			value: "5000000000000000000",
			from: user2,
		});

		await increaseTime(1211);
		let currentPriceAfter_af = await MockchainLinkInstance.latestAnswer();
		//console.log(currentPriceAfter_af / 1);
		let priceOption1_af = await marketInstance.getOptionPrice(1);
		let priceOption2_af = await marketInstance.getOptionPrice(2);
		let priceOption3_af = await marketInstance.getOptionPrice(3);
		let optionPriceETH1 = priceOption1_af / 1;
		let optionPriceLOT1 = priceOption1_af / tokenPrice;
		//console.log("Round off ETH price of option1", optionPriceETH1 / 1000);
		//console.log("Round off LOT price of option1", optionPriceLOT1 / 1000);
		let optionPriceETH2 = priceOption2_af / 1;
		let optionPriceLOT2 = priceOption2_af / 1 / tokenPrice;
		//console.log("Round off ETH price of option2", optionPriceETH2 / 1000);
		//console.log("Round off LOT price of option2", optionPriceLOT2 / 1000);
		let optionPriceETH3 = priceOption3_af / 1;
		let optionPriceLOT3 = priceOption3_af / 1 / tokenPrice;
		//console.log("Round off ETH price of option3", optionPriceETH3 / 1000);
		//console.log("Round off LOT price of option3", optionPriceLOT3 / 1000);

		assert.equal(parseFloat(Math.floor((optionPriceETH1 / 1000) * 100) / 100), 0.13);
		assert.equal(parseFloat(Math.floor((optionPriceETH2 / 1000) * 100) / 100), 0.15);
		assert.equal((optionPriceETH3 / 1000).toFixed(2), (0.078).toFixed(2));
		assert.equal(parseInt(optionPriceLOT1 / 1000), parseInt(11));
		expect(optionPriceLOT2 / 1000).to.be.closeTo(12.9, 13.3);//12.917
		expect(optionPriceLOT3 / 1000).to.be.closeTo(6.5, 6.7);//6.5
	});
});
contract("Market", async function([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]) {
	it("8.Scenario 8 - Stake in LOT+ETH> minstake and time passed > min time passed, max distance = 2 OPTION 1", async () => {
		let tokenPrice = 0.012;
		let masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		let plotusToken = await PlotusToken.deployed();
		let BLOTInstance = await BLOT.deployed();
		let MockchainLinkInstance = await MockchainLinkBTC.deployed();
		let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
		let MockUniswapRouterInstance = await MockUniswapRouter.deployed();
		let plotusNewInstance = await Plotus.at(plotusNewAddress);
		let marketConfig = await plotusNewInstance.marketUtility();
		marketConfig = await MarketConfig.at(marketConfig);
		const openMarkets = await plotusNewInstance.getOpenMarkets();

		//console.log("marketType", openMarkets["_marketTypes"][0] / 1);
		marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
		await marketConfig.setMockPriceFlag(false);
		await increaseTime(10001);
		assert.ok(marketInstance);

		await MockchainLinkInstance.setLatestAnswer(1155000000000);
		let currentPriceAfter = await MockchainLinkInstance.latestAnswer();
		//console.log(currentPriceAfter / 1);

		await marketInstance.setOptionRangesPublic(11900, 12000);
		let priceOption1 = await marketInstance.getOptionPrice(1);
		let priceOption2 = await marketInstance.getOptionPrice(2);
		let priceOption3 = await marketInstance.getOptionPrice(3);
		//console.log(priceOption1 / 1, priceOption2 / 1, priceOption3 / 1);

		await MockUniswapRouterInstance.setPrice("12000000000000000");
		await marketConfig.setPrice("12000000000000000");

		await plotusToken.approve(marketInstance.address, "10000000000000000000000");
		await marketInstance.placePrediction(plotusToken.address, "1000000000000000000000", 1, 1, {
			from: user1,
		});

		await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 2, 1, {
			from: user1,
		});

		await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 3, 1, {
			from: user1,
		});

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "1000000000000000000", 1, 1, {
			value: "1000000000000000000",
			from: user1,
		});

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "11000000000000000000", 2, 1, {
			value: "11000000000000000000",
			from: user2,
		});

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "5000000000000000000", 3, 1, {
			value: "5000000000000000000",
			from: user2,
		});

		await increaseTime(1211);
		let currentPriceAfter_af = await MockchainLinkInstance.latestAnswer();
		////console.log(currentPriceAfter_af / 1);
		let priceOption1_af = await marketInstance.getOptionPrice(1);
		let priceOption2_af = await marketInstance.getOptionPrice(2);
		let priceOption3_af = await marketInstance.getOptionPrice(3);
		let optionPriceETH1 = priceOption1_af / 1;
		let optionPriceLOT1 = priceOption1_af / tokenPrice;
		//console.log("Round off ETH price of option1", optionPriceETH1 / 1000);
		//console.log("Round off LOT price of option1", optionPriceLOT1 / 1000);
		let optionPriceETH2 = priceOption2_af / 1;
		let optionPriceLOT2 = priceOption2_af / 1 / tokenPrice;
		//console.log("Round off ETH price of option2", optionPriceETH2 / 1000);
		//console.log("Round off LOT price of option2", optionPriceLOT2 / 1000);
		let optionPriceETH3 = priceOption3_af / 1;
		let optionPriceLOT3 = priceOption3_af / 1 / tokenPrice;
		//console.log("Round off ETH price of option3", optionPriceETH3 / 1000);
		//console.log("Round off LOT price of option3", optionPriceLOT3 / 1000);

		assert.equal(parseFloat(Math.floor((optionPriceETH1 / 1000) * 100) / 100), 0.16);
		assert.equal(parseFloat(Math.floor((optionPriceETH2 / 1000) * 100) / 100), 0.13);
		assert.equal((optionPriceETH3 / 1000).toFixed(2), (0.068).toFixed(2));
		assert.equal(parseInt(optionPriceLOT1 / 1000) , parseInt(13.41));
		assert.equal(parseInt(optionPriceLOT2 / 1000) , parseInt(11.33));
		assert.equal(parseInt(optionPriceLOT3 / 1000) , parseInt(5.66));
	});
});
