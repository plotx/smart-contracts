const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Governance = artifacts.require("Governance");
const MemberRoles = artifacts.require("MemberRoles");
const ProposalCategory = artifacts.require("ProposalCategory");
const TokenController = artifacts.require("TokenController");
const NXMaster = artifacts.require("Master");
const Market = artifacts.require("MockMarket");
const MarketConfig = artifacts.require("MockConfig");
const MockUniswapRouter = artifacts.require("MockUniswapRouter");
const PlotusToken = artifacts.require("MockPLOT");
const Plotus = artifacts.require("MockMarketRegistry");
const MockchainLink = artifacts.require("MockChainLinkAggregator");
const assertRevert = require("./utils/assertRevert.js").assertRevert;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const latestTime = require("./utils/latestTime.js").latestTime;
const encode = require("./utils/encoder.js").encode;
const { toHex, toWei } = require("./utils/ethTools.js");
const expectEvent = require("./utils/expectEvent");
const gvProp = require("./utils/gvProposal.js").gvProposal;
const Web3 = require("web3");
const { assert } = require("chai");
// const gvProposalWithIncentive = require("./utils/gvProposal.js").gvProposalWithIncentive;
const gvProposal = require("./utils/gvProposal.js").gvProposalWithIncentiveViaTokenHolder;
const web3 = new Web3();
const AdvisoryBoard = "0x41420000";
let maxAllowance = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

let gv;
let cr;
let pc;
let nxms;
let proposalId;
let pId;
let mr;
let plotusToken;
let tc;
let td;
let pl;
let mockchainLinkInstance;

contract("PlotX", ([ab1, ab2, ab3, ab4, mem1, mem2, mem3, mem4, mem5, mem6, mem7, mem8, mem9, mem10, notMember, dr1, dr2, dr3]) => {
	before(async function() {
		nxms = await OwnedUpgradeabilityProxy.deployed();
		nxms = await NXMaster.at(nxms.address);
		plotusToken = await PlotusToken.deployed();
		let address = await nxms.getLatestAddress(toHex("GV"));
		gv = await Governance.at(address);
		address = await nxms.getLatestAddress(toHex("PC"));
		pc = await ProposalCategory.at(address);
		address = await nxms.getLatestAddress(toHex("MR"));
		mr = await MemberRoles.at(address);
		address = await nxms.getLatestAddress(toHex("PL"));
		pl = await Plotus.at(address);
		mockchainLinkInstance = await MockchainLink.deployed();
		marketConfig = await pl.marketUtility();
		marketConfig = await MarketConfig.at(marketConfig);
		MockUniswapRouterInstance = await MockUniswapRouter.deployed();
		tc = await TokenController.at(await nxms.getLatestAddress(toHex("MR")));
		await assertRevert(pl.setMasterAddress());
		// try {
		// 	await (gv.setMasterAddress());
		// } catch (e) {
		// 	console.log(e);
		// }
		await assertRevert(pl.callMarketResultEvent([1, 2], 1, 1,1));
		await assertRevert(pl.addInitialMarketTypesAndStart(Math.round(Date.now() / 1000), mem1, plotusToken.address, {from:mem2}));
		await assertRevert(pl.addInitialMarketTypesAndStart(Math.round(Date.now() / 1000), mem1, plotusToken.address));
		await assertRevert(pl.initiate(mem1, mem1, mem1, [mem1, mem1, mem1, mem1]));
		await plotusToken.transfer(mem1, toWei(100));
		await plotusToken.transfer(mem2, toWei(100));
		await plotusToken.transfer(mem3, toWei(100));
		await plotusToken.transfer(mem4, toWei(100));
		await plotusToken.transfer(mem5, toWei(100));

		// await mr.addInitialABandDRMembers([ab2, ab3, ab4], [dr1, dr2, dr3], { from: ab1 });
	});

	it("Should create a proposal to whitelist sponsor", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 22, 0);
		let startTime = (await latestTime()) / 1 + 2 * 604800;
		let market= await Market.new();
		let actionHash = encode("whitelistSponsor(address)", ab1);
		await gv.submitProposalWithSolution(pId, "whitelistSponsor", actionHash);
		await gv.submitVote(pId, 1, { from: ab1 });
		await gv.submitVote(pId, 1, { from: mem1 });
		await gv.submitVote(pId, 1, { from: mem2 });
		await gv.submitVote(pId, 1, { from: mem3 });
		await gv.submitVote(pId, 1, { from: mem4 });
		await gv.submitVote(pId, 1, { from: mem5 });
		let canClose = await gv.canCloseProposal(pId);
    	assert.equal(canClose.toNumber(), 0);
		await increaseTime(604810);
		await assertRevert(gv.submitVote(pId, 1, { from: mem2 })); //closed to vote
		await gv.closeProposal(pId);
		let openMarketsBefore = await pl.getOpenMarkets();
		await increaseTime(604850);
		await gv.triggerAction(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 3);
	});

	it("Should create a proposal to add new market curreny", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 16, 0);
		let startTime = (await latestTime()) / 1 + 2 * 604800;
		let market= await Market.new();
		let actionHash = encode("addNewMarketCurrency(address,uint64)", market.address, startTime);
		await gv.submitProposalWithSolution(pId, "addNewMarketCurrency", actionHash);
		await gv.submitVote(pId, 1, { from: ab1 });
		await gv.submitVote(pId, 1, { from: mem1 });
		await gv.submitVote(pId, 1, { from: mem2 });
		await gv.submitVote(pId, 1, { from: mem3 });
		await gv.submitVote(pId, 1, { from: mem4 });
		await gv.submitVote(pId, 1, { from: mem5 });
		await increaseTime(604810);
		await assertRevert(gv.submitVote(pId, 1, { from: mem2 })); //closed to vote
		await gv.closeProposal(pId);
		let openMarketsBefore = await pl.getOpenMarkets();
		await increaseTime(604850);
		await gv.triggerAction(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 3);
		let openMarkets = await pl.getOpenMarkets();
		assert.isAbove(openMarkets[2].length, openMarketsBefore[2].length, "Currency not added");
	});

	it("Prredict on newly created market", async function() {
		let openMarkets = await pl.getOpenMarkets();
		marketInstance = await Market.at(openMarkets[0][2]);
		// await increaseTime(10001);
		assert.ok(marketInstance);
		await marketConfig.setOptionPrice(1, 9);
		await marketConfig.setOptionPrice(2, 18);
		await marketConfig.setOptionPrice(3, 27);

		// await marketConfig.setAMLComplianceStatus(ab1, true);
		// await marketConfig.setKYCComplianceStatus(ab1, true);

		// set price
		// user 1
		// set price lot
		await MockUniswapRouterInstance.setPrice("1000000000000000");
		await marketConfig.setPrice("1000000000000000");
		await plotusToken.approve(openMarkets["_openMarkets"][2], "18000000000000000000000000");
		await marketInstance.claimReturn(ab1);
		await assertRevert(marketInstance.placePrediction(plotusToken.address, "10000000000000000000", 9, 1));
		await assertRevert(marketInstance.placePrediction(ab1, "10000000000000000000", 9, 1));
		await plotusToken.approve(marketInstance.address, "18000000000000000000000000", {from:mem1});
		await assertRevert(marketInstance.sponsorIncentives(plotusToken.address, "1000000000000000000", {from:mem1}));
		await marketInstance.sponsorIncentives(plotusToken.address, "1000000000000000000");
		await assertRevert(marketInstance.sponsorIncentives(plotusToken.address, "1000000000000000000"));
		await marketInstance.placePrediction(plotusToken.address, "1000000000000000000000", 1, 1);
		let totalStaked = await pl.getTotalAssetStakedByUser(ab1);
		assert.equal(totalStaked[0]/1, "1000000000000000000000");
		await marketInstance.placePrediction(plotusToken.address, "8000000000000000000000", 1, 1);
		await assertRevert(marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "10000000000000000000", 1, 1, { value: 1000 }));
		await assertRevert(marketInstance.calculatePredictionResult(1));
		await assertRevert(marketInstance.calculatePredictionResult(0));
		await increaseTime(604810);
		await marketInstance.claimReturn(ab1);
		await marketInstance.calculatePredictionResult(1);
		await assertRevert(marketInstance.sponsorIncentives(plotusToken.address, "1000000000000000000"));
		await assertRevert(marketInstance.placePrediction(plotusToken.address, "10000000000000000000", 1, 1));
		await assertRevert(marketInstance.calculatePredictionResult(0));
		await marketInstance.claimReturn(ab1);
		await increaseTime(604800);
	});

	it("Should create a proposal to add new market type", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 15, 0);
		let startTime = Math.round(Date.now());
		startTime = (await latestTime()) / 1 + 3 * 604800;
		// startTime = Math.round((Date.now())/1000) + 2*604800;
		let actionHash = encode("addNewMarketType(uint64,uint64,uint64)", 60 * 60 * 2, startTime, 10);
		await gv.submitProposalWithSolution(pId, "update max followers limit", actionHash);

		actionHash = encode("addNewMarketType(uint64,uint64,uint64)", 60 * 60 * 2, 1, 10);
		await assertRevert(gv.submitProposalWithSolution(pId, "update max followers limit", actionHash)); //should revert as start time is not enough
		actionHash = encode("addNewMarketType(uint64,uint64,uint64)", 60 * 60 * 2, await latestTime(),10);
		await assertRevert(gv.submitProposalWithSolution(pId, "update max followers limit", actionHash)); //should revert as start time is not enough

		await gv.submitVote(pId, 1, { from: ab1 });
		await gv.submitVote(pId, 1, { from: mem1 });
		await gv.submitVote(pId, 1, { from: mem2 });
		await gv.submitVote(pId, 1, { from: mem3 });
		await gv.submitVote(pId, 1, { from: mem4 });
		await gv.submitVote(pId, 1, { from: mem5 });
		await assertRevert(gv.triggerAction(pId)); //cannot trigger
		await increaseTime(604810);
		await assertRevert(gv.triggerAction(pId)); //cannot trigger
		await gv.closeProposal(pId);
		let openMarketsBefore = await pl.getOpenMarkets();
		await increaseTime(604810);
		await gv.triggerAction(pId);
		await assertRevert(gv.triggerAction(pId)); //cannot trigger
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 3);
		let solutionAction = await gv.getSolutionAction(pId, 1);
		assert.equal(parseFloat(solutionAction[0]), 1);
		let voteData = await gv.voteTallyData(pId, 1);
		assert.equal(parseFloat(voteData[0]), 1.50005e+25);
		assert.equal(parseFloat(voteData[1]), 1);
		assert.equal(parseFloat(voteData[2]), 6);

		let openMarkets = await pl.getOpenMarkets();
		assert.isAbove(openMarkets[1].length, openMarketsBefore[1].length, "Currency not added");
	});

	it("Predict on newly created market", async function() {
		let openMarkets = await pl.getOpenMarkets();
		await increaseTime(604810);
		marketInstance = await Market.at(openMarkets[0][9]);
		// await increaseTime(10001);

		assert.ok(marketInstance);
		await marketConfig.setOptionPrice(1, 9);
		await marketConfig.setOptionPrice(2, 18);
		await marketConfig.setOptionPrice(3, 27);
		await assertRevert(pl.createMarket(3, 0)); //should revert as market is live

		// await marketConfig.setAMLComplianceStatus(ab1, true);
		// await marketConfig.setKYCComplianceStatus(ab1, true);
		// set price
		// user 1
		// set price lot
		await MockUniswapRouterInstance.setPrice("1000000000000000");
		await marketConfig.setPrice("1000000000000000");
		await plotusToken.approve(openMarkets["_openMarkets"][9], "100000000000000000000");
		await marketInstance.estimatePredictionValue(1, "10000000000000000000", 1);
		await marketInstance.placePrediction(plotusToken.address, "10000000000000000000", 1, 1);
		let reward = await marketInstance.getReturn(ab1);
		assert.equal(reward[0].length, 0);
		await increaseTime(3650);
		await pl.createMarket(0, 0);
		await increaseTime(604810);
		await marketInstance.settleMarket();
		await increaseTime(604800);
		// await pl.exchangeCommission(marketInstance.address);
		await marketInstance.getData();
		// balanceBefore = (await plotusToken.balanceOf(ab1))/1;
		// await marketInstance.claimReturn(ab1);
		// balanceAfter = (await plotusToken.balanceOf(ab1))/1;
		// assert.isAbove(balanceAfter, balanceBefore);
	});

	it("Claim Rewards", async function() {
		await pl.getMarketDetailsUser(ab1, 0, 5);
		await pl.getMarketDetailsUser(ab1, 5, 5);
		await pl.getMarketDetailsUser(ab1, 0, 0);
		let userDetails = await pl.getMarketDetailsUser(ab1, 0, 2);
		assert.equal(userDetails[0].length, 2);
		balanceBefore = (await plotusToken.balanceOf(ab1)) / 1;
		await pl.claimPendingReturn(10);
		await pl.claimPendingReturn(10);
		balanceAfter = (await plotusToken.balanceOf(ab1)) / 1;
		assert.isAbove(balanceAfter, balanceBefore);
		await marketInstance.claimReturn(ab1);
	});

	it("Create market ", async function() {
		// function createMarketFallback(_marketType, uint64 _marketCurrencyIndex) external payable{
		await pl.createMarket(0, 1);
		await assertRevert(pl.createMarket(0, 1));
		await assertRevert(pl.createMarket(0, 1));

		pId = (await gv.getProposalLength()).toNumber();
		await gvProposal(17, "0x", await MemberRoles.at(await nxms.getLatestAddress(toHex("MR"))), gv, 2, 0);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 3);
		await assertRevert(pl.createMarket(0, 1));
	});
});
contract("PlotX", ([ab1, ab2, ab3, ab4, mem1, mem2, mem3, mem4, mem5, mem6, mem7, mem8, mem9, mem10, notMember, dr1, dr2, dr3]) => {
	before(async function() {
		nxms = await OwnedUpgradeabilityProxy.deployed();
		nxms = await NXMaster.at(nxms.address);
		plotusToken = await PlotusToken.deployed();
		let address = await nxms.getLatestAddress(toHex("GV"));
		gv = await Governance.at(address);
		address = await nxms.getLatestAddress(toHex("PC"));
		pc = await ProposalCategory.at(address);
		address = await nxms.getLatestAddress(toHex("MR"));
		mr = await MemberRoles.at(address);
		address = await nxms.getLatestAddress(toHex("PL"));
		pl = await Plotus.at(address);
		mockchainLinkInstance = await MockchainLink.deployed();
		marketConfig = await pl.marketUtility();
		marketConfig = await MarketConfig.at(marketConfig);
		MockUniswapRouterInstance = await MockUniswapRouter.deployed();
		tc = await TokenController.at(await nxms.getLatestAddress(toHex("MR")));
		await assertRevert(pl.setMasterAddress());
		await assertRevert(pl.callMarketResultEvent([1, 2], 1, 1,1));

		await plotusToken.transfer(mem1, toWei(100));
		await plotusToken.transfer(mem2, toWei(100));
		await plotusToken.transfer(mem3, toWei(100));
		await plotusToken.transfer(mem4, toWei(100));
		await plotusToken.transfer(mem5, toWei(100));

		// await mr.addInitialABandDRMembers([ab2, ab3, ab4], [dr1, dr2, dr3], { from: ab1 });
	});

	it("Should create a proposal to add new market curreny", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 16, 100);
		let startTime = (await latestTime()) / 1 + 2 * 604800;
		let market= await Market.new();
		let actionHash = encode("addNewMarketCurrency(address,uint64)", market.address, startTime);
		await gv.submitProposalWithSolution(pId, "addNewMarketCurrency", actionHash);

		await gv.submitVote(pId, 1, { from: ab1 });
		await gv.submitVote(pId, 1, { from: mem1 });
		await gv.submitVote(pId, 1, { from: mem2 });
		await gv.submitVote(pId, 1, { from: mem3 });
		await gv.submitVote(pId, 1, { from: mem4 });
		await gv.submitVote(pId, 1, { from: mem5 });

		await increaseTime(604810);
		await assertRevert(gv.submitVote(pId, 1, { from: mem2 })); //closed to vote
		await gv.closeProposal(pId);

		let openMarketsBefore = await pl.getOpenMarkets();
		await increaseTime(604810);
		await gv.triggerAction(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 3);
		let openMarkets = await pl.getOpenMarkets();
		assert.isAbove(openMarkets[2].length, openMarketsBefore[2].length, "Currency not added");
	});

	it("2. Should create a proposal to add new market currency", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 16, 0);
		let startTime = (await latestTime()) / 1 + 2 * 604800;
		let market= await Market.new();
		let actionHash = encode("addNewMarketCurrency(address,uint64)", market.address, "0x12", "A", true, startTime);
		await gv.submitProposalWithSolution(pId, "addNewMarketCurrency", actionHash);
		oldGVBalance = parseFloat(await plotusToken.balanceOf(gv.address));
		await increaseTime(604810);
		await gv.closeProposal(pId);
		newGVBalance = parseFloat(await plotusToken.balanceOf(gv.address));
		assert.equal(oldGVBalance, newGVBalance);
		await increaseTime(604810);
		actionStatus = await gv.proposal(pId);
		assert.equal(parseFloat(actionStatus[2]), 5);
	});

	it("Should claim market creation rewards", async function() {
		let oldBalance = parseFloat(await plotusToken.balanceOf(ab1));
		await pl.claimCreationReward();
		let newBalance = parseFloat(await plotusToken.balanceOf(ab1));
		assert.isAbove(newBalance/1,oldBalance/1);
		await pl.getUintParameters("0x12");
	});

	it("Should revert if unauthorized member call Registry functions", async function() {
		await assertRevert(pl.claimCreationReward());
		await assertRevert(pl.createGovernanceProposal("","","","0x12",0,ab1, 0,0,0));
		await assertRevert(pl.setUserGlobalPredictionData(ab1, 0,0,ab1,0,0));
		await assertRevert(pl.callClaimedEvent(ab1, [0,0],[ab1],0,ab1));
	})
});
