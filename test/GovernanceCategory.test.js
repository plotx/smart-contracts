const Governance = artifacts.require('Governance');
const ProposalCategory = artifacts.require('ProposalCategory');
const MemberRoles = artifacts.require('MemberRoles');
const Master = artifacts.require('Master');
const TokenController = artifacts.require('TokenController');
const Plotus = artifacts.require("Plotus");
const MarketConfig = artifacts.require('MarketConfig');
const PlotusToken = artifacts.require("MockPLOT");
const Market = artifacts.require('MockMarket');
const DummyMockMarket = artifacts.require('DummyMockMarket');
const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const gvProposal = require('./utils/gvProposal.js').gvProposalWithIncentiveViaTokenHolder;
const encode = require('./utils/encoder.js').encode;
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
      marketConfig = await MarketConfig.at(await pl.marketConfig());
      plotTok = await PlotusToken.deployed();
      await pl.sendTransaction({from: ab1, value: toWei(100)});
      await plotTok.transfer(pl.address, toWei(20));

    });

    describe('Testing Governanace Test Cases', function() {
    
      it('Should Update Market Config', async function() {
        let params = [];
        params.push((await marketConfig.getFeedAddresses())[0]);
        params.push((await marketConfig.getETHtoTokenRouterAndPath())[0]);
        params.push(plotTok.address);
        params.push((await marketConfig.getFeedAddresses())[1]);
        let newMarketConfig = await MarketConfig.new(params);
        let actionHash = encode(
          'updateMarketConfigImplementation(address)',
          newMarketConfig.address
        );
        await gvProposal(
          21,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
        let proxyCon = await OwnedUpgradeabilityProxy.at(await pl.marketConfig());
        assert.equal(await proxyCon.implementation(), newMarketConfig.address);
      });

      it('Should Update Market Implementation', async function() {
        let newMaketImpl = await Market.new();
        let actionHash = encode(
          'updateMarketImplementation(address)',
          newMaketImpl.address
        );
        await gvProposal(
          5,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
        assert.equal(await pl.marketImplementation(), newMaketImpl.address);
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

      it('Transfer Plotus Assets(PlotusToken)', async function() {
        let plbalPlot = await plotTok.balanceOf(pl.address);
        let userbalPlot = await plotTok.balanceOf(newAB);
        let actionHash = encode(
          'transferAssets(address,address,uint256)',
          plotTok.address,
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
        let plbalPlotAfter = await plotTok.balanceOf(pl.address);
        let userbalPlotAfter = await plotTok.balanceOf(newAB);
        assert.equal(plbalPlot - plbalPlotAfter, toWei(10));
        assert.equal(userbalPlotAfter/1e18 - userbalPlot/1e18, 10);
      });

      it('Should not Change token operator if null address', async function() {

        let actionHash = encode(
          'changeOperator(address)',
          ZERO_ADDRESS
        );
        await gvProposal(
          23,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
        assert.notEqual(await plotTok.operator(), ZERO_ADDRESS);
      });

      it('Should Change token operator', async function() {

        let actionHash = encode(
          'changeOperator(address)',
          newAB
        );
        await gvProposal(
          23,
          actionHash,
          await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
          gv,
          2,
          0
        );
        assert.equal(await plotTok.operator(), newAB);
      });

      // it('Should Swap AB Member', async function() {

      //   assert.equal(await mr.checkRole(newAB, 1), false);
      //   assert.equal(await mr.checkRole(ab1, 1), true);
      //   let actionHash = encode(
      //     'swapABMember(address,address)',
      //     newAB,
      //     ab1
      //   );
      //   await gvProposal(
      //     12,
      //     actionHash,
      //     await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
      //     gv,
      //     2,
      //     0
      //   );
      //   assert.equal(await mr.checkRole(ab1, 1), false);
      //   assert.equal(await mr.checkRole(newAB, 1), true);
      // });
    });

    after(async function () {
      await revertSnapshot(snapshotId);
    });

  }
);