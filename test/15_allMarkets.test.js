const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Governance = artifacts.require("GovernanceV2");
const MemberRoles = artifacts.require("MemberRoles");
const ProposalCategory = artifacts.require("ProposalCategory");
const TokenController = artifacts.require("TokenController");
const NXMaster = artifacts.require("Master");
const Market = artifacts.require("MockMarket");
const AllMarkets = artifacts.require("MockAllMarkets");
const MarketCreationRewards = artifacts.require('MarketCreationRewards');
const MockChainLinkGasPriceAgg = artifacts.require("MockChainLinkGasPriceAgg");
const MarketConfig = artifacts.require("MockConfig");
const MockUniswapRouter = artifacts.require("MockUniswapRouter");
const PlotusToken = artifacts.require("MockPLOT");
const Plotus = artifacts.require("MockMarketRegistry");
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

contract("PlotX", ([ab1, ab2, ab3, ab4, mem1, mem2, mem3, mem4, mem5, mem6, mem7, mem8, mem9, mem10, notMember, dr1, dr2, dr3, user11, user12, user13]) => {
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
		tc = await TokenController.at(await nxms.getLatestAddress(toHex("TC")));
		await assertRevert(pl.setMasterAddress());

		governance = await nxms.getLatestAddress(toHex("GV"));
		governance = await Governance.at(governance);
		tokenController  =await TokenController.at(await nxms.getLatestAddress(toHex("TC")));

        newUtility = await MarketConfig.new();
        existingMarkets = await pl.getOpenMarkets();
        let actionHash = encode("upgradeContractImplementation(address,address)", marketConfig.address, newUtility.address);
        await gvProposal(6, actionHash, await MemberRoles.at(await nxms.getLatestAddress(toHex("MR"))), governance, 2, 0);
        await increaseTime(604800);
        marketConfig = await MarketConfig.at(marketConfig.address);
        let date = await latestTime();
        await increaseTime(3610);
        date = Math.round(date);
        // await marketConfig.setInitialCummulativePrice();
		allMarkets = await AllMarkets.at(await nxms.getLatestAddress(toHex("AM")));
		marketIncentives = await MarketCreationRewards.at(await nxms.getLatestAddress(toHex("MC")));
        await marketConfig.setAuthorizedAddress(allMarkets.address);
        await assertRevert(marketConfig.setAuthorizedAddress(allMarkets.address, {from: user11}));
        await assertRevert(marketIncentives.setMasterAddress());
        await assertRevert(marketIncentives.initialise(marketConfig.address, mockchainLinkInstance.address));
        let utility = await MarketConfig.at("0xCBc7df3b8C870C5CDE675AaF5Fd823E4209546D2");
        await utility.setAuthorizedAddress(allMarkets.address);
        // await mockUniswapV2Pair.sync();
        let mockChainLinkGasPriceAgg = await MockChainLinkGasPriceAgg.new();
        await increaseTime(5 * 3600);
        await plotusToken.transfer(marketIncentives.address,toWei(100000));
        await plotusToken.transfer(user11,toWei(100000));
        await plotusToken.transfer(user12,toWei(100000));
        await plotusToken.approve(tokenController.address,toWei(200000),{from:user11});
        await tokenController.lock(toHex("SM"),toWei(100000),30*3600*24,{from:user11});

        pc = await nxms.getLatestAddress(toHex("PC"));
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
	      await governance.setAllMarketsAddress();
        await assertRevert(governance.setAllMarketsAddress());
	      //proposal to edit category
	      actionHash = encode1(
	        ["uint256", "string", "uint256", "uint256", "uint256", "uint256[]", "uint256", "string", "address", "bytes2", "uint256[]", "string"],
	        [
	          16,
	          "addMarketCurrency",
	          2,
	          50,
	          50,
	          [2],
	          86400,
	          "QmZQhJunZesYuCJkdGwejSATTR8eynUgV8372cHvnAPMaM",
	          nullAddress,
	          toHex("AM"),
	          [0, 0],
	          "addMarketCurrency(bytes32,address,uint8,uint8,uint32)",
	        ]
	      );
	      let p1 = await governance.getProposalLength();
	      await governance.createProposalwithSolution("Add new member", "Add new member", "Addnewmember", 4, "Add new member", actionHash);
	      await governance.submitVote(p1.toNumber(), 1);
	      await governance.closeProposal(p1.toNumber());
	      await increaseTime(604800);

	      actionHash = encode1(
	        ["string", "uint256", "uint256", "uint256", "uint256[]", "uint256", "string", "address", "bytes2", "uint256[]", "string"],
	        [
	          "toggleMarketCreation",
	          2,
	          50,
	          50,
	          [2],
	          86400,
	          "QmZQhJunZesYuCJkdGwejSATTR8eynUgV8372cHvnAPMaM",
	          nullAddress,
	          toHex("AM"),
	          [0, 0],
	          "toggleMarketCreationType(uint64,bool)",
	        ]
	      );
	      p1 = await governance.getProposalLength();
	      await governance.createProposalwithSolution("Add new member", "Add new member", "Addnewmember", 3, "Add new member", actionHash);
	      await governance.submitVote(p1.toNumber(), 1);
	      await governance.closeProposal(p1.toNumber());
	      await increaseTime(604800);

	      //proposal to edit category
	      actionHash = encode1(
	        ["uint256", "string", "uint256", "uint256", "uint256", "uint256[]", "uint256", "string", "address", "bytes2", "uint256[]", "string"],
	        [
	          19,
	          "transferAssets",
	          2,
	          50,
	          50,
	          [2],
	          86400,
	          "QmZQhJunZesYuCJkdGwejSATTR8eynUgV8372cHvnAPMaM",
	          nullAddress,
	          toHex("AM"),
	          [0, 0],
	          "transferAssets(address,address,uint256)",
	        ]
	      );
	      p1 = await governance.getProposalLength();
	      await governance.createProposalwithSolution("transferAssets", "transferAssets", "transferAssets", 4, "Add new member", actionHash);
	      await governance.submitVote(p1.toNumber(), 1);
	      await governance.closeProposal(p1.toNumber());
	      await increaseTime(604800);

	      //proposal to edit category
	      actionHash = encode1(
	        ["uint256", "string", "uint256", "uint256", "uint256", "uint256[]", "uint256", "string", "address", "bytes2", "uint256[]", "string"],
	        [
	          15,
	          "addMarketType",
	          2,
	          50,
	          50,
	          [2],
	          86400,
	          "QmZQhJunZesYuCJkdGwejSATTR8eynUgV8372cHvnAPMaM",
	          nullAddress,
	          toHex("AM"),
	          [0, 0],
	          "addMarketType(uint32,uint32,uint32)",
	        ]
	      );
	      p1 = await governance.getProposalLength();
	      await governance.createProposalwithSolution("Add new member", "Add new member", "Addnewmember", 4, "Add new member", actionHash);
	      await governance.submitVote(p1.toNumber(), 1);
	      await governance.closeProposal(p1.toNumber());
	      await increaseTime(604800);

	      //proposal to edit category
	      actionHash = encode1(
	        ["uint256", "string", "uint256", "uint256", "uint256", "uint256[]", "uint256", "string", "address", "bytes2", "uint256[]", "string"],
	        [
	          17,
	          "pauseMarketCreation",
	          2,
	          50,
	          50,
	          [2],
	          86400,
	          "QmZQhJunZesYuCJkdGwejSATTR8eynUgV8372cHvnAPMaM",
	          nullAddress,
	          toHex("AM"),
	          [0, 0],
	          "pauseMarketCreation()",
	        ]
	      );
	      p1 = await governance.getProposalLength();
	      await governance.createProposalwithSolution("Add new member", "Add new member", "Addnewmember", 4, "Add new member", actionHash);
	      await governance.submitVote(p1.toNumber(), 1);
	      await governance.closeProposal(p1.toNumber());
	      await increaseTime(604800);

	      //proposal to edit category
	      actionHash = encode1(
	        ["uint256", "string", "uint256", "uint256", "uint256", "uint256[]", "uint256", "string", "address", "bytes2", "uint256[]", "string"],
	        [
	          18,
	          "resumeMarketCreation",
	          2,
	          50,
	          50,
	          [2],
	          86400,
	          "QmZQhJunZesYuCJkdGwejSATTR8eynUgV8372cHvnAPMaM",
	          nullAddress,
	          toHex("AM"),
	          [0, 0],
	          "resumeMarketCreation()",
	        ]
	      );
	      p1 = await governance.getProposalLength();
	      await governance.createProposalwithSolution("Add new member", "Add new member", "Addnewmember", 4, "Add new member", actionHash);
	      await governance.submitVote(p1.toNumber(), 1);
	      await governance.closeProposal(p1.toNumber());
	      await increaseTime(604800);


		await assertRevert(pl.callMarketResultEvent([1, 2], 1, 1,1));
		await assertRevert(pl.addInitialMarketTypesAndStart(Math.round(Date.now() / 1000), mem1, plotusToken.address, {from:mem2}));
		await assertRevert(pl.addInitialMarketTypesAndStart(Math.round(Date.now() / 1000), mem1, plotusToken.address));
		await assertRevert(pl.initiate(mem1, mem1, mem1, [mem1, mem1, mem1, mem1]));
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
		await gv.categorizeProposal(pId, 23, 0);
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

	it("Should not add new market curreny if already exists", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 16, 0);
		let startTime = (await latestTime()) / 1 + 2 * 604800;
		let market= await Market.new();
		let actionHash = encode("addMarketCurrency(bytes32,address,uint8,uint8,uint32)", toHex("ETH/USD"), mockchainLinkInstance.address, 8, 1, startTime);
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
		await increaseTime(604850);
		await gv.triggerAction(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
	});

	it("Should not add new market curreny if null address is passed as feed", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 16, 0);
		let startTime = (await latestTime()) / 1 + 2 * 604800;
		let market= await Market.new();
		let actionHash = encode("addMarketCurrency(bytes32,address,uint8,uint8,uint32)", toHex("ETH/PLOT"), nullAddress, 8, 1, startTime);
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
		await increaseTime(604850);
		await gv.triggerAction(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
	});

	it("Should not add new market curreny if decimals passed is zero", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 16, 0);
		let startTime = (await latestTime()) / 1 + 2 * 604800;
		let market= await Market.new();
		let actionHash = encode("addMarketCurrency(bytes32,address,uint8,uint8,uint32)", toHex("ETH/PLOT"), mockchainLinkInstance.address, 0, 1, startTime);
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
		await increaseTime(604850);
		await gv.triggerAction(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
	});

	it("Should not add new market curreny if round off argument passed is zero", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 16, 0);
		let startTime = (await latestTime()) / 1 + 2 * 604800;
		let market= await Market.new();
		let actionHash = encode("addMarketCurrency(bytes32,address,uint8,uint8,uint32)", toHex("ETH/PLOT"), mockchainLinkInstance.address, 8, 0, startTime);
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
		await increaseTime(604850);
		await gv.triggerAction(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
	});

	it("Should create a proposal to add new market curreny", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 16, 0);
		let startTime = (await latestTime()) / 1 + 2 * 604800;
		let market= await Market.new();
		let actionHash = encode("addMarketCurrency(bytes32,address,uint8,uint8,uint32)", toHex("ETH/PLOT"), mockchainLinkInstance.address, 8, 1, startTime);
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
		await increaseTime(604850);
		await gv.triggerAction(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 3);
		await allMarkets.createMarket(2,0);
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
		await assertRevert(allMarkets.sponsorIncentives(7, plotusToken.address, "1000000000000000000", {from:mem1}));
		await assertRevert(allMarkets.sponsorIncentives(7, nullAddress, "1000000000000000000", {from:mem1}));
		await allMarkets.sponsorIncentives(7, plotusToken.address, "1000000000000000000");
		await assertRevert(allMarkets.sponsorIncentives(7, plotusToken.address, "1000000000000000000"));
    	await allMarkets.depositAndPlacePrediction("1000000000000000000000", 7, plotusToken.address, 1000*1e8, 1);
		// await allMarkets.placePrediction(plotusToken.address, "1000000000000000000000", 1, 1);
		let totalStaked = await allMarkets.getUserFlags(7, ab1);
		assert.equal(totalStaked[0], false);
    	await allMarkets.depositAndPlacePrediction("8000000000000000000000", 7, plotusToken.address, 8000*1e8, 2);
    	await allMarkets.depositAndPlacePrediction("8000000000000000000000", 7, plotusToken.address, 8000*1e8, 3);
		// await assertRevert(marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "10000000000000000000", 1, 1, { value: 1000 }));
		// await assertRevert(allMarkets.settleMarket(7));
		await assertRevert(allMarkets.withdrawSponsoredIncentives(7));
		await assertRevert(allMarkets.postResultMock(0,7));
		await increaseTime(604810);
		await assertRevert(allMarkets.claimIncentives(ab1, [7], plotusToken.address));
		// await allMarkets.withdrawMax(100);
		// await marketInstance.claimReturn(ab1);
		await allMarkets.postResultMock(1, 7);
		await assertRevert(allMarkets.sponsorIncentives(7, plotusToken.address, "1000000000000000000"));
		// await assertRevert(marketInstance.placePrediction(plotusToken.address, "10000000000000000000", 1, 1));
		await increaseTime(604800);
		await assertRevert(allMarkets.withdrawSponsoredIncentives(7));
		await assertRevert(allMarkets.claimIncentives(mem1, [7], plotusToken.address));
		await allMarkets.claimIncentives(ab1, [7], plotusToken.address);
		await allMarkets.withdrawMax(100);
		// await marketInstance.claimReturn(ab1);
		await increaseTime(604800);
	});

	it("Should not add new market type if prediction type already exists", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 15, 0);
		let startTime = Math.round(Date.now());
		startTime = (await latestTime()) / 1 + 3 * 604800;
		let actionHash = encode("addMarketType(uint32,uint32,uint32)", 24 * 60 * 60, 50, startTime);
		await gv.submitProposalWithSolution(pId, "update max followers limit", actionHash);
		await gv.submitVote(pId, 1, { from: ab1 });
		await gv.submitVote(pId, 1, { from: mem1 });
		await gv.submitVote(pId, 1, { from: mem2 });
		await gv.submitVote(pId, 1, { from: mem3 });
		await gv.submitVote(pId, 1, { from: mem4 });
		await gv.submitVote(pId, 1, { from: mem5 });
		await increaseTime(604810);
		await gv.closeProposal(pId);
		let openMarketsBefore = await pl.getOpenMarkets();
		await increaseTime(604810);
		await gv.triggerAction(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
	});

	it("Should not add new market type if prediction is zero", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 15, 0);
		let startTime = Math.round(Date.now());
		startTime = (await latestTime()) / 1 + 3 * 604800;
		let actionHash = encode("addMarketType(uint32,uint32,uint32)", 0, 50, startTime);
		await gv.submitProposalWithSolution(pId, "update max followers limit", actionHash);
		await gv.submitVote(pId, 1, { from: ab1 });
		await gv.submitVote(pId, 1, { from: mem1 });
		await gv.submitVote(pId, 1, { from: mem2 });
		await gv.submitVote(pId, 1, { from: mem3 });
		await gv.submitVote(pId, 1, { from: mem4 });
		await gv.submitVote(pId, 1, { from: mem5 });
		await increaseTime(604810);
		await gv.closeProposal(pId);
		let openMarketsBefore = await pl.getOpenMarkets();
		await increaseTime(604810);
		await gv.triggerAction(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
	});

	it("Should not add new market type if option range percent is zero", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 15, 0);
		let startTime = Math.round(Date.now());
		startTime = (await latestTime()) / 1 + 3 * 604800;
		let actionHash = encode("addMarketType(uint32,uint32,uint32)", 6 * 60 * 60, 0, startTime);
		await gv.submitProposalWithSolution(pId, "update max followers limit", actionHash);
		await gv.submitVote(pId, 1, { from: ab1 });
		await gv.submitVote(pId, 1, { from: mem1 });
		await gv.submitVote(pId, 1, { from: mem2 });
		await gv.submitVote(pId, 1, { from: mem3 });
		await gv.submitVote(pId, 1, { from: mem4 });
		await gv.submitVote(pId, 1, { from: mem5 });
		await increaseTime(604810);
		await gv.closeProposal(pId);
		let openMarketsBefore = await pl.getOpenMarkets();
		await increaseTime(604810);
		await gv.triggerAction(pId);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
	});

	it("Should create a proposal to add new market type", async function() {
		await increaseTime(604810);
		pId = (await gv.getProposalLength()).toNumber();
		await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
		await gv.categorizeProposal(pId, 15, 0);
		let startTime = Math.round(Date.now());
		startTime = (await latestTime()) / 1 + 3 * 604800;
		// startTime = Math.round((Date.now())/1000) + 2*604800;
		let actionHash = encode("addMarketType(uint32,uint32,uint32)", 60 * 60, 50, startTime);
		await gv.submitProposalWithSolution(pId, "update max followers limit", actionHash);

		actionHash = encode("addMarketType(uint32,uint32,uint32)", 60 * 60 * 2, 1, 10);
		await assertRevert(gv.submitProposalWithSolution(pId, "update max followers limit", actionHash)); //should revert as start time is not enough
		actionHash = encode("addMarketType(uint32,uint32,uint32)", 60 * 60 * 2, await latestTime(),10);
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
		await allMarkets.createMarket(0,3);

		// let openMarkets = await pl.getOpenMarkets();
		// assert.isAbove(openMarkets[1].length, openMarketsBefore[1].length, "Currency not added");
	});

	it("Predict on newly created market", async function() {
		await marketConfig.setNextOptionPrice(18);
		await increaseTime(604810);
		await assertRevert(pl.createMarket(0,3)); //should revert as market is live

		// set price
		// user 1
		// set price lot
		await marketConfig.setPrice("1000000000000000");
		await plotusToken.approve(allMarkets.address, "100000000000000000000");
    	await allMarkets.depositAndPlacePrediction("10000000000000000000", 8, plotusToken.address, 10*1e8, 1);
		let reward = await allMarkets.getReturn(ab1, 8);
		assert.equal(reward[0][0], 0);
		await increaseTime(3650);
		await allMarkets.createMarket(0, 3);
		await allMarkets.sponsorIncentives(9, plotusToken.address, "1000000000000000000");
		await increaseTime(604810);
		await allMarkets.settleMarket(8);
		await allMarkets.settleMarket(9);
		await allMarkets.createMarket(0, 3);
		await increaseTime(604800);
		await allMarkets.withdrawSponsoredIncentives(9);
		await allMarkets.createMarket(0, 3);
		// await pl.exchangeCommission(marketInstance.address);
		await allMarkets.getMarketData(8);
	});

	it("Pause market creation ", async function() {
		await allMarkets.createMarket(0, 1);
		await assertRevert(allMarkets.createMarket(0, 1));
		pId = (await gv.getProposalLength()).toNumber();
		await gvProposal(17, "0x", await MemberRoles.at(await nxms.getLatestAddress(toHex("MR"))), gv, 2, 0);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 3);
		await increaseTime(604800);
		await assertRevert(allMarkets.createMarket(0, 1));
		await assertRevert(allMarkets.withdrawReward(100));
	});

	it("Cannot Pause market creation if already paused", async function() {
		await assertRevert(allMarkets.createMarket(0, 1));
		pId = (await gv.getProposalLength()).toNumber();
		await gvProposal(17, "0x", await MemberRoles.at(await nxms.getLatestAddress(toHex("MR"))), gv, 2, 0);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
		await increaseTime(604800);
	});

	it("Resume market creation ", async function() {
		await assertRevert(allMarkets.createMarket(0, 1));
		pId = (await gv.getProposalLength()).toNumber();
		await gvProposal(18, "0x", await MemberRoles.at(await nxms.getLatestAddress(toHex("MR"))), gv, 2, 0);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 3);
		await increaseTime(604800);
		await allMarkets.createMarket(0, 1);
		await allMarkets.withdrawReward(100);
		await allMarkets.withdrawReward(100);
	});

	it("Cannot Resume market creation if already live ", async function() {
		await increaseTime(86401);
		await allMarkets.createMarket(0, 1);
		pId = (await gv.getProposalLength()).toNumber();
		await gvProposal(18, "0x", await MemberRoles.at(await nxms.getLatestAddress(toHex("MR"))), gv, 2, 0);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 1);
	});

	it("Pause market creation of 4-hourly markets", async function() {
		await allMarkets.createMarket(0, 0);
		pId = (await gv.getProposalLength()).toNumber();
		let categoryId = await pc.totalCategories();
		categoryId = categoryId*1 - 1;
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
		categoryId = categoryId*1 - 1;
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
		categoryId = categoryId*1 - 1;
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
		let categoryId = 19;
		await plotusToken.transfer(allMarkets.address, toWei(100));
		let daoPLOTbalanceBefore = await plotusToken.balanceOf(allMarkets.address);
		let userPLOTbalanceBefore = await plotusToken.balanceOf(user11);
		let actionHash = encode1(["address","address","uint256"],[plotusToken.address, user11, toWei(100)])
		await gvProposal(categoryId, actionHash, await MemberRoles.at(await nxms.getLatestAddress(toHex("MR"))), gv, 2, 0);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 3);
		let daoPLOTbalanceAfter = await plotusToken.balanceOf(allMarkets.address);
		let userPLOTbalanceAfter = await plotusToken.balanceOf(user11);
		assert.equal(daoPLOTbalanceBefore*1 - 100*1e18, daoPLOTbalanceAfter*1);
		assert.equal(userPLOTbalanceBefore*1 + 100*1e18, userPLOTbalanceAfter*1);
		await increaseTime(604800);
	});

	it("Transfer DAO eth through proposal", async function() {
		await increaseTime(604800);
		pId = (await gv.getProposalLength()).toNumber();
		let categoryId = 19;
		await allMarkets.sendTransaction({from: user13, value:1e18});
		let daoEthbalanceBefore = await web3.eth.getBalance(allMarkets.address);
		let userEthbalanceBefore = await web3.eth.getBalance(user11);
		let actionHash = encode1(["address","address","uint256"],["0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", user11, toWei(1)])
		await gvProposal(categoryId, actionHash, await MemberRoles.at(await nxms.getLatestAddress(toHex("MR"))), gv, 2, 0);
		let actionStatus = await gv.proposalActionStatus(pId);
		assert.equal(actionStatus / 1, 3);
		let daoEthbalanceAfter = await web3.eth.getBalance(allMarkets.address);
		let userEthbalanceAfter = await web3.eth.getBalance(user11);
		assert.equal(daoEthbalanceBefore*1 - 1*1e18, daoEthbalanceAfter*1);
		assert.equal(userEthbalanceBefore*1 + 1*1e18, userEthbalanceAfter*1);
		await increaseTime(604800);
	});

	it("Add category to update uint paramters of allMarkets", async function() {
		let actionHash = encode1(
	      ["string", "uint256", "uint256", "uint256", "uint256[]", "uint256", "string", "address", "bytes2", "uint256[]", "string"],
	      [
	        "updateUintParameters",
	        2,
	        50,
	        50,
	        [2],
	        86400,
	        "QmZQhJunZesYuCJkdGwejSATTR8eynUgV8372cHvnAPMaM",
	        nullAddress,
	        toHex("MC"),
	        [0, 0],
	        "updateUintParameters(bytes8,uint256)",
	      ]
	    );
	    let p1 = await governance.getProposalLength();
	    await governance.createProposalwithSolution("Add new member", "Add new member", "Addnewmember", 3, "Add new member", actionHash);
	    await governance.submitVote(p1.toNumber(), 1);
	    await governance.closeProposal(p1.toNumber());
	    await increaseTime(604800);
	});

	it("Should update uint paramters", async function() {
		let categoryId = await pc.totalCategories();
		categoryId = categoryId*1 - 1;
		await updateParameter(categoryId, 2, "MAXGAS", marketIncentives, "uint", 5000);
		await updateParameter(categoryId, 2, "MAXRPSP", marketIncentives, "uint", 6000);
		await updateParameter(categoryId, 2, "MINRPSP", marketIncentives, "uint", 7000);
		await updateParameter(categoryId, 2, "PSFRPS", marketIncentives, "uint", 8000);
		await updateParameter(categoryId, 2, "RPSTH", marketIncentives, "uint", 9000);
		await updateInvalidParameter(categoryId, 2, "ABCD", marketIncentives, "uint", 10000);
	})

	it("Add category to update address paramters of allMarkets", async function() {
		let actionHash = encode1(
	      ["string", "uint256", "uint256", "uint256", "uint256[]", "uint256", "string", "address", "bytes2", "uint256[]", "string"],
	      [
	        "updateAddressParameters",
	        2,
	        50,
	        50,
	        [2],
	        86400,
	        "QmZQhJunZesYuCJkdGwejSATTR8eynUgV8372cHvnAPMaM",
	        nullAddress,
	        toHex("MC"),
	        [0, 0],
	        "updateAddressParameters(bytes8,address)",
	      ]
	    );
	    let p1 = await governance.getProposalLength();
	    await governance.createProposalwithSolution("Add new member", "Add new member", "Addnewmember", 3, "Add new member", actionHash);
	    await governance.submitVote(p1.toNumber(), 1);
	    await governance.closeProposal(p1.toNumber());
	    await increaseTime(604800);
	});

	it("Should update address paramters", async function() {
		let categoryId = await pc.totalCategories();
		categoryId = categoryId*1 - 1;
		await updateParameter(categoryId, 2, "GASAGG", marketIncentives, "address", allMarkets.address);
		await updateInvalidParameter(categoryId, 2, "ABCD", marketIncentives, "address", allMarkets.address);
	})
	async function updateParameter(cId, mrSequence, code, contractInst, type, proposedValue) {
        code = toHex(code);
        let getterFunction;
        if (type == "uint") {
            action = "updateUintParameters(bytes8,uint256)";
            getterFunction = "getUintParameters";
        } else if (type == "address") {
            action = "updateAddressParameters(bytes8,address)";
            getterFunction = "getAddressParameters";
        }

        let actionHash = encode(action, code, proposedValue);
        await gvProposal(cId, actionHash, mr, governance, mrSequence, 0);
        if (code == toHex("MASTADD")) {
            let newMaster = await NXMaster.at(proposedValue);
            contractInst = newMaster;
        }
        let parameter;
        // if (type == "uint") {
            parameter = await contractInst[getterFunction](code);
        // }
        try {
            parameter[1] = parameter[1].toNumber();
        } catch (err) {}
        // if (type == "uint") {
            assert.equal(parameter[1], proposedValue, "Not updated");
        // }
    }

    async function updateInvalidParameter(
      cId,
      mrSequence,
      code,
      contractInst,
      type,
      proposedValue
    ) {
      code = toHex(code);
      let getterFunction;
      if (type == 'uint') {
        action = 'updateUintParameters(bytes8,uint)';
        getterFunction = 'getUintParameters';
      } else {
            action = "updateAddressParameters(bytes8,address)";
            getterFunction = "getAddressParameters";
      }
      let actionHash = encode(action, code, proposedValue);
      await gvProposal(cId, actionHash, mr, governance, mrSequence, 0);
      if (code == toHex('MASTADD') && proposedValue != ZERO_ADDRESS) {
        let newMaster = await NXMaster.at(proposedValue);
        contractInst = newMaster;
      }
      let parameter = await contractInst[getterFunction](code);
      try {
        parameter[1] = parameter[1].toNumber();
      } catch (err) {}
      assert.notEqual(parameter[1], proposedValue);
    }
});
