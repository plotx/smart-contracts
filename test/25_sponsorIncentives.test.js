// const { assert } = require("chai");
// const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
// const Market = artifacts.require("MockMarket");
// const Plotus = artifacts.require("MarketRegistry");
// const Master = artifacts.require("Master");
// const MemberRoles = artifacts.require("MemberRoles");
// const PlotusToken = artifacts.require("MockPLOT");
// const MockWeth = artifacts.require("MockWeth");
// const MockConfig = artifacts.require("MockConfig"); //mock
// const Governance = artifacts.require("GovernanceV2");
// const AllMarkets = artifacts.require("MockAllMarkets");
// const MockUniswapRouter = artifacts.require("MockUniswapRouter");
// const MockUniswapV2Pair = artifacts.require("MockUniswapV2Pair");
// const MockUniswapFactory = artifacts.require("MockUniswapFactory");
// const TokenController = artifacts.require("MockTokenController");
// const DummyTokenMock2 = artifacts.require("SampleERC");

// const web3 = Market.web3;
// const ethAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
// const increaseTime = require("./utils/increaseTime.js").increaseTime;
// const assertRevert = require("./utils/assertRevert").assertRevert;
// const latestTime = require("./utils/latestTime").latestTime;
// const encode = require("./utils/encoder.js").encode;
// const gvProposal = require("./utils/gvProposal.js").gvProposalWithIncentiveViaTokenHolder;
// const { toHex, toWei, toChecksumAddress } = require("./utils/ethTools");
// const to8Power = (number) => String(parseFloat(number) * 1e8);

// // Multiplier Sheet

// contract("25_sponsorIncentive. AllMarket", async function([
//     ab1,
//     ab2,
//     ab3,
//     ab4,
//     mem1,
//     mem2,
//     mem3,
//     mem4,
//     mem5,
//     mem6,
//     mem7,
//     mem8,
//     mem9,
//     mem10,
//     notMember,
//     dr1,
//     dr2,
//     dr3,
//     user11,
//     user12,
//     user13,
// ]) {
//     let masterInstance,
//         plotusToken,
//         mockMarketConfig,
//         MockUniswapRouterInstance,
//         tokenControllerAdd,
//         tokenController,
//         plotusNewAddress,
//         plotusNewInstance,
//         governance,
//         mockUniswapV2Pair,
//         mockUniswapFactory,
//         weth,
//         allMarkets,
//         dToken;
//     before(async () => {
//         dToken = await DummyTokenMock2.new("Dummy", "DYM");
//         await dToken.mint(toWei(10000));
//         masterInstance = await OwnedUpgradeabilityProxy.deployed();
//         masterInstance = await Master.at(masterInstance.address);
//         plotusToken = await PlotusToken.deployed();
//         tokenControllerAdd = await masterInstance.getLatestAddress(web3.utils.toHex("TC"));
//         tokenController = await TokenController.at(tokenControllerAdd);
//         plotusNewAddress = await masterInstance.getLatestAddress(web3.utils.toHex("PL"));
//         let memberRoles = await masterInstance.getLatestAddress(web3.utils.toHex("MR"));
//         memberRoles = await MemberRoles.at(memberRoles);
//         governance = await masterInstance.getLatestAddress(web3.utils.toHex("GV"));
//         governance = await Governance.at(governance);
//         MockUniswapRouterInstance = await MockUniswapRouter.deployed();
//         mockUniswapFactory = await MockUniswapFactory.deployed();
//         plotusNewInstance = await Plotus.at(plotusNewAddress);
//         mockMarketConfig = await plotusNewInstance.marketUtility();
//         mockMarketConfig = await MockConfig.at(mockMarketConfig);
//         weth = await MockWeth.deployed();
//         await mockMarketConfig.setWeth(weth.address);
//         let newUtility = await MockConfig.new();
//         let actionHash = encode(
//             "upgradeContractImplementation(address,address)",
//             mockMarketConfig.address,
//             newUtility.address
//         );
//         await gvProposal(
//             6,
//             actionHash,
//             await MemberRoles.at(await masterInstance.getLatestAddress(toHex("MR"))),
//             governance,
//             2,
//             0
//         );
//         await increaseTime(604800);
//         mockUniswapV2Pair = await MockUniswapV2Pair.new();
//         await mockUniswapV2Pair.initialize(plotusToken.address, weth.address);
//         await weth.deposit({ from: user11, value: toWei(10) });
//         await weth.transfer(mockUniswapV2Pair.address, toWei(10), { from: user11 });
//         await plotusToken.transfer(mockUniswapV2Pair.address, toWei(1000));
//         initialPLOTPrice = 1000 / 10;
//         initialEthPrice = 10 / 1000;
//         await mockUniswapFactory.setPair(mockUniswapV2Pair.address);
//         await mockUniswapV2Pair.sync();
//         newUtility = await MockConfig.new();
//         actionHash = encode(
//             "upgradeContractImplementation(address,address)",
//             mockMarketConfig.address,
//             newUtility.address
//         );
//         await gvProposal(
//             6,
//             actionHash,
//             await MemberRoles.at(await masterInstance.getLatestAddress(toHex("MR"))),
//             governance,
//             2,
//             0
//         );
//         await increaseTime(604800);
//         allMarkets = await AllMarkets.at(await masterInstance.getLatestAddress(web3.utils.toHex("AM")));
//         let date = await latestTime();
//         await increaseTime(3610);
//         date = Math.round(date);
//         await mockMarketConfig.setInitialCummulativePrice();
//         await mockMarketConfig.setAuthorizedAddress(allMarkets.address);
//         let utility = await MockConfig.at("0xCBc7df3b8C870C5CDE675AaF5Fd823E4209546D2");
//         await utility.setAuthorizedAddress(allMarkets.address);
//         await mockUniswapV2Pair.sync();
//     });

//     it("25.1 Whitelist sponsor", async () => {
//         await plotusToken.transfer(mem1, toWei(100));
//         await plotusToken.transfer(mem2, toWei(100));
//         await plotusToken.transfer(mem3, toWei(100));
//         await plotusToken.transfer(mem4, toWei(100));
//         await plotusToken.transfer(mem5, toWei(100));
//         await increaseTime(604810);
//         pId = (await governance.getProposalLength()).toNumber();
//         await governance.createProposal("Proposal2", "Proposal2", "Proposal2", 0); //Pid 3
//         await governance.categorizeProposal(pId, 23, 0);
//         let actionHash = encode("whitelistSponsor(address)", ab1);
//         await governance.submitProposalWithSolution(pId, "whitelistSponsor", actionHash);
//         await governance.submitVote(pId, 1, { from: ab1 });
//         await governance.submitVote(pId, 1, { from: mem1 });
//         await governance.submitVote(pId, 1, { from: mem2 });
//         await governance.submitVote(pId, 1, { from: mem3 });
//         await governance.submitVote(pId, 1, { from: mem4 });
//         await governance.submitVote(pId, 1, { from: mem5 });
//         let canClose = await governance.canCloseProposal(pId);
//         assert.equal(canClose.toNumber(), 0);
//         await increaseTime(604810);
//         await assertRevert(governance.submitVote(pId, 1, { from: mem2 })); //closed to vote
//         await governance.closeProposal(pId);
//         await increaseTime(604850);
//         await governance.triggerAction(pId);
//         let actionStatus = await governance.proposalActionStatus(pId);
//         assert.equal(actionStatus / 1, 3);
//     });
//     it("25.2 Create Market and add sponsorIncentives", async () => {
//         await plotusToken.approve(allMarkets.address, toWei("1000000000"), { from: ab1 });
//         await dToken.approve(allMarkets.address, toWei("1000000000"), { from: ab1 });

//         await allMarkets.createMarket(0, 0); //7 eth 4hr
//         await allMarkets.sponsorIncentives(7, plotusToken.address, toWei(1));
//         await allMarkets.createMarket(0, 1); //8 eth daily
//         await allMarkets.sponsorIncentives(8, plotusToken.address, toWei(1));
//         await allMarkets.createMarket(1, 0); //9 btc 4hr
//         await allMarkets.sponsorIncentives(9, dToken.address, toWei(1));
//         await allMarkets.createMarket(1, 1); //9 btc daily
//         await allMarkets.sponsorIncentives(10, dToken.address, toWei(1));
//     });
//     it("25.3 Place predictions", async () => {
//         await MockUniswapRouterInstance.setPrice("1000000000000000");
//         await mockMarketConfig.setPrice("1000000000000000");
//         await mockMarketConfig.setNextOptionPrice(9);

//         await allMarkets.deposit(0, { from: user11, value: toWei(4) });
//         await allMarkets.deposit(0, { from: user12, value: toWei(2) });
//         await allMarkets.placePrediction(7, ethAddress, to8Power("1"), 1, { from: user11 });
//         await allMarkets.placePrediction(7, ethAddress, to8Power("0.5"), 1, { from: user12 });
//         await allMarkets.placePrediction(8, ethAddress, to8Power("1"), 1, { from: user11 });
//         await allMarkets.placePrediction(8, ethAddress, to8Power("0.5"), 1, { from: user12 });
//         await allMarkets.placePrediction(9, ethAddress, to8Power("1"), 1, { from: user11 });
//         await allMarkets.placePrediction(9, ethAddress, to8Power("0.5"), 1, { from: user12 });
//         await allMarkets.placePrediction(10, ethAddress, to8Power("1"), 1, { from: user11 });
//         await allMarkets.placePrediction(10, ethAddress, to8Power("0.5"), 1, { from: user12 });
//     });
//     it("25.4 Claim sponsorship rewards", async () => {
//         await increaseTime(8 * 60 * 60);
//         await allMarkets.postResultMock(1, 7);
//         await allMarkets.postResultMock(1, 9);
//         await increaseTime(8 * 60 * 60);

//         //user11, user12 claim market 7 sp rewards in plot
//         const user11PPInPLOT = (await allMarkets.getUserPredictionPoints(user11, 7, 1)) / 1e5; //same for all markets as the prediction amount is same
//         const user12PPInPLOT = (await allMarkets.getUserPredictionPoints(user12, 7, 1)) / 1e5; //same for all markets as the prediction amount is same
//         let ratio = user11PPInPLOT / user12PPInPLOT; //same for all markets as the prediction amount is same

//         let plotBalanceBeforeUser11 = (await plotusToken.balanceOf(user11)) / 1e18;
//         let plotBalanceBeforeUser12 = (await plotusToken.balanceOf(user12)) / 1e18;
//         let dummyBalanceBeforeUser11 = (await dToken.balanceOf(user11)) / 1e18;
//         let dummyBalanceBeforeUser12 = (await dToken.balanceOf(user12)) / 1e18;

//         await allMarkets.claimIncentives(user11, [7], plotusToken.address);
//         await allMarkets.claimIncentives(user12, [7], plotusToken.address);

//         let plotBalanceAfterUser11 = (await plotusToken.balanceOf(user11)) / 1e18;
//         let plotBalanceAfterUser12 = (await plotusToken.balanceOf(user12)) / 1e18;
//         let dummyBalanceAfterUser11 = (await dToken.balanceOf(user11)) / 1e18;
//         let dummyBalanceAfterUser12 = (await dToken.balanceOf(user12)) / 1e18;

//         await assertRevert(allMarkets.claimIncentives(user12, [7, 8, 9, 10], plotusToken.address));
//         await assertRevert(allMarkets.claimIncentives(user11, [7, 8, 9, 10], plotusToken.address));
//         assert.equal((plotBalanceAfterUser11 - plotBalanceBeforeUser11).toFixed(5), ((1 / 3) * ratio).toFixed(5));
//         assert.equal((plotBalanceAfterUser12 - plotBalanceBeforeUser12).toFixed(5), (1 / 3).toFixed(5));
//         assert.equal(dummyBalanceAfterUser11 - dummyBalanceBeforeUser11, 0);
//         assert.equal(dummyBalanceAfterUser12 - dummyBalanceBeforeUser12, 0);

//         //user11, user12 claim market 9 sp rewards in dToken
//         plotBalanceBeforeUser11 = (await plotusToken.balanceOf(user11)) / 1e18;
//         plotBalanceBeforeUser12 = (await plotusToken.balanceOf(user12)) / 1e18;
//         dummyBalanceBeforeUser11 = (await dToken.balanceOf(user11)) / 1e18;
//         dummyBalanceBeforeUser12 = (await dToken.balanceOf(user12)) / 1e18;

//         await allMarkets.claimIncentives(user11, [9], dToken.address);
//         await allMarkets.claimIncentives(user12, [9], dToken.address);

//         plotBalanceAfterUser11 = (await plotusToken.balanceOf(user11)) / 1e18;
//         plotBalanceAfterUser12 = (await plotusToken.balanceOf(user12)) / 1e18;
//         dummyBalanceAfterUser11 = (await dToken.balanceOf(user11)) / 1e18;
//         dummyBalanceAfterUser12 = (await dToken.balanceOf(user12)) / 1e18;

//         await assertRevert(allMarkets.claimIncentives(user11, [7, 8, 9, 10], dToken.address));
//         await assertRevert(allMarkets.claimIncentives(user12, [7, 8, 9, 10], dToken.address));
//         assert.equal(plotBalanceAfterUser11 - plotBalanceBeforeUser11, 0);
//         assert.equal(plotBalanceAfterUser12 - plotBalanceBeforeUser12, 0);
//         assert.equal((dummyBalanceAfterUser11 - dummyBalanceBeforeUser11).toFixed(5), ((1 / 3) * ratio).toFixed(5));
//         assert.equal((dummyBalanceAfterUser12 - dummyBalanceBeforeUser12).toFixed(5), (1 / 3).toFixed(5));

//         //For markets 8,10
//         await increaseTime(24 * 2 * 60 * 60);
//         await allMarkets.postResultMock(1, 8);
//         await allMarkets.postResultMock(1, 10);
//         await increaseTime(24 * 2 * 60 * 60);

//         //user11, user12 claim market 7 sp rewards in plot
//         plotBalanceBeforeUser11 = (await plotusToken.balanceOf(user11)) / 1e18;
//         plotBalanceBeforeUser12 = (await plotusToken.balanceOf(user12)) / 1e18;
//         dummyBalanceBeforeUser11 = (await dToken.balanceOf(user11)) / 1e18;
//         dummyBalanceBeforeUser12 = (await dToken.balanceOf(user12)) / 1e18;

//         await allMarkets.claimIncentives(user11, [8], plotusToken.address);
//         await allMarkets.claimIncentives(user12, [8], plotusToken.address);

//         plotBalanceAfterUser11 = (await plotusToken.balanceOf(user11)) / 1e18;
//         plotBalanceAfterUser12 = (await plotusToken.balanceOf(user12)) / 1e18;
//         dummyBalanceAfterUser11 = (await dToken.balanceOf(user11)) / 1e18;
//         dummyBalanceAfterUser12 = (await dToken.balanceOf(user12)) / 1e18;

//         await assertRevert(allMarkets.claimIncentives(user12, [7, 8, 9, 10], plotusToken.address));
//         await assertRevert(allMarkets.claimIncentives(user11, [7, 8, 9, 10], plotusToken.address));
//         assert.equal((plotBalanceAfterUser11 - plotBalanceBeforeUser11).toFixed(5), ((1 / 3) * ratio).toFixed(5));
//         assert.equal((plotBalanceAfterUser12 - plotBalanceBeforeUser12).toFixed(5), (1 / 3).toFixed(5));
//         assert.equal(dummyBalanceAfterUser11 - dummyBalanceBeforeUser11, 0);
//         assert.equal(dummyBalanceAfterUser12 - dummyBalanceBeforeUser12, 0);

//         //user11, user12 claim market 9 sp rewards in dToken
//         plotBalanceBeforeUser11 = (await plotusToken.balanceOf(user11)) / 1e18;
//         plotBalanceBeforeUser12 = (await plotusToken.balanceOf(user12)) / 1e18;
//         dummyBalanceBeforeUser11 = (await dToken.balanceOf(user11)) / 1e18;
//         dummyBalanceBeforeUser12 = (await dToken.balanceOf(user12)) / 1e18;

//         await allMarkets.claimIncentives(user11, [10], dToken.address);
//         await allMarkets.claimIncentives(user12, [10], dToken.address);

//         plotBalanceAfterUser11 = (await plotusToken.balanceOf(user11)) / 1e18;
//         plotBalanceAfterUser12 = (await plotusToken.balanceOf(user12)) / 1e18;
//         dummyBalanceAfterUser11 = (await dToken.balanceOf(user11)) / 1e18;
//         dummyBalanceAfterUser12 = (await dToken.balanceOf(user12)) / 1e18;

//         await assertRevert(allMarkets.claimIncentives(user11, [7, 8, 9, 10], dToken.address));
//         await assertRevert(allMarkets.claimIncentives(user12, [7, 8, 9, 10], dToken.address));
//         assert.equal(plotBalanceAfterUser11 - plotBalanceBeforeUser11, 0);
//         assert.equal(plotBalanceAfterUser12 - plotBalanceBeforeUser12, 0);
//         assert.equal((dummyBalanceAfterUser11 - dummyBalanceBeforeUser11).toFixed(5), ((1 / 3) * ratio).toFixed(5));
//         assert.equal((dummyBalanceAfterUser12 - dummyBalanceBeforeUser12).toFixed(5), (1 / 3).toFixed(5));
//     });
// });
