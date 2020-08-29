const Governance = artifacts.require('Governance');
const ProposalCategory = artifacts.require('ProposalCategory');
const MemberRoles = artifacts.require('MemberRoles');
const Master = artifacts.require('Master');
const TokenController = artifacts.require('TokenController');
const Plotus = artifacts.require("Plotus");
const MarketConfig = artifacts.require('MarketConfig');
const PlotusToken = artifacts.require("MockPLOT");
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

    const [ab1] = accounts;

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

    });

    async function updateParameter(
      cId,
      mrSequence,
      code,
      contractInst,
      type,
      proposedValue
    ) {
      code = toHex(code);
      let getterFunction;
      if (type == 'uint') {
        action = 'updateUintParameters(bytes8,uint)';
        getterFunction = 'getUintParameters';
      } else if (type == 'configAddress') {
        action = 'updateMarketConfig(address)';
        getterFunction = '';
      } else if (type == 'configUint') {
        action = 'updateConfigUintParameters(bytes8,uint256)';
        getterFunction = '';
      }

      let actionHash = encode(action, code, proposedValue);
      await gvProposal(cId, actionHash, mr, gv, mrSequence, 0);
      if (code == toHex('MASTADD')) {
        let newMaster = await NXMaster.at(proposedValue);
        contractInst = newMaster;
      }
      let parameter;
      if(type == 'uint') {
        parameter = await contractInst[getterFunction](code);
      }
      try {
        parameter[1] = parameter[1].toNumber();
      } catch (err) {}
      if(type == 'uint') {
        assert.equal(parameter[1], proposedValue, 'Not updated');
      }
    }
    async function updateInvalidParameter(
      cId,
      mrSequence,
      code,
      contractInst,
      type,
      proposedValue
    ) {
      code = toHex(code);
      let getterFunction;
      if (type == 'uint') {
        action = 'updateUintParameters(bytes8,uint)';
        getterFunction = 'getUintParameters';
      } else if (type == 'address') {
        action = 'updateAddressParameters(bytes8,address)';
        getterFunction = 'getAddressParameters';
      } else if (type == 'owner') {
        action = 'updateOwnerParameters(bytes8,address)';
        getterFunction = 'getOwnerParameters';
      }
      let actionHash = encode(action, code, proposedValue);
      await gvProposal(cId, actionHash, mr, gv, mrSequence, 0);
      if (code == toHex('MASTADD') && proposedValue != ZERO_ADDRESS) {
        let newMaster = await NXMaster.at(proposedValue);
        contractInst = newMaster;
      }
      let parameter = await contractInst[getterFunction](code);
      try {
        parameter[1] = parameter[1].toNumber();
      } catch (err) {}
      assert.notEqual(parameter[1], proposedValue);
    }



    // describe('Update Market uint Config Params', function() {
    //   it('Should update Stake Period', async function() {
    //     await updateParameter(20, 2, 'MINBET', pl, 'configUint', toWei(120));
    //     console.log("===");
    //     let configData = await marketConfig.getBasicMarketDetails();
    //     console.log("===");
    //     assert.equal(configData[0], toWei(120), 'Not updated');
        
    //   });
    //   // it('Should update Commission%', async function() {
    //   //   await updateParameter(21, 2, 'RACOMM', td, 'uint', '90');
    //   // });
    //   // it('Should update Max Commission%', async function() {
    //   //   await updateParameter(21, 2, 'RAMAXC', td, 'uint', '40');
    //   // });
    //   // it('Should update Extra CA Lock Period', async function() {
    //   //   await updateParameter(21, 2, 'CALOCKT', td, 'uint', '86400');
    //   // });
    //   // it('Should update Extra Member Lock Period', async function() {
    //   //   await updateParameter(21, 2, 'MVLOCKT', td, 'uint', '86400');
    //   // });
    //   // it('Should update Claim  Assessor Velocity', async function() {
    //   //   await updateParameter(21, 2, 'CABOOKT', td, 'uint', '7000');
    //   // });
    //   // it('Should update Membership joining fee', async function() {
    //   //   await updateParameter(21, 2, 'JOINFEE', td, 'uint', '6000000000000000');
    //   // });
    // });
    describe('Update Token Controller Parameters', function() {
      it('Should update Lock period for Stake multiplier', async function() {
        await updateParameter(14, 2, 'SMLP', tc, 'uint', '2');
      });
      it('Should update Burn Upto Limit', async function() {
        await updateParameter(14, 2, 'BRLIM', tc, 'uint', '2');
      });
      it('Should not update if parameter code is incorrect', async function() {
        await updateInvalidParameter(14, 2, 'EPTIM', tc, 'uint', '86400');
      });
    });  

    describe('Update Governance Parameters', function() {
      it('Should update Governance Token Holding Time', async function() {
        await updateParameter(13, 2, 'GOVHOLD', gv, 'uint', '86400');
      });
      it('Should update Max Followers limit', async function() {
        await updateParameter(13, 2, 'MAXFOL', gv, 'uint', '10');
      });
      it('Should update Max Draft time limit', async function() {
        await updateParameter(13, 2, 'MAXDRFT', gv, 'uint', '86400');
      });
      it('Should update Min Token Locked For DR', async function() {
        await updateParameter(13, 2, 'MINLOCDR', gv, 'uint', '123');
      });
      it('Should update Lock Time For DR', async function() {
        await updateParameter(13, 2, 'TLOCDR', gv, 'uint', '123');
      });
      it('Should update Action Reject Auth Role', async function() {
        await updateParameter(13, 2, 'REJAUTH', gv, 'uint', '123');
      });
      it('Should update Vote Perc Reject Action', async function() {
        await updateParameter(13, 2, 'REJCOUNT', gv, 'uint', '123');
      });
      it('Should not update if parameter code is incorrect', async function() {
        await updateInvalidParameter(13, 2, 'EPTIM', gv, 'uint', '86400');
      });
      it('Should update Action Waiting Time', async function() {
        await updateParameter(13, 2, 'ACWT', gv, 'uint', '123');
      });
    });

    after(async function () {
      await revertSnapshot(snapshotId);
    });

  }
);