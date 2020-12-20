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
var ethutil= require('ethereumjs-util');
const encode3 = require("./utils/encoder.js").encode3;
const signAndExecuteMetaTx = require("./utils/signAndExecuteMetaTx.js").signAndExecuteMetaTx;
const BN = require('bn.js');

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

let privateKeyList = ["fb437e3e01939d9d4fef43138249f23dc1d0852e69b0b5d1647c087f869fabbd","7c85a1f1da3120c941b83d71a154199ee763307683f206b98ad92c3b4e0af13e","ecc9b35bf13bd5459350da564646d05c5664a7476fe5acdf1305440f88ed784c","f4470c3fca4dbef1b2488d016fae25978effc586a1f83cb29ac8cb6ab5bc2d50","141319b1a84827e1046e93741bf8a9a15a916d49684ab04925ac4ce4573eea23","d54b606094287758dcf19064a8d91c727346aadaa9388732e73c4315b7c606f9","49030e42ce4152e715a7ddaa10e592f8e61d00f70ef11f48546711f159d985df","b96761b1e7ebd1e8464a78a98fe52f53ce6035c32b4b2b12307a629a551ff7cf","d4786e2581571c863c7d12231c3afb6d4cef390c0ac9a24b243293721d28ea95","ed28e3d3530544f1cf2b43d1956b7bd13b63c612d963a8fb37387aa1a5e11460","05b127365cf115d4978a7997ee98f9b48f0ddc552b981c18aa2ee1b3e6df42c6","9d11dd6843f298b01b34bd7f7e4b1037489871531d14b58199b7cba1ac0841e6","f79e90fa4091de4fc2ec70f5bf67b24393285c112658e0d810e6bd711387fbb9","99f1fc0f09230ce745b6a256ba7082e6e51a2907abda3d9e735a5c8188bb4ba1","477f86cce983b9c91a36fdcd4a7ce21144a08dee9b1aafb91b9c70e57f717ce6","b03d2e6bb4a7d71c66a66ff9e9c93549cae4b593f634a4ea2a1f79f94200f5b4","9ddc0f53a81e631dcf39d5155f41ec12ed551b731efc3224f410667ba07b37dc","cf087ff9ae7c9954ad8612d071e5cdf34a6024ee1ae477217639e63a802a53dd","b64f62b94babb82cc78d3d1308631ae221552bb595202fc1d267e1c29ce7ba60","a91e24875f8a534497459e5ccb872c4438be3130d8d74b7e1104c5f94cdcf8c2","4f49f3d029eeeb3fed14d59625acd088b6b34f3b41c527afa09d29e4a7725c32","179795fd7ac7e7efcba3c36d539a1e8659fb40d77d0a3fab2c25562d99793086","4ba37d0b40b879eceaaca2802a1635f2e6d86d5c31e3ff2d2fd13e68dd2a6d3d","6b7f5dfba9cd3108f1410b56f6a84188eee23ab48a3621b209a67eea64293394","870c540da9fafde331a3316cee50c17ad76ddb9160b78b317bef2e6f6fc4bac0","470b4cccaea895d8a5820aed088357e380d66b8e7510f0a1ea9b575850160241","8a55f8942af0aec1e0df3ab328b974a7888ffd60ded48cc6862013da0f41afbc","2e51e8409f28baf93e665df2a9d646a1bf9ac8703cbf9a6766cfdefa249d5780","99ef1a23e95910287d39493d8d9d7d1f0b498286f2b1fdbc0b01495f10cf0958","6652200c53a4551efe2a7541072d817562812003f9d9ef0ec17995aa232378f8","39c6c01194df72dda97da2072335c38231ced9b39afa280452afcca901e73643","12097e411d948f77b7b6fa4656c6573481c1b4e2864c1fca9d5b296096707c45","cbe53bf1976aee6cec830a848c6ac132def1503cffde82ccfe5bd15e75cbaa72","eeab5dcfff92dbabb7e285445aba47bd5135a4a3502df59ac546847aeb5a964f","5ea8279a578027abefab9c17cef186cccf000306685e5f2ee78bdf62cae568dd","0607767d89ad9c7686dbb01b37248290b2fa7364b2bf37d86afd51b88756fe66","e4fd5f45c08b52dae40f4cdff45e8681e76b5af5761356c4caed4ca750dc65cd","145b1c82caa2a6d703108444a5cf03e9cb8c3cd3f19299582a564276dbbba734","736b22ec91ae9b4b2b15e8d8c220f6c152d4f2228f6d46c16e6a9b98b4733120","ac776cb8b40f92cdd307b16b83e18eeb1fbaa5b5d6bd992b3fda0b4d6de8524c","65ba30e2202fdf6f37da0f7cfe31dfb5308c9209885aaf4cef4d572fd14e2903","54e8389455ec2252de063e83d3ce72529d674e6d2dc2070661f01d4f76b63475","fbbbfb525dd0255ee332d51f59648265aaa20c2e9eff007765cf4d4a6940a849","8de5e418f34d04f6ea947ce31852092a24a705862e6b810ca9f83c2d5f9cda4d","ea6040989964f012fd3a92a3170891f5f155430b8bbfa4976cde8d11513b62d9","14d94547b5deca767137fbd14dae73e888f3516c742fad18b83be333b38f0b88","47f05203f6368d56158cda2e79167777fc9dcb0c671ef3aabc205a1636c26a29"];

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
            let actionHash = encode("upgradeContractImplementation(address,address)", marketConfig.address, newUtility.address);
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
            await plotusToken.transfer(users[12],toWei(100000));
            await plotusToken.approve(tokenController.address,toWei(200000),{from:users[11]});
            await tokenController.lock(toHex("SM"),toWei(100000),30*3600*24,{from:users[11]});

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

			let userNumber = 1;

			let functionSignature = encode3("depositAndPlacePrediction(uint,uint,address,uint64,uint256)", 0, 7, plotusToken.address, 100*1e8, 2);
			await marketConfig.setPrice(toWei(0.001));
			await marketConfig.setNextOptionPrice(18);
			await signAndExecuteMetaTx(
		      privateKeyList[userNumber],
		      users[userNumber],
		      functionSignature,
		      allMarkets
		      );
			userNumber++;
			await marketConfig.setPrice(toWei(0.002));
			await marketConfig.setNextOptionPrice(18);
			functionSignature = encode3("depositAndPlacePrediction(uint,uint,address,uint64,uint256)", 0, 7, plotusToken.address, 400*1e8, 2);
			await signAndExecuteMetaTx(
		      privateKeyList[userNumber],
		      users[userNumber],
		      functionSignature,
		      allMarkets
		      );
			userNumber++;
			await marketConfig.setPrice(toWei(0.001));
			await marketConfig.setNextOptionPrice(18);
			functionSignature = encode3("depositAndPlacePrediction(uint,uint,address,uint64,uint256)", 0, 7, plotusToken.address, 210*1e8, 2);
			await signAndExecuteMetaTx(
		      privateKeyList[userNumber],
		      users[userNumber],
		      functionSignature,
		      allMarkets
		      );
			userNumber++;
			await marketConfig.setPrice(toWei(0.015));
			await marketConfig.setNextOptionPrice(27);
			functionSignature = encode3("depositAndPlacePrediction(uint,uint,address,uint64,uint256)", 0, 7, plotusToken.address, 123*1e8, 3);
			await signAndExecuteMetaTx(
		      privateKeyList[userNumber],
		      users[userNumber],
		      functionSignature,
		      allMarkets
		      );
			userNumber++;
			await marketConfig.setPrice(toWei(0.012));
			await marketConfig.setNextOptionPrice(9);
			functionSignature = encode3("depositAndPlacePrediction(uint,uint,address,uint64,uint256)", 0, 7, ethAddress, 1*1e8, 1);
			await signAndExecuteMetaTx(
		      privateKeyList[userNumber],
		      users[userNumber],
		      functionSignature,
		      allMarkets
		      );
			userNumber++;
			await marketConfig.setPrice(toWei(0.014));
			await marketConfig.setNextOptionPrice(9);
			functionSignature = encode3("depositAndPlacePrediction(uint,uint,address,uint64,uint256)", 0, 7, ethAddress, 2*1e8, 1);
			await signAndExecuteMetaTx(
		      privateKeyList[userNumber],
		      users[userNumber],
		      functionSignature,
		      allMarkets
		      );
			userNumber++;
			await marketConfig.setPrice(toWei(0.01));
			await marketConfig.setNextOptionPrice(18);
			functionSignature = encode3("depositAndPlacePrediction(uint,uint,address,uint64,uint256)", 0, 7, ethAddress, 1*1e8, 2);
			await signAndExecuteMetaTx(
		      privateKeyList[userNumber],
		      users[userNumber],
		      functionSignature,
		      allMarkets
		      );
			userNumber++;
			await marketConfig.setPrice(toWei(0.045));
			await marketConfig.setNextOptionPrice(27);
			functionSignature = encode3("depositAndPlacePrediction(uint,uint,address,uint64,uint256)", 0, 7, ethAddress, 3*1e8, 3);
			await signAndExecuteMetaTx(
		      privateKeyList[userNumber],
		      users[userNumber],
		      functionSignature,
		      allMarkets
		      );
			userNumber++;
			await marketConfig.setPrice(toWei(0.051));
			await marketConfig.setNextOptionPrice(27);
			functionSignature = encode3("depositAndPlacePrediction(uint,uint,address,uint64,uint256)", 0, 7, ethAddress, 1*1e8, 3);
			await signAndExecuteMetaTx(
		      privateKeyList[userNumber],
		      users[userNumber],
		      functionSignature,
		      allMarkets
		      );
			userNumber++;
			await marketConfig.setPrice(toWei(0.012));
			await marketConfig.setNextOptionPrice(18);
			functionSignature = encode3("depositAndPlacePrediction(uint,uint,address,uint64,uint256)", 0, 7, ethAddress, 2*1e8, 2);
			await signAndExecuteMetaTx(
		      privateKeyList[userNumber],
		      users[userNumber],
		      functionSignature,
		      allMarkets
		      );

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
			await governance.setAllMarketsAddress();
			await plotusToken.transfer(users[12], "700000000000000000000");
			await plotusToken.approve(allMarkets.address, "500000000000000000000", {
				from: users[12],
			});
			let proposalId = await governance.getProposalLength();
			let marketETHBalanceBeforeDispute = await web3.eth.getBalance(marketInstance.address);
			let registryBalanceBeforeDispute = await web3.eth.getBalance(plotusNewInstance.address);
			await allMarkets.raiseDispute(7, "500000000000000000000","","","", {from: users[12]});
			await increaseTime(604810);
			await governance.closeProposal(proposalId/1);
			let balanceAfterClosingDispute = await web3.eth.getBalance(marketInstance.address);
			assert.equal(marketETHBalanceBeforeDispute/1, balanceAfterClosingDispute/1);

			await increaseTime(60*61);

			let userRewardEth = [0,0,0,0,3.271725,6.54345,0,0,0,0];
			let userRewardPlot = [0,0,0,0,270.5896375,541.179275,0,0,0,0];

			for(i=1;i<11;i++)
			{
				let reward = await allMarkets.getReturn(users[i],7);
				assert.equal(reward[0]/1e8,userRewardPlot[i-1]);
				assert.equal(reward[1]/1e8,userRewardEth[i-1]);
				let ethBalBefore = await web3.eth.getBalance(users[i]);
				let plotBalBefore = await plotusToken.balanceOf(users[i]);
				let plotEthUnused = await allMarkets.getUserUnusedBalance(users[i]);
				functionSignature = encode3("withdraw(uint,uint256,uint)", plotEthUnused[0].iadd(plotEthUnused[1]),plotEthUnused[2].iadd(plotEthUnused[3]), 100);
				await signAndExecuteMetaTx(
			      privateKeyList[i],
			      users[i],
			      functionSignature,
			      allMarkets
			      );
				let ethBalAfter = await web3.eth.getBalance(users[i]);
				let plotBalAfter = await plotusToken.balanceOf(users[i]);
				assert.equal(Math.round((ethBalAfter-ethBalBefore)/1e18),Math.round((unusedEth[i]-usedEth[i-1])/1+reward[1]/1e8));
				assert.equal(Math.round((plotBalAfter-plotBalBefore)/1e18),Math.round((unusedPlot[i]-usedPlot[i-1])/1+reward[0]/1e8));
			}
			let marketCreatorReward = await marketIncentives.getPendingMarketCreationRewards(users[11]);
			assert.equal(0.174825,marketCreatorReward[2]/1e18);
			assert.equal(208145875,Math.round(marketCreatorReward[1]/1e11));

			let ethBalBeforeCreator = await web3.eth.getBalance(users[11]);
			let plotBalBeforeCreator = await plotusToken.balanceOf(users[11]);

			let _gasPrice = 15;

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
