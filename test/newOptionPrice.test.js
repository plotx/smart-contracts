const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("MarketRegistry");
const Master = artifacts.require("Master");
const MemberRoles = artifacts.require("MemberRoles");
const PlotusToken = artifacts.require("MockPLOT");
const MockWeth = artifacts.require("MockWeth");
const MockConfig = artifacts.require("MockConfig");
const Governance = artifacts.require("Governance");
const AllMarkets = artifacts.require("AllMarkets");
const MarketCreationRewards = artifacts.require("MarketCreationRewards");
const MockUniswapRouter = artifacts.require("MockUniswapRouter");
const MockUniswapV2Pair = artifacts.require("MockUniswapV2Pair");
const MockUniswapFactory = artifacts.require("MockUniswapFactory");
const TokenController = artifacts.require("MockTokenController");
const MockChainLinkAggregator = artifacts.require("MockChainLinkAggregator");

const web3 = Market.web3;
const ethAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const assertRevert = require("./utils/assertRevert").assertRevert;
const latestTime = require("./utils/latestTime").latestTime;
const encode = require("./utils/encoder.js").encode;
const gvProposal = require("./utils/gvProposal.js").gvProposalWithIncentiveViaTokenHolder;
const { toHex, toWei, toChecksumAddress } = require("./utils/ethTools");
const to8Power = (number) => String(parseFloat(number) * 1e8);

describe("Sheet- New Pricing.", () => {
    let masterInstance,
        plotusToken,
        marketConfig,
        MockUniswapRouterInstance,
        tokenControllerAdd,
        tokenController,
        plotusNewAddress,
        plotusNewInstance,
        governance,
        mockUniswapV2Pair,
        mockUniswapFactory,
        weth,
        allMarkets,
        mockChainLinkAggregator;
    let marketId = 1;
    contract("AllMarkets", async function ([user1, user2, user3, user4, user5, userMarketCreator]) {
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
            let newUtility = await MockConfig.new();
            let existingMarkets = await plotusNewInstance.getOpenMarkets();
            let actionHash = encode("upgradeContractImplementation(address,address)", marketConfig.address, newUtility.address);
            await gvProposal(6, actionHash, await MemberRoles.at(await masterInstance.getLatestAddress(toHex("MR"))), governance, 2, 0);
            await increaseTime(604800);
            marketConfig = await MockConfig.at(marketConfig.address);
            mockUniswapV2Pair = await MockUniswapV2Pair.new();
            await mockUniswapV2Pair.initialize(plotusToken.address, weth.address);
            await weth.deposit({ from: user4, value: toWei(10) });
            await weth.transfer(mockUniswapV2Pair.address, toWei(10), { from: user4 });
            await plotusToken.transfer(mockUniswapV2Pair.address, toWei(1000));
            initialPLOTPrice = 1000 / 10;
            initialEthPrice = 10 / 1000;
            await mockUniswapFactory.setPair(mockUniswapV2Pair.address);
            await mockUniswapV2Pair.sync();
            newUtility = await MockConfig.new();
            existingMarkets = await plotusNewInstance.getOpenMarkets();
            actionHash = encode("upgradeContractImplementation(address,address)", marketConfig.address, newUtility.address);
            await gvProposal(6, actionHash, await MemberRoles.at(await masterInstance.getLatestAddress(toHex("MR"))), governance, 2, 0);
            await increaseTime(604800);
            marketConfig = await MockConfig.at(marketConfig.address);
            allMarkets = await AllMarkets.at(await masterInstance.getLatestAddress(web3.utils.toHex("AM")));
            var date = Date.now();
            date = Math.round(date / 1000) + 10000;
            await marketConfig.setInitialCummulativePrice();
            await marketConfig.setAuthorizedAddress(allMarkets.address);
            let utility = await MockConfig.at("0xCBc7df3b8C870C5CDE675AaF5Fd823E4209546D2");
            await utility.setAuthorizedAddress(allMarkets.address);
            await mockUniswapV2Pair.sync();
            let mcr;
            let _marketUtility = await plotusNewInstance.marketUtility();
            mockChainLinkAggregator = await MockChainLinkAggregator.new();
            await marketConfig.setMockPriceFlag(false);
            allMarkets = await AllMarkets.at(await masterInstance.getLatestAddress(web3.utils.toHex("AM")));
            mcr = await MarketCreationRewards.at(await masterInstance.getLatestAddress(web3.utils.toHex("MC")));

            marketId = 6;
            await increaseTime(4 * 60 * 60 + 1);
            await allMarkets.createMarket(0, 0, { from: userMarketCreator });
            marketId++;
        });
        it("Test Case 1", async () => {
            await marketConfig.setMaxPredictionValue(toWei(2000));
            await marketConfig.setMockPriceFlag(false);

            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[0] / 1, 100);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[1] / 1, 100);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[2] / 1, 100);
            await MockUniswapRouterInstance.setPrice(toWei(0.01));
            await marketConfig.setPrice(toWei(0.01));

            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 1)) / 1e3), 0);
            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1e3), 0);
            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 3)) / 1e3), 0);

            await plotusToken.approve(allMarkets.address, toWei("2000000000"), { from: user1 });
        });
        it("Test Case 2", async () => {
            await allMarkets.deposit(0, { from: user1, value: toWei("1") });
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("1"), 2, { from: user1 });

            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 1)) / 1e3), 0);
            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1e3), 999);
            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 3)) / 1e3), 0);

            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[0] / 1, 100);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[1] / 1, 200);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[2] / 1, 100);
        });
        it("Test Case 3", async () => {
            await marketConfig.setMaxPredictionValue(toWei("100000000"));
            await allMarkets.deposit(0, { from: user1, value: toWei("100") });
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("100"), 1, { from: user1 });

            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 1)) / 1e3), 99900);
            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1e3), 999);
            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 3)) / 1e3), 0);

            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[0] / 1, (Math.round(1.99 * 1e2) / 1e2) * 1e2);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[1] / 1, (Math.round(1.00 * 1e2) / 1e2) * 1e2);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[2] / 1, 1 * 1e2);
        });
        it("Test Case 4", async () => {
            await allMarkets.deposit(0, { from: user1, value: toWei("0.01") });
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("0.01"), 3, { from: user1 });

            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 1)) / 1e3), 99900);
            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1e3), 999);
            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 3)) / 1e3), Math.round(9.99));

            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[0] / 1, (Math.round(1.99 * 1e2) / 1e2) * 1e2);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[1] / 1, (Math.round(1.00 * 1e2) / 1e2) * 1e2);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[2] / 1, (Math.round(1.00 * 1e2) / 1e2) * 1e2);
        });
        it("Test Case 5", async () => {
            await allMarkets.deposit(toWei("100"), { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("100"), 1, { from: user1 });

            assert.equal(Math.round(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 1)) / 1e3)), 100402);
            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1e3), 999);
            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 3)) / 1e3), Math.round(9.99));

            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[0] / 1, (Math.round(1.99 * 1e2) / 1e2) * 1e2);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[1] / 1, (Math.round(1.00 * 1e2) / 1e2) * 1e2);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[2] / 1, (Math.round(1.00 * 1e2) / 1e2) * 1e2);
        });
        it("Test Case 6", async () => {
            await allMarkets.deposit(toWei("10000000"), { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("10000000"), 2, { from: user1 });

            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 1)) / 1e3), 100402);
            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1e3), 99950999);
            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 3)) / 1e3), Math.round(9.99));

            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[0] / 1, (Math.round(1.001013886 * 1e2) / 1e2) * 1e2);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[1] / 1, (Math.round(1.99 * 1e2) / 1e2) * 1e2);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[2] / 1, (Math.round(1.000000101 * 1e2) / 1e2) * 1e2);
        });
        it("Test Case 7", async () => {
            await allMarkets.deposit(toWei("978546.56"), { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("978546.56"), 3, { from: user1 });

            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 1)) / 1e3), 100402);
            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1e3), 99950999);
            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 3)) / 1e3), Math.round(9780582.859));

            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[0] / 1, (Math.round(1.000922791 * 1e2) / 1e2) * 1e2);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[1] / 1, (Math.round(1.91 * 1e2) / 1e2) * 1e2);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[2] / 1, (Math.round(1.08 * 1e2) / 1e2) * 1e2);
        });
        it("Test Case 8", async () => {
            await allMarkets.deposit(0, { from: user1, value: toWei("1456.98") });
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("1456.98"), 1, { from: user1 });

            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 1)) / 1e3), 1554583);
            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1e3), 99950999);
            assert.equal(Math.round((await allMarkets.getUserPredictionPoints(user1, marketId, 3)) / 1e3), Math.round(9780582.859));

            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[0] / 1, (Math.round(1.01 * 1e2) / 1e2) * 1e2);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[1] / 1, (Math.round(1.89 * 1e2) / 1e2) * 1e2);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[2] / 1, (Math.round(1.08 * 1e2) / 1e2) * 1e2);
        });
    });
});
