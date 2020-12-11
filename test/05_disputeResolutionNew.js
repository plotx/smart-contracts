const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("MarketRegistry");
const Master = artifacts.require("Master");
const PlotusToken = artifacts.require("MockPLOT");
const TokenController = artifacts.require("MockTokenController");
const MockchainLinkBTC = artifacts.require("MockChainLinkAggregator");
const Governance = artifacts.require("GovernanceV2");
const AllMarkets = artifacts.require("MockAllMarkets");
const MarketConfig = artifacts.require("MockConfig");
const MockUniswapRouter = artifacts.require("MockUniswapRouter");
const ProposalCategory = artifacts.require('ProposalCategory');
const MemberRoles = artifacts.require('MockMemberRoles');
const BLOT = artifacts.require("BLOT");
const MarketCreationRewards = artifacts.require("MarketCreationRewards");
const MockChainLinkGasPriceAgg = artifacts.require("MockChainLinkGasPriceAgg");
const web3 = Market.web3;
const gvProposal = require("./utils/gvProposal.js").gvProposalWithIncentiveViaTokenHolder;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const latestTime = require("./utils/latestTime.js").latestTime;
const encode = require("./utils/encoder.js").encode;
const encode1 = require("./utils/encoder.js").encode1;
const {toHex, toWei, toChecksumAddress} = require('./utils/ethTools');
const { assertRevert } = require('./utils/assertRevert');
let gv,masterInstance, tokenController, mr;
contract("Market", ([ab1, ab2, ab3, ab4, dr1, dr2, dr3, notMember]) => {
  it("1.if DR panel accepts", async () => {
    masterInstance = await OwnedUpgradeabilityProxy.deployed();
    masterInstance = await Master.at(masterInstance.address);
    let tokenControllerAdd  = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
    tokenController = await TokenController.at(tokenControllerAdd);
    let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
    let plotusNewInstance = await Plotus.at(plotusNewAddress);
    MockUniswapRouterInstance = await MockUniswapRouter.deployed();
    marketConfig = await plotusNewInstance.marketUtility();
    marketConfig = await MarketConfig.at(marketConfig);
    governance = await masterInstance.getLatestAddress(web3.utils.toHex("GV"));
    governance = await Governance.at(governance);
      
    let allMarkets = await masterInstance.getLatestAddress(web3.utils.toHex("AM"));
    allMarkets = await AllMarkets.at(allMarkets);

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
    await governance.setAllMarketsAddress();


    await increaseTime(10001);
    await allMarkets.createMarket(0,0);
    let nxmToken = await PlotusToken.deployed();
    let address = await masterInstance.getLatestAddress(web3.utils.toHex("GV"));
    let plotusToken = await PlotusToken.deployed();
    gv = await Governance.at(address);
    address = await masterInstance.getLatestAddress(web3.utils.toHex("PC"));
    pc = await ProposalCategory.at(address);
    address = await masterInstance.getLatestAddress(web3.utils.toHex("MR"));
    mr = await MemberRoles.at(address);
    let tc = await TokenController.at(await masterInstance.getLatestAddress(web3.utils.toHex("MR")));
    marketIncentives = await MarketCreationRewards.at(await masterInstance.getLatestAddress(web3.utils.toHex("MC")));
    await plotusToken.approve(mr.address, "10000000000000000000000");
   
    await plotusToken.transfer(ab2, "50000000000000000000000");
    await plotusToken.transfer(ab3, "50000000000000000000000");
    await plotusToken.transfer(ab4, "50000000000000000000000");
    await plotusToken.transfer(dr1, "50000000000000000000000");
    await plotusToken.transfer(dr2, "50000000000000000000000");
    await plotusToken.transfer(dr3, "50000000000000000000000");
    await MockUniswapRouterInstance.setPrice("1000000000000000");
    await marketConfig.setPrice("1000000000000000");
    await plotusToken.approve(tokenController.address, "100000000000000000000");
    await plotusToken.approve(allMarkets.address, "10000000000000000000000");
    // Cannot raise dispute if there is no participation
    await assertRevert(allMarkets.raiseDispute(7, 1400000000000,"raise dispute","this is description","this is solution hash"));
    await marketConfig.setNextOptionPrice(9);
    await marketConfig.setPrice(toWei(0.01));
    await allMarkets.depositAndPlacePrediction("10000000000000000000000", 7, plotusToken.address, 100*1e8, 1);
    // cannot raise dispute if market is open
    await plotusToken.approve(allMarkets.address, "10000000000000000000000");
    await assertRevert(allMarkets.raiseDispute(7, 1400000000000,"raise dispute","this is description","this is solution hash"));
    
    await increaseTime(3601);
    // cannot raise dispute if market is closed but result is not out
    await plotusToken.approve(allMarkets.address, "10000000000000000000000");
    await assertRevert(allMarkets.raiseDispute(7, 1400000000000,"raise dispute","this is description","this is solution hash"));
   
    await increaseTime(8*3600);
    let marketIncentivesBalanceBefore = await plotusToken.balanceOf(marketIncentives.address);
    await allMarkets.postResultMock("10000000000000000000", 7);
    let allMarketsBalanceBefore = await plotusToken.balanceOf(allMarkets.address);
    let marketIncentivesBalance = await plotusToken.balanceOf(marketIncentives.address);
    assert.equal(marketIncentivesBalance*1, 100*1e18);
     // cannot raise dispute with less than minimum stake
    await plotusToken.approve(allMarkets.address, "10000000000000000000000");
    await assertRevert(allMarkets.raiseDispute(7, 1400000000000,"raise dispute","this is description","this is solution hash",{from : notMember}));
    //can raise dispute in cooling period and stake
    await plotusToken.approve(allMarkets.address, "10000000000000000000000");
    await allMarkets.raiseDispute(7,1,"raise dispute","this is description","this is solution hash");
    // cannot raise dispute multiple times
    await assertRevert(allMarkets.raiseDispute(7, 1400000000000,"raise dispute","this is description","this is solution hash"));
    await assertRevert(allMarkets.resolveDispute(7, 100));
    let winningOption_af = await allMarkets.getMarketResults(7)
    let proposalId = await gv.getProposalLength()-1;
    let userBalBefore = await plotusToken.balanceOf(ab1);
    
    await plotusToken.approve(tokenController.address, "100000000000000000000000",{from : dr1});
    await tokenController.lock("0x4452","30000000000000000000000",(86400*20),{from : dr1});
    
    await plotusToken.approve(tokenController.address, "100000000000000000000000",{from : dr2});
    await tokenController.lock("0x4452","30000000000000000000000",(86400*20),{from : dr2});

    await assertRevert(gv.submitVote(proposalId, 1, {from:dr3})) //reverts as tokens not locked
  
    await plotusToken.approve(tokenController.address, "100000000000000000000000",{from : dr3});
    await tokenController.lock("0x4452","30000000000000000000000",(86400*20),{from : dr3});
    let roles = await mr.roles(dr3);
    assert.equal(roles[0]/1, 2, "Not added to Token holder");
    assert.equal(roles[1]/1, 3, "Not added to DR");
    await gv.submitVote(proposalId, 1, {from:dr1});
    await gv.submitVote(proposalId, 1, {from:dr2});
    await gv.submitVote(proposalId, 1, {from:dr3});
    await increaseTime(604800);
    await gv.closeProposal(proposalId);

    let winningOption_afterVote = await allMarkets.getMarketResults(7);
    assert.notEqual(winningOption_af[0]/1, winningOption_afterVote[0]/1);
    assert.equal(winningOption_afterVote[0]/1, 1);

    let allMarketsBalanceAfter = await plotusToken.balanceOf(allMarkets.address);
    let commission = 100*((0.05)/100) * 1e18;
    // let marketCreatorIncentives = 99.95*((0.05)/100) * 1e18;
    let marketIncentivesBalanceAfter = await plotusToken.balanceOf(marketIncentives.address);
    assert.equal(marketIncentivesBalanceBefore*1  + commission*1, marketIncentivesBalanceAfter*1);

    assert.equal((allMarketsBalanceAfter/1), allMarketsBalanceBefore/1 + 99.95*1e18, "Tokens staked for dispute not burned");
    // let data = await plotusNewInstance.marketDisputeData(marketInstance.address)
    // assert.equal(data[0], proposalId,"dispute proposal mismatch");
    // let marketDetails = await plotusNewInstance.getMarketDetails(marketInstance.address);
    // assert.equal(marketDetails[7]/1, 3, "status not updated");
    let proposalActionStatus = await gv.proposalActionStatus(proposalId);
    assert.equal(proposalActionStatus/1, 3);
    let userBalAfter = await plotusToken.balanceOf(ab1);
    assert.equal(userBalAfter/1e18, userBalBefore/1e18+500);
  });
});

contract("Market", ([ab1, ab2, ab3, ab4, dr1, dr2, dr3, notMember]) => {
  it("1.DR panel accepts and proper transfer of assets between AllMarkets and MarketCreationRewards", async () => {
    masterInstance = await OwnedUpgradeabilityProxy.deployed();
    masterInstance = await Master.at(masterInstance.address);
    let tokenControllerAdd  = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
    tokenController = await TokenController.at(tokenControllerAdd);
    let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
    let plotusNewInstance = await Plotus.at(plotusNewAddress);
    MockUniswapRouterInstance = await MockUniswapRouter.deployed();
    marketConfig = await plotusNewInstance.marketUtility();
    marketConfig = await MarketConfig.at(marketConfig);
    governance = await masterInstance.getLatestAddress(web3.utils.toHex("GV"));
    governance = await Governance.at(governance);
      
    let allMarkets = await masterInstance.getLatestAddress(web3.utils.toHex("AM"));
    allMarkets = await AllMarkets.at(allMarkets);

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
    await governance.setAllMarketsAddress();


    await increaseTime(10001);
    await allMarkets.createMarket(0,0,{from:dr1});
    let nxmToken = await PlotusToken.deployed();
    let address = await masterInstance.getLatestAddress(web3.utils.toHex("GV"));
    let plotusToken = await PlotusToken.deployed();
    gv = await Governance.at(address);
    address = await masterInstance.getLatestAddress(web3.utils.toHex("PC"));
    pc = await ProposalCategory.at(address);
    address = await masterInstance.getLatestAddress(web3.utils.toHex("MR"));
    mr = await MemberRoles.at(address);
    let tc = await TokenController.at(await masterInstance.getLatestAddress(web3.utils.toHex("MR")));
    marketIncentives = await MarketCreationRewards.at(await masterInstance.getLatestAddress(web3.utils.toHex("MC")));
    await plotusToken.approve(mr.address, "10000000000000000000000");
   
    await plotusToken.transfer(ab2, "50000000000000000000000");
    await plotusToken.transfer(ab3, "50000000000000000000000");
    await plotusToken.transfer(ab4, "50000000000000000000000");
    await plotusToken.transfer(dr1, "50000000000000000000000");
    await plotusToken.transfer(dr2, "50000000000000000000000");
    await plotusToken.transfer(dr3, "50000000000000000000000");
    await MockUniswapRouterInstance.setPrice("1000000000000000");
    await marketConfig.setPrice("1000000000000000");
    await plotusToken.approve(tokenController.address, "100000000000000000000");
    await plotusToken.approve(allMarkets.address, "30000000000000000000000");
    // Cannot raise dispute if there is no participation
    await assertRevert(allMarkets.raiseDispute(7, 1400000000000,"raise dispute","this is description","this is solution hash"));
    await marketConfig.setNextOptionPrice(9);
    await marketConfig.setPrice(toWei(0.01));
    await allMarkets.depositAndPlacePrediction("10000000000000000000000", 7, plotusToken.address, 100*1e8, 1);
    await allMarkets.depositAndPlacePrediction("20000000000000000000000", 7, plotusToken.address, 200*1e8, 3);
    // cannot raise dispute if market is open
    await plotusToken.approve(allMarkets.address, "10000000000000000000000");
    await assertRevert(allMarkets.raiseDispute(7, 1400000000000,"raise dispute","this is description","this is solution hash"));
    
    await increaseTime(3601);
    // cannot raise dispute if market is closed but result is not out
    await plotusToken.approve(allMarkets.address, "10000000000000000000000");
    await assertRevert(allMarkets.raiseDispute(7, 1400000000000,"raise dispute","this is description","this is solution hash"));
   
    await increaseTime(8*3600);
    let marketIncentivesBalanceBefore = await plotusToken.balanceOf(marketIncentives.address);
    let allMarketsBalanceBefore = await plotusToken.balanceOf(allMarkets.address);
    await allMarkets.postResultMock("10000000000000000000", 7);
    let marketIncentivesBalance = await plotusToken.balanceOf(marketIncentives.address);
    let commission = 300*((0.05)/100) * 1e18;
    let rewardPool = 99.95*1e18;
    let marketCreatorIncentive = rewardPool * 0.5/100;
    assert.equal(marketIncentivesBalance*1, marketCreatorIncentive*1 + commission*1);
     // cannot raise dispute with less than minimum stake
    await plotusToken.approve(allMarkets.address, "10000000000000000000000");
    await assertRevert(allMarkets.raiseDispute(7, 1400000000000,"raise dispute","this is description","this is solution hash",{from : notMember}));
    //can raise dispute in cooling period and stake
    await plotusToken.approve(allMarkets.address, "10000000000000000000000");
    await allMarkets.raiseDispute(7,1,"raise dispute","this is description","this is solution hash");
    // cannot raise dispute multiple times
    await assertRevert(allMarkets.raiseDispute(7, 1400000000000,"raise dispute","this is description","this is solution hash"));
    await assertRevert(allMarkets.resolveDispute(7, 100));
    let winningOption_af = await allMarkets.getMarketResults(7)
    let proposalId = await gv.getProposalLength()-1;
    let userBalBefore = await plotusToken.balanceOf(ab1);
    
    await plotusToken.approve(tokenController.address, "100000000000000000000000",{from : dr1});
    await tokenController.lock("0x4452","30000000000000000000000",(86400*20),{from : dr1});
    
    await plotusToken.approve(tokenController.address, "100000000000000000000000",{from : dr2});
    await tokenController.lock("0x4452","30000000000000000000000",(86400*20),{from : dr2});

    await assertRevert(gv.submitVote(proposalId, 1, {from:dr3})) //reverts as tokens not locked
  
    await plotusToken.approve(tokenController.address, "100000000000000000000000",{from : dr3});
    await tokenController.lock("0x4452","30000000000000000000000",(86400*20),{from : dr3});
    let roles = await mr.roles(dr3);
    assert.equal(roles[0]/1, 2, "Not added to Token holder");
    assert.equal(roles[1]/1, 3, "Not added to DR");
    await gv.submitVote(proposalId, 1, {from:dr1});
    await gv.submitVote(proposalId, 1, {from:dr2});
    await gv.submitVote(proposalId, 1, {from:dr3});
    await increaseTime(604800);
    await gv.closeProposal(proposalId);

    let winningOption_afterVote = await allMarkets.getMarketResults(7);
    assert.notEqual(winningOption_af[0]/1, winningOption_afterVote[0]/1);
    assert.equal(winningOption_afterVote[0]/1, 1);

    let allMarketsBalanceAfter = await plotusToken.balanceOf(allMarkets.address);
    rewardPool = 199.9*1e18;
    marketCreatorIncentive = rewardPool * 0.5/100;
    // let marketCreatorIncentives = 99.95*((0.05)/100) * 1e18;
    let marketIncentivesBalanceAfter = await plotusToken.balanceOf(marketIncentives.address);
    assert.equal(marketIncentivesBalanceBefore*1  + commission*1 + marketCreatorIncentive*1, marketIncentivesBalanceAfter*1);

    assert.equal((allMarketsBalanceAfter/1), allMarketsBalanceBefore/1 - commission*1 - marketCreatorIncentive*1 , "Tokens staked for dispute not burned");
    // let data = await plotusNewInstance.marketDisputeData(marketInstance.address)
    // assert.equal(data[0], proposalId,"dispute proposal mismatch");
    // let marketDetails = await plotusNewInstance.getMarketDetails(marketInstance.address);
    // assert.equal(marketDetails[7]/1, 3, "status not updated");
    let proposalActionStatus = await gv.proposalActionStatus(proposalId);
    assert.equal(proposalActionStatus/1, 3);
    let userBalAfter = await plotusToken.balanceOf(ab1);
    assert.equal(userBalAfter/1e18, userBalBefore/1e18+500);
  });
});
contract("Market", ([ab1, ab2, ab3, ab4, dr1, dr2, dr3, notMember]) => {
  it("1.if quorum not reached proposal should be rejected", async () => {
    masterInstance = await OwnedUpgradeabilityProxy.deployed();
    masterInstance = await Master.at(masterInstance.address);
    let tokenControllerAdd  = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
    tokenController = await TokenController.at(tokenControllerAdd);
    let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
    let plotusNewInstance = await Plotus.at(plotusNewAddress);
    MockUniswapRouterInstance = await MockUniswapRouter.deployed();
    marketConfig = await plotusNewInstance.marketUtility();
    marketConfig = await MarketConfig.at(marketConfig);
    governance = await masterInstance.getLatestAddress(web3.utils.toHex("GV"));
    governance = await Governance.at(governance);
      
    let allMarkets = await masterInstance.getLatestAddress(web3.utils.toHex("AM"));
    allMarkets = await AllMarkets.at(allMarkets);

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
    await governance.setAllMarketsAddress();


    await marketConfig.setOptionPrice(1, 9);
    await marketConfig.setOptionPrice(2, 18);
    await marketConfig.setOptionPrice(3, 27);
    await increaseTime(10001);
    await allMarkets.createMarket(0,0);
    let nxmToken = await PlotusToken.deployed();
    let address = await masterInstance.getLatestAddress(web3.utils.toHex("GV"));
    let plotusToken = await PlotusToken.deployed();
    gv = await Governance.at(address);
    address = await masterInstance.getLatestAddress(web3.utils.toHex("PC"));
    pc = await ProposalCategory.at(address);
    address = await masterInstance.getLatestAddress(web3.utils.toHex("MR"));
    mr = await MemberRoles.at(address);
    let tc = await TokenController.at(await masterInstance.getLatestAddress(web3.utils.toHex("MR")));
    await plotusToken.approve(mr.address, "10000000000000000000000");
   
    await plotusToken.transfer(ab2, "50000000000000000000000");
    await plotusToken.transfer(ab3, "50000000000000000000000");
    await plotusToken.transfer(ab4, "50000000000000000000000");
    await plotusToken.transfer(dr1, "50000000000000000000000");
    await plotusToken.transfer(dr2, "50000000000000000000000");
    await plotusToken.transfer(dr3, "50000000000000000000000");
    await MockUniswapRouterInstance.setPrice("1000000000000000");
    await marketConfig.setPrice("1000000000000000");
    await marketConfig.setNextOptionPrice(2);
    await plotusToken.approve(allMarkets.address, "100000000000000000000");
    await allMarkets.depositAndPlacePrediction("100000000000000000000", 7, plotusToken.address, 100*1e8, 1);
    // cannot raise dispute if market is open
    await plotusToken.approve(allMarkets.address, "10000000000000000000000");
    await assertRevert(allMarkets.raiseDispute(7, 1400000000000,"raise dispute","this is description","this is solution hash"));
    
    await increaseTime(3601);
    // cannot raise dispute if market is closed but result is not out
    await plotusToken.approve(tokenController.address, "10000000000000000000000");
    await assertRevert(allMarkets.raiseDispute(7, 1400000000000,"raise dispute","this is description","this is solution hash"));
   
    await increaseTime(3600*8);
    await allMarkets.postResultMock(100000000000, 7);
     // cannot raise dispute with less than minimum stake
    await plotusToken.approve(tokenController.address, "10000000000000000000000");
    await assertRevert(allMarkets.raiseDispute(7, 1400000000000,"raise dispute","this is description","this is solution hash",{from : notMember}));
    //can raise dispute in cooling period and stake
    await plotusToken.approve(tokenController.address, "10000000000000000000000");
    await allMarkets.raiseDispute(7, 1400000000000,"raise dispute","this is description","this is solution hash");
    // cannot raise dispute multiple times
    await assertRevert(allMarkets.raiseDispute(7, 1400000000000,"raise dispute","this is description","this is solution hash"));
    await assertRevert(allMarkets.resolveDispute(7, 100));
    let winningOption_af = await allMarkets.getMarketResults(7)
    let proposalId = await gv.getProposalLength()-1;
    let userBalBefore = await plotusToken.balanceOf(ab1);
    
    await plotusToken.approve(tokenController.address, "100000000000000000000000",{from : dr1});
    await tokenController.lock("0x4452","30000000000000000000000",(86400*20),{from : dr1});
    
    await plotusToken.approve(tokenController.address, "100000000000000000000000",{from : dr2});
    await tokenController.lock("0x4452","30000000000000000000000",(86400*20),{from : dr2});

    await assertRevert(gv.submitVote(proposalId, 1, {from:dr3})) //reverts as tokens not locked
  
    await plotusToken.approve(tokenController.address, "100000000000000000000000",{from : dr3});
    await tokenController.lock("0x4452","30000000000000000000000",(86400*20),{from : dr3});
    let roles = await mr.roles(dr3);
    assert.equal(roles[0]/1, 2, "Not added to Token holder");
    assert.equal(roles[1]/1, 3, "Not added to DR");
    await increaseTime(604800);
    await gv.closeProposal(proposalId);
    // let data = await plotusNewInstance.marketDisputeData(marketInstance.address)
    // assert.equal(data[0], proposalId,"dispute proposal mismatch");
    // let marketDetails = await plotusNewInstance.getMarketDetails(marketInstance.address);
    // assert.equal(marketDetails[7]/1, 3, "status not updated");

    let userBalAfter = await plotusToken.balanceOf(ab1);
    let winningOption_afterVote = await allMarkets.getMarketResults(7)
    assert.equal(userBalAfter/1e18, userBalBefore/1e18, "Tokens not burnt");
    assert.equal(winningOption_af[0]/1, winningOption_afterVote[0]/1);
  });
});
contract("Market", ([ab1, ab2, ab3, ab4, dr1, dr2, dr3, notMember]) => {
  it("2.if DR panel rejects", async () => {
    masterInstance = await OwnedUpgradeabilityProxy.deployed();
    masterInstance = await Master.at(masterInstance.address);
    let tokenControllerAdd  = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
    tokenController = await TokenController.at(tokenControllerAdd);
    let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
    let plotusNewInstance = await Plotus.at(plotusNewAddress);
    MockUniswapRouterInstance = await MockUniswapRouter.deployed();
    marketConfig = await plotusNewInstance.marketUtility();
    marketConfig = await MarketConfig.at(marketConfig);
        governance = await masterInstance.getLatestAddress(web3.utils.toHex("GV"));
    governance = await Governance.at(governance);
      
    let allMarkets = await masterInstance.getLatestAddress(web3.utils.toHex("AM"));
    allMarkets = await AllMarkets.at(allMarkets);

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
    await governance.setAllMarketsAddress();

    await increaseTime(10001);
    await allMarkets.createMarket(0,0);
    let nxmToken = await PlotusToken.deployed();
    let address = await masterInstance.getLatestAddress(web3.utils.toHex("GV"));
    let plotusToken = await PlotusToken.deployed();
    gv = await Governance.at(address);
    address = await masterInstance.getLatestAddress(web3.utils.toHex("PC"));
    pc = await ProposalCategory.at(address);
    address = await masterInstance.getLatestAddress(web3.utils.toHex("MR"));
    mr = await MemberRoles.at(address);
    let tc = await TokenController.at(await masterInstance.getLatestAddress(web3.utils.toHex("MR")));
    
    await plotusToken.approve(mr.address, "100000000000000000000000");
     
    await plotusToken.transfer(ab2, "50000000000000000000000");
    await plotusToken.transfer(ab3, "50000000000000000000000");
    await plotusToken.transfer(ab4, "50000000000000000000000");
    await plotusToken.transfer(dr1, "50000000000000000000000");
    await plotusToken.transfer(dr2, "50000000000000000000000");
    await plotusToken.transfer(dr3, "50000000000000000000000");
    await MockUniswapRouterInstance.setPrice("1000000000000000");
    await marketConfig.setPrice("1000000000000000");
    await marketConfig.setNextOptionPrice(2);
    await plotusToken.approve(allMarkets.address, "100000000000000000000");
    await allMarkets.depositAndPlacePrediction("100000000000000000000", 7, plotusToken.address, 100*1e8, 1);
    
    await increaseTime(3600*8);
    await allMarkets.postResultMock(100000000000, 7);
    //can raise dispute in cooling period and stake
    await plotusToken.approve(allMarkets.address, "10000000000000000000000");
    let allMarketsBalanceBefore = await plotusToken.balanceOf(allMarkets.address);
    await allMarkets.raiseDispute(7, 1400000000000,"raise dispute","this is description","this is solution hash");
    await increaseTime(901);
     // cannot raise dispute if market cool time is over
    await plotusToken.approve(allMarkets.address, "10000000000000000000000");
    await assertRevert(allMarkets.raiseDispute(7, 1400000000000,"raise dispute","this is description","this is solution hash"));
    
    let plotusContractBalanceBefore = await plotusToken.balanceOf(allMarkets.address);
    let winningOption_before = await allMarkets.getMarketResults(7)
    let proposalId = await gv.getProposalLength()-1;
    let userBalBefore = await plotusToken.balanceOf(ab1);
    await plotusToken.approve(tokenController.address, "100000000000000000000000",{from : dr1});
    await tokenController.lock("0x4452","5000000000000000000000",(86400*20),{from : dr1});
    
    await plotusToken.approve(tokenController.address, "100000000000000000000000",{from : dr2});
    await tokenController.lock("0x4452","5000000000000000000000",(86400*20),{from : dr2});
    
    await plotusToken.approve(tokenController.address, "100000000000000000000000",{from : dr3});
    await tokenController.lock("0x4452","5000000000000000000000",(86400*100),{from : dr3});
    await gv.submitVote(proposalId, 0, {from:dr1});
    await gv.submitVote(proposalId, 0, {from:dr2});
    await gv.submitVote(proposalId, 0, {from:dr3});
    await increaseTime(9 * 86401);
    await gv.closeProposal(proposalId);
    await increaseTime(86401);
    let proposal = await gv.proposal(proposalId);
    assert.isAbove((proposal[2])/1,3);
    let plotusContractBalanceAfter = await plotusToken.balanceOf(allMarkets.address);
    // assert.isAbove(plotusContractBalanceBefore/1, plotusContractBalanceAfter/1);
    //Incentives will be burnt: 500 tokens i.e 500000000000000000000
    assert.equal((plotusContractBalanceAfter/1e18).toFixed(2), (plotusContractBalanceBefore/1e18 - 500).toFixed(2), "Tokens staked for dispute not burned");
    let allMarketsBalanceAfter = await plotusToken.balanceOf(allMarkets.address);
    allMarketsBalanceAfter = allMarketsBalanceAfter.toString();
    allMarketsBalanceBefore = allMarketsBalanceBefore.toString();
    assert.equal((allMarketsBalanceAfter), allMarketsBalanceBefore, "Tokens staked for dispute not burned");
    let userBalAfter = await plotusToken.balanceOf(ab1);

    assert.equal(userBalAfter/1e18, userBalBefore/1e18, "Tokens not burnt");
    let winningOption_afterVote = await allMarkets.getMarketResults(7);
    assert.equal(winningOption_before[0]/1, winningOption_afterVote[0]/1);
  });

  it("Should not burn DR member's tokens if invalid code is passed in proposal", async function() {
    let tokensLockedOfDR1Before = await tokenController.tokensLocked(dr1, toHex("DR"));
    action = "burnLockedTokens(address,bytes32,uint256)"
    let actionHash = encode(action, dr1, toHex("PR"), "2000000000000000000000");
    let p = await gv.getProposalLength();
    await gv.createProposal("proposal", "proposal", "proposal", 0);
    await gv.categorizeProposal(p, 11, 0);
    await gv.submitProposalWithSolution(p, "proposal", actionHash);
    let members = await mr.members(2);
    let iteration = 0;
    await gv.submitVote(p, 1);
    await gv.submitVote(p, 1, {from:ab2});
    await gv.submitVote(p, 1, {from:ab3});
    await gv.submitVote(p, 1, {from:ab4});

    await increaseTime(604800);
    await gv.closeProposal(p);
    let proposal = await gv.proposal(p);
    assert.equal(proposal[2].toNumber(), 3);
    await increaseTime(86400);
    await gv.triggerAction(p);
    let proposalActionStatus = await gv.proposalActionStatus(p);
    assert.equal(proposalActionStatus/1, 1, "Not executed");
    let tokensLockedOfDR1after = await tokenController.tokensLocked(dr1, web3.utils.toHex("DR"));
    assert.equal(tokensLockedOfDR1after/1, tokensLockedOfDR1Before/1, "burned");
  });

  it("Should burn partial DR member's tokens if lock period is not completed", async function() {

    assert.equal((await tokenController.tokensLockedAtTime(dr3,toHex("DR"),await latestTime())),"5000000000000000000000");
    let tokensLockedOfDR1Before = await tokenController.tokensLockedAtTime(dr3, web3.utils.toHex("DR"), await latestTime());
    action = "burnLockedTokens(address,bytes32,uint256)"
    let actionHash = encode(action, dr3, toHex("DR"), "2000000000000000000000");
    let p = await gv.getProposalLength();
    await gv.createProposal("proposal", "proposal", "proposal", 0);
    await gv.categorizeProposal(p, 11, 0);
    await gv.submitProposalWithSolution(p, "proposal", actionHash);
    let members = await mr.members(2);
    let iteration = 0;
    await gv.submitVote(p, 1);
    await gv.submitVote(p, 1, {from:ab2});
    await gv.submitVote(p, 1, {from:ab3});
    await gv.submitVote(p, 1, {from:ab4});
    await gv.submitVote(p, 1, {from:dr1});
    await gv.submitVote(p, 1, {from:dr2});
    await gv.submitVote(p, 1, {from:dr3});

    await increaseTime(604800);
    await gv.closeProposal(p);
    let proposal = await gv.proposal(p);
    assert.equal(proposal[2].toNumber(), 3);
    await increaseTime(86400);
    await gv.triggerAction(p);
    let proposalActionStatus = await gv.proposalActionStatus(p);
    assert.equal(proposalActionStatus/1, 3, "Not executed");
    let tokensLockedOfDR1after = await tokenController.tokensLockedAtTime(dr3, web3.utils.toHex("DR"),await latestTime());
    assert.equal(tokensLockedOfDR1after/1, tokensLockedOfDR1Before/1 - 2000000000000000000000, "Not burned");
  });

  it("Should burn all DR member's tokens if lock period is not completed", async function() {

    assert.equal((await tokenController.tokensLockedAtTime(dr3,toHex("DR"),await latestTime())),"3000000000000000000000");
    let tokensLockedOfDR1Before = await tokenController.tokensLockedAtTime(dr3, web3.utils.toHex("DR"), await latestTime());
    action = "burnLockedTokens(address,bytes32,uint256)"
    let actionHash = encode(action, dr3, toHex("DR"), "3000000000000000000000");
    let p = await gv.getProposalLength();
    await gv.createProposal("proposal", "proposal", "proposal", 0);
    await gv.categorizeProposal(p, 11, 0);
    await gv.submitProposalWithSolution(p, "proposal", actionHash);
    let members = await mr.members(2);
    let iteration = 0;
    await gv.submitVote(p, 1);
    await gv.submitVote(p, 1, {from:ab2});
    await gv.submitVote(p, 1, {from:ab3});
    await gv.submitVote(p, 1, {from:ab4});
    await gv.submitVote(p, 1, {from:dr1});
    await gv.submitVote(p, 1, {from:dr2});
    await gv.submitVote(p, 1, {from:dr3});

    await increaseTime(604800);
    await gv.closeProposal(p);
    let proposal = await gv.proposal(p);
    assert.equal(proposal[2].toNumber(), 3);
    await increaseTime(86400);
    await gv.triggerAction(p);
    let proposalActionStatus = await gv.proposalActionStatus(p);
    assert.equal(proposalActionStatus/1, 3, "Not executed");
    let tokensLockedOfDR1after = await tokenController.tokensLockedAtTime(dr3, web3.utils.toHex("DR"),await latestTime());
    assert.equal(tokensLockedOfDR1after/1, tokensLockedOfDR1Before/1 - 3000000000000000000000, "Not burned");
  });
    
  it("Increase time to complete lock period", async function() {
    await increaseTime(8640000);
    // await tokenController.unlock(dr3);
  });

  it("Should not burn DR member's tokens if lock period is completed", async function() {

    assert.equal((await tokenController.tokensLockedAtTime(dr1,toHex("DR"),await latestTime())),0);
    let tokensLockedOfDR1Before = await tokenController.tokensLocked(dr1, toHex("DR"));
    action = "burnLockedTokens(address,bytes32,uint256)"
    let actionHash = encode(action, dr1, toHex("DR"), "2000000000000000000000");
    let p = await gv.getProposalLength();
    await gv.createProposal("proposal", "proposal", "proposal", 0);
    await gv.categorizeProposal(p, 11, 0);
    await gv.submitProposalWithSolution(p, "proposal", actionHash);
    let members = await mr.members(2);
    let iteration = 0;
    await gv.submitVote(p, 1);
    await gv.submitVote(p, 1, {from:ab2});
    await gv.submitVote(p, 1, {from:ab3});
    await gv.submitVote(p, 1, {from:ab4});

    await increaseTime(604800);
    await gv.closeProposal(p);
    let proposal = await gv.proposal(p);
    assert.equal(proposal[2].toNumber(), 3);
    await increaseTime(86400);
    await gv.triggerAction(p);
    let proposalActionStatus = await gv.proposalActionStatus(p);
    assert.equal(proposalActionStatus/1, 1, "Not executed");
    let tokensLockedOfDR1after = await tokenController.tokensLocked(dr1, web3.utils.toHex("DR"));
    assert.equal(tokensLockedOfDR1after/1, tokensLockedOfDR1Before/1, "burned");
  });

});