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
const encode3 = require("./utils/encoder.js").encode3;
const gvProposal = require("./utils/gvProposal.js").gvProposalWithIncentiveViaTokenHolder;
const { toHex, toWei, toChecksumAddress } = require("./utils/ethTools");
const signAndExecuteMetaTx = require("./utils/signAndExecuteMetaTx.js").signAndExecuteMetaTx;
const to8Power = (number) => String(parseFloat(number) * 1e8);
let privateKeyList = ["fb437e3e01939d9d4fef43138249f23dc1d0852e69b0b5d1647c087f869fabbd","7c85a1f1da3120c941b83d71a154199ee763307683f206b98ad92c3b4e0af13e","ecc9b35bf13bd5459350da564646d05c5664a7476fe5acdf1305440f88ed784c","f4470c3fca4dbef1b2488d016fae25978effc586a1f83cb29ac8cb6ab5bc2d50","141319b1a84827e1046e93741bf8a9a15a916d49684ab04925ac4ce4573eea23","d54b606094287758dcf19064a8d91c727346aadaa9388732e73c4315b7c606f9","49030e42ce4152e715a7ddaa10e592f8e61d00f70ef11f48546711f159d985df","b96761b1e7ebd1e8464a78a98fe52f53ce6035c32b4b2b12307a629a551ff7cf","d4786e2581571c863c7d12231c3afb6d4cef390c0ac9a24b243293721d28ea95","ed28e3d3530544f1cf2b43d1956b7bd13b63c612d963a8fb37387aa1a5e11460","05b127365cf115d4978a7997ee98f9b48f0ddc552b981c18aa2ee1b3e6df42c6","9d11dd6843f298b01b34bd7f7e4b1037489871531d14b58199b7cba1ac0841e6","f79e90fa4091de4fc2ec70f5bf67b24393285c112658e0d810e6bd711387fbb9","99f1fc0f09230ce745b6a256ba7082e6e51a2907abda3d9e735a5c8188bb4ba1","477f86cce983b9c91a36fdcd4a7ce21144a08dee9b1aafb91b9c70e57f717ce6","b03d2e6bb4a7d71c66a66ff9e9c93549cae4b593f634a4ea2a1f79f94200f5b4","9ddc0f53a81e631dcf39d5155f41ec12ed551b731efc3224f410667ba07b37dc","cf087ff9ae7c9954ad8612d071e5cdf34a6024ee1ae477217639e63a802a53dd","b64f62b94babb82cc78d3d1308631ae221552bb595202fc1d267e1c29ce7ba60","a91e24875f8a534497459e5ccb872c4438be3130d8d74b7e1104c5f94cdcf8c2","4f49f3d029eeeb3fed14d59625acd088b6b34f3b41c527afa09d29e4a7725c32","179795fd7ac7e7efcba3c36d539a1e8659fb40d77d0a3fab2c25562d99793086","4ba37d0b40b879eceaaca2802a1635f2e6d86d5c31e3ff2d2fd13e68dd2a6d3d","6b7f5dfba9cd3108f1410b56f6a84188eee23ab48a3621b209a67eea64293394","870c540da9fafde331a3316cee50c17ad76ddb9160b78b317bef2e6f6fc4bac0","470b4cccaea895d8a5820aed088357e380d66b8e7510f0a1ea9b575850160241","8a55f8942af0aec1e0df3ab328b974a7888ffd60ded48cc6862013da0f41afbc","2e51e8409f28baf93e665df2a9d646a1bf9ac8703cbf9a6766cfdefa249d5780","99ef1a23e95910287d39493d8d9d7d1f0b498286f2b1fdbc0b01495f10cf0958","6652200c53a4551efe2a7541072d817562812003f9d9ef0ec17995aa232378f8","39c6c01194df72dda97da2072335c38231ced9b39afa280452afcca901e73643","12097e411d948f77b7b6fa4656c6573481c1b4e2864c1fca9d5b296096707c45","cbe53bf1976aee6cec830a848c6ac132def1503cffde82ccfe5bd15e75cbaa72","eeab5dcfff92dbabb7e285445aba47bd5135a4a3502df59ac546847aeb5a964f","5ea8279a578027abefab9c17cef186cccf000306685e5f2ee78bdf62cae568dd","0607767d89ad9c7686dbb01b37248290b2fa7364b2bf37d86afd51b88756fe66","e4fd5f45c08b52dae40f4cdff45e8681e76b5af5761356c4caed4ca750dc65cd","145b1c82caa2a6d703108444a5cf03e9cb8c3cd3f19299582a564276dbbba734","736b22ec91ae9b4b2b15e8d8c220f6c152d4f2228f6d46c16e6a9b98b4733120","ac776cb8b40f92cdd307b16b83e18eeb1fbaa5b5d6bd992b3fda0b4d6de8524c","65ba30e2202fdf6f37da0f7cfe31dfb5308c9209885aaf4cef4d572fd14e2903","54e8389455ec2252de063e83d3ce72529d674e6d2dc2070661f01d4f76b63475","fbbbfb525dd0255ee332d51f59648265aaa20c2e9eff007765cf4d4a6940a849","8de5e418f34d04f6ea947ce31852092a24a705862e6b810ca9f83c2d5f9cda4d","ea6040989964f012fd3a92a3170891f5f155430b8bbfa4976cde8d11513b62d9","14d94547b5deca767137fbd14dae73e888f3516c742fad18b83be333b38f0b88","47f05203f6368d56158cda2e79167777fc9dcb0c671ef3aabc205a1636c26a29"];

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
            await plotusToken.transfer(userMarketCreator, toWei(100000));
            await plotusToken.approve(allMarkets.address, toWei(100000), {from: userMarketCreator});
            await mockMarketConfig.setNextOptionPrice(90);
            await allMarkets.createMarket(0, 0, { from: userMarketCreator });
            marketId++;
        });
        it("3.1 Scenario 1: player purchase 2 position in same option, in same currency and wins", async () => {
            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            // await allMarkets.deposit(toWei(500), { from: user1 });
            // await allMarkets.deposit(toWei(400), { from: user2 });
            // await allMarkets.deposit(toWei(400), { from: user3 });

            await mockMarketConfig.setNextOptionPrice(90);
            let functionSignature = encode3("depositAndPlacePrediction(uint,uint,address,uint64,uint256)", toWei(500), marketId, plotusToken.address, to8Power("100"), 1);
            await signAndExecuteMetaTx(
              privateKeyList[0],
              user1,
              functionSignature,
              allMarkets,
              "AM"
              );
            // await allMarkets.depositAndPlacePrediction(, { from: user1 });
            functionSignature = encode3("depositAndPlacePrediction(uint,uint,address,uint64,uint256)", 0, marketId, plotusToken.address, to8Power("400"), 1);
            await signAndExecuteMetaTx(
              privateKeyList[0],
              user1,
              functionSignature,
              allMarkets,
              "AM"
              );
            // await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("400"), 1, { from: user1 });
            functionSignature = encode3("depositAndPlacePrediction(uint,uint,address,uint64,uint256)", toWei(400), marketId, plotusToken.address, to8Power("400"), 1);
            await signAndExecuteMetaTx(
              privateKeyList[1],
              user2,
              functionSignature,
              allMarkets,
              "AM"
              );
            // await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("400"), 1, { from: user2 });
            await mockMarketConfig.setNextOptionPrice(180);
            functionSignature = encode3("depositAndPlacePrediction(uint,uint,address,uint64,uint256)", toWei(400), marketId, plotusToken.address, to8Power("400"), 2);
            await signAndExecuteMetaTx(
              privateKeyList[2],
              user3,
              functionSignature,
              allMarkets,
              "AM"
              );
            // await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("400"), 2, { from: user3 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 1)) /  1e5;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 1)) /  1e5;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 2)) /  1e5;


            // console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser2, predictionPointsBeforeUser3);
            const expectedPredictionPoints = [1088.88888 + 4355.55555, 4355.55555, 2177.77777];
            const expectedPLOTReturn = [147 + 588, 588, 0];
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
            await allMarkets.createMarket(0, 0, { from: userMarketCreator });
            marketId++;

            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            // await allMarkets.deposit(toWei(500), { from: user1 });
            // await allMarkets.deposit(toWei(400), { from: user2 });
            // await allMarkets.deposit(toWei(400), { from: user3 });

            await mockMarketConfig.setNextOptionPrice(90);
            await allMarkets.depositAndPlacePrediction(toWei(400), marketId, plotusToken.address, to8Power("400"), 1, { from: user2 });
            await mockMarketConfig.setNextOptionPrice(180);
            await allMarkets.depositAndPlacePrediction(toWei(500), marketId, plotusToken.address, to8Power("100"), 2, { from: user1 });
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("400"), 2, { from: user1 });
            await allMarkets.depositAndPlacePrediction(toWei(400), marketId, plotusToken.address, to8Power("400"), 2, { from: user3 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) /  1e5;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 1)) /  1e5;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 2)) /  1e5;

            // console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser2, predictionPointsBeforeUser3);
            const expectedPredictionPoints = [544.4444444 + 2177.77777, 4355.55555, 2177.77777];
            const expectedPLOTReturn = [0 + 0, 1301.44, 0];
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
            await allMarkets.createMarket(0, 0, { from: userMarketCreator });
            // await allMarkets.createMarket(0, 0);
            marketId++;

            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            // await allMarkets.deposit(toWei(500), { from: user1 });
            // await allMarkets.deposit(toWei(400), { from: user2 });
            // await allMarkets.deposit(toWei(400), { from: user3 });

            await mockMarketConfig.setNextOptionPrice(90);
            await allMarkets.depositAndPlacePrediction(toWei(500), marketId, plotusToken.address, to8Power("100"), 1, { from: user1 });
            await allMarkets.depositAndPlacePrediction(toWei(400), marketId, plotusToken.address, to8Power("400"), 1, { from: user2 });

            await mockMarketConfig.setNextOptionPrice(180);
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("400"), 2, { from: user1 });
            await allMarkets.depositAndPlacePrediction(toWei(400), marketId, plotusToken.address, to8Power("400"), 2, { from: user3 });

            predictionPointsBeforeUser1 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 1)) /  1e5;
            predictionPointsBeforeUser1_2 = parseFloat(await allMarkets.getUserPredictionPoints(user1, marketId, 2)) /  1e5;
            predictionPointsBeforeUser2 = parseFloat(await allMarkets.getUserPredictionPoints(user2, marketId, 1)) /  1e5;
            predictionPointsBeforeUser3 = parseFloat(await allMarkets.getUserPredictionPoints(user3, marketId, 2)) /  1e5;

            // console.log(predictionPointsBeforeUser1, predictionPointsBeforeUser1_2, predictionPointsBeforeUser2, predictionPointsBeforeUser3);
            const expectedPredictionPoints = [1088.888889, 2177.777778, 4355.555556, 2177.777778];
            const expectedETHReturn = [0, 0, 0];
            const expectedPLOTReturn = [262.3870968, 1049.548387, 0];

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
            await mockMarketConfig.setNextOptionPrice(90);
            await allMarkets.createMarket(0, 2, { from: userMarketCreator });
            marketId++;
            const scenario6MarketId = marketId;

            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            // await allMarkets.deposit(toWei(500), { from: user1 });
            // await allMarkets.deposit(toWei(400), { from: user2 });
            // await allMarkets.deposit(toWei(400), { from: user3 });

            await mockMarketConfig.setNextOptionPrice(90);
            await allMarkets.depositAndPlacePrediction(toWei(500), marketId, plotusToken.address, to8Power("100"), 1, { from: user1 });
            await allMarkets.depositAndPlacePrediction(toWei(400), marketId, plotusToken.address, to8Power("400"), 1, { from: user2 });

            await mockMarketConfig.setNextOptionPrice(180);
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("400"), 2, { from: user1 });
            await allMarkets.depositAndPlacePrediction(toWei(400), marketId, plotusToken.address, to8Power("400"), 2, { from: user3 });

            await mockMarketConfig.setNextOptionPrice(90);
            await allMarkets.createMarket(0, 0, { from: userMarketCreator });
            // await allMarkets.createMarket(0, 0);
            marketId++;
            const scenario7MarketId = marketId;

            await plotusToken.transfer(user1, toWei("100"));
            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("500"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            // await allMarkets.deposit(toWei(200), { from: user1 });
            // await allMarkets.deposit(toWei(400), { from: user2 });
            // await allMarkets.deposit(toWei(500), { from: user3 });

            await mockMarketConfig.setNextOptionPrice(90);
            await allMarkets.depositAndPlacePrediction(toWei(200), marketId, plotusToken.address, to8Power("100"), 1, { from: user1 });
            await allMarkets.depositAndPlacePrediction(toWei(500), marketId, plotusToken.address, to8Power("500"), 1, { from: user3 });
            await mockMarketConfig.setNextOptionPrice(180);
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("100"), 2, { from: user1 });
            await mockMarketConfig.setNextOptionPrice(270);
            await allMarkets.depositAndPlacePrediction(toWei(400), marketId, plotusToken.address, to8Power("400"), 3, { from: user2 });

            await mockMarketConfig.setNextOptionPrice(90);
            await allMarkets.createMarket(1, 0, { from: userMarketCreator });
            // await allMarkets.createMarket(1, 0);
            marketId++;
            const scenario8MarketId = marketId;
           
            await plotusToken.transfer(user1, toWei("400"));
            await plotusToken.transfer(user2, toWei("400"));
            await plotusToken.transfer(user3, toWei("400"));

            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user1 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user2 });
            await plotusToken.approve(allMarkets.address, toWei("10000"), { from: user3 });
            // await allMarkets.deposit(toWei(400), { from: user1 });
            // await allMarkets.deposit(toWei(400), { from: user2 });
            // await allMarkets.deposit(toWei(200), { from: user3 });

            await mockMarketConfig.setNextOptionPrice(90);
            await allMarkets.depositAndPlacePrediction(toWei(400), marketId, plotusToken.address, to8Power("100"), 1, { from: user1 });
            await allMarkets.depositAndPlacePrediction(toWei(200), marketId, plotusToken.address, to8Power("200"), 1, { from: user3 });

            await mockMarketConfig.setNextOptionPrice(180);
            await allMarkets.depositAndPlacePrediction(0, marketId, plotusToken.address, to8Power("300"), 2, { from: user1 });

            await mockMarketConfig.setNextOptionPrice(270);
            await allMarkets.depositAndPlacePrediction(toWei(400), marketId, plotusToken.address, to8Power("400"), 3, { from: user2 });

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
            let user1Return = user1Balance[1];
            user1Balance = user1Balance[0]/1 + user1Balance[1]/1;
            let user2Balance = await allMarkets.getUserUnusedBalance(user2);
            user2Balance = user2Balance[0]/1 + user2Balance[1]/1;
            let user3Balance = await allMarkets.getUserUnusedBalance(user3);
            user3Balance = user3Balance[0] + user3Balance[1];
            await allMarkets.withdraw(user1Balance.toString(), 10, { from: user1 });
            await allMarkets.withdraw(user2Balance.toString(), 10, { from: user2 });
            await assertRevert(allMarkets.withdraw(user3Balance, 10, { from: user3 }));

            let plotBalanceAfterUser1 = (await plotusToken.balanceOf(user1)) / 1e18;
            let plotBalanceAfterUser2 = (await plotusToken.balanceOf(user2)) / 1e18;
            let plotBalanceAfterUser3 = (await plotusToken.balanceOf(user3)) / 1e18;

            assert.equal((plotBalanceAfterUser1-plotBalanceBeforeUser1).toFixed(2), (user1Balance/1e18).toFixed(2))
            assert.equal((plotBalanceAfterUser2-plotBalanceBeforeUser2).toFixed(2), (user2Balance/1e18).toFixed(2))

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

            assert.equal((plotBalanceAfterUser1-plotBalanceBeforeUser1).toFixed(2), (257.25).toFixed(2))
            assert.equal((plotBalanceAfterUser2-plotBalanceBeforeUser2).toFixed(2), (1029).toFixed(2))

        });
    });
});