const { assert } = require("chai");

const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("MarketRegistry");
const Master = artifacts.require("Master");
const MarketConfig = artifacts.require("MockConfig");
const PlotusToken = artifacts.require("MockPLOT");
const Governance = artifacts.require("GovernanceV2");
const ProposalCategory = artifacts.require("ProposalCategory");
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
const encode1 = require('./utils/encoder.js').encode1;

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
	describe("Scenario2", async () => {
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
            await marketConfig.setAuthorizedAddress(allMarkets.address);
            let utility = await MarketUtility.at("0xCBc7df3b8C870C5CDE675AaF5Fd823E4209546D2");
            await utility.setAuthorizedAddress(allMarkets.address);
            let mockChainLinkGasPriceAgg = await MockChainLinkGasPriceAgg.new();
            await increaseTime(5 * 3600);
            await allMarkets.createMarket(0, 0,{from:users[11], gasPrice:10});
            await plotusToken.transfer(marketIncentives.address,toWei(100000));
			await marketIncentives.claimCreationReward(100,{from:users[11]});
		});

		it("Scenario 2:All losers, no winners", async () => {
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
			await marketConfig.setNextOptionPrice(18);
			await allMarkets.placePrediction(7, ethAddress, 1*1e8, 2, { from: users[5] });
			await marketConfig.setPrice(toWei(0.014));
			await marketConfig.setNextOptionPrice(27);
			await allMarkets.placePrediction(7, ethAddress, 2*1e8, 3, { from: users[6] });
			await marketConfig.setPrice(toWei(0.01));
			await marketConfig.setNextOptionPrice(18);
			await allMarkets.placePrediction(7, ethAddress, 1*1e8, 2, { from: users[7] });
			await marketConfig.setPrice(toWei(0.045));
			await marketConfig.setNextOptionPrice(27);
			await allMarkets.placePrediction(7, ethAddress, 3*1e8, 3, { from: users[8] });
			await marketConfig.setPrice(toWei(0.051));
			await marketConfig.setNextOptionPrice(27);
			await allMarkets.placePrediction(7, ethAddress, 1*1e8, 3, { from: users[9] });
			await marketConfig.setPrice(toWei(0.012));
			await marketConfig.setNextOptionPrice(18);
			await allMarkets.placePrediction(7, ethAddress, 2*1e8, 2, { from: users[10] });

			let options=[2,2,2,3,2,3,2,3,3,2];

			let betpoints = [5.55277,44.42222,11.66083,68.29916,55.5,74,55.5,111,37,111];

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

			for(i=1;i<11;i++)
			{
				let reward = await allMarkets.getReturn(users[i],7);
				assert.equal(reward[0][0]/1e8,0);
				assert.equal(reward[0][1]/1e8,0);

				let ethBalBefore = await web3.eth.getBalance(users[i]);
				let plotBalBefore = await plotusToken.balanceOf(users[i]);
				await allMarkets.withdrawMax(100,{from:users[i]});
				let ethBalAfter = await web3.eth.getBalance(users[i]);
				let plotBalAfter = await plotusToken.balanceOf(users[i]);
				assert.equal(Math.round((ethBalAfter-ethBalBefore)/1e18),Math.round((unusedEth[i]-usedEth[i-1])/1+reward[0][1]/1e8));
				assert.equal(Math.round((plotBalAfter-plotBalBefore)/1e18),Math.round((unusedPlot[i]-usedPlot[i-1])/1+reward[0][0]/1e8));
			}

			let marketCreatorReward = await marketIncentives.getPendingMarketCreationRewards(users[11]);	
			assert.equal(0.04995,marketCreatorReward[2]/1e18);
			assert.equal(41629175,Math.round(marketCreatorReward[1]/1e11));

			let ethBalBeforeCreator = await web3.eth.getBalance(users[11]);
			let plotBalBeforeCreator = await plotusToken.balanceOf(users[11]);

			let _gasPrice = 15;

			let tx1 = await marketIncentives.claimCreationReward(100,{from:users[11],gasPrice:_gasPrice});

			let gasUsed = tx1.receipt.gasUsed;

			let gascost = _gasPrice * gasUsed;

			let ethBalAfterCreator = await web3.eth.getBalance(users[11]);
			let plotBalAfterCreator = await plotusToken.balanceOf(users[11]);

			assert.equal(Math.round((ethBalAfterCreator-ethBalBeforeCreator/1+gascost)/1e13),4995);
			assert.equal(Math.round((plotBalAfterCreator-plotBalBeforeCreator)/1e11),41629175);

		});
	});
});


contract("Rewards-Market", async function(users) {
	describe("Scenario2", async () => {
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
            let actionHash = encode("upgradeContractImplementation(address,address)", marketConfig.address, newUtility.address);
            await gvProposal(6, actionHash, await MemberRoles.at(await masterInstance.getLatestAddress(toHex("MR"))), governance, 2, 0);
            await increaseTime(604800);
            marketConfig = await MarketUtility.at(marketConfig.address);
            
            let date = await latestTime();
            await increaseTime(3610);
            date = Math.round(date);
            await marketConfig.setAuthorizedAddress(allMarkets.address);
            let utility = await MarketUtility.at("0xCBc7df3b8C870C5CDE675AaF5Fd823E4209546D2");
            await utility.setAuthorizedAddress(allMarkets.address);
            let mockChainLinkGasPriceAgg = await MockChainLinkGasPriceAgg.new();
            await increaseTime(5 * 3600);

			let nullAddress = "0x0000000000000000000000000000";
            let pc = await masterInstance.getLatestAddress(web3.utils.toHex("PC"));
			pc = await ProposalCategory.at(pc);
		      let newGV = await Governance.new()
		      actionHash = encode1(
		        ['bytes2[]', 'address[]'],
		        [
		          [toHex('GV')],
		          [newGV.address]
		        ]
		      );

		      let p = await governance.getProposalLength();
		      await governance.createProposal("proposal", "proposal", "proposal", 0);
		      let canClose = await governance.canCloseProposal(p);
		      assert.equal(parseFloat(canClose),0);
		      await governance.categorizeProposal(p, 7, 0);
		      await governance.submitProposalWithSolution(p, "proposal", actionHash);
		      await governance.submitVote(p, 1)
		      await increaseTime(604800);
		      await governance.closeProposal(p);
		      await increaseTime(604800);
		      await governance.triggerAction(p);
		      await assertRevert(governance.triggerAction(p));
		      await increaseTime(604800);

		      let c1 = await pc.totalCategories();
		      //proposal to add category
		      actionHash = encode1(
		        ["uint256", "string", "uint256", "uint256", "uint256", "uint256[]", "uint256", "string", "address", "bytes2", "uint256[]", "string"],
		        [
		          10,
		          "ResolveDispute",
		          3,
		          50,
		          50,
		          [2],
		          86400,
		          "QmZQhJunZesYuCJkdGwejSATTR8eynUgV8372cHvnAPMaM",
		          nullAddress,
		          toHex("AM"),
		          [0, 0],
		          "resolveDispute(uint256,uint256)",
		        ]
		      );
		      let p1 = await governance.getProposalLength();
		      await governance.createProposalwithSolution("Add new member", "Add new member", "Addnewmember", 4, "Add new member", actionHash);
		      await governance.submitVote(p1.toNumber(), 1);
		      await governance.closeProposal(p1.toNumber());
		      let cat2 = await pc.totalCategories();
		      await increaseTime(604800);

            await allMarkets.createMarket(0, 0,{from:users[11], gasPrice:10});
            await plotusToken.transfer(marketIncentives.address,toWei(100000));
			await marketIncentives.claimCreationReward(100,{from:users[11]});
		});

		it("Scenario 2:All losers, no winners", async () => {
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
			await marketConfig.setNextOptionPrice(18);
			await allMarkets.placePrediction(7, ethAddress, 1*1e8, 2, { from: users[5] });
			await marketConfig.setPrice(toWei(0.014));
			await marketConfig.setNextOptionPrice(27);
			await allMarkets.placePrediction(7, ethAddress, 2*1e8, 3, { from: users[6] });
			await marketConfig.setPrice(toWei(0.01));
			await marketConfig.setNextOptionPrice(18);
			await allMarkets.placePrediction(7, ethAddress, 1*1e8, 2, { from: users[7] });
			await marketConfig.setPrice(toWei(0.045));
			await marketConfig.setNextOptionPrice(27);
			await allMarkets.placePrediction(7, ethAddress, 3*1e8, 3, { from: users[8] });
			await marketConfig.setPrice(toWei(0.051));
			await marketConfig.setNextOptionPrice(27);
			await allMarkets.placePrediction(7, ethAddress, 1*1e8, 3, { from: users[9] });
			await marketConfig.setPrice(toWei(0.012));
			await marketConfig.setNextOptionPrice(18);
			await allMarkets.placePrediction(7, ethAddress, 2*1e8, 2, { from: users[10] });

			let options=[2,2,2,3,2,3,2,3,3,2];

			let betpoints = [5.55277,44.42222,11.66083,68.29916,55.5,74,55.5,111,37,111];

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

			await governance.setAllMarketsAddress();
			await plotusToken.transfer(users[12], "700000000000000000000");
			await plotusToken.approve(allMarkets.address, "500000000000000000000", {
				from: users[12],
			});
			let proposalId = await governance.getProposalLength();
			let marketETHBalanceBeforeDispute = await web3.eth.getBalance(marketInstance.address);
			let registryBalanceBeforeDispute = await web3.eth.getBalance(plotusNewInstance.address);
			await allMarkets.raiseDispute(7, "500000000000000000000","","","", {from: users[12]});
			
			await plotusToken.transfer(users[13], "20000000000000000000000");
			await plotusToken.transfer(users[14], "20000000000000000000000");
			await plotusToken.transfer(users[15], "20000000000000000000000");
			await plotusToken.approve(tokenController.address, "20000000000000000000000",{from : users[13]});
		    await tokenController.lock("0x4452","20000000000000000000000",(86400*20),{from : users[13]});
		    
		    await plotusToken.approve(tokenController.address, "20000000000000000000000",{from : users[14]});
		    await tokenController.lock("0x4452","20000000000000000000000",(86400*20),{from : users[14]});

		  
		    await plotusToken.approve(tokenController.address, "20000000000000000000000",{from : users[15]});
		    await tokenController.lock("0x4452","20000000000000000000000",(86400*20),{from : users[15]});

			await governance.submitVote(proposalId, 1, {from:users[13]});
		    await governance.submitVote(proposalId, 1, {from:users[14]});
		    await governance.submitVote(proposalId, 1, {from:users[15]});
		    await increaseTime(604800);
		    await governance.closeProposal(proposalId);
		    await increaseTime(86401);
		    assert.equal((await allMarkets.getMarketResults(7))[0]/1, 3);

			await increaseTime(60*61);

			let userRewardEth = [0,0,0,0.935,0,3.011,0,4.517,1.505,0];
			let userRewardPlot = [0,0,0,289.063,0,179.990,0,269.986,89.995,0];

			for(i=1;i<11;i++)
			{
				let reward = await allMarkets.getReturn(users[i],7);
				assert.equal((~~(reward[0][0]/1e5))/1000,1*userRewardPlot[i-1]);
				assert.equal((~~(reward[0][1]/1e5))/1000,1*userRewardEth[i-1]);
				if(reward[0][0]*1 > 0 || reward[0][1]*1 > 0) {
					let ethBalBefore = await web3.eth.getBalance(users[i]);
					let plotBalBefore = await plotusToken.balanceOf(users[i]);
					await allMarkets.withdrawMax(100,{from:users[i]});
					let ethBalAfter = await web3.eth.getBalance(users[i]);
					let plotBalAfter = await plotusToken.balanceOf(users[i]);
					assert.equal(Math.round((ethBalAfter-ethBalBefore)/1e18),Math.round((unusedEth[i]-usedEth[i-1])/1+reward[0][1]/1e8));
					assert.equal(Math.round((plotBalAfter-plotBalBefore)/1e18),Math.round((unusedPlot[i]-usedPlot[i-1])/1+reward[0][0]/1e8));
				}
			}

			let marketCreatorReward = await marketIncentives.getPendingMarketCreationRewards(users[11]);	
			assert.equal(0.01998,marketCreatorReward[2]/1e18);
			assert.equal(3.5,(marketCreatorReward[1]/1e18).toFixed(1));

			let ethBalBeforeCreator = await web3.eth.getBalance(users[11]);
			let plotBalBeforeCreator = await plotusToken.balanceOf(users[11]);

			let _gasPrice = 15;

			let tx1 = await marketIncentives.claimCreationReward(100,{from:users[11],gasPrice:_gasPrice});

			let gasUsed = tx1.receipt.gasUsed;

			let gascost = _gasPrice * gasUsed;

			let ethBalAfterCreator = await web3.eth.getBalance(users[11]);
			let plotBalAfterCreator = await plotusToken.balanceOf(users[11]);

			assert.equal(Math.round((ethBalAfterCreator-ethBalBeforeCreator/1+gascost)/1e13),1998);
			assert.equal(((plotBalAfterCreator-plotBalBeforeCreator)/1e18).toFixed(1),3.5);

		});
	});
});