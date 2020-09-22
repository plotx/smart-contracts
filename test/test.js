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
			console.log(plotusToken.address);
			let tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
			let tokenController = await TokenController.at(tokenControllerAdd);
			let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			let plotusNewInstance = await Plotus.at(plotusNewAddress);
			const openMarkets = await plotusNewInstance.getOpenMarkets();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
			marketConfig = await plotusNewInstance.marketUtility();
			marketConfig = await MarketConfig.at(marketConfig);
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

			await marketConfig.setAMLComplianceStatus(user1, true);
			await marketConfig.setAMLComplianceStatus(user2, true);
			await marketConfig.setAMLComplianceStatus(user3, true);
			await marketConfig.setAMLComplianceStatus(user4, true);
			await marketConfig.setAMLComplianceStatus(user5, true);

			await marketConfig.setKYCComplianceStatus(user1, true);
			await marketConfig.setKYCComplianceStatus(user2, true);
			await marketConfig.setKYCComplianceStatus(user3, true);
			await marketConfig.setKYCComplianceStatus(user4, true);
			await marketConfig.setKYCComplianceStatus(user5, true);

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

			await marketConfig.setOptionPrice(1, 9);
			await marketConfig.setOptionPrice(2, 18);
			await marketConfig.setOptionPrice(3, 27);

			await marketConfig.setAMLComplianceStatus(user1, true);
			await marketConfig.setAMLComplianceStatus(user2, true);
			await marketConfig.setAMLComplianceStatus(user3, true);
			await marketConfig.setAMLComplianceStatus(user4, true);
			await marketConfig.setAMLComplianceStatus(user5, true);

			await marketConfig.setKYCComplianceStatus(user1, true);
			await marketConfig.setKYCComplianceStatus(user2, true);
			await marketConfig.setKYCComplianceStatus(user3, true);
			await marketConfig.setKYCComplianceStatus(user4, true);
			await marketConfig.setKYCComplianceStatus(user5, true);

			await plotusToken.approve(marketInstance.address, "10000000000000000000000");
			let tx = await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 2, 1, {
				from: user1,
			});
			console.log(tx.receipt.gasUsed);
			await plotusToken.approve(marketInstance.address, "10000000000000000000000", { from: user2 });
			tx = await marketInstance.placePrediction(plotusToken.address, "400000000000000000000", 2, 2, {
				from: user2,
			});
			console.log(tx.receipt.gasUsed);
			await plotusToken.approve(marketInstance.address, "10000000000000000000000", { from: user3 });
			tx = await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 1, 3, {
				from: user3,
			});
			console.log(tx.receipt.gasUsed);
			await plotusToken.approve(marketInstance.address, "10000000000000000000000", { from: user4 });
			await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 3, 4, {
				from: user4,
			});
			await plotusToken.approve(marketInstance.address, "10000000000000000000000", { from: user5 });
			await marketInstance.placePrediction(plotusToken.address, "10000000000000000000", 3, 4, {
				from: user5,
			});
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

			await marketConfig.setOptionPrice(1, 9);
			await marketConfig.setOptionPrice(2, 18);
			await marketConfig.setOptionPrice(3, 27);

			await marketConfig.setAMLComplianceStatus(user1, true);
			await marketConfig.setAMLComplianceStatus(user2, true);
			await marketConfig.setAMLComplianceStatus(user3, true);
			await marketConfig.setAMLComplianceStatus(user4, true);
			await marketConfig.setAMLComplianceStatus(user5, true);

			await marketConfig.setKYCComplianceStatus(user1, true);
			await marketConfig.setKYCComplianceStatus(user2, true);
			await marketConfig.setKYCComplianceStatus(user3, true);
			await marketConfig.setKYCComplianceStatus(user4, true);
			await marketConfig.setKYCComplianceStatus(user5, true);

			let tx = await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("10"), 1, 4, {
				from: user1,
				value: web3.utils.toWei("10"),
			});
			console.log(tx.receipt.gasUsed);
			tx = await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("10"), 2, 4, {
				from: user1,
				value: web3.utils.toWei("10"),
			});
			console.log(tx.receipt.gasUsed);
			tx = await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", web3.utils.toWei("10"), 2, 5, {
				from: user2,
				value: web3.utils.toWei("10"),
			});
			console.log(tx.receipt.gasUsed);
			

		});
		it("Create market", async()=> {
			await increaseTime(3600);
			tx = await plotusNewInstance.createMarket(0,0);
			console.log(tx.receipt.gasUsed);
		});
	});
});

