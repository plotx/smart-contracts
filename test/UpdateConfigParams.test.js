const Governance = artifacts.require('Governance');
const ProposalCategory = artifacts.require('ProposalCategory');
const MemberRoles = artifacts.require('MemberRoles');
const Master = artifacts.require('Master');
const TokenController = artifacts.require('TokenController');
const Plotus = artifacts.require("MarketRegistry");
const MarketConfig = artifacts.require('MarketUtility');
const PlotusToken = artifacts.require("MockPLOT");
const MockUniswapFactory = artifacts.require('MockUniswapFactory');
const MockchainLink = artifacts.require('MockChainLinkAggregator');
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
      pl = await Plotus.at(await ms.getLatestAddress(toHex('PL')));
      marketConfig = await MarketConfig.at(await pl.marketUtility());
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

      it('Should update STAKE WEIGHTAGE', async function() {
        await updateParameter(20, 2, 'SW', pl, 'configUint', 60);
        let configData = await marketConfig.getPriceCalculationParams(feedInstance.address, true);
        assert.equal(configData[0], 60, 'Not updated');
      });

      it('Should not update STAKE WEIGHTAGE if passed value > 100', async function() {
        await updateParameter(20, 2, 'SW', pl, 'configUint', 200);
        let configData = await marketConfig.getPriceCalculationParams(feedInstance.address, true);
        assert.notEqual(configData[0], 200, 'updated');
      });

      it('Should update STAKE WEIGHTAGE MIN AMOUNT', async function() {
        await updateParameter(20, 2, 'SWMA', pl, 'configUint', toWei(100));
        let configData = await marketConfig.getPriceCalculationParams(feedInstance.address, true);
        assert.equal(configData[1], toWei(100), 'Not updated');
      });

      it('Should update Min Time Elapsed Divisor', async function() {
        await updateParameter(20, 2, 'MTED', pl, 'configUint', toWei(10));
        let configData = await marketConfig.getPriceCalculationParams(feedInstance.address, true);
        assert.equal(configData[3], toWei(10), 'Not updated');
      });

      it('Should update Min Bet', async function() {
        await updateParameter(20, 2, 'MINBET', pl, 'configUint', toWei(120));
        let configData = await marketConfig.getBasicMarketDetails();
        assert.equal(configData[0], toWei(120), 'Not updated');
      });

      it('Should update Position Decimals', async function() {
        await updateParameter(20, 2, 'PDEC', pl, 'configUint', 19);
        let configData = await marketConfig.getBasicMarketDetails();
        assert.equal(configData[3], 19, 'Not updated');
      });

      it('Should update Lot Purchase Perc', async function() {
        await updateParameter(20, 2, 'PPPERC', pl, 'configUint', 90);
        let configData = await marketConfig.getPurchasePercAndDeadline();
        assert.equal(configData[0], 90, 'Not updated');
      });

      it('Should not update Lot Purchase Perc if value is more than 99', async function() {
        await updateParameter(20, 2, 'PPPERC', pl, 'configUint', 101);
        let configData = await marketConfig.getPurchasePercAndDeadline();
        assert.notEqual(configData[0], 101, 'updated');
      });

      it('Should update Price Step', async function() {
        await updateParameter(20, 2, 'PSTEP', pl, 'configUint', 20);
        let configData = await marketConfig.getBasicMarketDetails();
        assert.equal(configData[2], 20, 'Not updated');
      });

      it('Should update Rate', async function() {
        await updateParameter(20, 2, 'RATE', pl, 'configUint', 21);
        let configData = await marketConfig.getMarketInitialParams();
        assert.equal(configData[2], 21, 'Not updated');
      });

      it('Should update Min Stake For Multiplier', async function() {
        await updateParameter(20, 2, 'MINSTM', pl, 'configUint', 23);
        let configData = await marketConfig.getValueAndMultiplierParameters(pl.address, 10);
        assert.equal(configData[0], 23, 'Not updated');
      });

      it('Should update Loss Percentage', async function() {
        await updateParameter(20, 2, 'LPERC', pl, 'configUint', 24);
        let configData = await marketConfig.getBasicMarketDetails();
        assert.equal(configData[1], 24, 'Not updated');
      });

      it('Should update Uniswap Deadline', async function() {
        await updateParameter(20, 2, 'UNIDL', pl, 'configUint', 25);
        let configData = await marketConfig.getPurchasePercAndDeadline();
        assert.equal(configData[1], 25, 'Not updated');
      });

      it('Should update Token Stake For Dispute', async function() {
        await updateParameter(20, 2, 'TSDISP', pl, 'configUint', 26);
        let configData = await marketConfig.getDisputeResolutionParams();
        assert.equal(configData, 26, 'Not updated');
      });

      it('Should update Market Cool Down Time', async function() {
        await updateParameter(20, 2, 'CDTIME', pl, 'configUint', 27);
        let configData = await marketConfig.getMarketInitialParams();
        assert.equal(configData[1], 27, 'Not updated');
      });

      it('Should update Eth commission percent', async function() {
        await updateParameter(20, 2, 'ETHCOM', pl, 'configUint', 20);
        let configData = await marketConfig.getMarketInitialParams();
        assert.equal(configData[3]/1, 20, 'Not updated');
      });

      it('Should not update Eth commission percent, if invalid percent is passed', async function() {
        await updateParameter(20, 2, 'ETHCOM', pl, 'configUint', 140001);
        let configData = await marketConfig.getMarketInitialParams();
        assert.notEqual(configData[3]/1, 140001, 'Not updated');
      });

      it('Should update PLOT commission percen', async function() {
        await updateParameter(20, 2, 'PLOTCOM', pl, 'configUint', 30);
        let configData = await marketConfig.getMarketInitialParams();
        assert.equal(configData[4]/1, 30, 'Not updated');
      });

      it('Should not update PLOT commission percent, if invalid percent is passed', async function() {
        await updateParameter(20, 2, 'PLOTCOM', pl, 'configUint', 100000);
        let configData = await marketConfig.getMarketInitialParams();
        assert.notEqual(configData[4]/1, 100000, 'Not updated');
      });

      it('Should not update if invalid code is passed', async function() {
        await updateParameter(20, 2, 'CDTIM1', pl, 'configUint', 28);
      });

      it('Should update Chain Link Price Oracle', async function() {
        await updateParameter(21, 2, 'CLORCLE', pl, 'configAddress', pl.address);
        let configData = await marketConfig.getFeedAddresses();
        assert.equal(configData[0], pl.address, 'Not updated');
      });

      it('Should update Uniswap Router', async function() {
        await updateParameter(21, 2, 'UNIRTR', pl, 'configAddress', pl.address);
        let configData = await marketConfig.getETHtoTokenRouterAndPath();
        assert.equal(configData[0], pl.address, 'Not updated');
      });

      it('Should update Uniswap Factory', async function() {
        let uniswapFactory = await MockUniswapFactory.new();
        await updateParameter(21, 2, 'UNIFAC', pl, 'configAddress', uniswapFactory.address);
        let configData = await marketConfig.getFeedAddresses();
        assert.equal(configData[1], uniswapFactory.address, 'Not updated');
      });

      it('Should Add new incentive token', async function() {
        let newToken = await PlotusToken.new(30000000000);
        await updateParameter(21, 2, 'INCTOK', pl, 'configAddress', newToken.address);
        let configData = await marketConfig.getMarketInitialParams();
        assert.equal(configData[0][configData[0].length-1], newToken.address, 'Not updated');
      });

      it('Should not update if invalid code is passed', async function() {
        await updateParameter(21, 2, 'CDTIM1', pl, 'configAddress', pl.address);
      });

    });
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