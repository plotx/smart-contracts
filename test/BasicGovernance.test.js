const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const Governance = artifacts.require("Governance");
const MemberRoles = artifacts.require("MemberRoles");
const ProposalCategory = artifacts.require("ProposalCategory");
const TokenController = artifacts.require("TokenController");
const NXMaster = artifacts.require("Master");
const PlotusToken = artifacts.require("MockPLOT");
const assertRevert = require("./utils/assertRevert.js").assertRevert;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const encode = require("./utils/encoder.js").encode;
const { toHex, toWei } = require("./utils/ethTools.js");
const expectEvent = require("./utils/expectEvent");
const gvProp = require("./utils/gvProposal.js").gvProposal;
const Web3 = require("web3");
const { assert } = require("chai");
const gvProposalWithIncentive = require("./utils/gvProposal.js").gvProposalWithIncentive;
const gvProposalWithIncentiveViaTokenHolder = require("./utils/gvProposal.js").gvProposalWithIncentiveViaTokenHolder;
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
let nxmToken;
let tc;
let td;

contract("Governance", ([ab1, ab2, ab3, ab4, mem1, mem2, mem3, mem4, mem5, mem6, mem7, notMember, dr1, dr2, dr3]) => {
  before(async function () {
    nxms = await OwnedUpgradeabilityProxy.deployed();
    nxms = await NXMaster.at(nxms.address);
    nxmToken = await PlotusToken.deployed();
    let address = await nxms.getLatestAddress(toHex("GV"));
    gv = await Governance.at(address);
    address = await nxms.getLatestAddress(toHex("PC"));
    pc = await ProposalCategory.at(address);
    address = await nxms.getLatestAddress(toHex("MR"));
    mr = await MemberRoles.at(address);
    tc = await TokenController.at(await nxms.getLatestAddress(toHex("MR")));
    //To cover functions in govblocks interface, which are not implemented by NexusMutual
    await gv.unDelegate({ from: mem2 }); 
    await gv.addSolution(0, "", "0x");
    await gv.openProposalForVoting(0);
    await gv.pauseProposal(0);
    await gv.resumeProposal(0);
    //
    // await mr.payJoiningFee(ab1, { value: 2000000000000000 });
    // await mr.kycVerdict(ab1, true);
  });

  it("15.1 Should be able to change tokenHoldingTime manually", async function () {
    await assertRevert(gv.updateUintParameters(toHex("GOVHOLD"), 3000));
  });

  it("15.2 Only Advisory Board members are authorized to categorize proposal", async function () {
    let allowedToCategorize = await gv.allowedToCatgorize();
    assert.equal(allowedToCategorize.toNumber(), 1);
  });

  it("15.3 Should not allow unauthorized to change master address", async function () {
    await assertRevert(gv.setMasterAddress({ from: notMember }));
    // await gv.changeDependentContractAddress();
  });

  it("15.4 Should not allow unauthorized to create proposal", async function () {
    await assertRevert(
      gv.createProposal("Proposal", "Description", "Hash", 0, {
        from: notMember,
      })
    );
    await assertRevert(
      gv.createProposalwithSolution("Add new member", "Add new member", "hash", 9, "", "0x", { from: notMember })
    );
  });

  it("Should not allow to add in AB if not member", async function () {
    await assertRevert(mr.addInitialABandDRMembers([ab2, ab3, ab4], []));
  });

  it("15.5 Should create a proposal", async function () {
    let propLength = await gv.getProposalLength();
    proposalId = propLength.toNumber();
    await gv.createProposal("Proposal1", "Proposal1", "Proposal1", 0); //Pid 1
    let propLength2 = await gv.getProposalLength();
    assert.isAbove(propLength2.toNumber(), propLength.toNumber(), "Proposal not created");
  });

  it("15.6 Should not allow unauthorized person to categorize proposal", async function () {
    await assertRevert(gv.categorizeProposal(proposalId, 1, 0, { from: notMember }));
  });

  it("15.7 Should not categorize under invalid category", async function () {
    await assertRevert(gv.categorizeProposal(proposalId, 0, 0));
    await assertRevert(gv.categorizeProposal(proposalId, 35, 0));
  });

  it("Should not open proposal for voting before categorizing", async () => {
    await assertRevert(gv.submitProposalWithSolution(proposalId, "Addnewmember", "0x4d52"));
  });

  it("Should categorize proposal", async function () {
    assert.equal(await mr.checkRole(ab1, 1), 1);
    await gv.categorizeProposal(proposalId, 2, 0);
    let proposalData = await gv.proposal(proposalId);
    assert.equal(proposalData[1].toNumber(), 2, "Proposal not categorized");
  });

  it("Should allow only owner to open proposal for voting", async () => {
    // await gv.categorizeProposal(proposalId, 2, 0);
    await gv.proposal(proposalId);
    await pc.category(9);
    await assertRevert(gv.submitVote(proposalId, 1));
    await assertRevert(
      gv.submitProposalWithSolution(
        proposalId,
        "Addnewmember",
        "0xffa3992900000000000000000000000000000000000000000000000000000000000000004344000000000000000000000000000000000000000000000000000000000000",
        { from: notMember }
      )
    );
    await gv.submitProposalWithSolution(
      proposalId,
      "Addnewmember",
      "0xffa3992900000000000000000000000000000000000000000000000000000000000000004344000000000000000000000000000000000000000000000000000000000000"
    );
    assert.equal((await gv.canCloseProposal(proposalId)).toNumber(), 0);
  });

  it("15.13 Should not categorize proposal if solution exists", async function () {
    await assertRevert(gv.categorizeProposal(proposalId, 2, toWei(1)));
  });

  it("15.14 Should not allow voting for non existent solution", async () => {
    await assertRevert(gv.submitVote(proposalId, 5));
  });

  it("15.15 Should not allow unauthorized people to vote", async () => {
    await assertRevert(gv.submitVote(proposalId, 1, { from: notMember }));
  });

  it("15.16 Should submit vote to valid solution", async function () {
    await gv.submitVote(proposalId, 1);
    await gv.proposalDetails(proposalId);
    await assertRevert(gv.submitVote(proposalId, 1));
  });

  // it('15.17 Should not claim reward for an open proposal', async function() {
  //   await assertRevert(cr.claimAllPendingReward(20));
  // });

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
    pId = await gv.getProposalLength();
    lastClaimed = await gv.lastRewardClaimed(ab1);
    for (let i = 0; i < 3; i++) {
      //   await gv.createProposal("Proposal1", "Proposal1", "Proposal1", 0); //Pid 1
      // await gv.categorizeProposal(proposalId, 2, toWei(1));
      // await gv.submitProposalWithSolution(
      //   proposalId,
      //   "Addnewmember",
      //   "0xffa3992900000000000000000000000000000000000000000000000000000000000000004344000000000000000000000000000000000000000000000000000000000000"
      // );

      await gvProposalWithIncentiveViaTokenHolder(12, actionHash, mr, gv, 2, 10);
    }
    // let members = await mr.members(2);
    // let iteration = 0;
    // for (iteration = 0; iteration < members[1].length; iteration++) {
    //   await cr.claimAllPendingReward(20);
    // }
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
      await gvProposalWithIncentiveViaTokenHolder(12, actionHash, mr, gv, 2, 10);
    }
    let p = await gv.getProposalLength();
    await assertRevert(gv.rejectAction(pId));
    await gv.createProposal("proposal", "proposal", "proposal", 0);
    await gv.categorizeProposal(p, 12, 10);
    await gv.submitProposalWithSolution(p, "proposal", actionHash);
    // let members = await mr.members(2);
    // let iteration = 0;
    // for (iteration = 0; iteration < members[1].length; iteration++) {
    //   await gv.submitVote(p, 1, {
    //     from: members[1][iteration],
    //   });
    // }
    await gv.submitVote(p, 1);
    for (let i = 0; i < 3; i++) {
      await gvProposalWithIncentiveViaTokenHolder(12, actionHash, mr, gv, 2, 10);
    }
    await gv.claimReward(ab1, 20);

    let p1 = await gv.getProposalLength();
    let lastClaimed = await gv.lastRewardClaimed(ab1);
    assert.equal(lastClaimed.toNumber(), p.toNumber() - 1);
    await gv.closeProposal(p);
    await gv.claimReward(ab1, 20);

    lastClaimed = await gv.lastRewardClaimed(ab1);
    assert.equal(lastClaimed.toNumber(), p1.toNumber() - 1);
  });

  it("Claim Rewards for maximum of 20 proposals", async function () {
    await gv.claimReward(ab1, 20);
    await gv.setDelegationStatus(true, { from: ab1 });
    let actionHash = encode("updateUintParameters(bytes8,uint)", "MAXFOL", 50);
    let p1 = await gv.getProposalLength();
    let lastClaimed = await gv.lastRewardClaimed(ab1);
    for (let i = 0; i < 7; i++) {
      await gvProposalWithIncentiveViaTokenHolder(12, actionHash, mr, gv, 2, 10);
    }
    await gv.claimReward(ab1, 5);
    p1 = await gv.getProposalLength();
    let lastProposal = p1.toNumber() - 1;
    lastClaimed = await gv.lastRewardClaimed(ab1);
    //Two proposal are still pending to be claimed since 5 had been passed as max records to claim
    assert.equal(lastClaimed.toNumber(), lastProposal - 2);
  });

  it("Claim Reward for followers", async function () {
    let actionHash = encode("updateUintParameters(bytes8,uint)", "MAXFOL", 50);
    await nxmToken.transfer(mem1, toWei(1));
    await gv.delegateVote(ab1, { from: mem1 });
    await increaseTime(604805);
    await assertRevert(gv.rejectAction(pId));
    let lastClaimedAb1 = await gv.lastRewardClaimed(ab1);
    let lastClaimedMem1 = await gv.lastRewardClaimed(mem1);
    //ab1 has 2 reward pending to be claimed in previous case
    //last claimed of member will be total number of votes of ab1 until his delegation
    assert.equal(lastClaimedMem1.toNumber(), lastClaimedAb1.toNumber() + 2);
    for (let i = 0; i < 7; i++) {
      await gvProposalWithIncentiveViaTokenHolder(12, actionHash, mr, gv, 2, 10);
    }
    await gv.claimReward(mem1, 5);
    let lastClaimedMem2 = await gv.lastRewardClaimed(mem1);
    assert.equal(lastClaimedMem1.toNumber() + 5, lastClaimedMem2);
  });

  it("Last reward claimed should be updated when follower undelegates", async function () {
    await gv.claimReward(ab1, 20);
    await gv.claimReward(mem1, 20);
    // await gv.setDelegationStatus(false, { from: ab1 });
    await gv.unDelegate({ from: mem1 });

    await increaseTime(604900);
    let lastRewardClaimed = await gv.lastRewardClaimed(mem1);
    //Till now Member 1 hasn't voted on his own, so his vote count will be 0
    assert.equal(lastRewardClaimed.toNumber(), 0);
  });

  it("Should not get reward if delegated with in tokenHoldingTime", async function () {
    let mem1Balance = await nxmToken.balanceOf(mem1);
    let actionHash = encode("updateUintParameters(bytes8,uint)", "MAXFOL", 50);
    for (let i = 0; i < 6; i++) {
      await gvProposalWithIncentiveViaTokenHolder(12, actionHash, mr, gv, 2, 10);
    }
    await gv.claimReward(ab1, 4);
    let lastProposal = (await gv.getProposalLength()).toNumber() - 1;
    let lastVoteId = await gv.memberProposalVote(ab1, lastProposal);
    let lastClaimedAb1 = await gv.lastRewardClaimed(ab1);
    //Two proposals are pending to claim reward
    assert.equal(lastClaimedAb1.toNumber(), lastVoteId.toNumber() - 2);
    await gv.delegateVote(ab1, { from: mem1 });
    await gvProposalWithIncentiveViaTokenHolder(12, actionHash, mr, gv, 2, 10); //32 Member doesn't get rewards for this proposal
    await increaseTime(604805);
    let p1 = await gv.getProposalLength();
    await gvProposalWithIncentiveViaTokenHolder(12, actionHash, mr, gv, 2, 10); //33
    let p1Rewards = await gv.proposal(p1.toNumber());
    let p = await gv.getProposalLength();
    await gv.createProposal("proposal", "proposal", "proposal", 0); //34
    assert.equal(parseFloat(await gv.canCloseProposal(p)), 0);
    await gv.categorizeProposal(p, 12, 10);
    await gv.submitProposalWithSolution(p, "proposal", actionHash);
    await gv.submitVote(p, 1, { from: ab1 });
    let p2 = await gv.getProposalLength();
    await gvProposalWithIncentiveViaTokenHolder(12, actionHash, mr, gv, 2, 10); //35
    let p2Rewards = await gv.proposal(p2.toNumber());
    await gv.claimReward(mem1, 5);
    // lastClaimedAb1 = await gv.lastRewardClaimed(ab1);
    let lastClaimedMem1 = await gv.lastRewardClaimed(mem1);
    assert.equal(lastClaimedMem1.toNumber(), p.toNumber() - 1);
    const mem1Balance1 = parseFloat(await nxmToken.balanceOf(mem1));
    // commented by parv
    // let expectedBalance = mem1Balance.toNumber() + p1Rewards[4].toNumber() / 2 + p2Rewards[4].toNumber() / 2;
    let expectedBalance = parseFloat(mem1Balance) + parseFloat(10);
    assert.equal(mem1Balance1, expectedBalance);
    await gv.closeProposal(p);
    await gv.claimReward(mem1, 5);
    lastClaimedMem1 = await gv.lastRewardClaimed(mem1);
    let pRewards = await gv.proposal(p.toNumber());
    const mem1Balance2 = parseFloat(await nxmToken.balanceOf(mem1));
    // commented by parv
    expectedBalance = mem1Balance1 + parseFloat(pRewards[4]) / 2;
    assert.equal(mem1Balance2, expectedBalance);
    await gv.claimReward(ab1, 20);
    await gv.claimReward(mem1, 20);
    await gv.setDelegationStatus(false, { from: ab1 });
    await gv.unDelegate({ from: mem1 });
  });

  it("Proposal should be closed if not categorized for more than 14 days", async function () {
    pId = await gv.getProposalLength();
    await gv.createProposal("Proposal", "Proposal", "Proposal", 0);
    await increaseTime(604810 * 2);
    await gv.closeProposal(pId);
  });

  it("Proposal should be closed if not submitted to vote for more than 14 days", async function () {
    pId = await gv.getProposalLength();
    await gv.createProposal("Proposal", "Proposal", "Proposal", 0);
    await gv.categorizeProposal(pId, 12, 10);
    await increaseTime(604810 * 2);
    await gv.closeProposal(pId);
  });

  describe("Delegation cases", function () {
    it("15.24 Initialising Members", async function () {
      await nxmToken.transfer(ab2, toWei(1));
      await nxmToken.transfer(ab3, toWei(1));
      await nxmToken.transfer(ab4, toWei(1));
      await nxmToken.transfer(dr1, toWei(1));
      await nxmToken.transfer(dr2, toWei(1));
      await nxmToken.transfer(dr3, toWei(1));

      await mr.addInitialABandDRMembers([ab2, ab3, ab4], [dr1, dr2, dr3], { from: ab1 });
      assert.equal(await mr.checkRole(ab2, 1), true);
      assert.equal(await mr.checkRole(ab3, 1), true);
      assert.equal(await mr.checkRole(ab4, 1), true);
      assert.equal(await mr.checkRole(dr1, 3), true);
      assert.equal(await mr.checkRole(dr2, 3), true);
      assert.equal(await mr.checkRole(dr3, 3), true);
    });
    it("15.25 DR member cannot delegate vote", async () => {
			await assertRevert(gv.delegateVote(ab1, { from: dr1 }));
		});
    it("15.26 Follower cannot delegate vote if Leader is not open for delegation", async function () {
      await assertRevert(gv.delegateVote(ab1, { from: mem1 }));
    });
    it("15.27 AB member cannot delegate vote to AB", async function () {
      await gv.setDelegationStatus(true, { from: ab1 });
      await assertRevert(gv.delegateVote(ab1, { from: ab2 }));
    });
    it("15.28 Owner cannot delegate vote", async function () {
      await gv.setDelegationStatus(true, { from: ab3 });
      await assertRevert(gv.delegateVote(ab3, { from: ab1 }));
    });
    it("15.29 AB member cannot delegate vote to Member", async function () {
      await gv.setDelegationStatus(true, { from: mem1 });
      await assertRevert(gv.delegateVote(mem1, { from: ab4 }));
    });
    it("15.30 AB member cannot delegate vote to Non-Member", async function () {
      await assertRevert(gv.delegateVote(notMember, { from: ab4 }));
    });
    it("15.31 non token holder cannot delegate vote", async function () {
      await assertRevert(gv.delegateVote(ab1, { from: notMember }));
    });
    it("15.32 AB member cannot delegate vote to AB who is follower", async function () {
      await gv.setDelegationStatus(true, { from: ab2 });
      await assertRevert(gv.delegateVote(ab2, { from: ab4 }));
    });
    it("15.33 Member can delegate vote to AB who is not a follower", async function () {
      await gv.delegateVote(ab1, { from: mem1 });
      let alreadyDelegated = await gv.alreadyDelegated(ab1);
      assert.equal(alreadyDelegated, true);
      assert.equal(await gv.alreadyDelegated(ab2), false);
      assert.equal(await gv.alreadyDelegated(notMember), false);
    });
    it("15.34 Member can delegate vote to Member who is not follower", async function () {
      await gv.setDelegationStatus(true, { from: mem3 });
      // used later
      await nxmToken.transfer(mem2, toWei(1));
      await nxmToken.transfer(mem3, toWei(1));
      await nxmToken.transfer(mem4, toWei(1));
      await nxmToken.transfer(mem5, toWei(1));
      await nxmToken.transfer(mem6, toWei(1));
      await nxmToken.transfer(mem7, toWei(1));
      await gv.delegateVote(mem3, { from: mem5 });
      let followers = await gv.getFollowers(mem3);
      let delegationData = await gv.allDelegation(followers[0].toNumber());
      assert.equal(delegationData[0], mem5);
    });
    it("15.35 Leader cannot delegate vote", async function () {
      await assertRevert(gv.delegateVote(ab3, { from: mem3 }));
    });
    it("15.36 Member cannot delegate vote to Non-Member", async function () {
      await assertRevert(gv.delegateVote(notMember, { from: mem2 }));
    });
    it("15.37 Member cannot delegate vote to member who is follower", async function () {
      await assertRevert(gv.delegateVote(mem5, { from: mem2 }));
    });
    it("15.38 Create a proposal", async function () {
      pId = (await gv.getProposalLength()).toNumber();
      await gv.createProposal("Proposal1", "Proposal1", "Proposal1", 0); //Pid 2
      await gv.categorizeProposal(pId, 12, toWei(130));
      await gv.submitProposalWithSolution(pId, "changes to pricing model", "0x");
    });
    it("15.39 Ab cannot vote twice on a same proposal and cannot transfer nxm to others", async function () {
      await gv.submitVote(pId, 1, { from: ab3 });
      await assertRevert(nxmToken.transferFrom(ab3, ab2, toWei(1)));
      await assertRevert(gv.submitVote(pId, 1, { from: ab3 }));
    });
    it("15.40 Member cannot vote twice on a same proposal", async function () {
      await nxmToken.transfer(mem4, toWei(1));
      await gv.submitVote(pId, 1, { from: mem4 });
      await assertRevert(gv.submitVote(pId, 1, { from: mem4 }));
    });
    it("15.41 Member cannot assign proxy if voted within 7 days", async function () {
      await assertRevert(gv.delegateVote(ab1, { from: mem4 }));
    });
    it("15.42 Follower cannot vote on a proposal", async function () {
      await assertRevert(gv.submitVote(pId, 1, { from: mem5 }));
    });
    it("15.43 Member can assign proxy if voted more than 7 days earlier", async function () {
      await increaseTime(604850);
      await gv.delegateVote(ab1, { from: mem4 });
    });
    it("15.44 Follower can undelegate vote if not voted since 7 days", async function () {
      await increaseTime(604800);
      await gv.unDelegate({ from: mem5 });
      await gv.alreadyDelegated(mem3);
      await increaseTime(259200);
    });
    it("15.45 Leader can change delegation status if there are no followers", async function () {
      await gv.setDelegationStatus(false, { from: mem5 });
    });
    it("15.46 Follower cannot assign new proxy if revoked proxy within 7 days", async function () {
      await assertRevert(gv.delegateVote(ab1, { from: mem5 }));
    });
    it("15.47 Undelegated Follower cannot vote within 7 days since undelegation", async function () {
      pId = (await gv.getProposalLength()).toNumber();
      await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
      await gv.categorizeProposal(pId, 12, toWei(130));
      await gv.submitProposalWithSolution(pId, "changes to pricing model", "0x");
      await assertRevert(gv.submitVote(pId, 1, { from: mem5 }));
      await increaseTime(432000); //7 days will be completed since revoking proxy
      await gv.delegateVote(ab1, { from: mem7 });
      await nxmToken.transfer(mem2, toWei("1"),{from: mem7}); 
    });
    it("15.48 Undelegated Follower can vote after 7 days", async function () {
      let lockedTime = await nxmToken.lockedForGV(mem2);
      await await gv.submitVote(pId, 1, { from: ab1 });
      await gv.submitVote(pId, 1, { from: ab3 });
      await gv.submitVote(pId, 1, { from: mem2 });
      await gv.submitVote(pId, 1, { from: mem3 });
      await gv.submitVote(pId, 1, { from: mem5 });
    });
    it("15.49 Tokens should be locked for 7 days after voting", async function () {
      const lockedTime = await nxmToken.lockedForGV(mem2);
      assert.isAbove(lockedTime.toNumber(), Date.now() / 1000);
    });
    it("15.50 should not withdraw membership if he have pending rewads to claim", async function () {
      await increaseTime(604810);
      await gv.closeProposal(pId);
      // commented by parv
      // await assertRevert(mr.withdrawMembership({ from: mem5 }));
    });
    it("15.51 Follower cannot undelegate if there are rewards pending to be claimed", async function () {
      await assertRevert(gv.unDelegate({ from: mem5 }));
      await gv.claimReward(mem5, 20);
    });
    it("15.52 Follower should not get reward if delegated within 7days", async function () {
      let pendingReward = await gv.getPendingReward(mem7);
      assert.equal(pendingReward.toNumber(), 0);
    });
    it("15.53 Follower can assign new proxy if revoked proxy more than 7 days earlier", async function () {
      await increaseTime(604810);
      await gv.delegateVote(ab1, { from: mem5 });
    });
    it("15.54 Should not get rewards if not participated in voting", async function () {
      let pendingReward = await gv.getPendingReward(mem6);
      assert.equal(pendingReward.toNumber(), 0);
    });
    it("15.55 Should not add followers more than followers limit", async function () {
      await increaseTime(604810);
      pId = (await gv.getProposalLength()).toNumber();
      await gv.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
      await gv.categorizeProposal(pId, 13, 0);
      let actionHash = encode("updateUintParameters(bytes8,uint)", "MAXFOL", 2);
      await gv.submitProposalWithSolution(pId, "update max followers limit", actionHash);
      await gv.submitVote(pId, 1, { from: ab1 });
      await gv.submitVote(pId, 1, { from: ab2 });
      await gv.submitVote(pId, 1, { from: ab3 });
      await gv.submitVote(pId, 1, { from: mem2 });
      await gv.submitVote(pId, 1, { from: mem3 });
      await gv.submitVote(pId, 1, { from: mem6 }); //vote not counted as mem6 transfer tokens after delegation
			let voteData = await gv.voteTallyData(pId, 1);
			assert.equal(parseFloat(voteData[1]), 9);
			await increaseTime(604810);
      await gv.closeProposal(pId);
      await increaseTime(604810);
      await gv.triggerAction(pId);
      await assertRevert(gv.delegateVote(ab1, { from: mem6 }));
    });
  });
});
