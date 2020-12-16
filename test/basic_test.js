const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("MarketRegistry");
const Master = artifacts.require("Master");
const MemberRoles = artifacts.require("MemberRoles");
const PlotusToken = artifacts.require("MockPLOT");
const MockWeth = artifacts.require("MockWeth");
const MarketUtility = artifacts.require("MarketUtilityV2");
const MockConfig = artifacts.require("MockConfig");
const Governance = artifacts.require("Governance");
const AllMarkets = artifacts.require("AllMarkets");
const MockUniswapRouter = artifacts.require("MockUniswapRouter");
const MockUniswapV2Pair = artifacts.require("MockUniswapV2Pair");
const MockUniswapFactory = artifacts.require('MockUniswapFactory');
const TokenController = artifacts.require("MockTokenController");
const web3 = Market.web3;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const assertRevert = require("./utils/assertRevert").assertRevert;
const latestTime = require("./utils/latestTime").latestTime;
const encode = require('./utils/encoder.js').encode;
const {toHex, toWei, toChecksumAddress} = require('./utils/ethTools');
const gvProposal = require('./utils/gvProposal.js').gvProposalWithIncentiveViaTokenHolder;

var initialPLOTPrice;
var initialEthPrice;
const ethAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
var nullAddress = "0x0000000000000000000000000000000000000000";

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
		mockUniswapFactory, weth, allMarkets;
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

	it('Should Update Existing Markets Implementation', async function() {
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

    it("Should not allow to re initialize Utility after updating Implementation", async function() {
    	await assertRevert(marketConfig.initialize([user1, MockUniswapRouterInstance.address, plotusToken.address, mockUniswapFactory.address], user1))
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
    });

    // it("Check price of plot", async function() {
    // 	await increaseTime(3610);
    // 	await assertRevert(plotusNewInstance.createMarket(0,0));
    // 	await marketConfig.setInitialCummulativePrice();
    // 	await assertRevert(marketConfig.setInitialCummulativePrice());
    // 	await mockUniswapV2Pair.sync();
    // 	await increaseTime(3610);
    // 	await plotusNewInstance.createMarket(0,0);
    // 	let currentPrice = (await marketConfig.getPrice(mockUniswapV2Pair.address, toWei(1)))/1;
    // 	assert.equal(initialEthPrice, currentPrice/1e18);
    // 	await plotusNewInstance.createMarket(0,1);
    // 	await increaseTime(3610);
    // 	await mockUniswapV2Pair.sync();
    // 	await plotusNewInstance.createMarket(0,0);
    // 	await increaseTime(3610);
    // 	await mockUniswapV2Pair.sync();
    // 	currentPrice = (await marketConfig.getPrice(mockUniswapV2Pair.address, toWei(1)))/1;
    // 	assert.equal(initialEthPrice, currentPrice/1e18);
    // 	let plotPriceInEth = ((await marketConfig.getAssetPriceInETH(plotusToken.address))[0])/1;
    // 	assert.equal(initialEthPrice, plotPriceInEth/1e18);
    // 	let ethPriceInEth = ((await marketConfig.getAssetPriceInETH(ethAddress))[0])/1;
    // 	assert.equal(ethPriceInEth, 1);
    // });

    it('Should add AllMarkets as new contract in Master', async function() {
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

    it("Create market in new contract", async function() {
      allMarkets = await AllMarkets.new();
      await allMarkets.initiate(plotusToken.address, marketConfig.address);
      await increaseTime(3610);
      var date = await latestTime();
      date = Math.round(date)
      await marketConfig.setInitialCummulativePrice();
      await marketConfig.setAuthorizedAddress(allMarkets.address);
      let utility = await MarketUtility.at(marketConfig.address);
      await utility.setAuthorizedAddress(allMarkets.address);
      await mockUniswapV2Pair.sync();
      await allMarkets.addInitialMarketTypesAndStart(date, "0x5e2aa6b66531142bEAB830c385646F97fa03D80a");
      await increaseTime(7200);
      console.log(await allMarkets.marketData(0));
      let tx = await allMarkets.createMarket(0, 0);
      console.log(tx);
    });

    it("Place Prediction", async function() {
      // let tx = await allMarkets.createMarket(0,000), 3600);
      // await assertRevert(marketInstance.placePrediction("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "1000000000000000000", 2, 4, {
      //   value: "1000000000000000000",
      //   from: user10
      // }));
      console.log(plotusToken.address);
      await plotusToken.transfer(user10, toWei(1000));
      await plotusToken.transfer(user11, toWei(1000));
      await plotusToken.approve(allMarkets.address, toWei(100000), {from:user10});
      await plotusToken.approve(allMarkets.address, toWei(100000), {from:user11});
      await allMarkets.deposit(toWei(1000), {value: "2100000000000000000", from:user10})
      await allMarkets.deposit(toWei(1000), {value: "1000000000000000000", from:user11})
      await plotusToken.approve(tokenController.address, toWei(100000), {from:user10});
      tx = await plotusToken.approve(tokenController.address, toWei(100000), {from:user11});
      tx = await allMarkets.placePrediction(1, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "1000000000000000000", 2, {
        from: user10
      });
      console.log("*****************************************");
      console.log("1st market 1st pred");
      console.log(tx);
      console.log("*****************************************");
      tx = await allMarkets.placePrediction(1, plotusToken.address, "10000000000000000000", 1, {
        from: user10
      });
      console.log("*****************************************");
      console.log("1st market 2nd pred");
      console.log(tx);
      console.log("*****************************************");
      await increaseTime(7300);
      await allMarkets.createMarket(0, 0);
      tx = await allMarkets.placePrediction(2, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "100000000000000000", 2, {
        from: user10
      });
      console.log("*****************************************");
      console.log("2nd market 1st pred");
      console.log(tx);
      console.log("*****************************************");
        await increaseTime(10000);
      await allMarkets.createMarket(0, 0);
      tx = await allMarkets.placePrediction(3, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "100000000000000000", 2, {
        from: user10
      });
      tx = await allMarkets.placePrediction(3, plotusToken.address, "10000000000000000000", 1, {
        from: user11
      });
      console.log("*****************************************");
      console.log("3rd market 2nd pred");
      console.log(tx);
      console.log("*****************************************");
    });

    it("Claim Rewards", async function() {
      await allMarkets.deposit(0, {value: "10000000000000000000", from:user10});
      let tx;
      for(let  i= 0; i<30; i++) {
        await increaseTime(7200);
        tx = await allMarkets.createMarket(0, 0);
        await allMarkets.placePrediction(i + 4, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "100000000000000000", 2, {
          from: user10
        });
      }
      console.log(tx);
      console.log((await web3.eth.getBalance(user10))/1);
      tx = await allMarkets.withdraw(30, {from:user10});
      console.log((await web3.eth.getBalance(user10))/1);
      console.log(tx);
      // await assertRevert(allMarkets.claimCreationReward());
      // await plotusToken.transfer(allMarkets.address, toWei(1000));
      // tx = await allMarkets.claimCreationReward();
      // console.log(tx);
    })
    
});
