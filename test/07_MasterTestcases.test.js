const Master = artifacts.require('Master');
const MemberRoles = artifacts.require('MemberRoles');
const Governance = artifacts.require('Governance');
const ProposalCategory = artifacts.require('ProposalCategory');
const TokenController = artifacts.require("MockTokenController");
const Plotus = artifacts.require("MockMarketRegistry");
const PlotusToken = artifacts.require("MockPLOT");
const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const NewProxyInternalContract = artifacts.require('NewProxyInternalContract');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const {ether, toHex, toWei} = require('./utils/ethTools');
const {increaseTime, duration} = require('./utils/increaseTime');
const {assertRevert} = require('./utils/assertRevert');
const gvProp = require('./utils/gvProposal.js').gvProposalWithIncentiveViaTokenHolder;
const encode = require('./utils/encoder.js').encode;
const encode1 = require('./utils/encoder.js').encode1;
const { takeSnapshot, revertSnapshot } = require('./utils/snapshot');

const BN = web3.utils.BN;


let ms;
let tc;
let addr = [];
let memberRoles;
let gov;
let propCat;
let nxmMas;
let pl;
let plotTok;
let snapshotId;

contract('Master', function(accounts) {

  const [owner, newOwner, govVoter4] = accounts;

  before(async function() {

    snapshotId = await takeSnapshot();
    plotTok = await PlotusToken.deployed();
    ms = await OwnedUpgradeabilityProxy.deployed();
    ms = await Master.at(ms.address);
    tc = await TokenController.at(await ms.getLatestAddress(toHex('TC')));
    propCat = await ProposalCategory.at(await ms.getLatestAddress(toHex('PC')));
    memberRoles = await MemberRoles.at(await ms.getLatestAddress(toHex('MR')));
    gov = await Governance.at(await ms.getLatestAddress(toHex('GV')));
    pl = await Plotus.at(await ms.getLatestAddress(toHex('PL')));

  });

  describe('Update master address', function() {
    it('Update master address', async function() {
      let newMaster = await Master.new();
      let actionHash = encode1(['address'], [newMaster.address]);
      await gvProp(
        8,
        actionHash,
        await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
        gov,
        2,
        0
      );
      let implInc = await OwnedUpgradeabilityProxy.at(ms.address);
      assert.equal(await implInc.implementation(), newMaster.address);
    });

    it('Create a sample proposal after updating master', async function() {
      let actionHash = encode(
        'updateUintParameters(bytes8,uint256)',
        toHex('MAXDRFT'),
        7
      );
      await gvProp(
        13,
        actionHash,
        await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
        gov,
        2,
        0
      );
      assert.equal(
        (await gov.getUintParameters(toHex('MAXDRFT')))[1].toNumber(),
        7
      );
    });

    it('Sending funds to funds to PL', async function() {
      await pl.sendTransaction({from: owner, value: toWei(10)});
      await plotTok.transfer(pl.address, toWei(1));
      await plotTok.transfer(tc.address, toWei(1));
    });


    it('Upgrade multiple contract implemenations', async function() {
      oldGv = await Governance.at(await ms.getLatestAddress(toHex('GV')));
      oldMR = await MemberRoles.at(await ms.getLatestAddress(toHex('MR')));
      oldTC = await TokenController.at(
        await ms.getLatestAddress(toHex('TC'))
      );
      oldPC = await ProposalCategory.at(
        await ms.getLatestAddress(toHex('PC'))
      );
      oldPL = await Plotus.at(
        await ms.getLatestAddress(toHex('PL'))
      );
      let tcbalPlot = await plotTok.balanceOf(
        await ms.getLatestAddress(toHex('TC'))
      );
      let plbalPlot = await plotTok.balanceOf(
        await ms.getLatestAddress(toHex('PL'))
      );
      let plbalEth = await web3.eth.getBalance(pl.address);
      let proposalDetails = await oldGv.proposal(1);
      let totalSupply = await oldTC.totalSupply();
      let catDetails = await oldPC.category(5);
      let members = await oldMR.members(2);
      let openMarkets = await oldPL.getOpenMarkets();
      let catId = 7;
      let newPlotus = await Plotus.new();
      await increaseTime(100);
      let newGV = await Governance.new();
      let newPC = await ProposalCategory.new();
      let newMR = await MemberRoles.new();
      let newTC = await TokenController.new();
      actionHash = encode1(
        ['bytes2[]', 'address[]'],
        [
          [toHex('GV'), toHex('PC'), toHex('MR'), toHex('TC'), toHex('PL')],
          [newGV.address, newPC.address, newMR.address, newTC.address, newPlotus.address]
        ]
      );

      await gvProp(
        catId,
        actionHash,
        await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
        await Governance.at(await ms.getLatestAddress(toHex('GV'))),
        2,
        0
      );

      let oldGVImpl = await OwnedUpgradeabilityProxy.at(
        await ms.getLatestAddress(toHex('GV'))
      );
      let oldPCImpl = await OwnedUpgradeabilityProxy.at(
        await ms.getLatestAddress(toHex('PC'))
      );
      let oldMRImpl = await OwnedUpgradeabilityProxy.at(
        await ms.getLatestAddress(toHex('MR'))
      );
      let oldTCImpl = await OwnedUpgradeabilityProxy.at(
        await ms.getLatestAddress(toHex('TC'))
      );
      let oldPLImpl = await OwnedUpgradeabilityProxy.at(
        await ms.getLatestAddress(toHex('PL'))
      );

      // Checking Upgraded Contract addresses
      assert.equal(newGV.address, await oldGVImpl.implementation());
      assert.equal(newPC.address, await oldPCImpl.implementation());
      assert.equal(newMR.address, await oldMRImpl.implementation());
      assert.equal(newTC.address, await oldTCImpl.implementation());
      assert.equal(newPlotus.address, await oldPLImpl.implementation());
      oldGv = await Governance.at(await ms.getLatestAddress(toHex('GV')));
      oldMR = await MemberRoles.at(await ms.getLatestAddress(toHex('MR')));

      // Checking Master address in upgraded Contracts
      assert.equal(ms.address, await oldGv.ms());
      assert.equal(ms.address, await oldMR.masterAddress());
      assert.equal(ms.address, await oldTC.masterAddress());
      assert.equal(ms.address, await oldPC.masterAddress());
      assert.equal(ms.address, await oldPL.masterAddress());

      // Checking Funds transfer in upgraded Contracts
      assert.equal(
        (await plotTok.balanceOf(await ms.getLatestAddress(toHex('TC')))) / 1,
        tcbalPlot / 1
      );

      assert.equal(
        (await plotTok.balanceOf(await ms.getLatestAddress(toHex('PL')))) / 1,
        plbalPlot / 1
      );

      assert.equal((await web3.eth.getBalance(pl.address)) / 1, plbalEth / 1);

      // Checking getters in upgraded Contracts
      assert.equal(
        (await oldGv.proposal(1)).toString(),
        proposalDetails.toString()
      );
      assert.equal((await oldMR.members(2)).toString(), members.toString());
      assert.equal((await oldTC.totalSupply()) / 1, totalSupply / 1);
      assert.equal((await oldPC.category(5)).toString(), catDetails.toString());
      assert.equal((await oldPL.getOpenMarkets()).toString(), openMarkets.toString());
    });
    it('Add new Proxy Internal contract', async function() {
      let nic = await NewProxyInternalContract.new();
      let CatId = await oldPC.totalCategories();
      // Creating proposal for adding new proxy internal contract
      actionHash = encode1(
        ['bytes2','address'],
        [toHex('NP'),
        nic.address]
      );

      await gvProp(
        9,
        actionHash,
        await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
        await Governance.at(await ms.getLatestAddress(toHex('GV'))),
        2,
        0
      );
      p1 = await oldGv.getProposalLength();
      let proxyINS = await OwnedUpgradeabilityProxy.at(
        await ms.getLatestAddress(toHex('NP'))
      );
      assert.equal(nic.address, await proxyINS.implementation());

      proxyINS = await NewProxyInternalContract.at(proxyINS.address);
      
      assert.equal(ms.address, await proxyINS.ms());
      assert.equal(await ms.isInternal(nic.address), false);
      assert.equal(await ms.isInternal(proxyINS.address), true);
      assert.notEqual(await tc.bit(), 200);
      await proxyINS.callDummyOnlyInternalFunction(200);
      assert.equal(await tc.bit(), 200);
    });
    it('Check if new master is updated properly', async function() {
      let tcProxy = await TokenController.at(
        await ms.getLatestAddress(toHex('TC'))
      );
      let mrProxy = await MemberRoles.at(
        await ms.getLatestAddress(toHex('MR'))
      );
      let catProxy = await ProposalCategory.at(
        await ms.getLatestAddress(toHex('PC'))
      );
      assert.equal(ms.address, await tcProxy.masterAddress());
      assert.equal(ms.address, await gov.ms());
      assert.equal(ms.address, await mrProxy.masterAddress());
      assert.equal(ms.address, await catProxy.masterAddress());
      assert.equal(ms.address, await pl.masterAddress());
    });
  });
  describe('Negative Test Cases', function() {
    it('Upgrade contract should revert if called directly', async function() {
      await assertRevert(
        ms.upgradeMultipleImplementations([toHex('GV')], [gov.address])
      );
    });
    it('Upgrade contract should revert if array length is different for contract code and address', async function() {
      actionHash = encode1(
        ['bytes2[]', 'address[]'],
        [
          [toHex('GV')],
          [gov.address, pl.address]
        ]
      );

      await gvProp(
        7,
        actionHash,
        await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
        await Governance.at(await ms.getLatestAddress(toHex('GV'))),
        2,
        0
      );
    });
    it('Add internal contract should revert if called directly', async function() {
      await assertRevert(
        ms.addNewContract(toHex('PS'), pl.address)
      );
    });
    it('Add internal contract should revert if new contract code already exist', async function() {
      actionHash = encode1(
        ['bytes2', 'address'],
        [
          toHex('GV'),
          gov.address
        ]
      );
      await gvProp(
        9,
        actionHash,
        await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
        await Governance.at(await ms.getLatestAddress(toHex('GV'))),
        2,
        0
      );
    });
    it('Add internal contract should revert if new contract address is null', async function() {
      actionHash = encode1(
        ['bytes2', 'address'],
        [
          toHex('PS'),
          ZERO_ADDRESS
        ]
      );
      await gvProp(
        9,
        actionHash,
        await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
        await Governance.at(await ms.getLatestAddress(toHex('GV'))),
        2,
        0
      );
    });
    it('Add internal contract should revert if new contract code is MS', async function() {
      actionHash = encode1(
        ['bytes2', 'address'],
        [
          toHex('MS'),
          gov.address
        ]
      );
      await gvProp(
        9,
        actionHash,
        await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
        await Governance.at(await ms.getLatestAddress(toHex('GV'))),
        2,
        0
      );
    });
    it('Upgrade contract implementation should revert if new address is null', async function() {
      oldGv = await Governance.at(await ms.getLatestAddress(toHex('GV')));
      oldMR = await MemberRoles.at(await ms.getLatestAddress(toHex('MR')));
      gvProxy = await OwnedUpgradeabilityProxy.at(
        await ms.getLatestAddress(toHex('GV'))
      );
      let gvImplementationAdd = await gvProxy.implementation();
      oldPC = await ProposalCategory.at(
        await ms.getLatestAddress(toHex('PC'))
      );

      let catId = 7;

      actionHash = encode1(
        ['bytes2[]', 'address[]'],
        [[toHex('GV')], [ZERO_ADDRESS]]
      );

      await gvProp(
        catId,
        actionHash,
        await MemberRoles.at(await ms.getLatestAddress(toHex('MR'))),
        await Governance.at(await ms.getLatestAddress(toHex('GV'))),
        2,
        0
      );
      assert.equal(
        gvImplementationAdd,
        await gvProxy.implementation()
      );
    });
    it('Should revert if caller is not proxyOwner', async function() {
      mas = await Master.new();
      mas = await OwnedUpgradeabilityProxy.new(mas.address);
      mas = await Master.at(mas.address);
      await assertRevert(
        mas.initiateMaster([], mas.address, mas.address, mas.address, [mas.address, mas.address, mas.address], mas.address, {from: newOwner})
      );
    });
    it('Should revert if length of implementation array and contract array are not same', async function() {
      await assertRevert(
        mas.initiateMaster([], mas.address, mas.address, mas.address, [mas.address, mas.address, mas.address], mas.address)
      );
    });
    it('Should revert if master already initiated', async function() {
      await assertRevert(
        ms.initiateMaster([], mas.address, mas.address, mas.address, [mas.address, mas.address, mas.address], mas.address)
      );
    });
  });

  after(async function () {
    await revertSnapshot(snapshotId);
  });

});