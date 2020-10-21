const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("MarketRegistry");
const MarketRegistryNew = artifacts.require("MarketRegistryNew");
const MockChainLinkGasPriceAgg = artifacts.require("MockChainLinkGasPriceAgg");
const Master = artifacts.require("Master");
const MemberRoles = artifacts.require("MemberRoles");
const PlotusToken = artifacts.require("MockPLOT");
const MockWeth = artifacts.require("MockWeth");
const MarketUtility = artifacts.require("MarketUtility");
const MockConfig = artifacts.require("MockConfig");
const Governance = artifacts.require("Governance");
const MockUniswapRouter = artifacts.require("MockUniswapRouter");
const MockUniswapV2Pair = artifacts.require("MockUniswapV2Pair");
const MockUniswapFactory = artifacts.require('MockUniswapFactory');
const TokenController = artifacts.require("MockTokenController");
const web3 = Market.web3;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const assertRevert = require("./utils/assertRevert").assertRevert;
const latestTime = require("./utils/latestTime").latestTime;
const encode = require('./utils/encoder.js').encode;
const encode1 = require('./utils/encoder.js').encode1;
const {toHex, toWei, toChecksumAddress} = require('./utils/ethTools');
const gvProposal = require('./utils/gvProposal.js').gvProposalWithIncentiveViaTokenHolder;

var initialPLOTPrice;
var initialEthPrice;
var eventData;
var incentivesGained = 0;
const ethAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
var nullAddress = "0x0000000000000000000000000000";

contract("MarketUtility", async function([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10, user11, user12]) {
	let masterInstance,
		plotusToken,
		marketConfig,
		MockUniswapRouterInstance,
		tokenControllerAdd,
		tokenController,
		plotusNewAddress,
		plotusNewInstance, governance,
		mockUniswapV2Pair,
		mockUniswapFactory, weth,
    chainlinkGasAgg;
	before(async () => {
		masterInstance = await OwnedUpgradeabilityProxy.deployed();
		masterInstance = await Master.at(masterInstance.address);
		plotusToken = await PlotusToken.deployed();
		tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
		tokenController = await TokenController.at(tokenControllerAdd);
		plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
		memberRoles = await masterInstance.getLatestAddress(web3.utils.toHex("MR"));
		memberRoles = await MemberRoles.at(memberRoles);
		governance = await masterInstance.getLatestAddress(web3.utils.toHex("GV"));
		governance = await Governance.at(governance);
		MockUniswapRouterInstance = await MockUniswapRouter.deployed();
		mockUniswapFactory = await MockUniswapFactory.deployed();
		plotusNewInstance = await Plotus.at(plotusNewAddress);
		marketConfig = await plotusNewInstance.marketUtility();
		marketConfig = await MockConfig.at(marketConfig);
		weth = await MockWeth.deployed();
		await marketConfig.setWeth(weth.address);
	});

	  it('Should Update Existing Market utility Implementation', async function() {
        let newUtility = await MarketUtility.new();
        let existingMarkets = await plotusNewInstance.getOpenMarkets();
        let actionHash = encode(
          'upgradeContractImplementation(address,address)',
          marketConfig.address,
          newUtility.address
        );
        await gvProposal(
          6,
          actionHash,
          await MemberRoles.at(await masterInstance.getLatestAddress(toHex('MR'))),
          governance,
          2,
          0
        );
        await increaseTime(604800);
        marketConfig = await MarketUtility.at(marketConfig.address);
    });

    it("Deploy uniswap v2 pair and add liquidity", async function() {
    	mockUniswapV2Pair = await MockUniswapV2Pair.new();
    	await mockUniswapV2Pair.initialize(plotusToken.address, weth.address);
      	await weth.deposit({from: user12, value: toWei(10)});
    	await weth.transfer(mockUniswapV2Pair.address, toWei(10),{from: user12});
    	await plotusToken.transfer(mockUniswapV2Pair.address, toWei(1000));
    	initialPLOTPrice = 1000/10;
    	initialEthPrice = 10/1000;
    	await mockUniswapFactory.setPair(mockUniswapV2Pair.address);
    	await mockUniswapV2Pair.sync();
      await marketConfig.setInitialCummulativePrice();
    });

    it("Should create Markets", async function() {
    	await mockUniswapV2Pair.sync();
    	await increaseTime(3610);
    	await plotusNewInstance.createMarket(0,0);
    	await plotusNewInstance.createMarket(0,1);
    });

    it('Should Update Market Registry Implementation', async function() {
        let newRegistry = await MarketRegistryNew.new();
        let actionHash = encode1(
          ['bytes2[]', 'address[]'],
          [
            [toHex('PL')],
            [newRegistry.address]
          ]
        );
        await gvProposal(
          7,
          actionHash,
          await MemberRoles.at(await masterInstance.getLatestAddress(toHex('MR'))),
          governance,
          2,
          0
        );
        await increaseTime(604800);
        plotusNewInstance = await MarketRegistryNew.at(plotusNewInstance.address);
    });

    it("Should setup initial params for new regitsry", async function() {
      chainlinkGasAgg = await MockChainLinkGasPriceAgg.new();
      await assertRevert(plotusNewInstance.setGasPriceAggAndMaxGas(chainlinkGasAgg.address, {from:user2}));
      await plotusNewInstance.setGasPriceAggAndMaxGas(chainlinkGasAgg.address);
    });

    it("Should be able to claim market creation rewards of pre upgrade", async function() {
      let oldBalance = parseFloat(await plotusToken.balanceOf(user1));
      await plotusNewInstance.claimCreationReward();
      // await plotusNewInstance.claimCreationRewardV2();
      let newBalance = parseFloat(await plotusToken.balanceOf(user1));
      assert.isAbove(newBalance/1,oldBalance/1);
    });

    it("Should not be able to claim the market creation rewards if not created any market", async function() {
      let tx = await assertRevert(plotusNewInstance.claimCreationRewardV2());
    });

    it("Should create Markets", async function() {
      await chainlinkGasAgg.setLatestAnswer(45000000);
      await mockUniswapV2Pair.sync();
      await increaseTime(3610);
      let tx = await plotusNewInstance.createMarket(0,1, {gasPrice:30000000});
      // console.log(tx.receipt.gasUsed);
      eventData = tx.logs[2].args;
    });

    it("If gas is provided less than fastgas price from oracle, reward should be as per minimum of fast gas and provided gas", async function() {
      let gasUsed = eventData.gasUsed.toNumber();
      let gasPrice = await chainlinkGasAgg.latestAnswer();
      gasPrice = Math.min(30000000, gasPrice);
      estimatedGasCost = gasPrice*gasUsed;
      let costInETH = estimatedGasCost;
      // console.log(gasUsed);
      // console.log(costInETH);
      let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
      incentivesGained += eventData.plotIncentive/1; 
      assert.equal(eventData.plotIncentive/1, worthInPLOT[1]/1);
    });

    it("If gas is provided upto 125% of fast gas, reward should be as per provided gas", async function() {
      await increaseTime(3610);
      let tx = await plotusNewInstance.createMarket(0,1, {gasPrice:50000000});
      eventData = tx.logs[2].args;
      let gasUsed = eventData.gasUsed.toNumber();
      let gasPrice = 50000000;
      estimatedGasCost = gasPrice*gasUsed;
      let costInETH = estimatedGasCost;
      // console.log(gasUsed);
      // console.log(tx.receipt.gasUsed);
      // console.log(costInETH);
      let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
      incentivesGained += eventData.plotIncentive/1; 
      assert.equal(eventData.plotIncentive/1, worthInPLOT[1]/1)
    });

    it("If gas is provided more than 125% of fast gas, reward should be as per 125% fast gas", async function() {
      await increaseTime(3610);
      let tx = await plotusNewInstance.createMarket(0,1, {gasPrice:100000000});
      eventData = tx.logs[2].args;
      let gasUsed = eventData.gasUsed.toNumber();
      let gasPrice = 56250000;
      estimatedGasCost = gasPrice*gasUsed;
      let costInETH = estimatedGasCost;
      // console.log(gasUsed);
      // console.log(tx.receipt.gasUsed);
      // console.log(costInETH);
      let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
      incentivesGained += eventData.plotIncentive/1; 
      assert.equal(eventData.plotIncentive/1, worthInPLOT[1]/1)
    });

    it("If gas is provided more than 125% of fast gas and maxGas price, reward should be as per minimum of 125% of fast gas or max gasprice", async function() {
      await chainlinkGasAgg.setLatestAnswer(125000000);
      await increaseTime(3610);
      let tx = await plotusNewInstance.createMarket(0,1, {gasPrice:200000000});
      eventData = tx.logs[2].args;
      let gasUsed = eventData.gasUsed.toNumber();
      let maxGas = await plotusNewInstance.getUintParameters(toHex("MAXGAS"));
      let gasPrice = Math.min(maxGas[1].toNumber(), 125000000*1.25);
      estimatedGasCost = gasPrice*gasUsed;
      let costInETH = estimatedGasCost;
      // console.log(gasUsed);
      // console.log(tx.receipt.gasUsed);
      // console.log(costInETH);
      let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
      incentivesGained += eventData.plotIncentive/1; 
      assert.equal(eventData.plotIncentive/1, worthInPLOT[1]/1)
    });

    it("Should be able to claim the market creation rewards", async function() {
      let oldBalance = parseFloat(await plotusToken.balanceOf(user1));
      let tx = await plotusNewInstance.claimCreationRewardV2();
      let newBalance = parseFloat(await plotusToken.balanceOf(user1));
      // console.log(tx.logs[0].args);
      // console.log(newBalance);
      assert.equal((newBalance/1e18).toFixed(2), (oldBalance/1e18 + incentivesGained/1e18).toFixed(2));
    });
    
});
