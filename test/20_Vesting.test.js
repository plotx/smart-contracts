const Vesting = artifacts.require('Vesting');
const PlotusToken = artifacts.require('PlotXToken');
const DummyTokenMock = artifacts.require('DummyTokenMock');

const assertRevert = require("./utils/assertRevert.js").assertRevert;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const latestTime = require("./utils/latestTime.js").latestTime;
const encode = require("./utils/encoder.js").encode;
const { toHex, toWei } = require("./utils/ethTools.js");
const expectEvent = require("./utils/expectEvent");
const Web3 = require("web3");
const { assert } = require("chai");
const web3 = new Web3();
let maxAllowance = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
const nullAddress = "0x0000000000000000000000000000000000000000";

let vesting;
let plotusToken;
let usdtTokDummy;
let dummyVesting;
let dummyToken;


contract("Vesting", ([owner, user1, user2, user3, user4, user5]) => {
  before(async function () {
    plotusToken = await PlotusToken.new(toWei(30000000), owner);
    vesting = await Vesting.new(plotusToken.address, owner);
    dummyToken = await DummyTokenMock.new("dummy","dummy");
    dummyVesting = await Vesting.new(dummyToken.address, owner);
    await plotusToken.approve(vesting.address, maxAllowance);
    await dummyToken.approve(dummyVesting.address, maxAllowance);
    await dummyToken.mint(toWei(10000000));
  });
  describe('Vesting: Adding vesting data', function () {

    it('Vesting contract should initialize correctly', async function () {
      assert.equal(await vesting.token(), plotusToken.address);
      assert.equal(await vesting.owner(), owner);
    });

    it('Allocate vesting to all user in single Tx', async function () {
      let _startTime1 = (await latestTime())/1 + 24*3600*30*2;
      let _startTime2 = await latestTime();
      let _startTime3 = await latestTime();
      let _startTime4 = await latestTime();
      let _startTime5 = (await latestTime())/1 + 24*3600*30*11;

      let user2BalBefore = await plotusToken.balanceOf(user2);
      let user3BalBefore = await plotusToken.balanceOf(user3);
      await vesting.addTokenVesting([user1,user2,user3,user4,user5], [_startTime1,_startTime2,_startTime3,_startTime4,_startTime5], [toWei(5000000),toWei(4500000),toWei(4000000),toWei(5000000),toWei(5000000)], [20,6,6,5,10], [30,30,30,90,30], [0,toWei(500000),toWei(1000000),0,0]);

      let user2BalAfter = await plotusToken.balanceOf(user2);
      let user3BalAfter = await plotusToken.balanceOf(user3);

      assert.equal(Math.floor((user2BalAfter - user2BalBefore)/1e18), 500000);
      assert.equal(Math.floor((user3BalAfter - user3BalBefore)/1e18), 1000000);

      let vestingData = await vesting.tokenAllocations(user1); 
      assert.equal(vestingData[0], 20);
      assert.equal(vestingData[1], 0);
      assert.equal(vestingData[2], 30);
      assert.equal(vestingData[3], _startTime1);
      assert.equal(vestingData[4]/1e18, 5000000);
      assert.equal(vestingData[5], 0);

      vestingData = await vesting.tokenAllocations(user2); 
      assert.equal(vestingData[0], 6);
      assert.equal(vestingData[1], 0);
      assert.equal(vestingData[2], 30);
      assert.equal(vestingData[3], _startTime2);
      assert.equal(vestingData[4]/1e18, 4500000);
      assert.equal(vestingData[5], 0);

      vestingData = await vesting.tokenAllocations(user3); 
      assert.equal(vestingData[0], 6);
      assert.equal(vestingData[1], 0);
      assert.equal(vestingData[2], 30);
      assert.equal(vestingData[3], _startTime3);
      assert.equal(vestingData[4]/1e18, 4000000);
      assert.equal(vestingData[5], 0);

      vestingData = await vesting.tokenAllocations(user4); 
      assert.equal(vestingData[0], 5);
      assert.equal(vestingData[1], 0);
      assert.equal(vestingData[2], 90);
      assert.equal(vestingData[3], _startTime4);
      assert.equal(vestingData[4]/1e18, 5000000);
      assert.equal(vestingData[5], 0);

      vestingData = await vesting.tokenAllocations(user5); 
      assert.equal(vestingData[0], 10);
      assert.equal(vestingData[1], 0);
      assert.equal(vestingData[2], 30);
      assert.equal(vestingData[3], _startTime5);
      assert.equal(vestingData[4]/1e18, 5000000);
      assert.equal(vestingData[5], 0);


    });

    it('After 1 month.', async function () {
      await increaseTime(3600 * 24 * 30);
      let user2BAlBefore = await plotusToken.balanceOf(user2);
      let user3BAlBefore = await plotusToken.balanceOf(user3);
      await assertRevert(vesting.claimVestedTokens({from:user1}));
      await vesting.claimVestedTokens({from:user2});
      await vesting.claimVestedTokens({from:user3});
      await assertRevert(vesting.claimVestedTokens({from:user4}));
      await assertRevert(vesting.claimVestedTokens({from:user5}));
      let user2BAlAfter = await plotusToken.balanceOf(user2);
      let user3BAlAfter = await plotusToken.balanceOf(user3);
      let vestingData2 = await vesting.tokenAllocations(user2); 
      let vestingData3 = await vesting.tokenAllocations(user3); 
      assert.equal(vestingData2[1], 1);
      assert.equal(vestingData2[5]/1e18, 750000);
      assert.equal(vestingData3[1], 1);
      assert.equal(Math.floor(vestingData3[5]/1e18), 666666);
      assert.equal(Math.floor((user2BAlAfter - user2BAlBefore)/1e18), 750000);
      assert.equal(Math.floor((user3BAlAfter - user3BAlBefore)/1e18), 666666);
    });

    it('After 2 month.', async function () {
      await increaseTime(3600 * 24 * 30);
      let user2BAlBefore = await plotusToken.balanceOf(user2);
      let user3BAlBefore = await plotusToken.balanceOf(user3);
      await assertRevert(vesting.claimVestedTokens({from:user1}));
      await vesting.claimVestedTokens({from:user2});
      await vesting.claimVestedTokens({from:user3});
      await assertRevert(vesting.claimVestedTokens({from:user4}));
      await assertRevert(vesting.claimVestedTokens({from:user5}));
      let user2BAlAfter = await plotusToken.balanceOf(user2);
      let user3BAlAfter = await plotusToken.balanceOf(user3);
      let vestingData2 = await vesting.tokenAllocations(user2); 
      let vestingData3 = await vesting.tokenAllocations(user3); 
      assert.equal(vestingData2[1], 2);
      assert.equal(vestingData2[5]/1e18, 1500000);
      assert.equal(vestingData3[1], 2);
      assert.equal(Math.floor(vestingData3[5]/1e18), 1333333);
      assert.equal(Math.floor((user2BAlAfter/1e18 - user2BAlBefore/1e18)), 750000);
      assert.equal(Math.floor((user3BAlAfter - user3BAlBefore)/1e18), 666666);
    });

    it('After 3 month.', async function () {
      await increaseTime(3600 * 24 * 30);
      let user1BAlBefore = await plotusToken.balanceOf(user1);
      let user2BAlBefore = await plotusToken.balanceOf(user2);
      let user3BAlBefore = await plotusToken.balanceOf(user3);
      let user4BAlBefore = await plotusToken.balanceOf(user4);
      await vesting.claimVestedTokens({from:user1});
      await vesting.claimVestedTokens({from:user2});
      await vesting.claimVestedTokens({from:user3});
      await vesting.claimVestedTokens({from:user4});
      await assertRevert(vesting.claimVestedTokens({from:user5}));
      let user1BAlAfter = await plotusToken.balanceOf(user1);
      let user2BAlAfter = await plotusToken.balanceOf(user2);
      let user3BAlAfter = await plotusToken.balanceOf(user3);
      let user4BAlAfter = await plotusToken.balanceOf(user4);
      let vestingData1 = await vesting.tokenAllocations(user1); 
      let vestingData2 = await vesting.tokenAllocations(user2); 
      let vestingData3 = await vesting.tokenAllocations(user3); 
      let vestingData4 = await vesting.tokenAllocations(user4); 
      assert.equal(vestingData1[1], 1);
      assert.equal(vestingData1[5]/1e18, 250000);
      assert.equal(vestingData2[1], 3);
      assert.equal(vestingData2[5]/1e18, 2250000);
      assert.equal(vestingData3[1], 3);
      assert.equal(Math.floor(vestingData3[5])/1e18, 2000000);
      assert.equal(vestingData4[1], 1);
      assert.equal(Math.floor(vestingData4[5])/1e18, 1000000);
      assert.equal(Math.floor((user1BAlAfter - user1BAlBefore)/1e18), 250000);
      assert.equal(Math.floor((user2BAlAfter - user2BAlBefore)/1e18), 750000);
      assert.equal(Math.floor((user3BAlAfter - user3BAlBefore)/1e18), 666666);
      assert.equal(Math.floor((user4BAlAfter - user4BAlBefore)/1e18), 1000000);
    });

    it('After 6 month.', async function () {
      await increaseTime(3600 * 24 * 30 * 3);
      let user1BAlBefore = await plotusToken.balanceOf(user1);
      let user2BAlBefore = await plotusToken.balanceOf(user2);
      let user3BAlBefore = await plotusToken.balanceOf(user3);
      let user4BAlBefore = await plotusToken.balanceOf(user4);
      await vesting.claimVestedTokens({from:user1});
      await vesting.claimVestedTokens({from:user2});
      await vesting.claimVestedTokens({from:user3});
      await vesting.claimVestedTokens({from:user4});
      await assertRevert(vesting.claimVestedTokens({from:user5}));
      let user1BAlAfter = await plotusToken.balanceOf(user1);
      let user2BAlAfter = await plotusToken.balanceOf(user2);
      let user3BAlAfter = await plotusToken.balanceOf(user3);
      let user4BAlAfter = await plotusToken.balanceOf(user4);
      let vestingData1 = await vesting.tokenAllocations(user1); 
      let vestingData2 = await vesting.tokenAllocations(user2); 
      let vestingData3 = await vesting.tokenAllocations(user3); 
      let vestingData4 = await vesting.tokenAllocations(user4); 
      assert.equal(vestingData1[1], 4);
      assert.equal(vestingData1[5]/1e18, 1000000);
      assert.equal(vestingData2[1], 6);
      assert.equal(vestingData2[5]/1e18, 4500000);
      assert.equal(vestingData3[1], 6);
      assert.equal(Math.floor(vestingData3[5])/1e18, 4000000);
      assert.equal(vestingData4[1], 2);
      assert.equal(Math.floor(vestingData4[5])/1e18, 2000000);
      assert.equal(Math.floor((user1BAlAfter - user1BAlBefore)/1e18), 750000);
      assert.equal(Math.floor((user2BAlAfter - user2BAlBefore)/1e18), 2250000);
      assert.equal(Math.floor((user3BAlAfter - user3BAlBefore)/1e18), 2000000);
      assert.equal(Math.floor((user4BAlAfter - user4BAlBefore)/1e18), 1000000);
    });

    it('After 11 month.', async function () {
      await increaseTime(3600 * 24 * 30 * 5);
      let user1BAlBefore = await plotusToken.balanceOf(user1);
      let user4BAlBefore = await plotusToken.balanceOf(user4);
      await vesting.claimVestedTokens({from:user1});
      await assertRevert(vesting.claimVestedTokens({from:user2}));
      await assertRevert(vesting.claimVestedTokens({from:user3}));
      await vesting.claimVestedTokens({from:user4});
      await assertRevert(vesting.claimVestedTokens({from:user5}));
      let user1BAlAfter = await plotusToken.balanceOf(user1);
      let user4BAlAfter = await plotusToken.balanceOf(user4);
      let vestingData1 = await vesting.tokenAllocations(user1); 
      let vestingData4 = await vesting.tokenAllocations(user4); 
      assert.equal(vestingData1[1], 9);
      assert.equal(vestingData1[5]/1e18, 2250000);
      assert.equal(vestingData4[1], 3);
      assert.equal(Math.floor(vestingData4[5])/1e18, 3000000);
      assert.equal(Math.floor((user1BAlAfter - user1BAlBefore)/1e18), 1250000);
      assert.equal(Math.floor((user4BAlAfter - user4BAlBefore)/1e18), 1000000);
    });

    it('After 12 month.', async function () {
      await increaseTime(3600 * 24 * 30);
      let user1BAlBefore = await plotusToken.balanceOf(user1);
      let user4BAlBefore = await plotusToken.balanceOf(user4);
      let user5BAlBefore = await plotusToken.balanceOf(user5);
      await vesting.claimVestedTokens({from:user1});
      await assertRevert(vesting.claimVestedTokens({from:user2}));
      await assertRevert(vesting.claimVestedTokens({from:user3}));
      await vesting.claimVestedTokens({from:user4});
      await vesting.claimVestedTokens({from:user5});
      let user1BAlAfter = await plotusToken.balanceOf(user1);
      let user4BAlAfter = await plotusToken.balanceOf(user4);
      let user5BAlAfter = await plotusToken.balanceOf(user5);
      let vestingData1 = await vesting.tokenAllocations(user1); 
      let vestingData4 = await vesting.tokenAllocations(user4); 
      let vestingData5 = await vesting.tokenAllocations(user5); 
      assert.equal(vestingData1[1], 10);
      assert.equal(vestingData1[5]/1e18, 2500000);
      assert.equal(vestingData4[1], 4);
      assert.equal(Math.floor(vestingData4[5])/1e18, 4000000);
      assert.equal(vestingData5[1], 1);
      assert.equal(Math.floor(vestingData5[5])/1e18, 500000);
      assert.equal(Math.floor((user1BAlAfter - user1BAlBefore)/1e18), 250000);
      assert.equal(Math.floor((user4BAlAfter - user4BAlBefore)/1e18), 1000000);
      assert.equal(Math.floor((user5BAlAfter - user5BAlBefore)/1e18), 500000);
    });

    it('After 23 month.', async function () {
      await increaseTime(3600 * 24 * 30 * 11);
      let user1BAlBefore = await plotusToken.balanceOf(user1);
      let user4BAlBefore = await plotusToken.balanceOf(user4);
      let user5BAlBefore = await plotusToken.balanceOf(user5);
      await vesting.claimVestedTokens({from:user1});
      await assertRevert(vesting.claimVestedTokens({from:user2}));
      await assertRevert(vesting.claimVestedTokens({from:user3}));
      await vesting.claimVestedTokens({from:user4});
      await vesting.claimVestedTokens({from:user5});
      let user1BAlAfter = await plotusToken.balanceOf(user1);
      let user4BAlAfter = await plotusToken.balanceOf(user4);
      let user5BAlAfter = await plotusToken.balanceOf(user5);
      let vestingData1 = await vesting.tokenAllocations(user1); 
      let vestingData4 = await vesting.tokenAllocations(user4); 
      let vestingData5 = await vesting.tokenAllocations(user5); 
      assert.equal(vestingData1[1], 20);
      assert.equal(vestingData1[5]/1e18, 5000000);
      assert.equal(vestingData4[1], 5);
      assert.equal(Math.floor(vestingData4[5])/1e18, 5000000);
      assert.equal(vestingData5[1], 10);
      assert.equal(Math.floor(vestingData5[5])/1e18, 5000000);
      assert.equal(Math.floor((user1BAlAfter - user1BAlBefore)/1e18), 2500000);
      assert.equal(Math.floor((user4BAlAfter - user4BAlBefore)/1e18), 1000000);
      assert.equal(Math.floor((user5BAlAfter - user5BAlBefore)/1e18), 4500000);
    });

    describe('Reverts', function () {
        it('should revert if non-owner tries to add vesting', async function () {
          let nowTime = await latestTime();
          await assertRevert(vesting.addTokenVesting([owner], [nowTime], [toWei(4500000)], [6], [30], [toWei(500000)], {from:user3}));
        });
        it('should revert if tries to add vesting for user more than 1 time', async function () {
          let nowTime = await latestTime();
          await assertRevert(vesting.addTokenVesting([user2], [nowTime], [toWei(4500000)], [6], [30], [toWei(500000)]));
        });
        it('should revert if amountVestedPerPeriod is 0', async function () {
          let nowTime = await latestTime();
          await assertRevert(vesting.addTokenVesting([owner], [nowTime], [5], [6], [30], [10]));
        });
        it('should revert if start time is 0', async function () {
          
          await assertRevert(vesting.addTokenVesting([owner], [0], [5], [6], [30], [10]));
        });
        it('should not deploy with nullAddress', async function () {
          const nullAddress = "0x0000000000000000000000000000000000000000";
          await assertRevert(Vesting.new(nullAddress, owner));
          await assertRevert(Vesting.new(plotusToken.address, nullAddress));
        });
        it('should revert if tries to claim before start time', async function () {
          let nowTime = (await latestTime())/1 + 100000;
          await dummyVesting.addTokenVesting([user1], [nowTime], [toWei(5000000)], [20], [30], [0]);

          await assertRevert(dummyVesting.claimVestedTokens({from:user1}));
        });

        it('should revert if tries to claim while token locked for gov', async function () {
          await dummyToken.setDummyBit(user1, true);
          await assertRevert(dummyVesting.claimVestedTokens({from:user1}));
        });

        it('should revert if transfer of token fails', async function () {
          await increaseTime(3600 * 24 * 30 * 4);
          await dummyToken.setDummyBit(user1, false);
          await assertRevert(dummyVesting.claimVestedTokens({from:user1}));
        });
        it('should revert if different array length passed', async function () {
          let nowTime = await latestTime();
          await assertRevert(vesting.addTokenVesting([owner], [nowTime,nowTime], [5], [6], [30], [10]));
          await assertRevert(vesting.addTokenVesting([owner], [nowTime], [5,1], [6], [30], [10]));
          await assertRevert(vesting.addTokenVesting([owner], [nowTime], [5], [6,10], [30], [10]));
          await assertRevert(vesting.addTokenVesting([owner], [nowTime], [5], [6], [30,30], [10]));
          await assertRevert(vesting.addTokenVesting([owner], [nowTime], [5], [6], [30], [10,20]));
        });
    });
  });
});
