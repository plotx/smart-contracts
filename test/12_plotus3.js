const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("MarketRegistry");
const Master = artifacts.require("Master");
const MarketConfig = artifacts.require("MockConfig");
const PlotusToken = artifacts.require("MockPLOT");
const BLOT = artifacts.require("BLOT");
const MockUniswapRouter = artifacts.require("MockUniswapRouter");
const BigNumber = require("bignumber.js");

const web3 = Market.web3;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
// get etherum accounts
// swap ether with LOT

contract("Market", async function([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]) {
	it("Place the prediction with ether", async () => {
		masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		plotusToken = await PlotusToken.deployed();
		BLOTInstance = await BLOT.deployed();
		MockUniswapRouterInstance = await MockUniswapRouter.deployed();
		plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
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
		await marketConfig.setOptionPrice(1, 9);
		await marketConfig.setOptionPrice(2, 18);
		await marketConfig.setOptionPrice(3, 27);

		// set price
		// user 1
		// set price lot
		await MockUniswapRouterInstance.setPrice("1000000000000000");
		await marketConfig.setPrice("1000000000000000");
		await plotusToken.approve(openMarkets["_openMarkets"][0], "100000000000000000000", {
			from: user1,
		});
		await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 1, 1, { from: user1 });

		// user 2
		await MockUniswapRouterInstance.setPrice("2000000000000000");
		await marketConfig.setPrice("2000000000000000");
		await plotusToken.transfer(user2, "500000000000000000000");

		await plotusToken.approve(openMarkets["_openMarkets"][0], "400000000000000000000", {
			from: user2,
		});
		await marketInstance.placePrediction(plotusToken.address, "400000000000000000000", 1, 2, { from: user2 });
		// user 3
		await MockUniswapRouterInstance.setPrice("1000000000000000");
		await marketConfig.setPrice("1000000000000000");
		await plotusToken.transfer(user3, "500000000000000000000");
		await plotusToken.approve(openMarkets["_openMarkets"][0], "210000000000000000000", {
			from: user3,
		});
		await marketInstance.placePrediction(plotusToken.address, "210000000000000000000", 1, 2, { from: user3 });
		await MockUniswapRouterInstance.setPrice("15000000000000000");
		await marketConfig.setPrice("15000000000000000");

		await plotusToken.transfer(user4, "200000000000000000000");

		await plotusToken.approve(openMarkets["_openMarkets"][0], "123000000000000000000", {
			from: user4,
		});
		await marketInstance.placePrediction(plotusToken.address, "123000000000000000000", 1, 3, { from: user4 });

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

		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "1000000000000000000", 1, 2, {
			value: "1000000000000000000",
			from: user7,
		});
		// user 8
		await MockUniswapRouterInstance.setPrice("45000000000000000");
		await marketConfig.setPrice("45000000000000000");
		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "3000000000000000000", 1, 3, {
			value: "3000000000000000000",
			from: user8,
		});
		// user 9
		await MockUniswapRouterInstance.setPrice("51000000000000000");
		await marketConfig.setPrice("51000000000000000");
		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "1000000000000000000", 1, 1, {
			value: "1000000000000000000",
			from: user9,
		});
		// user 10
		await MockUniswapRouterInstance.setPrice("12000000000000000");
		await marketConfig.setPrice("12000000000000000");
		await marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "2000000000000000000", 1, 4, {
			value: "2000000000000000000",
			from: user10,
		});
	});

	it("1.Prediction Points allocated properly in ether", async () => {
		accounts = [user1, user2, user3, user4, user5, user6, user7, user8, user9, user10];
		options = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
		getPredictionPoints = async (user, option, expected) => {
			// return Prediction points of user
			let PredictionPoins = await marketInstance.getUserPredictionPoints(user, option);
			PredictionPoins = PredictionPoins / 1;
			return PredictionPoins;
		};
		PredictionPointsExpected = [
			3.511006943,
			166.8345382,
			22.43778204,
			918.2061216,
			510.3446361,
			1882.790363,
			232.9834208,
			1902.398719,
			110.9444861,
			1443.472612,
		];

		// console.log("Prediction points for user 1");
		// PredictionPointsUser1 = await getPredictionPoints(accounts[0], options[0]);
		// PredictionPointsUser3 = await getPredictionPoints(accounts[2], options[2]);

		// console.log(
		//   `Prediction points : ${PredictionPointsUser1} expected : ${PredictionPointsExpected[0]} `
		// );
		// console.log("Prediction points for user 3");
		// console.log(
		//   `Prediction points : ${PredictionPointsUser3} expected : ${PredictionPointsExpected[2]} `
		// );

		for (let index = 0; index < 10; index++) {
			let PredictionPoints = await getPredictionPoints(accounts[index], options[index]);
			PredictionPoints = PredictionPoints / 1000;
			PredictionPoints = PredictionPoints.toFixed(1);
			await assert.equal(PredictionPoints, PredictionPointsExpected[index].toFixed(1));

			// await assert.isTrue(
			//    === PredictionPointsExpected[index]
			// );
		}
		// console.log(await plotusToken.balanceOf(user1));

		// pool balance
		// console.log(parseFloat(web3.utils.fromWei(await plotusToken.balanceOf(plotusNewInstance.address))));

		// close market
		await increaseTime(36001);
		await marketInstance.calculatePredictionResult(1);
		await increaseTime(36001);
		// plotus contract balance eth balance

		plotusBalanceBefore = web3.utils.fromWei(await web3.eth.getBalance(plotusNewAddress));
		lotBalanceBefore = await plotusToken.balanceOf(openMarkets["_openMarkets"][0]);
		assert.equal(parseFloat(plotusBalanceBefore), 0.01);
		assert.equal(parseFloat(web3.utils.fromWei(lotBalanceBefore)).toFixed(2), (832.5835).toFixed(2));

		await MockUniswapRouterInstance.setPrice("1000000000000000");
		await marketConfig.setPrice("1000000000000000");
		await increaseTime(360001);

		plotusBalanceAfter = web3.utils.fromWei(await web3.eth.getBalance(plotusNewAddress));
		lotBalanceAfter = await plotusToken.balanceOf(openMarkets["_openMarkets"][0]);
		assert.equal(parseFloat(plotusBalanceBefore), 0.01);
		assert.equal(parseFloat(web3.utils.fromWei(lotBalanceAfter)).toFixed(2), (832.5835).toFixed(2));
		assert.equal(parseFloat(web3.utils.fromWei(String(parseFloat(lotBalanceAfter) - parseFloat(lotBalanceBefore)))).toFixed(2), (0).toFixed(2));
	});

	it("2.check total return for each user Prediction values in eth", async () => {
		accounts = [user1, user2, user3, user4, user5, user6, user7, user8, user9, user10];
		options = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
		getReturnsInEth = async (user) => {
			// return userReturn in eth
			const response = await marketInstance.getReturn(user);
			let returnAmountInEth = web3.utils.fromWei(response[0][1]);
			return returnAmountInEth;
		};

		const returnInEthExpected = [0, 0, 0, 0, 0.999, 1.998, 0.999, 2.997, 0.999, 1.998];
		// calulate  rewards for every user in eth

		for (let index = 0; index < 10; index++) {
			// check eth returns
			let returns = await getReturnsInEth(accounts[index]);
			assert.equal(parseFloat(returns).toFixed(2), returnInEthExpected[index].toFixed(2));
			// commented by parv as already added assert
			// console.log("Rewards in Eth");
			// console.log(`return : ${returns} Expected :${returnInEthExpected[index]}`);
		}
	});
	it("3.Check User Recived The appropriate amount", async () => {
		accounts = [user1, user2, user3, user4, user5, user6, user7, user8, user9, user10];
		const totalReturnLotExpexted = [99.9, 399.8, 209.895, 122.9385, 0, 0, 0, 0, 0, 0];
		const returnInEthExpected = [0, 0, 0, 0, 0.999, 1.998, 0.999, 2.997, 0.999, 1.998];


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
			assert.equal(diff*1, expectedInEth*1);

			diffToken = afterClaimToken - beforeClaimToken;
			diffToken = diffToken / conv;
			diffToken = diffToken.toFixed(1);
			expectedInLot = totalReturnLotExpexted[accounts.indexOf(account)].toFixed(1);
			assert.equal(diffToken, expectedInLot);
		}
	});
	// it("4. Market should have 0 balance after all claims", async () => {
	// 	// console.log("Market Balance after claim" + (await web3.eth.getBalance(marketInstance.address)) / 1);
	// 	assert.equal(parseFloat(await web3.eth.getBalance(marketInstance.address)), 0, "Market Balance must be 0 after all claims");
	// });
	it("5. Option price must be 0 after expire time", async () => {
		await marketConfig.setMockPriceFlag(false);
		let marketData = await marketInstance.getData();
		let optionPrice1 = parseFloat(marketData._optionPrice[0]);
		let optionPrice2 = parseFloat(marketData._optionPrice[1]);
		let optionPrice3 = parseFloat(marketData._optionPrice[2]);
		assert.equal(optionPrice1, 0);
		assert.equal(optionPrice2, 0);
		assert.equal(optionPrice3, 0);
	});
});
