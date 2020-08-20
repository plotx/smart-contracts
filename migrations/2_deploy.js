const Master = artifacts.require('Master');
const Plotus = artifacts.require('MockPlotus');
const Governance = artifacts.require('Governance');
const ProposalCategory = artifacts.require('ProposalCategory');
const MemberRoles = artifacts.require('MemberRoles');
const PlotusToken = artifacts.require('PlotusToken');
const TokenController = artifacts.require('MockTokenController');
const BLOT = artifacts.require('BLOT');
const MarketConfig = artifacts.require('MarketConfig');
const Market = artifacts.require('MockMarket');
const MockchainLink = artifacts.require('MockChainLinkAggregator');
const MockUniswapRouter = artifacts.require('MockUniswapRouter');
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
      let marketConfig = await deployer.deploy(MarketConfig, [15*3600, '1000000000000000000',50,20,'100000000000000','100000000000000000000'],[accounts[0], mockchainLinkAggregaror.address, uniswapRouter.address, deployPlotusToken.address]);

      let plotusToken = await PlotusToken.at(deployPlotusToken.address);
      let blotToken = await deployer.deploy(BLOT, plotusToken.address);
      let master = await deployer.deploy(Master);
      let implementations = [deployMemberRoles.address, deployProposalCategory.address, deployGovernance.address, deployPlotus.address, deployTokenController.address];
      await master.initiateMaster(implementations, deployMarket.address, deployPlotusToken.address, blotToken.address, marketConfig.address);

      let tc = await TokenController.at(await master.getLatestAddress("0x5443"));
      await tc.changeDependentContractAddress();
      await plotusToken.changeOperator(await master.getLatestAddress("0x5443"));
      await blotToken.changeOperator(await master.getLatestAddress("0x5443"));
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

