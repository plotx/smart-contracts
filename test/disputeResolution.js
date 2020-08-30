const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("Plotus");
const Master = artifacts.require("Master");
const PlotusToken = artifacts.require("MockPLOT");
const TokenController = artifacts.require("MockTokenController");
const MockchainLinkBTC = artifacts.require("MockChainLinkAggregator");
const Governance = artifacts.require("Governance");
const ProposalCategory = artifacts.require('ProposalCategory');
const MemberRoles = artifacts.require('MemberRoles');
const BLOT = artifacts.require("BLOT");
const web3 = Market.web3;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const { assertRevert } = require('./utils/assertRevert');
contract("Market", ([ab1, ab2, ab3, ab4, dr1, dr2, dr3, notMember]) => {
  it("1.if DR panel accepts", async () => {
    let masterInstance = await OwnedUpgradeabilityProxy.deployed();
    masterInstance = await Master.at(masterInstance.address);
    let tokenControllerAdd  = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
    let tokenController = await TokenController.at(tokenControllerAdd);
    let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
    let plotusNewInstance = await Plotus.at(plotusNewAddress);
    const openMarkets = await plotusNewInstance.getOpenMarkets();
    marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
    await increaseTime(10001);
    assert.ok(marketInstance);
    let nxmToken = await PlotusToken.deployed();
    let address = await masterInstance.getLatestAddress(web3.utils.toHex("GV"));
    let plotusToken = await PlotusToken.deployed();
    let gv = await Governance.at(address);
    address = await masterInstance.getLatestAddress(web3.utils.toHex("PC"));
    let pc = await ProposalCategory.at(address);
    address = await masterInstance.getLatestAddress(web3.utils.toHex("MR"));
    let mr = await MemberRoles.at(address);
    let tc = await TokenController.at(await masterInstance.getLatestAddress(web3.utils.toHex("MR")));
    await plotusToken.approve(mr.address, "10000000000000000000000");
   
    await plotusToken.transfer(ab2, "50000000000000000000000");
    await plotusToken.transfer(ab3, "50000000000000000000000");
    await plotusToken.transfer(ab4, "50000000000000000000000");
    await plotusToken.transfer(dr1, "50000000000000000000000");
    await plotusToken.transfer(dr2, "50000000000000000000000");
    await plotusToken.transfer(dr3, "50000000000000000000000");
   
    await mr.addInitialABandDRMembers([ab2, ab3, ab4], [dr1, dr2, dr3], { from: ab1 });
    
    // cannot raise dispute if market is open
    await plotusToken.approve(marketInstance.address, "10000000000000000000000");
    await assertRevert(marketInstance.raiseDispute(14000,"raise dispute","this is short desc.","this is description","this is solution hash"));
    
    await increaseTime(3601);
    // cannot raise dispute if market is closed but result is not out
    await plotusToken.approve(marketInstance.address, "10000000000000000000000");
    await assertRevert(marketInstance.raiseDispute(14000,"raise dispute","this is short desc.","this is description","this is solution hash"));
   
    await increaseTime(3600);
    await marketInstance.calculatePredictionResult(1000);
     // cannot raise dispute with less than minimum stake
    await plotusToken.approve(marketInstance.address, "10000000000000000000000");
    await assertRevert(marketInstance.raiseDispute(14000,"raise dispute","this is short desc.","this is description","this is solution hash",{from : notMember}));
    //can raise dispute in cooling period and stake
    await plotusToken.approve(marketInstance.address, "10000000000000000000000");
    await marketInstance.raiseDispute(14000,"raise dispute","this is short desc.","this is description","this is solution hash");
    await increaseTime(901);
     // cannot raise dispute if market cool time is over
    await plotusToken.approve(marketInstance.address, "10000000000000000000000");
    await assertRevert(marketInstance.raiseDispute(14000,"raise dispute","this is short desc.","this is description","this is solution hash"));
    
    let winningOption_af = await marketInstance.getMarketResults()
    console.log("winningOption",winningOption_af[0]/1)
    let proposalId = await gv.getProposalLength()-1;
    console.log("proposalId",proposalId/1)
    let userBalBefore = await plotusToken.balanceOf(ab1);
    console.log("balance before accept proposal",userBalBefore/1)
    
    await plotusToken.approve(tokenController.address, "100000000000000000000000");
    await tokenController.lock("0x4452","20000000000000000000000",(86400*20),{from : dr1});
    
    await plotusToken.approve(tokenController.address, "100000000000000000000000");
    await tokenController.lock("0x4452","20000000000000000000000",(86400*20),{from : dr2});
    
    await plotusToken.approve(tokenController.address, "100000000000000000000000");
    await tokenController.lock("0x4452","20000000000000000000000",(86400*20),{from : dr3});
    await gv.submitVote(proposalId, 1, {from:dr1});
    await gv.submitVote(proposalId, 1, {from:dr2});
    await gv.submitVote(proposalId, 1, {from:dr3});
    await gv.closeProposal(proposalId);
    await increaseTime(86401);
    await gv.triggerAction(proposalId);
    let status = await plotusNewInstance.marketDisputeStatus(marketInstance.address)
    assert.equal(status/1, 3,"dispute proposal not accepted");
    // let marketDetails = await plotusNewInstance.getMarketDetails(marketInstance.address);
    // assert.equal(marketDetails[7]/1, 3, "status not updated");
    let proposalActionStatus = await gv.proposalActionStatus(proposalId);
    assert.equal(proposalActionStatus/1, 3);
    let userBalAfter = await plotusToken.balanceOf(ab1);
    console.log("balance before accept proposal",userBalAfter/1)
    let winningOption_afterVote = await marketInstance.getMarketResults()
    assert.notEqual(winningOption_af[0]/1, winningOption_afterVote[0]/1);
    console.log("winningOption After accept proposal",winningOption_afterVote[0]/1);
  });
});
contract("Market", ([ab1, ab2, ab3, ab4, dr1, dr2, dr3, notMember]) => {
  it("2.if DR panel rejects", async () => {
    let masterInstance = await OwnedUpgradeabilityProxy.deployed();
    masterInstance = await Master.at(masterInstance.address);
    let tokenControllerAdd  = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
    let tokenController = await TokenController.at(tokenControllerAdd);
    let plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
    let plotusNewInstance = await Plotus.at(plotusNewAddress);
    const openMarkets = await plotusNewInstance.getOpenMarkets();
    marketInstance = await Market.at(openMarkets["_openMarkets"][0]);
    await increaseTime(10001);
    assert.ok(marketInstance);
    let nxmToken = await PlotusToken.deployed();
    let address = await masterInstance.getLatestAddress(web3.utils.toHex("GV"));
    let plotusToken = await PlotusToken.deployed();
    let gv = await Governance.at(address);
    address = await masterInstance.getLatestAddress(web3.utils.toHex("PC"));
    let pc = await ProposalCategory.at(address);
    address = await masterInstance.getLatestAddress(web3.utils.toHex("MR"));
    let mr = await MemberRoles.at(address);
    let tc = await TokenController.at(await masterInstance.getLatestAddress(web3.utils.toHex("MR")));
    
    await plotusToken.approve(mr.address, "100000000000000000000000");
     
    await plotusToken.transfer(ab2, "50000000000000000000000");
    await plotusToken.transfer(ab3, "50000000000000000000000");
    await plotusToken.transfer(ab4, "50000000000000000000000");
    await plotusToken.transfer(dr1, "50000000000000000000000");
    await plotusToken.transfer(dr2, "50000000000000000000000");
    await plotusToken.transfer(dr3, "50000000000000000000000");
     
    await mr.addInitialABandDRMembers([ab2, ab3, ab4], [dr1, dr2, dr3], { from: ab1 });
    
    await increaseTime(7201);
    await marketInstance.calculatePredictionResult(1000);
    //can raise dispute in cooling period and stake
    await plotusToken.approve(marketInstance.address, "10000000000000000000000");
    await marketInstance.raiseDispute(14000,"raise dispute","this is short desc.","this is description","this is solution hash");
    let plotusContractBalanceBefore = await plotusToken.balanceOf(plotusNewInstance.address);
    let winningOption_before = await marketInstance.getMarketResults()
    console.log("winningOption",winningOption_before[0]/1)
    let proposalId = await gv.getProposalLength()-1;
    console.log("proposalId",proposalId/1)
    let userBalBefore = await plotusToken.balanceOf(ab1);
    console.log("balance before reject proposal",userBalBefore/1)
    await plotusToken.approve(tokenController.address, "100000000000000000000000");
    await tokenController.lock("0x4452","20000000000000000000000",(86400*20),{from : dr1});
    
    await plotusToken.approve(tokenController.address, "100000000000000000000000");
    await tokenController.lock("0x4452","20000000000000000000000",(86400*20),{from : dr2});
    
    await plotusToken.approve(tokenController.address, "100000000000000000000000");
    await tokenController.lock("0x4452","20000000000000000000000",(86400*20),{from : dr3});
    await gv.submitVote(proposalId, 0, {from:dr1});
    await gv.submitVote(proposalId, 0, {from:dr2});
    await gv.submitVote(proposalId, 0, {from:dr3});
    await increaseTime(9 * 86401);
    await gv.closeProposal(proposalId);
    await increaseTime(86401);
    let proposal = await gv.proposal(proposalId);
    assert.isAbove((proposal[2])/1,3);
    let plotusContractBalanceAfter = await plotusToken.balanceOf(plotusNewInstance.address);
    // assert.isAbove(plotusContractBalanceBefore/1, plotusContractBalanceAfter/1);
    assert.equal((plotusContractBalanceAfter/1), plotusContractBalanceBefore/1 - 100000000000000000000, "Tokens staked for dispute not burned");

    let winningOption_afterVote = await marketInstance.getMarketResults();
    assert.equal(winningOption_before[0]/1, winningOption_afterVote[0]/1);
    console.log("winningOption After reject proposal",winningOption_afterVote[0]/1);
  });
});