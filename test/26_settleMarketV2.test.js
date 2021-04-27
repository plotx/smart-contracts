const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("MarketRegistry");
const Master = artifacts.require("Master");
const MemberRoles = artifacts.require("MemberRoles");
const PlotusToken = artifacts.require("MockPLOT");
const MockWeth = artifacts.require("MockWeth");
const MockConfig = artifacts.require("MockConfig"); //mock
const Governance = artifacts.require("GovernanceV2");
const AllMarkets = artifacts.require("MockAllMarkets");
const AllMarketsV2 = artifacts.require("AllMarketsV2");
const MockchainLink = artifacts.require('MockChainLinkAggregator');
const MockUniswapRouter = artifacts.require("MockUniswapRouter");
const MockUniswapV2Pair = artifacts.require("MockUniswapV2Pair");
const MockUniswapFactory = artifacts.require("MockUniswapFactory");
const TokenController = artifacts.require("MockTokenController");
const DummyTokenMock2 = artifacts.require("SampleERC");

const web3 = Market.web3;
const ethAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const assertRevert = require("./utils/assertRevert").assertRevert;
const latestTime = require("./utils/latestTime").latestTime;
const encode = require("./utils/encoder.js").encode;
const encode1 = require("./utils/encoder.js").encode1;
const gvProposal = require("./utils/gvProposal.js").gvProposalWithIncentiveViaTokenHolder;
const { toHex, toWei, toChecksumAddress } = require("./utils/ethTools");
const to8Power = (number) => String(parseFloat(number) * 1e8);

// Multiplier Sheet

contract("26_SettleMarketV2. AllMarket", async function([
    ab1,
    ab2,
    ab3,
    ab4,
    mem1,
    mem2,
    mem3,
    mem4,
    mem5,
    mem6,
    mem7,
    mem8,
    mem9,
    mem10,
    notMember,
    dr1,
    dr2,
    dr3,
    user11,
    user12,
    user13,
]) {
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
        allMarkets, chainlinkAggregator;
    before(async () => {
        masterInstance = await OwnedUpgradeabilityProxy.deployed();
        masterInstance = await Master.at(masterInstance.address);
        plotusToken = await PlotusToken.deployed();
        chainlinkAggregator = await MockchainLink.deployed();
        tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
        tokenController = await TokenController.at(tokenControllerAdd);
        plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
        let memberRoles = await masterInstance.getLatestAddress(web3.utils.toHex("MR"));
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
        let actionHash = encode(
            "upgradeContractImplementation(address,address)",
            mockMarketConfig.address,
            newUtility.address
        );
        await gvProposal(
            6,
            actionHash,
            await MemberRoles.at(await masterInstance.getLatestAddress(toHex("MR"))),
            governance,
            2,
            0
        );
        await increaseTime(604800);
        mockUniswapV2Pair = await MockUniswapV2Pair.new();
        await mockUniswapV2Pair.initialize(plotusToken.address, weth.address);
        await weth.deposit({ from: user11, value: toWei(10) });
        await weth.transfer(mockUniswapV2Pair.address, toWei(10), { from: user11 });
        await plotusToken.transfer(mockUniswapV2Pair.address, toWei(1000));
        initialPLOTPrice = 1000 / 10;
        initialEthPrice = 10 / 1000;
        await mockUniswapFactory.setPair(mockUniswapV2Pair.address);
        await mockUniswapV2Pair.sync();
        newUtility = await MockConfig.new();
        actionHash = encode(
            "upgradeContractImplementation(address,address)",
            mockMarketConfig.address,
            newUtility.address
        );
        await gvProposal(
            6,
            actionHash,
            await MemberRoles.at(await masterInstance.getLatestAddress(toHex("MR"))),
            governance,
            2,
            0
        );
        await increaseTime(604800);
        allMarkets = await AllMarkets.at(await masterInstance.getLatestAddress(web3.utils.toHex("AM")));
        let date = await latestTime();
        await increaseTime(3610);
        date = Math.round(date);
        await mockMarketConfig.setInitialCummulativePrice();
        await mockMarketConfig.setAuthorizedAddress(allMarkets.address);
        let utility = await MockConfig.at("0xCBc7df3b8C870C5CDE675AaF5Fd823E4209546D2");
        await utility.setAuthorizedAddress(allMarkets.address);
        await mockUniswapV2Pair.sync();
    });
    it("Create markets in AllMarketsV1", async ()=> {
        await increaseTime(604800);
        await allMarkets.createMarket(0,0);
        await allMarkets.createMarket(0,1);
        await allMarkets.createMarket(0,2);
        await allMarkets.createMarket(1,0);
        await allMarkets.createMarket(1,1);
        await allMarkets.createMarket(1,2);
        await increaseTime(2*604800);
        
    });

    it("Should upgrade AllMarkets implementation to V2", async()=> {
        let allMarketsV2Implementation = await AllMarketsV2.new();
        let actionHash = encode1(
            ['bytes2[]', 'address[]'],
            [
                [toHex("AM")],
                [allMarketsV2Implementation.address]
            ]
        );
        await gvProposal(
            7,
            actionHash,
            await MemberRoles.at(await masterInstance.getLatestAddress(toHex("MR"))),
            governance,
            2,
            0
        );
        await increaseTime(604800);
        allMarkets = await AllMarketsV2.at(allMarkets.address);
    });

    it("Should be able to settle markets created in V2 AllMarkets", async() => {
        let tx;
        let currentRoundId;
        let requiredRoundId = await chainlinkAggregator.currentRound();
        await chainlinkAggregator.setLatestAnswer(500000000);
        currentRoundId = await chainlinkAggregator.currentRound();
        for(let i = 1;i<=12;i++) {
            tx = await allMarkets.settleMarketByRoundId(i, currentRoundId/1);
        }
        assert.equal(tx.logs[0].args.closeValue/1, ((await chainlinkAggregator.getRoundData(requiredRoundId))[1])/1);
    })
    it("Scenario 1: Latest Round Id, Required RoundId, Sent RoundId are same", async () => {
        let tx = await allMarkets.createMarketAndSettle(0,0,0);
        let id = tx.logs[0].args.marketIndex/1;
        let settleTime = (await allMarkets.getMarketData(id))._expireTime/1 - (await latestTime())*1;
        settleTime = settleTime + 14400;
        await increaseTime(settleTime - 500);
        let closingPrice = 1000000000;
        await chainlinkAggregator.setLatestAnswer(closingPrice);
        let requiredRoundId = await chainlinkAggregator.currentRound();
        await increaseTime(600);
        tx = await allMarkets.settleMarketByRoundId(tx.logs[0].args.marketIndex/1, requiredRoundId/1);
        assert.equal(tx.logs[0].args.closeValue/1, ((await chainlinkAggregator.getRoundData(requiredRoundId))[1])/1);
    });

    it("Scenario 2: Required RoundId, Sent RoundId are same and 1 round behind the latest round", async () => {
        let tx = await allMarkets.createMarketAndSettle(0,0,0);
        let id = tx.logs[0].args.marketIndex/1;
        let settleTime = (await allMarkets.getMarketData(id))._expireTime/1 - (await latestTime())*1;
        settleTime = settleTime + 14400;
        await increaseTime(settleTime - 500);
        let closingPrice = 2000000000;
        await chainlinkAggregator.setLatestAnswer(closingPrice);
        let requiredRoundId = await chainlinkAggregator.currentRound();
        await increaseTime(3600);
        closingPrice = 3000000000;
        await chainlinkAggregator.setLatestAnswer(closingPrice);
        tx = await allMarkets.settleMarketByRoundId(tx.logs[0].args.marketIndex/1, requiredRoundId/1);
        assert.equal(tx.logs[0].args.closeValue/1, ((await chainlinkAggregator.getRoundData(requiredRoundId))[1])/1);
    });

    it("Scenario 3: Required RoundId < Sent RoundId < latest round", async () => {
        let tx = await allMarkets.createMarketAndSettle(0,0,0);
        
        let id = tx.logs[0].args.marketIndex/1;
        let settleTime = (await allMarkets.getMarketData(id))._expireTime/1 - (await latestTime())*1;
        settleTime = settleTime + 14400;
        await increaseTime(settleTime - 500);
        let closingPrice = 2000000000;
        await chainlinkAggregator.setLatestAnswer(closingPrice);
        let requiredRoundId = await chainlinkAggregator.currentRound();
        await increaseTime(3600);
        closingPrice = 3000000000;
        await chainlinkAggregator.setLatestAnswer(closingPrice);
        closingPrice = 4000000000;
        await chainlinkAggregator.setLatestAnswer(closingPrice);
        tx = await allMarkets.settleMarketByRoundId(tx.logs[0].args.marketIndex/1, requiredRoundId);
        assert.equal(tx.logs[0].args.closeValue/1, ((await chainlinkAggregator.getRoundData(requiredRoundId))[1])/1);
    });

    it("Scenario 4: Required RoundId is much older than Sent RoundId, which is less than latest round", async () => {
        let tx = await allMarkets.createMarketAndSettle(0,0,0);
        let id = tx.logs[0].args.marketIndex/1;
        let settleTime = (await allMarkets.getMarketData(id))._expireTime/1 - (await latestTime())*1;
        settleTime = settleTime + 14400;
        await increaseTime(settleTime - 500);
        let closingPrice = 2000000000;
        await chainlinkAggregator.setLatestAnswer(closingPrice);
        let requiredRoundId = await chainlinkAggregator.currentRound();
        await increaseTime(3600);
        closingPrice = 3000000000;
        await chainlinkAggregator.setLatestAnswer(closingPrice);
        closingPrice = 4000000000;
        await chainlinkAggregator.setLatestAnswer(closingPrice);
        tx = await allMarkets.settleMarketByRoundId(tx.logs[0].args.marketIndex/1, requiredRoundId);
        assert.equal(tx.logs[0].args.closeValue/1, ((await chainlinkAggregator.getRoundData(requiredRoundId))[1])/1);
    });

    it("Scenario 5: Sent RoundId = latest round, required round id is much older", async () => {
        let tx = await allMarkets.createMarketAndSettle(0,0,0);
        let id = tx.logs[0].args.marketIndex/1;
        let settleTime = (await allMarkets.getMarketData(id))._expireTime/1 - (await latestTime())*1;
        settleTime = settleTime + 14400;
        await increaseTime(settleTime - 500);
        let closingPrice = 2000000000;
        await chainlinkAggregator.setLatestAnswer(closingPrice);
        let requiredRoundId = await chainlinkAggregator.currentRound();
        await increaseTime(3600);
        for(let i = 0;i<5;i++) {
            closingPrice += 1000000000;
            await chainlinkAggregator.setLatestAnswer(closingPrice);
        }
        let currentRoundId = await chainlinkAggregator.currentRound();
        tx = await allMarkets.settleMarketByRoundId(tx.logs[0].args.marketIndex/1, currentRoundId);
        assert.equal(tx.logs[0].args.closeValue/1, ((await chainlinkAggregator.getRoundData(requiredRoundId))[1])/1);
    });

    it("Scenario 6: Sent RoundId is less than latest round, required round id is much older", async () => {
        let tx = await allMarkets.createMarketAndSettle(0,0,0);
        let id = tx.logs[0].args.marketIndex/1;
        let settleTime = (await allMarkets.getMarketData(id))._expireTime/1 - (await latestTime())*1;
        settleTime = settleTime + 14400;
        await increaseTime(settleTime - 500);
        let closingPrice = 2000000000;
        await chainlinkAggregator.setLatestAnswer(closingPrice);
        let requiredRoundId = await chainlinkAggregator.currentRound();
        await increaseTime(3600);
        for(let i = 0;i<10;i++) {
            closingPrice += 1000000000;
            await chainlinkAggregator.setLatestAnswer(closingPrice);
        }
        let currentRoundId = await chainlinkAggregator.currentRound();
        tx = await allMarkets.settleMarketByRoundId(tx.logs[0].args.marketIndex/1, currentRoundId/1-3);
        assert.equal(tx.logs[0].args.closeValue/1, ((await chainlinkAggregator.getRoundData(requiredRoundId))[1])/1);
    });

    it("Scenario 7: Sent RoundId is less than the required round, both are less than latest round", async () => {
        let tx = await allMarkets.createMarketAndSettle(0,0,0);
        let id = tx.logs[0].args.marketIndex/1;
        let settleTime = (await allMarkets.getMarketData(id))._expireTime/1 - (await latestTime())*1;
        settleTime = settleTime + 14400;
        await increaseTime(settleTime - 500);
        let closingPrice = 2000000000;
        await chainlinkAggregator.setLatestAnswer(closingPrice);
        let requiredRoundId = await chainlinkAggregator.currentRound();
        await increaseTime(3600);
        for(let i = 0;i<10;i++) {
            closingPrice += 1000000000;
            await chainlinkAggregator.setLatestAnswer(closingPrice);
        }
        tx = await assertRevert(allMarkets.settleMarketByRoundId(tx.logs[0].args.marketIndex/1, requiredRoundId/1-1));
        // assert.equal(tx.logs[0].args.closeValue/1, ((await chainlinkAggregator.getRoundData(requiredRoundId))[1])/1);
    });

    it("Scenario 8: Sent RoundId and required round are same, both are less than latest round", async () => {
        let tx = await allMarkets.createMarketAndSettle(0,0,0);
        let id = tx.logs[0].args.marketIndex/1;
        let settleTime = (await allMarkets.getMarketData(id))._expireTime/1 - (await latestTime())*1;
        settleTime = settleTime + 14400;
        await increaseTime(settleTime - 500);
        let closingPrice = 2000000000;
        await chainlinkAggregator.setLatestAnswer(closingPrice);
        let requiredRoundId = await chainlinkAggregator.currentRound();
        await increaseTime(3600);
        for(let i = 0;i<10;i++) {
            closingPrice += 1000000000;
            await chainlinkAggregator.setLatestAnswer(closingPrice);
        }
        let currentRoundId = await chainlinkAggregator.currentRound();
        let tx2 = await allMarkets.createMarketAndSettle(0,0,currentRoundId/1);
        await increaseTime(2*14400);
        closingPrice += 1000000000;
        await chainlinkAggregator.setLatestAnswer(closingPrice);
        //Will settle the required market
        tx = await allMarkets.createMarketAndSettle(0,0,requiredRoundId);
        // tx = await allMarkets.settleMarketByRoundId(tx.logs[0].args.marketIndex/1, requiredRoundId);
        assert.equal(tx.logs[0].args.closeValue/1, ((await chainlinkAggregator.getRoundData(requiredRoundId))[1])/1);
        await increaseTime(14400*2)
        currentRoundId = await chainlinkAggregator.currentRound();
        await allMarkets.settleMarketByRoundId(tx.logs[1].args.marketIndex/1, currentRoundId/1);
        await allMarkets.settleMarketByRoundId(tx2.logs[1].args.marketIndex/1, currentRoundId/1);
    });

    it("Scenario 9: Required RoundId = latest round, Sent round id is lesser", async () => {
        let tx = await allMarkets.createMarketAndSettle(0,0,0);
        let id = tx.logs[0].args.marketIndex/1;
        let settleTime = (await allMarkets.getMarketData(id))._expireTime/1 - (await latestTime())*1;
        settleTime = settleTime + 14400;
        await increaseTime(settleTime - 500);
        let closingPrice = 2000000000;
        let requiredRoundId = await chainlinkAggregator.currentRound();
        await chainlinkAggregator.setLatestAnswer(closingPrice);
        closingPrice += 1000000000;
        await chainlinkAggregator.setLatestAnswer(closingPrice);
        let currentRoundId = await chainlinkAggregator.currentRound();
        await increaseTime(3600);
        tx = await assertRevert(allMarkets.settleMarketByRoundId(tx.logs[0].args.marketIndex/1, requiredRoundId));
        // assert.equal(tx.logs[0].args.closeValue/1, ((await chainlinkAggregator.getRoundData(currentRoundId))[1])/1);
    });

    it("Scenario 10: Required RoundId = latest round, Sent round id is lesser", async () => {
        let tx = await allMarkets.createMarketAndSettle(0,0,0);
        let id = tx.logs[0].args.marketIndex/1;
        let settleTime = (await allMarkets.getMarketData(id))._expireTime/1 - (await latestTime())*1;
        settleTime = settleTime + 14400;
        await increaseTime(settleTime - 500);
        let closingPrice = 2000000000;
        await chainlinkAggregator.setLatestAnswer(closingPrice);
        let requiredRoundId = await chainlinkAggregator.currentRound();
        for(let i = 0;i<10;i++) {
            closingPrice += 1000000000;
            await chainlinkAggregator.setLatestAnswer(closingPrice);
        }
        closingPrice += 1000000000;
        await chainlinkAggregator.setLatestAnswer(closingPrice);
        let currentRoundId = await chainlinkAggregator.currentRound();
        await increaseTime(3600);
        tx = await assertRevert(allMarkets.settleMarketByRoundId(tx.logs[0].args.marketIndex/1, requiredRoundId));
        // assert.equal(tx.logs[0].args.closeValue/1, ((await chainlinkAggregator.getRoundData(currentRoundId))[1])/1);
    });
});