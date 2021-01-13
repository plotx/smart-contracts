const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Master = artifacts.require("Master");
const MemberRoles = artifacts.require("MemberRoles");
const PlotusToken = artifacts.require("MockPLOT");
const MockConfig = artifacts.require("MockConfig"); //mock
const Governance = artifacts.require("Governance");
const AllMarkets = artifacts.require("MockAllMarkets");
const TokenController = artifacts.require("MockTokenController");
const MockChainLinkAggregator = artifacts.require("MockChainLinkAggregator");
const MarketCreationRewards = artifacts.require('MarketCreationRewards');

const ethAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const assertRevert = require("./utils/assertRevert").assertRevert;
const latestTime = require("./utils/latestTime").latestTime;
const encode = require("./utils/encoder.js").encode;
const gvProposal = require("./utils/gvProposal.js").gvProposalWithIncentiveViaTokenHolder;
const { toHex, toWei, toChecksumAddress } = require("./utils/ethTools");
const to8Power = (number) => String(parseFloat(number) * 1e8);

describe("Bets Multiple options sheet", () => {
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
            memberRoles = await masterInstance.getLatestAddress(web3.utils.toHex("MR"));
            memberRoles = await MemberRoles.at(memberRoles);
            governance = await masterInstance.getLatestAddress(web3.utils.toHex("GV"));
            governance = await Governance.at(governance);
            mockMarketConfig = await MockConfig.at(await masterInstance.getLatestAddress(web3.utils.toHex("MU")));
            allMarkets = await AllMarkets.at(await masterInstance.getLatestAddress(web3.utils.toHex("AM")));
            marketId = 6;
            await increaseTime(4 * 60 * 60);
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
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("100"), 1, { from: user1 });
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("400"), 1, { from: user1 });
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("400"), 1, { from: user2 });
            await mockMarketConfig.setNextOptionPrice(180);
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("400"), 2, { from: user3 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 1)) /  1e5;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 1)) /  1e5;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 2)) /  1e5;

            // console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser2, predictionPointsBeforeUser3);

            const expectedPredictionPoints = [1110.555556 + 4442.222222, 4442.222222, 2221.111111];
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

            let returnUser1 = (await allMarkets.getReturn(user1, marketId)) / 1e8;
            let returnUser2 = (await allMarkets.getReturn(user2, marketId)) / 1e8;
            let returnUser3 = (await allMarkets.getReturn(user3, marketId)) / 1e8;
            const plotReturn = [returnUser1, returnUser2, returnUser3]

            await allMarkets.withdraw(toWei(returnUser1), 10, { from: user1 });
            await allMarkets.withdraw(toWei(returnUser2), 10, { from: user2 });
            await assertRevert(allMarkets.withdraw(toWei(returnUser3), 10, { from: user3 }));

            // console.log( //     (await plotusToken.balanceOf(user1)) / 1e18, //     (await plotusToken.balanceOf(user2)) / 1e18, //     (await plotusToken.balanceOf(user3)) / 1e18, //     (await plotusToken.balanceOf(user4)) / 1e18, //     (await plotusToken.balanceOf(user5)) / 1e18 // ); // console.log( //     (await web3.eth.getBalance(user1)) / 1e18, //     (await web3.eth.getBalance(user2)) / 1e18, //     (await web3.eth.getBalance(user3)) / 1e18, //     (await web3.eth.getBalance(user4)) / 1e18, //     (await web3.eth.getBalance(user5)) / 1e18 // );

            for (let i = 0; i < 3; i++) {
                assert.equal(expectedPredictionPoints[i].toFixed(1), predictionPointArray[i].toFixed(1));
                assert.equal(expectedPLOTReturn[i].toFixed(3), plotReturn[i].toFixed(3))
                // assert.equal(expectedETHReturn[i].toFixed(3), ethReturn[i].toFixed(3))
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
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("400"), 1, { from: user2 });
            await mockMarketConfig.setNextOptionPrice(180);
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("100"), 2, { from: user1 });
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("400"), 2, { from: user1 });
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("400"), 2, { from: user3 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) /  1e5;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 1)) /  1e5;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 2)) /  1e5;

            // console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser2, predictionPointsBeforeUser3);
            const expectedPredictionPoints = [555.2777778 + 2221.111111, 4442.222222, 2221.111111];
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

            let returnUser1 = (await allMarkets.getReturn(user1, marketId)) / 1e8;
            let returnUser2 = (await allMarkets.getReturn(user2, marketId)) / 1e8;
            let returnUser3 = (await allMarkets.getReturn(user3, marketId)) / 1e8;
            const plotReturn = [returnUser1, returnUser2, returnUser3]

            await allMarkets.withdraw(toWei(returnUser2), 10, { from: user2 });
            await assertRevert(allMarkets.withdraw(toWei(returnUser1), 10, { from: user1 }));
            await assertRevert(allMarkets.withdraw(toWei(returnUser3), 10, { from: user3 }));

            // console.log( //     (await plotusToken.balanceOf(user1)) / 1e18, //     (await plotusToken.balanceOf(user2)) / 1e18, //     (await plotusToken.balanceOf(user3)) / 1e18, //     (await plotusToken.balanceOf(user4)) / 1e18, //     (await plotusToken.balanceOf(user5)) / 1e18 // ); // console.log( //     (await web3.eth.getBalance(user1)) / 1e18, //     (await web3.eth.getBalance(user2)) / 1e18, //     (await web3.eth.getBalance(user3)) / 1e18, //     (await web3.eth.getBalance(user4)) / 1e18, //     (await web3.eth.getBalance(user5)) / 1e18 // );

            for (let i = 0; i < 3; i++) {
                assert.equal(expectedPredictionPoints[i].toFixed(1), predictionPointArray[i].toFixed(1));
                assert.equal(expectedPLOTReturn[i].toFixed(3), plotReturn[i].toFixed(3))
                // assert.equal(expectedETHReturn[i].toFixed(3), ethReturn[i].toFixed(3))
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
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("100"), 1, { from: user1 });
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("400"), 1, { from: user2 });

            await mockMarketConfig.setNextOptionPrice(180);
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("400"), 2, { from: user1 });
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("400"), 2, { from: user3 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 1)) /  1e5;
            predictionPointsBeforeUser1_2 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) /  1e5;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 1)) /  1e5;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 2)) /  1e5;

            // console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser1_2, predictionPointsBeforeUser2, predictionPointsBeforeUser3);
            const expectedPredictionPoints = [1110.555556, 2221.111111, 4442.222222, 2221.111111];
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

            let returnUser1 = (await allMarkets.getReturn(user1, marketId)) / 1e8;
            let returnUser2 = (await allMarkets.getReturn(user2, marketId)) / 1e8;
            let returnUser3 = (await allMarkets.getReturn(user3, marketId)) / 1e8;
            const plotReturn = [returnUser1, returnUser2, returnUser3]

            // console.log( //     (await plotusToken.balanceOf(user1)) / 1e18, //     (await plotusToken.balanceOf(user2)) / 1e18, //     (await plotusToken.balanceOf(user3)) / 1e18, //     (await plotusToken.balanceOf(user4)) / 1e18, //     (await plotusToken.balanceOf(user5)) / 1e18 // ); // console.log( //     (await web3.eth.getBalance(user1)) / 1e18, //     (await web3.eth.getBalance(user2)) / 1e18, //     (await web3.eth.getBalance(user3)) / 1e18, //     (await web3.eth.getBalance(user4)) / 1e18, //     (await web3.eth.getBalance(user5)) / 1e18 // );

            await allMarkets.withdraw(toWei(returnUser1), 10, { from: user1 });
            await allMarkets.withdraw(toWei(returnUser2), 10, { from: user2 });
            await assertRevert(allMarkets.withdraw(toWei(returnUser2), 10, { from: user3 }));

            // console.log( //     (await plotusToken.balanceOf(user1)) / 1e18, //     (await plotusToken.balanceOf(user2)) / 1e18, //     (await plotusToken.balanceOf(user3)) / 1e18, //     (await plotusToken.balanceOf(user4)) / 1e18, //     (await plotusToken.balanceOf(user5)) / 1e18 // ); // console.log( //     (await web3.eth.getBalance(user1)) / 1e18, //     (await web3.eth.getBalance(user2)) / 1e18, //     (await web3.eth.getBalance(user3)) / 1e18, //     (await web3.eth.getBalance(user4)) / 1e18, //     (await web3.eth.getBalance(user5)) / 1e18 // );
            for (let i = 0; i < 4; i++) {
                assert.equal(expectedPredictionPoints[i].toFixed(1), predictionPointArray[i].toFixed(1));
            }

            for (let i = 0; i < 3; i++) {
                assert.equal(expectedPLOTReturn[i].toFixed(3), plotReturn[i].toFixed(3))
                // assert.equal(expectedETHReturn[i].toFixed(3), ethReturn[i].toFixed(3))
            }
        });
        // it("3.4. Scenario 4", async () => {
        //     await allMarkets.createMarket(0, 0);
        //     marketId++;

        //     await plotusToken.transfer(user2, toWei("400"));
        //     await plotusToken.transfer(user3, toWei("400"));

        //     await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
        //     await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
        //     await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
        //     await allMarkets.deposit(0, { value: toWei(4), from: user1 });
        //     await allMarkets.deposit(toWei(400), { from: user1 });
        //     await allMarkets.deposit(toWei(400), { from: user2 });
        //     await allMarkets.deposit(toWei(400), { from: user3 });

        //     await mockMarketConfig.setNextOptionPrice(90);
        //     await allMarkets.placePrediction(marketId, ethAddress, to8Power("4"), 1, { from: user1 });
        //     await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 1, { from: user1 });

        //     await mockMarketConfig.setNextOptionPrice(180);
        //     await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 2, { from: user3 });

        //     await mockMarketConfig.setNextOptionPrice(270);
        //     await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 3, { from: user2 });


        //     predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 1)) /  1e5;
        //     predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 3)) /  1e5;
        //     predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 2)) /  1e5;

        //     // console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser2, predictionPointsBeforeUser3);

        //     const expectedPredictionPoints = [44.4 + 44.42222222, 14.80740741, 22.21111111];
        //     const expectedETHReturn = [3.996 + 0, 0, 0];
        //     const expectedPLOTReturn = [397.7014751 + 797.7005249, 0, 0];

        //     const predictionPointArray = [
        //         predictionPointsBeforeUser1,
        //         predictionPointsBeforeUser2,
        //         predictionPointsBeforeUser3,
        //     ];

        //     await increaseTime(8 * 60 * 60);
        //     await allMarkets.postResultMock(1, marketId);
        //     await increaseTime(8 * 60 * 60);

        //     let returnUser1 = (await allMarkets.getReturn(user1, marketId))[0][0] / 1e8;
        //     let returnUser2 = (await allMarkets.getReturn(user2, marketId))[0][0] / 1e8;
        //     let returnUser3 = (await allMarkets.getReturn(user3, marketId))[0][0] / 1e8;
        //     const plotReturn = [returnUser1, returnUser2, returnUser3]

        //     let returnETHUser1 = (await allMarkets.getReturn(user1, marketId))[0][1] / 1e8;
        //     let returnETHUser2 = (await allMarkets.getReturn(user2, marketId))[0][1] / 1e8;
        //     let returnETHUser3 = (await allMarkets.getReturn(user3, marketId))[0][1] / 1e8;
        //     const ethReturn = [returnETHUser1, returnETHUser2, returnETHUser3]

        //     // console.log( //     (await plotusToken.balanceOf(user1)) / 1e18, //     (await plotusToken.balanceOf(user2)) / 1e18, //     (await plotusToken.balanceOf(user3)) / 1e18, //     (await plotusToken.balanceOf(user4)) / 1e18, //     (await plotusToken.balanceOf(user5)) / 1e18 // ); // console.log( //     (await web3.eth.getBalance(user1)) / 1e18, //     (await web3.eth.getBalance(user2)) / 1e18, //     (await web3.eth.getBalance(user3)) / 1e18, //     (await web3.eth.getBalance(user4)) / 1e18, //     (await web3.eth.getBalance(user5)) / 1e18 // );

        //     await allMarkets.withdrawMax(10, { from: user1 });
        //     await assertRevert(allMarkets.withdrawMax(10, { from: user2 }));
        //     await assertRevert(allMarkets.withdrawMax(10, { from: user3 }));

        //     // console.log( //     (await plotusToken.balanceOf(user1)) / 1e18, //     (await plotusToken.balanceOf(user2)) / 1e18, //     (await plotusToken.balanceOf(user3)) / 1e18, //     (await plotusToken.balanceOf(user4)) / 1e18, //     (await plotusToken.balanceOf(user5)) / 1e18 // ); // console.log( //     (await web3.eth.getBalance(user1)) / 1e18, //     (await web3.eth.getBalance(user2)) / 1e18, //     (await web3.eth.getBalance(user3)) / 1e18, //     (await web3.eth.getBalance(user4)) / 1e18, //     (await web3.eth.getBalance(user5)) / 1e18 // );

        //     for (let i = 0; i < 3; i++) {
        //         assert.equal(expectedPredictionPoints[i].toFixed(1), predictionPointArray[i].toFixed(1));
        //         assert.equal(expectedPLOTReturn[i].toFixed(3), plotReturn[i].toFixed(3))
        //         assert.equal(expectedETHReturn[i].toFixed(3), ethReturn[i].toFixed(3))
        //     }
        // });
        // it("3.5. Scenario 5", async () => {
        //     await allMarkets.createMarket(0, 0);
        //     marketId++;

        //     await plotusToken.transfer(user2, toWei("400"));
        //     await plotusToken.transfer(user3, toWei("400"));

        //     await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
        //     await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
        //     await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
        //     await allMarkets.deposit(toWei(100), { from: user1 });
        //     await allMarkets.deposit(0, { value: toWei(4), from: user1 });
        //     await allMarkets.deposit(toWei(400), { from: user2 });
        //     await allMarkets.deposit(toWei(400), { from: user3 });

        //     await mockMarketConfig.setNextOptionPrice(90);
        //     await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 1, { from: user3 });

        //     await mockMarketConfig.setNextOptionPrice(180);
        //     await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("100"), 2, { from: user1 });
        //     await allMarkets.placePrediction(marketId, ethAddress, to8Power("4"), 2, { from: user1 });

        //     await mockMarketConfig.setNextOptionPrice(270);
        //     await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("400"), 3, { from: user2 });

        //     predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) /  1e5;
        //     predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 3)) /  1e5;
        //     predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 1)) /  1e5;

        //     // console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser1_2, predictionPointsBeforeUser2, predictionPointsBeforeUser3);

        //     const expectedPredictionPoints = [5.552777778 + 22.2, 14.80740741, 44.42222222];
        //     const expectedETHReturn = [0 + 0, 0, 3.97602];
        //     const expectedPLOTReturn = [0 + 0, 0, 897.05125];

        //     const predictionPointArray = [
        //         predictionPointsBeforeUser1,
        //         predictionPointsBeforeUser2,
        //         predictionPointsBeforeUser3,
        //     ];

        //     await increaseTime(8 * 60 * 60);
        //     await allMarkets.postResultMock(1, marketId);
        //     await increaseTime(8 * 60 * 60);

        //     let returnUser1 = (await allMarkets.getReturn(user1, marketId))[0][0] / 1e8;
        //     let returnUser2 = (await allMarkets.getReturn(user2, marketId))[0][0] / 1e8;
        //     let returnUser3 = (await allMarkets.getReturn(user3, marketId))[0][0] / 1e8;
        //     const plotReturn = [returnUser1, returnUser2, returnUser3]

        //     let returnETHUser1 = (await allMarkets.getReturn(user1, marketId))[0][1] / 1e8;
        //     let returnETHUser2 = (await allMarkets.getReturn(user2, marketId))[0][1] / 1e8;
        //     let returnETHUser3 = (await allMarkets.getReturn(user3, marketId))[0][1] / 1e8;
        //     const ethReturn = [returnETHUser1, returnETHUser2, returnETHUser3]

        //     // console.log( //     (await plotusToken.balanceOf(user1)) / 1e18, //     (await plotusToken.balanceOf(user2)) / 1e18, //     (await plotusToken.balanceOf(user3)) / 1e18, //     (await plotusToken.balanceOf(user4)) / 1e18, //     (await plotusToken.balanceOf(user5)) / 1e18 // ); // console.log( //     (await web3.eth.getBalance(user1)) / 1e18, //     (await web3.eth.getBalance(user2)) / 1e18, //     (await web3.eth.getBalance(user3)) / 1e18, //     (await web3.eth.getBalance(user4)) / 1e18, //     (await web3.eth.getBalance(user5)) / 1e18 // );

        //     await assertRevert(allMarkets.withdrawMax(10, { from: user1 }));
        //     await assertRevert(allMarkets.withdrawMax(10, { from: user2 }));
        //     await allMarkets.withdrawMax(10, { from: user3 });

        //     // console.log( //     (await plotusToken.balanceOf(user1)) / 1e18, //     (await plotusToken.balanceOf(user2)) / 1e18, //     (await plotusToken.balanceOf(user3)) / 1e18, //     (await plotusToken.balanceOf(user4)) / 1e18, //     (await plotusToken.balanceOf(user5)) / 1e18 // ); // console.log( //     (await web3.eth.getBalance(user1)) / 1e18, //     (await web3.eth.getBalance(user2)) / 1e18, //     (await web3.eth.getBalance(user3)) / 1e18, //     (await web3.eth.getBalance(user4)) / 1e18, //     (await web3.eth.getBalance(user5)) / 1e18 // );

        //     for (let i = 0; i < 3; i++) {
        //         assert.equal(expectedPredictionPoints[i].toFixed(1), predictionPointArray[i].toFixed(1));
        //         assert.equal(expectedPLOTReturn[i].toFixed(3), plotReturn[i].toFixed(3))
        //         assert.equal(expectedETHReturn[i].toFixed(3), ethReturn[i].toFixed(3))
        //     }
        // });
        it("3.6. Scenario 6,7 and 8", async () => {
            await increaseTime(604800);
            await allMarkets.createMarket(0, 2);
            marketId++;
            const scenario6MarketId = marketId;

            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            await allMarkets.deposit(toWei(500), { from: user1 });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(toWei(400), { from: user3 });

            await mockMarketConfig.setNextOptionPrice(90);
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("100"), 1, { from: user1 });
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("400"), 1, { from: user2 });

            await mockMarketConfig.setNextOptionPrice(180);
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("400"), 2, { from: user1 });
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("400"), 2, { from: user3 });

            await allMarkets.createMarket(0, 0);
            marketId++;
            const scenario7MarketId = marketId;

            await plotusToken.transfer(user1, toWei("100"));
            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("500"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            await allMarkets.deposit(toWei(200), { from: user1 });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(toWei(500), { from: user3 });

            await mockMarketConfig.setNextOptionPrice(90);
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("100"), 1, { from: user1 });
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("500"), 1, { from: user3 });
            await mockMarketConfig.setNextOptionPrice(180);
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("100"), 2, { from: user1 });
            await mockMarketConfig.setNextOptionPrice(270);
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("400"), 3, { from: user2 });

            await allMarkets.createMarket(1, 0);
            marketId++;
            const scenario8MarketId = marketId;
           
            await plotusToken.transfer(user1, toWei("400"));
            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            await allMarkets.deposit(toWei(400), { from: user1 });
            await allMarkets.deposit(toWei(400), { from: user2 });
            await allMarkets.deposit(toWei(200), { from: user3 });

            await mockMarketConfig.setNextOptionPrice(90);
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("100"), 1, { from: user1 });
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("200"), 1, { from: user3 });

            await mockMarketConfig.setNextOptionPrice(180);
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("300"), 2, { from: user1 });

            await mockMarketConfig.setNextOptionPrice(270);
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("400"), 3, { from: user2 });

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

            let user1Balance = await allMarkets.getUserUnusedBalance(user1);
            user1Balance = user1Balance[0] + user1Balance[1];
            let user2Balance = await allMarkets.getUserUnusedBalance(user2);
            user2Balance = user2Balance[0] + user2Balance[1];
            let user3Balance = await allMarkets.getUserUnusedBalance(user3);
            user3Balance = user3Balance[0] + user3Balance[1];
            await allMarkets.withdraw(user1Balance, 10, { from: user1 });
            await allMarkets.withdraw(user2Balance, 10, { from: user2 });
            await assertRevert(allMarkets.withdraw(user3Balance, 10, { from: user3 }));

            let plotBalanceAfterUser1 = (await plotusToken.balanceOf(user1)) / 1e18;
            let plotBalanceAfterUser2 = (await plotusToken.balanceOf(user2)) / 1e18;
            let plotBalanceAfterUser3 = (await plotusToken.balanceOf(user3)) / 1e18;

            assert.equal((plotBalanceAfterUser1-plotBalanceBeforeUser1).toFixed(2), (1094.4525).toFixed(2))
            assert.equal((plotBalanceAfterUser2-plotBalanceBeforeUser2).toFixed(2), (996.5015).toFixed(2))

            await increaseTime(60 * 60 * 24 * 14);
            await allMarkets.postResultMock(1, scenario6MarketId);
            await increaseTime(60 * 60 * 24 * 6);

            plotBalanceBeforeUser1 = (await plotusToken.balanceOf(user1)) / 1e18;
            plotBalanceBeforeUser2 = (await plotusToken.balanceOf(user2)) / 1e18;
            plotBalanceBeforeUser3 = (await plotusToken.balanceOf(user3)) / 1e18;

            user1Balance = await allMarkets.getUserUnusedBalance(user1);
            user1Balance = user1Balance[0] + user1Balance[1];
            user2Balance = await allMarkets.getUserUnusedBalance(user2);
            user2Balance = user2Balance[0] + user2Balance[1];
            user3Balance = await allMarkets.getUserUnusedBalance(user3);
            user3Balance = user3Balance[0] + user3Balance[1];
            await allMarkets.withdraw(user1Balance, 10, { from: user1 });
            await allMarkets.withdraw(user2Balance, 10, { from: user2 });
            await assertRevert(allMarkets.withdraw(user3Balance, 10, { from: user3 }));

            // await allMarkets.withdrawMax(10, { from: user1 });
            // await allMarkets.withdrawMax(10, { from: user2 });
            // await assertRevert(allMarkets.withdrawMax(10, { from: user3 }));

            plotBalanceAfterUser1 = (await plotusToken.balanceOf(user1)) / 1e18;
            plotBalanceAfterUser2 = (await plotusToken.balanceOf(user2)) / 1e18;
            plotBalanceAfterUser3 = (await plotusToken.balanceOf(user3)) / 1e18;

            assert.equal((plotBalanceAfterUser1-plotBalanceBeforeUser1).toFixed(2), (259.0704).toFixed(2))
            assert.equal((plotBalanceAfterUser2-plotBalanceBeforeUser2).toFixed(2), (1036.2816).toFixed(2))

        });
    });
});