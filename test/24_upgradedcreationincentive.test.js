const { assert } = require("chai");
const sha3 = require("js-sha3").keccak_256;
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Market = artifacts.require("MockMarket");
// const MarketNew = artifacts.require("MarketNew");
const Plotus = artifacts.require("MarketRegistry");
// const MarketRegistryNew = artifacts.require("MarketRegistryNew");
const MockChainLinkGasPriceAgg = artifacts.require("MockChainLinkGasPriceAgg");
const Master = artifacts.require("Master");
const MemberRoles = artifacts.require("MemberRoles");
const PlotusToken = artifacts.require("MockPLOT");
const MockWeth = artifacts.require("MockWeth");
const MarketUtility = artifacts.require("MockConfig");
const MockConfig = artifacts.require("MockConfig");
const Governance = artifacts.require("Governance");
const GovernanceNew = artifacts.require("GovernanceNew");
const ProposalCategory = artifacts.require("ProposalCategory");
const MockUniswapRouter = artifacts.require("MockUniswapRouter");
const MockUniswapV2Pair = artifacts.require("MockUniswapV2Pair");
const MockUniswapFactory = artifacts.require("MockUniswapFactory");
const TokenController = artifacts.require("MockTokenController");
const AllMarkets = artifacts.require("MockAllMarkets");
const MarketCreationRewards = artifacts.require("MarketCreationRewards");
const web3 = Market.web3;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const assertRevert = require("./utils/assertRevert").assertRevert;
const latestTime = require("./utils/latestTime").latestTime;
const encode = require("./utils/encoder.js").encode;
const encode1 = require("./utils/encoder.js").encode1;
const { toHex, toWei, toChecksumAddress } = require("./utils/ethTools");
const gvProposal = require("./utils/gvProposal.js").gvProposalWithIncentiveViaTokenHolder;

const to8Power = (number) => String(parseFloat(number) * 1e8);

var initialPLOTPrice;
var initialEthPrice;
var eventData;
var incentivesGained = 0;
const ethAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
var nullAddress = "0x0000000000000000000000000000";

contract("Market Creation Incentive", async function([
    user1,
    user2,
    user3,
    user4,
    user5,
    user6,
    user7,
    user8,
    user9,
    user10,
    user11,
    user12,
    user13,
    user14,
]) {
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
        chainlinkGasAgg,
        pc,
        allMarkets,
        marketIncentives,
        marketId;
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
        pc = await masterInstance.getLatestAddress(web3.utils.toHex("PC"));
        pc = await ProposalCategory.at(pc);
        MockUniswapRouterInstance = await MockUniswapRouter.deployed();
        mockUniswapFactory = await MockUniswapFactory.deployed();
        plotusNewInstance = await Plotus.at(plotusNewAddress);
        marketConfig = await plotusNewInstance.marketUtility();
        marketConfig = await MockConfig.at(marketConfig);
        weth = await MockWeth.deployed();
        await marketConfig.setWeth(weth.address);
        allMarkets = await AllMarkets.at(await masterInstance.getLatestAddress(web3.utils.toHex("AM")));
        marketIncentives = await MarketCreationRewards.at(await masterInstance.getLatestAddress(web3.utils.toHex("MC")));
        chainlinkGasAgg = await MockChainLinkGasPriceAgg.deployed();

        await plotusToken.transfer(marketIncentives.address, toWei(100000));
        newUtility = await MarketUtility.new();
        actionHash = encode("upgradeContractImplementation(address,address)", marketConfig.address, newUtility.address);
        await gvProposal(6, actionHash, await MemberRoles.at(await masterInstance.getLatestAddress(toHex("MR"))), governance, 2, 0);
        await increaseTime(604800);
        marketConfig = await MarketUtility.at(marketConfig.address);
        let date = await latestTime();
        await increaseTime(3610);
        date = Math.round(date);
        // await marketConfig.setInitialCummulativePrice();
        await marketConfig.setAuthorizedAddress(allMarkets.address);
        let utility = await MarketUtility.at("0xCBc7df3b8C870C5CDE675AaF5Fd823E4209546D2");
        await utility.setAuthorizedAddress(allMarkets.address);
        // await mockUniswapV2Pair.sync();
        let mockChainLinkGasPriceAgg = await MockChainLinkGasPriceAgg.new();
    });
    function findByTxHash(array1, txHash) {
        let i;
        for (i = array1.length - 1; i >= 0; i--) {
            if (array1[i].transactionHash == txHash) {
                return array1[i].returnValues;
            }
        }
        return 0;
    }
    async function updateParameter(cId, mrSequence, code, contractInst, type, proposedValue) {
        code = toHex(code);
        let getterFunction;
        if (type == "uint") {
            action = "updateUintParameters(bytes8,uint)";
            getterFunction = "getUintParameters";
        } else if (type == "configAddress") {
            action = "updateConfigAddressParameters(bytes8,address)";
            getterFunction = "";
        } else if (type == "configUint") {
            action = "updateConfigUintParameters(bytes8,uint256)";
            getterFunction = "";
        }

        let actionHash = encode(action, code, proposedValue);
        await gvProposal(cId, actionHash, memberRoles, governance, mrSequence, 0);
        if (code == toHex("MASTADD")) {
            let newMaster = await NXMaster.at(proposedValue);
            contractInst = newMaster;
        }
        let parameter;
        if (type == "uint") {
            parameter = await contractInst[getterFunction](code);
        }
        try {
            parameter[1] = parameter[1].toNumber();
        } catch (err) {}
        if (type == "uint") {
            assert.equal(parameter[1], proposedValue, "Not updated");
        }
    }

    it("Should create Markets", async function() {
        console.log("-====>", allMarkets.address);
        await increaseTime(8 * 60 * 60);
        let tx = await allMarkets.createMarket(0, 0, { gasPrice: 300000 });
        let events = await marketIncentives.getPastEvents("allEvents", { fromBlock: 0, toBlock: "latest" });
        eventData = findByTxHash(events, tx.tx);
    });

    it("If gas is provided less than fastgas price from oracle, reward should be as per minimum of fast gas and provided gas", async function() {
        let gasUsed = eventData.gasUsed;
        let gasPrice = await chainlinkGasAgg.latestAnswer();
        gasPrice = Math.min(300000, gasPrice);
        estimatedGasCost = gasPrice * gasUsed;
        let costInETH = estimatedGasCost;
        let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
        incentivesGained += eventData.plotIncentive / 1;
        assert.equal(eventData.plotIncentive / 1, worthInPLOT[1] / 1);
    });

    it("If gas is provided upto 125% of fast gas, reward should be as per provided gas", async function() {
        await increaseTime(8 * 60 * 60);
        let tx = await allMarkets.createMarket(0, 0, { gasPrice: 500000 });
        let events = await marketIncentives.getPastEvents("allEvents", { fromBlock: 0, toBlock: "latest" });
        eventData = findByTxHash(events, tx.tx);
        let gasUsed = eventData.gasUsed;
        let gasPrice = 500000;
        estimatedGasCost = gasPrice * gasUsed;
        let costInETH = estimatedGasCost;
        let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
        incentivesGained += eventData.plotIncentive / 1;
        assert.equal(eventData.plotIncentive / 1, worthInPLOT[1] / 1);
    });

    it("If gas is provided more than 125% of fast gas, reward should be as per 125% fast gas", async function() {
        await increaseTime(8 * 60 * 60);
        await chainlinkGasAgg.setLatestAnswer(450000);
        let tx = await allMarkets.createMarket(0, 0, { gasPrice: 1000000 });
        let events = await marketIncentives.getPastEvents("allEvents", { fromBlock: 0, toBlock: "latest" });
        eventData = findByTxHash(events, tx.tx);
        let gasUsed = eventData.gasUsed;
        let gasPrice = 562500;
        estimatedGasCost = gasPrice * gasUsed;
        let costInETH = estimatedGasCost;
        let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
        incentivesGained += eventData.plotIncentive / 1;
        assert.equal(eventData.plotIncentive / 1, worthInPLOT[1] / 1);
    });

    it("If gas is provided more than 125% of fast gas and maxGas price, reward should be as per minimum of 125% of fast gas or max gasprice", async function() {
        await chainlinkGasAgg.setLatestAnswer(1250000);
        await increaseTime(4 * 3600);
        let tx = await allMarkets.createMarket(0, 0, { gasPrice: 2000000 });
        let events = await marketIncentives.getPastEvents("allEvents", { fromBlock: 0, toBlock: "latest" });
        eventData = findByTxHash(events, tx.tx);
        let gasUsed = eventData.gasUsed;
        let maxGas = 100 * 10 ** 9;
        let gasPrice = Math.min(maxGas, 1250000 * 1.25);
        estimatedGasCost = gasPrice * gasUsed;
        let costInETH = estimatedGasCost;
        let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
        incentivesGained += eventData.plotIncentive / 1;
        assert.equal(eventData.plotIncentive / 1, worthInPLOT[1] / 1);
    });

    it("Should be able to claim the market creation rewards", async function() {
        let oldBalance = parseFloat(await plotusToken.balanceOf(user1));
        let tx = await marketIncentives.claimCreationReward(100);
        let newBalance = parseFloat(await plotusToken.balanceOf(user1));
        assert.equal((newBalance / 1e18).toFixed(2), (oldBalance / 1e18 + incentivesGained / 1e18).toFixed(2));
    });

    it("Scenario 1: Should be able to get reward pool share of market", async function() {
        marketId = 11;
        await marketConfig.setMockPriceFlag(false);
        await chainlinkGasAgg.setLatestAnswer(450000);
        await increaseTime(4 * 3600);
        let tx = await allMarkets.createMarket(0, 0, { gasPrice: 450000, from: user2 });

        await plotusToken.transfer(user7, toWei(10000));
        await plotusToken.approve(allMarkets.address, toWei(10000000), { from: user7 });

        await allMarkets.deposit(toWei("100"), { from: user7, value: toWei(1.1) });

        await allMarkets.placePrediction(marketId, ethAddress, to8Power(0.1), 3, { from: user7 });
        await allMarkets.placePrediction(marketId, ethAddress, to8Power(1), 1, { from: user7 });
        await allMarkets.placePrediction(marketId, plotusToken.address, to8Power(100), 3, { from: user7 });

        let rewardPoolEth = 0.099;
        let rewardPoolPlot = 99.95;
        let events = await marketIncentives.getPastEvents("allEvents", { fromBlock: 0, toBlock: "latest" });
        eventData = findByTxHash(events, tx.tx);
        let gasUsed = eventData.gasUsed;
        let maxGas = 100 * 10 ** 9;
        let gasPrice = Math.min(maxGas, 450000 * 1.25, 450000); //change
        estimatedGasCost = gasPrice * gasUsed;
        let costInETH = estimatedGasCost;
        let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
        incentivesGained = eventData.plotIncentive / 1;
        let rewardPoolSharePerc = eventData.rewardPoolSharePerc;
        assert.equal(rewardPoolSharePerc / 1, 50);
        assert.equal(eventData.plotIncentive / 1, worthInPLOT[1] / 1);

        await increaseTime(8 * 60 * 60);
        await allMarkets.postResultMock(1, marketId);
        await increaseTime(8 * 60 * 60);

        let oldBalance = parseFloat(await plotusToken.balanceOf(user2));
        let oldBalanceEth = parseFloat(await web3.eth.getBalance(user2));
        tx = await marketIncentives.claimCreationReward(100, { from: user2 });
        let newBalance = parseFloat(await plotusToken.balanceOf(user2));
        let newBalanceEth = parseFloat(await web3.eth.getBalance(user2));
        assert.equal(
            (newBalance / 1e18).toFixed(2),
            (oldBalance / 1e18 + incentivesGained / 1e18 + (rewardPoolPlot * rewardPoolSharePerc) / 10000).toFixed(2)
        );
        assert.equal((newBalanceEth / 1e18).toFixed(2), (oldBalanceEth / 1e18 + (rewardPoolEth * rewardPoolSharePerc) / 10000).toFixed(2));
    });

    it("Scenario 2: Should be able to get more reward pool share of market if market creator had staked tokens", async function() {
        await plotusToken.transfer(user12, toWei(25000));
        await plotusToken.approve(tokenController.address, toWei(10000000), { from: user12 });
        await tokenController.lock("0x534d", toWei(25000), 86400 * 30, { from: user12 });
        await chainlinkGasAgg.setLatestAnswer(450000);
        await increaseTime(8 * 3600);
        let tx = await allMarkets.createMarket(0, 0, { gasPrice: 450000, from: user12 });
        marketId++; //12
        await plotusToken.approve(allMarkets.address, toWei(10000000), { from: user13 });
        await allMarkets.deposit(0, { from: user13, value: toWei(2) });
        await allMarkets.placePrediction(marketId, ethAddress, to8Power(0.1), 3, { from: user13 });
        await allMarkets.placePrediction(marketId, ethAddress, to8Power(1), 1, { from: user13 });
        await plotusToken.transfer(user7, toWei(10000));
        await plotusToken.approve(allMarkets.address, toWei(10000000), { from: user7 });
        await allMarkets.deposit(toWei(100), { from: user7 });
        await allMarkets.placePrediction(marketId, plotusToken.address, to8Power(100), 3, { from: user7 });
        let rewardPoolEth = 0.1;
        let rewardPoolPlot = 99.95;
        let events = await marketIncentives.getPastEvents("allEvents", { fromBlock: 0, toBlock: "latest" });
        eventData = findByTxHash(events, tx.tx);
        let gasUsed = eventData.gasUsed;
        let maxGas = 100 * 10 ** 9;
        let gasPrice = Math.min(maxGas, 450000 * 1.25, 450000);
        estimatedGasCost = gasPrice * gasUsed;
        let costInETH = estimatedGasCost;
        let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
        incentivesGained = eventData.plotIncentive / 1;
        let rewardPoolSharePerc = eventData.rewardPoolSharePerc;
        assert.equal(rewardPoolSharePerc / 1, 100);
        assert.equal(eventData.plotIncentive / 1, worthInPLOT[1] / 1);
        await increaseTime(8 * 60 * 60);
        await allMarkets.postResultMock(1, marketId);
        await increaseTime(8 * 60 * 60);
        let oldBalance = parseFloat(await plotusToken.balanceOf(user12));
        let oldBalanceEth = parseFloat(await web3.eth.getBalance(user12));
        tx = await marketIncentives.claimCreationReward(100, { from: user12 });
        let newBalance = parseFloat(await plotusToken.balanceOf(user12));
        let newBalanceEth = parseFloat(await web3.eth.getBalance(user12));
        assert.equal(
            (newBalance / 1e18).toFixed(2),
            (oldBalance / 1e18 + incentivesGained / 1e18 + (rewardPoolPlot * rewardPoolSharePerc) / 10000).toFixed(2)
        );
        assert.equal((newBalanceEth / 1e18).toFixed(2), (oldBalanceEth / 1e18 + (rewardPoolEth * rewardPoolSharePerc) / 10000).toFixed(2));
    });
    it("Scenario 3: Should be able to get more reward pool share of market if market creator had staked tokens", async function() {
        await plotusToken.transfer(user3, toWei(50000));
        await plotusToken.approve(tokenController.address, toWei(10000000), { from: user3 });
        await tokenController.lock("0x534d", toWei(50000), 86400 * 30, { from: user3 });
        await chainlinkGasAgg.setLatestAnswer(450000);
        await increaseTime(4 * 3600);
        let tx = await allMarkets.createMarket(0, 0, { gasPrice: 450000, from: user3 });
        marketId++; //13
        await allMarkets.deposit(0, { from: user12, value: 100000000000000000 });
        await allMarkets.placePrediction(marketId, ethAddress, to8Power(0.1), 3, {
            from: user12,
        });
        await plotusToken.transfer(user7, toWei(10000));
        await plotusToken.approve(allMarkets.address, toWei(10000000), { from: user7 });
        await allMarkets.deposit(toWei(10), { from: user7 });
        await allMarkets.placePrediction(marketId, plotusToken.address, toWei(10) / 1e10, 3, {
            from: user7,
        });
        let rewardPoolEth = 0.1;
        let rewardPoolPlot = 9.95;
        let events = await marketIncentives.getPastEvents("allEvents", { fromBlock: 0, toBlock: "latest" });
        eventData = findByTxHash(events, tx.tx);
        let gasUsed = eventData.gasUsed;
        let maxGas = 100 * 10 ** 9;
        let gasPrice = Math.min(maxGas, 450000 * 1.25, 450000);
        estimatedGasCost = gasPrice * gasUsed;
        let costInETH = estimatedGasCost;
        let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
        incentivesGained = eventData.plotIncentive / 1;
        let rewardPoolSharePerc = eventData.rewardPoolSharePerc;
        assert.equal(rewardPoolSharePerc / 1, 150);
        //As market participation is less than 1 ETH reward pool share will zero
        rewardPoolSharePerc = 0;
        assert.equal(eventData.plotIncentive / 1, worthInPLOT[1] / 1);
        await increaseTime(8 * 60 * 60);
        await allMarkets.postResultMock(1, marketId);
        await increaseTime(8 * 60 * 60);
        let oldBalance = parseFloat(await plotusToken.balanceOf(user3));
        let oldBalanceEth = parseFloat(await web3.eth.getBalance(user3));
        tx = await marketIncentives.claimCreationReward(100, { from: user3 });
        let newBalance = parseFloat(await plotusToken.balanceOf(user3));
        let newBalanceEth = parseFloat(await web3.eth.getBalance(user3));
        assert.equal(
            (newBalance / 1e18).toFixed(2),
            (oldBalance / 1e18 + incentivesGained / 1e18 + (rewardPoolPlot * rewardPoolSharePerc) / 10000).toFixed(2)
        );
        assert.equal((newBalanceEth / 1e18).toFixed(2), (oldBalanceEth / 1e18 + (rewardPoolEth * rewardPoolSharePerc) / 10000).toFixed(2));
    });
    it("Scenario 4: Should be able to get more reward pool share of market if market creator had staked tokens", async function() {
        await plotusToken.transfer(user4, toWei(60000));
        await plotusToken.approve(tokenController.address, toWei(10000000), { from: user4 });
        await tokenController.lock("0x534d", toWei(60000), 86400 * 30, { from: user4 });
        await chainlinkGasAgg.setLatestAnswer(450000);
        await increaseTime(4 * 3600);
        let tx = await allMarkets.createMarket(0, 0, { gasPrice: 450000, from: user4 });
        marketId++; //14
        let events = await marketIncentives.getPastEvents("allEvents", { fromBlock: 0, toBlock: "latest" });
        eventData = findByTxHash(events, tx.tx);
        await allMarkets.deposit(0, { from: user13, value: toWei(2) });
        await allMarkets.placePrediction(marketId, ethAddress, to8Power(0.1), 3, { from: user13 });
        await allMarkets.placePrediction(marketId, ethAddress, to8Power(1), 1, { from: user13 });
        await plotusToken.transfer(user7, toWei(10000));
        await plotusToken.approve(allMarkets.address, toWei(10000000), { from: user7 });
        await allMarkets.deposit(toWei(100), { from: user7 });
        await allMarkets.placePrediction(marketId, plotusToken.address, to8Power(100), 3, { from: user7 });
        let rewardPoolEth = 0.1;
        let rewardPoolPlot = 99.95;
        let gasUsed = eventData.gasUsed;
        let maxGas = 100 * 10 ** 9;
        let gasPrice = Math.min(maxGas, 450000 * 1.25, 450000);
        estimatedGasCost = gasPrice * gasUsed;
        let costInETH = estimatedGasCost;
        let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
        incentivesGained = eventData.plotIncentive / 1;
        let rewardPoolSharePerc = eventData.rewardPoolSharePerc;
        assert.equal(rewardPoolSharePerc / 1, 150);
        assert.equal(eventData.plotIncentive / 1, worthInPLOT[1] / 1);
        await increaseTime(8 * 60 * 60);
        await allMarkets.postResultMock(1, marketId);
        await increaseTime(8 * 60 * 60);
        let oldBalance = parseFloat(await plotusToken.balanceOf(user4));
        let oldBalanceEth = parseFloat(await web3.eth.getBalance(user4));
        tx = await marketIncentives.claimCreationReward(100, { from: user4 });
        let newBalance = parseFloat(await plotusToken.balanceOf(user4));
        let newBalanceEth = parseFloat(await web3.eth.getBalance(user4));
        assert.equal(
            (newBalance / 1e18).toFixed(2),
            (oldBalance / 1e18 + incentivesGained / 1e18 + (rewardPoolPlot * rewardPoolSharePerc) / 10000).toFixed(2)
        );
        assert.equal((newBalanceEth / 1e18).toFixed(2), (oldBalanceEth / 1e18 + (rewardPoolEth * rewardPoolSharePerc) / 10000).toFixed(2));
    });
    it("Scenario 5: Should be able to get more reward pool share of market if market creator had staked tokens", async function() {
        await plotusToken.transfer(user5, toWei(100000));
        await plotusToken.approve(tokenController.address, toWei(10000000), { from: user5 });
        await tokenController.lock("0x534d", toWei(100000), 86400 * 30, { from: user5 });
        await chainlinkGasAgg.setLatestAnswer(450000);
        await increaseTime(4 * 3600);
        let tx = await allMarkets.createMarket(0, 0, { gasPrice: 450000, from: user5 });
        marketId++; //15
        await plotusToken.transfer(user7, toWei(10000));
        await plotusToken.approve(allMarkets.address, toWei(10000000), { from: user7 });
        await allMarkets.deposit(0, { from: user12, value: toWei(0.1) });
        await allMarkets.deposit(toWei(100), { from: user7 });
        await allMarkets.placePrediction(marketId, ethAddress, to8Power(0.1), 3, { from: user12 });
        await allMarkets.placePrediction(marketId, plotusToken.address, to8Power(100), 3, { from: user7 });
        let rewardPoolEth = 0.1;
        let rewardPoolPlot = 99.95;
        let events = await marketIncentives.getPastEvents("allEvents", { fromBlock: 0, toBlock: "latest" });
        eventData = findByTxHash(events, tx.tx);
        let gasUsed = eventData.gasUsed;
        let maxGas = 100 * 10 ** 9;
        let gasPrice = Math.min(maxGas, 450000 * 1.25, 450000);
        estimatedGasCost = gasPrice * gasUsed;
        let costInETH = estimatedGasCost;
        let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
        incentivesGained = eventData.plotIncentive / 1;
        let rewardPoolSharePerc = eventData.rewardPoolSharePerc;
        assert.equal(rewardPoolSharePerc / 1, 250);
        assert.equal(eventData.plotIncentive / 1, worthInPLOT[1] / 1);
        await increaseTime(8 * 60 * 60);
        await allMarkets.postResultMock(1, marketId);
        await increaseTime(8 * 60 * 60);
        let oldBalance = parseFloat(await plotusToken.balanceOf(user5));
        let oldBalanceEth = parseFloat(await web3.eth.getBalance(user5));
        tx = await marketIncentives.claimCreationReward(100, { from: user5 });
        let newBalance = parseFloat(await plotusToken.balanceOf(user5));
        let newBalanceEth = parseFloat(await web3.eth.getBalance(user5));
        assert.equal(
            (newBalance / 1e18).toFixed(2),
            (oldBalance / 1e18 + incentivesGained / 1e18 + (rewardPoolPlot * rewardPoolSharePerc) / 10000).toFixed(2)
        );
        assert.equal((newBalanceEth / 1e18).toFixed(2), (oldBalanceEth / 1e18 + (rewardPoolEth * rewardPoolSharePerc) / 10000).toFixed(2));
    });
    it("Scenario 6: Should be able to get more reward pool share of market if market creator had staked tokens", async function() {
        await plotusToken.transfer(user6, toWei(150000));
        await plotusToken.approve(tokenController.address, toWei(10000000), { from: user6 });
        await tokenController.lock("0x534d", toWei(150000), 86400 * 30, { from: user6 });
        await chainlinkGasAgg.setLatestAnswer(450000);
        await increaseTime(4 * 3600);
        let tx = await allMarkets.createMarket(0, 0, { gasPrice: 450000, from: user6 });
        marketId++;
        await plotusToken.transfer(user7, toWei(10000));
        await plotusToken.approve(allMarkets.address, toWei(10000000), { from: user7 });
        await allMarkets.deposit(toWei(100), { from: user7, value: toWei(0.1) });
        await allMarkets.placePrediction(marketId, ethAddress, to8Power(0.1), 3, {
            from: user7,
        });
        await allMarkets.placePrediction(marketId, plotusToken.address, to8Power(100), 3, {
            from: user7,
        });
        let rewardPoolEth = 0.1;
        let rewardPoolPlot = 99.95;
        let events = await marketIncentives.getPastEvents("allEvents", { fromBlock: 0, toBlock: "latest" });
        eventData = findByTxHash(events, tx.tx);
        let gasUsed = eventData.gasUsed;
        let maxGas = 100 * 10 ** 9;
        let gasPrice = Math.min(maxGas, 450000 * 1.25, 450000);
        estimatedGasCost = gasPrice * gasUsed;
        let costInETH = estimatedGasCost;
        let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
        incentivesGained = eventData.plotIncentive / 1;
        let rewardPoolSharePerc = eventData.rewardPoolSharePerc;
        assert.equal(rewardPoolSharePerc / 1, 350);
        assert.equal(eventData.plotIncentive / 1, worthInPLOT[1] / 1);
        await increaseTime(8 * 60 * 60);
        await allMarkets.postResultMock(1, marketId);
        await increaseTime(8 * 60 * 60);
        let oldBalance = parseFloat(await plotusToken.balanceOf(user6));
        let oldBalanceEth = parseFloat(await web3.eth.getBalance(user6));
        tx = await marketIncentives.claimCreationReward(100, { from: user6 });
        let newBalance = parseFloat(await plotusToken.balanceOf(user6));
        let newBalanceEth = parseFloat(await web3.eth.getBalance(user6));
        assert.equal(
            (newBalance / 1e18).toFixed(2),
            (oldBalance / 1e18 + incentivesGained / 1e18 + (rewardPoolPlot * rewardPoolSharePerc) / 10000).toFixed(2)
        );
        assert.equal((newBalanceEth / 1e18).toFixed(2), (oldBalanceEth / 1e18 + (rewardPoolEth * rewardPoolSharePerc) / 10000).toFixed(2));
    });
    it("Scenario 7: Should be able to get more reward pool share of market if market creator had staked tokens", async function() {
        await plotusToken.transfer(user8, toWei(150000));
        await plotusToken.approve(tokenController.address, toWei(10000000), { from: user8 });
        await tokenController.lock("0x534d", toWei(150000), 86400 * 30, { from: user8 });
        await chainlinkGasAgg.setLatestAnswer(450000);
        await increaseTime(4 * 3600);
        let tx = await allMarkets.createMarket(0, 0, { gasPrice: 450000, from: user8 });
        marketId++;
        let rewardPoolEth = 0;
        let rewardPoolPlot = 0;
        let events = await marketIncentives.getPastEvents("allEvents", { fromBlock: 0, toBlock: "latest" });
        eventData = findByTxHash(events, tx.tx);
        let gasUsed = eventData.gasUsed;
        let maxGas = 100 * 10 ** 9;
        let gasPrice = Math.min(maxGas, 450000 * 1.25, 450000);
        estimatedGasCost = gasPrice * gasUsed;
        let costInETH = estimatedGasCost;
        let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
        incentivesGained = eventData.plotIncentive / 1;
        let rewardPoolSharePerc = eventData.rewardPoolSharePerc;
        assert.equal(rewardPoolSharePerc / 1, 350);
        assert.equal(eventData.plotIncentive / 1, worthInPLOT[1] / 1);
        await increaseTime(8 * 60 * 60);
        await allMarkets.postResultMock(1, marketId);
        await increaseTime(8 * 60 * 60);
        let oldBalance = parseFloat(await plotusToken.balanceOf(user8));
        let oldBalanceEth = parseFloat(await web3.eth.getBalance(user8));
        tx = await marketIncentives.claimCreationReward(100, { from: user8 });
        let newBalance = parseFloat(await plotusToken.balanceOf(user8));
        let newBalanceEth = parseFloat(await web3.eth.getBalance(user8));
        assert.equal(
            (newBalance / 1e18).toFixed(2),
            (oldBalance / 1e18 + incentivesGained / 1e18 + (rewardPoolPlot * rewardPoolSharePerc) / 10000).toFixed(2)
        );
        assert.equal((newBalanceEth / 1e18).toFixed(2), (oldBalanceEth / 1e18 + (rewardPoolEth * rewardPoolSharePerc) / 10000).toFixed(2));
    });
    it("Scenario 8: Should not be able to get reward pool share of market more than max cap of 5%", async function() {
        await plotusToken.transfer(user14, toWei(500000));
        await plotusToken.approve(tokenController.address, toWei(10000000), { from: user14 });
        await tokenController.lock("0x534d", toWei(500000), 86400 * 30, { from: user14 });
        await chainlinkGasAgg.setLatestAnswer(450000);
        await increaseTime(4 * 3600);
        let tx = await allMarkets.createMarket(0, 0, { gasPrice: 450000, from: user14 });
        marketId++;

        await plotusToken.transfer(user7, toWei(10000));
        await plotusToken.approve(allMarkets.address, toWei(10000000), { from: user7 });
        await allMarkets.deposit(toWei(100), { from: user7, value: toWei(0.1) });

        await allMarkets.placePrediction(marketId, ethAddress, to8Power(0.1), 3, {
            from: user7,
        });
        await allMarkets.placePrediction(marketId, plotusToken.address, to8Power(100), 3, {
            from: user7,
        });
        let rewardPoolEth = 0.1;
        let rewardPoolPlot = 99.95;
        let events = await marketIncentives.getPastEvents("allEvents", { fromBlock: 0, toBlock: "latest" });
        eventData = findByTxHash(events, tx.tx);
        let gasUsed = eventData.gasUsed;
        let maxGas = 100 * 10 ** 9;
        let gasPrice = Math.min(maxGas, 450000 * 1.25, 450000);
        estimatedGasCost = gasPrice * gasUsed;
        let costInETH = estimatedGasCost;
        let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
        incentivesGained = eventData.plotIncentive / 1;
        let rewardPoolSharePerc = eventData.rewardPoolSharePerc;
        assert.equal(rewardPoolSharePerc / 1, 500);
        assert.equal(eventData.plotIncentive / 1, worthInPLOT[1] / 1);
        await increaseTime(8 * 60 * 60);
        await allMarkets.postResultMock(1, marketId);
        await increaseTime(8 * 60 * 60);
        let oldBalance = parseFloat(await plotusToken.balanceOf(user14));
        let oldBalanceEth = parseFloat(await web3.eth.getBalance(user14));
        tx = await marketIncentives.claimCreationReward(100, { from: user14 });
        let newBalance = parseFloat(await plotusToken.balanceOf(user14));
        let newBalanceEth = parseFloat(await web3.eth.getBalance(user14));
        assert.equal(
            (newBalance / 1e18).toFixed(2),
            (oldBalance / 1e18 + incentivesGained / 1e18 + (rewardPoolPlot * rewardPoolSharePerc) / 10000).toFixed(2)
        );
        assert.equal((newBalanceEth / 1e18).toFixed(2), (oldBalanceEth / 1e18 + (rewardPoolEth * rewardPoolSharePerc) / 10000).toFixed(2));
    });

    it("Raise Dispute and reject: Scenario 2: Should be able to get more reward pool share of market if market creator had staked tokens", async function() {
        //governance code
        let nullAddress = "0x0000000000000000000000000000";
        let pc = await masterInstance.getLatestAddress(web3.utils.toHex("PC"));
        pc = await ProposalCategory.at(pc);
        let newGV = await GovernanceNew.new();
        actionHash = encode1(["bytes2[]", "address[]"], [[toHex("GV")], [newGV.address]]);

        let p = await governance.getProposalLength();
        await governance.createProposal("proposal", "proposal", "proposal", 0);
        let canClose = await governance.canCloseProposal(p);
        assert.equal(parseFloat(canClose), 0);
        await governance.categorizeProposal(p, 7, 0);
        await governance.submitProposalWithSolution(p, "proposal", actionHash);
        await governance.submitVote(p, 1);
        await increaseTime(604800);
        await governance.closeProposal(p);
        await increaseTime(604800);
        await governance.triggerAction(p);
        await assertRevert(governance.triggerAction(p));
        await increaseTime(604800);

        let c1 = await pc.totalCategories();
        //proposal to add category
        actionHash = encode1(
            ["uint256", "string", "uint256", "uint256", "uint256", "uint256[]", "uint256", "string", "address", "bytes2", "uint256[]", "string"],
            [
                10,
                "ResolveDispute",
                3,
                50,
                50,
                [2],
                86400,
                "QmZQhJunZesYuCJkdGwejSATTR8eynUgV8372cHvnAPMaM",
                nullAddress,
                toHex("AM"),
                [0, 0],
                "resolveDispute(uint256,uint256)",
            ]
        );
        let p1 = await governance.getProposalLength();
        await governance.createProposalwithSolution("Add new member", "Add new member", "Addnewmember", 4, "Add new member", actionHash);
        await governance.submitVote(p1.toNumber(), 1);
        await governance.closeProposal(p1.toNumber());
        let cat2 = await pc.totalCategories();
        await increaseTime(604800);
        governance = await GovernanceNew.at(governance.address);
        await governance.setAllMarketsAddress();
        // governance code end

        await plotusToken.transfer(user10, toWei(250000));
        await plotusToken.approve(tokenController.address, toWei(10000000), { from: user10 });
        await tokenController.lock("0x534d", toWei(25000), 86400 * 30, { from: user10 });

        await chainlinkGasAgg.setLatestAnswer(450000);
        let tx = await allMarkets.createMarket(0, 0, { gasPrice: 450000, from: user10 });
        marketId++;

        await plotusToken.transfer(user7, toWei(10000));
        await plotusToken.approve(allMarkets.address, toWei(10000000), { from: user7 });
        await allMarkets.deposit(toWei(100), { from: user7 });
        await allMarkets.deposit(0, { from: user12, value: toWei(1.1) });

        await allMarkets.placePrediction(marketId, ethAddress, to8Power(0.1), 3, {
            from: user12,
        });
        await allMarkets.placePrediction(marketId, ethAddress, to8Power(1), 1, {
            from: user12,
        });
        await allMarkets.placePrediction(marketId, plotusToken.address, to8Power(100), 3, {
            from: user7,
        });

        let rewardPoolEth = 0.1;
        let rewardPoolPlot = 99.95;
        let events = await marketIncentives.getPastEvents("allEvents", { fromBlock: 0, toBlock: "latest" });
        eventData = findByTxHash(events, tx.tx);
        let gasUsed = eventData.gasUsed;
        let maxGas = 100 * 10 ** 9;
        let gasPrice = Math.min(maxGas, 450000 * 1.25, 450000);
        estimatedGasCost = gasPrice * gasUsed;
        let costInETH = estimatedGasCost;
        let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
        incentivesGained = eventData.plotIncentive / 1;
        let rewardPoolSharePerc = eventData.rewardPoolSharePerc;
        assert.equal(rewardPoolSharePerc / 1, 100);
        assert.equal(eventData.plotIncentive / 1, worthInPLOT[1] / 1);
        await increaseTime(8 * 60 * 60);
        await allMarkets.postResultMock(1, marketId);

        await plotusToken.transfer(user10, toWei(10000));
        await plotusToken.approve(allMarkets.address, toWei(10000000), { from: user10 });

        await allMarkets.raiseDispute(marketId, String(1400000000000), "raise dispute", "this is description", "this is solution hash", {
            from: user10,
        });
        await increaseTime(604800);
        await governance.closeProposal((await governance.getProposalLength()) / 1);
        await increaseTime(10000);
        let oldBalance = parseFloat(await plotusToken.balanceOf(user10));
        let oldBalanceEth = parseFloat(await web3.eth.getBalance(user10));
        tx = await marketIncentives.claimCreationReward(100, { from: user10 });
        let newBalance = parseFloat(await plotusToken.balanceOf(user10));
        let newBalanceEth = parseFloat(await web3.eth.getBalance(user10));
        assert.equal(
            (newBalance / 1e18).toFixed(2),
            (oldBalance / 1e18 + incentivesGained / 1e18 + (rewardPoolPlot * rewardPoolSharePerc) / 10000).toFixed(2)
        );
        assert.equal((newBalanceEth / 1e18).toFixed(2), (oldBalanceEth / 1e18 + (rewardPoolEth * rewardPoolSharePerc) / 10000).toFixed(2));
    });

    it("Raise Dispute and pass: Scenario 2: Should be able to get more reward pool share of market if market creator had staked tokens", async function() {
        await plotusToken.transfer(user10, toWei(250000));
        await plotusToken.approve(tokenController.address, toWei(10000000), { from: user10 });
        await tokenController.extendLock("0x534d", 86400 * 30, { from: user10 });
        await chainlinkGasAgg.setLatestAnswer(450000);
        await increaseTime(3610);

        let tx = await allMarkets.createMarket(0, 0, { gasPrice: 450000, from: user10 });
        marketId++;
        await plotusToken.transfer(user7, toWei(1000));
        await plotusToken.approve(allMarkets.address, toWei(10000000), { from: user7 });
        await allMarkets.deposit(0, { from: user12, value: toWei(1.1) });
        await allMarkets.deposit(toWei(200), { from: user7 });

        await allMarkets.placePrediction(marketId, ethAddress, to8Power(0.1), 1, { from: user12 });
        await allMarkets.placePrediction(marketId, ethAddress, to8Power(1), 1, { from: user12 });
        await allMarkets.placePrediction(marketId, plotusToken.address, to8Power(100), 3, { from: user7 });
        await allMarkets.placePrediction(marketId, plotusToken.address, to8Power(100), 1, { from: user7 });

        await increaseTime(8 * 60 * 60);
        await allMarkets.postResultMock(1, marketId);

        let proposalId = await governance.getProposalLength();
        await allMarkets.raiseDispute(marketId, "9999999000000000", "raise dispute", "this is description", "this is solution hash", {
            from: user10,
        });
        await plotusToken.approve(tokenController.address, "100000000000000000000000", { from: user2 });
        await plotusToken.transfer(user2, toWei(30000));
        await tokenController.lock("0x4452", "30000000000000000000000", 86400 * 20, { from: user2 });

        await plotusToken.approve(tokenController.address, "100000000000000000000000", { from: user3 });
        await plotusToken.transfer(user3, toWei(30000));
        await tokenController.lock("0x4452", "30000000000000000000000", 86400 * 20, { from: user3 });

        await plotusToken.approve(tokenController.address, "100000000000000000000000", { from: user4 });
        await plotusToken.transfer(user4, toWei(30000));
        await tokenController.lock("0x4452", "30000000000000000000000", 86400 * 20, { from: user4 });

        await governance.submitVote(proposalId, 1, { from: user2 });
        await governance.submitVote(proposalId, 1, { from: user3 });
        await governance.submitVote(proposalId, 1, { from: user4 });
        await increaseTime(604800);
        await governance.closeProposal(proposalId);
        await increaseTime(10000);

        let rewardPoolEth = 0.99;
        let rewardPoolPlot = 99.95;
        let events = await marketIncentives.getPastEvents("allEvents", { fromBlock: 0, toBlock: "latest" });
        eventData = findByTxHash(events, tx.tx);
        let gasUsed = eventData.gasUsed;
        let maxGas = 100 * 10 ** 9;
        let gasPrice = Math.min(maxGas, 450000 * 1.25, 450000);
        estimatedGasCost = gasPrice * gasUsed;
        let costInETH = estimatedGasCost;
        let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
        incentivesGained = eventData.plotIncentive / 1;
        let rewardPoolSharePerc = eventData.rewardPoolSharePerc;
        assert.equal(rewardPoolSharePerc / 1, 100);
        assert.equal(eventData.plotIncentive / 1, worthInPLOT[1] / 1);

        let oldBalance = parseFloat(await plotusToken.balanceOf(user10));
        let oldBalanceEth = parseFloat(await web3.eth.getBalance(user10));
        pendingRewards = await marketIncentives.getPendingMarketCreationRewards(user10, { from: user10 });
        tx = await marketIncentives.claimCreationReward(100, { from: user10 });
        let newBalance = parseFloat(await plotusToken.balanceOf(user10));
        let newBalanceEth = parseFloat(await web3.eth.getBalance(user10));
        assert.equal((newBalance / 1e18).toFixed(2), (oldBalance / 1e18 + pendingRewards[0] / 1e18 + pendingRewards[1] / 1e18).toFixed(2));
        assert.equal((newBalanceEth / 1e18).toFixed(2), (oldBalanceEth / 1e18 + pendingRewards[2] / 1e18).toFixed(2));
        assert.equal(
            (newBalance / 1e18).toFixed(2),
            (oldBalance / 1e18 + incentivesGained / 1e18 + (rewardPoolPlot * rewardPoolSharePerc) / 10000).toFixed(2)
        );
        assert.equal((newBalanceEth / 1e18).toFixed(2), (oldBalanceEth / 1e18 + (rewardPoolEth * rewardPoolSharePerc) / 10000).toFixed(2));
    });

    let plotGasIncentiveForMarket1,
        plotPoolShareExpectedForMarket1,
        ethExpectedForMarket1,
        plotGasIncentiveForMarket2,
        plotPoolShareExpectedForMarket2,
        ethExpectedForMarket2,
        plotGasIncentiveForMarket3,
        plotPoolShareExpectedForMarket3,
        ethExpectedForMarket3,
        plotGasIncentiveForMarket4,
        plotPoolShareExpectedForMarket4,
        ethExpectedForMarket4,
        market1,
        market2,
        market3,
        market4;

    it("Create Market 1", async function() {
        await chainlinkGasAgg.setLatestAnswer(450000);
        await increaseTime(8 * 60 * 60);
        let tx = await allMarkets.createMarket(0, 0, { gasPrice: 450000, from: user2 });
        marketId++;
        market1 = marketId;
        await marketIncentives.claimCreationReward(5, { from: user2 });

        await plotusToken.transfer(user7, toWei(1000));
        await plotusToken.approve(allMarkets.address, toWei(10000000), { from: user7 });
        await allMarkets.deposit(0, { from: user7, value: toWei(1.1) });
        await allMarkets.deposit(toWei(100), { from: user7 });

        await allMarkets.placePrediction(marketId, ethAddress, to8Power(0.1), 3, { from: user7 });
        await allMarkets.placePrediction(marketId, ethAddress, to8Power(1), 1, { from: user7 });
        await allMarkets.placePrediction(marketId, plotusToken.address, to8Power(100), 3, { from: user7 });
        let rewardPoolEth = 0.1;
        let rewardPoolPlot = 99.95;
        let events = await marketIncentives.getPastEvents("allEvents", { fromBlock: 0, toBlock: "latest" });
        eventData = findByTxHash(events, tx.tx);
        let gasUsed = eventData.gasUsed;
        let maxGas = 100 * 10 ** 9;
        let gasPrice = Math.min(maxGas, 450000 * 1.25, 450000);
        estimatedGasCost = gasPrice * gasUsed;
        let costInETH = estimatedGasCost;
        let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
        incentivesGained = eventData.plotIncentive / 1;
        let rewardPoolSharePerc = eventData.rewardPoolSharePerc;
        assert.equal(rewardPoolSharePerc / 1, 50);
        assert.equal(eventData.plotIncentive / 1, worthInPLOT[1] / 1);
        plotGasIncentiveForMarket1 = incentivesGained / 1e18;
        plotPoolShareExpectedForMarket1 = (rewardPoolPlot * rewardPoolSharePerc) / 10000;
        ethExpectedForMarket1 = (rewardPoolEth * rewardPoolSharePerc) / 10000;
    });
    it("Create Market 2", async function() {
        await chainlinkGasAgg.setLatestAnswer(450000);
        let tx = await allMarkets.createMarket(1, 0, { gasPrice: 450000, from: user2 });
        marketId++;
        market2 = marketId;
        await marketIncentives.claimCreationReward(5, { from: user2 });

        await plotusToken.transfer(user7, toWei(1000));
        await plotusToken.transfer(user12, toWei(1000));
        await plotusToken.approve(allMarkets.address, toWei(10000000), { from: user7 });
        await plotusToken.approve(allMarkets.address, toWei(10000000), { from: user12 });
        await allMarkets.deposit(toWei(100), { from: user7, value: toWei(0.1) });
        await allMarkets.deposit(toWei(100), { from: user12, value: toWei(1) });

        await allMarkets.placePrediction(marketId, ethAddress, to8Power(0.1), 3, { from: user7 });
        await allMarkets.placePrediction(marketId, ethAddress, to8Power(1), 1, { from: user12 });
        await allMarkets.placePrediction(marketId, plotusToken.address, to8Power(100), 3, { from: user7 });
        await allMarkets.placePrediction(marketId, plotusToken.address, to8Power(100), 1, { from: user12 });
        let rewardPoolEth = 0.99;
        let rewardPoolPlot = 99.95;
        let events = await marketIncentives.getPastEvents("allEvents", { fromBlock: 0, toBlock: "latest" });
        eventData = findByTxHash(events, tx.tx);
        let gasUsed = eventData.gasUsed;
        let maxGas = 100 * 10 ** 9;
        let gasPrice = Math.min(maxGas, 450000 * 1.25, 450000);
        estimatedGasCost = gasPrice * gasUsed;
        let costInETH = estimatedGasCost;
        let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
        incentivesGained = eventData.plotIncentive / 1;
        let rewardPoolSharePerc = eventData.rewardPoolSharePerc;
        assert.equal(rewardPoolSharePerc / 1, 50);
        assert.equal(eventData.plotIncentive / 1, worthInPLOT[1] / 1);
        plotGasIncentiveForMarket2 = incentivesGained / 1e18;
        plotPoolShareExpectedForMarket2 = (rewardPoolPlot * rewardPoolSharePerc) / 10000;
        ethExpectedForMarket2 = (rewardPoolEth * rewardPoolSharePerc) / 10000;
    });
    it("Create Market 3", async function() {
        await chainlinkGasAgg.setLatestAnswer(450000);
        let tx = await allMarkets.createMarket(0, 1, { gasPrice: 450000, from: user2 });
        marketId++;
        market3 = marketId;
        await marketIncentives.claimCreationReward(5, { from: user2 });

        await plotusToken.transfer(user7, toWei(1000));
        await plotusToken.approve(allMarkets.address, toWei(10000000), { from: user7 });
        await allMarkets.deposit(toWei(100), { from: user7, value: toWei(0.1) });

        await allMarkets.placePrediction(marketId, ethAddress, to8Power(0.1), 3, {
            from: user7,
        });
        await allMarkets.placePrediction(marketId, ethAddress, to8Power(1), 1, {
            from: user7,
        });
        await allMarkets.placePrediction(marketId, plotusToken.address, to8Power(100), 3, {
            from: user7,
        });
        let rewardPoolEth = 0.1;
        let rewardPoolPlot = 99.95;
        let events = await marketIncentives.getPastEvents("allEvents", { fromBlock: 0, toBlock: "latest" });
        eventData = findByTxHash(events, tx.tx);
        let gasUsed = eventData.gasUsed;
        let maxGas = 100 * 10 ** 9;
        let gasPrice = Math.min(maxGas, 450000 * 1.25, 450000);
        estimatedGasCost = gasPrice * gasUsed;
        let costInETH = estimatedGasCost;
        let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
        incentivesGained = eventData.plotIncentive / 1;
        let rewardPoolSharePerc = eventData.rewardPoolSharePerc;
        assert.equal(rewardPoolSharePerc / 1, 50);
        assert.equal(eventData.plotIncentive / 1, worthInPLOT[1] / 1);
        plotGasIncentiveForMarket3 = incentivesGained / 1e18;
        plotPoolShareExpectedForMarket3 = (rewardPoolPlot * rewardPoolSharePerc) / 10000;
        ethExpectedForMarket3 = (rewardPoolEth * rewardPoolSharePerc) / 10000;
    });
    it("Should not be able to claim market 1,2,3 pool share", async function() {
        tx = await assertRevert(marketIncentives.claimCreationReward(100, { from: user2 }));
        await increaseTime(8 * 60 * 60);
        await allMarkets.postResultMock(1, market1);
        await allMarkets.postResultMock(1, market2);
        let proposalId = await governance.getProposalLength();
        await allMarkets.raiseDispute(market2, 1400000000000, "raise dispute", "this is description", "this is solution hash", { from: user10 });
    });
    it("Should be able to claim market 1 rewards", async function() {
        await increaseTime(2 * 60 * 60);
        let oldBalance = parseFloat(await plotusToken.balanceOf(user2));
        let oldBalanceEth = parseFloat(await web3.eth.getBalance(user2));
        tx = await marketIncentives.claimCreationReward(100, { from: user2 });
        let newBalance = parseFloat(await plotusToken.balanceOf(user2));
        let newBalanceEth = parseFloat(await web3.eth.getBalance(user2));
        assert.equal((newBalance / 1e18).toFixed(2), (oldBalance / 1e18 + plotPoolShareExpectedForMarket1).toFixed(2));
        assert.equal((newBalanceEth / 1e18).toFixed(2), (oldBalanceEth / 1e18 + ethExpectedForMarket1).toFixed(2));
        tx = await assertRevert(marketIncentives.claimCreationReward(100, { from: user2 }));
    });
    it("Create Market 4", async function() {
        await chainlinkGasAgg.setLatestAnswer(450000);
        let tx = await allMarkets.createMarket(0, 0, { gasPrice: 450000, from: user2 });
        await marketIncentives.claimCreationReward(5, { from: user2 });
        marketId++;
        market4 = marketId;

        await plotusToken.transfer(user7, toWei(1000));
        await plotusToken.approve(allMarkets.address, toWei(10000000), { from: user7 });
        await allMarkets.deposit(toWei(100), { from: user7, value: toWei(1.1) });

        await allMarkets.placePrediction(marketId, ethAddress, to8Power(0.1), 3, { from: user7 });
        await allMarkets.placePrediction(marketId, ethAddress, to8Power(1), 1, { from: user7 });
        await allMarkets.placePrediction(marketId, plotusToken.address, to8Power(100), 3, { from: user7 });
        let rewardPoolEth = 0.1;
        let rewardPoolPlot = 99.95;
        let events = await marketIncentives.getPastEvents("allEvents", { fromBlock: 0, toBlock: "latest" });
        eventData = findByTxHash(events, tx.tx);
        let gasUsed = eventData.gasUsed;
        let maxGas = 100 * 10 ** 9;
        let gasPrice = Math.min(maxGas, 450000 * 1.25, 450000);
        estimatedGasCost = gasPrice * gasUsed;
        let costInETH = estimatedGasCost;
        let worthInPLOT = await marketConfig.getValueAndMultiplierParameters(ethAddress, costInETH + "");
        incentivesGained = eventData.plotIncentive / 1;
        let rewardPoolSharePerc = eventData.rewardPoolSharePerc;
        assert.equal(rewardPoolSharePerc / 1, 50);
        assert.equal(eventData.plotIncentive / 1, worthInPLOT[1] / 1);
        plotGasIncentiveForMarket4 = incentivesGained / 1e18;
        plotPoolShareExpectedForMarket4 = (rewardPoolPlot * rewardPoolSharePerc) / 10000;
        ethExpectedForMarket4 = (rewardPoolEth * rewardPoolSharePerc) / 10000;
    });
    it("Should be able to claim market 4 rewards", async function() {
		await increaseTime(8*60*60);
        await allMarkets.postResultMock(1, market4);
		await increaseTime(2*60*60);
        let oldBalance = parseFloat(await plotusToken.balanceOf(user2));
        let oldBalanceEth = parseFloat(await web3.eth.getBalance(user2));
        tx = await marketIncentives.claimCreationReward(100, { from: user2 });
        let newBalance = parseFloat(await plotusToken.balanceOf(user2));
        let newBalanceEth = parseFloat(await web3.eth.getBalance(user2));
        assert.equal((newBalance / 1e18).toFixed(2), (oldBalance / 1e18 + plotPoolShareExpectedForMarket4).toFixed(2));
        assert.equal((newBalanceEth / 1e18).toFixed(2), (oldBalanceEth / 1e18 + ethExpectedForMarket4).toFixed(2));
        tx = await assertRevert(marketIncentives.claimCreationReward(100, { from: user2 }));
    });
    it("Accept dispute of Market2 and should be able to claim its reward pool share perc", async function() {
        let proposalId = await governance.getProposalLength();
        proposalId = proposalId * 1 - 1;
        await plotusToken.approve(tokenController.address, "100000000000000000000000", { from: user2 });
        await plotusToken.transfer(user2, toWei(30000));
        await tokenController.extendLock("0x4452", 86400 * 20, { from: user2 });

        await plotusToken.approve(tokenController.address, "100000000000000000000000", { from: user3 });
        await plotusToken.transfer(user3, toWei(30000));
        await tokenController.extendLock("0x4452", 86400 * 20, { from: user3 });

        await plotusToken.approve(tokenController.address, "100000000000000000000000", { from: user4 });
        await plotusToken.transfer(user4, toWei(30000));
        await tokenController.extendLock("0x4452", 86400 * 20, { from: user4 });

        await governance.submitVote(proposalId, 1, { from: user2 });
        await governance.submitVote(proposalId, 1, { from: user3 });
        await governance.submitVote(proposalId, 1, { from: user4 });
        await increaseTime(604800);
        await governance.closeProposal(proposalId);
        await increaseTime(10000);

        let oldBalance = parseFloat(await plotusToken.balanceOf(user2));
        let oldBalanceEth = parseFloat(await web3.eth.getBalance(user2));
        tx = await marketIncentives.claimCreationReward(100, { from: user2 });
        let newBalance = parseFloat(await plotusToken.balanceOf(user2));
        let newBalanceEth = parseFloat(await web3.eth.getBalance(user2));
        assert.equal((newBalance / 1e18).toFixed(2), (oldBalance / 1e18 + plotPoolShareExpectedForMarket2).toFixed(2));
        assert.equal((newBalanceEth / 1e18).toFixed(2), (oldBalanceEth / 1e18 + ethExpectedForMarket2).toFixed(2));
    });

    it("should be able to claim market participation rewards", async function() {
        let reward = await allMarkets.getReturn(user7, market2);
        await allMarkets.withdrawMax(100, { from: user7 });
        let perc = await marketIncentives.getMarketCreatorRPoolShareParams(market2 , 0, 0);
        assert.equal(reward[0][0] / 1e18, 99.95 + 99.95 - (perc[0] * 1 * 99.95) / 10000);
    });

    it("Should be able to claim market 3 rewards", async function() {
        await increaseTime(2*24*60*60);
		await allMarkets.postResultMock(1, market3);
        await increaseTime(2*24*60*60);
        let oldBalance = parseFloat(await plotusToken.balanceOf(user2));
        let oldBalanceEth = parseFloat(await web3.eth.getBalance(user2));
        tx = await marketIncentives.claimCreationReward(100, { from: user2 });
        let newBalance = parseFloat(await plotusToken.balanceOf(user2));
        let newBalanceEth = parseFloat(await web3.eth.getBalance(user2));
        assert.equal((newBalance / 1e18).toFixed(2), (oldBalance / 1e18 + plotPoolShareExpectedForMarket3).toFixed(2));
        assert.equal((newBalanceEth / 1e18).toFixed(2), (oldBalanceEth / 1e18 + ethExpectedForMarket3).toFixed(2));
        tx = await assertRevert(marketIncentives.claimCreationReward(100, { from: user2 }));
    });

    // it("Should Add category to pause market creation of particular type of market", async function() { //     await increaseTime(604800); //     let c1 = await pc.totalCategories(); //     //proposal to add category //     let actionHash = encode1( //         ["string", "uint256", "uint256", "uint256", "uint256[]", "uint256", "string", "address", "bytes2", "uint256[]", "string"], //         [ //             "Pause", //             1, //             50, //             50, //             [1], //             86400, //             "QmZQhJunZesYuCJkdGwejSATTR8eynUgV8372cHvnAPMaM", //             nullAddress, //             toHex("PL"), //             [0, 0, 0, 1], //             "toggleMarketCreationType(uint256,bool)", //         ] //     ); //     let p1 = await governance.getProposalLength(); //     await governance.createProposalwithSolution("Add new member", "Add new member", "Addnewmember", 3, "Add new member", actionHash); //     await governance.submitVote(p1.toNumber(), 1); //     await governance.closeProposal(p1.toNumber()); //     let cat2 = await pc.totalCategories(); //     assert.notEqual(c1.toNumber(), cat2.toNumber(), "category not updated"); // }); // it("Should pause market creation of particular type of market", async function() { //     await plotusNewInstance.createMarket(0, 0); //     await increaseTime(604800); //     let c1 = await pc.totalCategories(); //     //proposal to add category //     actionHash = encode1(["uint256", "bool"], [0, true]); //     let p1 = await governance.getProposalLength(); //     await governance.createProposalwithSolution("Add new member", "Add new member", "Addnewmember", c1 - 1, "Add new member", actionHash); //     await governance.submitVote(p1.toNumber(), 1); //     await governance.closeProposal(p1.toNumber()); //     assert.equal((await governance.proposalActionStatus(p1.toNumber())) / 1, 3); //     let cat2 = await pc.totalCategories(); //     assert.notEqual(c1, cat2, "category not updated"); //     await assertRevert(plotusNewInstance.createMarket(0, 0)); // }); // it("Should not execute if market is already paused", async function() { //     await increaseTime(604800); //     let c1 = await pc.totalCategories(); //     //proposal to add category //     actionHash = encode1(["uint256", "bool"], [0, true]); //     let p1 = await governance.getProposalLength(); //     await governance.createProposalwithSolution("Add new member", "Add new member", "Addnewmember", c1 - 1, "Add new member", actionHash); //     await governance.submitVote(p1.toNumber(), 1); //     await governance.closeProposal(p1.toNumber()); //     assert.equal((await governance.proposalActionStatus(p1.toNumber())) / 1, 1); // }); // it("Should resume market creation of particular type of market", async function() { //     await increaseTime(604800); //     await assertRevert(plotusNewInstance.createMarket(0, 0)); //     await increaseTime(604800); //     let c1 = await pc.totalCategories(); //     //proposal to add category //     actionHash = encode1(["uint256", "bool"], [0, false]); //     let p1 = await governance.getProposalLength(); //     await governance.createProposalwithSolution("Add new member", "Add new member", "Addnewmember", c1 - 1, "Add new member", actionHash); //     await governance.submitVote(p1.toNumber(), 1); //     await governance.closeProposal(p1.toNumber()); //     assert.equal((await governance.proposalActionStatus(p1.toNumber())) / 1, 3); //     await plotusNewInstance.createMarket(0, 0); // }); // it("Should update MAXRPSP variable", async function() { //     await updateParameter(20, 2, "MAXRPSP", plotusNewInstance, "configUint", 5000); //     configData = await plotusNewInstance.getUintParameters(toHex("MAXRPSP")); //     assert.equal(configData[1], 5000, "Not updated"); // }); // it("Should update MINRPSP variable", async function() { //     await updateParameter(20, 2, "MINRPSP", plotusNewInstance, "configUint", 5000); //     configData = await plotusNewInstance.getUintParameters(toHex("MINRPSP")); //     assert.equal(configData[1], 5000, "Not updated"); // }); // it("Should update RPSTH variable", async function() { //     await updateParameter(20, 2, "RPSTH", plotusNewInstance, "configUint", 5000); //     configData = await plotusNewInstance.getUintParameters(toHex("RPSTH")); //     assert.equal(configData[1], 5000, "Not updated"); // }); // it("Should update Chainlink gas aggrefgartor address", async function() { //     let clAgg = await MockChainLinkGasPriceAgg.new(); //     await updateParameter(21, 2, "GASAGG", plotusNewInstance, "configAddress", clAgg.address); //     let address = await plotusNewInstance.clGasPriceAggregator(); //     assert.equal(address, clAgg.address, "Not updated"); // }); // it("Should update Token Stake For Dispute", async function() { //     await updateParameter(20, 2, "TSDISP", plotusNewInstance, "configUint", 26); //     let configData = await marketConfig.getDisputeResolutionParams(); //     assert.equal(configData, 26, "Not updated"); // }); // it("Should update Uniswap Factory", async function() { //     let uniswapFactory = await MockUniswapFactory.new(); //     await updateParameter(21, 2, "UNIFAC", plotusNewInstance, "configAddress", uniswapFactory.address); //     let configData = await marketConfig.getFeedAddresses(); //     assert.equal(configData, uniswapFactory.address, "Not updated"); // });
});
