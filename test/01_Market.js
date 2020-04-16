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
        // 
        await marketInstance.placeBet(1,{value: 0,from: user1});
        const getPrice = await marketInstance.getPrice(1);
        assert.equal(getPrice,6)
        const afterPlaceBetUser1 = await web3.eth.getBalance(user1);
        const getbrttingpoint  = await marketInstance.userBettingPoints(user1,1);
        assert.equal(getbrttingpoint/1,0);
        // const getprice

        await marketInstance.placeBet(2,{value: 0,from: user2});
        const getPrice1 = await marketInstance.getPrice(2);
        assert.equal(getPrice1,13)
        const getbrttingpoint1 = await marketInstance.userBettingPoints(user2,2);
        assert.equal(getbrttingpoint1/1,0);
  
        await marketInstance.placeBet(3,{value: 0,from: user3});
        const getPrice2 = await marketInstance.getPrice(3);
        assert.equal(getPrice2,20)
        const getbrttingpoint2 = await marketInstance.userBettingPoints(user3,3);
        assert.equal(getbrttingpoint2/1,0);
  

        await marketInstance.placeBet(4,{value: 0,from: user4});
        const getPrice3 = await marketInstance.getPrice(4);
        assert.equal(getPrice3,27)
        const getbrttingpoint3 = await marketInstance.userBettingPoints(user4,4);
        assert.equal(getbrttingpoint3/1,0);
  
      
        await marketInstance.placeBet(5,{value: 0,from: user5});
        const getPrice4 = await marketInstance.getPrice(5);
        assert.equal(getPrice4,34)
        const getbrttingpoint4 = await marketInstance.userBettingPoints(user5,5);
        assert.equal(getbrttingpoint4/1,0);

        await marketInstance.placeBet(6,{value: 0,from: user6});
        const getPrice5 = await marketInstance.getPrice(6);
        assert.equal(getPrice5,41)
        const getbrttingpoint5 = await marketInstance.userBettingPoints(user6,6);
        assert.equal(getbrttingpoint5/1,0);


        await marketInstance.placeBet(7,{value: 0,from: user7});
        const getPrice6 = await marketInstance.getPrice(7);
        assert.equal(getPrice6,34)
        const getbrttingpoint6 = await marketInstance.userBettingPoints(user7,7);
        assert.equal(getbrttingpoint6/1,0);

        await marketInstance.placeBet(1,{value: 0,from: user8});
        const getPrice7 = await marketInstance.getPrice(1);
        assert.equal(getPrice7,6)
        const getbrttingpoint7= await marketInstance.userBettingPoints(user8,1);
        assert.equal(getbrttingpoint7/1,0);

        await marketInstance.placeBet(2,{value: 0,from: user9});
        const getPrice8 = await marketInstance.getPrice(2);
        assert.equal(getPrice8,13)
        const getbrttingpoint8 = await marketInstance.userBettingPoints(user9,2);
        assert.equal(getbrttingpoint8/1,0);
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
        
        await increaseTime(21600+11);
        await marketInstance.setCurrentPrice(10215);
        // const print = await marketInstance._getDistance(1);
        
        const getPrice0 = await marketInstance.getPrice(1);
        assert.equal(getPrice0/1,6)
        // const user1BalanceBeforeBet = await web3.eth.getBalance(user1)
        await marketInstance.placeBet(1,{value: 4e18,from: user1});
        const user1BalanceAfterBet = await web3.eth.getBalance(user1)
        const getPrice = await marketInstance.getPrice(1);
        assert.equal(getPrice,6)
        const afterPlaceBetUser1 = await web3.eth.getBalance(user1);
        const getbrttingpoint  = await marketInstance.userBettingPoints(user1,1);
        assert.equal(getbrttingpoint/1,666);
        // const getprice
  
        
        const getPrice11 = await marketInstance.getPrice(2);
        assert.equal(getPrice11/1,13)
        await marketInstance.placeBet(2,{value: 6e18,from: user2});
        const getPrice1 = await marketInstance.getPrice(2);
        assert.equal(getPrice1,13)
        const getbrttingpoint1 = await marketInstance.userBettingPoints(user2,2);
        assert.equal(getbrttingpoint1/1,461);
  
        
        const getPrice21 = await marketInstance.getPrice(3);
        assert.equal(getPrice21/1,20)
        await marketInstance.placeBet(3,{value: 2e18,from: user3});
        const getPrice2 = await marketInstance.getPrice(3);
        assert.equal(getPrice2,20)
        const getbrttingpoint2 = await marketInstance.userBettingPoints(user3,3);
        assert.equal(getbrttingpoint2/1,100);
  
        
        const getPrice31 = await marketInstance.getPrice(4);
        assert.equal(getPrice31/1,27)
        await marketInstance.placeBet(4,{value: 1e19,from: user4});
        const getPrice3 = await marketInstance.getPrice(4);
        assert.equal(getPrice3/1,141)
        const getbrttingpoint3 = await marketInstance.userBettingPoints(user4,4);
        assert.equal(getbrttingpoint3/1,370);
  
        
        const getPrice14 = await marketInstance.getPrice(1);
        assert.equal(getPrice14,52)
        await marketInstance.placeBet(1,{value: 3e18,from: user5});
        const getPrice4 = await marketInstance.getPrice(1);
        assert.equal(getPrice4/1,76)//52
        // const afterPlaceBetUser1 = await web3.eth.getBalance(user5);
        const getbrttingpoint4  = await marketInstance.userBettingPoints(user5,1);
        assert.equal(getbrttingpoint4/1,57);
  
        
        const getPrice51 = await marketInstance.getPrice(2);
        assert.equal(getPrice51/1,73)
        await marketInstance.placeBet(2,{value: 2e18,from: user6});
        const getPrice5 = await marketInstance.getPrice(2);
        assert.equal(getPrice5,87)//73
        const getbrttingpoint5 = await marketInstance.userBettingPoints(user6,2);
        assert.equal(getbrttingpoint5/1,27);
  
        
        const getPrice61 = await marketInstance.getPrice(5);
        assert.equal(getPrice61/1,34)
        await marketInstance.placeBet(5,{value: 5e18,from: user7});
        const getPrice62 = await marketInstance.getPrice(5);
        assert.equal(getPrice62/1,73)
        const getbrttingpoint6 = await marketInstance.userBettingPoints(user7,5);
        assert.equal(getbrttingpoint6/1,147);
  
        
        const getPrice71 = await marketInstance.getPrice(6);
        assert.equal(getPrice71/1,41)
        await marketInstance.placeBet(6,{value: 5e18,from: user8});
        const getPrice7 = await marketInstance.getPrice(6);
        assert.equal(getPrice7/1,75)
        const getbrttingpoint7 = await marketInstance.userBettingPoints(user8,6);
        assert.equal(getbrttingpoint7/1,121);
  
        
        const getPrice81 = await marketInstance.getPrice(7);
        assert.equal(getPrice81/1,34)
        await marketInstance.placeBet(7,{value: 7e18,from: user9}); 
        const getPrice8 = await marketInstance.getPrice(7);
        assert.equal(getPrice8/1,74);
        const getbrttingpoint8 = await marketInstance.userBettingPoints(user9,7);
        assert.equal(getbrttingpoint8/1,205);


        const ClaimDonation = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567")
        await increaseTime(64810);
        await marketInstance._closeBet(100);
        // const check = await marketInstance.getReward(user1);
        const ClaimDonation1 = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567")
        assert.equal(ClaimDonation1/1,ClaimDonation/1+1.48e+18);
        const RewardUser1 = await marketInstance.getReward(user1);
        assert.equal((RewardUser1/1)/1e18,24);
        const RewardUser5 = await marketInstance.getReward(user5);
        assert.equal(((RewardUser5/1)/1e18).toFixed(6),(5.80033195).toFixed(6));
        const beforeClaimUser1 = await web3.eth.getBalance(user1);
        await marketInstance.claimReward({from: user1});
        // console.log("reward of user5",await marketInstance.getReward(user1)/1)
        // const txInfo = await marketInstance.getReward(user1);
        // const tx = await web3.eth.getTransaction(txInfo.tx);
        // const gasCost1 = tx.gasPrice * txInfo.receipt.gasUsed;
        // console.log("gas ",(gasCost1/1)/1e18);
        const afterClaimUser1 = await web3.eth.getBalance(user1);
        // console
        assert.equal(((afterClaimUser1)/1e18).toFixed(2),(((beforeClaimUser1)/1e18)/1+24-0.00108296).toFixed(2))
        // const beforeClaimUser5 = await web3.eth.getBalance(user5);
        // await marketInstance.claimReward({from: user5});
        // const afterClaimUser5 = await web3.eth.getBalance(user5);
        // console.log("user5 balance after claimReward",(afterClaimUser5/1)/1e18.toFixed(0));
        // // gas limit 0.00107126
        // // 00118998
        // // it should be add this ammount 7.043478261
        // // 7.04240700087 but it adding this
        // // let num2 = (afterClaimUser5/1)/1e+18;
        // // let num3 = ((beforeClaimUser5/1)/1e18)/1+6.88173913-0.00119532;
        // // assert.equal(num2.toFixed(8),num3.toFixed(8));
        // assert.equal(((afterClaimUser5)/1e18).toFixed(1),(((beforeClaimUser5)/1e18)/1+5.829026549-0.00108296).toFixed(1))
    })
    it('2. place bet from nine users with 0% commision and 0% donation',async function(){

        let nowTime = await latestTime();
        nowTime = parseInt(nowTime);
        const start = nowTime/1 + 10;
        masterInstance = await Master.deployed();
        plotusNewAddress = await masterInstance.plotusAddress(); 
        plotusNewInstance = await Plotus.at(plotusNewAddress);
        const addNewMarket = await plotusNewInstance.addNewMarket([start,1,2,0,7,1000000000000000,10000,0,0,100,5,10],"firstBet","0x47",["0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567","0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567"])
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
        await increaseTime(21600+11);
        // const print = await marketInstance._getDistance(1);
        await marketInstance.setCurrentPrice(10215);
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
  
        
        const getPrice11 = await marketInstance.getPrice(2);
        assert.equal(getPrice11/1,13)
        await marketInstance.placeBet(2,{value: 6e18,from: user2});
        const getPrice1 = await marketInstance.getPrice(2);
        assert.equal(getPrice1,13)
        const getbrttingpoint1 = await marketInstance.userBettingPoints(user2,2);
        assert.equal(getbrttingpoint1/1,461);
  
        
        const getPrice21 = await marketInstance.getPrice(3);
        assert.equal(getPrice21/1,20)
        await marketInstance.placeBet(3,{value: 2e18,from: user3});
        const getPrice2 = await marketInstance.getPrice(3);
        assert.equal(getPrice2,20)
        const getbrttingpoint2 = await marketInstance.userBettingPoints(user3,3);
        assert.equal(getbrttingpoint2/1,100);
  
        
        const getPrice31 = await marketInstance.getPrice(4);
        assert.equal(getPrice31/1,27)
        await marketInstance.placeBet(4,{value: 1e19,from: user4});
        const getPrice3 = await marketInstance.getPrice(4);
        assert.equal(getPrice3/1,141)
        const getbrttingpoint3 = await marketInstance.userBettingPoints(user4,4);
        assert.equal(getbrttingpoint3/1,370);
  
        
        const getPrice14 = await marketInstance.getPrice(1);
        assert.equal(getPrice14,52)
        await marketInstance.placeBet(1,{value: 3e18,from: user5});
        const getPrice4 = await marketInstance.getPrice(1);
        assert.equal(getPrice4/1,76)//52
        // const afterPlaceBetUser1 = await web3.eth.getBalance(user5);
        const getbrttingpoint4  = await marketInstance.userBettingPoints(user5,1);
        assert.equal(getbrttingpoint4/1,57);
  
        
        const getPrice51 = await marketInstance.getPrice(2);
        assert.equal(getPrice51/1,73)
        await marketInstance.placeBet(2,{value: 2e18,from: user6});
        const getPrice5 = await marketInstance.getPrice(2);
        assert.equal(getPrice5,87)//73
        const getbrttingpoint5 = await marketInstance.userBettingPoints(user6,2);
        assert.equal(getbrttingpoint5/1,27);
  
        
        const getPrice61 = await marketInstance.getPrice(5);
        assert.equal(getPrice61/1,34)
        await marketInstance.placeBet(5,{value: 5e18,from: user7});
        const getPrice62 = await marketInstance.getPrice(5);
        assert.equal(getPrice62/1,73)
        const getbrttingpoint6 = await marketInstance.userBettingPoints(user7,5);
        assert.equal(getbrttingpoint6/1,147);
  
        
        const getPrice71 = await marketInstance.getPrice(6);
        assert.equal(getPrice71/1,41)
        await marketInstance.placeBet(6,{value: 5e18,from: user8});
        const getPrice7 = await marketInstance.getPrice(6);
        assert.equal(getPrice7/1,75)
        const getbrttingpoint7 = await marketInstance.userBettingPoints(user8,6);
        assert.equal(getbrttingpoint7/1,121);
  
        
        const getPrice81 = await marketInstance.getPrice(7);
        assert.equal(getPrice81/1,34)
        await marketInstance.placeBet(7,{value: 7e18,from: user9}); 
        const getPrice8 = await marketInstance.getPrice(7);
        assert.equal(getPrice8/1,74);
        const getbrttingpoint8 = await marketInstance.userBettingPoints(user9,7);
        assert.equal(getbrttingpoint8/1,205);


        const ClaimDonation = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567")
        await increaseTime(64810);
        await marketInstance._closeBet(100);
        const RewardUser1 = await marketInstance.getReward(user1);
        assert.equal((RewardUser1/1)/1e18,24);
        const RewardUser5 = await marketInstance.getReward(user5);
        assert.equal(((RewardUser5/1)/1e18).toFixed(6),(5.917012448).toFixed(6));
        const ClaimDonation1 = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567")
        assert.equal(ClaimDonation1/1,ClaimDonation/1);
        // const beforeClaimUser1 = await web3.eth.getBalance(user1);
        // // console.log("user1 balance after  anf before claimReward",(beforeClaimUser1/1)/1e18.toFixed(0));
        // // const rew1 = await marketInstance._rew();
        // // console.log("rew",rew1/1)
        // // const maxReturn = await marketInstance.maxReturn()
        // // console.log(maxReturn/1)
        // // const rew12 = await marketInstance.maxReturnCap();
        // // console.log("maxReturnCap",rew12/1)
        // await marketInstance.claimReward({from: user1});
        // // const rew11 = await marketInstance._rew();
        // // console.log("rew",rew11/1)
        // // const rew121 = await marketInstance.maxReturnCap();
        // // console.log("maxReturnCap",rew121/1)

        // const txInfo = await marketInstance.getReward(user1);
        // // const tx = await web3.eth.getTransaction(txInfo.tx);
        // // const gasCost1 = tx.gasPrice * txInfo.receipt.gasUsed;
        // // console.log("gas ",(gasCost1/1)/1e18);
        // const afterClaimUser1 = await web3.eth.getBalance(user1);
        // // console.log("user1 balance after claimReward",(afterClaimUser1/1)/1e18.toFixed(0));
        // // assert.equal(((afterClaimUser1)/1e18).toFixed(2),(((beforeClaimUser1)/1e18)/1+24-0.00108296).toFixed(2))
        // assert.equal(((afterClaimUser1)/1e18).toFixed(2),(((beforeClaimUser1)/1e18)/1+24-0.00108296).toFixed(2))
        // // // 0.00107126
        // // // 0.00107082
        // // // 0.00148998
        // // // 29.87826087
        // // // 29.8771896096
        // // // 0.00149532 //0.00108296
        // // // let num1 = (afterClaimUser1/1)/1e+18;
        // // // let num = ((beforeClaimUser1/1)/1e18)/1+29.87826087-.00149532;
        // // // assert.equal(num1.toFixed(8),num.toFixed(8));
  
  
        // const beforeClaimUser5 = await web3.eth.getBalance(user5);
        //  await marketInstance.claimReward({from: user5});
        // // console.log("user5 balance after claimReward",(beforeClaimUser5/1)/1e18.toFixed(0));
        // // // const tx = await web3.eth.getTransaction(txInfo.tx);
        // // // const gasCost1 = tx.gasPrice * txInfo.receipt.gasUsed;
        // // // ce",(gasCost1/1)/1e18);
        // const afterClaimUser5 = await web3.eth.getBalance(user5);
        // // console.log("user5 balance after claimReward",(afterClaimUser5/1)/1e18.toFixed(0));
        // // // gas limit 0.00107126
        // // // 00118998
        // // // it should be add this ammount 7.043478261
        // // // 7.04240700087 but it adding this
        // // // let num2 = (afterClaimUser5/1)/1e+18;
        // // // let num3 = ((beforeClaimUser5/1)/1e18)/1+6.88173913-0.00119532;
        // // // assert.equal(num2.toFixed(8),num3.toFixed(8));
        // assert.equal(((afterClaimUser5)/1e18).toFixed(1),(((beforeClaimUser5)/1e18)/1+5.946902655-0.00108296).toFixed(1))
    })
    // 3 test case when all users bet on option 1 and all wins but the pool have zero balance. users will have own ether
    it('3. place bet from nine users with  and all users are correct. but pool have zero balance',async function(){

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

        await increaseTime(21600+11);
        await marketInstance.setCurrentPrice(10215);
      
        const getPrice0 = await marketInstance.getPrice(2);
        assert.equal(getPrice0/1,13)
        const user1BalanceBeforeBet = await web3.eth.getBalance(user1)
        await marketInstance.placeBet(2,{value: 4e18,from: user1});
        const user1BalanceAfterBet = await web3.eth.getBalance(user1)
        const getPrice = await marketInstance.getPrice(2);
        assert.equal(getPrice,13)
        const afterPlaceBetUser1 = await web3.eth.getBalance(user1);
        const getbrttingpoint  = await marketInstance.userBettingPoints(user1,2);
        assert.equal(getbrttingpoint/1,307);
        const getPrice11 = await marketInstance.getPrice(2);
        assert.equal(getPrice11/1,13)
        await marketInstance.placeBet(2,{value: 6e18,from: user2});
        const getPrice1 = await marketInstance.getPrice(2);
        assert.equal(getPrice1,13)
        const getbrttingpoint1 = await marketInstance.userBettingPoints(user2,2);
        assert.equal(getbrttingpoint1/1,461);
  
        
        const getPrice21 = await marketInstance.getPrice(2);
        assert.equal(getPrice21/1,13)
        await marketInstance.placeBet(2,{value: 2e18,from: user3});
        const getPrice2 = await marketInstance.getPrice(2);
        assert.equal(getPrice2,13)
        const getbrttingpoint2 = await marketInstance.userBettingPoints(user3,2);
        assert.equal(getbrttingpoint2/1,153);
  
        
        const getPrice31 = await marketInstance.getPrice(2);
        assert.equal(getPrice31/1,13)
        await marketInstance.placeBet(2,{value: 1e19,from: user4});
        const getPrice3 = await marketInstance.getPrice(2);
        assert.equal(getPrice3/1,263)
        const getbrttingpoint3 = await marketInstance.userBettingPoints(user4,2);
        assert.equal(getbrttingpoint3/1,769);
  
        
        const getPrice14 = await marketInstance.getPrice(2);
        assert.equal(getPrice14,263)
        await marketInstance.placeBet(2,{value: 3e18,from: user5});
        const getPrice4 = await marketInstance.getPrice(2);
        assert.equal(getPrice4/1,263)//52
        const getbrttingpoint4  = await marketInstance.userBettingPoints(user5,2);
        assert.equal(getbrttingpoint4/1,11);
  
        
        const getPrice51 = await marketInstance.getPrice(2);
        
        assert.equal(getPrice51/1,263)
        await marketInstance.placeBet(2,{value: 2e18,from: user6});
        const getPrice5 = await marketInstance.getPrice(2);
        
        assert.equal(getPrice5,263)//73
        const getbrttingpoint5 = await marketInstance.userBettingPoints(user6,2);
        
        assert.equal(getbrttingpoint5/1,7);
  
        
        const getPrice61 = await marketInstance.getPrice(2);
        assert.equal(getPrice61/1,263)
        await marketInstance.placeBet(2,{value: 5e18,from: user7});
        const getPrice62 = await marketInstance.getPrice(2);
        
        assert.equal(getPrice62/1,263)
        const getbrttingpoint6 = await marketInstance.userBettingPoints(user7,2);
        
        assert.equal(getbrttingpoint6/1,19);
  
        
        const getPrice71 = await marketInstance.getPrice(2);
         
        assert.equal(getPrice71/1,263)
        await marketInstance.placeBet(2,{value: 5e18,from: user8});
        const getPrice7 = await marketInstance.getPrice(2);
       
        assert.equal(getPrice7/1,263)
        const getbrttingpoint7 = await marketInstance.userBettingPoints(user8,2);
        
        assert.equal(getbrttingpoint7/1,19);
  
        
        const getPrice81 = await marketInstance.getPrice(2);
        
        assert.equal(getPrice81/1,263)
        await marketInstance.placeBet(2,{value: 7e18,from: user9}); 
        const getPrice8 = await marketInstance.getPrice(2);
         
        assert.equal(getPrice8/1,263);
        const getbrttingpoint8 = await marketInstance.userBettingPoints(user9,2);
       
        assert.equal(getbrttingpoint8/1,26);


        const ClaimDonation = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567")
        await increaseTime(64810);
         const balancePlBefore1 = await web3.eth.getBalance(plotusNewAddress);
        console.log(balancePlBefore1/1)

        await marketInstance._closeBet(9790);
        const WinningOption = await marketInstance.WinningOption()
        assert.equal(WinningOption/1,2);
        // const check = await marketInstance.getReward(user1);
        const ClaimDonation1 = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567")
        assert.equal(ClaimDonation1/1,ClaimDonation/1);
        const RewardUser1 = await marketInstance.getReward(user1);
        assert.equal((RewardUser1/1)/1e18,4)
        const RewardUser2 = await marketInstance.getReward(user2);
        assert.equal((RewardUser2/1)/1e18,6)
        const RewardUser3 = await marketInstance.getReward(user3);
        assert.equal((RewardUser3/1)/1e18,2)
        const RewardUser4 = await marketInstance.getReward(user4);
        assert.equal((RewardUser4/1)/1e18,10);
        const RewardUser5 = await marketInstance.getReward(user5);
        assert.equal((RewardUser5/1)/1e18,3);
        const RewardUser6 = await marketInstance.getReward(user6);
        assert.equal((RewardUser6/1)/1e18,2);
        const RewardUser7 = await marketInstance.getReward(user7);
        assert.equal((RewardUser7/1)/1e18,5);
        const RewardUser8 = await marketInstance.getReward(user8);
        assert.equal((RewardUser8/1)/1e18,5);
        const RewardUser9 = await marketInstance.getReward(user9);
        assert.equal((RewardUser9/1)/1e18,7);
         const balancePlBefore11 = await web3.eth.getBalance(plotusNewAddress);
        console.log(balancePlBefore11/1)

        // assert.equal(RewardUser5,5.946902655);

        // const balanceOfPoolAfterCliam = await web3.eth.getBalance(addressOfMarket)
        // assert.equal(balanceOfPoolAfterCliam/1,(balanceOfPool/1));
        // const beforeClaimUser1 = await web3.eth.getBalance(user1);
        // await marketInstance.claimReward({from: user1});
        // // .0020087 
        // const afterClaimUser1 = await web3.eth.getBalance(user1);
        // assert.equal(((afterClaimUser1)/1e18).toFixed(2),(((beforeClaimUser1)/1e18)/1+4-.0020087).toFixed(2))
  
        // const beforeClaimUser2 = await web3.eth.getBalance(user2);
        // await marketInstance.claimReward({from: user2}); 
        // // 0.00117928
        // const afterClaimUser2 = await web3.eth.getBalance(user2);
        // assert.equal(((afterClaimUser2)/1e18).toFixed(2),(((beforeClaimUser2)/1e18)/1+6-0.0014087).toFixed(2))
  
        // const beforeClaimUser3 = await web3.eth.getBalance(user3);
        // await marketInstance.claimReward({from: user3});
        // const afterClaimUser3 = await web3.eth.getBalance(user3);
        // assert.equal(((afterClaimUser3)/1e18).toFixed(2),(((beforeClaimUser3)/1e18)/1+2-0.0014087).toFixed(2))
  
        // const beforeClaimUser4 = await web3.eth.getBalance(user4);
        // await marketInstance.claimReward({from: user4});
        // const afterClaimUser4 = await web3.eth.getBalance(user4);
        // assert.equal(((afterClaimUser4)/1e18).toFixed(2),(((beforeClaimUser4)/1e18)/1+10-0.0014087).toFixed(2))
        
        // const beforeClaimUser5 = await web3.eth.getBalance(user5);
        // await marketInstance.claimReward({from: user5});
        // const afterClaimUser5 = await web3.eth.getBalance(user5);
        // assert.equal(((afterClaimUser5)/1e18).toFixed(2),(((beforeClaimUser5)/1e18)/1+3-0.0014087).toFixed(2))
        
        // const beforeClaimUser6 = await web3.eth.getBalance(user6);
        // await marketInstance.claimReward({from: user6});
        // const afterClaimUser6 = await web3.eth.getBalance(user6);
        // assert.equal(((afterClaimUser6)/1e18).toFixed(2),(((beforeClaimUser6)/1e18)/1+2-0.0014087).toFixed(2))
        
        // const beforeClaimUser7 = await web3.eth.getBalance(user7);
        // await marketInstance.claimReward({from: user7});
        // const afterClaimUser7 = await web3.eth.getBalance(user7);
        // assert.equal(((afterClaimUser7)/1e18).toFixed(2),(((beforeClaimUser7)/1e18)/1+5-0.0014087).toFixed(2))
        
        // const beforeClaimUser8 = await web3.eth.getBalance(user8);
        // await marketInstance.claimReward({from: user8});
        // const afterClaimUser8 = await web3.eth.getBalance(user8);
        // assert.equal(((afterClaimUser8)/1e18).toFixed(2),(((beforeClaimUser8)/1e18)/1+5-0.0014087).toFixed(2))
  
        // const beforeClaimUser9 = await web3.eth.getBalance(user9);
        // await marketInstance.claimReward({from: user9});
        // const afterClaimUser9 = await web3.eth.getBalance(user9);
        // const round = Math.round((afterClaimUser9/1)/1e18);
        // assert.equal(round.toFixed(2),round.toFixed(2));    
    })
    // // 4 test case for when all users place bet on option 2 and option 1 wins. with 2% Donation and 2% Commision 
    it('4. place bet from nine users with 2% commision and donation and all are wrong.',async function(){

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
        
        await increaseTime(21600+11);
        await marketInstance.setCurrentPrice(10215);
        const getPrice0 = await marketInstance.getPrice(2);
        
        assert.equal(getPrice0/1,13)
        const user1BalanceBeforeBet = await web3.eth.getBalance(user1)
        await marketInstance.placeBet(2,{value: 4e18,from: user1});
        const user1BalanceAfterBet = await web3.eth.getBalance(user1)
        const getPrice = await marketInstance.getPrice(2);
        
        assert.equal(getPrice,13)
        const afterPlaceBetUser1 = await web3.eth.getBalance(user1);
        const getbrttingpoint  = await marketInstance.userBettingPoints(user1,2);
        
        assert.equal(getbrttingpoint/1,307);
        const getPrice11 = await marketInstance.getPrice(2);
        assert.equal(getPrice11/1,13)
        await marketInstance.placeBet(2,{value: 6e18,from: user2});

        const getPrice1 = await marketInstance.getPrice(2);
        assert.equal(getPrice1,13)
        const getbrttingpoint1 = await marketInstance.userBettingPoints(user2,2);
        assert.equal(getbrttingpoint1/1,461);
  
        
        const getPrice21 = await marketInstance.getPrice(2);
        assert.equal(getPrice21/1,13)
        await marketInstance.placeBet(2,{value: 2e18,from: user3});
        const getPrice2 = await marketInstance.getPrice(2);
        assert.equal(getPrice2,13)
        const getbrttingpoint2 = await marketInstance.userBettingPoints(user3,2);
        assert.equal(getbrttingpoint2/1,153);
  
      
        const getPrice31 = await marketInstance.getPrice(2);
        assert.equal(getPrice31/1,13)
        await marketInstance.placeBet(2,{value: 1e19,from: user4});
        const getPrice3 = await marketInstance.getPrice(2);
        // const betvalue = await marketInstance.estimateBetValue(2, 1e19 + "");
        assert.equal(getPrice3/1,263)
        const getbrttingpoint3 = await marketInstance.userBettingPoints(user4,2);
        assert.equal(getbrttingpoint3/1,769);
  
      
        const getPrice14 = await marketInstance.getPrice(2);
        assert.equal(getPrice14,263)
        await marketInstance.placeBet(2,{value: 3e18,from: user5});
        const getPrice4 = await marketInstance.getPrice(2);
        assert.equal(getPrice4/1,263)//52
        // const afterPlaceBetUser1 = await web3.eth.getBalance(user5);
        const getbrttingpoint4  = await marketInstance.userBettingPoints(user5,2);
        assert.equal(getbrttingpoint4/1,11);
  
        
        const getPrice51 = await marketInstance.getPrice(2);
        assert.equal(getPrice51/1,263)
        await marketInstance.placeBet(2,{value: 2e18,from: user6});
        const getPrice5 = await marketInstance.getPrice(2);
        assert.equal(getPrice5,263)//73
        const getbrttingpoint5 = await marketInstance.userBettingPoints(user6,2);
        assert.equal(getbrttingpoint5/1,7);
  
        
        const getPrice61 = await marketInstance.getPrice(2);
        assert.equal(getPrice61/1,263)
        await marketInstance.placeBet(2,{value: 5e18,from: user7});
        const getPrice62 = await marketInstance.getPrice(2);
        assert.equal(getPrice62/1,263)
        const getbrttingpoint6 = await marketInstance.userBettingPoints(user7,2);
        assert.equal(getbrttingpoint6/1,19);
  
        
        const getPrice71 = await marketInstance.getPrice(2);
        assert.equal(getPrice71/1,263)
        await marketInstance.placeBet(2,{value: 5e18,from: user8});
        const getPrice7 = await marketInstance.getPrice(2);
        assert.equal(getPrice7/1,263)
        const getbrttingpoint7 = await marketInstance.userBettingPoints(user8,2);
        assert.equal(getbrttingpoint7/1,19);
  
        
        const getPrice81 = await marketInstance.getPrice(2);
        assert.equal(getPrice81/1,263)
        await marketInstance.placeBet(2,{value: 7e18,from: user9}); 
        const getPrice8 = await marketInstance.getPrice(2);
        assert.equal(getPrice8/1,263);
        const getbrttingpoint8 = await marketInstance.userBettingPoints(user9,2);
        assert.equal(getbrttingpoint8/1,26);

        const ClaimDonation = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567")
        await increaseTime(64810);
        const balanceOfPool = await web3.eth.getBalance(length);
        const balancePlBefore = await web3.eth.getBalance(plotusNewAddress);
        await marketInstance._closeBet(100);
        // const tx = await web3.eth.getTransaction(txInfo.tx);
        // const gasCost1 = tx.gasPrice * txInfo.receipt.gasUsed;
        // console.log("gas ",(gasCost1/1)/1e18);
        const WinningOption = await marketInstance.WinningOption()
        assert.equal(WinningOption/1,1);
        const ClaimDonation1 = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567")
        assert.equal(ClaimDonation1/1,ClaimDonation/1+1.76e+18);

        const balancePlAfter = await web3.eth.getBalance(plotusNewAddress);

        const balanceOfPoolAfterClose = await web3.eth.getBalance(length);
        assert.equal(balanceOfPoolAfterClose/1,0);
        assert.equal((balancePlAfter/1)/1e18,(balancePlBefore/1)/1e18+42.24);
        // assert.equal(BeforeTrans2/1+(10*1e18),AfterTrans2/1);
        // const totalPlotusBalance = balancePlBefore/1+(44*1e18)
        // const round =Math.round(totalPlotusBalance);
        // console.log("balance of plotus after bet close",totalPlotusBalance/1)
        // assert.equal(balancePlAfter/1,balancePlBefore/1+(44*1e18));
        // assert.equal((balancePlAfter/1)/1e18,(totalPlotusBalance/1)/1e18-0.00316252)
        // assert.equal(ClaimDonation1/1,ClaimDonation/1);
        // const commisionAfterClose = await marketInstance1.commision();
        // const donationAfterClose =await marketInstance1.donation();
        // const optionOneWinning = await marketInstance1.WinningOption();
        // assert.equal(optionOneWinning/1,1)
        // assert.equal((commisionAfterClose/1)/1e18,(commisionBeforeClose/1)/1e18+0.76);
        // assert.equal((donationAfterClose/1)/1e18,(donationBeforeClose/1)/1e18+0.76);
        // assert.equal(balanceOfPoolAfterClose/1,0)
        // // const ClaimDonation1 = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567")
      
    })
    // 5 test case for when opion 2 win but all sers placing bet on option 2.
    it('5. place bet from nine users all users win the bet and pool have balance',async function() {
      
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
        
        await increaseTime(21600+11);
        await marketInstance.setCurrentPrice(10215);
        const getPrice0 = await marketInstance.getPrice(2);
        assert.equal(getPrice0/1,13)
        const user1BalanceBeforeBet = await web3.eth.getBalance(user1)
        await marketInstance.placeBet(2,{value: 4e18,from: user1});
        const user1BalanceAfterBet = await web3.eth.getBalance(user1)
        const getPrice = await marketInstance.getPrice(2);
        assert.equal(getPrice,13)
        const afterPlaceBetUser1 = await web3.eth.getBalance(user1);
        const getbrttingpoint  = await marketInstance.userBettingPoints(user1,2);
       
        assert.equal(getbrttingpoint/1,307);
        const getPrice11 = await marketInstance.getPrice(2);
        
        assert.equal(getPrice11/1,13)
        await marketInstance.placeBet(2,{value: 6e18,from: user2});

        const getPrice1 = await marketInstance.getPrice(2);
        assert.equal(getPrice1,13)
        const getbrttingpoint1 = await marketInstance.userBettingPoints(user2,2);
        
        assert.equal(getbrttingpoint1/1,461);
  
        
        const getPrice21 = await marketInstance.getPrice(2);
        assert.equal(getPrice21/1,13)
        await marketInstance.placeBet(2,{value: 2e18,from: user3});
        const getPrice2 = await marketInstance.getPrice(2);
        assert.equal(getPrice2,13)
        const getbrttingpoint2 = await marketInstance.userBettingPoints(user3,2);
        assert.equal(getbrttingpoint2/1,153);
  
        
        const getPrice31 = await marketInstance.getPrice(2);
        assert.equal(getPrice31/1,13)
        await marketInstance.placeBet(2,{value: 1e19,from: user4});
        const getPrice3 = await marketInstance.getPrice(2);
        assert.equal(getPrice3/1,263)
        const getbrttingpoint3 = await marketInstance.userBettingPoints(user4,2);
        assert.equal(getbrttingpoint3/1,769);
  
        
        const getPrice14 = await marketInstance.getPrice(2);

        assert.equal(getPrice14,263)
        await marketInstance.placeBet(2,{value: 3e18,from: user5});
        const getPrice4 = await marketInstance.getPrice(2);
        assert.equal(getPrice4/1,263)//52
        const getbrttingpoint4  = await marketInstance.userBettingPoints(user5,2);
        assert.equal(getbrttingpoint4/1,11);
  
        
        const getPrice51 = await marketInstance.getPrice(2);

        assert.equal(getPrice51/1,263)
        await marketInstance.placeBet(2,{value: 2e18,from: user6});
        const getPrice5 = await marketInstance.getPrice(2);

        assert.equal(getPrice5,263)//73
        const getbrttingpoint5 = await marketInstance.userBettingPoints(user6,2);
        assert.equal(getbrttingpoint5/1,7);
  
        
        const getPrice61 = await marketInstance.getPrice(2);
        assert.equal(getPrice61/1,263)
        await marketInstance.placeBet(2,{value: 5e18,from: user7});
        const getPrice62 = await marketInstance.getPrice(2);
        assert.equal(getPrice62/1,263)
        const getbrttingpoint6 = await marketInstance.userBettingPoints(user7,2);
        assert.equal(getbrttingpoint6/1,19);
  
        
        const getPrice71 = await marketInstance.getPrice(2);
        assert.equal(getPrice71/1,263)
        await marketInstance.placeBet(2,{value: 5e18,from: user8});
        const getPrice7 = await marketInstance.getPrice(2);
        assert.equal(getPrice7/1,263)
        const getbrttingpoint7 = await marketInstance.userBettingPoints(user8,2);
        assert.equal(getbrttingpoint7/1,19);
  
      
        const getPrice81 = await marketInstance.getPrice(2);
        assert.equal(getPrice81/1,263)
        await marketInstance.placeBet(2,{value: 7e18,from: user9}); 
        const getPrice8 = await marketInstance.getPrice(2);
        assert.equal(getPrice8/1,263);
        const getbrttingpoint8 = await marketInstance.userBettingPoints(user9,2);
        assert.equal(getbrttingpoint8/1,26);

        const ClaimDonation = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567");
        await increaseTime(64810);
        const balanceOfPool = await web3.eth.getBalance(length);

        const balancePlBefore = await web3.eth.getBalance(plotusNewAddress);
        await marketInstance._closeBet(9790);
        const optionTwoWinning11 = await marketInstance.WinningOption();
        assert.equal(optionTwoWinning11/1,2)

        const ClaimDonation1 = await web3.eth.getBalance("0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567");
        assert.equal(ClaimDonation1/1,ClaimDonation/1);

        const RewardUser1 = await marketInstance.getReward(user1);
        assert.equal((RewardUser1/1)/1e18,4.00614)
        const RewardUser2 = await marketInstance.getReward(user2); 
        assert.equal((RewardUser2/1)/1e18,6.00922)      
        const RewardUser3 = await marketInstance.getReward(user3);
        assert.equal((RewardUser3/1)/1e18,2.00306)
        const RewardUser4 = await marketInstance.getReward(user4);
        assert.equal((RewardUser4/1)/1e18,10.01538)
        const RewardUser5 = await marketInstance.getReward(user5);
        assert.equal((RewardUser5/1)/1e18,3.00022)
        const RewardUser6 = await marketInstance.getReward(user6)
        assert.equal((RewardUser6/1)/1e18,2.00014)
        const RewardUser7 = await marketInstance.getReward(user7);
        assert.equal((RewardUser7/1)/1e18,5.00038)
        const RewardUser8 = await marketInstance.getReward(user8);
        assert.equal((RewardUser8/1)/1e18,5.00038)
        const RewardUser9 = await marketInstance.getReward(user9);
        assert.equal((RewardUser9/1)/1e18,7.00052);

         const balancePlBefore111 = await web3.eth.getBalance(plotusNewAddress);
        console.log(balancePlBefore111/1)


        await marketInstance.claimReward({from: user1});
        await marketInstance.claimReward({from: user2});
        await marketInstance.claimReward({from: user3});
        await marketInstance.claimReward({from: user4});
        await marketInstance.claimReward({from: user5});
        await marketInstance.claimReward({from: user6});
        await marketInstance.claimReward({from: user7});
        await marketInstance.claimReward({from: user8});
        const reward = await marketInstance.claimReward({from: user9});
          // claimReward.logs[0].args
        // addNewMarket.logs[0].args.marketAdd
        const balancePlBefore1 = await web3.eth.getBalance(plotusNewAddress);
        console.log(balancePlBefore1/1)


        // const beforeClaimUser1 = await web3.eth.getBalance(user1);
        // await marketInstance.claimReward({from: user1});
        // const afterClaimUser1 = await web3.eth.getBalance(user1);
        // console.log("after Claim User1",(afterClaimUser1/1)/1e18)
        // // 0.00160414
        // assert.equal(((afterClaimUser1)/1e18).toFixed(2),(((beforeClaimUser1)/1e18)/1+4.008-0.00220414).toFixed(2));

        // const beforeClaimUser2 = await web3.eth.getBalance(user2);
        // await marketInstance.claimReward({from: user2});
        // const afterClaimUser2 = await web3.eth.getBalance(user2);
        // assert.equal(((afterClaimUser2)/1e18).toFixed(1),(((beforeClaimUser2)/1e18)/1+6.006-0.00160414).toFixed(1))

        // const beforeClaimUser3 = await web3.eth.getBalance(user3);
        // await marketInstance.claimReward({from: user3});
        // const afterClaimUser3 = await web3.eth.getBalance(user3);
        // assert.equal(((afterClaimUser3)/1e18).toFixed(1),(((beforeClaimUser3)/1e18)/1+2.00132-0.00160414).toFixed(1))

        // const beforeClaimUser4 = await web3.eth.getBalance(user4);
        // await marketInstance.claimReward({from: user4});
        // const afterClaimUser4 = await web3.eth.getBalance(user4)
        // assert.equal(((afterClaimUser4)/1e18).toFixed(1),(((beforeClaimUser4)/1e18)/1+10.002-0.00160414).toFixed(1))

        // const beforeClaimUser5 = await web3.eth.getBalance(user5);
        // await marketInstance.claimReward({from: user5});
        // const afterClaimUser5 = await web3.eth.getBalance(user5);
        // assert.equal(((afterClaimUser5)/1e18).toFixed(1),(((beforeClaimUser5)/1e18)/1+3.0012-0.00160414).toFixed(1))

        // const beforeClaimUser6 = await web3.eth.getBalance(user6);
        // await marketInstance.claimReward({from: user6});
        // const afterClaimUser6 = await web3.eth.getBalance(user6);
        // assert.equal(((afterClaimUser6)/1e18).toFixed(1),(((beforeClaimUser6)/1e18)/1+2.002-0.00160414).toFixed(1))

        // const beforeClaimUser7 = await web3.eth.getBalance(user7);
        // await marketInstance.claimReward({from: user7});
        // const afterClaimUser7 = await web3.eth.getBalance(user7);
        // assert.equal(((afterClaimUser7)/1e18).toFixed(1),(((beforeClaimUser7)/1e18)/1+5.00332-0.00160414).toFixed(1))

        // const beforeClaimUser8 = await web3.eth.getBalance(user8);
        // await marketInstance.claimReward({from: user8});
        // const afterClaimUser8 = await web3.eth.getBalance(user8);
        // assert.equal(((afterClaimUser8)/1e18).toFixed(1),(((beforeClaimUser8)/1e18)/1+5.005-0.00160414).toFixed(1))

        // const beforeClaimUser9 = await web3.eth.getBalance(user9);
        // await marketInstance.claimReward({from: user9});
        // // console.log("reward of user9",(await marketInstance.getReward(user9)/1)/1e18)
        // const afterClaimUser9 = await web3.eth.getBalance(user9)
        // assert.equal(((afterClaimUser9)/1e18).toFixed(1),(((beforeClaimUser9)/1e18)/1+7.0028-0.00160414).toFixed(1));
        // const balancePlAfter = await web3.eth.getBalance(plotusNewAddress);
    })

    it("6. If user invest large amount of ether.",async function(){
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

        await increaseTime(21600+11);
        await marketInstance.setCurrentPrice(10215);
      
        const getPrice0 = await marketInstance.getPrice(1);
        assert.equal(getPrice0/1,6)

        await marketInstance.placeBet(1,{value: 1e19,from: user1});
        const getPrice = await marketInstance.getPrice(1);
        // assert.equal(getPrice/1,6)
        const getbrttingpoint1  = await marketInstance.userBettingPoints(user1,1);
        assert.equal(getbrttingpoint1/1,1666);


        await marketInstance.placeBet(1,{value: 1e19,from: user1});
        const getPrice1 = await marketInstance.getPrice(1);
        assert.equal(getPrice1/1,6)
        const getbrttingpoint2  = await marketInstance.userBettingPoints(user1,1);
        assert.equal(getbrttingpoint2/1,3332);



        await marketInstance.placeBet(1,{value: 1e19,from: user1});
        const getPrice3 = await marketInstance.getPrice(1);
        assert.equal(getPrice3/1,256)
        const getbrttingpoint3  = await marketInstance.userBettingPoints(user1,1);
        assert.equal(getbrttingpoint3/1,4998);
        await marketInstance.placeBet(1,{value: 1e19,from: user1});
        const getPrice2 = await marketInstance.getPrice(1);
        assert.equal(getPrice2/1,256)
        const getbrttingpoint4  = await marketInstance.userBettingPoints(user1,1);
        assert.equal(getbrttingpoint4/1,5037);
        await marketInstance.placeBet(1,{value: 1e19,from: user1});
        // const afterPlaceBetUser1 = await web3.eth.getBalance(user1);
        const getbrttingpoint  = await marketInstance.userBettingPoints(user1,1);
        assert.equal(getbrttingpoint/1,5076);
    })
 })
