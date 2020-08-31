const Master = artifacts.require('Master');
const Plotus = artifacts.require('MockPlotus');
const Governance = artifacts.require('Governance');
const ProposalCategory = artifacts.require('ProposalCategory');
const MemberRoles = artifacts.require('MemberRoles');
const PlotusToken = artifacts.require('MockPLOT');
const TokenController = artifacts.require('MockTokenController');
const BLOT = artifacts.require('BLOT');
const MarketConfig = artifacts.require('MockConfig');
const Market = artifacts.require('MockMarket');
const MockchainLink = artifacts.require('MockChainLinkAggregator');
const MockUniswapRouter = artifacts.require('MockUniswapRouter');
const MockUniswapFactory = artifacts.require('MockUniswapFactory');
const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const BN = web3.utils.BN;

module.exports = function(deployer, network, accounts){
  deployer.then(async () => {
      
      let deployPlotus = await deployer.deploy(Plotus);
      let deployGovernance = await deployer.deploy(Governance);
      let deployProposalCategory = await deployer.deploy(ProposalCategory);
      let deployMemberRoles = await deployer.deploy(MemberRoles);
      let deployTokenController = await deployer.deploy(TokenController);
      let deployMarket = await deployer.deploy(Market);
      let deployPlotusToken = await deployer.deploy(PlotusToken, "30000000000000000000000000");
      let mockchainLinkAggregaror = await deployer.deploy(MockchainLink);
      let uniswapRouter = await deployer.deploy(MockUniswapRouter, deployPlotusToken.address);
      let uniswapFactory = await deployer.deploy(MockUniswapFactory);
      let marketConfig = await deployer.deploy(MarketConfig);
      let plotusToken = await PlotusToken.at(deployPlotusToken.address);
      let blotToken = await deployer.deploy(BLOT);
      let masterProxy = await deployer.deploy(Master);
      let master = await deployer.deploy(OwnedUpgradeabilityProxy, masterProxy.address);
      master = await Master.at(master.address);
      let implementations = [deployMemberRoles.address, deployProposalCategory.address, deployGovernance.address, deployPlotus.address, deployTokenController.address, blotToken.address];
      await master.initiateMaster(implementations, deployMarket.address, deployPlotusToken.address, accounts[0], marketConfig.address, [mockchainLinkAggregaror.address, uniswapRouter.address, deployPlotusToken.address, uniswapFactory.address]);

      let tc = await TokenController.at(await master.getLatestAddress("0x5443"));
      let gvAddress = await master.getLatestAddress(web3.utils.toHex("GV"));
      master = await OwnedUpgradeabilityProxy.at(master.address);
      await master.transferProxyOwnership(gvAddress);
      master = await Master.at(master.address);
      await plotusToken.changeOperator(await master.getLatestAddress("0x5443"));
      // await blotToken.changeOperator(await master.getLatestAddress("0x5443"));
      let plotusAddress = await master.getLatestAddress(web3.utils.toHex("PL"));
      let plotus = await Plotus.at(plotusAddress);
      var date = Date.now();
      date = Math.round(date/1000) + 10000
      await plotus.addInitialMarketTypesAndStart(date, mockchainLinkAggregaror.address, plotusToken.address);
      let pc = await ProposalCategory.at(await master.getLatestAddress(web3.utils.toHex("PC")));
      let mr = await MemberRoles.at(await master.getLatestAddress(web3.utils.toHex("MR")));
      await mr.memberRolesInitiate(accounts[0]);
      console.log(await mr.checkRole(accounts[0], 1));
      await pc.proposalCategoryInitiate();
      console.log(await plotus.getOpenMarkets());
      await plotusToken.transfer(uniswapRouter.address, "100000000000000000000");
  });
};

