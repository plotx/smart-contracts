const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Market = artifacts.require("MockMarket");
const Plotus = artifacts.require("MarketRegistry");
const Master = artifacts.require("Master");
const MemberRoles = artifacts.require("MemberRoles");
const PlotusToken = artifacts.require("MockPLOT");
const MockWeth = artifacts.require("MockWeth");
const MarketUtility = artifacts.require("MarketUtilityNew");
const MockConfig = artifacts.require("MockConfig");
const Governance = artifacts.require("Governance");
const AllMarkets = artifacts.require("AllMarkets");
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
        await marketConfig.setWeth(weth.address);
    });

    it("Should Update Existing Markets Implementation", async function() {
        let newUtility = await MarketUtility.new();
        let existingMarkets = await plotusNewInstance.getOpenMarkets();
        let actionHash = encode("upgradeContractImplementation(address,address)", marketConfig.address, newUtility.address);
        await gvProposal(6, actionHash, await MemberRoles.at(await masterInstance.getLatestAddress(toHex("MR"))), governance, 2, 0);
        await increaseTime(604800);
        marketConfig = await MarketUtility.at(marketConfig.address);
    });

    it("Should not allow to re initialize Utility after updating Implementation", async function() {
        await assertRevert(
            marketConfig.initialize([user1, MockUniswapRouterInstance.address, plotusToken.address, mockUniswapFactory.address], user1)
        );
    });

    it("Deploy uniswap v2 pair and add liquidity", async function() {
        mockUniswapV2Pair = await MockUniswapV2Pair.new();
        await mockUniswapV2Pair.initialize(plotusToken.address, weth.address);
        await weth.deposit({ from: user4, value: toWei(10) });
        await weth.transfer(mockUniswapV2Pair.address, toWei(10), { from: user4 });
        await plotusToken.transfer(mockUniswapV2Pair.address, toWei(1000));
        initialPLOTPrice = 1000 / 10;
        initialEthPrice = 10 / 1000;
        await mockUniswapFactory.setPair(mockUniswapV2Pair.address);
        await mockUniswapV2Pair.sync();
    });

    // it("Check price of plot", async function() { // 	await increaseTime(3610); // 	await assertRevert(plotusNewInstance.createMarket(0,0)); // 	await marketConfig.setInitialCummulativePrice(); // 	await assertRevert(marketConfig.setInitialCummulativePrice()); // 	await mockUniswapV2Pair.sync(); // 	await increaseTime(3610); // 	await plotusNewInstance.createMarket(0,0); // 	let currentPrice = (await marketConfig.getPrice(mockUniswapV2Pair.address, toWei(1)))/1; // 	assert.equal(initialEthPrice, currentPrice/1e18); // 	await plotusNewInstance.createMarket(0,1); // 	await increaseTime(3610); // 	await mockUniswapV2Pair.sync(); // 	await plotusNewInstance.createMarket(0,0); // 	await increaseTime(3610); // 	await mockUniswapV2Pair.sync(); // 	currentPrice = (await marketConfig.getPrice(mockUniswapV2Pair.address, toWei(1)))/1; // 	assert.equal(initialEthPrice, currentPrice/1e18); // 	let plotPriceInEth = ((await marketConfig.getAssetPriceInETH(plotusToken.address))[0])/1; // 	assert.equal(initialEthPrice, plotPriceInEth/1e18); // 	let ethPriceInEth = ((await marketConfig.getAssetPriceInETH(ethAddress))[0])/1; // 	assert.equal(ethPriceInEth, 1); // });
    it("Should add AllMarkets as new contract in Master", async function () {
        let newUtility = await MarketUtility.new();
        let existingMarkets = await plotusNewInstance.getOpenMarkets();
        let actionHash = encode("upgradeContractImplementation(address,address)", marketConfig.address, newUtility.address);
        await gvProposal(6, actionHash, await MemberRoles.at(await masterInstance.getLatestAddress(toHex("MR"))), governance, 2, 0);
        await increaseTime(604800);
        marketConfig = await MarketUtility.at(marketConfig.address);
    });

    it("Create market in new contract", async function() {
        allMarkets = await AllMarkets.new();
        await allMarkets.initiate(plotusToken.address);
        var date = await latestTime();
        await increaseTime(3610);
        date = Math.round(date);
        await marketConfig.setInitialCummulativePrice();
        await marketConfig.setAuthorizedAddress(allMarkets.address);
        let utility = await MarketUtility.at("0xCBc7df3b8C870C5CDE675AaF5Fd823E4209546D2");
        await utility.setAuthorizedAddress(allMarkets.address);
        await mockUniswapV2Pair.sync();
        await allMarkets.addInitialMarketTypesAndStart(date, "0x5e2aa6b66531142bEAB830c385646F97fa03D80a");
        await increaseTime(3610);
        let tx = await allMarkets.createMarket(0, ~~(await latestTime()), 0);
        assert.equal(tx.logs[0].event, "MarketResult");
    });

    it("Place Prediction", async function() {
        await assertRevert(allMarkets.placePrediction(1, ethAddress, toWei("0.1"), 1, { from: user3 })); //revert as not enough deposit 
        await plotusToken.transfer(user3, toWei(2000));
        await plotusToken.approve(allMarkets.address, toWei(100000), { from: user3, });
        await allMarkets.deposit(toWei(1000), { value: toWei("0.3"), from: user3 });
        await plotusToken.approve(tokenController.address, toWei(100000), { from: user3 });
        

        await assertRevert(allMarkets.placePrediction(1, ethAddress, toWei("0.1"), 4, { from: user3 })); //revert as option not suitable. 

        tx = await allMarkets.placePrediction(1, ethAddress, toWei("0.1"), 2, { from: user3 });
        await allMarkets.placePrediction(1, ethAddress, toWei("0.1"), 1, { from: user3 });
        // await allMarkets.placePrediction(1, ethAddress, toWei("0.1"), 3, { from: user3 });
        assert.equal(tx.logs[0].event, "PlacePrediction");
        assert.equal(tx.logs[0].args.user, user3);
        assert.equal(String(tx.logs[0].args.value), toWei("0.1"));
        const predictionPointETH = parseInt(tx.logs[0].args.predictionPoints);
        assert.equal(String(tx.logs[0].args.predictionAsset), ethAddress);
        assert.equal(String(tx.logs[0].args.marketId), String(1));

        tx = await allMarkets.placePrediction(1, plotusToken.address, toWei("10"), 2, { from: user3 });
        assert.equal(tx.logs[0].event, "PlacePrediction");
        assert.equal(tx.logs[0].args.user, user3);
        assert.equal(parseInt(tx.logs[0].args.value), toWei("10"));
        const predictionPointPLOT = parseInt(tx.logs[0].args.predictionPoints);
        assert.equal(tx.logs[0].args.predictionAsset, plotusToken.address);
        assert.equal(String(tx.logs[0].args.marketId), String(1));

        assert.equal(((predictionPointETH + predictionPointETH * 0.0005) / 1e18).toFixed(4), (predictionPointPLOT / 1e18).toFixed(4));

        const userETHBefore = (await web3.eth.getBalance(user3)) / 1e18;
        const userPlotBefore = parseInt(await plotusToken.balanceOf(user3)) / 1e18;

        const settleTime = (await allMarkets.marketSettleTime(1)) / 1;
        const coolingTime = (await allMarkets.marketCoolDownTime(1)) / 1;

        await increaseTime(settleTime - (await latestTime()) / 1);
        await allMarkets.settleMarket(1);
        await increaseTime(coolingTime + 10);

        await allMarkets.createMarket(0, ~~(await latestTime()), 0);
        await allMarkets.placePrediction(2, ethAddress, toWei("0.05"), 2, { from: user3 })
        await increaseTime(7201);
        await allMarkets.settleMarket(2);
        await increaseTime(1000);

        tx = await allMarkets.withdraw(5, { from: user3 }); //No log as user lost prediction
        console.log(tx.logs.length, 0);

        const userETHAfter = (await web3.eth.getBalance(user3)) / 1e18;
        const userPlotAfter = parseInt(await plotusToken.balanceOf(user3)) / 1e18;

        console.log(userETHBefore.toFixed(5), userETHAfter.toFixed(5));
        console.log((userPlotBefore + 990).toFixed(5), userPlotAfter.toFixed(5));
    });

    it("Claim Rewards", async function() {
        const userETHBefore = (await web3.eth.getBalance(user3)) / 1e18;
        await allMarkets.deposit(0, { value: toWei("10"), from: user3 });
        for (let i = 0; i < 30; i++) {
            await increaseTime(7200);
            await allMarkets.createMarket(0, ~~(await latestTime()), 0);
            await allMarkets.placePrediction(i+3, ethAddress, toWei("0.1"), 2, { from: user3 });
        }

        await increaseTime(7210);
        await allMarkets.settleMarket(32);
        await increaseTime(1000);

        assert.equal((await allMarkets.getTotalStakedValueInPLOT(31)) / 1e18, 9.99);
        console.log((await allMarkets.getTotalStakedValueInPLOT(32)) / 1e18, 9.99);
        let tx1 = await allMarkets.withdraw(30, { from: user3 });
        let tx2 = await allMarkets.withdraw(30, { from: user3 });
        const userETHAfter = (await web3.eth.getBalance(user3)) / 1e18;

        assert.equal(tx1.logs.length, 30);
        assert.equal(tx2.logs.length, 0);
        assert.equal(tx1.logs[0].event, "Claimed");
        assert.equal(tx1.logs[0].args.user, user3);
        console.log(parseInt(tx1.logs[0].args.reward[0])/1e18, "?");
        console.log(parseInt(tx1.logs[0].args.reward[1])/1e18, 0.1-0.1*0.001);
        assert.equal((tx1.logs[0].args._predictionAssets[0]), plotusToken.address);
        assert.equal((tx1.logs[0].args._predictionAssets[1]), ethAddress);
        assert.equal(String(tx1.logs[0].args.incentive), "0");
        assert.equal((tx1.logs[0].args.incentiveToken), "0x0000000000000000000000000000000000000000");
        console.log((userETHBefore-userETHAfter).toFixed(5), (0.1*30*0.001).toFixed(5));
    });

    it("Claim market creation reward", async () => {
        await assertRevert(allMarkets.claimCreationReward())
        await plotusToken.transfer(allMarkets.address, toWei(2000));
        const plotusBalanceBefore = (parseInt(await plotusToken.balanceOf(allMarkets.address)) / 1e18);
        const userBalanceBefore = (parseInt(await plotusToken.balanceOf(user1)) / 1e18);
        await allMarkets.claimCreationReward();
        const plotusBalanceAfter = (parseInt(await plotusToken.balanceOf(allMarkets.address)) / 1e18);
        const userBalanceAfter = (parseInt(await plotusToken.balanceOf(user1)) / 1e18);
        assert.equal((plotusBalanceBefore - plotusBalanceAfter).toFixed(5), (userBalanceAfter-userBalanceBefore).toFixed(5));
        assert.equal((plotusBalanceBefore - plotusBalanceAfter).toFixed(5), (33*50).toFixed(5)); //32 markets were created till now
    });

    it("Negative cases", async () => {
        await allMarkets.createMarket(0, ~~(await latestTime()+100), 0);
        console.log(`Time now: ${await latestTime()}. And market settleTime: ${await allMarkets.marketSettleTime(32)}`);
        await assertRevert(allMarkets.createMarket(0, ~~((await latestTime()) + 100), 0));
        await allMarkets.deposit(0, { value: toWei("1"), from: user3 });
        await assertRevert(allMarkets.placePrediction(32, ethAddress, toWei("1"), 2, { from: user3 }));
        await assertRevert(allMarkets.claimCreationReward({ from: user2 }));
    });

    // Need Governance for this
    // it("Add and remove new market type", async () => { //     const receiptAdd = await allMarkets.addMarketType(2*50, 25) //     const receiptRemove = await allMarkets.removeMarketType(2*50) //     assert.equal(receiptAdd.logs[0].name, "MarketTypes") //     assert.equal(parseInt(receiptAdd.logs[0].args._predictionTime), 2*50*60) //     assert.equal(parseInt(receiptAdd.logs[0].args._optionRangePerc), 25) //     assert.equal(parseInt(receiptAdd.logs[0].args._optionRangePerc), 25) //     assert.equal(receiptRemove.logs[0].name, "MarketTypes") //     assert.equal(parseInt(receiptRemove.logs[0].args._predictionTime), 2*50*60) //     assert.equal(parseInt(receiptRemove.logs[0].args._optionRangePerc), 25) // })
});
