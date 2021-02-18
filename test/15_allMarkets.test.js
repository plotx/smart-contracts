const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Governance = artifacts.require("Governance");
const MemberRoles = artifacts.require("MemberRoles");
const ProposalCategory = artifacts.require("ProposalCategory");
const TokenController = artifacts.require("TokenController");
const NXMaster = artifacts.require("Master");
const AllMarkets = artifacts.require("MockAllMarkets");
const MarketCreationRewards = artifacts.require('MarketCreationRewards');
const MockChainLinkGasPriceAgg = artifacts.require("MockChainLinkGasPriceAgg");
const MarketConfig = artifacts.require("MockConfig");
const PlotusToken = artifacts.require("MockPLOT");
const MockchainLink = artifacts.require("MockChainLinkAggregator");
const assertRevert = require("./utils/assertRevert.js").assertRevert;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const latestTime = require("./utils/latestTime.js").latestTime;
const encode = require("./utils/encoder.js").encode;
const encode1 = require("./utils/encoder.js").encode1;
const { toHex, toWei } = require("./utils/ethTools.js");
const expectEvent = require("./utils/expectEvent");
const gvProp = require("./utils/gvProposal.js").gvProposal;
// const Web3 = require("web3");
const { assert } = require("chai");
// const gvProposalWithIncentive = require("./utils/gvProposal.js").gvProposalWithIncentive;
const gvProposal = require("./utils/gvProposal.js").gvProposalWithIncentiveViaTokenHolder;
// const web3 = new Web3();
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
let allMarkets, marketIncentives, tokenController;
let nullAddress = "0x0000000000000000000000000000000000000000";

contract("PlotX", ([ab1, ab2, ab3, ab4, mem1, mem2, mem3, mem4, mem5, mem6, mem7, mem8, mem9, mem10, notMember, dr1, dr2, dr3, user11, user12, user13, user14]) => {
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
		mockchainLinkInstance = await MockchainLink.deployed();
		marketConfig = await nxms.getLatestAddress(toHex("MU"));
		marketConfig = await MarketConfig.at(marketConfig);
		tc = await TokenController.at(await nxms.getLatestAddress(toHex("TC")));
		
		governance = await nxms.getLatestAddress(toHex("GV"));
		governance = await Governance.at(governance);
		tokenController  =await TokenController.at(await nxms.getLatestAddress(toHex("TC")));
        marketConfig = await MarketConfig.at(marketConfig.address);
        let date = await latestTime();
        await increaseTime(3610);
        date = Math.round(date);
        // await marketConfig.setInitialCummulativePrice();
		allMarkets = await AllMarkets.at(await nxms.getLatestAddress(toHex("AM")));
		marketIncentives = await MarketCreationRewards.at(await nxms.getLatestAddress(toHex("MC")));
        await assertRevert(marketIncentives.setMasterAddress());
        // await assertRevert(marketIncentives.initialise(marketConfig.address, mockchainLinkInstance.address));
        await increaseTime(5 * 3600);
        await plotusToken.transfer(marketIncentives.address,toWei(100000));
        await plotusToken.transfer(user11,toWei(100000));
        await plotusToken.transfer(user12,toWei(100000));
		await plotusToken.transfer(user14,toWei(100000));
        await plotusToken.approve(tokenController.address,toWei(200000),{from:user11});
        await tokenController.lock(toHex("SM"),toWei(100000),30*3600*24,{from:user11});

		await plotusToken.transfer(mem1, toWei(100));
		await plotusToken.transfer(mem2, toWei(100));
		await plotusToken.transfer(mem3, toWei(100));
		await plotusToken.transfer(mem4, toWei(100));
		await plotusToken.transfer(mem5, toWei(100));

	});

	it("Should create a proposal to whitelist sponsor", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 21, 0);
		let startTime = (await latestTime()) / 1 + 2 * 604800;
		let actionHash = encode("whitelistSponsor(address)", ab1);
		await gv.submitProposalWithSolution(pId, "whitelistSponsor", actionHash);
		await gv.submitVote(pId, 1, { from: ab1 });
		// let canClose = await gv.canCloseProposal(pId);
  		//assert.equal(canClose.toNumber(), 1);
		await increaseTime(604810);
		await assertRevert(gv.submitVote(pId, 1, { from: mem2 })); //closed to vote
		await gv.closeProposal(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 3);
	});

	it("Should not add new market curreny if already exists", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 15, 0);
		let startTime = (await latestTime()) / 1 + 2 * 604800;
		let actionHash = encode("addMarketCurrency(bytes32,address,uint8,uint8,uint32)", toHex("ETH/USD"), mockchainLinkInstance.address, 8, 1, startTime);
		await gv.submitProposalWithSolution(pId, "addNewMarketCurrency", actionHash);
		await gv.submitVote(pId, 1, { from: ab1 });
		await increaseTime(604810);
		await assertRevert(gv.submitVote(pId, 1, { from: mem2 })); //closed to vote
		await gv.closeProposal(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
	});

	it("Should not add new market curreny if decimals passed is zero", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 15, 0);
		let startTime = (await latestTime()) / 1 + 2 * 604800;
		let actionHash = encode("addMarketCurrency(bytes32,address,uint8,uint8,uint32)", toHex("ETH/PLOT"), mockchainLinkInstance.address, 0, 1, startTime);
		await gv.submitProposalWithSolution(pId, "addNewMarketCurrency", actionHash);
		await gv.submitVote(pId, 1, { from: ab1 });
		await increaseTime(604810);
		await assertRevert(gv.submitVote(pId, 1, { from: mem2 })); //closed to vote
		await gv.closeProposal(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
	});

	it("Should not add new market curreny if round off argument passed is zero", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 15, 0);
		let startTime = (await latestTime()) / 1 + 2 * 604800;
		let actionHash = encode("addMarketCurrency(bytes32,address,uint8,uint8,uint32)", toHex("ETH/PLOT"), mockchainLinkInstance.address, 8, 0, startTime);
		await gv.submitProposalWithSolution(pId, "addNewMarketCurrency", actionHash);
		await gv.submitVote(pId, 1, { from: ab1 });
		await increaseTime(604810);
		await assertRevert(gv.submitVote(pId, 1, { from: mem2 })); //closed to vote
		await gv.closeProposal(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
	});

	it("Should create a proposal to add new market curreny", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 15, 0);
		let startTime = (await latestTime()) / 1 + 2 * 604800;
		let actionHash = encode("addMarketCurrency(bytes32,address,uint8,uint8,uint32)", toHex("ETH/PLOT"), mockchainLinkInstance.address, 8, 1, startTime);
		await gv.submitProposalWithSolution(pId, "addNewMarketCurrency", actionHash);
		await gv.submitVote(pId, 1, { from: ab1 });
		await increaseTime(604810);
		await assertRevert(gv.submitVote(pId, 1, { from: mem2 })); //closed to vote
		await gv.closeProposal(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 3);
		await plotusToken.approve(allMarkets.address, toWei(1000000), {from:user14});
		await increaseTime(604810);
		await allMarkets.createMarket(2,0,{from:user14});
	});

	it("Predict on newly created market", async function() {
		await marketConfig.setNextOptionPrice(18);

		// set price
		// user 1
		// set price lot
		await marketConfig.setPrice("1000000000000000");
		await plotusToken.approve(allMarkets.address, "18000000000000000000000000");
		await plotusToken.approve(allMarkets.address, "18000000000000000000000000", {from:mem1});
		await plotusToken.approve(allMarkets.address, "18000000000000000000000000");
		await assertRevert(allMarkets.depositAndPlacePrediction("100000000000000000000", 7, plotusToken.address, 100*1e8, 5));
		await assertRevert(allMarkets.depositAndPlacePrediction("100000000000000000000", 7, allMarkets.address, 100*1e8, 1));
		await assertRevert(allMarkets.depositAndPlacePrediction("10000000", 7, plotusToken.address, 100*1e8, 1));
		await allMarkets.depositAndPlacePrediction("100000000000000000000", 7, plotusToken.address, 100*1e8, 1);
		// await allMarkets.placePrediction(plotusToken.address, "1000000000000000000000", 1, 1);
		let totalStaked = await allMarkets.getUserFlags(7, ab1);
		assert.equal(totalStaked[0], false);
    	await allMarkets.depositAndPlacePrediction("8000000000000000000000", 7, plotusToken.address, 8000*1e8, 2);
    	await allMarkets.depositAndPlacePrediction("8000000000000000000000", 7, plotusToken.address, 8000*1e8, 3);
		// await assertRevert(marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "10000000000000000000", 1, 1, { value: 1000 }));
		// await assertRevert(allMarkets.settleMarket(7));
		await assertRevert(allMarkets.postResultMock(0,7));
		await increaseTime(604810);
		// await allMarkets.withdrawMax(100);
		// await marketInstance.claimReturn(ab1);
		await allMarkets.postResultMock(1, 7);
		// await assertRevert(marketInstance.placePrediction(plotusToken.address, "10000000000000000000", 1, 1));
		await increaseTime(604800);
		let balance = await allMarkets.getUserUnusedBalance(ab1);
		await allMarkets.withdraw((balance[1]), 100);
		// await marketInstance.claimReturn(ab1);
		await increaseTime(604800);
	});

	it("Should not add new market type if prediction type already exists", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 14, 0);
		let startTime = Math.round(Date.now());
		startTime = (await latestTime()) / 1 + 3 * 604800;
		let actionHash = encode("addMarketType(uint32,uint32,uint32,uint32,uint32)", 24 * 60 * 60, 50, startTime, 3600, 100);
		await gv.submitProposalWithSolution(pId, "update max followers limit", actionHash);
		await gv.submitVote(pId, 1, { from: ab1 });
		await increaseTime(604810);
		await gv.closeProposal(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
	});

	it("Should not add new market type if prediction is zero", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 14, 0);
		let startTime = Math.round(Date.now());
		startTime = (await latestTime()) / 1 + 3 * 604800;
		let actionHash = encode("addMarketType(uint32,uint32,uint32,uint32,uint32)", 0, 50, startTime, 3600, 100);
		await gv.submitProposalWithSolution(pId, "update max followers limit", actionHash);
		await gv.submitVote(pId, 1, { from: ab1 });
		await increaseTime(604810);
		await gv.closeProposal(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
	});

	it("Should not add new market type if option range percent is zero", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 14, 0);
		let startTime = Math.round(Date.now());
		startTime = (await latestTime()) / 1 + 3 * 604800;
		let actionHash = encode("addMarketType(uint32,uint32,uint32,uint32,uint32)", 6 * 60 * 60, 0, startTime, 3600, 100);
		await gv.submitProposalWithSolution(pId, "update max followers limit", actionHash);
		await gv.submitVote(pId, 1, { from: ab1 });
		await increaseTime(604810);
		await gv.closeProposal(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
	});

	it("Should not add new market type if cooldown time is zero", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 14, 0);
		let startTime = Math.round(Date.now());
		startTime = (await latestTime()) / 1 + 3 * 604800;
		let actionHash = encode("addMarketType(uint32,uint32,uint32,uint32,uint32)", 6 * 60 * 60, 50, startTime, 0, 100);
		await gv.submitProposalWithSolution(pId, "update max followers limit", actionHash);
		await gv.submitVote(pId, 1, { from: ab1 });
		await increaseTime(604810);
		await gv.closeProposal(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
	});

	it("Should not add new market type if min time passed is zero", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 14, 0);
		let startTime = Math.round(Date.now());
		startTime = (await latestTime()) / 1 + 3 * 604800;
		let actionHash = encode("addMarketType(uint32,uint32,uint32,uint32,uint32)", 6 * 60 * 60, 50, startTime, 3600, 0);
		await gv.submitProposalWithSolution(pId, "update max followers limit", actionHash);
		await gv.submitVote(pId, 1, { from: ab1 });
		await increaseTime(604810);
		await gv.closeProposal(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
	});

	it("Should not update market type if option range percent is zero", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 25, 0);
		let startTime = Math.round(Date.now());
		startTime = (await latestTime()) / 1 + 3 * 604800;
		let actionHash = encode("updateMarketType(uint32,uint32,uint32,uint32)", 6 * 60 * 60, 0, 3600, 100);
		await gv.submitProposalWithSolution(pId, "update max followers limit", actionHash);
		await gv.submitVote(pId, 1, { from: ab1 });
		await increaseTime(604810);
		await gv.closeProposal(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
	});

	it("Should not update market type if cooldown time is zero", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 25, 0);
		let actionHash = encode("updateMarketType(uint32,uint32,uint32,uint32)", 6 * 60 * 60, 50, 0, 100);
		await gv.submitProposalWithSolution(pId, "update max followers limit", actionHash);
		await gv.submitVote(pId, 1, { from: ab1 });
		await increaseTime(604810);
		await gv.closeProposal(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
	});

	it("Should not update market type if min time passed is zero", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 25, 0);
		let startTime = Math.round(Date.now());
		startTime = (await latestTime()) / 1 + 3 * 604800;
		let actionHash = encode("updateMarketType(uint32,uint32,uint32,uint32)", 6 * 60 * 60, 50, 3600, 0);
		await gv.submitProposalWithSolution(pId, "update max followers limit", actionHash);
		await gv.submitVote(pId, 1, { from: ab1 });
		await increaseTime(604810);
		await gv.closeProposal(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
	});

	it("Should create a proposal to add new market type", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 14, 0);
		let startTime = Math.round(Date.now());
		startTime = (await latestTime()) / 1 + 3 * 604800;
		// startTime = Math.round((Date.now())/1000) + 2*604800;
		let actionHash = encode("addMarketType(uint32,uint32,uint32,uint32,uint32)", 60 * 60, 50, startTime, 7200, 100);
		await gv.submitProposalWithSolution(pId, "update max followers limit", actionHash);

		actionHash = encode("addMarketType(uint32,uint32,uint32,uint32,uint32)", 60 * 60 * 2, 1, 10, 3600, 100);
		await assertRevert(gv.submitProposalWithSolution(pId, "update max followers limit", actionHash)); //should revert as start time is not enough
		actionHash = encode("addMarketType(uint32,uint32,uint32,uint32,uint32)", 60 * 60 * 2, await latestTime(),10, 3600, 100);
		await assertRevert(gv.submitProposalWithSolution(pId, "update max followers limit", actionHash)); //should revert as start time is not enough

		await gv.submitVote(pId, 1, { from: ab1 });
		await assertRevert(gv.triggerAction(pId)); //cannot trigger
		await increaseTime(604810);
		await assertRevert(gv.triggerAction(pId)); //cannot trigger
		await gv.closeProposal(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 3);
		let solutionAction = await gv.getSolutionAction(pId, 1);
		assert.equal(parseFloat(solutionAction[0]), 1);
		let voteData = await gv.voteTallyData(pId, 1);
		assert.equal(parseFloat(voteData[0]), 1);
		// assert.equal(parseFloat(voteData[0]), 1.50005e+25);
		// assert.equal(parseFloat(voteData[1]), 1);
		// assert.equal(parseFloat(voteData[2]), 6);
		await increaseTime(604810);
		await increaseTime(604820);
		await allMarkets.createMarket(0,3, {from:user14});

		// let openMarkets = await pl.getOpenMarkets();
		// assert.isAbove(openMarkets[1].length, openMarketsBefore[1].length, "Currency not added");
	});

	it("Predict on newly created market", async function() {
		await marketConfig.setNextOptionPrice(18);
		await assertRevert(allMarkets.createMarket(0,3), {from:user14}); //should revert as market is live
		// await increaseTime(604820);

		// set price
		// user 1
		// set price lot
		await marketConfig.setPrice("1000000000000000");
		await plotusToken.approve(allMarkets.address, "1000000000000000000000");
    	await allMarkets.depositAndPlacePrediction("100000000000000000000", 8, plotusToken.address, 100*1e8, 1);
		let reward = await allMarkets.getReturn(ab1, 8);
		assert.equal(reward, 0);
		await increaseTime(3650);
		await allMarkets.createMarket(0, 3, {from:user14});
		await increaseTime(604810);
		await allMarkets.settleMarket(8);
		let marketSettleTime = await allMarkets.marketSettleTime(8);
		let marketCoolDownTime = await allMarkets.marketCoolDownTime(8);
		assert.equal(marketCoolDownTime/1 - marketSettleTime/1, 7200);
		await allMarkets.settleMarket(9);
		await allMarkets.createMarket(0, 3);
		await increaseTime(604800);
		await allMarkets.createMarket(0, 3);
		// await pl.exchangeCommission(marketInstance.address);
		await allMarkets.getMarketData(8);
	});

	it("Pause market creation ", async function() {
		await allMarkets.createMarket(0, 1);
		await assertRevert(allMarkets.createMarket(0, 1));
		pId = (await gv.getProposalLength()).toNumber();
		await gvProposal(16, "0x", await MemberRoles.at(await nxms.getLatestAddress(toHex("MR"))), gv, 2, 0);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 3);
		await increaseTime(604800);
		await assertRevert(allMarkets.createMarket(0, 1));
		let balance = await allMarkets.getUserUnusedBalance(ab1);
		balance = (balance[0]/1+balance[1]/1);
		await assertRevert(allMarkets.withdraw(toWei(balance/1e18), 100));
	});

	it("Cannot Pause market creation if already paused", async function() {
		await assertRevert(allMarkets.createMarket(0, 1));
		pId = (await gv.getProposalLength()).toNumber();
		await gvProposal(16, "0x", await MemberRoles.at(await nxms.getLatestAddress(toHex("MR"))), gv, 2, 0);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
		await increaseTime(604800);
	});

	it("Resume market creation ", async function() {
		await assertRevert(allMarkets.createMarket(0, 1));
		pId = (await gv.getProposalLength()).toNumber();
		await gvProposal(17, "0x", await MemberRoles.at(await nxms.getLatestAddress(toHex("MR"))), gv, 2, 0);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 3);
		await increaseTime(604800);
		await allMarkets.createMarket(0, 1);
		let balance = await allMarkets.getUserUnusedBalance(ab1);
		balance = (balance[0]/1+balance[1]/1);
		if(balance > 0) {
			await allMarkets.withdraw(toWei(balance/1e18), 100);
		}
		await assertRevert(allMarkets.withdraw(toWei(balance/1e18), 100));
		
		// await allMarkets.withdrawReward(100);
		// await allMarkets.withdrawReward(100);
	});

	it("Cannot Resume market creation if already live ", async function() {
		await increaseTime(86401);
		await allMarkets.createMarket(0, 1);
		pId = (await gv.getProposalLength()).toNumber();
		await gvProposal(17, "0x", await MemberRoles.at(await nxms.getLatestAddress(toHex("MR"))), gv, 2, 0);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
	});

	it("Pause market creation of 4-hourly markets", async function() {
		await allMarkets.createMarket(0, 0);
		pId = (await gv.getProposalLength()).toNumber();
		let categoryId = await pc.totalCategories();
		categoryId = 22;
		let actionHash = encode1(["uint64","bool"],[0,true])
		await gvProposal(categoryId, actionHash, await MemberRoles.at(await nxms.getLatestAddress(toHex("MR"))), gv, 2, 0);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 3);
		await increaseTime(604800);
		await assertRevert(allMarkets.createMarket(0, 0));
		await allMarkets.createMarket(0, 1);
	});

	it("Resume market creation of 4-hourly markets", async function() {
		await increaseTime(604800);
		await assertRevert(allMarkets.createMarket(0, 0));
		pId = (await gv.getProposalLength()).toNumber();
		let categoryId = await pc.totalCategories();
		categoryId = 22;
		let actionHash = encode1(["uint64","bool"],[0,false])
		await gvProposal(categoryId, actionHash, await MemberRoles.at(await nxms.getLatestAddress(toHex("MR"))), gv, 2, 0);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 3);
		await increaseTime(604800);
		await allMarkets.createMarket(0, 0);
		await allMarkets.createMarket(0, 1);
		await increaseTime(604800);
	});

	it("Cannot Resume market creation of 4-hourly markets if already live", async function() {
		await increaseTime(604800);
		await allMarkets.createMarket(0, 0);
		pId = (await gv.getProposalLength()).toNumber();
		let categoryId = await pc.totalCategories();
		categoryId = 22;
		let actionHash = encode1(["uint64","bool"],[0,false])
		await gvProposal(categoryId, actionHash, await MemberRoles.at(await nxms.getLatestAddress(toHex("MR"))), gv, 2, 0);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
		await increaseTime(604800);
		await allMarkets.createMarket(0, 0);
		await marketIncentives.getPendingMarketCreationRewards(ab1);
		await allMarkets.createMarket(0, 1);
		await increaseTime(604800);
	});

	it("Transfer DAO plot through proposal", async function() {
		await increaseTime(604800);
		pId = (await gv.getProposalLength()).toNumber();
		let categoryId = 18;
		await plotusToken.transfer(marketIncentives.address, toWei(100));
		let daoPLOTbalanceBefore = await plotusToken.balanceOf(marketIncentives.address);
		let userPLOTbalanceBefore = await plotusToken.balanceOf(user11);
		let actionHash = encode1(["address","address","uint256"],[plotusToken.address, user11, toWei(100)])
		await gvProposal(categoryId, actionHash, await MemberRoles.at(await nxms.getLatestAddress(toHex("MR"))), gv, 2, 0);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 3);
		let daoPLOTbalanceAfter = await plotusToken.balanceOf(marketIncentives.address);
		let userPLOTbalanceAfter = await plotusToken.balanceOf(user11);
		assert.equal((daoPLOTbalanceBefore/1e18 - 100).toFixed(2), (daoPLOTbalanceAfter/1e18).toFixed(2));
		assert.equal((userPLOTbalanceBefore/1e18 + 100).toFixed(2), (userPLOTbalanceAfter/1e18).toFixed(2));
		await increaseTime(604800);
	});

	it("Transfer DAO plot through proposal, Should Revert if no balance", async function() {
		await increaseTime(604800);
		pId = (await gv.getProposalLength()).toNumber();
		let categoryId = 18;
		await plotusToken.transfer(marketIncentives.address, toWei(100));
		let daoPLOTbalanceBefore = await plotusToken.balanceOf(marketIncentives.address);
		let userPLOTbalanceBefore = await plotusToken.balanceOf(user11);
		let actionHash = encode1(["address","address","uint256"],[plotusToken.address, user11, toWei(100000000)])
		await gvProposal(categoryId, actionHash, await MemberRoles.at(await nxms.getLatestAddress(toHex("MR"))), gv, 2, 0);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
		let daoPLOTbalanceAfter = await plotusToken.balanceOf(marketIncentives.address);
		let userPLOTbalanceAfter = await plotusToken.balanceOf(user11);
		assert.equal((daoPLOTbalanceBefore/1e18).toFixed(2), (daoPLOTbalanceAfter/1e18).toFixed(2));
		assert.equal((userPLOTbalanceBefore/1e18).toFixed(2), (userPLOTbalanceAfter/1e18).toFixed(2));
		await increaseTime(604800);
	});

	it("Should add new market curreny with null address is passed as feed", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 15, 0);
		let startTime = (await latestTime()) / 1 + 2 * 604800;
		let actionHash = encode("addMarketCurrency(bytes32,address,uint8,uint8,uint32)", toHex("LINK/PLOT"), nullAddress, 8, 1, startTime);
		await gv.submitProposalWithSolution(pId, "addNewMarketCurrency", actionHash);
		await gv.submitVote(pId, 1, { from: ab1 });
		await increaseTime(604810);
		await assertRevert(gv.submitVote(pId, 1, { from: mem2 })); //closed to vote
		await gv.closeProposal(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 3);
	});

	it("Should update market type", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 25, 0);
		let startTime = Math.round(Date.now());
		startTime = (await latestTime()) / 1 + 3 * 604800;
		let actionHash = encode("updateMarketType(uint32,uint32,uint32,uint32)", 0, 10, 3600, 100);
		await gv.submitProposalWithSolution(pId, "update market type", actionHash);
		await gv.submitVote(pId, 1, { from: ab1 });
		await increaseTime(604810);
		await gv.closeProposal(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 3);
	});

	// it("Should update address paramters", async function() {
	// 	let categoryId = await pc.totalCategories();
	// 	categoryId = categoryId*1 - 1;
	// 	await updateParameter(categoryId, 2, "GASAGG", marketIncentives, "address", allMarkets.address);
	// 	await updateInvalidParameter(categoryId, 2, "ABECD", marketIncentives, "address", allMarkets.address);
	// })

});
