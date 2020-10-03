const Governance = artifacts.require('Governance');
const ProposalCategory = artifacts.require('ProposalCategory');
const MemberRoles = artifacts.require('MemberRoles');
const Master = artifacts.require('Master');
const TokenController = artifacts.require('TokenController');
const Plotus = artifacts.require("MarketRegistry");
const MarketConfig = artifacts.require('MarketUtility');
const PlotusToken = artifacts.require("MockPLOT");
const Market = artifacts.require('MockMarket');
const DummyMockMarket = artifacts.require('DummyMockMarket');
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
      pl = await Plotus.at(await ms.getLatestAddress(toHex('PL')));
      marketConfig = await MarketConfig.at(await pl.marketUtility());
      plotTok = await PlotusToken.deployed();
      await pl.sendTransaction({from: ab1, value: toWei(5)});
      await pl.sendTransaction({from: newAB, value: toWei(10)});
      await plotTok.transfer(pl.address, toWei(20));
      await plotTok.transfer(newAB, toWei(20));

    });

    describe('Testing Governanace Test Cases', function() {
      
      it('Should Not Update Market Config if zero address passed', async function() {
        let params = [];
        params.push((await marketConfig.getFeedAddresses())[0]);
        params.push((await marketConfig.getFeedAddresses())[0]);
        params.push(plotTok.address);
        let oldImplementation = await OwnedUpgradeabilityProxy.at(await pl.marketUtility());
        oldImplementation = await oldImplementation.implementation();
        let actionHash = encode(
          'upgradeContractImplementation(address,address)',
          marketConfig.address,
          0x0000000000000000000000000000000000000000
        );
        await gvProposal(
          6,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
        let proxyCon = await OwnedUpgradeabilityProxy.at(await pl.marketUtility());
        assert.equal(await proxyCon.implementation(), oldImplementation);
      });

      it('Should Update Market Config', async function() {
        let params = [];
        params.push((await marketConfig.getFeedAddresses())[0]);
        params.push((await marketConfig.getFeedAddresses())[0]);
        params.push(plotTok.address);
        params.push((await marketConfig.getFeedAddresses())[1]);
        let newMarketConfig = await MarketConfig.new(params);
        let actionHash = encode(
          'upgradeContractImplementation(address,address)',
          marketConfig.address,
          newMarketConfig.address
        );
        await gvProposal(
          6,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
        let proxyCon = await OwnedUpgradeabilityProxy.at(await pl.marketUtility());
        assert.equal(await proxyCon.implementation(), newMarketConfig.address);
      });

      it('Should Update Market Implementation', async function() {
        let newMaketImpl = await Market.new();
        let actionHash
        actionHash = encode1(
          ['uint256[]', 'address[]'],
          [
            [0,1],
            [newMaketImpl.address, newMaketImpl.address]
          ]
        );
        await gvProposal(
          5,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
      });

      it('Should Not Update Market Implementation of invalid paramters are passed', async function() {
        let newMaketImpl = await Market.new();
        let actionHash
        actionHash = encode1(
          ['uint256[]', 'address[]'],
          [
            [0],
            [newMaketImpl.address, newMaketImpl.address]
          ]
        );
        await gvProposal(
          5,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
      });

      it('Should Update Existing Markets Implementation', async function() {
        let newMarket = await DummyMockMarket.new();
        let existingMarkets = await pl.getOpenMarkets();
        let actionHash = encode(
          'upgradeContractImplementation(address,address)',
          existingMarkets[0][0],
          newMarket.address
        );
        await gvProposal(
          6,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
        let proxyCon = await OwnedUpgradeabilityProxy.at(existingMarkets[0][0]);
        assert.equal(await proxyCon.implementation(), newMarket.address);
        newMarket = await DummyMockMarket.at(existingMarkets[0][0]);
        assert.equal(await newMarket.dummyFunction(), 123);
      });

      it('Should Pause Market Creation', async function() {
        assert.equal(await pl.marketCreationPaused(), false);
        let actionHash = encode(
          'pauseMarketCreation()'
        );
        await gvProposal(
          17,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
        assert.equal(await pl.marketCreationPaused(), true);
      });

      it('Should stay Pause Market Creation if already paused', async function() {
        assert.equal(await pl.marketCreationPaused(), true);
        let actionHash = encode(
          'pauseMarketCreation()'
        );
        await gvProposal(
          17,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
        assert.equal(await pl.marketCreationPaused(), true);
      });

      it('Should Resume Market Creation', async function() {
        assert.equal(await pl.marketCreationPaused(), true);
        let actionHash = encode(
          'resumeMarketCreation()'
        );
        await gvProposal(
          18,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
        assert.equal(await pl.marketCreationPaused(), false);
      });

      it('Should stay Resume Market Creation if already resumed', async function() {
        assert.equal(await pl.marketCreationPaused(), false);
        let actionHash = encode(
          'resumeMarketCreation()'
        );
        await gvProposal(
          18,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
        assert.equal(await pl.marketCreationPaused(), false);
      });


      it('Transfer Plotus Assets(PlotusToken)', async function() {
        let plbalPlot = await plotTok.balanceOf(pl.address);
        await plotTok.burnTokens(pl.address, plbalPlot);
        await plotTok.transfer(pl.address, 1000000000000);
        plbalPlot = await plotTok.balanceOf(pl.address);
        let userbalPlot = await plotTok.balanceOf(newAB);
        let actionHash = encode(
          'transferAssets(address,address,uint256)',
          plotTok.address,
          newAB,
          1000000000000
        );
        let pId = await gv.getProposalLength();
        await gvProposal(
          19,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
        let plbalPlotAfter = await plotTok.balanceOf(pl.address);
        let userbalPlotAfter = await plotTok.balanceOf(newAB);
        assert.equal(plbalPlot/1 - plbalPlotAfter/1, 1000000000000);
        assert.equal(userbalPlotAfter/1 - userbalPlot/1, 1000000000000);
      });

      it('Transfer Plotus Assets(ETH)', async function() {
        let plbalEth = await web3.eth.getBalance(pl.address);
        let userbalEth = await web3.eth.getBalance(newAB);
        let actionHash = encode(
          'transferAssets(address,address,uint256)',
          "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
          newAB,
          toWei(10)
        );
        await gvProposal(
          19,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
        let plbalEthAfter = await web3.eth.getBalance(pl.address);
        let userbalEthAfter = await web3.eth.getBalance(newAB);
        assert.equal(plbalEth - plbalEthAfter, toWei(10));
        assert.equal(userbalEthAfter/1e18 - userbalEth/1e18, 10);
      });

      it('Should not allow create a proposal in category raiseDispute directly', async function() {
        let p = await gv.getProposalLength();
        await gv.createProposal("proposal", "proposal", "proposal", 0);
        await assertRevert(gv.categorizeProposal(p, 10, 0));
      });
      
      it('Should Whitelist sponsor', async function() {

        let actionHash = encode(
          'whitelistSponsor(address)',
          newAB
        );
        await gvProposal(
          22,
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
        await gv.categorizeProposal(p, 23, 0);
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
          12,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0, true
        );
        assert.equal(await mr.checkRole(ab1, 1), false);
        assert.equal(await mr.checkRole(newAB, 1), true);
      });

      it('Should Swap AB Member without whitelisting proposal', async function() {

        assert.equal(await mr.checkRole(newAB, 1), true);
        assert.equal(await mr.checkRole(ab1, 1), false);
        let actionHash = encode(
          'swapABMember(address,address)',
          ab1,
          newAB
        );
        let proposalId = await gv.getProposalLength();
        await gv.createProposalwithSolution("Add new member", "Add new member", "hash", 12, "", actionHash)
        await gv.submitVote(proposalId/1, 1);
        await increaseTime(604810);
        await gv.closeProposal(proposalId/1);
        assert.equal(await mr.checkRole(ab1, 1), true);
        assert.equal(await mr.checkRole(newAB, 1), false);
      });
    });

    after(async function () {
      await revertSnapshot(snapshotId);
    });

  }
);