const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const Governance = artifacts.require("Governance");
const MemberRoles = artifacts.require("MockMemberRoles");
const ProposalCategory = artifacts.require("ProposalCategory");
const TokenController = artifacts.require("TokenController");
const Master = artifacts.require("Master");
const IERC1132 = artifacts.require("IERC1132");
const PlotusToken = artifacts.require("MockPLOT");
const assertRevert = require("./utils/assertRevert.js").assertRevert;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const latestTime = require("./utils/latestTime.js").latestTime;
const { toHex, toWei } = require("./utils/ethTools.js");
const expectEvent = require("./utils/expectEvent");
const Web3 = require("web3");
const { assert } = require("chai");
const web3 = new Web3();
const encode = require("./utils/encoder.js").encode3;
const signAndExecuteMetaTx = require("./utils/signAndExecuteMetaTx.js").signAndExecuteMetaTx;
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
let td;

contract("MetaTxs", ([user1,user2,user3,user4,user5]) => {
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
    tc = await TokenController.at(await nxms.getLatestAddress(toHex("TC")));
    await plotusToken.transfer(user2,toWei(3000));
  });
describe('PlotxToken Test Cases', function() {

  it("Should be able to transfer plot via meta transaction", async function () {
    let functionSignature = encode("transfer(address,uint256)", user3, toWei(1000));

    let user1BalBefore = (await plotusToken.balanceOf(user2))/1e18;
    let user2BalBefore = (await plotusToken.balanceOf(user3))/1e18;
    await signAndExecuteMetaTx(
      privateKeyList[1],
      user2,
      functionSignature,
      plotusToken,
      "PLOT"
      );
    let user1BalAfter = (await plotusToken.balanceOf(user2))/1e18;
    let user2BalAfter = (await plotusToken.balanceOf(user3))/1e18;

    assert.equal(user1BalAfter, user1BalBefore - 1000);
    assert.equal(user2BalAfter,  user2BalBefore/1 + 1000);
  });

  it("Should be able to approve plot via meta transaction", async function () {
    let functionSignature = encode("approve(address,uint256)", user3, toWei(1234));

    let approvalBefore = (await plotusToken.allowance(user2,user3))/1e18;
    await signAndExecuteMetaTx(
      privateKeyList[1],
      user2,
      functionSignature,
      plotusToken,
      "PLOT"
      );
    let approvalAfter = (await plotusToken.allowance(user2,user3))/1e18;

    assert.equal(approvalAfter, approvalBefore/1 + 1234);
  });

  it("Should be able to increase plot allowance via meta transaction", async function () {
    let functionSignature = encode("increaseAllowance(address,uint256)", user3, toWei(200));

    let approvalBefore = (await plotusToken.allowance(user2,user3))/1e18;
    await signAndExecuteMetaTx(
      privateKeyList[1],
      user2,
      functionSignature,
      plotusToken,
      "PLOT"
      );
    let approvalAfter = (await plotusToken.allowance(user2,user3))/1e18;

    assert.equal(approvalAfter, approvalBefore/1 + 200);
  });

  it("Should be able to decrease plot allowance via meta transaction", async function () {
    let functionSignature = encode("decreaseAllowance(address,uint256)", user3, toWei(100));

    let approvalBefore = (await plotusToken.allowance(user2,user3))/1e18;
    await signAndExecuteMetaTx(
      privateKeyList[1],
      user2,
      functionSignature,
      plotusToken,
      "PLOT"
      );
    let approvalAfter = (await plotusToken.allowance(user2,user3))/1e18;

    assert.equal(approvalAfter, approvalBefore/1 - 100);
  });

  it("Should be able to spend plot after getting approval via meta transaction", async function () {
    let functionSignature = encode("transferFrom(address,address,uint256)", user2,user4, toWei(500));

    let user2BalBefore = (await plotusToken.balanceOf(user2))/1e18;
    let user4BalBefore = (await plotusToken.balanceOf(user4))/1e18;
    let approvalBefore = (await plotusToken.allowance(user2,user3))/1e18;
    await signAndExecuteMetaTx(
      privateKeyList[2],
      user3,
      functionSignature,
      plotusToken,
      "PLOT"
      );
    let user2BalAfter = (await plotusToken.balanceOf(user2))/1e18;
    let user4BalAfter = (await plotusToken.balanceOf(user4))/1e18;
    let approvalAfter = (await plotusToken.allowance(user2,user3))/1e18;

    assert.equal(user2BalAfter, user2BalBefore - 500);
    assert.equal(user4BalAfter,  user4BalBefore/1 + 500);
    assert.equal(approvalAfter, approvalBefore/1 - 500);
  });

  it("Should be able to call functions with onlyOperator via meta transaction", async function () {

    let newPlotTok = await PlotusToken.new("PLOT1", "PLOT1", 18, user1, user1);

    //lockForGovernanceVote

    functionSignature = encode("lockForGovernanceVote(address,uint256)", user3, 100000);

    
    assert.equal(await newPlotTok.isLockedForGV(user3), false);
    await signAndExecuteMetaTx(
      privateKeyList[0],
      user1,
      functionSignature,
      newPlotTok,
      "PLOT1"
      );
    
    assert.equal(await newPlotTok.isLockedForGV(user3), true);

    //changeOperator

    functionSignature = encode("changeOperator(address)", user2);

    
    assert.equal(await newPlotTok.operator(), user1);
    await signAndExecuteMetaTx(
      privateKeyList[0],
      user1,
      functionSignature,
      newPlotTok,
      "PLOT1"
      );
    
    assert.equal(await newPlotTok.operator(), user2);

  });
});

describe('Token Controller Test Cases', function() {

  it("Should be able to Lock plot via meta transaction", async function () {
    await plotusToken.transfer(user2, toWei(100));
    await plotusToken.approve(tc.address,toWei(100),{from:user2});
    let functionSignature = encode("lock(bytes32,uint256,uint256)", toHex("DR"), toWei(10), 10000);

    let user2BalBefore = (await plotusToken.balanceOf(user2))/1e18;
    let user2LockedBefore = (await tc.tokensLocked(user2, toHex("DR")))/1e18;
    await signAndExecuteMetaTx(
      privateKeyList[1],
      user2,
      functionSignature,
      tc,
      "TC"
      );
    let user2BalAfter = (await plotusToken.balanceOf(user2))/1e18;
    let user2LockedAfter = (await tc.tokensLocked(user2,toHex("DR")))/1e18;

    assert.equal(user2BalAfter, user2BalBefore - 10);
    assert.equal(user2LockedAfter,  user2LockedBefore/1 + 10);
  });

  it("Should be able to increase lock amount plot via meta transaction", async function () {
    let functionSignature = encode("increaseLockAmount(bytes32,uint256)", toHex("DR"), toWei(15));

    let user2BalBefore = (await plotusToken.balanceOf(user2))/1e18;
    let user2LockedBefore = (await tc.tokensLocked(user2, toHex("DR")))/1e18;
    await signAndExecuteMetaTx(
      privateKeyList[1],
      user2,
      functionSignature,
      tc,
      "TC"
      );
    let user2BalAfter = (await plotusToken.balanceOf(user2))/1e18;
    let user2LockedAfter = (await tc.tokensLocked(user2,toHex("DR")))/1e18;

    assert.equal(user2BalAfter, user2BalBefore - 15);
    assert.equal(user2LockedAfter,  user2LockedBefore/1 + 15);
  });

  it("Should be able to extend Lock validity plot via meta transaction", async function () {
    let functionSignature = encode("extendLock(bytes32,uint256)", toHex("DR"), 1000);

    let lockableTok = await IERC1132.at(tc.address);
    let lcokedBefore = (await lockableTok.locked(user2, toHex("DR")));
    await signAndExecuteMetaTx(
      privateKeyList[1],
      user2,
      functionSignature,
      tc,
      "TC"
      );
    let lcokedAfter = (await lockableTok.locked(user2, toHex("DR")));

    assert.equal(lcokedAfter[1],  lcokedBefore[1]/1 + 1000);
  });

  it("Depositor Should be able to mint plot", async function () {
    let user5BalBefore = (await plotusToken.balanceOf(user5))/1e18;
    let functionSignature = await plotusToken.deposit(user5,"0x00000000000000000000000000000000000000000000003635c9adc5dea00000");
    let user5BalAfter = (await plotusToken.balanceOf(user5))/1e18;
    assert.equal(user5BalAfter,  user5BalBefore + 1000);
  });
  it("Non - Depositor Should not be able to mint plot", async function () {
    let user5BalBefore = (await plotusToken.balanceOf(user5))/1e18;
    await assertRevert(plotusToken.deposit(user5,"0x00000000000000000000000000000000000000000000003635c9adc5dea00000",{from:user2}));
    let user5BalAfter = (await plotusToken.balanceOf(user5))/1e18;
    assert.equal(user5BalAfter,  user5BalBefore);
  });
  it("user Should be able to withdraw their plot to ethereum", async function () {
    let functionSignature = encode("withdraw(uint256)", toWei(1000));
    let user5BalBefore = (await plotusToken.balanceOf(user5))/1e18;
    await signAndExecuteMetaTx(
      privateKeyList[4],
      user5,
      functionSignature,
      plotusToken,
      "PLOT"
      );
    let user5BalAfter = (await plotusToken.balanceOf(user5))/1e18;
    assert.equal(user5BalAfter,  user5BalBefore/1- 1000);
  });

});

});
