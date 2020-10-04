const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("MarketRegistry");
const Master = artifacts.require("Master");
const MemberRoles = artifacts.require("MemberRoles");
const PlotusToken = artifacts.require("MockPLOT");
const MockWeth = artifacts.require("MockWeth");
const MarketUtility = artifacts.require("MockMarketUtility");
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
		mockUniswapFactory, weth;
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
    	await assertRevert(marketConfig.initialize([user1, MockUniswapRouterInstance.address, plotusToken.address, mockUniswapFactory.address]))
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

    it('Should not update market config address parameters if zero address', async function() {
        let newUtility = await MarketUtility.new();
        let existingMarkets = await plotusNewInstance.getOpenMarkets();
        let actionHash = encode(
          'updateConfigAddressParameters(bytes8,address)',
          toHex("UNIFAC"),
          nullAddress
        );
        let proposalId = await governance.getProposalLength();
        await gvProposal(
          21,
          actionHash,
          await MemberRoles.at(await masterInstance.getLatestAddress(toHex('MR'))),
          governance,
          2,
          0
        );
        assert.notEqual(3, (await governance.proposalActionStatus(proposalId))/1);
        await increaseTime(604800);
    });

    it('Should Update market config address parameters', async function() {
        let newUtility = await MarketUtility.new();
        let existingMarkets = await plotusNewInstance.getOpenMarkets();
        let actionHash = encode(
          'updateConfigAddressParameters(bytes8,address)',
          toHex("UNIFAC"),
          mockUniswapFactory.address
        );
        let proposalId = await governance.getProposalLength();
        await gvProposal(
          21,
          actionHash,
          await MemberRoles.at(await masterInstance.getLatestAddress(toHex('MR'))),
          governance,
          2,
          0
        );
        assert.equal(3, (await governance.proposalActionStatus(proposalId))/1);
        await increaseTime(604800);
    });

    it("Check price of plot", async function() {
    	await increaseTime(3610);
    	await marketConfig.setInitialCummulativePrice();
    	await mockUniswapV2Pair.sync();
    	await increaseTime(3610);
    	await plotusNewInstance.createMarket(0,0);
    	await plotusNewInstance.createMarket(0,1);
    	await increaseTime(3610);
    	await mockUniswapV2Pair.sync();
    	await plotusNewInstance.createMarket(0,0);
    	await increaseTime(3610);
    	await mockUniswapV2Pair.sync();
    	let currentPrice = (await marketConfig.getPrice(mockUniswapV2Pair.address, toWei(1)))/1;
    	assert.equal(initialEthPrice, currentPrice/1e18);
    	let plotPriceInEth = ((await marketConfig.getAssetPriceInETH(plotusToken.address))[0])/1;
    	assert.equal(initialEthPrice, plotPriceInEth/1e18);
    	let ethPriceInEth = ((await marketConfig.getAssetPriceInETH(ethAddress))[0])/1;
    	assert.equal(ethPriceInEth, 1);
    });

    it("Get asset price in PLOT", async function() {
    	let currentPrice = (await marketConfig.getValueAndMultiplierParameters(ethAddress, "1000000000000000000"))
    	assert.equal(initialPLOTPrice, currentPrice[1]/1e18);
    	currentPrice = (await marketConfig.getValueAndMultiplierParameters(plotusToken.address, "1000000000000000000"))
    	assert.equal(1, currentPrice[1]/1e18);
    });
    
});
