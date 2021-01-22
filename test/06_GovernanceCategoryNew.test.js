const Governance = artifacts.require('Governance');
const AllMarkets = artifacts.require('AllMarkets');
const MarketCreationRewards = artifacts.require('MarketCreationRewards');
const ProposalCategory = artifacts.require('ProposalCategory');
const MemberRoles = artifacts.require('MemberRoles');
const Master = artifacts.require('Master');
const TokenController = artifacts.require('TokenController');
const MarketConfig = artifacts.require('MarketUtility');
const PlotusToken = artifacts.require("MockPLOT");
const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const gvProposal = require('./utils/gvProposal.js').gvProposalWithIncentiveViaTokenHolder;
const assertRevert = require("./utils/assertRevert.js").assertRevert;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const encode = require('./utils/encoder.js').encode;
const encode1 = require('./utils/encoder.js').encode1;
const {toHex, toWei, toChecksumAddress} = require('./utils/ethTools');
const { takeSnapshot, revertSnapshot } = require('./utils/snapshot');


let gv;
let pc;
let mr;
let tc;
let ms;
let pl;
let allMarkets, mcr;
let marketConfig;
let plotTok;
let snapshotId;

const maxAllowance = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

contract('Configure Global Parameters', accounts => {

    const [ab1, newAB] = accounts;

    before(async function() {

      snapshotId = await takeSnapshot();
      ms = await OwnedUpgradeabilityProxy.deployed();
      ms = await Master.at(ms.address);
      let address = await ms.getLatestAddress('0x4756');
      gv = await Governance.at(address);
      address = await ms.getLatestAddress('0x5043');
      pc = await ProposalCategory.at(address);
      address = await ms.getLatestAddress('0x4d52');
      mr = await MemberRoles.at(address);
      tc = await TokenController.at(await ms.getLatestAddress('0x5443'));
      marketConfig = await MarketConfig.at(await ms.getLatestAddress(toHex("MU")));
      mcr = await MarketCreationRewards.at(await ms.getLatestAddress(toHex("MC")));
      allMarkets = await AllMarkets.at(await ms.getLatestAddress(toHex("AM")));
      plotTok = await PlotusToken.deployed();
      await plotTok.transfer(allMarkets.address, toWei(20));
      await plotTok.transfer(newAB, toWei(20));

    });

    describe('Testing Governanace Test Cases', function() {

      it('Should Update Governance to new contract', async function() {
        let newGV = await Governance.new()
        actionHash = encode1(
          ['bytes2[]', 'address[]'],
          [
            [toHex('GV')],
            [newGV.address]
          ]
        );
        
        await gvProposal(
          6,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0, accounts[0]
        );
        let proxy = await OwnedUpgradeabilityProxy.at(gv.address);
        assert.equal(await proxy.implementation(), newGV.address);
      });
      
      it('Should Not Update Market Config if zero address passed', async function() {
        let oldImplementation = await OwnedUpgradeabilityProxy.at(marketConfig.address);
        oldImplementation = await oldImplementation.implementation();
        let actionHash = encode(
          'upgradeContractImplementation(address,address)',
          marketConfig.address,
          0x0000000000000000000000000000000000000000
        );
        await gvProposal(
          5,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0, accounts[0]
        );
        let proxyCon = await OwnedUpgradeabilityProxy.at(marketConfig.address);
        assert.equal(await proxyCon.implementation(), oldImplementation);
      });

      it('Should Pause Market Creation', async function() {
        assert.equal(await allMarkets.marketCreationPaused(), false);
        let actionHash = encode(
          'pauseMarketCreation()'
        );
        await gvProposal(
          16,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
        assert.equal(await allMarkets.marketCreationPaused(), true);
      });

      it('Should stay Pause Market Creation if already paused', async function() {
        assert.equal(await allMarkets.marketCreationPaused(), true);
        let actionHash = encode(
          'pauseMarketCreation()'
        );
        await gvProposal(
          16,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
        assert.equal(await allMarkets.marketCreationPaused(), true);
      });

      it('Should Resume Market Creation', async function() {
        assert.equal(await allMarkets.marketCreationPaused(), true);
        let actionHash = encode(
          'resumeMarketCreation()'
        );
        await gvProposal(
          17,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
        assert.equal(await allMarkets.marketCreationPaused(), false);
      });

      it('Should stay Resume Market Creation if already resumed', async function() {
        assert.equal(await allMarkets.marketCreationPaused(), false);
        let actionHash = encode(
          'resumeMarketCreation()'
        );
        await gvProposal(
          17,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
        assert.equal(await allMarkets.marketCreationPaused(), false);
      });

      it('Transfer Plotus Assets(PlotusToken)', async function() {
        let plbalPlot = await plotTok.balanceOf(mcr.address);
        await plotTok.burnTokens(mcr.address, plbalPlot);
        await plotTok.transfer(mcr.address, 1000000000000);
        plbalPlot = await plotTok.balanceOf(mcr.address);
        let userbalPlot = await plotTok.balanceOf(newAB);
        let actionHash = encode(
          'transferAssets(address,address,uint256)',
          plotTok.address,
          newAB,
          1000000000000
        );
        let pId = await gv.getProposalLength();
        await gvProposal(
          18,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
        let plbalPlotAfter = await plotTok.balanceOf(mcr.address);
        let userbalPlotAfter = await plotTok.balanceOf(newAB);
        assert.equal(plbalPlot/1 - plbalPlotAfter/1, 1000000000000);
        assert.equal(userbalPlotAfter/1 - userbalPlot/1, 1000000000000);
      });

      it('Should not allow create a proposal in category raiseDispute directly', async function() {
        let p = await gv.getProposalLength();
        await gv.createProposal("proposal", "proposal", "proposal", 0);
        await assertRevert(gv.categorizeProposal(p, 9, 0));
      });
      
      it('Should Whitelist sponsor', async function() {

        let actionHash = encode(
          'whitelistSponsor(address)',
          newAB
        );
        await gvProposal(
          21,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
        assert.equal(await ms.whitelistedSponsor(newAB), true);
      });

      it('Should create a proposal with category of no action', async function() {

        let actionHash = encode(
          null
        );
        let p = await gv.getProposalLength();
        await gv.createProposal("proposal", "proposal", "proposal", 0);
        let canClose = await gv.canCloseProposal(p);
        assert.equal(parseFloat(canClose),0);
        await gv.categorizeProposal(p, 22, 0);
        await assertRevert(gv.submitProposalWithSolution(p, "proposal", "0x1234"));
        await gv.submitProposalWithSolution(p, "proposal", actionHash);
        await gv.submitVote(p, 1);
        await increaseTime(604800);
        await gv.closeProposal(p);
        let proposal = await gv.proposal(p);
        assert.equal(proposal[2].toNumber(), 3);
      });

      it('Should Swap AB Member', async function() {

        assert.equal(await mr.checkRole(newAB, 1), false);
        assert.equal(await mr.checkRole(ab1, 1), true);
        let actionHash = encode(
          'swapABMember(address,address)',
          newAB,
          ab1
        );
        await gvProposal(
          11,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0, true
        );
        assert.equal(await mr.checkRole(ab1, 1), false);
        assert.equal(await mr.checkRole(newAB, 1), true);
      });

      // it('Should Swap AB Member without whitelisting proposal', async function() {

      //   assert.equal(await mr.checkRole(newAB, 1), true);
      //   assert.equal(await mr.checkRole(ab1, 1), false);
      //   let actionHash = encode(
      //     'swapABMember(address,address)',
      //     ab1,
      //     newAB
      //   );
      //   let proposalId = await gv.getProposalLength();
      //   await gv.createProposalwithSolution("Add new member", "Add new member", "hash", 11, "", actionHash)
      //   await gv.submitVote(proposalId/1, 1);
      //   await increaseTime(604810);
      //   await gv.closeProposal(proposalId/1);
      //   assert.equal(await mr.checkRole(ab1, 1), true);
      //   assert.equal(await mr.checkRole(newAB, 1), false);
      // });
    });

    after(async function () {
      await revertSnapshot(snapshotId);
    });

  }
);