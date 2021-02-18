const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const Governance = artifacts.require("Governance");
const AllMarkets = artifacts.require("AllMarkets");
const MemberRoles = artifacts.require("MockMemberRoles");
const ProposalCategory = artifacts.require("ProposalCategory");
const TokenController = artifacts.require("TokenController");
const Master = artifacts.require("Master");
const PlotusToken = artifacts.require("MockPLOT");
const assertRevert = require("./utils/assertRevert.js").assertRevert;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const encode = require("./utils/encoder.js").encode;
const encode1 = require("./utils/encoder.js").encode1;
const encode3 = require("./utils/encoder.js").encode3;
const { toHex, toWei } = require("./utils/ethTools.js");
const expectEvent = require("./utils/expectEvent");
const gvProp = require("./utils/gvProposal.js").gvProposal;
const Web3 = require("web3");
const { assert } = require("chai");
const gvProposalWithIncentive = require("./utils/gvProposal.js").gvProposalWithIncentive;
const gvProposalWithIncentiveViaTokenHolderMetaTX = require("./utils/gvProposal.js").gvProposalWithIncentiveViaTokenHolderMetaTX;
const signAndExecuteMetaTx = require("./utils/signAndExecuteMetaTx.js").signAndExecuteMetaTx;
const web3 = new Web3();
const AdvisoryBoard = "0x41420000";
let maxAllowance = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
let privateKeyList = ["fb437e3e01939d9d4fef43138249f23dc1d0852e69b0b5d1647c087f869fabbd","7c85a1f1da3120c941b83d71a154199ee763307683f206b98ad92c3b4e0af13e","ecc9b35bf13bd5459350da564646d05c5664a7476fe5acdf1305440f88ed784c","f4470c3fca4dbef1b2488d016fae25978effc586a1f83cb29ac8cb6ab5bc2d50","141319b1a84827e1046e93741bf8a9a15a916d49684ab04925ac4ce4573eea23","d54b606094287758dcf19064a8d91c727346aadaa9388732e73c4315b7c606f9","49030e42ce4152e715a7ddaa10e592f8e61d00f70ef11f48546711f159d985df","b96761b1e7ebd1e8464a78a98fe52f53ce6035c32b4b2b12307a629a551ff7cf","d4786e2581571c863c7d12231c3afb6d4cef390c0ac9a24b243293721d28ea95","ed28e3d3530544f1cf2b43d1956b7bd13b63c612d963a8fb37387aa1a5e11460","05b127365cf115d4978a7997ee98f9b48f0ddc552b981c18aa2ee1b3e6df42c6","9d11dd6843f298b01b34bd7f7e4b1037489871531d14b58199b7cba1ac0841e6","f79e90fa4091de4fc2ec70f5bf67b24393285c112658e0d810e6bd711387fbb9","99f1fc0f09230ce745b6a256ba7082e6e51a2907abda3d9e735a5c8188bb4ba1","477f86cce983b9c91a36fdcd4a7ce21144a08dee9b1aafb91b9c70e57f717ce6","b03d2e6bb4a7d71c66a66ff9e9c93549cae4b593f634a4ea2a1f79f94200f5b4","9ddc0f53a81e631dcf39d5155f41ec12ed551b731efc3224f410667ba07b37dc","cf087ff9ae7c9954ad8612d071e5cdf34a6024ee1ae477217639e63a802a53dd","b64f62b94babb82cc78d3d1308631ae221552bb595202fc1d267e1c29ce7ba60","a91e24875f8a534497459e5ccb872c4438be3130d8d74b7e1104c5f94cdcf8c2","4f49f3d029eeeb3fed14d59625acd088b6b34f3b41c527afa09d29e4a7725c32","179795fd7ac7e7efcba3c36d539a1e8659fb40d77d0a3fab2c25562d99793086","4ba37d0b40b879eceaaca2802a1635f2e6d86d5c31e3ff2d2fd13e68dd2a6d3d","6b7f5dfba9cd3108f1410b56f6a84188eee23ab48a3621b209a67eea64293394","870c540da9fafde331a3316cee50c17ad76ddb9160b78b317bef2e6f6fc4bac0","470b4cccaea895d8a5820aed088357e380d66b8e7510f0a1ea9b575850160241","8a55f8942af0aec1e0df3ab328b974a7888ffd60ded48cc6862013da0f41afbc","2e51e8409f28baf93e665df2a9d646a1bf9ac8703cbf9a6766cfdefa249d5780","99ef1a23e95910287d39493d8d9d7d1f0b498286f2b1fdbc0b01495f10cf0958","6652200c53a4551efe2a7541072d817562812003f9d9ef0ec17995aa232378f8","39c6c01194df72dda97da2072335c38231ced9b39afa280452afcca901e73643","12097e411d948f77b7b6fa4656c6573481c1b4e2864c1fca9d5b296096707c45","cbe53bf1976aee6cec830a848c6ac132def1503cffde82ccfe5bd15e75cbaa72","eeab5dcfff92dbabb7e285445aba47bd5135a4a3502df59ac546847aeb5a964f","5ea8279a578027abefab9c17cef186cccf000306685e5f2ee78bdf62cae568dd","0607767d89ad9c7686dbb01b37248290b2fa7364b2bf37d86afd51b88756fe66","e4fd5f45c08b52dae40f4cdff45e8681e76b5af5761356c4caed4ca750dc65cd","145b1c82caa2a6d703108444a5cf03e9cb8c3cd3f19299582a564276dbbba734","736b22ec91ae9b4b2b15e8d8c220f6c152d4f2228f6d46c16e6a9b98b4733120","ac776cb8b40f92cdd307b16b83e18eeb1fbaa5b5d6bd992b3fda0b4d6de8524c","65ba30e2202fdf6f37da0f7cfe31dfb5308c9209885aaf4cef4d572fd14e2903","54e8389455ec2252de063e83d3ce72529d674e6d2dc2070661f01d4f76b63475","fbbbfb525dd0255ee332d51f59648265aaa20c2e9eff007765cf4d4a6940a849","8de5e418f34d04f6ea947ce31852092a24a705862e6b810ca9f83c2d5f9cda4d","ea6040989964f012fd3a92a3170891f5f155430b8bbfa4976cde8d11513b62d9","14d94547b5deca767137fbd14dae73e888f3516c742fad18b83be333b38f0b88","47f05203f6368d56158cda2e79167777fc9dcb0c671ef3aabc205a1636c26a29"];

let gv;
let cr;
let pc;
let nxms;
let proposalId;
let pId;
let mr;
let plotusToken;
let tc;
let td, allMarkets;

contract("Governance", ([ab1, ab2, ab3, ab4, mem1, mem2, mem3, mem4, mem5, mem6, mem7, notMember, dr1, dr2, dr3]) => {
  before(async function () {
    nxms = await OwnedUpgradeabilityProxy.deployed();
    nxms = await Master.at(nxms.address);
    plotusToken = await PlotusToken.deployed();
    let address = await nxms.getLatestAddress(toHex("GV"));
    gv = await Governance.at(address);
    address = await nxms.getLatestAddress(toHex("PC"));
    pc = await ProposalCategory.at(address);
    address = await nxms.getLatestAddress(toHex("MR"));
    mr = await MemberRoles.at(address);
    tc = await TokenController.at(await nxms.getLatestAddress(toHex("MR")));
    allMarkets = await AllMarkets.at(await nxms.getLatestAddress(toHex("MC")));
    await plotusToken.transfer(allMarkets.address, toWei(10000));
    await increaseTime(604800);
  });

  it("15.1 Should be able to change tokenHoldingTime manually", async function () {
    let functionSignature = encode3("updateUintParameters(bytes8,uint256)",toHex("GOVHOLD"), 3000);
    await assertRevert(signAndExecuteMetaTx(
        privateKeyList[0],
        ab1,
        functionSignature,
        gv,
        "GV"
        ));
    functionSignature = encode3("updateUintParameters(bytes8,uint256)",toHex("GOVHOLD"), 3000);
    functionSignature = functionSignature + (gv.address).slice(2);
    await assertRevert(signAndExecuteMetaTx(
            privateKeyList[0],
            ab1,
            functionSignature,
            gv,
            "GV"
            ));
  });

  it("15.2 Only Advisory Board members are authorized to categorize proposal", async function () {
    let allowedToCategorize = await gv.allowedToCatgorize();
    assert.equal(allowedToCategorize.toNumber(), 1);
  });

  it("15.3 Should not allow unauthorized to change master address", async function () {
    let functionSignature = encode3("setMasterAddress()");
    await assertRevert(signAndExecuteMetaTx(
        privateKeyList[11],
        notMember,
        functionSignature,
        gv,
        "GV"
        ));
    // await assertRevert(gv.setMasterAddress({ from: notMember }));
    // await gv.changeDependentContractAddress();
  });

  it("15.4 Should not allow unauthorized to create proposal", async function () {
    let functionSignature = encode3("createProposal(string,string,string,uint256)","Proposal1", "Proposal1", "Proposal1", 0);
    await assertRevert(signAndExecuteMetaTx(
        privateKeyList[11],
        notMember,
        functionSignature,
        gv,
        "GV"
        ));
    functionSignature = encode3("createProposalwithSolution(string,string,string,uint256,string,bytes32)","Add new member", "Add new member", "hash", 9, "", "0x");
    await assertRevert(signAndExecuteMetaTx(
        privateKeyList[11],
        notMember,
        functionSignature,
        gv,
        "GV"  
        ));
    // await assertRevert(
    //   gv.createProposalwithSolution("Add new member", "Add new member", "hash", 9, "", "0x", { from: notMember })
    // );
  });

  it("15.5 Should create a proposal", async function () {
    let propLength = await gv.getProposalLength();
    proposalId = propLength.toNumber();
    // await gv.createProposal("Proposal1", "Proposal1", "Proposal1", 0); //Pid 1
    let functionSignature = encode3("createProposal(string,string,string,uint256)","Proposal1", "Proposal1", "Proposal1", 0);
    await signAndExecuteMetaTx(
        privateKeyList[0],
        ab1,
        functionSignature,
        gv,
        "GV"
        );
    let propLength2 = await gv.getProposalLength();
    assert.isAbove(propLength2.toNumber(), propLength.toNumber(), "Proposal not created");
  });

  it("15.6 Should not allow unauthorized person to categorize proposal", async function () {
    // await assertRevert(gv.categorizeProposal(proposalId, 1, 0, { from: notMember }));
    let functionSignature = encode3("categorizeProposal(uint256,uint256,uint256)",proposalId, 1, 0);
    await assertRevert(signAndExecuteMetaTx(
      privateKeyList[11],
      notMember,
      functionSignature,
      gv,
      "GV"
    ));
  });

  it("15.7 Should not categorize under invalid category", async function () {
    let functionSignature = encode3("categorizeProposal(uint256,uint256,uint256)",proposalId, 0, 0);
    await assertRevert(signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    ));
    functionSignature = encode3("categorizeProposal(uint256,uint256,uint256)",proposalId, 35, 0);
    await assertRevert(signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    ));
    // await assertRevert(gv.categorizeProposal(proposalId, 0, 0));
    // await assertRevert(gv.categorizeProposal(proposalId, 35, 0));
  });

  it("Should not open proposal for voting before categorizing", async () => {
    let functionSignature = encode3("submitProposalWithSolution(uint256,string,bytes)", proposalId, "", "0x4d52");
    await assertRevert(signAndExecuteMetaTx(
        privateKeyList[0],
        ab1,
        functionSignature,
        gv,
      "GV"
        ));
    // await assertRevert(gv.submitProposalWithSolution(proposalId, "Addnewmember", "0x4d52"));
  });

  it("Should categorize proposal", async function () {
    assert.equal(await mr.checkRole(ab1, 1), 1);
    let functionSignature = encode3("categorizeProposal(uint256,uint256,uint256)",proposalId, 2, 0);
    await signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.categorizeProposal(proposalId, 2, 0);
    let proposalData = await gv.proposal(proposalId);
    assert.equal(proposalData[1].toNumber(), 2, "Proposal not categorized");
  });

  it("Should allow only owner to open proposal for voting", async () => {
    // await gv.categorizeProposal(proposalId, 2, 0);
    await gv.proposal(proposalId);
    await pc.category(9);
    let functionSignature = encode3("submitVote(uint256,uint256)",proposalId, 1);
    await assertRevert(signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    ));
    // await assertRevert(gv.submitVote(proposalId, 1));
    functionSignature = encode3("submitProposalWithSolution(uint256,string,bytes)", proposalId, "Addnewmember", "0xffa3992900000000000000000000000000000000000000000000000000000000000000004344000000000000000000000000000000000000000000000000000000000000");
    await assertRevert(signAndExecuteMetaTx(
        privateKeyList[11],
        notMember,
        functionSignature,
        gv,
      "GV"
        ));
    // await assertRevert(
    //   gv.submitProposalWithSolution(
    //     proposalId,
    //     "Addnewmember",
    //     "0xffa3992900000000000000000000000000000000000000000000000000000000000000004344000000000000000000000000000000000000000000000000000000000000",
    //     { from: notMember }
    //   )
    // );
    functionSignature = encode3("submitProposalWithSolution(uint256,string,bytes)", proposalId, "Addnewmember", "0xffa3992900000000000000000000000000000000000000000000000000000000000000004344000000000000000000000000000000000000000000000000000000000000");
    await signAndExecuteMetaTx(
        privateKeyList[0],
        ab1,
        functionSignature,
        gv,
      "GV"
        );
    // await gv.submitProposalWithSolution(
    //   proposalId,
    //   "Addnewmember",
    //   "0xffa3992900000000000000000000000000000000000000000000000000000000000000004344000000000000000000000000000000000000000000000000000000000000"
    // );
    assert.equal((await gv.canCloseProposal(proposalId)).toNumber(), 0);
  });

  it("15.13 Should not categorize proposal if solution exists", async function () {
    let functionSignature = encode3("categorizeProposal(uint256,uint256,uint256)",proposalId, 2, toWei(1));
    await assertRevert(signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    ));
    // await assertRevert(gv.categorizeProposal(proposalId, 2, toWei(1)));
  });

  it("15.14 Should not allow voting for non existent solution", async () => {
    let functionSignature = encode3("submitVote(uint256,uint256)",proposalId, 5);
    await assertRevert(signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    ));
    // await assertRevert(gv.submitVote(proposalId, 5));
  });

  it("15.15 Should not allow unauthorized people to vote", async () => {
    let functionSignature = encode3("submitVote(uint256,uint256)",proposalId, 1);
    await assertRevert(signAndExecuteMetaTx(
      privateKeyList[11],
      notMember,
      functionSignature,
      gv,
      "GV"
    ));
    await assertRevert(gv.submitVote(proposalId, 1, { from: notMember }));
  });

  it("15.16 Should submit vote to valid solution", async function () {
    let functionSignature = encode3("submitVote(uint256,uint256)",proposalId, 1);
    await signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.submitVote(proposalId, 1);
    await gv.proposalDetails(proposalId);
    functionSignature = encode3("submitVote(uint256,uint256)",proposalId, 1);
    await assertRevert(signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    ));
    // await assertRevert(gv.submitVote(proposalId, 1));
  });

  it('15.17 Should not transfer tokens if voted on governance', async function() {
    await assertRevert(plotusToken.transfer(mem1, toWei(100)));
    await assertRevert(plotusToken.transferFrom(ab1, mem1, toWei(100), {from: mem1}));
  });

  it("15.18 Should close proposal", async function () {
    let canClose = await gv.canCloseProposal(proposalId);
    assert.equal(canClose.toNumber(), 1);
    await gv.closeProposal(proposalId);
  });

  it("15.19 Should not close already closed proposal", async function () {
    let canClose = await gv.canCloseProposal(proposalId);
    assert.equal(canClose.toNumber(), 2);
    await assertRevert(gv.closeProposal(proposalId));
  });

  it("15.20 Should get rewards", async function () {
    let pendingRewards = await gv.getPendingReward(ab1);
  });

  it("15.22 Should claim rewards", async function () {
    await gv.claimReward(ab1, 20);
    let pendingRewards = await gv.getPendingReward(ab1);
    assert.equal(pendingRewards.toNumber(), 0, "Rewards not claimed");
    pId = await gv.getProposalLength();
    lastClaimed = await gv.lastRewardClaimed(ab1);
    pendingRewards = await gv.getPendingReward(ab1);
  });

  // it('15.23 Should not claim reward twice for same proposal', async function() {
  //   await assertRevert(cr.claimAllPendingReward(20));
  // });

  it("Should claim rewards for multiple number of proposals", async function () {
    let action = "updateUintParameters(bytes8,uint)";
    let code = "MAXFOL";
    let proposedValue = 50;
    let lastClaimed = await gv.lastRewardClaimed(ab1);
    let actionHash = encode(action, code, proposedValue);
    lastClaimed = await gv.lastRewardClaimed(ab1);
    proposalId = await gv.getProposalLength();
    for (let i = 0; i < 3; i++) {
      pId = await gv.getProposalLength();
      let functionSignature = encode3("createProposal(string,string,string,uint256)","Proposal1", "Proposal1", "Proposal1", 0);
      await signAndExecuteMetaTx(
        privateKeyList[0],
        ab1,
        functionSignature,
        gv,
      "GV"
      );
      // await gv.createProposal("Proposal1", "Proposal1", "Proposal1", 0); //Pid 1
      functionSignature = encode3("categorizeProposal(uint256,uint256,uint256)",pId, 2, toWei(1));
      await signAndExecuteMetaTx(
        privateKeyList[0],
        ab1,
        functionSignature,
        gv,
      "GV"
      );
      // await gv.categorizeProposal(pId, 2, toWei(1));
      functionSignature = encode3("submitProposalWithSolution(uint256,string,bytes)", pId, "Addnewmember", "0xffa3992900000000000000000000000000000000000000000000000000000000000000004344000000000000000000000000000000000000000000000000000000000000");
      await signAndExecuteMetaTx(
        privateKeyList[0],
        ab1,
        functionSignature,
        gv,
      "GV"
      );
      // await gv.submitProposalWithSolution(
      //   pId,
      //   "Addnewmember",
      //   "0xffa3992900000000000000000000000000000000000000000000000000000000000000004344000000000000000000000000000000000000000000000000000000000000"
      // );
      functionSignature = encode3("submitVote(uint256,uint256)",pId, 1);
      await signAndExecuteMetaTx(
        privateKeyList[0],
        ab1,
        functionSignature,
        gv,
      "GV"
      );
      // await gv.submitVote(pId,1);

      // await gvProposalWithIncentiveViaTokenHolderMetaTX(12, actionHash, mr, gv, 2, 10, 0, ab1, privateKeyList[0]);
    }
    let pendingRewards = await gv.getPendingReward(ab1);
    await gv.claimReward(ab1, 20);
    pendingRewards = await gv.getPendingReward(ab1);
    pId = await gv.getProposalLength();
    lastClaimed = await gv.lastRewardClaimed(ab1);
  });

  it("Claim rewards for proposals which are not in sequence", async function () {
    pId = await gv.getProposalLength();
    let action = "updateUintParameters(bytes8,uint)";
    let code = "MAXFOL";
    let proposedValue = 50;
    let actionHash = encode(action, code, proposedValue);
    for (let i = 0; i < 3; i++) {
      await gvProposalWithIncentiveViaTokenHolderMetaTX(12, actionHash, mr, gv, 2, 10, 0, ab1, privateKeyList[0]);
    }
    let p = await gv.getProposalLength();
    await assertRevert(gv.rejectAction(pId));
    let functionSignature = encode3("createProposal(string,string,string,uint256)","Proposal1", "Proposal1", "Proposal1", 0);
    await signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.createProposal("proposal", "proposal", "proposal", 0);
    functionSignature = encode3("categorizeProposal(uint256,uint256,uint256)",p, 12, 10);
    await signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.categorizeProposal(p, 12, 10);
    functionSignature = encode3("submitProposalWithSolution(uint256,string,bytes)", p, "Addnewmember", actionHash);
    await signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.submitProposalWithSolution(p, "proposal", actionHash);
    functionSignature = encode3("submitVote(uint256,uint256)",p, 1);
    await signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.submitVote(p, 1);
    for (let i = 0; i < 3; i++) {
      await gvProposalWithIncentiveViaTokenHolderMetaTX(12, actionHash, mr, gv, 2, 10, 0, ab1, privateKeyList[0]);
    }
    let pendingRewards = await gv.getPendingReward(ab1);
    await gv.claimReward(ab1, 20);
    pendingRewards = await gv.getPendingReward(ab1);

    let p1 = await gv.getProposalLength();
    let lastClaimed = await gv.lastRewardClaimed(ab1);
    assert.equal(lastClaimed.toNumber(), proposalId.toNumber() - 1);
    await gv.closeProposal(p);
    pendingRewards = await gv.getPendingReward(ab1);
    await gv.claimReward(ab1, 20);
    pendingRewards = await gv.getPendingReward(ab1);

    lastClaimed = await gv.lastRewardClaimed(ab1);
    assert.equal(lastClaimed.toNumber(), proposalId.toNumber() - 1);
  });

  it("Claim Rewards for maximum of 20 proposals", async function () {
    pendingRewards = await gv.getPendingReward(ab1);
    await gv.claimReward(ab1, 20);
    let actionHash = encode("updateUintParameters(bytes8,uint)", "MAXFOL", 50);
    let p1 = await gv.getProposalLength();
    let lastClaimed = await gv.lastRewardClaimed(ab1);
    for (let i = 0; i < 7; i++) {
      await gvProposalWithIncentiveViaTokenHolderMetaTX(12, actionHash, mr, gv, 2, 10, 0, ab1, privateKeyList[0]);
    }
    await assertRevert(gv.rejectAction(lastClaimed/1 + 1, {from: ab1}));
    await gv.closeProposal(lastClaimed/1 + 1);
    await gv.closeProposal(lastClaimed/1 + 2);
    await gv.closeProposal(lastClaimed/1 + 3);
    await gv.claimReward(ab1, 20);
    pendingRewards = await gv.getPendingReward(ab1);
    p1 = await gv.getProposalLength();
    let lastProposal = p1.toNumber() - 1;
    lastClaimed = await gv.lastRewardClaimed(ab1);
    assert.equal(lastClaimed.toNumber(), lastProposal);
  });

  it("Proposal should be closed if not categorized for more than 14 days", async function () {
    pId = await gv.getProposalLength();
    let functionSignature = encode3("createProposal(string,string,string,uint256)","Proposal1", "Proposal1", "Proposal1", 0);
    await signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.createProposal("Proposal", "Proposal", "Proposal", 0);
    await increaseTime(604810 * 2);
    await gv.closeProposal(pId);
  });

  it("Proposal should be closed if not submitted to vote for more than 14 days", async function () {
    pId = await gv.getProposalLength();
    let functionSignature = encode3("createProposal(string,string,string,uint256)","Proposal1", "Proposal1", "Proposal1", 0);
    await signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.createProposal("Proposal", "Proposal", "Proposal", 0);
    functionSignature = encode3("categorizeProposal(uint256,uint256,uint256)",pId, 12, 10);
    await signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.categorizeProposal(pId, 12, 10);
    await increaseTime(604810 * 2);
    await gv.closeProposal(pId);
  });

  it("Should add initial AB members and create a proposal", async function() {
    await increaseTime(604800*2);
    await plotusToken.transfer(ab2, toWei(100));
    await plotusToken.transfer(ab3, toWei(100));
    await plotusToken.transfer(ab4, toWei(100));
    await mr.addInitialABMembers([ab2, ab3, ab4]);
    let actionHash = encode("updateUintParameters(bytes8,uint)", "ACWT", 1);
    pId = await gv.getProposalLength();
    let functionSignature = encode3("createProposal(string,string,string,uint256)","Proposal1", "Proposal1", "Proposal1", 0);
    await signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.createProposal("proposal", "proposal", "proposal", 0);
    functionSignature = encode3("categorizeProposal(uint256,uint256,uint256)",pId, 13, 10);
    await signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.categorizeProposal(pId, 13, 10);
    functionSignature = encode3("submitProposalWithSolution(uint256,string,bytes)", pId, "Addnewmember", actionHash);
    await signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.submitProposalWithSolution(pId, "proposal", actionHash);
    functionSignature = encode3("submitVote(uint256,uint256)",pId, 1);
    await signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.submitVote(pId, 1);
    functionSignature = encode3("submitVote(uint256,uint256)",pId, 1);
    await signAndExecuteMetaTx(
      privateKeyList[1],
      ab2,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.submitVote(pId, 1, {from:ab2});
    functionSignature = encode3("submitVote(uint256,uint256)",pId, 1);
    await signAndExecuteMetaTx(
      privateKeyList[2],
      ab3,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.submitVote(pId, 1, {from:ab3});
    functionSignature = encode3("submitVote(uint256,uint256)",pId, 1);
    await signAndExecuteMetaTx(
      privateKeyList[3],
      ab4,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.submitVote(pId, 1, {from:ab4});
    await increaseTime(604810);
    await gv.closeProposal(pId);
  });

  // it("Should reject action with AB", async function() {
  //   await gv.rejectAction(pId);
  // });

  // it("Should not allow same AB reject action twice", async function() {
  //   await assertRevert(gv.rejectAction(pId, {from: ab1}));
  // });

  // it("Should reject action if 60% of ab rejects proposal", async function() {
  //   await gv.rejectAction(pId, {from: ab2});
  //   await gv.rejectAction(pId, {from: ab3});
  //   assert.equal(await gv.proposalActionStatus(pId), 2);
  // });

  // it("Should not reject action if already rejected", async function() {
  //   await assertRevert(gv.rejectAction(pId, {from: ab3}));
  // });

  // it("Should not trigger action if already rejected", async function() {
  //   await assertRevert(gv.triggerAction(pId));
  // });

  it("Should consider AB vote if quorum is not reached", async function() {
    await increaseTime(604800*2);
    let actionHash = encode("updateUintParameters(bytes8,uint)", "ACWT", 50);
    pId = await gv.getProposalLength();
    let functionSignature = encode3("createProposal(string,string,string,uint256)","Proposal1", "Proposal1", "Proposal1", 0);
    await signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.createProposal("proposal", "proposal", "proposal", 0);
    functionSignature = encode3("categorizeProposal(uint256,uint256,uint256)",pId, 13, 10);
    await signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.categorizeProposal(pId, 13, 10);
    functionSignature = encode3("submitProposalWithSolution(uint256,string,bytes)", pId, "Addnewmember", actionHash);
    await signAndExecuteMetaTx(
      privateKeyList[0],
      ab1,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.submitProposalWithSolution(pId, "proposal", actionHash);
    functionSignature = encode3("submitVote(uint256,uint256)",pId, 1);
    await signAndExecuteMetaTx(
      privateKeyList[1],
      ab2,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.submitVote(pId, 1, {from:ab2});
    functionSignature = encode3("submitVote(uint256,uint256)",pId, 1);
    await signAndExecuteMetaTx(
      privateKeyList[2],
      ab3,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.submitVote(pId, 1, {from:ab3});
    functionSignature = encode3("submitVote(uint256,uint256)",pId, 1);
    await signAndExecuteMetaTx(
      privateKeyList[3],
      ab4,
      functionSignature,
      gv,
      "GV"
    );
    // await gv.submitVote(pId, 1, {from:ab4});
    await increaseTime(604810);
    await gv.closeProposal(pId);
    let proposalData = await gv.proposal(pId);
    assert.equal(proposalData[2]/1,3);
    assert.equal(await gv.proposalActionStatus(pId), 3);
  });

});
