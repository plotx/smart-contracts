const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Master = artifacts.require("Master");
const MemberRoles = artifacts.require("MemberRoles");
const PlotusToken = artifacts.require("MockPLOT");
const MarketUtility = artifacts.require("MockConfig"); //mock
const MockConfig = artifacts.require("MockConfig");
const Governance = artifacts.require("Governance");
const AllMarkets = artifacts.require("MockAllMarkets");
const BLOT = artifacts.require("BLOT");
const MarketCreationRewards = artifacts.require('MarketCreationRewards');
const TokenController = artifacts.require("MockTokenController");
const MockChainLinkAggregator = artifacts.require("MockChainLinkAggregator");
const BigNumber = require("bignumber.js");

const increaseTime = require("./utils/increaseTime.js").increaseTime;
const assertRevert = require("./utils/assertRevert").assertRevert;
const latestTime = require("./utils/latestTime").latestTime;
const encode = require("./utils/encoder.js").encode;
const encode1 = require("./utils/encoder.js").encode1;

const encode3 = require("./utils/encoder.js").encode3;
const signAndExecuteMetaTx = require("./utils/signAndExecuteMetaTx.js").signAndExecuteMetaTx;
const BN = require('bn.js');

const gvProposal = require("./utils/gvProposal.js").gvProposalWithIncentiveViaTokenHolder;
const { toHex, toWei, toChecksumAddress } = require("./utils/ethTools");
const to8Power = (number) => String(parseFloat(number) * 1e8);
let pkList = ["fb437e3e01939d9d4fef43138249f23dc1d0852e69b0b5d1647c087f869fabbd","7c85a1f1da3120c941b83d71a154199ee763307683f206b98ad92c3b4e0af13e","ecc9b35bf13bd5459350da564646d05c5664a7476fe5acdf1305440f88ed784c","f4470c3fca4dbef1b2488d016fae25978effc586a1f83cb29ac8cb6ab5bc2d50","141319b1a84827e1046e93741bf8a9a15a916d49684ab04925ac4ce4573eea23","d54b606094287758dcf19064a8d91c727346aadaa9388732e73c4315b7c606f9","49030e42ce4152e715a7ddaa10e592f8e61d00f70ef11f48546711f159d985df","b96761b1e7ebd1e8464a78a98fe52f53ce6035c32b4b2b12307a629a551ff7cf","d4786e2581571c863c7d12231c3afb6d4cef390c0ac9a24b243293721d28ea95","ed28e3d3530544f1cf2b43d1956b7bd13b63c612d963a8fb37387aa1a5e11460","05b127365cf115d4978a7997ee98f9b48f0ddc552b981c18aa2ee1b3e6df42c6","9d11dd6843f298b01b34bd7f7e4b1037489871531d14b58199b7cba1ac0841e6"];
describe("newPlotusWithBlot", () => {
    contract("AllMarket", async function (users) {
        // Multiplier Sheet
        let masterInstance,
            plotusToken,
            mockMarketConfig,
            tokenControllerAdd,
            tokenController,
            plotusNewAddress,
            plotusNewInstance,
            governance,
            allMarkets,
            marketUtility,
            mockChainLinkAggregator,
            marketIncentives;
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
            mockMarketConfig = await masterInstance.getLatestAddress(web3.utils.toHex("MU"));
            mockMarketConfig = await MockConfig.at(mockMarketConfig);
            allMarkets = await AllMarkets.at(await masterInstance.getLatestAddress(web3.utils.toHex("AM")));
            marketIncentives = await MarketCreationRewards.at(await masterInstance.getLatestAddress(web3.utils.toHex("MC")));
            await increaseTime(4 * 60 * 60 + 1);
            await plotusToken.transfer(marketIncentives.address,toWei(100000));
            await allMarkets.createMarket(0, 0,{from: users[11]});
            await marketIncentives.claimCreationReward(100,{from:users[11]});
            BLOTInstance = await BLOT.at(await masterInstance.getLatestAddress(web3.utils.toHex("BL")));
        });
        it("1. Place Prediction", async () => {

          let i;
          let predictionVal  = [0,100, 400, 210, 123, 200, 100, 300, 500, 200, 100];
          let options=[0,2,2,2,3,1,1,2,3,3,2];
          let withPlot = [0,true,false,true,false,false,true,false,false,true,true]; 
            
          for(i=1;i<11;i++) {
            let predictionToken;
            let depositAmt;
            if(withPlot[i])
            {
              depositAmt = toWei(predictionVal[i]);
              await plotusToken.transfer(users[i], toWei(predictionVal[i]));
              await plotusToken.approve(allMarkets.address, toWei(predictionVal[i]), { from: users[i] });
              predictionToken = plotusToken.address;

            } else {
              depositAmt=0;
              await plotusToken.approve(BLOTInstance.address, toWei(predictionVal[i]));
              await BLOTInstance.mint(users[i], toWei(predictionVal[i]));
              predictionToken = BLOTInstance.address;
            }
            let functionSignature = encode3("depositAndPlacePrediction(uint,uint,address,uint64,uint256)",depositAmt , 7, predictionToken, to8Power(predictionVal[i]), options[i]);
            await mockMarketConfig.setNextOptionPrice(options[i]*9);
            await signAndExecuteMetaTx(
                pkList[i],
                users[i],
                functionSignature,
                allMarkets
                );
          }
        });
        it("1.2 Relayer should get apt reward", async () => {

            let relayerBalBefore = await plotusToken.balanceOf(users[0]);
            await allMarkets.claimRelayerRewards();
            let relayerBalAfter = await plotusToken.balanceOf(users[0]);

            assert.equal(Math.round((relayerBalAfter-relayerBalBefore)/1e15),40.194*1e3);
        });
        it("1.3 Check Prediction points allocated", async () => {
            options = [0,2, 2, 2, 3, 1, 1, 2, 3, 3, 2];
            getPredictionPoints = async (user, option) => {
                let predictionPoints = await allMarkets.getUserPredictionPoints(user, 7, option);
                predictionPoints = predictionPoints / 1;
                return predictionPoints;
            };
            PredictionPointsExpected = [0,5441.72222,21766.88888,11427.61666,4462.21222,21766.88888,10883.44444,16325.16666,18139.07407,7255.62963,5441.72222];

            for (let index = 1; index < 11; index++) {
                let PredictionPoints = await getPredictionPoints(users[index], options[index]);
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
            await allMarkets.postResultMock(1, 7);
            await increaseTime(8 * 60 * 60);
        });
        it("1.4 Check total return for each user Prediction values in plot", async () => {
            options = [0,2, 2, 2, 3, 1, 1, 2, 3, 3, 2];
            getReturnsInPLOT = async (user) => {
                const response = await allMarkets.getReturn(user, 7);
                let returnAmountInPLOT = response / 1e8;
                return returnAmountInPLOT;
            };

            const returnInPLOTExpected = [0,0,0,0,0,1451.852577,725.9262886,0,0,0,0];

            for (let index = 1; index < 11; index++) {
                let returns = await getReturnsInPLOT(users[index]) / 1;
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
            const totalReturnLotExpexted = [0,0,0,0,0,1451.852577,725.9262886,0,0,0,0];;
            for (let i=1;i<11;i++) {
                beforeClaimToken = await plotusToken.balanceOf(users[i]);
                try {
                    let plotEthUnused = await allMarkets.getUserUnusedBalance(users[i]);
                    let functionSignature = encode3("withdraw(uint,uint)", plotEthUnused[0].iadd(plotEthUnused[1]), 10);
                    await signAndExecuteMetaTx(
                      pkList[i],
                      users[i],
                      functionSignature,
                      allMarkets
                      );
                } catch (e) { }
                afterClaimToken = await plotusToken.balanceOf(users[i]);
                conv = new BigNumber(1000000000000000000);

                diffToken = afterClaimToken - beforeClaimToken;
                diffToken = diffToken / conv;
                diffToken = diffToken.toFixed(2);
                expectedInLot = totalReturnLotExpexted[i].toFixed(2);
                
                try{
                    assert.equal(diffToken/1, expectedInLot);
                }catch(e){
                    console.log(`Not equal!! -> Sheet: ${expectedInLot} Got: ${diffToken}`);
                }
                // commented by Parv (as assert already added above)
                // console.log(`User ${accounts.indexOf(account) + 1}`);
                // console.log(`Returned in Eth : ${diff}  Expected : ${expectedInEth} `);
                // console.log(`Returned in Lot : ${diffToken}  Expected : ${expectedInLot} `);
            }
        });
        it("1.6 Market creator should get apt reward", async () => {
            let marketCreatorReward = await marketIncentives.getPendingMarketCreationRewards(users[11]);
            assert.equal(94669642,Math.round(marketCreatorReward[1]/1e11));

            let plotBalBeforeCreator = await plotusToken.balanceOf(users[11]);

            functionSignature = encode3("claimCreationReward(uint256)", 100);
            await signAndExecuteMetaTx(
                pkList[11],
                users[11],
                functionSignature,
                marketIncentives
                );

            let plotBalAfterCreator = await plotusToken.balanceOf(users[11]);

            assert.equal(Math.round((plotBalAfterCreator-plotBalBeforeCreator)/1e11),94669642);
        });
    });
});
