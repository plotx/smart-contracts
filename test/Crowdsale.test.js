const Crowdsale = artifacts.require('Crowdsale');
const PlotusToken = artifacts.require('PlotXToken');
const TokenMock = artifacts.require('TokenMock');
const DummyTokenMock = artifacts.require('DummyTokenMock');

const assertRevert = require("./utils/assertRevert.js").assertRevert;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const encode = require("./utils/encoder.js").encode;
const { toHex, toWei } = require("./utils/ethTools.js");
const expectEvent = require("./utils/expectEvent");
const Web3 = require("web3");
const { assert } = require("chai");
const web3 = new Web3();
let maxAllowance = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
const nullAddress = "0x0000000000000000000000000000000000000000";

let crowdsale;
let plotusToken;
let usdcTok;
let usdtTok;
let usdcTokDummy;
let usdtTokDummy;
let dummyCrowdsale;


contract("Crowdsale", ([user1, user2, wallet]) => {
  before(async function () {
    plotusToken = await PlotusToken.new(toWei(1000000));
    usdcTok = await TokenMock.new("USDC","USDC");
    usdtTok = await TokenMock.new("USDT","USDT");
    usdcTokDummy = await DummyTokenMock.new("USDC","USDC");
    usdtTokDummy = await DummyTokenMock.new("USDT","USDT");
    crowdsale = await Crowdsale.new(user1, wallet, plotusToken.address, usdcTok.address, usdtTok.address);
    dummyCrowdsale = await Crowdsale.new(user1, user1, plotusToken.address, usdcTokDummy.address, usdtTokDummy.address);
    await plotusToken.transfer(crowdsale.address, toWei("100"));
    await plotusToken.transfer(dummyCrowdsale.address, toWei("100"));
    await usdcTok.approve(crowdsale.address, maxAllowance);
    await usdtTok.approve(crowdsale.address, maxAllowance);
    await usdcTokDummy.approve(dummyCrowdsale.address, maxAllowance);
    await usdtTokDummy.approve(dummyCrowdsale.address, maxAllowance);
    await usdcTok.mint(toWei(100));
    await usdtTok.mint(toWei(100));
    await usdcTokDummy.mint(toWei(100));
    await usdtTokDummy.mint(toWei(100));
  });
  describe('Crowdsale', function () {
    const value = toWei('42');
    const tokenSupply = toWei(10000);

    it('Crowdsale contract should initialize correctly', async function () {
      assert.equal(await crowdsale.token(), plotusToken.address);
      assert.equal(await crowdsale.wallet(), wallet);
      assert.equal(await crowdsale.tokenUSDC(), usdcTok.address);
      assert.equal(await crowdsale.tokenUSDT(), usdtTok.address);
      assert.equal(await crowdsale.spendingLimit(), toWei(10000));
      assert.equal(await crowdsale.fundRaised(), 0);
    });

    it('Should revert if ERC20 transfer returns false', async function () {
      await dummyCrowdsale.addUserToWhiteList(user1);
      await assertRevert(dummyCrowdsale.buyTokens(user1, toWei(10), usdtTokDummy.address));
      await usdtTokDummy.mint(dummyCrowdsale.address, toWei(1));
      await assertRevert(dummyCrowdsale.forwardFunds());
      await usdcTokDummy.mint(dummyCrowdsale.address, toWei(1));
      await assertRevert(dummyCrowdsale.forwardFunds());
    });

    it('Should forward funds if stuck', async function () {
      await usdtTok.transfer(crowdsale.address, toWei(1));
      await usdcTok.transfer(crowdsale.address, toWei(1));
      let beforeBalUSDT = await usdtTok.balanceOf(crowdsale.address);
      let beforeBalUSDC = await usdcTok.balanceOf(crowdsale.address);
      await crowdsale.forwardFunds();
      let afterBalUSDT = await usdtTok.balanceOf(crowdsale.address);
      let afterBalUSDC = await usdcTok.balanceOf(crowdsale.address);
      assert.equal(beforeBalUSDC - afterBalUSDC, toWei(1));
      assert.equal(beforeBalUSDT - afterBalUSDT, toWei(1));
    });

    it('requires a non-null authorised, token and wallet addresses', async function () {
      await assertRevert(
        Crowdsale.new(nullAddress, user1, plotusToken.address, usdcTok.address, usdtTok.address),
        'Crowdsale: wallet is the zero address'
      );

      await assertRevert(
        Crowdsale.new(user1, nullAddress, plotusToken.address, usdcTok.address, usdtTok.address),
        'Crowdsale: wallet is the zero address'
      );
      await assertRevert(
        Crowdsale.new(user1, user1, nullAddress, usdcTok.address, usdtTok.address),
        'Crowdsale: token is the zero address'
      );
      await assertRevert(
        Crowdsale.new(user1, user1, plotusToken.address, nullAddress, usdtTok.address),
        'Crowdsale: usdc token is the zero address'
      );
      await assertRevert(
        Crowdsale.new(user1, user1, plotusToken.address, usdcTok.address, nullAddress),
        'Crowdsale: usdt token is the zero address'
      );
    });

    describe('Reverts', function () {
        it('should revert if beneficiary address is null', async function () {
          await assertRevert(crowdsale.buyTokens(nullAddress, toWei(10), usdcTok.address));
        });
        it('should revert if tries to spend 0 amount', async function () {
          await assertRevert(crowdsale.buyTokens(user1, 0, usdcTok.address));
        });
        it('should revert if tries to spend invalid asset', async function () {
          await assertRevert(crowdsale.buyTokens(user1, toWei(10), plotusToken.address));
        });
        it('should revert if beneficiary is not whitelisted', async function () {
          await assertRevert(crowdsale.buyTokens(user1, toWei(10), usdcTok.address));
        });
        it('should revert if Non-authorised user tries to whitelist', async function () {
          await assertRevert(crowdsale.addUserToWhiteList(user1, {from:user2}));
        });
        it('should revert if Non-authorised user tries to blacklist', async function () {
          await assertRevert(crowdsale.removeUserFromWhiteList(user1, {from:user2}));
        });
    });

    describe('accepting payments', function () {
      before(async function () {
        assert.equal(await crowdsale.whitelisted(user1), false);
        await crowdsale.addUserToWhiteList(user1);
        assert.equal(await crowdsale.whitelisted(user1), true);
      });
      describe('buyTokens', function () {
        it('should accept usdc payments', async function () {
          let beforeBalWalletUSDC = await usdcTok.balanceOf(wallet);
          let beforeBalUserUSDC = await usdcTok.balanceOf(user1);
          let beforeBalCrowdsalePlot = await plotusToken.balanceOf(crowdsale.address);
          let beforeBalUserPlot = await plotusToken.balanceOf(user1);
          let beforeUserSpent = await crowdsale.userSpentSoFar(user1);
          let beforeFundRaised = await crowdsale.fundRaised();
          await crowdsale.buyTokens(user1, toWei(10), usdcTok.address);
          let afterBalWalletUSDC = await usdcTok.balanceOf(wallet);
          let afterBalUserUSDC = await usdcTok.balanceOf(user1);
          let afterBalCrowdsalePlot = await plotusToken.balanceOf(crowdsale.address);
          let afterBalUserPlot = await plotusToken.balanceOf(user1);
          let afterUserSpent = await crowdsale.userSpentSoFar(user1);
          let afterFundRaised = await crowdsale.fundRaised();
          assert.equal(beforeBalUserUSDC - afterBalUserUSDC, toWei(10));
          assert.equal(afterBalWalletUSDC - beforeBalWalletUSDC, toWei(10));
          assert.equal(beforeBalCrowdsalePlot - afterBalCrowdsalePlot, toWei(10));
          assert.equal(afterBalUserPlot/1e18 - beforeBalUserPlot/1e18, 10);
          assert.equal(afterFundRaised - beforeFundRaised, toWei(10));
        });

        it('should accept usdt payments', async function () {
          let beforeBalWalletUSDT = await usdtTok.balanceOf(wallet);
          let beforeBalUserUSDT = await usdtTok.balanceOf(user1);
          let beforeBalCrowdsalePlot = await plotusToken.balanceOf(crowdsale.address);
          let beforeBalUserPlot = await plotusToken.balanceOf(user1);
          let beforeUserSpent = await crowdsale.userSpentSoFar(user1);
          let beforeFundRaised = await crowdsale.fundRaised();
          await crowdsale.buyTokens(user1, toWei(10), usdtTok.address);
          let afterBalWalletUSDT = await usdtTok.balanceOf(wallet);
          let afterBalUserUSDT = await usdtTok.balanceOf(user1);
          let afterBalCrowdsalePlot = await plotusToken.balanceOf(crowdsale.address);
          let afterBalUserPlot = await plotusToken.balanceOf(user1);
          let afterUserSpent = await crowdsale.userSpentSoFar(user1);
          let afterFundRaised = await crowdsale.fundRaised();
          assert.equal(beforeBalUserUSDT - afterBalUserUSDT, toWei(10));
          assert.equal(afterBalWalletUSDT - beforeBalWalletUSDT, toWei(10));
          assert.equal(beforeBalCrowdsalePlot - afterBalCrowdsalePlot, toWei(10));
          assert.equal(afterBalUserPlot/1e18 - beforeBalUserPlot/1e18, 10);
          assert.equal(afterFundRaised - beforeFundRaised, toWei(10));
        });

        it('reverts if tries to spend more than limit', async function () {
          await usdcTok.mint(toWei(10000));
          await plotusToken.transfer(crowdsale.address, toWei("10000"));
          await assertRevert(crowdsale.buyTokens(user1, toWei(10000), usdcTok.address));
        });

        it('Authorised address should be able to blacklist user', async function () {
          let beforeBalUserPlot = await plotusToken.balanceOf(user1);
          assert.equal(await crowdsale.whitelisted(user1), true);
          await crowdsale.removeUserFromWhiteList(user1);
          let afterBalUserPlot = await plotusToken.balanceOf(user1);
          assert.equal(await crowdsale.whitelisted(user1), false);
          assert.equal(beforeBalUserPlot/1, afterBalUserPlot/1);
        });
      });
    });
  });
});
