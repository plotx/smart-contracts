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
const to8Power = (number) => String(parseFloat(number) * 1e8);

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
            allMarkets = await AllMarkets.at(await masterInstance.getLatestAddress(web3.utils.toHex("AM")));
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
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("100"), 1, { from: user3 });

            await mockMarketConfig.setNextOptionPrice(18);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[1] / 1, 18);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("100"), 2, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 2, { from: user2 });

            await mockMarketConfig.setNextOptionPrice(27);
            assert.equal((await allMarkets.getMarketData(marketId))._optionPrice[2] / 1, 27);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("100"), 3, { from: user4 });
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("10"), 3, { from: user5 });

            predictionPointsBeforeUser1 = (await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1e5;
            predictionPointsBeforeUser2 = (await allMarkets.getUserPredictionPoints(user2, marketId, 2)) / 1e5;
            predictionPointsBeforeUser3 = (await allMarkets.getUserPredictionPoints(user3, marketId, 1)) / 1e5;
            predictionPointsBeforeUser4 = (await allMarkets.getUserPredictionPoints(user4, marketId, 3)) / 1e5;
            predictionPointsBeforeUser5 = (await allMarkets.getUserPredictionPoints(user5, marketId, 3)) / 1e5;
            // console.log( //     predictionPointsBeforeUser1, //     predictionPointsBeforeUser2, //     predictionPointsBeforeUser3, //     predictionPointsBeforeUser4, //     predictionPointsBeforeUser5 // );

            const expectedPredictionPoints = [55.52777778, 222.1111111, 111.0555556, 37.01851852, 3.701851852];
            const predictionPointArray = [
                predictionPointsBeforeUser1,
                predictionPointsBeforeUser2,
                predictionPointsBeforeUser3,
                predictionPointsBeforeUser4,
                predictionPointsBeforeUser5,
            ];
            for (let i = 0; i < 5; i++) {
                    assert.equal(parseInt(expectedPredictionPoints[i]), parseInt(predictionPointArray[i]));
            }

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
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("100"), 1, { from: user3 });

            await mockMarketConfig.setNextOptionPrice(18);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("100"), 2, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 2, { from: user2 });

            await mockMarketConfig.setNextOptionPrice(27);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("100"), 3, { from: user4 });
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("10"), 3, { from: user5 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1e5;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 2)) / 1e5;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 1)) / 1e5;
            predictionPointsBeforeUser4 = parseFloat(await allMarkets.getUserPredictionPoints(user4, marketId, 3)) / 1e5;
            predictionPointsBeforeUser5 = parseFloat(await allMarkets.getUserPredictionPoints(user5, marketId, 3)) / 1e5;
            // console.log( //     predictionPointsBeforeUser1, //     predictionPointsBeforeUser2, //     predictionPointsBeforeUser3, //     predictionPointsBeforeUser4, //     predictionPointsBeforeUser5 // );

            const expectedPredictionPoints = [116.6083333, 310.9555556, 233.2166667, 77.73888889, 3.701851852];
            const predictionPointArray = [
                predictionPointsBeforeUser1,
                predictionPointsBeforeUser2,
                predictionPointsBeforeUser3,
                predictionPointsBeforeUser4,
                predictionPointsBeforeUser5,
            ];
            for (let i = 0; i < 5; i++) {
                    assert.equal(parseInt(expectedPredictionPoints[i]), parseInt(predictionPointArray[i]));
            }

            await increaseTime(8 * 60 * 60);
            await allMarkets.postResultMock(1, marketId);
            await increaseTime(8 * 60 * 60);
        });
    });
});

describe("new_multiplier 2. Multiplier sheet eth prediction", () => {
    contract("AllMarket", async function ([user1, user2, user3, user4, user5, userMarketCreator]) {
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
            allMarkets = await AllMarkets.at(await masterInstance.getLatestAddress(web3.utils.toHex("AM")));
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
            await mockMarketConfig.setPrice("1000000000000000");

            await allMarkets.deposit(0, { from: user1, value: toWei("11") });
            await allMarkets.deposit(0, { from: user2, value: toWei("1") });
            await allMarkets.deposit(0, { from: user3, value: toWei("1") });
            await allMarkets.deposit(0, { from: user4, value: toWei("1") });
            await allMarkets.deposit(0, { from: user5, value: toWei("0.2") });

            await mockMarketConfig.setNextOptionPrice(9);
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("10"), 1, { from: user1 });
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("1"), 1, { from: user4 });

            await mockMarketConfig.setNextOptionPrice(18);
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("1"), 2, { from: user1 });
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("1"), 2, { from: user2 });
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("0.2"), 2, { from: user5 });

            await mockMarketConfig.setNextOptionPrice(27);
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("1"), 3, { from: user3 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 1)) / 1e5;
            predictionPointsBeforeUser1_2 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1e5;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 2)) / 1e5;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 3)) / 1e5;
            predictionPointsBeforeUser4 = parseFloat(await allMarkets.getUserPredictionPoints(user4, marketId, 1)) / 1e5;
            predictionPointsBeforeUser5 = parseFloat(await allMarkets.getUserPredictionPoints(user5, marketId, 2)) / 1e5;
            // console.log( //     predictionPointsBeforeUser1, //     predictionPointsBeforeUser1_2, //     predictionPointsBeforeUser2, //     predictionPointsBeforeUser3, //     predictionPointsBeforeUser4, //     predictionPointsBeforeUser5 // );

            const expectedPredictionPoints = [1110, 55.5, 55.5, 37, 111, 11.1];
            const predictionPointArray = [
                predictionPointsBeforeUser1,
                predictionPointsBeforeUser1_2,
                predictionPointsBeforeUser2,
                predictionPointsBeforeUser3,
                predictionPointsBeforeUser4,
                predictionPointsBeforeUser5,
            ];
            for (let i = 0; i < 5; i++) {
                    assert.equal(parseInt(expectedPredictionPoints[i]), parseInt(predictionPointArray[i]));
            }

            await increaseTime(8 * 60 * 60);
            await allMarkets.postResultMock(1, marketId);
            await increaseTime(8 * 60 * 60);
        });
        it("2.2 Positions After locking PLOT tokens", async () => {
            await allMarkets.createMarket(0, 0);
            marketId++;

            await plotusToken.transfer(user2, toWei(1000));
            await plotusToken.transfer(user3, toWei(100000));
            await plotusToken.transfer(user4, toWei(200000));
            await plotusToken.transfer(user5, toWei(11000));

            await plotusToken.approve(tokenController.address, toWei("1000000"), { from: user1 });
            await plotusToken.approve(tokenController.address, toWei("1000000"), { from: user2 });
            await plotusToken.approve(tokenController.address, toWei("1000000"), { from: user3 });
            await plotusToken.approve(tokenController.address, toWei("1000000"), { from: user4 });
            await plotusToken.approve(tokenController.address, toWei("1000000"), { from: user5 });
            await tokenController.lock("0x534d", toWei("110000"), 86400 * 30, { from: user1 });
            await tokenController.lock("0x534d", toWei("1000"), 86400 * 30, { from: user2 });
            await tokenController.lock("0x534d", toWei("100000"), 86400 * 30, { from: user3 });
            await tokenController.lock("0x534d", toWei("200000"), 86400 * 30, { from: user4 });
            await tokenController.lock("0x534d", toWei("11000"), 86400 * 30, { from: user5 });

            await allMarkets.deposit(0, { from: user1, value: toWei("11") });
            await allMarkets.deposit(0, { from: user2, value: toWei("1") });
            await allMarkets.deposit(0, { from: user3, value: toWei("1") });
            await allMarkets.deposit(0, { from: user4, value: toWei("1") });
            await allMarkets.deposit(0, { from: user5, value: toWei("0.2") });

            await mockMarketConfig.setNextOptionPrice(9);
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("10"), 1, { from: user1 });
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("1"), 1, { from: user4 });

            await mockMarketConfig.setNextOptionPrice(18);
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("1"), 2, { from: user1 });
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("1"), 2, { from: user2 });
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("0.2"), 2, { from: user5 });

            await mockMarketConfig.setNextOptionPrice(27);
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("1"), 3, { from: user3 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 1)) / 1e5;
            predictionPointsBeforeUser1_2 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) / 1e5;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 2)) / 1e5;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 3)) / 1e5;
            predictionPointsBeforeUser4 = parseFloat(await allMarkets.getUserPredictionPoints(user4, marketId, 1)) /  1e5;
            predictionPointsBeforeUser5 = parseFloat(await allMarkets.getUserPredictionPoints(user5, marketId, 2)) /  1e5;
            // console.log( //     predictionPointsBeforeUser1, //     predictionPointsBeforeUser1_2, //     predictionPointsBeforeUser2, //     predictionPointsBeforeUser3, //     predictionPointsBeforeUser4, //     predictionPointsBeforeUser5 // );

            const expectedPredictionPoints = [2331, 55.5, 61.05, 407, 2331, 11.1];
            const predictionPointArray = [
                predictionPointsBeforeUser1,
                predictionPointsBeforeUser1_2,
                predictionPointsBeforeUser2,
                predictionPointsBeforeUser3,
                predictionPointsBeforeUser4,
                predictionPointsBeforeUser5,
            ];
            for (let i = 0; i < 5; i++) {
                assert.equal(parseInt(expectedPredictionPoints[i]), parseInt(predictionPointArray[i]));
            }

            await increaseTime(8 * 60 * 60);
            await allMarkets.postResultMock(1, marketId);
            await increaseTime(8 * 60 * 60);
        });
    });
});

describe("new_Multiplier 3. Bets Multiple options sheet", () => {
    contract("AllMarket", async function ([user1, user2, user3, user4, user5, user6, userMarketCreator]) {
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
            allMarkets = await AllMarkets.at(await masterInstance.getLatestAddress(web3.utils.toHex("AM")));
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
        it("3.1 Scenario 1: player purchase 2 position in same option, in same currency and wins", async () => {
            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            await allMarkets.deposit(toWei(500), { from: user1 });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(toWei(400), { from: user3 });

            await mockMarketConfig.setNextOptionPrice(90);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("100"), 1, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 1, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 1, { from: user2 });
            await mockMarketConfig.setNextOptionPrice(180);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 2, { from: user3 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 1)) /  1e5;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 1)) /  1e5;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 2)) /  1e5;

            // console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser2, predictionPointsBeforeUser3);

            const expectedPredictionPoints = [11.10555556 + 44.42222222, 44.42222222, 22.21111111];
            const expectedPLOTReturn = [144.1501111 + 576.6004444, 576.6004444, 0];
            const expectedETHReturn = [0, 0, 0];

            const predictionPointArray = [
                predictionPointsBeforeUser1,
                predictionPointsBeforeUser2,
                predictionPointsBeforeUser3,
            ];

            await increaseTime(8 * 60 * 60);
            await allMarkets.postResultMock(1, marketId);
            await increaseTime(8 * 60 * 60);

            let returnUser1 = (await allMarkets.getReturn(user1, marketId))[0][0] / 1e8;
            let returnUser2 = (await allMarkets.getReturn(user2, marketId))[0][0] / 1e8;
            let returnUser3 = (await allMarkets.getReturn(user3, marketId))[0][0] / 1e8;
            const plotReturn = [returnUser1, returnUser2, returnUser3]

            let returnETHUser1 = (await allMarkets.getReturn(user1, marketId))[0][1] / 1e8;
            let returnETHUser2 = (await allMarkets.getReturn(user2, marketId))[0][1] / 1e8;
            let returnETHUser3 = (await allMarkets.getReturn(user3, marketId))[0][1] / 1e8;
            const ethReturn = [returnETHUser1, returnETHUser2, returnETHUser3]

            // console.log( //     (await plotusToken.balanceOf(user1)) / 1e18, //     (await plotusToken.balanceOf(user2)) / 1e18, //     (await plotusToken.balanceOf(user3)) / 1e18, //     (await plotusToken.balanceOf(user4)) / 1e18, //     (await plotusToken.balanceOf(user5)) / 1e18 // ); // console.log( //     (await web3.eth.getBalance(user1)) / 1e18, //     (await web3.eth.getBalance(user2)) / 1e18, //     (await web3.eth.getBalance(user3)) / 1e18, //     (await web3.eth.getBalance(user4)) / 1e18, //     (await web3.eth.getBalance(user5)) / 1e18 // );

            await allMarkets.withdrawMax(10, { from: user1 });
            await allMarkets.withdrawMax(10, { from: user2 });
            await assertRevert(allMarkets.withdrawMax(10, { from: user3 }));

            // console.log( //     (await plotusToken.balanceOf(user1)) / 1e18, //     (await plotusToken.balanceOf(user2)) / 1e18, //     (await plotusToken.balanceOf(user3)) / 1e18, //     (await plotusToken.balanceOf(user4)) / 1e18, //     (await plotusToken.balanceOf(user5)) / 1e18 // ); // console.log( //     (await web3.eth.getBalance(user1)) / 1e18, //     (await web3.eth.getBalance(user2)) / 1e18, //     (await web3.eth.getBalance(user3)) / 1e18, //     (await web3.eth.getBalance(user4)) / 1e18, //     (await web3.eth.getBalance(user5)) / 1e18 // );

            for (let i = 0; i < 3; i++) {
                assert.equal(expectedPredictionPoints[i].toFixed(1), predictionPointArray[i].toFixed(1));
                assert.equal(expectedPLOTReturn[i].toFixed(3), plotReturn[i].toFixed(3))
                assert.equal(expectedETHReturn[i].toFixed(3), ethReturn[i].toFixed(3))
            }
        });
        it("3.2. Scenario 2", async () => {
            await allMarkets.createMarket(0, 0);
            marketId++;

            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            await allMarkets.deposit(toWei(500), { from: user1 });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(toWei(400), { from: user3 });

            await mockMarketConfig.setNextOptionPrice(90);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 1, { from: user2 });
            await mockMarketConfig.setNextOptionPrice(180);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("100"), 2, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 2, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 2, { from: user3 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) /  1e5;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 1)) /  1e5;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 2)) /  1e5;

            // console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser2, predictionPointsBeforeUser3);

            const expectedPredictionPoints = [5.552777778 + 22.21111111, 44.42222222, 22.21111111];
            const expectedPLOTReturn = [0 + 0, 1294.85225, 0];
            const expectedETHReturn = [0, 0, 0];

            const predictionPointArray = [
                predictionPointsBeforeUser1,
                predictionPointsBeforeUser2,
                predictionPointsBeforeUser3,
            ];

            await increaseTime(8 * 60 * 60);
            await allMarkets.postResultMock(1, marketId);
            await increaseTime(8 * 60 * 60);

            let returnUser1 = (await allMarkets.getReturn(user1, marketId))[0][0] / 1e8;
            let returnUser2 = (await allMarkets.getReturn(user2, marketId))[0][0] / 1e8;
            let returnUser3 = (await allMarkets.getReturn(user3, marketId))[0][0] / 1e8;
            const plotReturn = [returnUser1, returnUser2, returnUser3]

            let returnETHUser1 = (await allMarkets.getReturn(user1, marketId))[0][1] / 1e8;
            let returnETHUser2 = (await allMarkets.getReturn(user2, marketId))[0][1] / 1e8;
            let returnETHUser3 = (await allMarkets.getReturn(user3, marketId))[0][1] / 1e8;
            const ethReturn = [returnETHUser1, returnETHUser2, returnETHUser3]

            // console.log( //     (await plotusToken.balanceOf(user1)) / 1e18, //     (await plotusToken.balanceOf(user2)) / 1e18, //     (await plotusToken.balanceOf(user3)) / 1e18, //     (await plotusToken.balanceOf(user4)) / 1e18, //     (await plotusToken.balanceOf(user5)) / 1e18 // ); // console.log( //     (await web3.eth.getBalance(user1)) / 1e18, //     (await web3.eth.getBalance(user2)) / 1e18, //     (await web3.eth.getBalance(user3)) / 1e18, //     (await web3.eth.getBalance(user4)) / 1e18, //     (await web3.eth.getBalance(user5)) / 1e18 // );

            await allMarkets.withdrawMax(10, { from: user2 });
            await assertRevert(allMarkets.withdrawMax(10, { from: user1 }));
            await assertRevert(allMarkets.withdrawMax(10, { from: user3 }));

            // console.log( //     (await plotusToken.balanceOf(user1)) / 1e18, //     (await plotusToken.balanceOf(user2)) / 1e18, //     (await plotusToken.balanceOf(user3)) / 1e18, //     (await plotusToken.balanceOf(user4)) / 1e18, //     (await plotusToken.balanceOf(user5)) / 1e18 // ); // console.log( //     (await web3.eth.getBalance(user1)) / 1e18, //     (await web3.eth.getBalance(user2)) / 1e18, //     (await web3.eth.getBalance(user3)) / 1e18, //     (await web3.eth.getBalance(user4)) / 1e18, //     (await web3.eth.getBalance(user5)) / 1e18 // );

            for (let i = 0; i < 3; i++) {
                assert.equal(expectedPredictionPoints[i].toFixed(1), predictionPointArray[i].toFixed(1));
                assert.equal(expectedPLOTReturn[i].toFixed(3), plotReturn[i].toFixed(3))
                assert.equal(expectedETHReturn[i].toFixed(3), ethReturn[i].toFixed(3))
            }
        });
        it("3.3. Scenario 3", async () => {
            await allMarkets.createMarket(0, 0);
            marketId++;

            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            await allMarkets.deposit(toWei(500), { from: user1 });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(toWei(400), { from: user3 });

            await mockMarketConfig.setNextOptionPrice(90);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("100"), 1, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 1, { from: user2 });

            await mockMarketConfig.setNextOptionPrice(180);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 2, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 2, { from: user3 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 1)) /  1e5;
            predictionPointsBeforeUser1_2 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) /  1e5;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 1)) /  1e5;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 2)) /  1e5;

            // console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser1_2, predictionPointsBeforeUser2, predictionPointsBeforeUser3);

            const expectedPredictionPoints = [11.10555556, 22.21111111, 44.42222222, 22.21111111];
            const expectedETHReturn = [0, 0, 0];
            const expectedPLOTReturn = [259.0704, 1036.2816, 0];

            const predictionPointArray = [
                predictionPointsBeforeUser1,
                predictionPointsBeforeUser1_2,
                predictionPointsBeforeUser2,
                predictionPointsBeforeUser3,
            ];

            await increaseTime(8 * 60 * 60);
            await allMarkets.postResultMock(1, marketId);
            await increaseTime(8 * 60 * 60);

            let returnUser1 = (await allMarkets.getReturn(user1, marketId))[0][0] / 1e8;
            let returnUser2 = (await allMarkets.getReturn(user2, marketId))[0][0] / 1e8;
            let returnUser3 = (await allMarkets.getReturn(user3, marketId))[0][0] / 1e8;
            const plotReturn = [returnUser1, returnUser2, returnUser3]

            let returnETHUser1 = (await allMarkets.getReturn(user1, marketId))[0][1] / 1e8;
            let returnETHUser2 = (await allMarkets.getReturn(user2, marketId))[0][1] / 1e8;
            let returnETHUser3 = (await allMarkets.getReturn(user3, marketId))[0][1] / 1e8;
            const ethReturn = [returnETHUser1, returnETHUser2, returnETHUser3]

            // console.log( //     (await plotusToken.balanceOf(user1)) / 1e18, //     (await plotusToken.balanceOf(user2)) / 1e18, //     (await plotusToken.balanceOf(user3)) / 1e18, //     (await plotusToken.balanceOf(user4)) / 1e18, //     (await plotusToken.balanceOf(user5)) / 1e18 // ); // console.log( //     (await web3.eth.getBalance(user1)) / 1e18, //     (await web3.eth.getBalance(user2)) / 1e18, //     (await web3.eth.getBalance(user3)) / 1e18, //     (await web3.eth.getBalance(user4)) / 1e18, //     (await web3.eth.getBalance(user5)) / 1e18 // );

            await allMarkets.withdrawMax(10, { from: user1 });
            await allMarkets.withdrawMax(10, { from: user2 });
            await assertRevert(allMarkets.withdrawMax(10, { from: user3 }));

            // console.log( //     (await plotusToken.balanceOf(user1)) / 1e18, //     (await plotusToken.balanceOf(user2)) / 1e18, //     (await plotusToken.balanceOf(user3)) / 1e18, //     (await plotusToken.balanceOf(user4)) / 1e18, //     (await plotusToken.balanceOf(user5)) / 1e18 // ); // console.log( //     (await web3.eth.getBalance(user1)) / 1e18, //     (await web3.eth.getBalance(user2)) / 1e18, //     (await web3.eth.getBalance(user3)) / 1e18, //     (await web3.eth.getBalance(user4)) / 1e18, //     (await web3.eth.getBalance(user5)) / 1e18 // );
            for (let i = 0; i < 4; i++) {
                assert.equal(expectedPredictionPoints[i].toFixed(1), predictionPointArray[i].toFixed(1));
            }

            for (let i = 0; i < 3; i++) {
                assert.equal(expectedPLOTReturn[i].toFixed(3), plotReturn[i].toFixed(3))
                assert.equal(expectedETHReturn[i].toFixed(3), ethReturn[i].toFixed(3))
            }
        });
        it("3.4. Scenario 4", async () => {
            await allMarkets.createMarket(0, 0);
            marketId++;

            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            await allMarkets.deposit(0, { value: toWei(4), from: user1 });
            await allMarkets.deposit(toWei(400), { from: user1 });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(toWei(400), { from: user3 });

            await mockMarketConfig.setNextOptionPrice(90);
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("4"), 1, { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 1, { from: user1 });

            await mockMarketConfig.setNextOptionPrice(180);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 2, { from: user3 });

            await mockMarketConfig.setNextOptionPrice(270);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 3, { from: user2 });


            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 1)) /  1e5;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 3)) /  1e5;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 2)) /  1e5;

            // console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser2, predictionPointsBeforeUser3);

            const expectedPredictionPoints = [44.4 + 44.42222222, 14.80740741, 22.21111111];
            const expectedETHReturn = [3.996 + 0, 0, 0];
            const expectedPLOTReturn = [397.7014751 + 797.7005249, 0, 0];

            const predictionPointArray = [
                predictionPointsBeforeUser1,
                predictionPointsBeforeUser2,
                predictionPointsBeforeUser3,
            ];

            await increaseTime(8 * 60 * 60);
            await allMarkets.postResultMock(1, marketId);
            await increaseTime(8 * 60 * 60);

            let returnUser1 = (await allMarkets.getReturn(user1, marketId))[0][0] / 1e8;
            let returnUser2 = (await allMarkets.getReturn(user2, marketId))[0][0] / 1e8;
            let returnUser3 = (await allMarkets.getReturn(user3, marketId))[0][0] / 1e8;
            const plotReturn = [returnUser1, returnUser2, returnUser3]

            let returnETHUser1 = (await allMarkets.getReturn(user1, marketId))[0][1] / 1e8;
            let returnETHUser2 = (await allMarkets.getReturn(user2, marketId))[0][1] / 1e8;
            let returnETHUser3 = (await allMarkets.getReturn(user3, marketId))[0][1] / 1e8;
            const ethReturn = [returnETHUser1, returnETHUser2, returnETHUser3]

            // console.log( //     (await plotusToken.balanceOf(user1)) / 1e18, //     (await plotusToken.balanceOf(user2)) / 1e18, //     (await plotusToken.balanceOf(user3)) / 1e18, //     (await plotusToken.balanceOf(user4)) / 1e18, //     (await plotusToken.balanceOf(user5)) / 1e18 // ); // console.log( //     (await web3.eth.getBalance(user1)) / 1e18, //     (await web3.eth.getBalance(user2)) / 1e18, //     (await web3.eth.getBalance(user3)) / 1e18, //     (await web3.eth.getBalance(user4)) / 1e18, //     (await web3.eth.getBalance(user5)) / 1e18 // );

            await allMarkets.withdrawMax(10, { from: user1 });
            await assertRevert(allMarkets.withdrawMax(10, { from: user2 }));
            await assertRevert(allMarkets.withdrawMax(10, { from: user3 }));

            // console.log( //     (await plotusToken.balanceOf(user1)) / 1e18, //     (await plotusToken.balanceOf(user2)) / 1e18, //     (await plotusToken.balanceOf(user3)) / 1e18, //     (await plotusToken.balanceOf(user4)) / 1e18, //     (await plotusToken.balanceOf(user5)) / 1e18 // ); // console.log( //     (await web3.eth.getBalance(user1)) / 1e18, //     (await web3.eth.getBalance(user2)) / 1e18, //     (await web3.eth.getBalance(user3)) / 1e18, //     (await web3.eth.getBalance(user4)) / 1e18, //     (await web3.eth.getBalance(user5)) / 1e18 // );

            for (let i = 0; i < 3; i++) {
                assert.equal(expectedPredictionPoints[i].toFixed(1), predictionPointArray[i].toFixed(1));
                assert.equal(expectedPLOTReturn[i].toFixed(3), plotReturn[i].toFixed(3))
                assert.equal(expectedETHReturn[i].toFixed(3), ethReturn[i].toFixed(3))
            }
        });
        it("3.5. Scenario 5", async () => {
            await allMarkets.createMarket(0, 0);
            marketId++;

            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            await allMarkets.deposit(toWei(100), { from: user1 });
            await allMarkets.deposit(0, { value: toWei(4), from: user1 });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(toWei(400), { from: user3 });

            await mockMarketConfig.setNextOptionPrice(90);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 1, { from: user3 });

            await mockMarketConfig.setNextOptionPrice(180);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("100"), 2, { from: user1 });
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("4"), 2, { from: user1 });

            await mockMarketConfig.setNextOptionPrice(270);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 3, { from: user2 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) /  1e5;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 3)) /  1e5;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 1)) /  1e5;

            // console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser1_2, predictionPointsBeforeUser2, predictionPointsBeforeUser3);

            const expectedPredictionPoints = [5.552777778 + 22.2, 14.80740741, 44.42222222];
            const expectedETHReturn = [0 + 0, 0, 3.97602];
            const expectedPLOTReturn = [0 + 0, 0, 897.05125];

            const predictionPointArray = [
                predictionPointsBeforeUser1,
                predictionPointsBeforeUser2,
                predictionPointsBeforeUser3,
            ];

            await increaseTime(8 * 60 * 60);
            await allMarkets.postResultMock(1, marketId);
            await increaseTime(8 * 60 * 60);

            let returnUser1 = (await allMarkets.getReturn(user1, marketId))[0][0] / 1e8;
            let returnUser2 = (await allMarkets.getReturn(user2, marketId))[0][0] / 1e8;
            let returnUser3 = (await allMarkets.getReturn(user3, marketId))[0][0] / 1e8;
            const plotReturn = [returnUser1, returnUser2, returnUser3]

            let returnETHUser1 = (await allMarkets.getReturn(user1, marketId))[0][1] / 1e8;
            let returnETHUser2 = (await allMarkets.getReturn(user2, marketId))[0][1] / 1e8;
            let returnETHUser3 = (await allMarkets.getReturn(user3, marketId))[0][1] / 1e8;
            const ethReturn = [returnETHUser1, returnETHUser2, returnETHUser3]

            // console.log( //     (await plotusToken.balanceOf(user1)) / 1e18, //     (await plotusToken.balanceOf(user2)) / 1e18, //     (await plotusToken.balanceOf(user3)) / 1e18, //     (await plotusToken.balanceOf(user4)) / 1e18, //     (await plotusToken.balanceOf(user5)) / 1e18 // ); // console.log( //     (await web3.eth.getBalance(user1)) / 1e18, //     (await web3.eth.getBalance(user2)) / 1e18, //     (await web3.eth.getBalance(user3)) / 1e18, //     (await web3.eth.getBalance(user4)) / 1e18, //     (await web3.eth.getBalance(user5)) / 1e18 // );

            await assertRevert(allMarkets.withdrawMax(10, { from: user1 }));
            await assertRevert(allMarkets.withdrawMax(10, { from: user2 }));
            await allMarkets.withdrawMax(10, { from: user3 });

            // console.log( //     (await plotusToken.balanceOf(user1)) / 1e18, //     (await plotusToken.balanceOf(user2)) / 1e18, //     (await plotusToken.balanceOf(user3)) / 1e18, //     (await plotusToken.balanceOf(user4)) / 1e18, //     (await plotusToken.balanceOf(user5)) / 1e18 // ); // console.log( //     (await web3.eth.getBalance(user1)) / 1e18, //     (await web3.eth.getBalance(user2)) / 1e18, //     (await web3.eth.getBalance(user3)) / 1e18, //     (await web3.eth.getBalance(user4)) / 1e18, //     (await web3.eth.getBalance(user5)) / 1e18 // );

            for (let i = 0; i < 3; i++) {
                assert.equal(expectedPredictionPoints[i].toFixed(1), predictionPointArray[i].toFixed(1));
                assert.equal(expectedPLOTReturn[i].toFixed(3), plotReturn[i].toFixed(3))
                assert.equal(expectedETHReturn[i].toFixed(3), ethReturn[i].toFixed(3))
            }
        });
        it("3.6. Scenario 6,7 and 8", async () => {
            await allMarkets.createMarket(0, 2);
            marketId++;
            const scenario6MarketId = marketId;

            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            await allMarkets.deposit(toWei(100), { from: user1, value: toWei(4) });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(0, { from: user3, value: toWei(4)  });
            
            await mockMarketConfig.setNextOptionPrice(90);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("100"), 1, { from: user1 });
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("4"), 1, { from: user3 });
            
            await mockMarketConfig.setNextOptionPrice(180);
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("4"), 2, { from: user1 });

            await mockMarketConfig.setNextOptionPrice(270);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 3, { from: user2 });

            await allMarkets.createMarket(0, 0);
            marketId++;
            const scenario7MarketId = marketId;

            await plotusToken.transfer(user2, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await allMarkets.deposit(toWei(100), { from: user1 });
            await allMarkets.deposit(0, { value: toWei(4), from: user1 });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(0, { value: toWei(4), from: user3 });

            await mockMarketConfig.setNextOptionPrice(90);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("100"), 1, { from: user1 });
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("4"), 1, { from: user3 });
            await mockMarketConfig.setNextOptionPrice(180);
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("4"), 2, { from: user1 });
            await mockMarketConfig.setNextOptionPrice(270);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 3, { from: user2 });

            await allMarkets.createMarket(1, 0);
            marketId++;
            const scenario8MarketId = marketId;
           
            await plotusToken.transfer(user2, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await allMarkets.deposit(toWei(100), { from: user1 });
            await allMarkets.deposit(0, { value: toWei(4), from: user1 });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(0, { value: toWei(4), from: user3 });

            await mockMarketConfig.setNextOptionPrice(90);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("100"), 1, { from: user1 });
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("4"), 1, { from: user3 });

            await mockMarketConfig.setNextOptionPrice(180);
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("4"), 2, { from: user1 });

            await mockMarketConfig.setNextOptionPrice(270);
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 3, { from: user2 });

            await increaseTime(8 * 60 * 60);
            let neutralMinValue = (await allMarkets.getMarketData(scenario7MarketId)).neutralMinValue / 1;
            let neutralMaxValue = (await allMarkets.getMarketData(scenario7MarketId)).neutralMaxValue / 1;
            let betweenNeutral = neutralMaxValue - 100;
            await allMarkets.postResultMock(String(betweenNeutral), scenario7MarketId);
            neutralMaxValue = (await allMarkets.getMarketData(scenario8MarketId)).neutralMaxValue / 1;
            await allMarkets.postResultMock(String(neutralMaxValue + 1), scenario8MarketId);
            await increaseTime(8 * 60 * 60);


            let plotBalanceBeforeUser1 = (await plotusToken.balanceOf(user1)) / 1e18;
            let plotBalanceBeforeUser2 = (await plotusToken.balanceOf(user2)) / 1e18;
            let plotBalanceBeforeUser3 = (await plotusToken.balanceOf(user3)) / 1e18;

            let ethBalanceBeforeUser1 = (await web3.eth.getBalance(user1)) / 1e18;
            let ethBalanceBeforeUser2 = (await web3.eth.getBalance(user2)) / 1e18;
            let ethBalanceBeforeUser3 = (await web3.eth.getBalance(user3)) / 1e18;

            await allMarkets.withdrawMax(10, { from: user1 });
            await allMarkets.withdrawMax(10, { from: user2 });
            await assertRevert(allMarkets.withdrawMax(10, { from: user3 }));

            let plotBalanceAfterUser1 = (await plotusToken.balanceOf(user1)) / 1e18;
            let plotBalanceAfterUser2 = (await plotusToken.balanceOf(user2)) / 1e18;
            let plotBalanceAfterUser3 = (await plotusToken.balanceOf(user3)) / 1e18;

            let ethBalanceAfterUser1 = (await web3.eth.getBalance(user1)) / 1e18;
            let ethBalanceAfterUser2 = (await web3.eth.getBalance(user2)) / 1e18;
            let ethBalanceAfterUser3 = (await web3.eth.getBalance(user3)) / 1e18;

            assert.equal((ethBalanceAfterUser1 - ethBalanceBeforeUser1).toFixed(2), (7.97202).toFixed(2));
            assert.equal((ethBalanceAfterUser2 - ethBalanceBeforeUser2).toFixed(2), (7.95204).toFixed(2));
            assert.equal((plotBalanceAfterUser1-plotBalanceBeforeUser1).toFixed(2), (497.25125).toFixed(2))
            assert.equal((plotBalanceAfterUser2-plotBalanceBeforeUser2).toFixed(2), (499.25025).toFixed(2))

            await increaseTime(60 * 60 * 24 * 14);
            await allMarkets.postResultMock(1, scenario6MarketId);
            await increaseTime(60 * 60 * 24 * 6);

            plotBalanceBeforeUser1 = (await plotusToken.balanceOf(user1)) / 1e18;
            plotBalanceBeforeUser2 = (await plotusToken.balanceOf(user2)) / 1e18;
            plotBalanceBeforeUser3 = (await plotusToken.balanceOf(user3)) / 1e18;
            ethBalanceBeforeUser1 = (await web3.eth.getBalance(user1)) / 1e18;
            ethBalanceBeforeUser2 = (await web3.eth.getBalance(user2)) / 1e18;
            ethBalanceBeforeUser3 = (await web3.eth.getBalance(user3)) / 1e18;

            await allMarkets.withdrawMax(10, { from: user1 });
            await assertRevert( allMarkets.withdrawMax(10, { from: user2 }));
            await allMarkets.withdrawMax(10, { from: user3 });


            // await allMarkets.withdrawMax(10, { from: user1 });
            // await allMarkets.withdrawMax(10, { from: user2 });
            // await assertRevert(allMarkets.withdrawMax(10, { from: user3 }));

            plotBalanceAfterUser1 = (await plotusToken.balanceOf(user1)) / 1e18;
            plotBalanceAfterUser2 = (await plotusToken.balanceOf(user2)) / 1e18;
            plotBalanceAfterUser3 = (await plotusToken.balanceOf(user3)) / 1e18;

            ethBalanceAfterUser1 = (await web3.eth.getBalance(user1)) / 1e18;
            ethBalanceAfterUser2 = (await web3.eth.getBalance(user2)) / 1e18;
            ethBalanceAfterUser3 = (await web3.eth.getBalance(user3)) / 1e18;

            assert.equal((ethBalanceAfterUser1 - ethBalanceBeforeUser1).toFixed(2), (0.7955223681).toFixed(2));
            assert.equal((ethBalanceAfterUser3 - ethBalanceBeforeUser3).toFixed(2), (7.176497632).toFixed(2));
            assert.equal((plotBalanceAfterUser1-plotBalanceBeforeUser1).toFixed(2), (179.5420527).toFixed(2))
            assert.equal((plotBalanceAfterUser3-plotBalanceBeforeUser3).toFixed(2), (318.2089473).toFixed(2))

        });
    });
});
