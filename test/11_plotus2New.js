const { assert } = require("chai");

const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("MarketRegistry");
const Master = artifacts.require("Master");
const MarketConfig = artifacts.require("MockConfig");
const PlotusToken = artifacts.require("MockPLOT");
const Governance = artifacts.require("Governance");
const TokenController = artifacts.require("TokenController");
const MockchainLinkBTC = artifacts.require("MockChainLinkAggregator");
const BLOT = artifacts.require("BLOT");
const MockUniswapRouter = artifacts.require("MockUniswapRouter");
const AllMarkets = artifacts.require("MockAllMarkets");
const MarketUtility = artifacts.require("MockConfig"); //mock
const MockChainLinkGasPriceAgg = artifacts.require("MockChainLinkGasPriceAgg");
const MemberRoles = artifacts.require("MemberRoles");
const BigNumber = require("bignumber.js");
const { increaseTimeTo } = require("./utils/increaseTime.js");

const web3 = Market.web3;
const assertRevert = require("./utils/assertRevert.js").assertRevert;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const latestTime = require("./utils/latestTime.js").latestTime;
const encode = require("./utils/encoder.js").encode;
const gvProposal = require("./utils/gvProposal.js").gvProposalWithIncentiveViaTokenHolder;
const { toHex, toWei, toChecksumAddress } = require("./utils/ethTools");
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
	option3RangeMAX, governance,
	marketETHBalanceBeforeDispute;

const ethAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

contract("Market", async function(users) {
	describe("Place the predictions with ether", async () => {
		it("0.0", async () => {
			masterInstance = await OwnedUpgradeabilityProxy.deployed();
			masterInstance = await Master.at(masterInstance.address);
			plotusToken = await PlotusToken.deployed();
			BLOTInstance = await BLOT.deployed();
			MockUniswapRouterInstance = await MockUniswapRouter.deployed();
			plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
			tokenController  =await TokenController.at(await masterInstance.getLatestAddress(web3.utils.toHex("TC")));
			governance = await masterInstance.getLatestAddress(web3.utils.toHex("GV"));
			governance = await Governance.at(governance);
			plotusNewInstance = await Plotus.at(plotusNewAddress);
			marketConfig = await plotusNewInstance.marketUtility();
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

			
            newUtility = await MarketUtility.new();
            existingMarkets = await plotusNewInstance.getOpenMarkets();
            actionHash = encode("upgradeContractImplementation(address,address)", marketConfig.address, newUtility.address);
            await gvProposal(6, actionHash, await MemberRoles.at(await masterInstance.getLatestAddress(toHex("MR"))), governance, 2, 0);
            await increaseTime(604800);
            marketConfig = await MarketUtility.at(marketConfig.address);
            allMarkets = await AllMarkets.new();
            await allMarkets.initiate(plotusToken.address, marketConfig.address);
            let date = await latestTime();
            await increaseTime(3610);
            date = Math.round(date);
            // await marketConfig.setInitialCummulativePrice();
            await marketConfig.setAuthorizedAddress(allMarkets.address);
            let utility = await MarketUtility.at("0xCBc7df3b8C870C5CDE675AaF5Fd823E4209546D2");
            await utility.setAuthorizedAddress(allMarkets.address);
            // await mockUniswapV2Pair.sync();
            let mockChainLinkGasPriceAgg = await MockChainLinkGasPriceAgg.new();
            await allMarkets.addInitialMarketTypesAndStart(date, "0x5e2aa6b66531142bEAB830c385646F97fa03D80a", mockChainLinkGasPriceAgg.address);
            await increaseTime(3610);
            await allMarkets.createMarket(0, 0,{from:users[11]});
		});

		it("Scenario 2", async () => {
			// setting option price in eth
			await allMarkets.setOptionPrice(1, 1, 9);
			await allMarkets.setOptionPrice(1, 2, 9);
			await allMarkets.setOptionPrice(1, 3, 9);
			let i;
			for(i=1; i<11;i++){

				await plotusToken.transfer(users[i], toWei(2000));
			    await plotusToken.approve(allMarkets.address, toWei(100000), { from: users[i] });
			    await allMarkets.deposit(toWei(1000), { value: toWei("3"), from: users[i] });
			    await plotusToken.approve(tokenController.address, toWei(100000), { from: users[i] });

			}

			await marketConfig.setPrice(toWei(0.001));
			await allMarkets.placePrediction(1, plotusToken.address, toWei("100"), 2, { from: users[1] });
			await marketConfig.setPrice(toWei(0.002));
			await allMarkets.placePrediction(1, plotusToken.address, toWei("400"), 2, { from: users[2] });
			await marketConfig.setPrice(toWei(0.001));
			await allMarkets.placePrediction(1, plotusToken.address, toWei("210"), 2, { from: users[3] });
			await marketConfig.setPrice(toWei(0.015));
			await allMarkets.placePrediction(1, plotusToken.address, toWei("123"), 3, { from: users[4] });
			await marketConfig.setPrice(toWei(0.012));
			await allMarkets.placePrediction(1, ethAddress, toWei("1"), 2, { from: users[5] });
			await marketConfig.setPrice(toWei(0.014));
			await allMarkets.placePrediction(1, ethAddress, toWei("2"), 3, { from: users[6] });
			await marketConfig.setPrice(toWei(0.01));
			await allMarkets.placePrediction(1, ethAddress, toWei("1"), 2, { from: users[7] });
			await marketConfig.setPrice(toWei(0.045));
			await allMarkets.placePrediction(1, ethAddress, toWei("3"), 3, { from: users[8] });
			await marketConfig.setPrice(toWei(0.051));
			await allMarkets.placePrediction(1, ethAddress, toWei("1"), 3, { from: users[9] });
			await marketConfig.setPrice(toWei(0.012));
			await allMarkets.placePrediction(1, ethAddress, toWei("2"), 2, { from: users[10] });

			let options=[2,2,2,3,2,3,2,3,3,2];

			for(i=1;i<11;i++)
			{
				console.log("user "+i+" bet points: ",(await allMarkets.getUserPredictionPoints(users[i],1,options[i-1]))/1e18);
				let unusedBal = await allMarkets.getUserUnusedBalance({from:users[i]});
				console.log("user "+i+" unused balance: ",unusedBal[0]/1e18, "   ", unusedBal[1]/1e18);
			}

			await increaseTime(2*60*60);

			await allMarkets.postResultMock(1,1);

			await increaseTime(60*60);

			for(i=1;i<11;i++)
			{
				let reward = await allMarkets.getReturn(users[i],1);
				console.log("User "+i+" rewards: "+ reward[0][0]/1e18+ "  "+reward[0][1]/1e18 );
			}
		});
	});
});
