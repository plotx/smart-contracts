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
const Governance = artifacts.require("GovernanceV2");
const AllMarkets = artifacts.require("MockAllMarkets");
const MockUniswapRouter = artifacts.require("MockUniswapRouter");
const MockUniswapV2Pair = artifacts.require("MockUniswapV2Pair");
const MockUniswapFactory = artifacts.require("MockUniswapFactory");
const TokenController = artifacts.require("MockTokenController");
const ProposalCategory = artifacts.require("ProposalCategory");
const MarketCreationRewards = artifacts.require('MarketCreationRewards');
const web3 = Market.web3;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const assertRevert = require("./utils/assertRevert").assertRevert;
const latestTime = require("./utils/latestTime").latestTime;
const encode = require("./utils/encoder.js").encode;
const encode1 = require('./utils/encoder.js').encode1;
const { toHex, toWei, toChecksumAddress } = require("./utils/ethTools");
const gvProposal = require("./utils/gvProposal.js").gvProposalWithIncentiveViaTokenHolder;

var initialPLOTPrice;
var initialEthPrice;
const ethAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
var nullAddress = "0x0000000000000000000000000000000000000000";
let marketId= 0;

contract("AllMarket", async function([user1, user2, user3, user4, user5, user6, user7, user8]) {
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
        allMarkets,
        marketIncentives;
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
        marketIncentives = await MarketCreationRewards.at(await masterInstance.getLatestAddress(web3.utils.toHex("MC")));
        
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
        await plotusToken.transfer(user5,toWei(1000));

        await plotusToken.approve(allMarkets.address,toWei(10000),{from:user2});
        await plotusToken.approve(allMarkets.address,toWei(10000),{from:user3});
        await plotusToken.approve(allMarkets.address,toWei(10000),{from:user5}); 

        let nullAddress = "0x0000000000000000000000000000";
        let pc = await masterInstance.getLatestAddress(web3.utils.toHex("PC"));
        pc = await ProposalCategory.at(pc);
          let newGV = await Governance.new()
          actionHash = encode1(
            ['bytes2[]', 'address[]'],
            [
              [toHex('GV')],
              [newGV.address]
            ]
          );

          let p = await governance.getProposalLength();
          await governance.createProposal("proposal", "proposal", "proposal", 0);
          let canClose = await governance.canCloseProposal(p);
          assert.equal(parseFloat(canClose),0);
          await governance.categorizeProposal(p, 7, 0);
          await governance.submitProposalWithSolution(p, "proposal", actionHash);
          await governance.submitVote(p, 1)
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
    });

    it("Should revert if tries to deposit 0 amount", async function() {
        await assertRevert(allMarkets.deposit(0,{from:user2,value:0}));
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

    it("Should be able to predict with max deposit after depositing eth and should recv 0 on withdraw", async function() {

        await allMarkets.createMarket(0, 0,{from:user4});

        await marketConfig.setPrice(toWei(0.001));  
        await marketConfig.setNextOptionPrice(2);

        await allMarkets.deposit(0,{from:user2,value:toWei(0.002)});    
        // await allMarkets.deposit(0,{from:user3,value:toWei(1)});

        let ethBalbefore = await web3.eth.getBalance(user2);

        await allMarkets.placePrediction(7, ethAddress, 2*1e5, 1, { from: user2 });

        let unusedBal = await allMarkets.getUserUnusedBalance(user2);   
        assert.equal(unusedBal[0],0);

        await assertRevert(allMarkets.withdrawMax(10,{from:user2}));    
        unusedBal = await allMarkets.getUserUnusedBalance(user2); 
        assert.equal(unusedBal[0],0);

        await allMarkets.depositAndPlacePrediction(0, toWei(1), 7, ethAddress, 1e8, 2, { from: user3, value:toWei(1) });

    });

    it("Should revert if tries to bet on incorrect option or with more than deposit amount", async function() {

        await assertRevert(allMarkets.placePrediction(7, ethAddress, 2*1e5, 10, { from: user2 })); // wrong option
        await assertRevert(allMarkets.placePrediction(7, ethAddress, 2*1e6, 1, { from: user2 })); // insuffecient deposit
    });

    it("Should not be able to withdraw even after user predicted correctly if market is still in cooling", async function() {

        await assertRevert(allMarkets.postResultMock(1,7)); // can't call before closing time

        await increaseTime(8*60*60);

        await assertRevert(allMarkets.placePrediction(7, ethAddress, 0, 1, { from: user2 })); // should not be able to predict after market expires

        await assertRevert(allMarkets.postResultMock(0,7)); // closing values should not be 0
        await allMarkets.postResultMock(1,7);


        await assertRevert(allMarkets.withdrawMax(10,{from:user2}));

        let unusedBal = await allMarkets.getUserUnusedBalance(user2);
        assert.equal(unusedBal[0],0);
    });

    it("Should be able to withdraw reward and deposited after cooling period is over", async function() {

        await increaseTime(60*61);
        let ethBalBefore = await web3.eth.getBalance(user2);
        let _gasPrice = 1500;

        let tx= await allMarkets.withdrawMax(10,{from:user2,gasPrice:_gasPrice});

        let gasUsed = tx.receipt.gasUsed;

        let gascost = _gasPrice * gasUsed;
        let ethBalAfter = await web3.eth.getBalance(user2);

        let user3Lost = 1e18 - 1e17/100;

        let rewardAmt = user3Lost - user3Lost*0.5/100 + (0.002 *1e18 - 0.0002*1e18/100);

        assert.equal(Math.round((ethBalAfter - ethBalBefore)/1e10),Math.round((rewardAmt-gascost)/1e10));

        let unusedBal = await allMarkets.getUserUnusedBalance(user2);
        assert.equal(unusedBal[0],0);
    });

    it("Integrated test case", async function() {

        await allMarkets.deposit(toWei(1000),{from:user2,value:toWei(1)}); 
        await allMarkets.deposit(toWei(400),{from:user5,value:toWei(2)}); 

        await allMarkets.createMarket(1, 0,{from:user4});

        await allMarkets.placePrediction(8, plotusToken.address, 100*1e8, 1, { from: user2 });
        await allMarkets.placePrediction(8, ethAddress, 1e8, 2, { from: user5 });


        await allMarkets.createMarket(0, 0,{from:user4});

        await allMarkets.placePrediction(9, ethAddress, 0.1*1e8, 1, { from: user2 });
        await allMarkets.placePrediction(9, plotusToken.address, 200*1e8, 2, { from: user5 });

        await increaseTime(4 * 3600);

        await allMarkets.createMarket(1, 0,{from:user4});

        await allMarkets.placePrediction(10, plotusToken.address, 500*1e8, 2, { from: user2 });
        await allMarkets.placePrediction(10, ethAddress, 1e8, 1, { from: user5 });


        await allMarkets.createMarket(0, 0,{from:user4});

        await allMarkets.placePrediction(11, ethAddress, 0.5*1e8, 1, { from: user2 });
        await allMarkets.placePrediction(11, plotusToken.address, 200*1e8, 2, { from: user5 });

        let unusedBal = await allMarkets.getUserUnusedBalance(user2);

        assert.equal(unusedBal[0],toWei(400));
        assert.equal(unusedBal[2],toWei(0.4));

        let ethBalBefore = await web3.eth.getBalance(user2);
        let plotBalBefore = await plotusToken.balanceOf(user2);

        let _gasPrice = 15;

        let tx = await allMarkets.withdraw(toWei(100),toWei(0.1),100,{from:user2,gasPrice:_gasPrice});

        let gasUsed = tx.receipt.gasUsed;

        let gascost = _gasPrice * gasUsed;

        let ethBalAfter = await web3.eth.getBalance(user2);
        let plotBalAfter = await plotusToken.balanceOf(user2);

        assert.equal(Math.round((ethBalAfter-ethBalBefore/1 + gascost)/1e5),0.1*1e13);
        assert.equal(plotBalAfter-plotBalBefore,toWei(100));

        unusedBal = await allMarkets.getUserUnusedBalance(user2);

        assert.equal(unusedBal[0],toWei(300));
        assert.equal(unusedBal[2],toWei(0.3));

        tx = await allMarkets.withdrawMax(100,{from:user2,gasPrice:_gasPrice});

        gasUsed = tx.receipt.gasUsed;

        gascost = _gasPrice * gasUsed;

        let ethBalAfter2 = await web3.eth.getBalance(user2);
        let plotBalAfter2 = await plotusToken.balanceOf(user2);

        assert.equal(Math.round((ethBalAfter2-ethBalAfter/1 + gascost)/1e5),0.3*1e13);
        assert.equal(plotBalAfter2-plotBalAfter,toWei(300));

        await increaseTime(4 * 3600);

        await allMarkets.postResultMock(1,8);
        await allMarkets.postResultMock(1,9);

        unusedBal = await allMarkets.getUserUnusedBalance(user2);
        assert.equal(unusedBal[0]/1+unusedBal[1],0);
        assert.equal(unusedBal[2]/1+unusedBal[3],0);


        await governance.setAllMarketsAddress();

        await plotusToken.approve(allMarkets.address,toWei(500));
        let proposalId = await governance.getProposalLength();
        await allMarkets.raiseDispute(9, "10000000000000000000000000","","","");

        await increaseTime(3610);
        unusedBal = await allMarkets.getUserUnusedBalance(user2);
        assert.equal(unusedBal[0]/1+unusedBal[1]/1,toWei(99.95));
        assert.equal(unusedBal[2]/1+unusedBal[3]/1,toWei(0.994005));

        ethBalBefore = await web3.eth.getBalance(user2);
        plotBalBefore = await plotusToken.balanceOf(user2);

        tx = await allMarkets.withdrawMax(100,{from:user2,gasPrice:_gasPrice});

        gasUsed = tx.receipt.gasUsed;

        gascost = _gasPrice * gasUsed;

        ethBalAfter = await web3.eth.getBalance(user2);
        plotBalAfter = await plotusToken.balanceOf(user2);

        assert.equal(Math.round((ethBalAfter-ethBalBefore/1 + gascost)/1e5),0.994005*1e13);
        assert.equal(plotBalAfter-plotBalBefore,toWei(99.95));

        await assertRevert(allMarkets.withdrawMax(100,{from:user2}));

        await increaseTime(5*3600);

        await allMarkets.postResultMock(1,10);

        await increaseTime(3610);

        unusedBal = await allMarkets.getUserUnusedBalance(user2);
        assert.equal(unusedBal[0]/1+unusedBal[1]/1,0);
        assert.equal(unusedBal[2]/1+unusedBal[3]/1,0);

        await allMarkets.postResultMock(1,11);

        await increaseTime(3610);

        unusedBal = await allMarkets.getUserUnusedBalance(user2);
        assert.equal(unusedBal[0]/1+unusedBal[1]/1,toWei(199.9));
        assert.equal(unusedBal[2]/1+unusedBal[3]/1,toWei(0.4995));

        ethBalBefore = await web3.eth.getBalance(user2);
        plotBalBefore = await plotusToken.balanceOf(user2);

        tx = await allMarkets.withdrawMax(100,{from:user2,gasPrice:_gasPrice});

        gasUsed = tx.receipt.gasUsed;

        gascost = _gasPrice * gasUsed;

        ethBalAfter = await web3.eth.getBalance(user2);
        plotBalAfter = await plotusToken.balanceOf(user2);

        assert.equal(Math.round((ethBalAfter-ethBalBefore/1 + gascost)/1e5),0.4995*1e13);
        assert.equal(Math.round((plotBalAfter-plotBalBefore)/1e17),1999);


        await plotusToken.transfer(user6, "20000000000000000000000");
        await plotusToken.transfer(user7, "20000000000000000000000");
        await plotusToken.transfer(user8, "20000000000000000000000");
        await plotusToken.approve(tokenController.address, "20000000000000000000000",{from : user6});
        await tokenController.lock("0x4452","20000000000000000000000",(86400*20),{from : user6});
        await plotusToken.approve(tokenController.address, "20000000000000000000000",{from : user7});
        await tokenController.lock("0x4452","20000000000000000000000",(86400*20),{from : user7});
        await plotusToken.approve(tokenController.address, "20000000000000000000000",{from : user8});
        await tokenController.lock("0x4452","20000000000000000000000",(86400*20),{from : user8});


        await governance.submitVote(proposalId, 1, {from:user6});
        await governance.submitVote(proposalId, 1, {from:user7});
        await governance.submitVote(proposalId, 1, {from:user8});
        await increaseTime(605800);
        await governance.closeProposal(proposalId);
        await increaseTime(86401);
        assert.equal((await allMarkets.getMarketResults(9))[0]/1, 3);



        unusedBal = await allMarkets.getUserUnusedBalance(user2);
        assert.equal(unusedBal[0]/1+unusedBal[1]/1,0);
        assert.equal(unusedBal[2]/1+unusedBal[3]/1,0);
    });

    it("Should revert if tries to deposit both eth and plot with depositAndPlacePrediction()", async function() {
        await assertRevert(allMarkets.depositAndPlacePrediction(toWei(1),toWei(1),7,plotusToken.address,1e8,1,{from:user2,value:toWei(1)}));
    });

    it("Should revert if tries to pay wrong amount in eth while deposit", async function() {
        await assertRevert(allMarkets.depositAndPlacePrediction(toWei(1),toWei(1),7,ethAddress,1e8,1,{from:user2,value:toWei(2)}));
    });

});
