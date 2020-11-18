const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const Governance = artifacts.require("Governance");
const MemberRoles = artifacts.require("MockMemberRoles");
const ProposalCategory = artifacts.require("ProposalCategory");
const TokenController = artifacts.require("TokenController");
const Master = artifacts.require("Master");
const PlotusToken = artifacts.require("MockPLOT");
const assertRevert = require("./utils/assertRevert.js").assertRevert;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const { toHex, toWei } = require("./utils/ethTools.js");
const expectEvent = require("./utils/expectEvent");
const Web3 = require("web3");
const { assert } = require("chai");
const web3 = new Web3();
var ethutil= require('ethereumjs-util');
const encode = require("./utils/encoder.js").encode3;
const signAndExecuteMetaTx = require("./utils/signAndExecuteMetaTx.js").signAndExecuteMetaTx;
const BN = require('bn.js');
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

contract("MetaTxs", ([user1,user2,user3]) => {
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
  });

  it("Should be able to transfer plot via meta transaction", async function () {
    let functionSignature = encode("transfer(address,uint256)", user2, toWei(1000));
    let values = [new BN(await plotusToken.getNonce(user1)), plotusToken.address, new BN(await plotusToken.getChainID()), ethutil.toBuffer(functionSignature)];
    let types = ['uint256', 'address', 'uint256', 'bytes']

    let user1BalBefore = (await plotusToken.balanceOf(user1))/1e18;
    let user2BalBefore = (await plotusToken.balanceOf(user2))/1e18;
    await signAndExecuteMetaTx(
      "fb437e3e01939d9d4fef43138249f23dc1d0852e69b0b5d1647c087f869fabbd",
      types,
      values,
      user1,
      functionSignature,
      plotusToken
      );
    let user1BalAfter = (await plotusToken.balanceOf(user1))/1e18;
    let user2BalAfter = (await plotusToken.balanceOf(user2))/1e18;

    assert.equal(user1BalAfter, user1BalBefore - 1000);
    assert.equal(user2BalAfter,  user2BalBefore/1 + 1000);
  });

  it("Should be able to approve plot via meta transaction", async function () {
    let functionSignature = encode("approve(address,uint256)", user2, toWei(1234));
    let values = [new BN(await plotusToken.getNonce(user1)), plotusToken.address, new BN(await plotusToken.getChainID()), ethutil.toBuffer(functionSignature)];
    let types = ['uint256', 'address', 'uint256', 'bytes']

    let approvalBefore = (await plotusToken.allowance(user1,user2))/1e18;
    await signAndExecuteMetaTx(
      "fb437e3e01939d9d4fef43138249f23dc1d0852e69b0b5d1647c087f869fabbd",
      types,
      values,
      user1,
      functionSignature,
      plotusToken
      );
    let approvalAfter = (await plotusToken.allowance(user1,user2))/1e18;

    assert.equal(approvalAfter, approvalBefore/1 + 1234);
  });

  it("Should be able to increase plot allowance via meta transaction", async function () {
    let functionSignature = encode("increaseAllowance(address,uint256)", user2, toWei(200));
    let values = [new BN(await plotusToken.getNonce(user1)), plotusToken.address, new BN(await plotusToken.getChainID()), ethutil.toBuffer(functionSignature)];
    let types = ['uint256', 'address', 'uint256', 'bytes']

    let approvalBefore = (await plotusToken.allowance(user1,user2))/1e18;
    await signAndExecuteMetaTx(
      "fb437e3e01939d9d4fef43138249f23dc1d0852e69b0b5d1647c087f869fabbd",
      types,
      values,
      user1,
      functionSignature,
      plotusToken
      );
    let approvalAfter = (await plotusToken.allowance(user1,user2))/1e18;

    assert.equal(approvalAfter, approvalBefore/1 + 200);
  });

  it("Should be able to decrease plot allowance via meta transaction", async function () {
    let functionSignature = encode("decreaseAllowance(address,uint256)", user2, toWei(100));
    let values = [new BN(await plotusToken.getNonce(user1)), plotusToken.address, new BN(await plotusToken.getChainID()), ethutil.toBuffer(functionSignature)];
    let types = ['uint256', 'address', 'uint256', 'bytes']

    let approvalBefore = (await plotusToken.allowance(user1,user2))/1e18;
    await signAndExecuteMetaTx(
      "fb437e3e01939d9d4fef43138249f23dc1d0852e69b0b5d1647c087f869fabbd",
      types,
      values,
      user1,
      functionSignature,
      plotusToken
      );
    let approvalAfter = (await plotusToken.allowance(user1,user2))/1e18;

    assert.equal(approvalAfter, approvalBefore/1 - 100);
  });

  it("Should be able to spend plot after getting approval via meta transaction", async function () {
    let functionSignature = encode("transferFrom(address,address,uint256)", user1,user3, toWei(500));
    let values = [new BN(await plotusToken.getNonce(user2)), plotusToken.address, new BN(await plotusToken.getChainID()), ethutil.toBuffer(functionSignature)];
    let types = ['uint256', 'address', 'uint256', 'bytes']



    let user1BalBefore = (await plotusToken.balanceOf(user1))/1e18;
    let user3BalBefore = (await plotusToken.balanceOf(user3))/1e18;
    let approvalBefore = (await plotusToken.allowance(user1,user2))/1e18;
    await signAndExecuteMetaTx(
      "7c85a1f1da3120c941b83d71a154199ee763307683f206b98ad92c3b4e0af13e",
      types,
      values,
      user2,
      functionSignature,
      plotusToken
      );
    let user1BalAfter = (await plotusToken.balanceOf(user1))/1e18;
    let user3BalAfter = (await plotusToken.balanceOf(user3))/1e18;
    let approvalAfter = (await plotusToken.allowance(user1,user2))/1e18;

    assert.equal(user1BalAfter, user1BalBefore - 500);
    assert.equal(user3BalAfter,  user3BalBefore/1 + 500);
    assert.equal(approvalAfter, approvalBefore/1 - 500);
  });

  it("Should be able to burn plot via meta transaction", async function () {
    let functionSignature = encode("burn(uint256)", toWei(1000));
    let values = [new BN(await plotusToken.getNonce(user1)), plotusToken.address, new BN(await plotusToken.getChainID()), ethutil.toBuffer(functionSignature)];
    let types = ['uint256', 'address', 'uint256', 'bytes']

    // console.log("===> ", await plotusToken.isLockedForGV(user1));


    let user1BalBefore = (await plotusToken.balanceOf(user1))/1e18;
    await signAndExecuteMetaTx(
      "fb437e3e01939d9d4fef43138249f23dc1d0852e69b0b5d1647c087f869fabbd",
      types,
      values,
      user1,
      functionSignature,
      plotusToken
      );
    let user1BalAfter = (await plotusToken.balanceOf(user1))/1e18;

    assert.equal(user1BalAfter, user1BalBefore - 1000);
  });

  it("Should be able to burn plot after getting approval via meta transaction", async function () {
    let functionSignature = encode("burnFrom(address,uint256)", user1, toWei(500));
    let values = [new BN(await plotusToken.getNonce(user2)), plotusToken.address, new BN(await plotusToken.getChainID()), ethutil.toBuffer(functionSignature)];
    let types = ['uint256', 'address', 'uint256', 'bytes']



    let user1BalBefore = (await plotusToken.balanceOf(user1))/1e18;
    let approvalBefore = (await plotusToken.allowance(user1,user2))/1e18;
    await signAndExecuteMetaTx(
      "7c85a1f1da3120c941b83d71a154199ee763307683f206b98ad92c3b4e0af13e",
      types,
      values,
      user2,
      functionSignature,
      plotusToken
      );
    let user1BalAfter = (await plotusToken.balanceOf(user1))/1e18;
    let approvalAfter = (await plotusToken.allowance(user1,user2))/1e18;

    assert.equal(user1BalAfter, user1BalBefore - 500);
    assert.equal(approvalAfter, approvalBefore/1 - 500);
  });

});
