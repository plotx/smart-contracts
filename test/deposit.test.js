const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("MarketRegistry");
const Master = artifacts.require("Master");
const MemberRoles = artifacts.require("MemberRoles");
const PlotusToken = artifacts.require("MockPLOT");
const MockWeth = artifacts.require("MockWeth");
const MarketUtility = artifacts.require("MockConfig");
const MockConfig = artifacts.require("MockConfig");
const Governance = artifacts.require("Governance");
const AllMarkets = artifacts.require("MockAllMarkets");
const MockUniswapRouter = artifacts.require("MockUniswapRouter");
const MockUniswapV2Pair = artifacts.require("MockUniswapV2Pair");
const MockUniswapFactory = artifacts.require("MockUniswapFactory");
const TokenController = artifacts.require("MockTokenController");
const web3 = Market.web3;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const assertRevert = require("./utils/assertRevert").assertRevert;
const latestTime = require("./utils/latestTime").latestTime;
const encode = require("./utils/encoder.js").encode;
const { toHex, toWei, toChecksumAddress } = require("./utils/ethTools");
const gvProposal = require("./utils/gvProposal.js").gvProposalWithIncentiveViaTokenHolder;

var initialPLOTPrice;
var initialEthPrice;
const ethAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
var nullAddress = "0x0000000000000000000000000000000000000000";
let marketId= 0;

contract("AllMarket", async function([user1, user2, user3, user4]) {
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
        allMarkets;
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
        allMarkets = await AllMarkets.at(await masterInstance.getLatestAddress(web3.utils.toHex("AM")));
        
        await marketConfig.setWeth(weth.address);

        newUtility = await MarketUtility.new();
        existingMarkets = await plotusNewInstance.getOpenMarkets();
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

        await plotusToken.transfer(user2,toWei(1000));
        await plotusToken.transfer(user3,toWei(1000));

        await plotusToken.approve(allMarkets.address,toWei(10000),{from:user2});
        await plotusToken.approve(allMarkets.address,toWei(10000),{from:user3});        
    });

    it("Should be able to withdraw deposited ETH even without paerticipating", async function() {
        let ethBalBefore = await web3.eth.getBalance(user2);
        tx = await allMarkets.deposit(0,{from:user2,value:toWei(1)});
        let unusedBal = await allMarkets.getUserUnusedBalance(user2);
        let ethBalAfter = await web3.eth.getBalance(user2);
        assert.equal(Math.round((ethBalBefore - ethBalAfter)/1e18),1);
        assert.equal(unusedBal[2],toWei(1));

        await allMarkets.withdrawMax(10,{from:user2});

        let ethBalAfter2 = await web3.eth.getBalance(user2);
        unusedBal = await allMarkets.getUserUnusedBalance(user2);

        assert.equal(Math.round((ethBalAfter2 - ethBalAfter)/1e18),1);
        assert.equal(unusedBal[2],0);

    });

    it("Should be able to withdraw deposited Plot even without paerticipating", async function() {
        
        let plotBalBefore = await plotusToken.balanceOf(user2);
        tx = await allMarkets.deposit(toWei(1),{from:user2});
        let unusedBal = await allMarkets.getUserUnusedBalance(user2);
        let plotBalAfter = await plotusToken.balanceOf(user2);
        assert.equal(plotBalBefore - plotBalAfter,toWei(1));
        assert.equal(unusedBal[0],toWei(1));

        await allMarkets.withdrawMax(10,{from:user2});

        let plotBalAfter2 = await plotusToken.balanceOf(user2);
        unusedBal = await allMarkets.getUserUnusedBalance(user2);

        assert.equal(plotBalAfter2 - plotBalAfter,toWei(1));
        assert.equal(unusedBal[0],0);

    });

    it("Should be able to predict with max deposit after depositing eth", async function() {

        await allMarkets.createMarket(0, 0,{from:user4});

        await allMarkets.setOptionPrice(7, 1, 9);
        await allMarkets.setOptionPrice(7, 2, 18);
        await allMarkets.setOptionPrice(7, 3, 27);
        await marketConfig.setNextOptionPrice(toWei(0.001));

        tx = await allMarkets.deposit(0,{from:user2,value:toWei(0.001)});

        let ethBalbefore = await web3.eth.getBalance(user2);

        await allMarkets.placePrediction(7, ethAddress, 1, 1e5, { from: user2 });
        let unusedBal = await allMarkets.getUserUnusedBalance(user2);
        assert.equal(unusedBal[0],0);

        await allMarkets.withdrawMax(10,{from:user2});

        let ethBalAfter = await web3.eth.getBalance(user2);

        assert.equal(Math.round((ethBalAfter - ethBalbefore)/1e15),1);

    });
});
