const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("MarketRegistry");
const Master = artifacts.require("Master");
const PlotusToken = artifacts.require("MockPLOT");
const MarketConfig = artifacts.require("MockConfig");
const MockchainLinkBTC = artifacts.require("MockChainLinkAggregator");
const BLOT = artifacts.require("BLOT");
const web3 = Market.web3;
const increaseTime = require("./utils/increaseTime.js").increaseTime;

contract("Market", async function([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]) {
	it("1.Scenario 1 - Stake in ETH < minstake (no stake in LOT) and time passed < min time passed", async () => {
		let tokenPrice = 0.01;
		let masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		let plotusToken = await PlotusToken.deployed();
		let BLOTInstance = await BLOT.deployed();
		let MockchainLinkInstance = await MockchainLinkBTC.deployed();
		let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
		let plotusNewInstance = await Plotus.at(plotusNewAddress);
		let marketConfig = await plotusNewInstance.marketUtility();
		marketConfig = await MarketConfig.at(marketConfig);
		const openMarkets = await plotusNewInstance.getOpenMarkets();
		//console.log("marketType", openMarkets["_marketTypes"][2] / 1);
		marketInstance = await Market.at(openMarkets["_openMarkets"][2]);
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

		await increaseTime(7200);
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
	});
});

contract("Market", async function([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]) {
	it("2.Scenario 2 - Stake in LOT< minstake (no stake in ETH) and time passed < min time passed", async () => {
		let tokenPrice = 0.01;
		let masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		let plotusToken = await PlotusToken.deployed();
		let BLOTInstance = await BLOT.deployed();
		let MockchainLinkInstance = await MockchainLinkBTC.deployed();
		let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
		let plotusNewInstance = await Plotus.at(plotusNewAddress);
		let marketConfig = await plotusNewInstance.marketUtility();
		marketConfig = await MarketConfig.at(marketConfig);
		const openMarkets = await plotusNewInstance.getOpenMarkets();
		//console.log("marketType", openMarkets["_marketTypes"][2] / 1);
		marketInstance = await Market.at(openMarkets["_openMarkets"][2]);
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

		// await marketConfig.setAMLComplianceStatus(user1, true);
		// await marketConfig.setAMLComplianceStatus(user2, true);
		// await marketConfig.setAMLComplianceStatus(user3, true);
		// await marketConfig.setAMLComplianceStatus(user4, true);
		// await marketConfig.setAMLComplianceStatus(user5, true);

		// await marketConfig.setKYCComplianceStatus(user1, true);
		// await marketConfig.setKYCComplianceStatus(user2, true);
		// await marketConfig.setKYCComplianceStatus(user3, true);
		// await marketConfig.setKYCComplianceStatus(user4, true);
		// await marketConfig.setKYCComplianceStatus(user5, true);

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

		await increaseTime(7200);
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
	});
});

contract("Market", async function([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]) {
	it("3.Scenario 3 - Stake in LOT+ETH> minstake and time passed < min time passed", async () => {
		let tokenPrice = 0.01;
		let masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		let plotusToken = await PlotusToken.deployed();
		let BLOTInstance = await BLOT.deployed();
		let MockchainLinkInstance = await MockchainLinkBTC.deployed();
		let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
		let plotusNewInstance = await Plotus.at(plotusNewAddress);
		let marketConfig = await plotusNewInstance.marketUtility();
		marketConfig = await MarketConfig.at(marketConfig);
		const openMarkets = await plotusNewInstance.getOpenMarkets();
		//console.log("marketType", openMarkets["_marketTypes"][2] / 1);
		marketInstance = await Market.at(openMarkets["_openMarkets"][2]);
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

		// await marketConfig.setAMLComplianceStatus(user1, true);
		// await marketConfig.setAMLComplianceStatus(user2, true);
		// await marketConfig.setAMLComplianceStatus(user3, true);
		// await marketConfig.setAMLComplianceStatus(user4, true);
		// await marketConfig.setAMLComplianceStatus(user5, true);

		// await marketConfig.setKYCComplianceStatus(user1, true);
		// await marketConfig.setKYCComplianceStatus(user2, true);
		// await marketConfig.setKYCComplianceStatus(user3, true);
		// await marketConfig.setKYCComplianceStatus(user4, true);
		// await marketConfig.setKYCComplianceStatus(user5, true);

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

		await increaseTime(7200);
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
	});
});

contract("Market", async function([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]) {
	it("4.Scenario 3 - Stake in LOT+ETH> minstake and time passed < min time passed", async () => {
		let tokenPrice = 0.01;
		let masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		let plotusToken = await PlotusToken.deployed();
		let BLOTInstance = await BLOT.deployed();
		let MockchainLinkInstance = await MockchainLinkBTC.deployed();
		let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
		let plotusNewInstance = await Plotus.at(plotusNewAddress);
		let marketConfig = await plotusNewInstance.marketUtility();
		marketConfig = await MarketConfig.at(marketConfig);
		const openMarkets = await plotusNewInstance.getOpenMarkets();
		//console.log("marketType", openMarkets["_marketTypes"][2] / 1);
		marketInstance = await Market.at(openMarkets["_openMarkets"][2]);
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

		// await marketConfig.setAMLComplianceStatus(user1, true);
		// await marketConfig.setAMLComplianceStatus(user2, true);
		// await marketConfig.setAMLComplianceStatus(user3, true);
		// await marketConfig.setAMLComplianceStatus(user4, true);
		// await marketConfig.setAMLComplianceStatus(user5, true);

		// await marketConfig.setKYCComplianceStatus(user1, true);
		// await marketConfig.setKYCComplianceStatus(user2, true);
		// await marketConfig.setKYCComplianceStatus(user3, true);
		// await marketConfig.setKYCComplianceStatus(user4, true);
		// await marketConfig.setKYCComplianceStatus(user5, true);

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

		await increaseTime(7200);
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
	});
});

contract("Market", async function([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]) {
	it("5.Scenario 4 - Stake in LOT+ETH> minstake and time passed > min time passed", async () => {
		let tokenPrice = 0.01;
		let masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		let plotusToken = await PlotusToken.deployed();
		let BLOTInstance = await BLOT.deployed();
		let MockchainLinkInstance = await MockchainLinkBTC.deployed();
		let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
		let plotusNewInstance = await Plotus.at(plotusNewAddress);
		let marketConfig = await plotusNewInstance.marketUtility();
		marketConfig = await MarketConfig.at(marketConfig);
		const openMarkets = await plotusNewInstance.getOpenMarkets();
		//console.log("marketType", openMarkets["_marketTypes"][2] / 1);
		marketInstance = await Market.at(openMarkets["_openMarkets"][2]);
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

		// await marketConfig.setAMLComplianceStatus(user1, true);
		// await marketConfig.setAMLComplianceStatus(user2, true);
		// await marketConfig.setAMLComplianceStatus(user3, true);
		// await marketConfig.setAMLComplianceStatus(user4, true);
		// await marketConfig.setAMLComplianceStatus(user5, true);

		// await marketConfig.setKYCComplianceStatus(user1, true);
		// await marketConfig.setKYCComplianceStatus(user2, true);
		// await marketConfig.setKYCComplianceStatus(user3, true);
		// await marketConfig.setKYCComplianceStatus(user4, true);
		// await marketConfig.setKYCComplianceStatus(user5, true);

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

		await increaseTime(25200);
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
	});
});

contract("Market", async function([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]) {
	it("6.Scenario 5 - Stake in LOT+ETH> minstake and time passed > min time passed, max distance = 2", async () => {
		let tokenPrice = 0.01;
		let masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		let plotusToken = await PlotusToken.deployed();
		let BLOTInstance = await BLOT.deployed();
		let MockchainLinkInstance = await MockchainLinkBTC.deployed();
		let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
		let plotusNewInstance = await Plotus.at(plotusNewAddress);
		let marketConfig = await plotusNewInstance.marketUtility();
		marketConfig = await MarketConfig.at(marketConfig);
		const openMarkets = await plotusNewInstance.getOpenMarkets();
		//console.log("marketType", openMarkets["_marketTypes"][2] / 1);
		marketInstance = await Market.at(openMarkets["_openMarkets"][2]);
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

		// await marketConfig.setAMLComplianceStatus(user1, true);
		// await marketConfig.setAMLComplianceStatus(user2, true);
		// await marketConfig.setAMLComplianceStatus(user3, true);
		// await marketConfig.setAMLComplianceStatus(user4, true);
		// await marketConfig.setAMLComplianceStatus(user5, true);

		// await marketConfig.setKYCComplianceStatus(user1, true);
		// await marketConfig.setKYCComplianceStatus(user2, true);
		// await marketConfig.setKYCComplianceStatus(user3, true);
		// await marketConfig.setKYCComplianceStatus(user4, true);
		// await marketConfig.setKYCComplianceStatus(user5, true);

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

		await increaseTime(25200);
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
	});
});
