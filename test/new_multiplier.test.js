const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("MarketRegistry");
const Master = artifacts.require("Master");
const MemberRoles = artifacts.require("MemberRoles");
const PlotusToken = artifacts.require("MockPLOT");
const MockWeth = artifacts.require("MockWeth");
const MockConfig = artifacts.require("MockConfig"); //mock
const Governance = artifacts.require("Governance");
const AllMarkets = artifacts.require("MockAllMarkets");
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
const to3Power = (number) => String(parseFloat(number) * 1e3);

// Multiplier Sheet
describe("new_Multiplier 1. Multiplier Sheet PLOT Prediction", () => {
    let masterInstance,
        plotusToken,
        mockMarketConfig,
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
        marketUtility,
        mockChainLinkAggregator;
    let marketId = 1;
    let predictionPointsBeforeUser1, predictionPointsBeforeUser2, predictionPointsBeforeUser3, predictionPointsBeforeUser4;

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
            mockMarketConfig = await plotusNewInstance.marketUtility();
            mockMarketConfig = await MockConfig.at(mockMarketConfig);
            weth = await MockWeth.deployed();
            await mockMarketConfig.setWeth(weth.address);
            let newUtility = await MockConfig.new();
            let actionHash = encode("upgradeContractImplementation(address,address)", mockMarketConfig.address, newUtility.address);
            await gvProposal(6, actionHash, await MemberRoles.at(await masterInstance.getLatestAddress(toHex("MR"))), governance, 2, 0);
            await increaseTime(604800);
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
            actionHash = encode("upgradeContractImplementation(address,address)", mockMarketConfig.address, newUtility.address);
            await gvProposal(6, actionHash, await MemberRoles.at(await masterInstance.getLatestAddress(toHex("MR"))), governance, 2, 0);
            await increaseTime(604800);
            allMarkets = await AllMarkets.deployed();
            // await allMarkets.initiate(plotusToken.address, marketConfig.address);
            let date = await latestTime();
            await increaseTime(3610);
            date = Math.round(date);
            await mockMarketConfig.setInitialCummulativePrice();
            await mockMarketConfig.setAuthorizedAddress(allMarkets.address);
            let utility = await MockConfig.at("0xCBc7df3b8C870C5CDE675AaF5Fd823E4209546D2");
            await utility.setAuthorizedAddress(allMarkets.address);
            await mockUniswapV2Pair.sync();
            // mockChainLinkAggregator = await MockChainLinkAggregator.new(); // address _plot, address _tc, address _gv, address _ethAddress, address _marketUtility, uint32 _marketStartTime, address _marketCreationRewards, address _ethFeed, address _btcFeed // await allMarkets.addInitialMarketTypesAndStart(date, "0x5e2aa6b66531142bEAB830c385646F97fa03D80a", mockChainLinkAggregator.address);
            marketId = 6;
            await increaseTime(4 * 60 * 60 + 1);
            await allMarkets.createMarket(0, 0, { from: userMarketCreator });
            marketId++;
        });
        it("1.1 Position without locking PLOT tokens", async () => {
            console.log(`MarketId: ${marketId}`);
            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("100"));
            await plotusToken.transfer(user4, toWei("100"));
            await plotusToken.transfer(user5, toWei("10"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user4 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user5 });

            await allMarkets.deposit(toWei(100), { from: user1 });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(toWei(100), { from: user3 });
            await allMarkets.deposit(toWei(100), { from: user4 });
            await allMarkets.deposit(toWei(10), { from: user5 });

            await mockMarketConfig.setNextOptionPrice(9);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[0] / 1, 9);
            await allMarkets.placePrediction(marketId, plotusToken.address, to3Power("100"), 1, { from: user3 });

            await mockMarketConfig.setNextOptionPrice(18);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[1] / 1, 18);
            await allMarkets.placePrediction(marketId, plotusToken.address, to3Power("100"), 2, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, to3Power("400"), 2, { from: user2 });

            await mockMarketConfig.setNextOptionPrice(27);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[2] / 1, 27);
            await allMarkets.placePrediction(marketId, plotusToken.address, to3Power("100"), 3, { from: user4 });
            await allMarkets.placePrediction(marketId, plotusToken.address, to3Power("10"), 3, { from: user5 });

            predictionPointsBeforeUser1 = (await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1e3;
            predictionPointsBeforeUser2 = (await allMarkets.getUserPredictionPoints(user2, marketId, 2)) / 1e3;
            predictionPointsBeforeUser3 = (await allMarkets.getUserPredictionPoints(user3, marketId, 1)) / 1e3;
            predictionPointsBeforeUser4 = (await allMarkets.getUserPredictionPoints(user4, marketId, 3)) / 1e3;
            predictionPointsBeforeUser5 = (await allMarkets.getUserPredictionPoints(user5, marketId, 3)) / 1e3;
            console.log(
                predictionPointsBeforeUser1,
                predictionPointsBeforeUser2,
                predictionPointsBeforeUser3,
                predictionPointsBeforeUser4,
                predictionPointsBeforeUser5
            );

            await increaseTime(8 * 60 * 60);
            await allMarkets.postResultMock(1, marketId);
            await increaseTime(8 * 60 * 60);
        });
        it("1.2 Positions After locking PLOT tokens", async () => {
            await allMarkets.createMarket(0, 0);
            marketId++;

            await plotusToken.transfer(user2, toWei(400 + 1600));
            await plotusToken.transfer(user3, toWei(100 + 1100));
            await plotusToken.transfer(user4, toWei(100 + 1100));
            await plotusToken.transfer(user5, toWei(10 + 1100));

            await plotusToken.approve(tokenController.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(tokenController.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(tokenController.address, toWei("10000"), { from: user3 });
            await plotusToken.approve(tokenController.address, toWei("10000"), { from: user4 });
            await plotusToken.approve(tokenController.address, toWei("10000"), { from: user5 });
            await tokenController.lock("0x534d", toWei("1100"), 86400 * 30, { from: user1 });
            await tokenController.lock("0x534d", toWei("1600"), 86400 * 30, { from: user2 });
            await tokenController.lock("0x534d", toWei("1100"), 86400 * 30, { from: user3 });
            await tokenController.lock("0x534d", toWei("1100"), 86400 * 30, { from: user4 });
            await tokenController.lock("0x534d", toWei("1100"), 86400 * 30, { from: user5 });

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user4 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user5 });

            await allMarkets.deposit(toWei(100), { from: user1 });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(toWei(100), { from: user3 });
            await allMarkets.deposit(toWei(100), { from: user4 });
            await allMarkets.deposit(toWei(10), { from: user5 });

            await mockMarketConfig.setNextOptionPrice(9);
            await allMarkets.placePrediction(marketId, plotusToken.address, to3Power("100"), 1, { from: user3 });

            await mockMarketConfig.setNextOptionPrice(18);
            await allMarkets.placePrediction(marketId, plotusToken.address, to3Power("100"), 2, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, to3Power("400"), 2, { from: user2 });

            await mockMarketConfig.setNextOptionPrice(27);
            await allMarkets.placePrediction(marketId, plotusToken.address, to3Power("100"), 3, { from: user4 });
            await allMarkets.placePrediction(marketId, plotusToken.address, to3Power("10"), 3, { from: user5 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1000;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 2)) / 1000;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 1)) / 1000;
            predictionPointsBeforeUser4 = parseFloat(await allMarkets.getUserPredictionPoints(user4, marketId, 3)) / 1000;
            predictionPointsBeforeUser5 = parseFloat(await allMarkets.getUserPredictionPoints(user5, marketId, 3)) / 1000;
            console.log(
                predictionPointsBeforeUser1,
                predictionPointsBeforeUser2,
                predictionPointsBeforeUser3,
                predictionPointsBeforeUser4,
                predictionPointsBeforeUser5
            );

            await increaseTime(8 * 60 * 60);
            await allMarkets.postResultMock(1, marketId);
            await increaseTime(8 * 60 * 60);
        });
    });
});

contract("new_multiplier 2. Multiplier sheet eth prediction", async function ([user1, user2, user3, user4, user5, user6, userMarketCreator]) {
    // Multiplier Sheet
    let masterInstance,
        plotusToken,
        mockMarketConfig,
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
        marketUtility,
        mockChainLinkAggregator;
    let marketId = 1;
    let predictionPointsBeforeUser1, predictionPointsBeforeUser2, predictionPointsBeforeUser3, predictionPointsBeforeUser4;
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
        mockMarketConfig = await plotusNewInstance.marketUtility();
        mockMarketConfig = await MockConfig.at(mockMarketConfig);
        weth = await MockWeth.deployed();
        await mockMarketConfig.setWeth(weth.address);
        let newUtility = await MockConfig.new();
        let actionHash = encode("upgradeContractImplementation(address,address)", mockMarketConfig.address, newUtility.address);
        await gvProposal(6, actionHash, await MemberRoles.at(await masterInstance.getLatestAddress(toHex("MR"))), governance, 2, 0);
        await increaseTime(604800);
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
        actionHash = encode("upgradeContractImplementation(address,address)", mockMarketConfig.address, newUtility.address);
        await gvProposal(6, actionHash, await MemberRoles.at(await masterInstance.getLatestAddress(toHex("MR"))), governance, 2, 0);
        await increaseTime(604800);
        allMarkets = await AllMarkets.deployed();
        // await allMarkets.initiate(plotusToken.address, marketConfig.address);
        let date = await latestTime();
        await increaseTime(3610);
        date = Math.round(date);
        await mockMarketConfig.setInitialCummulativePrice();
        await mockMarketConfig.setAuthorizedAddress(allMarkets.address);
        let utility = await MockConfig.at("0xCBc7df3b8C870C5CDE675AaF5Fd823E4209546D2");
        await utility.setAuthorizedAddress(allMarkets.address);
        await mockUniswapV2Pair.sync();
        // mockChainLinkAggregator = await MockChainLinkAggregator.new(); // address _plot, address _tc, address _gv, address _ethAddress, address _marketUtility, uint32 _marketStartTime, address _marketCreationRewards, address _ethFeed, address _btcFeed // await allMarkets.addInitialMarketTypesAndStart(date, "0x5e2aa6b66531142bEAB830c385646F97fa03D80a", mockChainLinkAggregator.address);
        marketId = 6;
        await increaseTime(4 * 60 * 60 + 1);
        await allMarkets.createMarket(0, 0, { from: userMarketCreator });
        marketId++;
    });
    it("2.1 Position without locking PLOT tokens", async () => {
        await MockUniswapRouterInstance.setPrice("1000000000000000");
        await marketConfig.setPrice("1000000000000000");

        await allMarkets.deposit(0, { from: user1, value: toWei("10") });
        await allMarkets.deposit(0, { from: user2, value: toWei("10") });
        await allMarkets.deposit(0, { from: user3, value: toWei("10") });
        await allMarkets.deposit(0, { from: user4, value: toWei("10") });
        await allMarkets.deposit(0, { from: user5, value: toWei("10") });
        await allMarkets.deposit(0, { from: user6, value: toWei("0.2") });

        await mockMarketConfig.setNextOptionPrice(9);
        await allMarkets.placePrediction(marketId, ethAddress, to3Power("10"), 2, { from: user1 });
        await allMarkets.placePrediction(marketId, ethAddress, to3Power("10"), 2, { from: user2 });

        await mockMarketConfig.setNextOptionPrice(18);
        await allMarkets.placePrediction(marketId, ethAddress, to3Power("10"), 1, { from: user3 });

        await mockMarketConfig.setNextOptionPrice(27);
        await allMarkets.placePrediction(marketId, ethAddress, to3Power("10"), 3, { from: user4 });
        await allMarkets.placePrediction(marketId, ethAddress, to3Power("10"), 3, { from: user5 });
        await allMarkets.placePrediction(marketId, ethAddress, to3Power("0.2"), 3, { from: user6 });

        predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1000;
        predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 2)) / 1000;
        predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 1)) / 1000;
        predictionPointsBeforeUser4 = parseFloat(await allMarkets.getUserPredictionPoints(user4, marketId, 3)) / 1000;
        predictionPointsBeforeUser5 = parseFloat(await allMarkets.getUserPredictionPoints(user5, marketId, 3)) / 1000;
        predictionPointsBeforeUser6 = parseFloat(await allMarkets.getUserPredictionPoints(user6, marketId, 3)) / 1000;
        console.log(
            predictionPointsBeforeUser1,
            predictionPointsBeforeUser2,
            predictionPointsBeforeUser3,
            predictionPointsBeforeUser4,
            predictionPointsBeforeUser5,
            predictionPointsBeforeUser6
        );

        await increaseTime(8 * 60 * 60);
        await allMarkets.postResultMock(1, marketId);
        await increaseTime(8 * 60 * 60);

        let returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[0][0]) / 1e3;
        let returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[0][0]) / 1e3;
        let returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[0][0]) / 1e3;
        let returnUser4 = parseFloat((await allMarkets.getReturn(user4, marketId))[0][0]) / 1e3;
        let returnUser5 = parseFloat((await allMarkets.getReturn(user5, marketId))[0][0]) / 1e3;
        let returnUser6 = parseFloat((await allMarkets.getReturn(user6, marketId))[0][0]) / 1e3;
        console.log(returnUser1, returnUser2, returnUser3, returnUser4, returnUser5, returnUser6);

        returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[0][1]) / 1e3;
        returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[0][1]) / 1e3;
        returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[0][1]) / 1e3;
        returnUser4 = parseFloat((await allMarkets.getReturn(user4, marketId))[0][1]) / 1e3;
        returnUser5 = parseFloat((await allMarkets.getReturn(user5, marketId))[0][1]) / 1e3;
        returnUser6 = parseFloat((await allMarkets.getReturn(user6, marketId))[0][1]) / 1e3;
        console.log(returnUser1, returnUser2, returnUser3, returnUser4, returnUser5, returnUser6);

        returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[2]) / 1e3;
        returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[2]) / 1e3;
        returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[2]) / 1e3;
        returnUser4 = parseFloat((await allMarkets.getReturn(user4, marketId))[2]) / 1e3;
        returnUser5 = parseFloat((await allMarkets.getReturn(user5, marketId))[2]) / 1e3;
        returnUser6 = parseFloat((await allMarkets.getReturn(user6, marketId))[2]) / 1e3;
        console.log(returnUser1, returnUser2, returnUser3, returnUser4, returnUser5, returnUser6);

        console.log(
            (await plotusToken.balanceOf(user1)) / 1e18,
            (await plotusToken.balanceOf(user2)) / 1e18,
            (await plotusToken.balanceOf(user3)) / 1e18,
            (await plotusToken.balanceOf(user4)) / 1e18,
            (await plotusToken.balanceOf(user5)) / 1e18,
            (await plotusToken.balanceOf(user6)) / 1e18
        );
        console.log(
            (await web3.eth.getBalance(user1)) / 1e18,
            (await web3.eth.getBalance(user2)) / 1e18,
            (await web3.eth.getBalance(user3)) / 1e18,
            (await web3.eth.getBalance(user4)) / 1e18,
            (await web3.eth.getBalance(user5)) / 1e18,
            (await web3.eth.getBalance(user6)) / 1e18
        );

        await allMarkets.withdrawMax(10, { from: user1 });
        await allMarkets.withdrawMax(10, { from: user2 });
        await allMarkets.withdrawMax(10, { from: user3 });
        await allMarkets.withdrawMax(10, { from: user4 });
        await allMarkets.withdrawMax(10, { from: user5 });
        await allMarkets.withdrawMax(10, { from: user6 });

        console.log(
            (await plotusToken.balanceOf(user1)) / 1e18,
            (await plotusToken.balanceOf(user2)) / 1e18,
            (await plotusToken.balanceOf(user3)) / 1e18,
            (await plotusToken.balanceOf(user4)) / 1e18,
            (await plotusToken.balanceOf(user5)) / 1e18,
            (await plotusToken.balanceOf(user6)) / 1e18
        );
        console.log(
            (await web3.eth.getBalance(user1)) / 1e18,
            (await web3.eth.getBalance(user2)) / 1e18,
            (await web3.eth.getBalance(user3)) / 1e18,
            (await web3.eth.getBalance(user4)) / 1e18,
            (await web3.eth.getBalance(user5)) / 1e18,
            (await web3.eth.getBalance(user6)) / 1e18
        );
        // assert.equal(predictionPointsBeforeUser1.toFixed(1), (55.5138941).toFixed(1));
        // assert.equal(predictionPointsBeforeUser2.toFixed(1), (932.6334208).toFixed(1));
        // assert.equal(predictionPointsBeforeUser3.toFixed(1), (366.391701).toFixed(1));
        // assert.equal(predictionPointsBeforeUser4.toFixed(1), (170.2426086).toFixed(1));
        // assert.equal(predictionPointsBeforeUser5.toFixed(1), (5.383543979).toFixed(1));
    });
    it("2.2 Positions After locking PLOT tokens", async () => {
        await allMarkets.createMarket(0, 0);
        marketId++;

        await allMarkets.setOptionPrice(marketId, 1, 9);
        await allMarkets.setOptionPrice(marketId, 2, 18);
        await allMarkets.setOptionPrice(marketId, 3, 27);

        await plotusToken.transfer(user2, toWei(110000));
        await plotusToken.transfer(user3, toWei(1000));
        await plotusToken.transfer(user4, toWei(100000));
        await plotusToken.transfer(user5, toWei(200000));
        await plotusToken.transfer(user6, toWei(11000));

        await plotusToken.approve(tokenController.address, toWei("1000000"), { from: user1 });
        await plotusToken.approve(tokenController.address, toWei("1000000"), { from: user2 });
        await plotusToken.approve(tokenController.address, toWei("1000000"), { from: user3 });
        await plotusToken.approve(tokenController.address, toWei("1000000"), { from: user4 });
        await plotusToken.approve(tokenController.address, toWei("1000000"), { from: user5 });
        await plotusToken.approve(tokenController.address, toWei("1000000"), { from: user6 });
        await tokenController.lock("0x534d", toWei("110000"), 86400 * 30, { from: user1 });
        await tokenController.lock("0x534d", toWei("110000"), 86400 * 30, { from: user2 });
        await tokenController.lock("0x534d", toWei("1000"), 86400 * 30, { from: user3 });
        await tokenController.lock("0x534d", toWei("100000"), 86400 * 30, { from: user4 });
        await tokenController.lock("0x534d", toWei("200000"), 86400 * 30, { from: user5 });
        await tokenController.lock("0x534d", toWei("11000"), 86400 * 30, { from: user6 });
        console.error("*** One more lock commented!! please uncomment ***");

        await allMarkets.deposit(0, { from: user1, value: toWei("10") });
        await allMarkets.deposit(0, { from: user2, value: toWei("10") });
        await allMarkets.deposit(0, { from: user3, value: toWei("10") });
        await allMarkets.deposit(0, { from: user4, value: toWei("10") });
        await allMarkets.deposit(0, { from: user5, value: toWei("10") });
        await allMarkets.deposit(0, { from: user6, value: toWei("0.2") });

        await mockMarketConfig.setNextOptionPrice(9);
        await allMarkets.placePrediction(marketId, ethAddress, to3Power("10"), 2, { from: user1 });
        await allMarkets.placePrediction(marketId, ethAddress, to3Power("10"), 2, { from: user2 });

        await mockMarketConfig.setNextOptionPrice(18);
        await allMarkets.placePrediction(marketId, ethAddress, to3Power("10"), 1, { from: user3 });

        await mockMarketConfig.setNextOptionPrice(27);
        await allMarkets.placePrediction(marketId, ethAddress, to3Power("10"), 3, { from: user4 });
        await allMarkets.placePrediction(marketId, ethAddress, to3Power("10"), 3, { from: user5 });
        await allMarkets.placePrediction(marketId, ethAddress, to3Power("0.2"), 3, { from: user6 });

        predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1000;
        predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 2)) / 1000;
        predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 1)) / 1000;
        predictionPointsBeforeUser4 = parseFloat(await allMarkets.getUserPredictionPoints(user4, marketId, 3)) / 1000;
        predictionPointsBeforeUser5 = parseFloat(await allMarkets.getUserPredictionPoints(user5, marketId, 3)) / 1000;
        predictionPointsBeforeUser6 = parseFloat(await allMarkets.getUserPredictionPoints(user6, marketId, 3)) / 1000;
        console.log(
            predictionPointsBeforeUser1,
            predictionPointsBeforeUser2,
            predictionPointsBeforeUser3,
            predictionPointsBeforeUser4,
            predictionPointsBeforeUser5,
            predictionPointsBeforeUser6
        );

        await increaseTime(8 * 60 * 60);
        await allMarkets.postResultMock(1, marketId);
        await increaseTime(8 * 60 * 60);

        let returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[0][0]) / 1e3;
        let returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[0][0]) / 1e3;
        let returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[0][0]) / 1e3;
        let returnUser4 = parseFloat((await allMarkets.getReturn(user4, marketId))[0][0]) / 1e3;
        let returnUser5 = parseFloat((await allMarkets.getReturn(user5, marketId))[0][0]) / 1e3;
        let returnUser6 = parseFloat((await allMarkets.getReturn(user6, marketId))[0][0]) / 1e3;
        console.log(returnUser1, returnUser2, returnUser3, returnUser4, returnUser5, returnUser6);

        returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[0][1]) / 1e3;
        returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[0][1]) / 1e3;
        returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[0][1]) / 1e3;
        returnUser4 = parseFloat((await allMarkets.getReturn(user4, marketId))[0][1]) / 1e3;
        returnUser5 = parseFloat((await allMarkets.getReturn(user5, marketId))[0][1]) / 1e3;
        returnUser6 = parseFloat((await allMarkets.getReturn(user6, marketId))[0][1]) / 1e3;
        console.log(returnUser1, returnUser2, returnUser3, returnUser4, returnUser5, returnUser6);

        returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[2]) / 1e3;
        returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[2]) / 1e3;
        returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[2]) / 1e3;
        returnUser4 = parseFloat((await allMarkets.getReturn(user4, marketId))[2]) / 1e3;
        returnUser5 = parseFloat((await allMarkets.getReturn(user5, marketId))[2]) / 1e3;
        returnUser6 = parseFloat((await allMarkets.getReturn(user6, marketId))[2]) / 1e3;
        console.log(returnUser1, returnUser2, returnUser3, returnUser4, returnUser5, returnUser6);

        console.log(
            (await plotusToken.balanceOf(user1)) / 1e18,
            (await plotusToken.balanceOf(user2)) / 1e18,
            (await plotusToken.balanceOf(user3)) / 1e18,
            (await plotusToken.balanceOf(user4)) / 1e18,
            (await plotusToken.balanceOf(user5)) / 1e18,
            (await plotusToken.balanceOf(user6)) / 1e18
        );
        console.log(
            (await web3.eth.getBalance(user1)) / 1e18,
            (await web3.eth.getBalance(user2)) / 1e18,
            (await web3.eth.getBalance(user3)) / 1e18,
            (await web3.eth.getBalance(user4)) / 1e18,
            (await web3.eth.getBalance(user5)) / 1e18,
            (await web3.eth.getBalance(user6)) / 1e18
        );

        await allMarkets.withdrawMax(10, { from: user1 });
        await allMarkets.withdrawMax(10, { from: user2 });
        await allMarkets.withdrawMax(10, { from: user3 });
        await allMarkets.withdrawMax(10, { from: user4 });
        await allMarkets.withdrawMax(10, { from: user5 });
        await allMarkets.withdrawMax(10, { from: user6 });

        console.log(
            (await plotusToken.balanceOf(user1)) / 1e18,
            (await plotusToken.balanceOf(user2)) / 1e18,
            (await plotusToken.balanceOf(user3)) / 1e18,
            (await plotusToken.balanceOf(user4)) / 1e18,
            (await plotusToken.balanceOf(user5)) / 1e18,
            (await plotusToken.balanceOf(user6)) / 1e18
        );
        console.log(
            (await web3.eth.getBalance(user1)) / 1e18,
            (await web3.eth.getBalance(user2)) / 1e18,
            (await web3.eth.getBalance(user3)) / 1e18,
            (await web3.eth.getBalance(user4)) / 1e18,
            (await web3.eth.getBalance(user5)) / 1e18,
            (await web3.eth.getBalance(user6)) / 1e18
        );
    });
});

describe("new_Multiplier 3. Bets Multiple options sheet", () => {
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
        marketUtility;
    let marketId = 1;
    let predictionPointsBeforeUser1, predictionPointsBeforeUser2, predictionPointsBeforeUser3, predictionPointsBeforeUser4;

    contract("AllMarkets", async function ([user1, user2, user3, user4, user5]) {
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
            allMarkets = await AllMarkets.new();
            await allMarkets.initiate(plotusToken.address, marketConfig.address);
            let date = await latestTime();
            await increaseTime(3610);
            date = Math.round(date);
            await marketConfig.setInitialCummulativePrice();
            await marketConfig.setAuthorizedAddress(allMarkets.address);
            let utility = await MockConfig.at("0xCBc7df3b8C870C5CDE675AaF5Fd823E4209546D2");
            await utility.setAuthorizedAddress(allMarkets.address);
            await mockUniswapV2Pair.sync();
            let mockChainLinkAggregator = await MockChainLinkAggregator.new();
            await allMarkets.addInitialMarketTypesAndStart(date, "0x5e2aa6b66531142bEAB830c385646F97fa03D80a", mockChainLinkAggregator.address);
            await increaseTime(3610);
            await allMarkets.createMarket(0, 0);
        });
        it("3.1 Scenario 1: player purchase 2 position in same option, in same currency and wins", async () => {
            await allMarkets.setOptionPrice(marketId, 1, 9);
            await allMarkets.setOptionPrice(marketId, 2, 18);
            await allMarkets.setOptionPrice(marketId, 3, 27);

            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            await allMarkets.deposit(toWei(500), { from: user1 });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(toWei(400), { from: user3 });

            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("100"), 1, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("400"), 1, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("400"), 1, { from: user2 });
            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("400"), 2, { from: user3 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 1)) / 1000;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 1)) / 1000;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 2)) / 1000;

            console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser2, predictionPointsBeforeUser3);

            await increaseTime(8 * 60 * 60);
            await allMarkets.postResultMock(1, marketId);
            await increaseTime(8 * 60 * 60);

            let returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[0][0]);
            let returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[0][0]);
            let returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[0][0]);
            returnUser1 = returnUser1 / 1e18;
            returnUser2 = returnUser2 / 1e18;
            returnUser3 = returnUser3 / 1e18;
            console.log(returnUser1, returnUser2, returnUser3);

            returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[0][1]);
            returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[0][1]);
            returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[0][1]);
            returnUser1 = returnUser1 / 1e18;
            returnUser2 = returnUser2 / 1e18;
            returnUser3 = returnUser3 / 1e18;
            console.log(returnUser1, returnUser2, returnUser3);

            returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[2]);
            returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[2]);
            returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[2]);
            returnUser1 = returnUser1 / 1e18;
            returnUser2 = returnUser2 / 1e18;
            returnUser3 = returnUser3 / 1e18;
            console.log(returnUser1, returnUser2, returnUser3);

            console.log(
                (await plotusToken.balanceOf(user1)) / 1e18,
                (await plotusToken.balanceOf(user2)) / 1e18,
                (await plotusToken.balanceOf(user3)) / 1e18,
                (await plotusToken.balanceOf(user4)) / 1e18,
                (await plotusToken.balanceOf(user5)) / 1e18
            );
            console.log(
                (await web3.eth.getBalance(user1)) / 1e18,
                (await web3.eth.getBalance(user2)) / 1e18,
                (await web3.eth.getBalance(user3)) / 1e18,
                (await web3.eth.getBalance(user4)) / 1e18,
                (await web3.eth.getBalance(user5)) / 1e18
            );

            await allMarkets.withdrawMax(10, { from: user1 });
            await allMarkets.withdrawMax(10, { from: user2 });
            await allMarkets.withdrawMax(10, { from: user3 });
            await allMarkets.withdrawMax(10, { from: user4 });
            await allMarkets.withdrawMax(10, { from: user5 });

            console.log(
                (await plotusToken.balanceOf(user1)) / 1e18,
                (await plotusToken.balanceOf(user2)) / 1e18,
                (await plotusToken.balanceOf(user3)) / 1e18,
                (await plotusToken.balanceOf(user4)) / 1e18,
                (await plotusToken.balanceOf(user5)) / 1e18
            );
            console.log(
                (await web3.eth.getBalance(user1)) / 1e18,
                (await web3.eth.getBalance(user2)) / 1e18,
                (await web3.eth.getBalance(user3)) / 1e18,
                (await web3.eth.getBalance(user4)) / 1e18,
                (await web3.eth.getBalance(user5)) / 1e18
            );

            // assert.equal(predictionPointsBeforeUser1.toFixed(1), (55.5138941).toFixed(1));
            // assert.equal(predictionPointsBeforeUser2.toFixed(1), (932.6334208).toFixed(1));
            // assert.equal(predictionPointsBeforeUser3.toFixed(1), (366.391701).toFixed(1));
            // assert.equal(predictionPointsBeforeUser4.toFixed(1), (170.2426086).toFixed(1));
            // assert.equal(predictionPointsBeforeUser5.toFixed(1), (5.383543979).toFixed(1));
        });
        it("3.2. Scenario 2", async () => {
            await allMarkets.createMarket(0, 0);
            marketId++;

            await allMarkets.setOptionPrice(marketId, 1, 9);
            await allMarkets.setOptionPrice(marketId, 2, 18);
            await allMarkets.setOptionPrice(marketId, 3, 27);

            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            await allMarkets.deposit(toWei(500), { from: user1 });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(toWei(400), { from: user3 });

            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("100"), 2, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("400"), 2, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("400"), 1, { from: user2 });
            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("400"), 2, { from: user3 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1000;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 1)) / 1000;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 2)) / 1000;

            console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser2, predictionPointsBeforeUser3);

            await increaseTime(8 * 60 * 60);
            await allMarkets.postResultMock(1, marketId);
            await increaseTime(8 * 60 * 60);

            let returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[0][0]);
            let returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[0][0]);
            let returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[0][0]);
            returnUser1 = returnUser1 / 1e18;
            returnUser2 = returnUser2 / 1e18;
            returnUser3 = returnUser3 / 1e18;
            console.log(returnUser1, returnUser2, returnUser3);

            returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[0][1]);
            returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[0][1]);
            returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[0][1]);
            returnUser1 = returnUser1 / 1e18;
            returnUser2 = returnUser2 / 1e18;
            returnUser3 = returnUser3 / 1e18;
            console.log(returnUser1, returnUser2, returnUser3);

            returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[2]);
            returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[2]);
            returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[2]);
            returnUser1 = returnUser1 / 1e18;
            returnUser2 = returnUser2 / 1e18;
            returnUser3 = returnUser3 / 1e18;
            console.log(returnUser1, returnUser2, returnUser3);

            console.log(
                (await plotusToken.balanceOf(user1)) / 1e18,
                (await plotusToken.balanceOf(user2)) / 1e18,
                (await plotusToken.balanceOf(user3)) / 1e18
            );
            console.log(
                (await web3.eth.getBalance(user1)) / 1e18,
                (await web3.eth.getBalance(user2)) / 1e18,
                (await web3.eth.getBalance(user3)) / 1e18
            );

            await allMarkets.withdrawMax(10, { from: user1 });
            await allMarkets.withdrawMax(10, { from: user2 });
            await allMarkets.withdrawMax(10, { from: user3 });

            console.log(
                (await plotusToken.balanceOf(user1)) / 1e18,
                (await plotusToken.balanceOf(user2)) / 1e18,
                (await plotusToken.balanceOf(user3)) / 1e18
            );
            console.log(
                (await web3.eth.getBalance(user1)) / 1e18,
                (await web3.eth.getBalance(user2)) / 1e18,
                (await web3.eth.getBalance(user3)) / 1e18
            );
        });
        it("3.3. Scenario 3", async () => {
            await allMarkets.createMarket(0, 0);
            marketId++;

            await allMarkets.setOptionPrice(marketId, 1, 9);
            await allMarkets.setOptionPrice(marketId, 2, 18);
            await allMarkets.setOptionPrice(marketId, 3, 27);

            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            await allMarkets.deposit(toWei(500), { from: user1 });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(toWei(400), { from: user3 });

            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("100"), 1, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("400"), 2, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("400"), 1, { from: user2 });
            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("400"), 2, { from: user3 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 1)) / 1000;
            predictionPointsBeforeUser1_2 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1000;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 1)) / 1000;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 2)) / 1000;

            console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser1_2, predictionPointsBeforeUser2, predictionPointsBeforeUser3);

            await increaseTime(8 * 60 * 60);
            await allMarkets.postResultMock(1, marketId);
            await increaseTime(8 * 60 * 60);

            let returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[0][0]);
            let returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[0][0]);
            let returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[0][0]);
            returnUser1 = returnUser1 / 1e18;
            returnUser2 = returnUser2 / 1e18;
            returnUser3 = returnUser3 / 1e18;
            console.log(returnUser1, returnUser2, returnUser3);

            returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[0][1]);
            returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[0][1]);
            returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[0][1]);
            returnUser1 = returnUser1 / 1e18;
            returnUser2 = returnUser2 / 1e18;
            returnUser3 = returnUser3 / 1e18;
            console.log(returnUser1, returnUser2, returnUser3);

            returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[2]);
            returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[2]);
            returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[2]);
            returnUser1 = returnUser1 / 1e18;
            returnUser2 = returnUser2 / 1e18;
            returnUser3 = returnUser3 / 1e18;
            console.log(returnUser1, returnUser2, returnUser3);

            console.log(
                (await plotusToken.balanceOf(user1)) / 1e18,
                (await plotusToken.balanceOf(user2)) / 1e18,
                (await plotusToken.balanceOf(user3)) / 1e18
            );
            console.log(
                (await web3.eth.getBalance(user1)) / 1e18,
                (await web3.eth.getBalance(user2)) / 1e18,
                (await web3.eth.getBalance(user3)) / 1e18
            );

            await allMarkets.withdrawMax(10, { from: user1 });
            await allMarkets.withdrawMax(10, { from: user2 });
            await allMarkets.withdrawMax(10, { from: user3 });

            console.log(
                (await plotusToken.balanceOf(user1)) / 1e18,
                (await plotusToken.balanceOf(user2)) / 1e18,
                (await plotusToken.balanceOf(user3)) / 1e18
            );
            console.log(
                (await web3.eth.getBalance(user1)) / 1e18,
                (await web3.eth.getBalance(user2)) / 1e18,
                (await web3.eth.getBalance(user3)) / 1e18
            );
        });
        it("3.4. Scenario 4", async () => {
            await allMarkets.createMarket(0, 0);
            marketId++;

            await allMarkets.setOptionPrice(marketId, 1, 9);
            await allMarkets.setOptionPrice(marketId, 2, 18);
            await allMarkets.setOptionPrice(marketId, 3, 27);

            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            await allMarkets.deposit(0, { value: toWei(4), from: user1 });
            await allMarkets.deposit(toWei(400), { from: user1 });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(toWei(400), { from: user3 });

            await allMarkets.placePrediction(marketId, ethAddress, toWei("4"), 1, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("400"), 1, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("400"), 3, { from: user2 });
            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("400"), 2, { from: user3 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 1)) / 1000;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 3)) / 1000;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 2)) / 1000;

            console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser2, predictionPointsBeforeUser3);

            await increaseTime(8 * 60 * 60);
            await allMarkets.postResultMock(1, marketId);
            await increaseTime(8 * 60 * 60);

            let returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[0][0]);
            let returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[0][0]);
            let returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[0][0]);
            returnUser1 = returnUser1 / 1e18;
            returnUser2 = returnUser2 / 1e18;
            returnUser3 = returnUser3 / 1e18;
            console.log(returnUser1, returnUser2, returnUser3);

            returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[0][1]);
            returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[0][1]);
            returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[0][1]);
            returnUser1 = returnUser1 / 1e18;
            returnUser2 = returnUser2 / 1e18;
            returnUser3 = returnUser3 / 1e18;
            console.log(returnUser1, returnUser2, returnUser3);

            returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[2]);
            returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[2]);
            returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[2]);
            returnUser1 = returnUser1 / 1e18;
            returnUser2 = returnUser2 / 1e18;
            returnUser3 = returnUser3 / 1e18;
            console.log(returnUser1, returnUser2, returnUser3);

            console.log(
                (await plotusToken.balanceOf(user1)) / 1e18,
                (await plotusToken.balanceOf(user2)) / 1e18,
                (await plotusToken.balanceOf(user3)) / 1e18
            );
            console.log(
                (await web3.eth.getBalance(user1)) / 1e18,
                (await web3.eth.getBalance(user2)) / 1e18,
                (await web3.eth.getBalance(user3)) / 1e18
            );

            await allMarkets.withdrawMax(10, { from: user1 });
            await allMarkets.withdrawMax(10, { from: user2 });
            await allMarkets.withdrawMax(10, { from: user3 });

            console.log(
                (await plotusToken.balanceOf(user1)) / 1e18,
                (await plotusToken.balanceOf(user2)) / 1e18,
                (await plotusToken.balanceOf(user3)) / 1e18
            );
            console.log(
                (await web3.eth.getBalance(user1)) / 1e18,
                (await web3.eth.getBalance(user2)) / 1e18,
                (await web3.eth.getBalance(user3)) / 1e18
            );
        });
        it("3.5. Scenario 5", async () => {
            await allMarkets.createMarket(0, 0);
            marketId++;

            await allMarkets.setOptionPrice(marketId, 1, 9);
            await allMarkets.setOptionPrice(marketId, 2, 18);
            await allMarkets.setOptionPrice(marketId, 3, 27);

            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            await allMarkets.deposit(toWei(100), { from: user1 });
            await allMarkets.deposit(0, { value: toWei(4), from: user1 });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(toWei(400), { from: user3 });

            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("100"), 2, { from: user1 });
            await allMarkets.placePrediction(marketId, ethAddress, toWei("4"), 2, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("400"), 3, { from: user2 });
            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("400"), 1, { from: user3 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1000;
            predictionPointsBeforeUser1_2 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1000;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 3)) / 1000;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 1)) / 1000;

            console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser1_2, predictionPointsBeforeUser2, predictionPointsBeforeUser3);

            await increaseTime(8 * 60 * 60);
            await allMarkets.postResultMock(1, marketId);
            await increaseTime(8 * 60 * 60);

            let returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[0][0]);
            let returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[0][0]);
            let returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[0][0]);
            returnUser1 = returnUser1 / 1e18;
            returnUser2 = returnUser2 / 1e18;
            returnUser3 = returnUser3 / 1e18;
            console.log(returnUser1, returnUser2, returnUser3);

            returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[0][1]);
            returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[0][1]);
            returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[0][1]);
            returnUser1 = returnUser1 / 1e18;
            returnUser2 = returnUser2 / 1e18;
            returnUser3 = returnUser3 / 1e18;
            console.log(returnUser1, returnUser2, returnUser3);

            returnUser1 = parseFloat((await allMarkets.getReturn(user1, marketId))[2]);
            returnUser2 = parseFloat((await allMarkets.getReturn(user2, marketId))[2]);
            returnUser3 = parseFloat((await allMarkets.getReturn(user3, marketId))[2]);
            returnUser1 = returnUser1 / 1e18;
            returnUser2 = returnUser2 / 1e18;
            returnUser3 = returnUser3 / 1e18;
            console.log(returnUser1, returnUser2, returnUser3);

            console.log(
                (await plotusToken.balanceOf(user1)) / 1e18,
                (await plotusToken.balanceOf(user2)) / 1e18,
                (await plotusToken.balanceOf(user3)) / 1e18
            );
            console.log(
                (await web3.eth.getBalance(user1)) / 1e18,
                (await web3.eth.getBalance(user2)) / 1e18,
                (await web3.eth.getBalance(user3)) / 1e18
            );

            await allMarkets.withdrawMax(10, { from: user1 });
            await allMarkets.withdrawMax(10, { from: user2 });
            await allMarkets.withdrawMax(10, { from: user3 });

            console.log(
                (await plotusToken.balanceOf(user1)) / 1e18,
                (await plotusToken.balanceOf(user2)) / 1e18,
                (await plotusToken.balanceOf(user3)) / 1e18
            );
            console.log(
                (await web3.eth.getBalance(user1)) / 1e18,
                (await web3.eth.getBalance(user2)) / 1e18,
                (await web3.eth.getBalance(user3)) / 1e18
            );
        });
        it("3.6. Scenario 6,7 and 8", async () => {
            await allMarkets.createMarket(0, 2);
            marketId++;
            const scenario6MarketId = marketId;

            await allMarkets.setOptionPrice(marketId, 1, 9);
            await allMarkets.setOptionPrice(marketId, 2, 18);
            await allMarkets.setOptionPrice(marketId, 3, 27);

            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            await allMarkets.deposit(toWei(100), { from: user1 });
            await allMarkets.deposit(0, { value: toWei(4), from: user1 });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(toWei(400), { from: user3 });

            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("100"), 1, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("4"), 2, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("400"), 3, { from: user2 });
            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("400"), 1, { from: user3 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 1)) / 1000;
            predictionPointsBeforeUser1_2 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1000;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 3)) / 1000;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 1)) / 1000;

            console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser1_2, predictionPointsBeforeUser2, predictionPointsBeforeUser3);

            await allMarkets.createMarket(0, 0);
            marketId++;
            const scenario7MarketId = marketId;

            await allMarkets.setOptionPrice(marketId, 1, 9);
            await allMarkets.setOptionPrice(marketId, 2, 18);
            await allMarkets.setOptionPrice(marketId, 3, 27);

            await plotusToken.transfer(user2, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await allMarkets.deposit(toWei(100), { from: user1 });
            await allMarkets.deposit(0, { value: toWei(4), from: user1 });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(0, { value: toWei(4), from: user3 });

            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("100"), 1, { from: user1 });
            await allMarkets.placePrediction(marketId, ethAddress, toWei("4"), 2, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("400"), 3, { from: user2 });
            await allMarkets.placePrediction(marketId, ethAddress, toWei("4"), 1, { from: user3 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 1)) / 1000;
            predictionPointsBeforeUser1_2 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1000;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 3)) / 1000;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 1)) / 1000;

            console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser1_2, predictionPointsBeforeUser2, predictionPointsBeforeUser3);

            await allMarkets.createMarket(0, 1);
            marketId++;
            const scenario8MarketId = marketId;
            await allMarkets.setOptionPrice(marketId, 1, 9);
            await allMarkets.setOptionPrice(marketId, 2, 18);
            await allMarkets.setOptionPrice(marketId, 3, 27);

            await plotusToken.transfer(user2, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await allMarkets.deposit(toWei(100), { from: user1 });
            await allMarkets.deposit(0, { value: toWei(4), from: user1 });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(0, { value: toWei(4), from: user3 });

            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("100"), 1, { from: user1 });
            await allMarkets.placePrediction(marketId, ethAddress, toWei("4"), 2, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, toWei("400"), 3, { from: user2 });
            await allMarkets.placePrediction(marketId, ethAddress, toWei("4"), 1, { from: user3 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 1)) / 1000;
            predictionPointsBeforeUser1_2 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1000;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 3)) / 1000;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 1)) / 1000;

            console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser1_2, predictionPointsBeforeUser2, predictionPointsBeforeUser3);

            await increaseTime(3601);
            let neutralMinValue = (await allMarkets.marketData(scenario8MarketId)).neutralMinValue / 1;
            let neutralMaxValue = (await allMarkets.marketData(scenario8MarketId)).neutralMaxValue / 1;
            let betweenNeutral = neutralMaxValue + neutralMinValue / 2;
            await allMarkets.postResultMock(1, scenario7MarketId);
            neutralMaxValue = (await allMarkets.marketData(scenario8MarketId)).neutralMaxValue / 1;
            await allMarkets.postResultMock(neutralMaxValue + 1, scenario8MarketId);
            await increaseTime(3601);

            console.log(
                (await plotusToken.balanceOf(user1)) / 1e18,
                (await plotusToken.balanceOf(user2)) / 1e18,
                (await plotusToken.balanceOf(user3)) / 1e18
            );
            console.log(
                (await web3.eth.getBalance(user1)) / 1e18,
                (await web3.eth.getBalance(user2)) / 1e18,
                (await web3.eth.getBalance(user3)) / 1e18
            );

            await allMarkets.withdrawMax(10, { from: user1 });
            await allMarkets.withdrawMax(10, { from: user2 });
            await allMarkets.withdrawMax(10, { from: user3 });

            console.log(
                (await plotusToken.balanceOf(user1)) / 1e18,
                (await plotusToken.balanceOf(user2)) / 1e18,
                (await plotusToken.balanceOf(user3)) / 1e18
            );
            console.log(
                (await web3.eth.getBalance(user1)) / 1e18,
                (await web3.eth.getBalance(user2)) / 1e18,
                (await web3.eth.getBalance(user3)) / 1e18
            );

            await increaseTime(60 * 60 * 24 * 2);
            await allMarkets.postResultMock(1, scenario6MarketId);
            await increaseTime(60 * 60 * 24 * 2);

            await allMarkets.withdrawMax(10, { from: user1 });
            await allMarkets.withdrawMax(10, { from: user2 });
            await allMarkets.withdrawMax(10, { from: user3 });

            console.log(
                (await plotusToken.balanceOf(user1)) / 1e18,
                (await plotusToken.balanceOf(user2)) / 1e18,
                (await plotusToken.balanceOf(user3)) / 1e18
            );
            console.log(
                (await web3.eth.getBalance(user1)) / 1e18,
                (await web3.eth.getBalance(user2)) / 1e18,
                (await web3.eth.getBalance(user3)) / 1e18
            );
        });
    });
});
