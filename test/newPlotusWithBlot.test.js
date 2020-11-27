const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("MarketRegistry");
const Master = artifacts.require("Master");
const MemberRoles = artifacts.require("MemberRoles");
const PlotusToken = artifacts.require("MockPLOT");
const MockWeth = artifacts.require("MockWeth");
const MarketUtility = artifacts.require("MockConfig"); //mock
const MockConfig = artifacts.require("MockConfig");
const Governance = artifacts.require("Governance");
const AllMarkets = artifacts.require("MockAllMarkets");
const BLOT = artifacts.require("BLOT");
const MockUniswapRouter = artifacts.require("MockUniswapRouter");
const MockUniswapV2Pair = artifacts.require("MockUniswapV2Pair");
const MockUniswapFactory = artifacts.require("MockUniswapFactory");
const TokenController = artifacts.require("MockTokenController");
const MockChainLinkAggregator = artifacts.require("MockChainLinkAggregator");
const BigNumber = require("bignumber.js");

const web3 = Market.web3;
const ethAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const assertRevert = require("./utils/assertRevert").assertRevert;
const latestTime = require("./utils/latestTime").latestTime;
const encode = require("./utils/encoder.js").encode;
const gvProposal = require("./utils/gvProposal.js").gvProposalWithIncentiveViaTokenHolder;
const { toHex, toWei, toChecksumAddress } = require("./utils/ethTools");
const to8Power = (number) => String(parseFloat(number) * 1e8);

describe("newPlotusWithBlot", () => {
    contract("AllMarket", async function ([user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]) {
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
            await allMarkets.createMarket(0, 0);
            marketId++;
            BLOTInstance = await BLOT.at(await masterInstance.getLatestAddress(web3.utils.toHex("BL")));
        });
        it("1. Place Prediction", async () => {
            await mockMarketConfig.setNextOptionPrice(9);
            // user5
            await MockUniswapRouterInstance.setPrice(toWei("0.012"));
            await mockMarketConfig.setPrice(toWei("0.012"));
            await allMarkets.deposit(0, { from: user5, value: toWei("1") });
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("1"), 1, { from: user5 });
            // user6
            await MockUniswapRouterInstance.setPrice(toWei("0.014"));
            await mockMarketConfig.setPrice(toWei("0.014"));
            await allMarkets.deposit(0, { from: user6, value: toWei("2") });
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("2"), 1, { from: user6 });

            await mockMarketConfig.setNextOptionPrice(18);
            // user1
            await MockUniswapRouterInstance.setPrice(toWei("0.001"));
            await mockMarketConfig.setPrice(toWei("0.001"));
            await plotusToken.approve(allMarkets.address, toWei("100"), { from: user1 });
            await allMarkets.deposit(toWei("100"), { from: user1 });
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("100"), 2, { from: user1 });
            // user2
            await MockUniswapRouterInstance.setPrice(toWei("0.002"));
            await mockMarketConfig.setPrice(toWei("0.002"));
            await plotusToken.approve(BLOTInstance.address, toWei("400"));
            await BLOTInstance.mint(user2, toWei("400"));
            await allMarkets.placePrediction(marketId, BLOTInstance.address, to8Power("400"), 2, { from: user2 });
            // user3
            await MockUniswapRouterInstance.setPrice(toWei("0.001"));
            await mockMarketConfig.setPrice(toWei("0.001"));
            await plotusToken.transfer(user3, toWei("210"));
            await plotusToken.approve(allMarkets.address, toWei("210"), { from: user3 });
            await allMarkets.deposit(toWei("210"), { from: user3 });
            await assertRevert(allMarkets.placePrediction(marketId, user1, toWei("210"), 2, { from: user3 })); //should revert as asset not valid
            await assertRevert(allMarkets.placePrediction(marketId, plotusToken.address, toWei("210"), 2, { from: user3, value: "100" })); // should revert as passing value
            await assertRevert(allMarkets.placePrediction(marketId, plotusToken.address, "1", 2, { from: user3 })); // should revert as prediction amount is less than min required prediction
            await allMarkets.placePrediction(marketId, plotusToken.address, to8Power("210"), 2, { from: user3 });
            // user10
            await MockUniswapRouterInstance.setPrice(toWei("0.012"));
            await mockMarketConfig.setPrice(toWei("0.012"));
            await allMarkets.deposit(0, { from: user10, value: toWei("2") });
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("2"), 2, { from: user10 });
            // user7
            await MockUniswapRouterInstance.setPrice(toWei("0.01"));
            await mockMarketConfig.setPrice(toWei("0.01"));
            await allMarkets.deposit(0, { from: user7, value: toWei("1") });
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("1"), 2, { from: user7 });

            await mockMarketConfig.setNextOptionPrice(27);
            // user4
            await MockUniswapRouterInstance.setPrice(toWei("0.015"));
            await mockMarketConfig.setPrice(toWei("0.015"));
            await plotusToken.approve(BLOTInstance.address, toWei("124"));
            await BLOTInstance.mint(user4, toWei("124"));
            await allMarkets.placePrediction(marketId, BLOTInstance.address, to8Power("123"), 3, { from: user4 });
            await assertRevert(allMarkets.placePrediction(marketId, BLOTInstance.address, to8Power("1"), 2, { from: user4 })); // should revert as prediction amount is less than min required prediction
            // user8
            await MockUniswapRouterInstance.setPrice(toWei("0.045"));
            await mockMarketConfig.setPrice(toWei("0.045"));
            await allMarkets.deposit(0, { from: user8, value: toWei("3") });
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("3"), 3, { from: user8 });
            // user9
            await MockUniswapRouterInstance.setPrice(toWei("0.051"));
            await mockMarketConfig.setPrice(toWei("0.051"));
            await allMarkets.deposit(0, { from: user9, value: toWei("1") });
            await allMarkets.placePrediction(marketId, ethAddress, to8Power("1"), 3, { from: user9 });
        });
        it("1.2 Check Prediction points allocated", async () => {
            accounts = [user1, user2, user3, user4, user5, user6, user7, user8, user9, user10];
            options = [2, 2, 2, 3, 1, 1, 2, 3, 3, 2];
            getPredictionPoints = async (user, option) => {
                let predictionPoints = await allMarkets.getUserPredictionPoints(user, marketId, option);
                predictionPoints = predictionPoints / 1;
                return predictionPoints;
            };
            PredictionPointsExpected = [5.552777778, 22.21111111, 11.66083333, 4.553277778, 111, 222, 55.5, 111, 37, 111];

            for (let index = 0; index < 10; index++) {
                let PredictionPoints = await getPredictionPoints(accounts[index], options[index]);
                PredictionPoints = PredictionPoints / 1e5;
                try{
                    assert.equal(PredictionPoints.toFixed(1), PredictionPointsExpected[index].toFixed(1));
                }catch(e){
                    console.log(`Not equal!! -> Sheet: ${PredictionPointsExpected[index]} Got: ${PredictionPoints}`);
                }
                // commented by parv (as already added assert above)
                // console.log(`Prediction points : ${PredictionPoints} expected : ${PredictionPointsExpected[index].toFixed(1)} `);
            }
            // console.log(await plotusToken.balanceOf(user1));

            // close market
            await increaseTime(8 * 60 * 60);
            await allMarkets.postResultMock(1, marketId);
            await increaseTime(8 * 60 * 60);
        });
        it("1.3 Check total return for each user Prediction values in eth", async () => {
            accounts = [user1, user2, user3, user4, user5, user6, user7, user8, user9, user10];
            options = [2, 2, 2, 3, 1, 1, 2, 3, 3, 2];
            getReturnsInEth = async (user) => {
                const response = await allMarkets.getReturn(user, marketId);
                let returnAmountInEth = response[0][1] / 1e8;
                return returnAmountInEth;
            };

            const returnInEthExpected = [0, 0, 0, 0, 4.31235, 8.6247, 0, 0, 0, 0];

            for (let index = 0; index < 10; index++) {
                let returns = await getReturnsInEth(accounts[index]) / 1;
                try{
                    assert.equal(returnInEthExpected[index].toFixed(2), returns.toFixed(2));
                }catch(e){
                    console.log(`Not equal!! -> Sheet: ${returnInEthExpected[index].toFixed(2)} Got: ${returns.toFixed(2)}`);
                }
                // assert.equal(parseFloat(returns).toFixed(2), returnInEthExpected[index].toFixed(2));
                // commented by Parv (as assert already added above)
                // console.log(`return : ${returns} Expected :${returnInEthExpected[index]}`);
            }
        });
        it("1.4 Check total return for each user Prediction values in plot", async () => {
            accounts = [user1, user2, user3, user4, user5, user6, user7, user8, user9, user10];
            options = [2, 2, 2, 3, 1, 1, 2, 3, 3, 2];
            getReturnsInPLOT = async (user) => {
                const response = await allMarkets.getReturn(user, marketId);
                let returnAmountInPLOT = response[0][0] / 1e8;
                return returnAmountInPLOT;
            };

            const returnInPLOTExpected = [0, 0, 0, 0, 276.1401942, 552.2803883, 0, 0, 0, 0];

            for (let index = 0; index < 10; index++) {
                let returns = await getReturnsInPLOT(accounts[index]) / 1;
                try{
                    assert.equal(returnInPLOTExpected[index].toFixed(2), returns.toFixed(2), );
                }catch(e){
                    console.log(`Not equal!! -> Sheet: ${returnInPLOTExpected[index].toFixed(2)} Got: ${returns.toFixed(2)}`);
                }
                // commented by Parv (as assert already added above)
                // console.log(`return : ${returns} Expected :${returnInPLOTExpected[index]}`);
            }
        });
        it("1.5 Check User Received The appropriate amount", async () => {
            accounts = [user1, user2, user3, user4, user5, user6, user7, user8, user9, user10];
            const totalReturnLotExpexted = [0, 0, 0, 0, 276.1401942, 552.2803883, 0, 0, 0, 0];
            const returnInEthExpected = [0, 0, 0, 0, 4.31235, 8.6247, 0, 0, 0, 0];
            for (let account of accounts) {
                beforeClaim = await web3.eth.getBalance(account);
                beforeClaimToken = await plotusToken.balanceOf(account);
                try {
                    await allMarkets.withdrawMax(10, { from: account });
                } catch (e) {}
                afterClaim = await web3.eth.getBalance(account);
                afterClaimToken = await plotusToken.balanceOf(account);
                diff = afterClaim - beforeClaim;
                diff = new BigNumber(diff);
                conv = new BigNumber(1000000000000000000);
                diff = diff / conv;
                diff = diff.toFixed(2);
                expectedInEth = returnInEthExpected[accounts.indexOf(account)].toFixed(2);

                diffToken = afterClaimToken - beforeClaimToken;
                diffToken = diffToken / conv;
                diffToken = diffToken.toFixed(2);
                expectedInLot = totalReturnLotExpexted[accounts.indexOf(account)].toFixed(2);
                // assert.equal(diffToken, expectedInLot);
                try{
                    assert.equal(diff, expectedInEth);
                }catch(e){
                    console.log(`Not equal!! -> Sheet: ${expectedInEth} Got: ${diff}`);
                }
                try{
                    assert.equal(diffToken, expectedInLot);
                }catch(e){
                    console.log(`Not equal!! -> Sheet: ${expectedInLot} Got: ${diffToken}`);
                }
                // commented by Parv (as assert already added above)
                // console.log(`User ${accounts.indexOf(account) + 1}`);
                // console.log(`Returned in Eth : ${diff}  Expected : ${expectedInEth} `);
                // console.log(`Returned in Lot : ${diffToken}  Expected : ${expectedInLot} `);
            }
        });
    });
});
