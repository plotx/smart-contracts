const Master = artifacts.require('Master');
const Plotus = artifacts.require('MockMarketRegistry');
const Governance = artifacts.require('MockGovernance');
const ProposalCategory = artifacts.require('ProposalCategory');
const AllMarkets = artifacts.require('MockAllMarkets');
const MarketCreationRewards = artifacts.require('MarketCreationRewards');
const MemberRoles = artifacts.require('MockMemberRoles');
const PlotusToken = artifacts.require('MockPLOT');
const MockWeth = artifacts.require('MockWeth');
const TokenController = artifacts.require('MockTokenController');
const BLOT = artifacts.require('BLOT');
const BLOTV2 = artifacts.require('BLOTV2');
const MarketConfig = artifacts.require('MockConfig');
const Market = artifacts.require('MockMarket');
const MarketBTC = artifacts.require('MockBTCMarket');
const MockchainLink = artifacts.require('MockChainLinkAggregator');
const MockchainLinkGas = artifacts.require('MockChainLinkGasPriceAgg');
const MockUniswapRouter = artifacts.require('MockUniswapRouter');
const MockUniswapFactory = artifacts.require('MockUniswapFactory');
const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const Vesting = artifacts.require('Vesting');
const { assert } = require("chai");
const encode1 = require('../test/utils/encoder.js').encode1;
const BN = web3.utils.BN;

module.exports = function(deployer, network, accounts){
  deployer.then(async () => {
      
      let deployPlotus = await deployer.deploy(Plotus);
      let deployGovernance = await deployer.deploy(Governance);
      let deployProposalCategory = await deployer.deploy(ProposalCategory);
      let deployMemberRoles = await deployer.deploy(MemberRoles);
      let deployMarket = await deployer.deploy(Market);
      let deployTokenController = await deployer.deploy(TokenController);
      let deployPlotusToken = await deployer.deploy(PlotusToken, "30000000000000000000000000", accounts[0]);
      let mockchainLinkAggregaror = await deployer.deploy(MockchainLink);
      let uniswapRouter = await deployer.deploy(MockUniswapRouter, deployPlotusToken.address);
      let uniswapFactory = await deployer.deploy(MockUniswapFactory);
      let marketConfig = await deployer.deploy(MarketConfig);
      let plotusToken = await PlotusToken.at(deployPlotusToken.address);
      let blotToken = await deployer.deploy(BLOT);
      let blotTokenV2 = await deployer.deploy(BLOTV2);
      let vestingContract = await deployer.deploy(Vesting, plotusToken.address, accounts[0]);
      let masterProxy = await deployer.deploy(Master);
      let master = await deployer.deploy(OwnedUpgradeabilityProxy, masterProxy.address);
      master = await Master.at(master.address);
      let implementations = [deployMemberRoles.address, deployProposalCategory.address, deployGovernance.address, deployPlotus.address, deployTokenController.address, blotToken.address];
      await master.initiateMaster(implementations, deployPlotusToken.address, accounts[0], marketConfig.address, [uniswapRouter.address, deployPlotusToken.address, uniswapFactory.address], vestingContract.address);
      let mockWeth = await deployer.deploy(MockWeth);
      let deployMarketBTC = await deployer.deploy(MarketBTC);
      let tc = await TokenController.at(await master.getLatestAddress("0x5443"));
      console.log(`Config: ${marketConfig.address}`);
      console.log(`Token: ${plotusToken.address}`);
      console.log(`TC: ${tc.address}`);
      let gvAddress = await master.getLatestAddress(web3.utils.toHex("GV"));
      master = await OwnedUpgradeabilityProxy.at(master.address);
      await master.transferProxyOwnership(gvAddress);
      master = await Master.at(master.address);
      await plotusToken.changeOperator(await master.getLatestAddress("0x5443"));
      // await blotToken.changeOperator(await master.getLatestAddress("0x5443"));
      let plotusAddress = await master.getLatestAddress(web3.utils.toHex("PL"));
      let plotus = await Plotus.at(plotusAddress);
      // await mockchainLinkAggregaror.setLatestAnswer(934999802346);
      var date = Date.now();
      date = Math.round(date/1000) + 10000
      let pc = await ProposalCategory.at(await master.getLatestAddress(web3.utils.toHex("PC")));
      let mr = await MemberRoles.at(await master.getLatestAddress(web3.utils.toHex("MR")));
      await mr.memberRolesInitiate([accounts[0]]);
      console.log(await mr.checkRole(accounts[0], 1));
      await pc.proposalCategoryInitiate();
      // console.log(await plotus.getOpenMarkets());
      await plotusToken.transfer(uniswapRouter.address, "100000000000000000000");
      await plotusToken.transfer(plotus.address, "10000000000000000000000");
      let allMarkets = await deployer.deploy(AllMarkets);
      let mcr = await deployer.deploy(MarketCreationRewards);
      let _marketUtility = await plotus.marketUtility();
      let mockchainLinkGas = await deployer.deploy(MockchainLinkGas);

      let gv = await Governance.at(gvAddress);
      // Creating proposal for adding new proxy internal contract
      let actionHash = encode1(
        ['bytes2','address'],
        [web3.utils.toHex('AM'),
        allMarkets.address]
      );

      let p = await gv.getProposalLength();
      await gv.createProposal("proposal", "proposal", "proposal", 0);
      let canClose = await gv.canCloseProposal(p);
      assert.equal(parseFloat(canClose),0);
      await gv.categorizeProposal(p, 9, 0);
      await gv.submitProposalWithSolution(p, "proposal", actionHash);
      await gv.submitVote(p, 1)
      await increaseTime(604800);
      await gv.closeProposal(p);
      await increaseTime(604800);
      await gv.triggerAction(p);

      actionHash = encode1(
        ['bytes2','address'],
        [web3.utils.toHex('MC'),
        mcr.address]
      );

      p = await gv.getProposalLength();
      await gv.createProposal("proposal", "proposal", "proposal", 0);
      canClose = await gv.canCloseProposal(p);
      assert.equal(parseFloat(canClose),0);
      await gv.categorizeProposal(p, 9, 0);
      await gv.submitProposalWithSolution(p, "proposal", actionHash);
      await gv.submitVote(p, 1)
      await increaseTime(604800);
      await gv.closeProposal(p);
      await increaseTime(604800);
      await gv.triggerAction(p);

      let allMarketsProxy = await OwnedUpgradeabilityProxy.at(
        await master.getLatestAddress(web3.utils.toHex('AM'))
      );
      assert.equal(allMarkets.address, await allMarketsProxy.implementation());

      let mcrProxy = await OwnedUpgradeabilityProxy.at(
        await master.getLatestAddress(web3.utils.toHex('MC'))
      );
      assert.equal(mcr.address, await mcrProxy.implementation());

      allMarkets = await AllMarkets.at(allMarketsProxy.address);
      mcr = await MarketCreationRewards.at(mcrProxy.address);

      assert.equal(await master.isInternal(allMarkets.address), true);
      assert.equal(await master.isInternal(mcr.address), true);
      await mcr.initialise(_marketUtility, mockchainLinkGas.address)
      await allMarkets.addInitialMarketTypesAndStart(mcr.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", _marketUtility, date, mockchainLinkAggregaror.address, mockchainLinkAggregaror.address);

      date = (await web3.eth.getBlock('latest')).timestamp + 10000;
      let hash = await plotus.addInitialMarketTypesAndStart(date, deployMarket.address, deployMarketBTC.address);
      console.log(hash.receipt.gasUsed);
  });
};

function increaseTime(duration) {
  const id = Date.now();

  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [duration],
        id: id
      },
      err1 => {
        if (err1) return reject(err1);

        web3.currentProvider.send(
          {
            jsonrpc: '2.0',
            method: 'evm_mine',
            id: id + 1
          },
          (err2, res) => {
            return err2 ? reject(err2) : resolve(res);
          }
        );
      }
    );
  });
}
