const Master = artifacts.require('Master');
const Governance = artifacts.require('MockGovernance');
const ProposalCategory = artifacts.require('ProposalCategory');
const AllMarkets = artifacts.require('MockAllMarkets');
const MarketCreationRewards = artifacts.require('MarketCreationRewards');
const MemberRoles = artifacts.require('MockMemberRoles');
const PlotusToken = artifacts.require('MockPLOT');
const TokenController = artifacts.require('MockTokenController');
const BLOT = artifacts.require('BLOT');
const MarketConfig = artifacts.require('MockConfig');
const MockchainLink = artifacts.require('MockChainLinkAggregator');
const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const Vesting = artifacts.require('Vesting');
const { assert } = require("chai");
const encode1 = require('../test/utils/encoder.js').encode1;
const BN = web3.utils.BN;

module.exports = function(deployer, network, accounts){
  deployer.then(async () => {
      
      let deployGovernance = await deployer.deploy(Governance);
      let deployProposalCategory = await deployer.deploy(ProposalCategory);
      let deployMemberRoles = await deployer.deploy(MemberRoles);
      let deployTokenController = await deployer.deploy(TokenController);
      let deployPlotusToken = await deployer.deploy(PlotusToken, "30000000000000000000000000", accounts[0]);
      let mockchainLinkAggregaror = await deployer.deploy(MockchainLink);
      let marketConfig = await deployer.deploy(MarketConfig);
      let plotusToken = await PlotusToken.at(deployPlotusToken.address);
      let blotToken = await deployer.deploy(BLOT);
      let vestingContract = await deployer.deploy(Vesting, plotusToken.address, accounts[0]);
      let masterProxy = await deployer.deploy(Master);
      let master = await deployer.deploy(OwnedUpgradeabilityProxy, masterProxy.address);
      let allMarkets = await deployer.deploy(AllMarkets);
      let mcr = await deployer.deploy(MarketCreationRewards);
      master = await Master.at(master.address);
      let implementations = [deployMemberRoles.address, deployProposalCategory.address, deployGovernance.address, deployTokenController.address, allMarkets.address, mcr.address, marketConfig.address, blotToken.address];
      await master.initiateMaster(implementations, deployPlotusToken.address, accounts[0], vestingContract.address);
      let tc = await TokenController.at(await master.getLatestAddress("0x5443"));
      let gvAddress = await master.getLatestAddress(web3.utils.toHex("GV"));
      master = await OwnedUpgradeabilityProxy.at(master.address);
      await master.transferProxyOwnership(gvAddress);
      master = await Master.at(master.address);
      await plotusToken.changeOperator(await master.getLatestAddress("0x5443"));
      var date = Date.now();
      date = Math.round(date/1000) + 10000
      let pc = await ProposalCategory.at(await master.getLatestAddress(web3.utils.toHex("PC")));
      let mr = await MemberRoles.at(await master.getLatestAddress(web3.utils.toHex("MR")));
      await mr.memberRolesInitiate([accounts[0]]);
      await pc.proposalCategoryInitiate();
      
      let _marketUtility = await master.getLatestAddress(web3.utils.toHex("MU"));


      let allMarketsProxy = await OwnedUpgradeabilityProxy.at(
        await master.getLatestAddress(web3.utils.toHex('AM'))
      );

      let mcrProxy = await OwnedUpgradeabilityProxy.at(
        await master.getLatestAddress(web3.utils.toHex('MC'))
      );

      allMarkets = await AllMarkets.at(allMarketsProxy.address);
      mcr = await MarketCreationRewards.at(mcrProxy.address);

      assert.equal(await master.isInternal(allMarkets.address), true);
      assert.equal(await master.isInternal(mcr.address), true);
      await mcr.initialise()
      await allMarkets.addInitialMarketTypesAndStart(mcr.address, _marketUtility, date, mockchainLinkAggregaror.address, mockchainLinkAggregaror.address);
  });
};
