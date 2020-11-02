const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Market = artifacts.require("MockMarket");
const MarketNew = artifacts.require("MarketNew");
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
      await gvProposal(cId, actionHash, memberRoles, governance, mrSequence, 0);
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
      await assertRevert(plotusNewInstance.setGasPriceAggAndMaxGas(chainlinkGasAgg.address, {from:user2}));
    });

    it('Should Update Market Implementations', async function() {
        let market1 = await MarketNew.new();
        let market2 = await MarketNew.new();
        let actionHash = encode1(
          ['uint256[]', 'address[]'],
          [
            [0,1],
            [market1.address, market2.address]
          ]
        );
        let proposalLength =(await governance.getProposalLength())/1;
        await gvProposal(
          5,
          actionHash,
          await MemberRoles.at(await masterInstance.getLatestAddress(toHex('MR'))),
          governance,
          2,
          0
        );
        assert.equal((await governance.proposalActionStatus(proposalLength))/1, 3)
        await increaseTime(604800);
    });

    it("Should be able to claim market creation rewards of pre upgrade", async function() {
      let oldBalance = parseFloat(await plotusToken.balanceOf(user1));
      await plotusNewInstance.claimCreationReward();
      let newBalance = parseFloat(await plotusToken.balanceOf(user1));
      assert.isAbove(newBalance/1,oldBalance/1);
    });

    it("Should not be able to claim the market creation rewards if not created any market", async function() {
      let tx = await assertRevert(plotusNewInstance.claimCreationRewardV2(100));
    });

    it("Should create Markets", async function() {
      await chainlinkGasAgg.setLatestAnswer(450000);
      await mockUniswapV2Pair.sync();
      await increaseTime(3610);
      let tx = await plotusNewInstance.createMarket(0,1, {gasPrice:300000});
      eventData = tx.logs[2].args;
    });

    it("If gas is provided less than fastgas price from oracle, reward should be as per minimum of fast gas and provided gas", async function() {
      let gasUsed = eventData.gasUsed.toNumber();
      let gasPrice = await chainlinkGasAgg.latestAnswer();
      gasPrice = Math.min(300000, gasPrice);
      estimatedGasCost = gasPrice*gasUsed;
      let costInETH = estimatedGasCost;
      let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
      incentivesGained += eventData.plotIncentive/1; 
      assert.equal(eventData.plotIncentive/1, worthInPLOT[1]/1);
    });

    it("If gas is provided upto 125% of fast gas, reward should be as per provided gas", async function() {
      await increaseTime(3610);
      let tx = await plotusNewInstance.createMarket(0,1, {gasPrice:500000});
      eventData = tx.logs[2].args;
      let gasUsed = eventData.gasUsed.toNumber();
      let gasPrice = 500000;
      estimatedGasCost = gasPrice*gasUsed;
      let costInETH = estimatedGasCost;
      let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
      incentivesGained += eventData.plotIncentive/1; 
      assert.equal(eventData.plotIncentive/1, worthInPLOT[1]/1)
    });

    it("If gas is provided more than 125% of fast gas, reward should be as per 125% fast gas", async function() {
      await increaseTime(3610);
      let tx = await plotusNewInstance.createMarket(0,1, {gasPrice:1000000});
      eventData = tx.logs[2].args;
      let gasUsed = eventData.gasUsed.toNumber();
      let gasPrice = 562500;
      estimatedGasCost = gasPrice*gasUsed;
      let costInETH = estimatedGasCost;
      let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
      incentivesGained += eventData.plotIncentive/1; 
      assert.equal(eventData.plotIncentive/1, worthInPLOT[1]/1)
    });

    it('Should update MAXGAS variable', async function() {
      await updateParameter(20, 2, 'MAXGAS', plotusNewInstance, 'configUint', 5000);
      let configData = await plotusNewInstance.getUintParameters(toHex('MAXGAS1'));
      assert.equal(configData[1], 0, 'Not updated');
      configData = await plotusNewInstance.getUintParameters(toHex('MAXGAS'));
      assert.equal(configData[1], 5000, 'Not updated');
    });

    it("If gas is provided more than 125% of fast gas and maxGas price, reward should be as per minimum of 125% of fast gas or max gasprice", async function() {
      await chainlinkGasAgg.setLatestAnswer(1250000);
      await increaseTime(3610);
      let tx = await plotusNewInstance.createMarket(0,1, {gasPrice:2000000});
      eventData = tx.logs[2].args;
      let gasUsed = eventData.gasUsed.toNumber();
      let maxGas = await plotusNewInstance.getUintParameters(toHex("MAXGAS"));
      let gasPrice = Math.min(maxGas[1].toNumber(), 1250000*1.25);
      estimatedGasCost = gasPrice*gasUsed;
      let costInETH = estimatedGasCost;
      let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
      incentivesGained += eventData.plotIncentive/1; 
      assert.equal(eventData.plotIncentive/1, worthInPLOT[1]/1)
    });

    it("Should be able to claim the market creation rewards", async function() {
      let oldBalance = parseFloat(await plotusToken.balanceOf(user1));
      let tx = await plotusNewInstance.claimCreationRewardV2(100);
      let newBalance = parseFloat(await plotusToken.balanceOf(user1));
      assert.equal((newBalance/1e18).toFixed(2), (oldBalance/1e18 + incentivesGained/1e18).toFixed(2));
    });

    it("Scenario 1: Should be able to get reward pool share of market", async function() {
      await chainlinkGasAgg.setLatestAnswer(450000);
      await increaseTime(3610);
      let tx = await plotusNewInstance.createMarket(0,1, {gasPrice:450000, from:user2});
      let openMarkets = await plotusNewInstance.getOpenMarkets();
      let marketInstance = await MarketNew.at(openMarkets[0][1]);
      await increaseTime(100);
      await marketInstance.placePrediction(ethAddress, "100000000000000000", 3, 5, {
        value: "100000000000000000",
        from: user7,
      });
      await plotusToken.transfer(user7, toWei(10000));
      await plotusToken.approve(tokenController.address, toWei(1000000000000000000), {from: user7});
      await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 3, 5, {
        from: user7,
      });
      let rewardPoolEth = 0.1;
      let rewardPoolPlot = 100;
      eventData = tx.logs[2].args;
      let gasUsed = eventData.gasUsed.toNumber();
      let maxGas = await plotusNewInstance.getUintParameters(toHex("MAXGAS"));
      let gasPrice = Math.min(maxGas[1].toNumber(), 450000*1.25);
      estimatedGasCost = gasPrice*gasUsed;
      let costInETH = estimatedGasCost;
      let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
      incentivesGained = eventData.plotIncentive/1; 
      let rewardPoolSharePerc = eventData.rewardPoolSharePerc;
      assert.equal(rewardPoolSharePerc/1, 100)
      assert.equal(eventData.plotIncentive/1, worthInPLOT[1]/1);
      await increaseTime(10000);
      await marketInstance.settleMarket();
      await increaseTime(10000);
      let oldBalance = parseFloat(await plotusToken.balanceOf(user2));
      let oldBalanceEth = parseFloat(await web3.eth.getBalance(user2));
      tx = await plotusNewInstance.claimCreationRewardV2(100, {from:user2});
      let newBalance = parseFloat(await plotusToken.balanceOf(user2));
      let newBalanceEth = parseFloat(await web3.eth.getBalance(user2));
      assert.equal((newBalance/1e18).toFixed(2), (oldBalance/1e18 + incentivesGained/1e18 + rewardPoolPlot/100).toFixed(2));
      assert.equal((newBalanceEth/1e18).toFixed(2), (oldBalanceEth/1e18 + rewardPoolEth/100).toFixed(2));
    });

    it("Scenario 2: Should be able to get more reward pool share of market if market creator had staked tokens", async function() {
      await plotusToken.transfer(user3, toWei(50000));
      await plotusToken.approve(tokenController.address, "1000000000000000000000000", { from: user3 });
      await tokenController.lock("0x534d", toWei(50000), 86400 * 30, { from: user3 });
      await chainlinkGasAgg.setLatestAnswer(450000);
      await increaseTime(3610);
      let tx = await plotusNewInstance.createMarket(0,1, {gasPrice:450000, from:user3});
      let openMarkets = await plotusNewInstance.getOpenMarkets();
      let marketInstance = await MarketNew.at(openMarkets[0][1]);
      await increaseTime(100);
      await marketInstance.placePrediction(ethAddress, "100000000000000000", 3, 5, {
        value: "100000000000000000",
        from: user12,
      });
      await plotusToken.transfer(user7, toWei(10000));
      await plotusToken.approve(tokenController.address, toWei(1000000000000000000), {from: user7});
      await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 3, 5, {
        from: user7,
      });
      let rewardPoolEth = 0.2;
      let rewardPoolPlot = 200;
      eventData = tx.logs[2].args;
      let gasUsed = eventData.gasUsed.toNumber();
      let maxGas = await plotusNewInstance.getUintParameters(toHex("MAXGAS"));
      let gasPrice = Math.min(maxGas[1].toNumber(), 450000*1.25);
      estimatedGasCost = gasPrice*gasUsed;
      let costInETH = estimatedGasCost;
      let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
      incentivesGained = eventData.plotIncentive/1; 
      let rewardPoolSharePerc = eventData.rewardPoolSharePerc;
      assert.equal(rewardPoolSharePerc/1, 200)
      assert.equal(eventData.plotIncentive/1, worthInPLOT[1]/1);
      await increaseTime(10000);
      await marketInstance.settleMarket();
      await increaseTime(10000);
      let oldBalance = parseFloat(await plotusToken.balanceOf(user3));
      let oldBalanceEth = parseFloat(await web3.eth.getBalance(user3));
      tx = await plotusNewInstance.claimCreationRewardV2(100, {from:user3});
      let newBalance = parseFloat(await plotusToken.balanceOf(user3));
      let newBalanceEth = parseFloat(await web3.eth.getBalance(user3));
      assert.equal((newBalance/1e18).toFixed(2), (oldBalance/1e18 + incentivesGained/1e18 + rewardPoolPlot/100).toFixed(2));
      assert.equal((newBalanceEth/1e18).toFixed(2), (oldBalanceEth/1e18 + rewardPoolEth/100).toFixed(2));
    });

    it("Scenario 3: Should be able to get more reward pool share of market if market creator had staked tokens", async function() {
      await plotusToken.transfer(user4, toWei(90000));
      await plotusToken.approve(tokenController.address, "1000000000000000000000000", { from: user4 });
      await tokenController.lock("0x534d", toWei(50000), 86400 * 30, { from: user4 });
      await chainlinkGasAgg.setLatestAnswer(450000);
      await increaseTime(3610);
      let tx = await plotusNewInstance.createMarket(0,1, {gasPrice:450000, from:user4});
      eventData = tx.logs[1].args;
      let openMarkets = await plotusNewInstance.getOpenMarkets();
      let marketInstance = await MarketNew.at(openMarkets[0][1]);
      await increaseTime(100);
      await marketInstance.placePrediction(ethAddress, "100000000000000000", 3, 5, {
        value: "100000000000000000",
        from: user12,
      });
      await plotusToken.transfer(user7, toWei(10000));
      await plotusToken.approve(tokenController.address, toWei(1000000000000000000), {from: user7});
      await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 3, 5, {
        from: user7,
      });
      let rewardPoolEth = 0.2;
      let rewardPoolPlot = 200;
      let gasUsed = eventData.gasUsed.toNumber();
      let maxGas = await plotusNewInstance.getUintParameters(toHex("MAXGAS"));
      let gasPrice = Math.min(maxGas[1].toNumber(), 450000*1.25);
      estimatedGasCost = gasPrice*gasUsed;
      let costInETH = estimatedGasCost;
      let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
      incentivesGained = eventData.plotIncentive/1; 
      let rewardPoolSharePerc = eventData.rewardPoolSharePerc;
      assert.equal(rewardPoolSharePerc/1, 200)
      assert.equal(eventData.plotIncentive/1, worthInPLOT[1]/1);
      await increaseTime(10000);
      await marketInstance.settleMarket();
      await increaseTime(10000);
      let oldBalance = parseFloat(await plotusToken.balanceOf(user4));
      let oldBalanceEth = parseFloat(await web3.eth.getBalance(user4));
      tx = await plotusNewInstance.claimCreationRewardV2(100, {from:user4});
      let newBalance = parseFloat(await plotusToken.balanceOf(user4));
      let newBalanceEth = parseFloat(await web3.eth.getBalance(user4));
      assert.equal((newBalance/1e18).toFixed(2), (oldBalance/1e18 + incentivesGained/1e18 + rewardPoolPlot/100).toFixed(2));
      assert.equal((newBalanceEth/1e18).toFixed(2), (oldBalanceEth/1e18 + rewardPoolEth/100).toFixed(2));
    });

    it("Scenario 4: Should be able to get more reward pool share of market if market creator had staked tokens", async function() {
      await plotusToken.transfer(user5, toWei(100000));
      await plotusToken.approve(tokenController.address, "1000000000000000000000000", { from: user5 });
      await tokenController.lock("0x534d", toWei(100000), 86400 * 30, { from: user5 });
      await chainlinkGasAgg.setLatestAnswer(450000);
      await increaseTime(3610);
      let tx = await plotusNewInstance.createMarket(0,1, {gasPrice:450000, from:user5});
      let openMarkets = await plotusNewInstance.getOpenMarkets();
      let marketInstance = await MarketNew.at(openMarkets[0][1]);
      await increaseTime(100);
      await marketInstance.placePrediction(ethAddress, "100000000000000000", 3, 5, {
        value: "100000000000000000",
        from: user12,
      });
      await plotusToken.transfer(user7, toWei(10000));
      await plotusToken.approve(tokenController.address, toWei(1000000000000000000), {from: user7});
      await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 3, 5, {
        from: user7,
      });
      let rewardPoolEth = 0.3;
      let rewardPoolPlot = 300;
      try {
        eventData = tx.logs[2].args;
      } catch(e) {
        eventData = tx.logs[1].args;
      }
      let gasUsed = eventData.gasUsed.toNumber();
      let maxGas = await plotusNewInstance.getUintParameters(toHex("MAXGAS"));
      let gasPrice = Math.min(maxGas[1].toNumber(), 450000*1.25);
      estimatedGasCost = gasPrice*gasUsed;
      let costInETH = estimatedGasCost;
      let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
      incentivesGained = eventData.plotIncentive/1; 
      let rewardPoolSharePerc = eventData.rewardPoolSharePerc;
      assert.equal(rewardPoolSharePerc/1, 300)
      assert.equal(eventData.plotIncentive/1, worthInPLOT[1]/1);
      await increaseTime(10000);
      await marketInstance.settleMarket();
      await increaseTime(10000);
      let oldBalance = parseFloat(await plotusToken.balanceOf(user5));
      let oldBalanceEth = parseFloat(await web3.eth.getBalance(user5));
      tx = await plotusNewInstance.claimCreationRewardV2(100, {from:user5});
      let newBalance = parseFloat(await plotusToken.balanceOf(user5));
      let newBalanceEth = parseFloat(await web3.eth.getBalance(user5));
      assert.equal((newBalance/1e18).toFixed(2), (oldBalance/1e18 + incentivesGained/1e18 + rewardPoolPlot/100).toFixed(2));
      assert.equal((newBalanceEth/1e18).toFixed(2), (oldBalanceEth/1e18 + rewardPoolEth/100).toFixed(2));
    });

    it("Scenario 5: Should be able to get more reward pool share of market if market creator had staked tokens", async function() {
      await plotusToken.transfer(user6, toWei(150000));
      await plotusToken.approve(tokenController.address, "1000000000000000000000000", { from: user6 });
      await tokenController.lock("0x534d", toWei(150000), 86400 * 30, { from: user6 });
      await chainlinkGasAgg.setLatestAnswer(450000);
      await increaseTime(3610);
      let tx = await plotusNewInstance.createMarket(0,1, {gasPrice:450000, from:user6});
      let openMarkets = await plotusNewInstance.getOpenMarkets();
      let marketInstance = await MarketNew.at(openMarkets[0][1]);
      await increaseTime(100);
      await marketInstance.placePrediction(ethAddress, "100000000000000000", 3, 5, {
        value: "100000000000000000",
        from: user7,
      });
      await plotusToken.transfer(user7, toWei(10000));
      await plotusToken.approve(tokenController.address, toWei(1000000000000000000), {from: user7});
      await marketInstance.placePrediction(plotusToken.address, "100000000000000000000", 3, 5, {
        from: user7,
      });
      let rewardPoolEth = 0.4;
      let rewardPoolPlot = 400;
      try {
        eventData = tx.logs[2].args;
      } catch(e) {
        eventData = tx.logs[1].args;
      }
      let gasUsed = eventData.gasUsed.toNumber();
      let maxGas = await plotusNewInstance.getUintParameters(toHex("MAXGAS"));
      let gasPrice = Math.min(maxGas[1].toNumber(), 450000*1.25);
      estimatedGasCost = gasPrice*gasUsed;
      let costInETH = estimatedGasCost;
      let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
      incentivesGained = eventData.plotIncentive/1; 
      let rewardPoolSharePerc = eventData.rewardPoolSharePerc;
      assert.equal(rewardPoolSharePerc/1, 400)
      assert.equal(eventData.plotIncentive/1, worthInPLOT[1]/1);
      await increaseTime(10000);
      await marketInstance.settleMarket();
      await increaseTime(10000);
      let oldBalance = parseFloat(await plotusToken.balanceOf(user6));
      let oldBalanceEth = parseFloat(await web3.eth.getBalance(user6));
      tx = await plotusNewInstance.claimCreationRewardV2(100, {from:user6});
      let newBalance = parseFloat(await plotusToken.balanceOf(user6));
      let newBalanceEth = parseFloat(await web3.eth.getBalance(user6));
      assert.equal((newBalance/1e18).toFixed(2), (oldBalance/1e18 + incentivesGained/1e18 + rewardPoolPlot/100).toFixed(2));
      assert.equal((newBalanceEth/1e18).toFixed(2), (oldBalanceEth/1e18 + rewardPoolEth/100).toFixed(2));
    });

    it("Scenario 6: Should be able to get more reward pool share of market if market creator had staked tokens", async function() {
      await plotusToken.transfer(user8, toWei(150000));
      await plotusToken.approve(tokenController.address, "1000000000000000000000000", { from: user8 });
      await tokenController.lock("0x534d", toWei(150000), 86400 * 30, { from: user8 });
      await chainlinkGasAgg.setLatestAnswer(450000);
      await increaseTime(3610);
      let tx = await plotusNewInstance.createMarket(0,1, {gasPrice:450000, from:user8});
      let openMarkets = await plotusNewInstance.getOpenMarkets();
      let marketInstance = await MarketNew.at(openMarkets[0][1]);
      let rewardPoolEth = 0;
      let rewardPoolPlot = 0;
      try {
        eventData = tx.logs[2].args;
      } catch(e) {
        eventData = tx.logs[1].args;
      }
      let gasUsed = eventData.gasUsed.toNumber();
      let maxGas = await plotusNewInstance.getUintParameters(toHex("MAXGAS"));
      let gasPrice = Math.min(maxGas[1].toNumber(), 450000*1.25);
      estimatedGasCost = gasPrice*gasUsed;
      let costInETH = estimatedGasCost;
      let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
      incentivesGained = eventData.plotIncentive/1; 
      let rewardPoolSharePerc = eventData.rewardPoolSharePerc;
      assert.equal(rewardPoolSharePerc/1, 400)
      assert.equal(eventData.plotIncentive/1, worthInPLOT[1]/1);
      await increaseTime(10000);
      await marketInstance.settleMarket();
      await increaseTime(10000);
      let oldBalance = parseFloat(await plotusToken.balanceOf(user8));
      let oldBalanceEth = parseFloat(await web3.eth.getBalance(user8));
      tx = await plotusNewInstance.claimCreationRewardV2(100, {from:user8});
      let newBalance = parseFloat(await plotusToken.balanceOf(user8));
      let newBalanceEth = parseFloat(await web3.eth.getBalance(user8));
      assert.equal((newBalance/1e18).toFixed(2), (oldBalance/1e18 + incentivesGained/1e18 + rewardPoolPlot/100).toFixed(2));
      assert.equal((newBalanceEth/1e18).toFixed(2), (oldBalanceEth/1e18 + rewardPoolEth/100).toFixed(2));
    });

    it('Should update Chainlink gas aggrefgartor address', async function() {
      let clAgg = await MockChainLinkGasPriceAgg.new();
      await updateParameter(21, 2, 'GASAGG', plotusNewInstance, 'configAddress', clAgg.address);
      let address = await plotusNewInstance.clGasPriceAggregator();
      assert.equal(address, clAgg.address, 'Not updated');
    });

    it('Should update Token Stake For Dispute', async function() {
      await updateParameter(20, 2, 'TSDISP', plotusNewInstance, 'configUint', 26);
      let configData = await marketConfig.getDisputeResolutionParams();
      assert.equal(configData, 26, 'Not updated');
    });

    it('Should update Uniswap Factory', async function() {
      let uniswapFactory = await MockUniswapFactory.new();
      await updateParameter(21, 2, 'UNIFAC', plotusNewInstance, 'configAddress', uniswapFactory.address);
      let configData = await marketConfig.getFeedAddresses();
      assert.equal(configData, uniswapFactory.address, 'Not updated');
    });
    
});
