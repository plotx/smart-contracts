const Market  = artifacts.require('Market');
const Plotus = artifacts.require('Plotus');
const Master = artifacts.require('Master');
const web3 = Market.web3
const market = artifacts.require('Market');
const utils = require('./utils')
const BN = web3.utils.BN;
const { ether, toHex, toWei } = require('./utils/ethTools');
const { assertRevert } =  require('./utils/assertRevert');
const increaseTime = require('./utils/increaseTime.js').increaseTime;
const latestTime  = require('./utils/latestTime.js').latestTime;
const helper = require('./utils/helper.js');
var  snapShot 
var snapshotId

const ONE_DAY = 24*3600

contract('Market', function([
  user1,
  user2,
  user3,
  user4,
  user5,
  user6,
  user7,
  user8,
  user9,
  operator2,
  operator
]) {
  let MarketInstance   
    beforeEach(async () => {
    })
    it('set option price',async function(){

        let nowTime = new Date()/1000;
        nowTime = parseInt(nowTime);
        const start = nowTime/1 + 10;
        masterInstance = await Master.deployed();
        plotusNewAddress = await masterInstance.plotusAddress(); 
        plotusNewInstance = await Plotus.at(plotusNewAddress);
        const addNewMarket = await plotusNewInstance.addNewMarket([start,1,2,0,7,1000000000000000,10000,2,2,100,5,10],"firstBet","0x47",["0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567","0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567"])
        const length = addNewMarket.logs[0].args.marketAdd; 
        console.log("market",length)
        marketInstance = await Market.at(length);
        assert.ok(marketInstance);
        const addressOfMarket = marketInstance.address;


        const options1 = await marketInstance.optionsAvailable(1);
        assert.equal(options1[0]/1,0)
        assert.equal(options1[1]/1,9749)
        const options2 = await marketInstance.optionsAvailable(2);
        assert.equal(options2[0]/1,9750)
        assert.equal(options2[1]/1,9849)
        const options3 = await marketInstance.optionsAvailable(3);
        assert.equal(options3[0]/1,9850)
        assert.equal(options3[1]/1,9949)
        const options4 = await marketInstance.optionsAvailable(4);
        assert.equal(options4[0]/1,9950)
        assert.equal(options4[1]/1,10050)
        const options5 = await marketInstance.optionsAvailable(5);
        assert.equal(options5[0]/1,10051)
        assert.equal(options5[1]/1,10150)
        const options6 = await marketInstance.optionsAvailable(6);
        assert.equal(options6[0]/1,10151)
        assert.equal(options6[1]/1,10250)
        const options7 = await marketInstance.optionsAvailable(7);
        assert.equal(options7[0]/1,10251)
        assert.equal(options7[1]/1,1.157920892373162e+77)
        await marketInstance.setCurrentPrice(10215);
        await increaseTime(21600+11);
        await marketInstance.setPrice(1);
        await marketInstance.placeBet(1,{value: 0,from: user1});
        const getPrice = await marketInstance.getPrice(1);
        assert.equal(getPrice,6)
        const afterPlaceBetUser1 = await web3.eth.getBalance(user1);
        const getbrttingpoint  = await marketInstance.userBettingPoints(user1,1);
        // console.log(getbrttingpoint/1)
        // assert.equal(getbrttingpoint/1,400);
        // const getprice
  
        await marketInstance.setPrice(2);
        // assert.equal(getPrice1/1,20);
        // await marketInstance.placeBet(2,{value: 0,from: user2});
        const getPrice1 = await marketInstance.getPrice(2);
        assert.equal(getPrice1,13)
        const getbrttingpoint1 = await marketInstance.userBettingPoints(user2,2);
        // assert.equal(getbrttingpoint1/1,300);
  
        await marketInstance.setPrice(3);
        // assert.equal(getPrice2/1,30);
        // await marketInstance.placeBet(3,{value: 0,from: user3});
        const getPrice2 = await marketInstance.getPrice(3);
        assert.equal(getPrice2,20)
        const getbrttingpoint2 = await marketInstance.userBettingPoints(user3,3);
        // assert.equal(getbrttingpoint2/1,66);
  
        await marketInstance.setPrice(4);
        // assert.equal(getPrice3/1,40);
        // await marketInstance.placeBet(4,{value: 0,from: user4});
        const getPrice3 = await marketInstance.getPrice(4);
        assert.equal(getPrice3,27)
        const getbrttingpoint3 = await marketInstance.userBettingPoints(user4,4);
        // assert.equal(getbrttingpoint3/1,100);
  
        await marketInstance.setPrice(5);
        // assert.equal(getPrice4/1,50);
        // await marketInstance.placeBet(1,{value: 0,from: user5});
        const getPrice4 = await marketInstance.getPrice(5);
        assert.equal(getPrice4,34)
        const getbrttingpoint4 = await marketInstance.userBettingPoints(user5,5);
        // assert.equal(getbrttingpoint4/1,60);
  
        await marketInstance.setPrice(6);
        const getPrice5 = await marketInstance.getPrice(6);
        assert.equal(getPrice5,41)
        const getbrttingpoint5 = await marketInstance.userBettingPoints(user6,6);
        await marketInstance.setPrice(7);

        const getbrttingpoint6 = await marketInstance.userBettingPoints(user7,7);
        const getPrice6 = await marketInstance.getPrice(7);
        assert.equal(getPrice6,34)
    })

    it('1. place bet from nine users with 2% commision and 2% donation',async function(){

        let nowTime = await latestTime();
        nowTime = parseInt(nowTime);
        const start = nowTime/1 + 10;
        masterInstance = await Master.deployed();
        plotusNewAddress = await masterInstance.plotusAddress(); 
        plotusNewInstance = await Plotus.at(plotusNewAddress);
        const addNewMarket = await plotusNewInstance.addNewMarket([start,1,2,0,7,1000000000000000,10000,2,2,100,5,10],"firstBet","0x47",["0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567","0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567"])
        const length = addNewMarket.logs[0].args.marketAdd; 
        console.log("market",length)
        marketInstance = await Market.at(length);
        assert.ok(marketInstance);
        const addressOfMarket = marketInstance.address;
        const options1 = await marketInstance.optionsAvailable(1);
        assert.equal(options1[0]/1,0)
        assert.equal(options1[1]/1,9749)
        const options2 = await marketInstance.optionsAvailable(2);
        assert.equal(options2[0]/1,9750)
        assert.equal(options2[1]/1,9849)
        const options3 = await marketInstance.optionsAvailable(3);
        assert.equal(options3[0]/1,9850)
        assert.equal(options3[1]/1,9949)
        const options4 = await marketInstance.optionsAvailable(4);
        assert.equal(options4[0]/1,9950)
        assert.equal(options4[1]/1,10050)
        const options5 = await marketInstance.optionsAvailable(5);
        assert.equal(options5[0]/1,10051)
        assert.equal(options5[1]/1,10150)
        const options6 = await marketInstance.optionsAvailable(6);
        assert.equal(options6[0]/1,10151)
        assert.equal(options6[1]/1,10250)
        const options7 = await marketInstance.optionsAvailable(7);
        assert.equal(options7[0]/1,10251)
        assert.equal(options7[1]/1,1.157920892373162e+77)
        await marketInstance.setCurrentPrice(10215);
        await increaseTime(21600+11);
        // const print = await marketInstance._getDistance(1);
        await marketInstance.setPrice(1);
        const getPrice0 = await marketInstance.getPrice(1);
        assert.equal(getPrice0/1,6)
        const user1BalanceBeforeBet = await web3.eth.getBalance(user1)
        await marketInstance.placeBet(1,{value: 4e18,from: user1});
        const user1BalanceAfterBet = await web3.eth.getBalance(user1)
        const getPrice = await marketInstance.getPrice(1);
        assert.equal(getPrice,6)
        const afterPlaceBetUser1 = await web3.eth.getBalance(user1);
        const getbrttingpoint  = await marketInstance.userBettingPoints(user1,1);
        assert.equal(getbrttingpoint/1,666);
        // const getprice
  
        await marketInstance.setPrice(2);
        const getPrice11 = await marketInstance.getPrice(2);
        assert.equal(getPrice11/1,13)
        await marketInstance.placeBet(2,{value: 6e18,from: user2});
        const getPrice1 = await marketInstance.getPrice(2);
        assert.equal(getPrice1,13)
        const getbrttingpoint1 = await marketInstance.userBettingPoints(user2,2);
        assert.equal(getbrttingpoint1/1,461);
  
        await marketInstance.setPrice(3);
        const getPrice21 = await marketInstance.getPrice(3);
        assert.equal(getPrice21/1,20)
        await marketInstance.placeBet(3,{value: 2e18,from: user3});
        const getPrice2 = await marketInstance.getPrice(3);
        assert.equal(getPrice2,20)
        const getbrttingpoint2 = await marketInstance.userBettingPoints(user3,3);
        assert.equal(getbrttingpoint2/1,100);
  
        await marketInstance.setPrice(4);
        const getPrice31 = await marketInstance.getPrice(4);
        assert.equal(getPrice31/1,27)
        await marketInstance.placeBet(4,{value: 1e19,from: user4});
        const getPrice3 = await marketInstance.getPrice(4);
        assert.equal(getPrice3/1,141)
        const getbrttingpoint3 = await marketInstance.userBettingPoints(user4,4);
        assert.equal(getbrttingpoint3/1,370);
  
        await marketInstance.setPrice(1);
        const getPrice14 = await marketInstance.getPrice(1);
        assert.equal(getPrice14,52)
        await marketInstance.placeBet(1,{value: 3e18,from: user5});
        const getPrice4 = await marketInstance.getPrice(1);
        assert.equal(getPrice4/1,76)//52
        // const afterPlaceBetUser1 = await web3.eth.getBalance(user5);
        const getbrttingpoint4  = await marketInstance.userBettingPoints(user5,1);
        assert.equal(getbrttingpoint4/1,57);
  
        await marketInstance.setPrice(2);
        const getPrice51 = await marketInstance.getPrice(2);
        assert.equal(getPrice51/1,73)
        await marketInstance.placeBet(2,{value: 2e18,from: user6});
        const getPrice5 = await marketInstance.getPrice(2);
        assert.equal(getPrice5,87)//73
        const getbrttingpoint5 = await marketInstance.userBettingPoints(user6,2);
        assert.equal(getbrttingpoint5/1,27);
  
        await marketInstance.setPrice(5);
        const getPrice61 = await marketInstance.getPrice(5);
        assert.equal(getPrice61/1,34)
        await marketInstance.placeBet(5,{value: 5e18,from: user7});
        const getPrice62 = await marketInstance.getPrice(5);
        assert.equal(getPrice62/1,73)
        const getbrttingpoint6 = await marketInstance.userBettingPoints(user7,5);
        assert.equal(getbrttingpoint6/1,147);
  
        await marketInstance.setPrice(6);
        const getPrice71 = await marketInstance.getPrice(6);
        assert.equal(getPrice71/1,41)
        await marketInstance.placeBet(6,{value: 5e18,from: user8});
        const getPrice7 = await marketInstance.getPrice(6);
        assert.equal(getPrice7/1,75)
        const getbrttingpoint7 = await marketInstance.userBettingPoints(user8,6);
        assert.equal(getbrttingpoint7/1,121);
  
        await marketInstance.setPrice(7);
        const getPrice81 = await marketInstance.getPrice(7);
        assert.equal(getPrice81/1,34)
        await marketInstance.placeBet(7,{value: 7e18,from: user9}); 
        const getPrice8 = await marketInstance.getPrice(7);
        assert.equal(getPrice8/1,74);
        const getbrttingpoint8 = await marketInstance.userBettingPoints(user9,7);
        assert.equal(getbrttingpoint8/1,205);


        const ClaimDonation = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567")
        console.log(ClaimDonation/1);
        await increaseTime(64810);
        await marketInstance._closeBet(100);
        // const check = await marketInstance.getReward(user1);
        const ClaimDonation1 = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567")
        console.log((ClaimDonation1/1)/1e18);
        assert.equal(ClaimDonation1/1,ClaimDonation/1+1.48e+18);
        const beforeClaimUser1 = await web3.eth.getBalance(user1);
        console.log("user1 balance after  anf before claimReward",(beforeClaimUser1/1)/1e18.toFixed(0));
        // const rew1 = await marketInstance._rew();
        // console.log("rew",rew1/1)
        // const maxReturn = await marketInstance.maxReturn()
        // console.log(maxReturn/1)
        // const rew12 = await marketInstance.maxReturnCap();
        // console.log("maxReturnCap",rew12/1)
        await marketInstance.claimReward({from: user1});
        // const rew11 = await marketInstance._rew();
        // console.log("rew",rew11/1)
        // const rew121 = await marketInstance.maxReturnCap();
        // console.log("maxReturnCap",rew121/1)

        // // const check = await marketInstance.getReward(user1);
        // //    // const tx = await web3.eth.getTransaction(txInfo.tx);
        // // const gasCost1 = tx.gasPrice * txInfo.receipt.gasUsed;
        // // ce",(gasCost1/1)/1e18);
        const afterClaimUser1 = await web3.eth.getBalance(user1);
        console.log("user1 balance after claimReward",(afterClaimUser1/1)/1e18.toFixed(0));
        // assert.equal(((afterClaimUser1)/1e18).toFixed(2),(((beforeClaimUser1)/1e18)/1+29.87826087-0.00108296).toFixed(2))
        // // 0.00107126
        // // 0.00107082
        // // 0.00148998
        // // 29.87826087
        // // 29.8771896096
        // // 0.00149532 //0.00108296
        // // let num1 = (afterClaimUser1/1)/1e+18;
        // // let num = ((beforeClaimUser1/1)/1e18)/1+29.87826087-.00149532;
        // // assert.equal(num1.toFixed(8),num.toFixed(8));
  
  
        const beforeClaimUser5 = await web3.eth.getBalance(user5);
        const txInfo = await marketInstance.claimReward({from: user5});
        console.log("user5 balance after claimReward",(beforeClaimUser5/1)/1e18.toFixed(0));
        // // const tx = await web3.eth.getTransaction(txInfo.tx);
        // // const gasCost1 = tx.gasPrice * txInfo.receipt.gasUsed;
        // // ce",(gasCost1/1)/1e18);
        const afterClaimUser5 = await web3.eth.getBalance(user5);
        console.log("user5 balance after claimReward",(afterClaimUser5/1)/1e18.toFixed(0));
        // // gas limit 0.00107126
        // // 00118998
        // // it should be add this ammount 7.043478261
        // // 7.04240700087 but it adding this
        // // let num2 = (afterClaimUser5/1)/1e+18;
        // // let num3 = ((beforeClaimUser5/1)/1e18)/1+6.88173913-0.00119532;
        // // assert.equal(num2.toFixed(8),num3.toFixed(8));
        // assert.equal(((afterClaimUser5)/1e18).toFixed(2),(((beforeClaimUser5)/1e18)/1+6.88173913-0.00108296).toFixed(2))
    })

    // // 1 test case for when  option 1 win and only 2 user bet on same option with 0% commission and donation.
    // it('1. place bet from nine users with 2% commision and 2% donation',async function() {

    //   await marketInstance.setPrice(1,10);
    //   const getPrice = await marketInstance.getPrice(1);
    //   assert.equal(getPrice/1,10);

    //   await marketInstance.placeBet(1,{value: 4000000000000000000,from: user1});
    //   const afterPlaceBetUser1 = await web3.eth.getBalance(user1);
    //   const getbrttingpoint  = await marketInstance.userBettingPoints(user1,1);
    //   assert.equal(getbrttingpoint/1,400);

    //   await marketInstance.setPrice(2,20);
    //   const getPrice1 = await marketInstance.getPrice(2);
    //   assert.equal(getPrice1/1,20);
    //   await marketInstance.placeBet(2,{value: 6000000000000000000,from: user2});
    //   const getbrttingpoint1 = await marketInstance.userBettingPoints(user2,2);
    //   assert.equal(getbrttingpoint1/1,300);

    //   await marketInstance.setPrice(3,30);
    //   const getPrice2 = await marketInstance.getPrice(3);
    //   assert.equal(getPrice2/1,30);
    //   await marketInstance.placeBet(3,{value: 2000000000000000000,from: user3});
    //   const getbrttingpoint2 = await marketInstance.userBettingPoints(user3,3);
    //   assert.equal(getbrttingpoint2/1,66);

    //   await marketInstance.setPrice(4,40);
    //   const getPrice3 = await marketInstance.getPrice(4);
    //   assert.equal(getPrice3/1,40);
    //   await marketInstance.placeBet(4,{value: 4000000000000000000,from: user4});
    //   const getbrttingpoint3 = await marketInstance.userBettingPoints(user4,4);
    //   assert.equal(getbrttingpoint3/1,100);

    //   await marketInstance.setPrice(1,50);
    //   const getPrice4 = await marketInstance.getPrice(1);
    //   assert.equal(getPrice4/1,50);
    //   await marketInstance.placeBet(1,{value: 3000000000000000000,from: user5});
    //   const getbrttingpoint4 = await marketInstance.userBettingPoints(user5,1);
    //   assert.equal(getbrttingpoint4/1,60);

    //   await marketInstance.setPrice(2,20);
    //   const getPrice5 = await marketInstance.getPrice(2);
    //   assert.equal(getPrice5/1,20);
    //   await marketInstance.placeBet(2,{value: 2000000000000000000,from: user6});
    //   const getbrttingpoint5 = await marketInstance.userBettingPoints(user6,2);
    //   assert.equal(getbrttingpoint5/1,100);

    //   await marketInstance.setPrice(5,30);
    //   const getPrice6 = await marketInstance.getPrice(5);
    //   assert.equal(getPrice6/1,30);
    //   await marketInstance.placeBet(5,{value: 5000000000000000000,from: user7});
    //   const getbrttingpoint6 = await marketInstance.userBettingPoints(user7,5);
    //   assert.equal(getbrttingpoint6/1,166);

    //   await marketInstance.setPrice(6,20);
    //   const getPrice7 = await marketInstance.getPrice(6);
    //   assert.equal(getPrice7/1,20);
    //   await marketInstance.placeBet(6,{value: 5000000000000000000,from: user8});
    //   const getbrttingpoint7 = await marketInstance.userBettingPoints(user8,6);
    //   assert.equal(getbrttingpoint7/1,250);

    //   await marketInstance.setPrice(7,50);
    //   const getPrice8= await marketInstance.getPrice(7);
    //   assert.equal(getPrice8/1,50);
    //   await marketInstance.placeBet(7,{value: 7000000000000000000,from: user9}); 
    //   const getbrttingpoint8 = await marketInstance.userBettingPoints(user9,7);   
    //   assert.equal(getbrttingpoint8/1,140);
    //   const ClaimDonation = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567")

    //   // await increaseTime(310);
    //   await increaseTime(3610);
    //   await marketInstance._closeBet(100);
    //   const check = await marketInstance.getReward(user1);
    //        const ClaimDonation1 = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567")
    //   assert.equal(ClaimDonation1/1,ClaimDonation/1+1.24e+18)
     
    //   const beforeClaimUser1 = await web3.eth.getBalance(user1);
      
    //   await marketInstance.claimReward({from: user1});
    //   // const check = await marketInstance.getReward(user1);
    //   //    // const tx = await web3.eth.getTransaction(txInfo.tx);
    //   // const gasCost1 = tx.gasPrice * txInfo.receipt.gasUsed;
    //   // ce",(gasCost1/1)/1e18);
    //   const afterClaimUser1 = await web3.eth.getBalance(user1);
    //   assert.equal(((afterClaimUser1)/1e18).toFixed(2),(((beforeClaimUser1)/1e18)/1+29.87826087-0.00108296).toFixed(2))
    //   // 0.00107126
    //   // 0.00107082
    //   // 0.00148998
    //   // 29.87826087
    //   // 29.8771896096
    //   // 0.00149532 //0.00108296
    //   // let num1 = (afterClaimUser1/1)/1e+18;
    //   // let num = ((beforeClaimUser1/1)/1e18)/1+29.87826087-.00149532;
    //   // assert.equal(num1.toFixed(8),num.toFixed(8));


    //   const beforeClaimUser5 = await web3.eth.getBalance(user5);
    //   const txInfo = await marketInstance.claimReward({from: user5});
    //   // const tx = await web3.eth.getTransaction(txInfo.tx);
    //   // const gasCost1 = tx.gasPrice * txInfo.receipt.gasUsed;
    //   // ce",(gasCost1/1)/1e18);
    //   const afterClaimUser5 = await web3.eth.getBalance(user5);
    //   // gas limit 0.00107126
    //   // 00118998
    //   // it should be add this ammount 7.043478261
    //   // 7.04240700087 but it adding this
    //   // let num2 = (afterClaimUser5/1)/1e+18;
    //   // let num3 = ((beforeClaimUser5/1)/1e18)/1+6.88173913-0.00119532;
    //   // assert.equal(num2.toFixed(8),num3.toFixed(8));
    //   assert.equal(((afterClaimUser5)/1e18).toFixed(2),(((beforeClaimUser5)/1e18)/1+6.88173913-0.00108296).toFixed(2))
    // })

    // // // 2 test case for when  option 1 win and only 2 user bet on same option with 0% commision and 0% donation 
    // it('2. place bet from nine users with 0% commision and 0% Donation',async function(){

    //   //  latestTime())
    //   let nowTime = await latestTime();
    //   nowTime = parseInt(nowTime);
    //   let thenTime = new BN(((nowTime/1+(86400)).toString()));
    //   const start = nowTime/1
    //   const end = thenTime/1
    //   masterInstance = await Master.deployed();
    //   plotusNewAddress = await masterInstance.plotusAddress();
      
    //   plotusNewInstance = await Plotus.at(plotusNewAddress);
    //   const addNewMarket = await plotusNewInstance.addNewMarket([start,end,2,2,1,7,1000000000000000,10000,0,0,100],"secondBet","0x47",["0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567","0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567"])
    //   const length = await plotusNewInstance.getAllMarketsLen(); 
      
    //   const markets = await plotusNewInstance.allMarkets(length-1);

    //   marketInstance3 = await Market.at(markets);
    //   assert.ok(marketInstance3);
    //   const addressOfMarket = marketInstance3.address;
    //   const marketName = await marketInstance3.FeedSource();
      
    //   await marketInstance3.setPrice(1,10);
    //   const getPrice = await marketInstance3.getPrice(1);
    //   assert.equal(getPrice/1,10);

    //   await marketInstance3.placeBet(1,{value: 4000000000000000000,from: user1});
    //   const afterPlaceBetUser1 = await web3.eth.getBalance(user1);
    //   const getbrttingpoint  = await marketInstance3.userBettingPoints(user1,1);
    //   assert.equal(getbrttingpoint/1,400);

    //   await marketInstance3.setPrice(2,20);
    //   const getPrice1 = await marketInstance3.getPrice(2);
    //   assert.equal(getPrice1/1,20);
    //   await marketInstance3.placeBet(2,{value: 6000000000000000000,from: user2});
    //   const getbrttingpoint1 = await marketInstance3.userBettingPoints(user2,2);
    //   assert.equal(getbrttingpoint1/1,300);

    //   await marketInstance3.setPrice(3,30);
    //   const getPrice2 = await marketInstance3.getPrice(3);
    //   assert.equal(getPrice2/1,30);
    //   await marketInstance3.placeBet(3,{value: 2000000000000000000,from: user3});
    //   const getbrttingpoint2 = await marketInstance3.userBettingPoints(user3,3);
    //   assert.equal(getbrttingpoint2/1,66);

    //   await marketInstance3.setPrice(4,40);
    //   const getPrice3 = await marketInstance3.getPrice(4);
    //   assert.equal(getPrice3/1,40);
    //   await marketInstance3.placeBet(4,{value: 4000000000000000000,from: user4});
    //   const getbrttingpoint3 = await marketInstance3.userBettingPoints(user4,4);
    //   assert.equal(getbrttingpoint3/1,100);

    //   await marketInstance3.setPrice(1,50);
    //   const getPrice4 = await marketInstance3.getPrice(1);
    //   assert.equal(getPrice4/1,50);
    //   await marketInstance3.placeBet(1,{value: 3000000000000000000,from: user5});
    //   const getbrttingpoint4 = await marketInstance3.userBettingPoints(user5,1);
    //   assert.equal(getbrttingpoint4/1,60);

    //   await marketInstance3.setPrice(2,20);
    //   const getPrice5 = await marketInstance3.getPrice(2);
    //   assert.equal(getPrice5/1,20);
    //   await marketInstance3.placeBet(2,{value: 2000000000000000000,from: user6});
    //   const getbrttingpoint5 = await marketInstance3.userBettingPoints(user6,2);
    //   assert.equal(getbrttingpoint5/1,100);

    //   await marketInstance3.setPrice(5,30);
    //   const getPrice6 = await marketInstance3.getPrice(5);
    //   assert.equal(getPrice6/1,30);
    //   await marketInstance3.placeBet(5,{value: 5000000000000000000,from: user7});
    //   const getbrttingpoint6 = await marketInstance3.userBettingPoints(user7,5);
    //   assert.equal(getbrttingpoint6/1,166);

    //   await marketInstance3.setPrice(6,20);
    //   const getPrice7 = await marketInstance3.getPrice(6);
    //   assert.equal(getPrice7/1,20);
    //   await marketInstance3.placeBet(6,{value: 5000000000000000000,from: user8});
    //   const getbrttingpoint7 = await marketInstance3.userBettingPoints(user8,6);
    //   assert.equal(getbrttingpoint7/1,250);

    //   await marketInstance3.setPrice(7,50);
    //   const getPrice8= await marketInstance3.getPrice(7);
    //   assert.equal(getPrice8/1,50);
    //   await marketInstance3.placeBet(7,{value: 7000000000000000000,from: user9}); 
    //   const getbrttingpoint8 = await marketInstance3.userBettingPoints(user9,7);   
    //   assert.equal(getbrttingpoint8/1,140);
    //   const ClaimDonation = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567")
      
    //   const commision = await marketInstance3.commision()
   
    //   const commision12 = await marketInstance3.commissionPerc()
      
    //   await increaseTime(86410);
    //   await marketInstance3._closeBet(100);
    //   const commision1 = await marketInstance3.commision()
     
    //   const ClaimDonation1 = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567")
    //   assert.equal(ClaimDonation1/1,ClaimDonation/1)
     
    //   const beforeClaimUser1 = await web3.eth.getBalance(user1);
    //   await marketInstance3.claimReward({from: user1});
    //   const afterClaimUser1 = await web3.eth.getBalance(user1);
    //   // user1 balance before close bet 95.83785637999999
    //   // user1 balance after  close bet 126.79330685913044
    //   // 30.95652174 difference should be this 
    //   // 30.9554504791 but it coming this
    //   //  taking gas limit to performing this task 0.00107126
    //   // 0.00107082
    //   //0.00107126 now 
    //   // 0.00149532
    //   // let num1 = (afterClaimUser1/1)/1e+18;
    //   // let num = ((beforeClaimUser1/1)/1e18)/1+30.95652174-0.00149532
    //   assert.equal(((afterClaimUser1)/1e18).toFixed(2),(((beforeClaimUser1)/1e18)/1+30.95652174-0.00149532).toFixed(2))
    //   const beforeClaimUser5 = await web3.eth.getBalance(user5);
    //   await marketInstance3.claimReward({from: user5});
    //   // 0.00107126
    //   const afterClaimUser5 = await web3.eth.getBalance(user5);
    //   // user5 balance before close bet 96.99844780000001
    //   // user5 balance after  close bet 104.04085480086957
    //   // it should be add this ammount 7.043478261
    //   // 7.04240700087 but it adding this
    //   // let num2 = (afterClaimUser5/1)/1e+18;
    //   // let num3 = ((beforeClaimUser5/1)/1e18)/1+7.043478261- 0.00119532;
    //   // assert.equal(num2.toFixed(8),num3.toFixed(8));
    //   assert.equal(((afterClaimUser5)/1e18).toFixed(2),(((beforeClaimUser5)/1e18)/1+7.043478261- 0.00119532).toFixed(2))
    // })

    // // 3 test case when all users bet on option 1 and all wins but the pool have zero balance. users will have own ether.
    // it('3. place bet from nine users with  and all users are correct. but pool have zero balance',async function(){

      
    //   let nowTime = await latestTime();
    //   nowTime = parseInt(nowTime);
    //   let thenTime = new BN(((nowTime/1+(604800)).toString()));
    //   const start = nowTime/1
    //   const end = thenTime/1
    //   masterInstance = await Master.deployed();
    //   plotusNewAddress = await masterInstance.plotusAddress();
      
    //   plotusNewInstance = await Plotus.at(plotusNewAddress);
    //   const addNewMarket = await plotusNewInstance.addNewMarket([start,end,3,2,1,7,1000000000000000,10000,0,0,100],"firstBet","0x47",["0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567","0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567"])
    //   const length = await plotusNewInstance.getAllMarketsLen(); 
      
    //   const markets = await plotusNewInstance.allMarkets(length-1);
     
    //   marketInstance4 = await Market.at(markets);
    //   assert.ok(marketInstance4);
    //   const addressOfMarket = marketInstance4.address;
      

    //   await marketInstance4.setPrice(2,10);
    //   const getPrice = await marketInstance4.getPrice(2);
    //   assert.equal(getPrice/1,10);

    //   await marketInstance4.placeBet(2,{value: 4000000000000000000,from: user1});
    //   const afterPlaceBetUser1 = await web3.eth.getBalance(user1);
    //   const getbrttingpoint  = await marketInstance4.userBettingPoints(user1,2);
    //   assert.equal(getbrttingpoint/1,400);

    //   await marketInstance4.setPrice(2,20);
    //   const getPrice1 = await marketInstance4.getPrice(2);
    //   assert.equal(getPrice1/1,20);
    //   await marketInstance4.placeBet(2,{value: 6000000000000000000,from: user2});
    //   const getbrttingpoint1 = await marketInstance4.userBettingPoints(user2,2);
    //   assert.equal(getbrttingpoint1/1,300);

    //   await marketInstance4.setPrice(2,30);
    //   const getPrice2 = await marketInstance4.getPrice(2);
    //   assert.equal(getPrice2/1,30);
    //   await marketInstance4.placeBet(2,{value: 2000000000000000000,from: user3});
    //   const getbrttingpoint2 = await marketInstance4.userBettingPoints(user3,2);
    //   assert.equal(getbrttingpoint2/1,66);

    //   await marketInstance4.setPrice(2,40);
    //   const getPrice3 = await marketInstance4.getPrice(2);
    //   assert.equal(getPrice3/1,40);
    //   await marketInstance4.placeBet(2,{value: 4000000000000000000,from: user4});
    //   const getbrttingpoint3 = await marketInstance4.userBettingPoints(user4,2);
    //   assert.equal(getbrttingpoint3/1,100);

    //   await marketInstance4.setPrice(2,50);
    //   const getPrice4 = await marketInstance4.getPrice(2);
    //   assert.equal(getPrice4/1,50);
    //   await marketInstance4.placeBet(2,{value: 3000000000000000000,from: user5});
    //   const getbrttingpoint4 = await marketInstance4.userBettingPoints(user5,2);
    //   assert.equal(getbrttingpoint4/1,60);

    //   await marketInstance4.setPrice(2,20);
    //   const getPrice5 = await marketInstance4.getPrice(2);
    //   assert.equal(getPrice5/1,20);
    //   await marketInstance4.placeBet(2,{value: 2000000000000000000,from: user6});
    //   const getbrttingpoint5 = await marketInstance4.userBettingPoints(user6,2);
    //   assert.equal(getbrttingpoint5/1,100);

    //   await marketInstance4.setPrice(2,30);
    //   const getPrice6 = await marketInstance4.getPrice(2);
    //   assert.equal(getPrice6/1,30);
    //   await marketInstance4.placeBet(2,{value: 5000000000000000000,from: user7});
    //   const getbrttingpoint6 = await marketInstance4.userBettingPoints(user7,2);
    //   assert.equal(getbrttingpoint6/1,166);

    //   await marketInstance4.setPrice(2,20);
    //   const getPrice7 = await marketInstance4.getPrice(2);
    //   assert.equal(getPrice7/1,20);
    //   await marketInstance4.placeBet(2,{value: 5000000000000000000,from: user8});
    //   const getbrttingpoint7 = await marketInstance4.userBettingPoints(user8,2);
    //   assert.equal(getbrttingpoint7/1,250);

    //   await marketInstance4.setPrice(2,50);
    //   const getPrice8= await marketInstance4.getPrice(2);
    //   assert.equal(getPrice8/1,50);
    //   await marketInstance4.placeBet(2,{value: 7000000000000000000,from: user9}); 
    //   const getbrttingpoint8 = await marketInstance4.userBettingPoints(user9,2);   
    //   assert.equal(getbrttingpoint8/1,140);

    //   const balanceOfPool = await web3.eth.getBalance(addressOfMarket)
    //   const ClaimDonation = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567");
    //   const cbal1 = await marketInstance4.cBal();
    //   await increaseTime(604810);
    //   await marketInstance4._closeBet(9760);

    //   const optionTwoWinning11 = await marketInstance4.WinningOption();
    //   assert.equal(optionTwoWinning11/1,2)
    //   const ClaimDonation1 = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567");
    //   assert.equal(ClaimDonation1/1,ClaimDonation/1); 

    //   const balanceOfPoolAfterCliam = await web3.eth.getBalance(addressOfMarket)
    //   assert.equal(balanceOfPoolAfterCliam/1,(balanceOfPool/1));
    //   const beforeClaimUser1 = await web3.eth.getBalance(user1);
    //   // await marketInstance.claimReward({from: user1});
    //   await marketInstance4.claimReward({from: user1});
    //   // .0020087 
    //   const afterClaimUser1 = await web3.eth.getBalance(user1);
    //   assert.equal(((afterClaimUser1)/1e18).toFixed(2),(((beforeClaimUser1)/1e18)/1+4-.0020087).toFixed(2))

    //   const beforeClaimUser2 = await web3.eth.getBalance(user2);
    //   await marketInstance4.claimReward({from: user2}); 
    //   // 0.00117928
    //   const afterClaimUser2 = await web3.eth.getBalance(user2);
    //   assert.equal(((afterClaimUser2)/1e18).toFixed(2),(((beforeClaimUser2)/1e18)/1+6-0.0014087).toFixed(2))

    //   const beforeClaimUser3 = await web3.eth.getBalance(user3);
    //   await marketInstance4.claimReward({from: user3});
    //   const afterClaimUser3 = await web3.eth.getBalance(user3);
    //   assert.equal(((afterClaimUser3)/1e18).toFixed(2),(((beforeClaimUser3)/1e18)/1+2-0.0014087).toFixed(2))

    //   const beforeClaimUser4 = await web3.eth.getBalance(user4);
    //   await marketInstance4.claimReward({from: user4});
    //   const afterClaimUser4 = await web3.eth.getBalance(user4);
    //   assert.equal(((afterClaimUser4)/1e18).toFixed(2),(((beforeClaimUser4)/1e18)/1+4-0.0014087).toFixed(2))
      
    //   const beforeClaimUser5 = await web3.eth.getBalance(user5);
    //   await marketInstance4.claimReward({from: user5});
    //   const afterClaimUser5 = await web3.eth.getBalance(user5);
    //   assert.equal(((afterClaimUser5)/1e18).toFixed(2),(((beforeClaimUser5)/1e18)/1+3-0.0014087).toFixed(2))
      
    //   const beforeClaimUser6 = await web3.eth.getBalance(user6);
    //   await marketInstance4.claimReward({from: user6});
    //   const afterClaimUser6 = await web3.eth.getBalance(user6);
    //   assert.equal(((afterClaimUser6)/1e18).toFixed(2),(((beforeClaimUser6)/1e18)/1+2-0.0014087).toFixed(2))
      
    //   const beforeClaimUser7 = await web3.eth.getBalance(user7);
    //   await marketInstance4.claimReward({from: user7});
    //   const afterClaimUser7 = await web3.eth.getBalance(user7);
    //   assert.equal(((afterClaimUser7)/1e18).toFixed(2),(((beforeClaimUser7)/1e18)/1+5-0.0014087).toFixed(2))
      
    //   const beforeClaimUser8 = await web3.eth.getBalance(user8);
    //   await marketInstance4.claimReward({from: user8});
    //   const afterClaimUser8 = await web3.eth.getBalance(user8);
    //   assert.equal(((afterClaimUser8)/1e18).toFixed(2),(((beforeClaimUser8)/1e18)/1+5-0.0014087).toFixed(2))

    //   const beforeClaimUser9 = await web3.eth.getBalance(user9);
    //   await marketInstance4.claimReward({from: user9});
    //   const afterClaimUser9 = await web3.eth.getBalance(user9);
    //   assert.equal(((afterClaimUser9)/1e18).toFixed(2),(((beforeClaimUser9)/1e18)/1+7-0.0014087).toFixed(2))
    // })

    // // 4 test case for when all users place bet on option 2 and option 1 wins. with 2% Donation and 2% Commision 
    // it('4. place bet from nine users with 2% commision and donation and all are wrong.',async function(){

      
    //   let nowTime = await latestTime();
    //   nowTime = parseInt(nowTime);
    //   let thenTime = new BN(((nowTime/1+(600)).toString()));
    //   const start = nowTime/1
    //   const end = thenTime/1
    //   masterInstance = await Master.deployed();
    //   plotusNewAddress = await masterInstance.plotusAddress();
      
    //   plotusNewInstance = await Plotus.at(plotusNewAddress);
    //   const addNewMarket = await plotusNewInstance.addNewMarket([start,end,1,2,1,7,1000000000000000,10000,2,2,100],"firstBet","0x47",["0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567","0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567"])
    //   const length = await plotusNewInstance.getAllMarketsLen(); 
      
    //   const markets = await plotusNewInstance.allMarkets(length-1);
      
    //   marketInstance1 = await Market.at(markets);
    //   assert.ok(marketInstance1);
    //   const addressOfMarket = marketInstance1.address;
     

    //   await marketInstance1.setPrice(2,10);
    //   const getPrice = await marketInstance1.getPrice(2);
    //   assert.equal(getPrice/1,10);

    //   await marketInstance1.placeBet(2,{value: 4000000000000000000,from: user1});
    //   const afterPlaceBetUser1 = await web3.eth.getBalance(user1);
    //   const getbrttingpoint  = await marketInstance1.userBettingPoints(user1,2);
    //   assert.equal(getbrttingpoint/1,400);

    //   await marketInstance1.setPrice(2,20);
    //   const getPrice1 = await marketInstance1.getPrice(2);
    //   assert.equal(getPrice1/1,20);
    //   await marketInstance1.placeBet(2,{value: 6000000000000000000,from: user2});
    //   const getbrttingpoint1 = await marketInstance1.userBettingPoints(user2,2);
    //   assert.equal(getbrttingpoint1/1,300);

    //   await marketInstance1.setPrice(2,30);
    //   const getPrice2 = await marketInstance1.getPrice(2);
    //   assert.equal(getPrice2/1,30);
    //   await marketInstance1.placeBet(2,{value: 2000000000000000000,from: user3});
    //   const getbrttingpoint2 = await marketInstance1.userBettingPoints(user3,2);
    //   assert.equal(getbrttingpoint2/1,66);

    //   await marketInstance1.setPrice(2,40);
    //   const getPrice3 = await marketInstance1.getPrice(2);
    //   assert.equal(getPrice3/1,40);
    //   await marketInstance1.placeBet(2,{value: 4000000000000000000,from: user4});
    //   const getbrttingpoint3 = await marketInstance1.userBettingPoints(user4,2);
    //   assert.equal(getbrttingpoint3/1,100);

    //   await marketInstance1.setPrice(2,50);
    //   const getPrice4 = await marketInstance1.getPrice(2);
    //   assert.equal(getPrice4/1,50);
    //   await marketInstance1.placeBet(2,{value: 3000000000000000000,from: user5});
    //   const getbrttingpoint4 = await marketInstance1.userBettingPoints(user5,2);
    //   assert.equal(getbrttingpoint4/1,60);

    //   await marketInstance1.setPrice(2,20);
    //   const getPrice5 = await marketInstance1.getPrice(2);
    //   assert.equal(getPrice5/1,20);
    //   await marketInstance1.placeBet(2,{value: 2000000000000000000,from: user6});
    //   const getbrttingpoint5 = await marketInstance1.userBettingPoints(user6,2);
    //   assert.equal(getbrttingpoint5/1,100);

    //   await marketInstance1.setPrice(2,30);
    //   const getPrice6 = await marketInstance1.getPrice(2);
    //   assert.equal(getPrice6/1,30);
    //   await marketInstance1.placeBet(2,{value: 5000000000000000000,from: user7});
    //   const getbrttingpoint6 = await marketInstance1.userBettingPoints(user7,2);
    //   assert.equal(getbrttingpoint6/1,166);

    //   await marketInstance1.setPrice(2,20);
    //   const getPrice7 = await marketInstance1.getPrice(2);
    //   assert.equal(getPrice7/1,20);
    //   await marketInstance1.placeBet(2,{value: 5000000000000000000,from: user8});
    //   const getbrttingpoint7 = await marketInstance1.userBettingPoints(user8,2);
    //   assert.equal(getbrttingpoint7/1,250);

    //   await marketInstance1.setPrice(2,50);
    //   const getPrice8= await marketInstance1.getPrice(2);
    //   assert.equal(getPrice8/1,50);
    //   await marketInstance1.placeBet(2,{value: 7000000000000000000,from: user9}); 
    //   const getbrttingpoint8 = await marketInstance1.userBettingPoints(user9,2);   
    //   assert.equal(getbrttingpoint8/1,140);
      
    //   // const addressOfMarket = marketInstance.address;
    //   const balanceOfPool = await web3.eth.getBalance(addressOfMarket)
    //   const commisionBeforeClose = await marketInstance1.commision();
    //   const donationBeforeClose =await marketInstance1.donation();
    //   const ClaimDonation = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567");

    //   const balancePlBefore = await web3.eth.getBalance(plotusNewAddress)


    //   await increaseTime(610);
    //   await marketInstance1._closeBet(100);

    //   const balancePlAfter = await web3.eth.getBalance(plotusNewAddress);
    //   const balanceOfPoolAfterClose = await web3.eth.getBalance(addressOfMarket)
    //   const commisionAfterClose = await marketInstance1.commision();
    //   const donationAfterClose =await marketInstance1.donation();
    //   const optionOneWinning = await marketInstance1.WinningOption();
    //   assert.equal(optionOneWinning/1,1)
    //   assert.equal((commisionAfterClose/1)/1e18,(commisionBeforeClose/1)/1e18+0.76);
    //   assert.equal((donationAfterClose/1)/1e18,(donationBeforeClose/1)/1e18+0.76);
    //   assert.equal(balanceOfPoolAfterClose/1,0)
    //   const ClaimDonation1 = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567")

    //   assert.equal((balancePlAfter/1)/1e18,(balancePlBefore/1)/1e18+36.48);
    //   assert.equal(ClaimDonation1/1,ClaimDonation/1+1.52e+18); 
      
    // })

    // // // 5 test case for when opion 2 win but all sers placing bet on option 2.
    // it('5. place bet from nine users all users win the bet and pool have balance',async function() {
      
    //   let nowTime = await latestTime();
    //   nowTime = parseInt(nowTime);
    //   let thenTime = new BN(((nowTime/1+(600)).toString()));
    //   const start = nowTime/1
    //   const end = thenTime/1
    //   masterInstance = await Master.deployed();
    //   plotusNewAddress = await masterInstance.plotusAddress();
      
    //   plotusNewInstance = await Plotus.at(plotusNewAddress);
    //   const addNewMarket = await plotusNewInstance.addNewMarket([start,end,1,2,1,7,1000000000000000,10000,2,2,100],"firstBet","0x47",["0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567","0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567"])
    //   const length = await plotusNewInstance.getAllMarketsLen(); 
      
    //   const markets = await plotusNewInstance.allMarkets(length-1);
      
    //   marketInstance2 = await Market.at(markets);
    //   assert.ok(marketInstance2);
    //   const addressOfMarket = marketInstance2.address;
      
      
    //   await marketInstance2.setPrice(2,10);
    //   const getPrice11 = await marketInstance2.getPrice(2);
    //   assert.equal(getPrice11/1,10);
    //   await marketInstance2.placeBet(2,{value: 4000000000000000000,from: user1});
    //   const getbrttingpoint11  = await marketInstance2.userBettingPoints(user1,2);
    //   const stackedEth = await marketInstance2.ethStaked(user1,2);
   
      

    //   await marketInstance2.setPrice(2,20);
    //   const getPrice12 = await marketInstance2.getPrice(2);
    //   assert.equal(getPrice12/1,20);
    //   await marketInstance2.placeBet(2,{value: 6000000000000000000,from: user2});
    //   const getbrttingpoint12 = await marketInstance2.userBettingPoints(user2,2);
    //   assert.equal(getbrttingpoint12/1,300);

      
    //   await marketInstance2.setPrice(2,30);
    //   const getPrice22 = await marketInstance2.getPrice(2);
    //   assert.equal(getPrice22/1,30);
    //   await marketInstance2.placeBet(2,{value: 2000000000000000000,from: user3});
    //   const getbrttingpoint22 = await marketInstance2.userBettingPoints(user3,2);
    //   assert.equal(getbrttingpoint22/1,66);
      

    //   await marketInstance2.setPrice(2,40);
    //   const getPrice33 = await marketInstance2.getPrice(2);
    //   assert.equal(getPrice33/1,40);
    //   await marketInstance2.placeBet(2,{value: 4000000000000000000,from: user4});
    //   const getbrttingpoint33 = await marketInstance2.userBettingPoints(user4,2);
    //   assert.equal(getbrttingpoint33/1,100);
      

    //   await marketInstance2.setPrice(2,50);
    //   const getPrice44 = await marketInstance2.getPrice(2);
    //   assert.equal(getPrice44/1,50);
    //   await marketInstance2.placeBet(2,{value: 3000000000000000000,from: user5});
    //   const getbrttingpoint44 = await marketInstance2.userBettingPoints(user5,2);
    //   assert.equal(getbrttingpoint44/1,60);
      

    //   await marketInstance2.setPrice(2,20);
    //   const getPrice55 = await marketInstance2.getPrice(2);
    //   assert.equal(getPrice55/1,20);
    //   await marketInstance2.placeBet(2,{value: 2000000000000000000,from: user6});
    //   const getbrttingpoint55 = await marketInstance2.userBettingPoints(user6,2);
    //   assert.equal(getbrttingpoint55/1,100);
      

    //   await marketInstance2.setPrice(2,30);
    //   const getPrice66 = await marketInstance2.getPrice(2);
    //   assert.equal(getPrice66/1,30);
    //   await marketInstance2.placeBet(2,{value: 5000000000000000000,from: user7});
    //   const getbrttingpoint66 = await marketInstance2.userBettingPoints(user7,2);
    //   assert.equal(getbrttingpoint66/1,166);//166
      

    //   await marketInstance2.setPrice(2,20);
    //   const getPrice77 = await marketInstance2.getPrice(2);
    //   assert.equal(getPrice77/1,20);
    //   await marketInstance2.placeBet(2,{value: 5000000000000000000,from: user8});
    //   const getbrttingpoint77 = await marketInstance2.userBettingPoints(user8,2);
    //   assert.equal(getbrttingpoint77/1,250);//250
      

    //   await marketInstance2.setPrice(2,50);
    //   const getPrice88 = await marketInstance2.getPrice(2);
    //   assert.equal(getPrice88/1,50);
    //   await marketInstance2.placeBet(2,{value: 7000000000000000000,from: user9}); 
    //   const getbrttingpoint88 = await marketInstance2.userBettingPoints(user9,2);   
    //   assert.equal(getbrttingpoint88/1,140);//140
      
    //   const ClaimDonation1 = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567");
      
    //   await increaseTime(610);
    //   await marketInstance2._closeBet(9760);

    //   const optionTwoWinning11 = await marketInstance2.WinningOption();
    //   assert.equal(optionTwoWinning11/1,2)

    //   const ClaimDonation12 = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567");
    //   assert.equal(ClaimDonation12/1,ClaimDonation1/1);

    //   const beforeClaimUser1 = await web3.eth.getBalance(user1);
    //   await marketInstance2.claimReward({from: user1});
    //   const afterClaimUser1 = await web3.eth.getBalance(user1);

    //   // 0.00160414
    //   assert.equal(((afterClaimUser1)/1e18).toFixed(2),(((beforeClaimUser1)/1e18)/1+4.008-0.00220414).toFixed(2));

    //   const beforeClaimUser2 = await web3.eth.getBalance(user2);
    //   await marketInstance2.claimReward({from: user2});
    //   const afterClaimUser2 = await web3.eth.getBalance(user2);
    //   assert.equal(((afterClaimUser2)/1e18).toFixed(1),(((beforeClaimUser2)/1e18)/1+6.006-0.00160414).toFixed(1))

    //   const beforeClaimUser3 = await web3.eth.getBalance(user3);
    //   await marketInstance2.claimReward({from: user3});
    //   const afterClaimUser3 = await web3.eth.getBalance(user3);
    //   assert.equal(((afterClaimUser3)/1e18).toFixed(1),(((beforeClaimUser3)/1e18)/1+2.00132-0.00160414).toFixed(1))

    //   const beforeClaimUser4 = await web3.eth.getBalance(user4);
    //   await marketInstance2.claimReward({from: user4});
    //   const afterClaimUser4 = await web3.eth.getBalance(user4)
    //   assert.equal(((afterClaimUser4)/1e18).toFixed(1),(((beforeClaimUser4)/1e18)/1+4.002-0.00160414).toFixed(1))

    //   const beforeClaimUser5 = await web3.eth.getBalance(user5);
    //   await marketInstance2.claimReward({from: user5});
    //   const afterClaimUser5 = await web3.eth.getBalance(user5);
    //   assert.equal(((afterClaimUser5)/1e18).toFixed(1),(((beforeClaimUser5)/1e18)/1+3.0012-0.00160414).toFixed(1))

    //   const beforeClaimUser6 = await web3.eth.getBalance(user6);
    //   await marketInstance2.claimReward({from: user6});
    //   const afterClaimUser6 = await web3.eth.getBalance(user6);
    //   assert.equal(((afterClaimUser6)/1e18).toFixed(1),(((beforeClaimUser6)/1e18)/1+2.002-0.00160414).toFixed(1))

    //   const beforeClaimUser7 = await web3.eth.getBalance(user7);
    //   await marketInstance2.claimReward({from: user7});
    //   const afterClaimUser7 = await web3.eth.getBalance(user7);
    //   assert.equal(((afterClaimUser7)/1e18).toFixed(1),(((beforeClaimUser7)/1e18)/1+5.00332-0.00160414).toFixed(1))

    //   const beforeClaimUser8 = await web3.eth.getBalance(user8);
    //   await marketInstance2.claimReward({from: user8});
    //   const afterClaimUser8 = await web3.eth.getBalance(user8);
    //   assert.equal(((afterClaimUser8)/1e18).toFixed(1),(((beforeClaimUser8)/1e18)/1+5.005-0.00160414).toFixed(1))

    //   const beforeClaimUser9 = await web3.eth.getBalance(user9);
    //   await marketInstance2.claimReward({from: user9});
    //   const afterClaimUser9 = await web3.eth.getBalance(user9)
    //   assert.equal(((afterClaimUser9)/1e18).toFixed(1),(((beforeClaimUser9)/1e18)/1+7.0028-0.00160414).toFixed(1))
    // })
   
})
