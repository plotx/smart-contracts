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
const MarketCreationRewards = artifacts.require('MarketCreationRewards');
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
	marketETHBalanceBeforeDispute,
	marketIncentives;

const ethAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

contract("Rewards-Market", async function(users) {
	describe("Scenario1", async () => {
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
			openMarkets = await plotusNewInstance.getOpenMarkets();
			timeNow = await latestTime();
			marketInstance = await Market.at(openMarkets["_openMarkets"][0]);

			allMarkets = await AllMarkets.at(await masterInstance.getLatestAddress(web3.utils.toHex("AM")));
			marketIncentives = await MarketCreationRewards.at(await masterInstance.getLatestAddress(web3.utils.toHex("MC")));

			marketData = await marketInstance.getData();

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
            let date = await latestTime();
            await increaseTime(3610);
            date = Math.round(date);
            // await marketConfig.setInitialCummulativePrice();
            await marketConfig.setAuthorizedAddress(allMarkets.address);
            let utility = await MarketUtility.at("0xCBc7df3b8C870C5CDE675AaF5Fd823E4209546D2");
            await utility.setAuthorizedAddress(allMarkets.address);
            // await mockUniswapV2Pair.sync();
            let mockChainLinkGasPriceAgg = await MockChainLinkGasPriceAgg.new();
            await increaseTime(5 * 3600);
            await plotusToken.transfer(marketIncentives.address,toWei(100000));
            await plotusToken.transfer(users[11],toWei(100000));
            await plotusToken.approve(tokenController.address,toWei(200000),{from:users[11]});
            await tokenController.lock(toHex("SM"),toWei(100000),30*3600*24,{from:users[11]});
            await allMarkets.createMarket(0, 0,{from:users[11],gasPrice:500000});
            await marketIncentives.claimCreationReward(100,{from:users[11]});
		});

		it("0.1 Assert values from getData()", async () => {
			assert.equal(option1RangeMIN, 0);
			assert.equal(option1RangeMAX, 934999999999);
			assert.equal(option2RangeMIN, 935000000000);
			assert.equal(option2RangeMAX, 937500000000);
			assert.equal(option3RangeMIX, 937500000001);
			assert.equal(option3RangeMAX, 1.157920892373162e77);
			assert.equal(parseFloat(marketData._optionPrice[0]), priceOption1);
			assert.equal(parseFloat(marketData._optionPrice[1]), priceOption2);
			assert.equal(parseFloat(marketData._optionPrice[2]), priceOption3);
			assert.equal(marketData._marketCurrency, openMarkets._marketCurrencies[0]);
			assert.equal(parseFloat(marketData._ethStaked[0]), 0);
			assert.equal(parseFloat(marketData._ethStaked[1]), 0);
			assert.equal(parseFloat(marketData._ethStaked[2]), 0);
			assert.equal(parseFloat(marketData._predictionTime), 3600);
		});

		it("Scenario 1: Few user wins", async () => {
			// setting option price in eth
			await allMarkets.setOptionPrice(7, 1, 9);
			await allMarkets.setOptionPrice(7, 2, 18);
			await allMarkets.setOptionPrice(7, 3, 27);
			let i;
			let unusedEth = [""];
			let unusedPlot = [""];
			for(i=1; i<11;i++){

				await plotusToken.transfer(users[i], toWei(2000));
			    await plotusToken.approve(allMarkets.address, toWei(100000), { from: users[i] });
			    await allMarkets.deposit(toWei(1000), { value: toWei("3"), from: users[i] });
			    await plotusToken.approve(tokenController.address, toWei(100000), { from: users[i] });
			    let _unusedBal = await allMarkets.getUserUnusedBalance(users[i]);
			    unusedPlot.push(_unusedBal[0]/1e18);
			    unusedEth.push(_unusedBal[2]/1e18);
			}

			await marketConfig.setPrice(toWei(0.001));
			await marketConfig.setNextOptionPrice(18);
			await allMarkets.placePrediction(7, plotusToken.address, 100*1e8, 2, { from: users[1] });
			await marketConfig.setPrice(toWei(0.002));
			await marketConfig.setNextOptionPrice(18);
			await allMarkets.placePrediction(7, plotusToken.address, 400*1e8, 2, { from: users[2] });
			await marketConfig.setPrice(toWei(0.001));
			await marketConfig.setNextOptionPrice(18);
			await allMarkets.placePrediction(7, plotusToken.address, 210*1e8, 2, { from: users[3] });
			await marketConfig.setPrice(toWei(0.015));
			await marketConfig.setNextOptionPrice(27);
			await allMarkets.placePrediction(7, plotusToken.address, 123*1e8, 3, { from: users[4] });
			await marketConfig.setPrice(toWei(0.012));
			await marketConfig.setNextOptionPrice(9);
			await allMarkets.placePrediction(7, ethAddress, 1e8, 1, { from: users[5] });
			await marketConfig.setPrice(toWei(0.014));
			await marketConfig.setNextOptionPrice(9);
			await allMarkets.placePrediction(7, ethAddress, 2*1e8, 1, { from: users[6] });
			await marketConfig.setPrice(toWei(0.01));
			await marketConfig.setNextOptionPrice(18);
			await allMarkets.placePrediction(7, ethAddress, 1e8, 2, { from: users[7] });
			await marketConfig.setPrice(toWei(0.045));
			await marketConfig.setNextOptionPrice(27);
			await allMarkets.placePrediction(7, ethAddress, 3*1e8, 3, { from: users[8] });
			await marketConfig.setPrice(toWei(0.051));
			await marketConfig.setNextOptionPrice(27);
			await allMarkets.placePrediction(7, ethAddress, 1e8, 3, { from: users[9] });
			await marketConfig.setPrice(toWei(0.012));
			await marketConfig.setNextOptionPrice(18);
			await allMarkets.placePrediction(7, ethAddress, 2*1e8, 2, { from: users[10] });

			let options=[2,2,2,3,1,1,2,3,3,2];

			let betpoints = [5.55277,44.42222,11.66083,68.29916,111,222,55.5,111,37,111];

			let usedEth = [0,0,0,0,1,2,1,3,1,2];
			let usedPlot = [100,400,210,123,0,0,0,0,0,0];

			for(i=1;i<11;i++)
			{
				let betPointUser = (await allMarkets.getUserPredictionPoints(users[i],7,options[i-1]))/1e5;
				assert.equal(betPointUser,betpoints[i-1]);
				let unusedBal = await allMarkets.getUserUnusedBalance(users[i]);
				assert.equal(unusedPlot[i]-unusedBal[0]/1e18,usedPlot[i-1]);
				assert.equal(unusedEth[i]-unusedBal[2]/1e18,usedEth[i-1]);
			}

			await increaseTime(5*60*60);

			await allMarkets.postResultMock(1,7);

			await increaseTime(60*61);

			let userRewardEth = [0,0,0,0,3.271725,6.54345,0,0,0,0];
			let userRewardPlot = [0,0,0,0,270.5896375,541.179275,0,0,0,0];

			for(i=1;i<11;i++)
			{
				let reward = await allMarkets.getReturn(users[i],7);
				assert.equal(reward[0][0]/1e8,userRewardPlot[i-1]);
				assert.equal(reward[0][1]/1e8,userRewardEth[i-1]);
				let ethBalBefore = await web3.eth.getBalance(users[i]);
				let plotBalBefore = await plotusToken.balanceOf(users[i]);
				await allMarkets.withdrawMax(100,{from:users[i]});
				let ethBalAfter = await web3.eth.getBalance(users[i]);
				let plotBalAfter = await plotusToken.balanceOf(users[i]);
				assert.equal(Math.round((ethBalAfter-ethBalBefore)/1e18),Math.round((unusedEth[i]-usedEth[i-1])/1+reward[0][1]/1e8));
				assert.equal(Math.round((plotBalAfter-plotBalBefore)/1e18),Math.round((unusedPlot[i]-usedPlot[i-1])/1+reward[0][0]/1e8));
			}
			let marketCreatorReward = await marketIncentives.getPendingMarketCreationRewards(users[11]);
			assert.equal(0.174825,marketCreatorReward[2]/1e18);
			assert.equal(208145875,Math.round(marketCreatorReward[1]/1e11));

			let ethBalBeforeCreator = await web3.eth.getBalance(users[11]);
			let plotBalBeforeCreator = await plotusToken.balanceOf(users[11]);

			let _gasPrice = 15000000000;

			let tx1 = await marketIncentives.claimCreationReward(100,{from:users[11],gasPrice:_gasPrice});

			let gasUsed = tx1.receipt.gasUsed;

			let gascost = _gasPrice * gasUsed;


			let ethBalAfterCreator = await web3.eth.getBalance(users[11]);
			let plotBalAfterCreator = await plotusToken.balanceOf(users[11]);

			assert.equal(Math.round((ethBalAfterCreator-ethBalBeforeCreator/1+gascost)/1e12),174825);
			assert.equal(Math.round((plotBalAfterCreator-plotBalBeforeCreator)/1e11),208145875);

				
		});
	});
});
