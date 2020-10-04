const MemberRoles = artifacts.require('MemberRoles');
const Governance = artifacts.require('Governance');
const TokenController = artifacts.require('TokenController');
const ProposalCategory = artifacts.require('ProposalCategory');
const Master = artifacts.require('Master');
const PLOTToken = artifacts.require('MockPLOT');
const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const assertRevert = require('./utils/assertRevert').assertRevert;
const encode = require('./utils/encoder.js').encode;
const { toHex, toWei } = require('./utils/ethTools');
const { increaseTime } = require('./utils/increaseTime');

let mr;
let gv;
let pc;
let gbt;
let address;
let gvAddress;
let p1;
let mrLength;
let p2;
let tk;
let mrLength1;
let qd;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

contract('MemberRoles', function([
  owner,
  member,
  other,
  user1,
  user2,
  user3,
  member2
]) {
  before(async function() {
    nxms = await OwnedUpgradeabilityProxy.deployed();
    nxms = await Master.at(nxms.address);
    address = await nxms.getLatestAddress(toHex('MR'));
    mr = await MemberRoles.at(address);
    address = await nxms.getLatestAddress(toHex('PC'));
    pc = await ProposalCategory.at(address);
    address = await nxms.getLatestAddress(toHex('GV'));
    gv = await Governance.at(address);
    tk = await PLOTToken.deployed();
  });

  it('Should not be able to initiate member roles twice', async function() {
    await assertRevert(mr.memberRolesInitiate(owner));
  });

  it('Should not allow unauthorized to change master address', async function() {
    await assertRevert(mr.setMasterAddress({ from: other }));
  });

  it('Should have added initial member roles', async function() {
    const ab = await mr.totalRoles.call();
    assert.equal(ab.toNumber(), 4, 'Initial member roles not created');
  });

  it('Should have assigned AB role to deployer', async function() {
    assert.equal(
      await mr.checkRole(owner, 1),
      true,
      'Owner not added to role Owner'
    );
  });

  it('Should not add initial AB members more than defined max AB count', async function() {
    let memberArray = [member, other, user1, user2, user3, member2];
    let memberArray2 = [member, other, user1, user2, user3, member2];
    await assertRevert(mr.addInitialABandDRMembers(memberArray, memberArray2));
  });

  it('Should have added owner to AB', async function() {
    const roles = await mr.roles(owner);
    assert.equal(await mr.checkRole(owner, 1), true, 'Owner not added to AB');
    assert.equal(
      await mr.checkRole(member, 1),
      false,
      'user added to AB incorrectly'
    );
    assert.equal(roles[0].toNumber(), 1, 'Owner added to AB');
  });

  it('Should add new role', async function() {
    let actionHash = encode(
      'addRole(bytes32,string,address)',
      '0x41647669736f727920426f617265000000000000000000000000000000000000',
      'New member role',
      owner
    );
    p1 = await gv.getProposalLength();
    mrLength = await mr.totalRoles();
    await gv.createProposalwithSolution(
      'Add new member',
      'Add new member',
      'Addnewmember',
      1,
      'Add new member',
      actionHash
    );
    p2 = await gv.getProposalLength();
    await gv.submitVote(p1.toNumber(), 1);
    await gv.closeProposal(p1.toNumber());
    await increaseTime(86400);
    mrLength1 = await mr.totalRoles();
    assert.isAbove(mrLength1.toNumber(), mrLength.toNumber(), 'Role not added');
  });

  it("Should update a proposal category and set allowed role to new role", async function () {
    let c1 = await pc.totalCategories();
    c1 = c1.toNumber() - 1;
    const cat1 = await pc.category(c1);
    //proposal to update category
    let mrLength = await mr.totalRoles();
    let actionHash = encode(
      "edit(uint,string,uint,uint,uint,uint[],uint,string,address,bytes2,uint[],string)",
      c1,
      "YoYo",
      4,
      1,
      20,
      [2],
      3600,
      "",
      ZERO_ADDRESS,
      toHex("EX"),
      [0, 0, 0],
      ""
    );
    let p1 = await gv.getProposalLength();
    await gv.createProposalwithSolution("Add new member", "Add new member", "Addnewmember", 4, "Add new member", actionHash);
    await gv.submitVote(p1.toNumber(), 1);
    await gv.closeProposal(p1.toNumber());
    assert.equal((await gv.proposalActionStatus(p1.toNumber()))/1, 3);
  });

  it('Should add a member to a role', async function() {
    var transaction = await mr.updateRole(member, 4, true);
    await assertRevert(mr.updateRole(member, 2, true));
    await assertRevert(mr.updateRole(member, 4, true));
    await assertRevert(mr.updateRole(member, 2, false, { from: other }));
    assert.equal(await mr.checkRole(member, 4), true, 'user not added to AB');
  });

  it("Should create a proposal with new role as authorized", async function() {
    let c1 = await pc.totalCategories();
    c1 = c1.toNumber() - 1;
    let pId = await gv.getProposalLength();
    await gv.createProposal("","","",0);
    await gv.categorizeProposal(pId, c1, 0);
    let actionHash = encode(
      null
    );
    await gv.submitProposalWithSolution(pId, "", actionHash);
    assert.equal((await gv.canCloseProposal(pId))/1,0);
    await gv.submitVote(pId,1, {from:member});
    assert.equal((await gv.canCloseProposal(pId))/1,1);
    await gv.closeProposal(pId);
    assert.equal((await gv.canCloseProposal(pId))/1,2);
  })

  it('Should fetch all address by role id', async function() {
    const g3 = await mr.members(1);
    assert.equal(g3[1][1], owner);
  });

  it('Should fetch total number of members by role id', async function() {
    const g4 = await mr.numberOfMembers(4);
    assert.equal(g4.toNumber(), 1);
  });

  it('Should fetch member count of all roles', async function() {
    const g6 = await mr.getMemberLengthForAllRoles();
    assert.equal(g6.length, 5);
    assert.equal(g6[0].toNumber(), 0);
    assert.equal(g6[1].toNumber(), 1);
    assert.equal(g6[3].toNumber(), 1);
    assert.equal(g6[4].toNumber(), 1);
  });

  it('Should not list invalid member as valid', async function() {
    var a = await mr.checkRole(member, 1);
    await mr.updateRole(member, 4, false);
    assert.equal(
      await mr.checkRole(member, 4),
      false,
      'user incorrectly added to AB'
    );
    await mr.updateRole(member, 4, true);
    let members = await mr.members(4);
    assert.equal(members[1].length, 2);
    assert.equal(await mr.checkRole(member, 4), true, 'user not added to AB');
  });

  it('Should be able to remove member from a role', async function() {
    await mr.updateRole(member, 4, false);
    assert.equal(
      await mr.checkRole(member, 4),
      false,
      'user not removed from AB'
    );
    const g3 = await mr.members(4);
    await assertRevert(mr.updateRole(member, 4, false));
  });

  it('Should not allow unauthorized people to update member roles', async function() {
    await mr.changeAuthorized(4, owner);
    await assertRevert(mr.changeAuthorized(4, owner, { from: other }));
    await assertRevert(mr.changeAuthorized(1, owner));
    await assertRevert(mr.updateRole(member, 4, true, { from: other }));
  });

  it('Should change authorizedAddress when rquested by authorizedAddress', async function() {
    await mr.changeAuthorized(4, member);
    assert.equal(
      await mr.authorized(4),
      member,
      'Authorized address not changed'
    );
  });

  it('Should get proper Roles', async () => {
    const mrs = await mr.roles(owner);
    assert.equal(await mr.checkRole(owner, 1), true, 'Owner not added to AB');
    assert.equal(mrs[0].toNumber(), 1);
    const mrs2 = await mr.roles(other);
  });

  it('Should allow anyone to be of member role 0', async () => {
    assert.equal(await mr.checkRole(owner, 0), true);
  });

  it('Should check role if user has tokens', async () => {
    await increaseTime(604800*2);
    await tk.transfer(member, "1000000000000000000");
    assert.equal(await mr.checkRole(member, 2), true);
    assert.equal(await mr.checkRole(other, 2), false);
  });

});
