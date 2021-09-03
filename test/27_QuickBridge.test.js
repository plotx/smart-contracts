const QuickBridge = artifacts.require('QuickBridge');
const PlotusToken = artifacts.require('PlotXToken');
const ERC20 = artifacts.require("TokenMock");
const DummyTokenMock = artifacts.require('DummyTokenMock');
const RootChainManagerMock = artifacts.require('RootChainManagerMock');
const ERC20PredicateMock = artifacts.require('ERC20PredicateMock');

const assertRevert = require("./utils/assertRevert.js").assertRevert;
const increaseTime = require("./utils/increaseTime.js").increaseTime;
const latestTime = require("./utils/latestTime.js").latestTime;
const encode = require("./utils/encoder.js").encode;
const { toHex, toWei } = require("./utils/ethTools.js");
const expectEvent = require("./utils/expectEvent");
// const Web3 = require("web3");
const { assert } = require("chai");
// const web3 = new Web3();
let maxAllowance = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
const nullAddress = "0x0000000000000000000000000000000000000000";
const nativeCurrency = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

let quickBridge;
let plotusToken;
let usdtTokDummy;
// let dummyQuickBridge;
let dummyToken;
let token1, token2, token3;
let rootchainmanager,erc20predicate;


contract("Quick Bridge", ([owner, user1, user2, user3, user4, user5]) => {
  before(async function () {
    plotusToken = await PlotusToken.new(toWei(30000000), owner);
    token1 = await ERC20.new("T1","T1");
    token2 = await ERC20.new("T2","T2");
    token3 = await ERC20.new("T3","T3");
    dummyToken = await DummyTokenMock.new("dummy","dummy");
    erc20predicate = await ERC20PredicateMock.new();
    rootchainmanager = await RootChainManagerMock.new(erc20predicate.address);
    quickBridge = await QuickBridge.new(user4,[plotusToken.address,token1.address,token2.address,dummyToken.address],user5,rootchainmanager.address,erc20predicate.address,nativeCurrency);

    // dummyQuickBridge = await QuickBridge.new(dummyToken.address, owner);
    // await plotusToken.approve(vesting.address, maxAllowance);
    // await dummyToken.approve(dummyVesting.address, maxAllowance);
    await dummyToken.mint(toWei(1000));
    await token1.mint(user1,toWei(1000));
    await token2.mint(user1,toWei(1000));
    await token3.mint(user1,toWei(1000));
  });
  describe('Quick Bridge', function () {

    it('Quick Bridge contract should initialize correctly', async function () {
      assert.equal(await quickBridge.MigrationController(), user4);
      assert.equal(await quickBridge.quickBridgeL2(), user5);
      assert.equal(await quickBridge.RootChainManager(), rootchainmanager.address);
      assert.equal(await quickBridge.ERC20Predicate(), erc20predicate.address);
      assert.equal(await quickBridge.authorised(), owner);
      assert.equal(await quickBridge.nativeCurrency(), nativeCurrency);
    });

    it('Authorised user should be able to add new allowed token', async function () {
      
      assert.equal(await quickBridge.tokenAllowed(token3.address), false);
      await quickBridge.addAllowedToken([token3.address]);
      assert.equal(await quickBridge.tokenAllowed(token3.address), true);

    });

    it('Authorised user should be able to remove allowed token', async function () {
      
      assert.equal(await quickBridge.tokenAllowed(token3.address), true);
      await quickBridge.removeToken(token3.address);
      assert.equal(await quickBridge.tokenAllowed(token3.address), false);

    });

    it('User should be able to migrate allowed token upon approval', async function () {
      let token1BeforeBalUser1 = await token1.balanceOf(user1);
      let token1BeforeBalContract = await token1.balanceOf(quickBridge.address);
      await token1.approve(quickBridge.address,toWei(100),{from:user1});
      await quickBridge.migrate(user2,token1.address,toWei(100),{from:user1});

      let token1AfterBalUser1 = await token1.balanceOf(user1);
      let token1AfterBalContract = await token1.balanceOf(quickBridge.address);

      assert.equal(token1BeforeBalUser1-token1AfterBalUser1,toWei(100));
      assert.equal(token1AfterBalContract-token1BeforeBalContract,toWei(100));

    });

    it('User should be able to migrate native currency upon approval', async function () {
      await quickBridge.addAllowedToken([nativeCurrency]);
      let ethBeforeBalUser1 = await web3.eth.getBalance(user1);
      let ethBeforeBalContract = await web3.eth.getBalance(quickBridge.address);
      await quickBridge.migrate(user2,nativeCurrency,toWei(10),{from:user1,value:toWei(10)});

      let ethAfterBalUser1 = await web3.eth.getBalance(user1);
      let ethAfterBalContract = await web3.eth.getBalance(quickBridge.address);

      assert.equal(Math.floor((ethAfterBalContract-ethBeforeBalContract)/1e18),10);
      assert.equal(Math.floor((ethBeforeBalUser1-ethAfterBalUser1)/1e18),10);

    });

    it('Should revert if tries to send incorrect amount of eth', async function () {
     
      await assertRevert(quickBridge.migrate(user2,nativeCurrency,2,{from:user1,value:toWei(1)}));

    });

    it('Should revert if tries to send eth while migrating erc20', async function () {
     
      await assertRevert(quickBridge.migrate(user2,token1.address,toWei(100),{from:user1,value:toWei(1)}));

    });

    it('Should revert if tries to migrate 0 tokens', async function () {
     
      await assertRevert(quickBridge.migrate(user2,token1.address,0,{from:user1}));

    });

    it('Migrator should be able to provide approval to erc20Predicate in behalf of quick bridge contract', async function () {
     let token1BeforeAllowance = await token1.allowance(quickBridge.address,erc20predicate.address);
      await quickBridge.initiateApproval(token1.address,toWei(200),{from:user4});
      let token1AfterAllowance = await token1.allowance(quickBridge.address,erc20predicate.address);
      assert.equal(token1AfterAllowance-token1BeforeAllowance,toWei(200));

    });

    it('Migrator should be able to deposit tokens to root chain manager', async function () {
      await token1.approve(quickBridge.address,toWei(100),{from:user1});
      await token2.approve(quickBridge.address,toWei(100),{from:user1});
      await plotusToken.approve(quickBridge.address,toWei(100));
      await quickBridge.migrate(user2,token1.address,toWei(100),{from:user1});
      await quickBridge.migrate(user2,token2.address,toWei(100),{from:user1});
      await quickBridge.migrate(user2,plotusToken.address,toWei(100));

      let token1BeforeBalQB = await token1.balanceOf(quickBridge.address);
      let token1BeforeBalPred = await token1.balanceOf(erc20predicate.address);
      let token2BeforeBalQB = await token2.balanceOf(quickBridge.address);
      let token2BeforeBalPred = await token2.balanceOf(erc20predicate.address);
      let plotBeforeBalQB = await plotusToken.balanceOf(quickBridge.address);
      let plotBeforeBalPred = await plotusToken.balanceOf(erc20predicate.address);
      let ethBalBeforeQB = await web3.eth.getBalance(quickBridge.address);
      let ethBalBeforepred = await web3.eth.getBalance(rootchainmanager.address);

      await quickBridge.depositFor([token1.address,token2.address,plotusToken.address,nativeCurrency],[toWei(100),toWei(100),toWei(100),toWei(3)],{from:user4});

      let token1AfterBalQB = await token1.balanceOf(quickBridge.address);
      let token1AfterBalPred = await token1.balanceOf(erc20predicate.address);
      let token2AfterBalQB = await token2.balanceOf(quickBridge.address);
      let token2AfterBalPred = await token2.balanceOf(erc20predicate.address);
      let plotAfterBalQB = await plotusToken.balanceOf(quickBridge.address);
      let plotAfterBalPred = await plotusToken.balanceOf(erc20predicate.address);
      let ethBalAfterQB = await web3.eth.getBalance(quickBridge.address);
      let ethBalAfterpred = await web3.eth.getBalance(rootchainmanager.address);

      assert.equal(token1BeforeBalQB-token1AfterBalQB,toWei(100));
      assert.equal(token1AfterBalPred-token1BeforeBalPred,toWei(100));
      assert.equal(token2BeforeBalQB-token2AfterBalQB,toWei(100));
      assert.equal(token2AfterBalPred-token2BeforeBalPred,toWei(100));
      assert.equal(plotBeforeBalQB-plotAfterBalQB,toWei(100));
      assert.equal(plotAfterBalPred-plotBeforeBalPred,toWei(100));
      assert.equal(ethBalAfterpred-ethBalBeforepred,toWei(3));
      assert.equal(ethBalBeforeQB-ethBalAfterQB,toWei(3));

    });

    it('Migrator should be able to take tokens out', async function () {
      
      await plotusToken.approve(quickBridge.address,toWei(100));
      
      await quickBridge.migrate(user2,plotusToken.address,toWei(100));

      let beforeBalQB = await plotusToken.balanceOf(quickBridge.address);
      let beforeBalU2 = await plotusToken.balanceOf(user2);

      await quickBridge.withdraw(plotusToken.address, user2, toWei(100),{from:user4});

      let afterBalQB = await plotusToken.balanceOf(quickBridge.address);
      let afterBalU2 = await plotusToken.balanceOf(user2);

      assert.equal(beforeBalQB-afterBalQB,toWei(100));
      assert.equal(afterBalU2-beforeBalU2,toWei(100));

    });

    it('Migrator should be able to take native currency out', async function () {
      
      let ethBalbeforeQB = await web3.eth.getBalance(quickBridge.address);
      let ethBalbeforeU2 = await web3.eth.getBalance(user2);
      
      await quickBridge.withdraw(nativeCurrency, user2, toWei(5),{from:user4});

      let ethBalAfterQB = await web3.eth.getBalance(quickBridge.address);
      let ethBalAfterU2 = await web3.eth.getBalance(user2);
     

      assert.equal(ethBalbeforeQB - ethBalAfterQB,toWei(5));
      assert.equal(Math.floor((ethBalAfterU2-ethBalbeforeU2)/1e18),5);

    });

    it('Authorised account should be able to change authorised account', async function () {
      assert.equal(await quickBridge.authorised(),owner);

      await quickBridge.updateAuthorisedAddress(user1);

      assert.equal(await quickBridge.authorised(),user1);
      await quickBridge.updateAuthorisedAddress(owner,{from:user1});
      assert.equal(await quickBridge.authorised(),owner);
    });



    describe('Reverts', function () {
        it('should revert if non-authorised tries to call authorised functions', async function () {
          await assertRevert(quickBridge.updateAuthorisedAddress(user2,{from:user1}));
          await assertRevert(quickBridge.addAllowedToken([],{from:user1}));
          await assertRevert(quickBridge.removeToken(user2,{from:user1}));
        });

        it('should revert if non-migrator tries to call migrator specific functions', async function () {
          await assertRevert(quickBridge.initiateApproval(token1.address,toWei(100),{from:user1}));
          await assertRevert(quickBridge.depositFor([],[],{from:user1}));
          await assertRevert(quickBridge.withdraw(token1.address,user2,toWei(100),{from:user1}));
        });

        it('should revert if tries to make null address as authorised account', async function () {
          await assertRevert(quickBridge.updateAuthorisedAddress(nullAddress));
        });

        it('should revert if tries to add null token or existing token', async function () {
          await assertRevert(quickBridge.addAllowedToken([nullAddress]));
          await assertRevert(quickBridge.addAllowedToken([token1.address]));
        });

        it('should revert if tries to remove null token or non-existing token', async function () {
          await assertRevert(quickBridge.removeToken(nullAddress));
          await assertRevert(quickBridge.removeToken(token3.address));
        });

        it('should revert if tries to migrate to null address or unallowed token', async function () {
          await assertRevert(quickBridge.migrate(nullAddress,token1.address,toWei(100)));
          await assertRevert(quickBridge.migrate(user2,token3.address,toWei(100)));
        });

        it('should revert if tries to deposit with invalid arguments', async function () {

          // Array length not same
          await assertRevert(quickBridge.depositFor([],[toWei(100)],{from:user4}));
          // tries to deposit 0 amount
          await assertRevert(quickBridge.depositFor([token1.address],[0],{from:user4}));
          // tries to deposit unallowed token
          await assertRevert(quickBridge.depositFor([token3.address],[toWei(10)],{from:user4}));
        });

        it('should revert if tries to withdraw null token or to null address or 0 amount', async function () {
          // tries to withdraw null token
          await assertRevert(quickBridge.withdraw(nullAddress,user2,toWei(10),{from:user4}));
          // tries to withdraw to null account
          await assertRevert(quickBridge.withdraw(token1.address,nullAddress,toWei(100),{from:user4}));
          // tries to withdraw 0 amount
          await assertRevert(quickBridge.withdraw(token1.address,user2,0,{from:user4}));
        });

        it('should revert if ERC20 action fails', async function () {
          // if ERC20 approval fails
          await assertRevert(quickBridge.initiateApproval(dummyToken.address,toWei(10),{from:user4}));
          // if ERC20 transfer from fails
          await assertRevert(quickBridge.migrate(user2,dummyToken.address,toWei(10),{from:user4}));
          // if ERC20 transfer fails
          await assertRevert(quickBridge.withdraw(dummyToken.address,user2,toWei(10),{from:user4}));
        });
    });
  });
});
