const { assert } = require("chai");

const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("MarketRegistry");
const Master = artifacts.require("Master");
const Referral = artifacts.require("Referral");
const ReferralV2 = artifacts.require("ReferralV2");
const MarketConfig = artifacts.require("MockConfig");
const PlotusToken = artifacts.require("MockPLOT");
const TokenController = artifacts.require("TokenController");
const BLOT = artifacts.require("BLOT");
const MockUniswapRouter = artifacts.require("MockUniswapRouter");
const BigNumber = require("bignumber.js");
const encode1 = require("./utils/encoder.js").encode1;

const web3 = Market.web3;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const assertRevert = require("./utils/assertRevert.js").assertRevert;
const latestTime = require("./utils/latestTime.js").latestTime;
const { toHex, toWei } = require("./utils/ethTools.js");

const nullAddress = "0x0000000000000000000000000000000000000000";
const adminPrivateKey = "0xfb437e3e01939d9d4fef43138249f23dc1d0852e69b0b5d1647c087f869fabbd";
// get etherum accounts
// swap ether with LOT
let refferal;
contract("Referral", async function([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10, user11]) {
	it("Place the prediction with ether", async () => {
		masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		plotusToken = await PlotusToken.deployed();
		BLOTInstance = await BLOT.at(await masterInstance.getLatestAddress(web3.utils.toHex("BL")));
		MockUniswapRouterInstance = await MockUniswapRouter.deployed();
		plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
		tokenController  =await TokenController.at(await masterInstance.getLatestAddress(web3.utils.toHex("TC")));
		plotusNewInstance = await Plotus.at(plotusNewAddress);
		marketConfig = await plotusNewInstance.marketUtility();
		marketConfig = await MarketConfig.at(marketConfig);
		// console.log(await plotusNewInstance.getOpenMarkets());
		openMarkets = await plotusNewInstance.getOpenMarkets();
		let  endDate = (await latestTime())/1+(24*3600);
		let refferalAmount = toWei("400");
		refferal = await Referral.new(plotusToken.address, BLOTInstance.address, user1, endDate, toWei("1000"), refferalAmount);

		await BLOTInstance.addMinter(refferal.address);

		await plotusToken.transfer(refferal.address,toWei("1000"));

		// await refferal.refferalBLot([user2,user4],["400000000000000000000","124000000000000000000"]);
		// console.log(`OpenMaket : ${openMarkets["_openMarkets"][0]}`);

		marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
		await increaseTime(10001);
		assert.ok(marketInstance);

		// setting option price in eth
		await marketConfig.setOptionPrice(1, 9);
		await marketConfig.setOptionPrice(2, 18);
		await marketConfig.setOptionPrice(3, 27);

		await assertRevert(marketInstance.calculatePredictionResult(1)); //should revert as market is in live status

		// set price
		// user 1
		// set price lot
		await MockUniswapRouterInstance.setPrice("1000000000000000");
		await marketConfig.setPrice("1000000000000000");
		await plotusToken.approve(tokenController.address, "100000000000000000000", {
			from: user1,
		});
		await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 2, 1, { from: user1 });

		// user 2
		await MockUniswapRouterInstance.setPrice("2000000000000000");
		await marketConfig.setPrice("2000000000000000");
		// await plotusToken.transfer(user2, "500000000000000000000");

		// await plotusToken.approve(
		//   openMarkets["_openMarkets"][0],
		//   "400000000000000000000",
		//   {
		//     from: user2,
		//   }
		// );
		// await marketInstance.placePrediction(
		//   plotusToken.address,
		//   "400000000000000000000",
		//   2,
		//   2,
		//   { from: user2 }
		// );
		await plotusToken.approve(BLOTInstance.address, "4000000000000000000000");
		// await BLOTInstance.mint(user2, "400000000000000000000");
		let hash = (await web3.eth.abi.encodeParameter("address",user2));
		let signedHash = (await web3.eth.accounts.sign(hash, adminPrivateKey));

		await refferal.claim(signedHash.v, signedHash.r, signedHash.s, {from:user2});
		let balance = await BLOTInstance.balanceOf(user2);
		assert.equal(balance/1,refferalAmount, "Incorrect referral amount");
		// await BLOTInstance.transferFrom(user1, user2, "500000000000000000000", {
		//   from: user1,
		// });

		// await BLOTInstance.approve(openMarkets["_openMarkets"][0], "400000000000000000000", {
		// 	from: user2,
		// });
		// console.log(await BLOTInstance.balanceOf(user1));
		// await BLOTInstance.addMinter(marketInstance.address);
		await marketInstance.placePrediction(BLOTInstance.address, "400000000000000000000", 2, 5, { from: user2 });
		let flags = await marketInstance.getUserFlags(user2);
		assert.equal(flags[1], true);
		// user 3
		await MockUniswapRouterInstance.setPrice("1000000000000000");
		await marketConfig.setPrice("1000000000000000");
		await plotusToken.transfer(user3, "500000000000000000000");
		await plotusToken.approve(tokenController.address, "210000000000000000000", {
			from: user3,
		});

		await assertRevert(marketInstance.placePrediction(user10, "210000000000000000000", 2, 2, { from: user3 })); //should revert as assert not valid
		await assertRevert(marketInstance.placePrediction(plotusToken.address, "210000000000000000000", 2, 2, { from: user3, value: "100" })); // should revert as passing value
		await assertRevert(marketInstance.placePrediction(plotusToken.address, "1", 2, 2, { from: user3 })); // should revert as prediction amount is less than min required prediction
		// try {
		// 	await marketInstance.placePrediction(plotusToken.address, "600000000000000000000", 2, 2, { from: user3 }); // should revert as user do not have enough asset
		// 	assert.fail();
		// } catch (e) {
		// 	console.log(e);
		// }

		await marketInstance.placePrediction(plotusToken.address, "210000000000000000000", 2, 2, { from: user3 });
		// user 4
		await MockUniswapRouterInstance.setPrice("15000000000000000");
		await marketConfig.setPrice("15000000000000000");

		await plotusToken.approve(BLOTInstance.address, "124000000000000000000");
		// await BLOTInstance.mint(user4, "124000000000000000000");
		await assertRevert(refferal.claim(signedHash.v, signedHash.r, signedHash.s, {from:user4}));
		hash = (await web3.eth.abi.encodeParameter("address",user4));
		signedHash = (await web3.eth.accounts.sign(hash, adminPrivateKey));

		await refferal.claim(signedHash.v, signedHash.r, signedHash.s, {from:user4});
		await assertRevert(refferal.claim(signedHash.v, signedHash.r, signedHash.s, {from:user4}));
		// await refferal.claim(ser4});

		// await BLOTInstance.approve(openMarkets["_openMarkets"][0], "124000000000000000000", {
		// 	from: user4,
		// });

		await assertRevert(marketInstance.placePrediction(BLOTInstance.address, "123000000000000000000", 3, 4, { from: user4 })); //should revert as leverage is not 5
		await assertRevert(
			marketInstance.placePrediction(BLOTInstance.address, "123000000000000000000", 3, 5, { from: user4, value: "1000000000000000000" })
		); // should revert as passing value

		await marketInstance.placePrediction(BLOTInstance.address, "123000000000000000000", 3, 5, { from: user4 });

		await assertRevert(marketInstance.placePrediction(BLOTInstance.address, "1000000000000000000", 3, 5, { from: user4 })); //should revert as once usr can only place prediction with BLOT once in a market

		// await plotusToken.transfer(user4, "200000000000000000000");

		// await plotusToken.approve(
		//   openMarkets["_openMarkets"][0],
		//   "123000000000000000000",
		//   {
		//     from: user4,
		//   }
		// );
		// await marketInstance.placePrediction(
		//   plotusToken.address,
		//   "123000000000000000000",
		//   3,
		//   3,
		//   { from: user4 }
		// );

		// user 5
		await MockUniswapRouterInstance.setPrice("12000000000000000");
		await marketConfig.setPrice("12000000000000000");
		await assertRevert(
			marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "1000000000000000000", 1, 4, {
				value: "100000000000000000",
				from: user5,
			})
		);
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

	it("1.Prediction Points allocated properly in ether", async () => {
		accounts = [user1, user2, user3, user4, user5, user6, user7, user8, user9, user10];
		options = [2, 2, 2, 3, 1, 1, 2, 3, 3, 2];
		getPredictionPoints = async (user, option, expected) => {
			// return Prediction points of user
			let PredictionPoins = await marketInstance.getUserPredictionPoints(user, option);
			PredictionPoins = PredictionPoins / 1;
			return PredictionPoins;
		};
		PredictionPointsExpected = [1.755503471, 238.3350545, 11.21889102, 556.4885586, 510.3, 1882.8, 116.5, 634.1, 37.0, 721.7];

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
			assert.equal(PredictionPoints, PredictionPointsExpected[index].toFixed(1));
			// commented by parv (as already added assert above)
			// console.log(`user${index + 1} : option : ${options[index]}  `);
			// console.log(`Prediction points : ${PredictionPoints} expected : ${PredictionPointsExpected[index].toFixed(1)} `);
		}
		// console.log(await plotusToken.balanceOf(user1));

		// close market
		await increaseTime(36001);
		await marketInstance.calculatePredictionResult(1);
		await increaseTime(36001);
		// console.log((await web3.eth.getBalance(marketInstance.address))/1)
		// plotus contract balance eth balance
		plotusBalanceBefore = await web3.eth.getBalance(plotusNewAddress);
		assert.equal(parseFloat(plotusBalanceBefore), "10000000000000000");
		lotBalanceBefore = await plotusToken.balanceOf(openMarkets["_openMarkets"][0]);
		assert.equal(parseFloat(web3.utils.fromWei(lotBalanceBefore)).toFixed(2), (832.5835).toFixed(2));

		// lot supply , lot balance of market
		await MockUniswapRouterInstance.setPrice("1000000000000000");
		await marketConfig.setPrice("1000000000000000");


		plotusBalanceAfter = await web3.eth.getBalance(plotusNewAddress);
		assert.equal(parseFloat(plotusBalanceAfter), 10000000000000000);
		lotBalanceAfter = await plotusToken.balanceOf(openMarkets["_openMarkets"][0]);
		assert.equal(parseFloat(web3.utils.fromWei(lotBalanceAfter)).toFixed(2), (832.5835).toFixed(2));
		// assert.equal(parseFloat(web3.utils.fromWei(String(parseFloat(lotBalanceAfter) - parseFloat(lotBalanceBefore)))).toFixed(2), (4.5835).toFixed(2));
		// commented by Parv (as asserts already added above)
		// lotBalanceBefore = lotBalanceBefore / 1;
		// lotBalanceAfter = lotBalanceAfter / 1;
		// console.log(`plotus eth balance before commision : ${plotusBalanceBefore}`);
		// console.log(`plotus balance after commision : ${plotusBalanceAfter}`);
		// console.log(`Lot Balance of market before commision : ${lotBalanceBefore}`);
		// console.log(`Lot Balance of market before commision : ${lotBalanceAfter}`);
		// console.log(`Difference : ${lotBalanceAfter - lotBalanceBefore}`);
	});
	it("2.check total return for each user Prediction values in eth", async () => {
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
			assert.equal(parseFloat(returns).toFixed(2), returnInEthExpected[index].toFixed(2));
			// commented by Parv (as assert already added above)
			// console.log(`return : ${returns} Expected :${returnInEthExpected[index]}`);
		}
	});
	it("3.Check User Recived The appropriate amount", async () => {
		accounts = [user1, user2, user3, user4, user5, user6, user7, user8, user9, user10];
		const totalReturnLotExpexted = [79.96, 0, 125.937, 0, 133.6431475, 493.0463525, 0, 0, 0, 0];
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
			// expectedInEth = returnInEthExpected[accounts.indexOf(account)].toFixed(2);
			// assert.equal(diff, expectedInEth);

			diffToken = afterClaimToken - beforeClaimToken;
			diffToken = diffToken / conv;
			diffToken = diffToken.toFixed(2);
			expectedInLot = totalReturnLotExpexted[accounts.indexOf(account)].toFixed(2);
			assert.equal(diffToken, expectedInLot);

			// commented by Parv (as assert already added above)
			// console.log(`User ${accounts.indexOf(account) + 1}`);
			// console.log(`Returned in Eth : ${diff}  Expected : ${expectedInEth} `);
			// console.log(`Returned in Lot : ${diffToken}  Expected : ${expectedInLot} `);
		}
	});
});

contract("Market", async function([user1, user2]) {
	let masterInstance, BLOTInstance;
	it("Test BLOT Contract", async () => {
		masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		plotusToken = await PlotusToken.deployed();
		BLOTInstance = await BLOT.at(await masterInstance.getLatestAddress(web3.utils.toHex("BL")));
		MockUniswapRouterInstance = await MockUniswapRouter.deployed();
		plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
		plotusNewInstance = await Plotus.at(plotusNewAddress);
		marketConfig = await plotusNewInstance.marketUtility();
		marketConfig = await MarketConfig.at(marketConfig);
		

		let isMinter = await BLOTInstance.isMinter(user1);
		
		assert.equal(isMinter, true);

		isMinter = await BLOTInstance.isMinter(user2);
		assert.equal(isMinter, false);
		receipt = await BLOTInstance.addMinter(user2);
		isMinter = await BLOTInstance.isMinter(user2);
		assert.equal(isMinter, true);
		assert.equal(receipt.logs[0].event, "MinterAdded");
		assert.equal(receipt.logs[0].args.account, user2);

		receipt = await BLOTInstance.renounceMinter({ from: user2 });
		isMinter = await BLOTInstance.isMinter(user2);
		assert.equal(isMinter, false);
		assert.equal(receipt.logs[0].event, "MinterRemoved");
		assert.equal(receipt.logs[0].args.account, user2);

		await assertRevert(BLOTInstance.mint(user2, 100));
		try {
			await BLOTInstance.transfer("0x0000000000000000000000000000000000000000", 10, { from: user1 });
			assert.fail();
		} catch (e) {}
	});
});

contract("More cases for refferal", async function([user1, user2, user3]) {
	before(async function() {
		masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		plotusToken = await PlotusToken.deployed();
		BLOTInstance = await BLOT.at(await masterInstance.getLatestAddress(web3.utils.toHex("BL")));
	})
	it("Should Revert if deployed with null address as plot token, blot token", async () => {
		let  endDate = (await latestTime())/1+(24*3600);
		await assertRevert(Referral.new(nullAddress, user1, user1, endDate, toWei(10),toWei(10)));
		await assertRevert(Referral.new(user1, nullAddress, user1, endDate, toWei(10), toWei(10)));
	});
	it("Should Revert if deployed with past time as end date", async () => {
		let  endDate = (await latestTime())/1-(24);
		await assertRevert(Referral.new(user1, user1, user1, endDate, toWei(10), toWei(10)));
	});
	it("Should Revert if tries to same user claim multiple times, non owner tries to call takeLeftOverPlot, tries to call takeLeftOverPlot before end date", async () => {
		let  endDate = (await latestTime())/1+(24*3600);
		masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		BLOTInstance = await BLOT.at(await masterInstance.getLatestAddress(web3.utils.toHex("BL")));
		let _refferal = await Referral.new(plotusToken.address, BLOTInstance.address, user1, endDate, toWei(10), toWei(5));
		await BLOTInstance.addMinter(_refferal.address);
		await plotusToken.transfer(_refferal.address,toWei("1000"));
		await assertRevert(_refferal.takeLeftOverPlot());
		await assertRevert(_refferal.takeLeftOverPlot({from:user2}));
		let hash = (await web3.eth.abi.encodeParameter("address",user2));
		let signedHash = (await web3.eth.accounts.sign(hash, adminPrivateKey));
		await _refferal.claim(signedHash.v, signedHash.r, signedHash.s, {from:user2});
		await assertRevert(_refferal.claim(signedHash.v, signedHash.r, signedHash.s, {from:user2}));
	});
	it("Should Revert if tries to claim after end date, user can not claim multiple time", async () => {
		let  endDate = (await latestTime())/1+(24*3600);
		masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		BLOTInstance = await BLOT.at(await masterInstance.getLatestAddress(web3.utils.toHex("BL")));
		let _refferal = await Referral.new(plotusToken.address, BLOTInstance.address, user1, endDate, toWei(100), toWei(10));
		await BLOTInstance.addMinter(_refferal.address);
		await plotusToken.transfer(_refferal.address, toWei(30));
		hash = (await web3.eth.abi.encodeParameter("address",user1));
		signedHash = (await web3.eth.accounts.sign(hash, adminPrivateKey));
		await _refferal.claim(signedHash.v, signedHash.r, signedHash.s, {from:user1});
		await assertRevert(_refferal.claim(signedHash.v, signedHash.r, signedHash.s, {from:user1}));
		await increaseTime(24*3600);
		await assertRevert(_refferal.claim(signedHash.v, signedHash.r, signedHash.s, {from:user1}));
	});
	it("Should be able to take back plot toekens after end date", async () => {
		let  endDate = (await latestTime())/1+(24*3600);
		let _refferal = await Referral.new(plotusToken.address, BLOTInstance.address, user1, endDate, toWei(100), toWei(10));
		await BLOTInstance.addMinter(_refferal.address);
		await plotusToken.transfer(_refferal.address, toWei(30));
		await increaseTime(24*3600);
		await _refferal.takeLeftOverPlot();
		assert.equal(await plotusToken.balanceOf(_refferal.address), 0);
	});
	it("Should be able to end campaign before end date and take back plot tokens", async () => {
		let  endDate = (await latestTime())/1+(24*3600);
		let _refferal = await Referral.new(plotusToken.address, BLOTInstance.address, user1, endDate, toWei(100), toWei(10), {from:user2});
		await BLOTInstance.addMinter(_refferal.address);
		await plotusToken.transfer(_refferal.address, toWei(100));
		let balanceBefore = (await plotusToken.balanceOf(user2));
		await _refferal.endReferralCampaign({from:user2});
		assert.equal((await plotusToken.balanceOf(user2))/1, balanceBefore/1 + 100000000000000000000);
		assert.equal(await plotusToken.balanceOf(_refferal.address), 0);
		hash = (await web3.eth.abi.encodeParameter("address",user1));
		signedHash = (await web3.eth.accounts.sign(hash, adminPrivateKey));
		await assertRevert(_refferal.claim(signedHash.v, signedHash.r, signedHash.s, {from:user1}));
	});
	it("Owner should be able to transfer ownership to other address", async () => {
		let  endDate = (await latestTime())/1+(24*3600);
		let _refferal = await Referral.new(plotusToken.address, BLOTInstance.address, user1, endDate, toWei(100), toWei(10));
		assert.equal(await _refferal.owner(), user1);
		await _refferal.tranferOwnership(user2);
		assert.equal(await _refferal.owner(), user2);
	});

	it("Should revert if tries to transfer ownership to null address", async () => {
		let  endDate = (await latestTime())/1+(24*3600);
		let _refferal = await Referral.new(plotusToken.address, BLOTInstance.address, user1, endDate, toWei(100), toWei(10));
		await assertRevert(_refferal.tranferOwnership(nullAddress));
	});

	it("Owner should be able to update signer to other address", async () => {
		let  endDate = (await latestTime())/1+(24*3600);
		let _refferal = await Referral.new(plotusToken.address, BLOTInstance.address, user1, endDate, toWei(100), toWei(10));
		assert.equal(await _refferal.signer(), user1);
		await _refferal.updateSigner(user2);
		assert.equal(await _refferal.signer(), user2);
	});

	it("Should revert if tries to update signer to null address", async () => {
		let  endDate = (await latestTime())/1+(24*3600);
		let _refferal = await Referral.new(plotusToken.address, BLOTInstance.address, user1, endDate, toWei(100), toWei(10));
		await assertRevert(_refferal.updateSigner(nullAddress));
	});

	it("Should revert if unauthorized address tries to update signer to null address", async () => {
		let  endDate = (await latestTime())/1+(24*3600);
		let _refferal = await Referral.new(plotusToken.address, BLOTInstance.address, user1, endDate, toWei(100), toWei(10));
		await assertRevert(_refferal.updateSigner(nullAddress, {from:user2}));
	});

	it("Should revert if tries to claim more than budget", async () => {
		let  endDate = (await latestTime())/1+(24*3600);
		let _refferal = await Referral.new(plotusToken.address, BLOTInstance.address,user1, endDate, toWei(100), toWei(60));
		await plotusToken.transfer(_refferal.address,toWei("1000"));
		await BLOTInstance.addMinter(_refferal.address);
		hash = (await web3.eth.abi.encodeParameter("address",user1));
		signedHash = (await web3.eth.accounts.sign(hash, adminPrivateKey));
		masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		BLOTInstance = await BLOT.at(await masterInstance.getLatestAddress(web3.utils.toHex("BL")));
		await _refferal.claim(signedHash.v, signedHash.r, signedHash.s, {from:user1});
		hash = (await web3.eth.abi.encodeParameter("address",user2));
		signedHash = (await web3.eth.accounts.sign(hash, adminPrivateKey));
		await assertRevert(_refferal.claim(signedHash.v, signedHash.r, signedHash.s, {from:user2}));
	});

	it("Should revert if signer is not the authorized address", async () => {
		let  endDate = (await latestTime())/1+(24*3600);
		let _refferal = await Referral.new(plotusToken.address, BLOTInstance.address,user1, endDate, toWei(100), toWei(60));
		await plotusToken.transfer(_refferal.address,toWei("1000"));
		hash = (await web3.eth.abi.encodeParameter("address",user2));
		let user2PrvtKey = "7c85a1f1da3120c941b83d71a154199ee763307683f206b98ad92c3b4e0af13e";
		signedHash = (await web3.eth.accounts.sign(hash, user2PrvtKey));
		masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		BLOTInstance = await BLOT.at(await masterInstance.getLatestAddress(web3.utils.toHex("BL")));
		await BLOTInstance.addMinter(_refferal.address);
		await assertRevert(_refferal.claim(signedHash.v, signedHash.r, signedHash.s, {from:user2}));
		hash = (await web3.eth.abi.encodeParameter("address",user1));
		signedHash = (await web3.eth.accounts.sign(hash, adminPrivateKey));
		await _refferal.claim(signedHash.v, signedHash.r, signedHash.s, {from:user1});
	});

	it("Should revert if already claimed in V1", async () => {
		let  endDate = (await latestTime())/1+(24*3600);
		let _refferal = await Referral.new(plotusToken.address, BLOTInstance.address,user1, endDate, toWei(100), toWei(60));
		await plotusToken.transfer(_refferal.address,toWei("1000"));
		hash = (await web3.eth.abi.encodeParameter("address",user2));
		let user2PrvtKey = "7c85a1f1da3120c941b83d71a154199ee763307683f206b98ad92c3b4e0af13e";
		signedHash = (await web3.eth.accounts.sign(hash, user2PrvtKey));
		masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		BLOTInstance = await BLOT.at(await masterInstance.getLatestAddress(web3.utils.toHex("BL")));
		await BLOTInstance.addMinter(_refferal.address);
		hash = (await web3.eth.abi.encodeParameter("address",user1));
		signedHash = (await web3.eth.accounts.sign(hash, adminPrivateKey));
		await _refferal.claim(signedHash.v, signedHash.r, signedHash.s, {from:user1});

		_refferal = await ReferralV2.new(plotusToken.address, BLOTInstance.address,user1, endDate, toWei(1000), toWei(250), _refferal.address);
		await plotusToken.transfer(_refferal.address,toWei("1000"));
		hash = (await web3.eth.abi.encodeParameter("address",user2));
		user2PrvtKey = "7c85a1f1da3120c941b83d71a154199ee763307683f206b98ad92c3b4e0af13e";
		signedHash = (await web3.eth.accounts.sign(hash, user2PrvtKey));
		masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		BLOTInstance = await BLOT.at(await masterInstance.getLatestAddress(web3.utils.toHex("BL")));
		await BLOTInstance.addMinter(_refferal.address);
		hash = (await web3.eth.abi.encodeParameter("address",user1));
		signedHash = (await web3.eth.accounts.sign(hash, adminPrivateKey));
		await assertRevert(_refferal.claim(signedHash.v, signedHash.r, signedHash.s, {from:user1}));

		let refferalAmount = toWei("250");

		hash = (await web3.eth.abi.encodeParameter("address",user3));
		signedHash = (await web3.eth.accounts.sign(hash, adminPrivateKey));
		await _refferal.claim(signedHash.v, signedHash.r, signedHash.s, {from:user3});
		let balance = await BLOTInstance.balanceOf(user3);
		assert.equal(balance/1,refferalAmount, "Incorrect referral amount");
	});
});

