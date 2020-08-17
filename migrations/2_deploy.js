const Master = artifacts.require('Master');
const Plotus = artifacts.require('Plotus');
const Governance = artifacts.require('Governance');
const ProposalCategory = artifacts.require('ProposalCategory');
const MemberRoles = artifacts.require('MemberRoles');
const PlotusToken = artifacts.require('PlotusToken');
const TokenController = artifacts.require('TokenController');
const BLOT = artifacts.require('BLOT');
const MarketConfig = artifacts.require('MarketConfig');
const Market = artifacts.require('Market');
const MockchainLinkBTC = artifacts.require('MockChainLinkBTC');
const UniswapFactory = artifacts.require('MockUniswapFactory');
const BN = web3.utils.BN;

module.exports = function(deployer, network, accounts){
  deployer.then(async () => {
      
      let deployPlotus = await deployer.deploy(Plotus);
      let deployGovernance = await deployer.deploy(Governance);
      let deployProposalCategory = await deployer.deploy(ProposalCategory);
      let deployMemberRoles = await deployer.deploy(MemberRoles);
      let deployTokenController = await deployer.deploy(TokenController);
      let deployMarket = await deployer.deploy(Market);
      let deployPlotusToken = await deployer.deploy(PlotusToken);
      let mockchainLinkBTC = await deployer.deploy(MockchainLinkBTC);
      let uniswapFactory = await deployer.deploy(UniswapFactory);
      let marketConfig = await deployer.deploy(MarketConfig, [15*3600, '1000000000000000000',50,20,'100000000000000','100000000000000'],[accounts[0], mockchainLinkBTC.address, uniswapFactory.address]);

      let master = await deployer.deploy(Master);
      let implementations = [deployMemberRoles.address, deployProposalCategory.address, deployGovernance.address, deployPlotus.address, deployTokenController.address];
      await master.initiateMaster(implementations, deployPlotusToken.address, marketConfig.address);

      // let plotusAddress = await deployMaster.plotusAddress();
      // let plotus = await Plotus.at(plotusAddress);
      let plotusToken = await PlotusToken.at(deployPlotusToken.address);
      let tc = await TokenController.at(await master.getLatestAddress("0x5443"));
      await tc.changeDependentContractAddress();
      await plotusToken.changeOperator(await master.getLatestAddress("0x5443"));
  });
};

