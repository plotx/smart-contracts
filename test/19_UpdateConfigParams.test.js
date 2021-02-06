const Governance = artifacts.require('Governance');
const ProposalCategory = artifacts.require('ProposalCategory');
const MemberRoles = artifacts.require('MemberRoles');
const Master = artifacts.require('Master');
const TokenController = artifacts.require('TokenController');
const MarketConfig = artifacts.require('MarketUtility');
const AllMarkets = artifacts.require('AllMarkets');
const PlotusToken = artifacts.require("MockPLOT");
const MockchainLink = artifacts.require('MockChainLinkAggregator');
const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const gvProposal = require('./utils/gvProposal.js').gvProposalWithIncentiveViaTokenHolder;
const encode = require('./utils/encoder.js').encode;
const assertRevert = require("./utils/assertRevert").assertRevert;
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
let feedInstance;
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
      allMarkets = await AllMarkets.at(await ms.getLatestAddress(toHex('AM')));
      marketConfig = await MarketConfig.at(await ms.getLatestAddress(toHex('MU')));
      plotTok = await PlotusToken.deployed();
      feedInstance = await MockchainLink.deployed()

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
        action = 'updateConfigAddressParameters(bytes8,address)';
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



    describe('Update Market Config Params', function() {

      it('Should update Min PredictionAmount', async function() {
        await updateParameter(24, 2, 'MINPRD', marketConfig, 'configUint', 75);
        let configData = await marketConfig.getBasicMarketDetails();
        assert.equal(configData[0], 75, 'Not updated');
      });

      it('Should update Max PredictionAmount', async function() {
        await updateParameter(24, 2, 'MAXPRD', marketConfig, 'configUint', 80);
        let configData = await marketConfig.getBasicMarketDetails();
        assert.equal(configData[2]/1, 80, 'Not updated');
      });

      it('Should update Position Decimals', async function() {
        await updateParameter(24, 2, 'PDEC', marketConfig, 'configUint', 19);
        let configData = await marketConfig.getBasicMarketDetails();
        assert.equal(configData[1]/1, 19, 'Not updated');
      });

      it('Should update Token Stake For Dispute', async function() {
        await updateParameter(24, 2, 'TSDISP', pl, 'configUint', 26);
        let configData = await marketConfig.getDisputeResolutionParams();
        assert.equal(configData, 26, 'Not updated');
      });

      it('Should update Min Stake For Multiplier', async function() {
        await updateParameter(24, 2, 'SFMS', marketConfig, 'configUint', 23);
        let configData = await marketConfig.getPriceCalculationParams();
        assert.equal(configData[0], 23, 'Not updated');
      });

      it('Should Staking Factor Weightage and Current Price weightage', async function() {
        await updateParameter(24, 2, 'SFCPW', marketConfig, 'configUint', 24);
        let configData = await marketConfig.getPriceCalculationParams();
        assert.equal(configData[1], 24, 'Not updated');
        assert.equal(configData[2], 100-24, 'Not updated');
      });

      it('Should not update if invalid code is passed', async function() {
        await updateParameter(24, 2, 'CDTIM1', pl, 'configUint', 28);
      });

      it('Should not allow to update if unauthorized call', async function() {
        await assertRevert(marketConfig.updateUintParameters(toHex("UNIFAC"),100));
      });


    });
    describe('Update Token Controller Parameters', function() {
      it('Should update Lock period for Stake multiplier', async function() {
        await updateParameter(13, 2, 'SMLP', tc, 'uint', '2');
      });
      it('Should not update if parameter code is incorrect', async function() {
        await updateInvalidParameter(13, 2, 'EPTIM', tc, 'uint', '86400');
      });
    });

    describe('Update MemberRoles Parameters', function() {
      it('Should update Min Token Locked For DR', async function() {
        await updateParameter(20, 2, 'MNLOCKDR', mr, 'uint', '123');
      });
      it('Should update Lock Time For DR', async function() {
        await updateParameter(20, 2, 'TLOCDR', mr, 'uint', '123');
      });  
      it('Should not update if parameter code is incorrect', async function() {
        await updateInvalidParameter(20, 2, 'EPTIM', mr, 'uint', '86400');
      });
    }); 

    describe('Update Governance Parameters', function() {
      it('Should update Governance Token Holding Time', async function() {
        await updateParameter(12, 2, 'GOVHOLD', gv, 'uint', '86400');
      });
      it('Should update AB majority', async function() {
        await updateParameter(12, 2, 'ABMAJ', gv, 'uint', '20');
      });
      it('Should update Max Draft time limit', async function() {
        await updateParameter(12, 2, 'MAXDRFT', gv, 'uint', '3600');
      });
      // it('Should update Action Reject Auth Role', async function() {
      //   await updateParameter(12, 2, 'REJAUTH', gv, 'uint', '12');
      // });
      it('Should update DR quorum multiplier', async function() {
        await updateParameter(12, 2, 'DRQUMR', gv, 'uint', '35');
      });
      it('Should update members required to Reject action ', async function() {
        await updateParameter(12, 2, 'REJCOUNT', gv, 'uint', '19');
      });
      it('Should update max vote weigthage percent', async function() {
        await updateParameter(12, 2, 'MAXVW', gv, 'uint', '27');
      });  
      it('Should not update if parameter code is incorrect', async function() {
        await updateInvalidParameter(12, 2, 'EPTIM', gv, 'uint', '86400');
      });
      it('Should update Action Waiting Time', async function() {
        await updateParameter(12, 2, 'ACWT', gv, 'uint', '123');
      });
    });

    after(async function () {
      await revertSnapshot(snapshotId);
    });

  }
);