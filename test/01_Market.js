const Market  = artifacts.require('Market');
const web3 = Market.web3
const market = artifacts.require('Market');
const utils = require('./utils')
const BN = web3.utils.BN;
const { ether, toHex, toWei } = require('./utils/ethTools');
const { assertRevert } =  require('./utils/assertRevert');
const increaseTime = require('./utils/increaseTime.js').increaseTime;

const deployMarket = (owners,uintparams, feedsource, stockName,addressParams) => {
    return Market.new(owners,uintparams, feedsource, stockName,addressParams)
}
// const BN = web3.utils.BN;
// const utils = require('./utils')
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
    // let nowTime = new Date()/1000;
    // nowTime = parseInt(nowTime);
    // let thenTime = new BN(((nowTime/1+(300)).toString()));
    // let thenTime = new BN(((1585119864/1+(600)).toString()));
    // const uintparams = [1585121085,1585121385,1,2,1,7,1000000000000000,10000,2,2,100]
    // const feedsource  = "jonas"
    // const stockName =   "0x47"
    // const addressParams = ["0x81A69EE30637601356ff15d6c4a905079b53FCE1","0x81A69EE30637601356ff15d6c4a905079b53FCE1"]
    beforeEach(async () => {
        marketInstance = await Market.deployed()
        const addressOfMaster = marketInstance.address;
        // const balanceOfPool = await marketInstance.balanceOf(addressOfMaster)
        // console.log(balanceOfPool/1);
        // const marketAddress = await marketInstance.address()
        assert.ok(marketInstance)
    })
    it('set option price',async function(){
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
          assert.equal(options7[1]/1,999999999999)
  
    })

    // test case for when  option 1 win
    // it('place bet from nine users with 2% commision and 2% donation',async function() {

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
    //   const ClaimDonation = await web3.eth.getBalance("0x81A69EE30637601356ff15d6c4a905079b53FCE1")

    //   await increaseTime(1800);
    //   await marketInstance._closeBet(100);


    //   const ClaimDonation1 = await web3.eth.getBalance("0x81A69EE30637601356ff15d6c4a905079b53FCE1")
    //   assert.equal(ClaimDonation1/1,ClaimDonation/1+1.24e+18)
     
    //   const beforeClaimUser1 = await web3.eth.getBalance(user1);
    //   await marketInstance.claimReward({from: user1});
    //   const afterClaimUser1 = await web3.eth.getBalance(user1);
    //   // 0.00107126
    //   // 29.87826087
    //   // 29.8771896096
    //   let num1 = (afterClaimUser1/1)/1e+18;
    //   let num = ((beforeClaimUser1/1)/1e18)/1+29.87826087-0.00107126;
    //   assert.equal(num1.toFixed(8),num.toFixed(8));

    //   const beforeClaimUser5 = await web3.eth.getBalance(user5);
    //   await marketInstance.claimReward({from: user5});
    //   const afterClaimUser5 = await web3.eth.getBalance(user5);
    //   // gas limit 0.00107126
    //   // it should be add this ammount 7.043478261
    //   // 7.04240700087 but it adding this
    //   let num2 = (afterClaimUser5/1)/1e+18;
    //   let num3 = ((beforeClaimUser5/1)/1e18)/1+6.88173913-0.00107126;
    //   assert.equal(num2.toFixed(8),num3.toFixed(8));
    // })

    // test case for 0% commision and 0% donation 
  it('place bet from nine users with 0% commision and 0% Donation',async function() {

      await marketInstance.setPrice(1,10);
      const getPrice = await marketInstance.getPrice(1);
      assert.equal(getPrice/1,10);

      await marketInstance.placeBet(1,{value: 4000000000000000000,from: user1});
      const afterPlaceBetUser1 = await web3.eth.getBalance(user1);
      const getbrttingpoint  = await marketInstance.userBettingPoints(user1,1);
      assert.equal(getbrttingpoint/1,400);

      await marketInstance.setPrice(2,20);
      const getPrice1 = await marketInstance.getPrice(2);
      assert.equal(getPrice1/1,20);
      await marketInstance.placeBet(2,{value: 6000000000000000000,from: user2});
      const getbrttingpoint1 = await marketInstance.userBettingPoints(user2,2);
      assert.equal(getbrttingpoint1/1,300);

      await marketInstance.setPrice(3,30);
      const getPrice2 = await marketInstance.getPrice(3);
      assert.equal(getPrice2/1,30);
      await marketInstance.placeBet(3,{value: 2000000000000000000,from: user3});
      const getbrttingpoint2 = await marketInstance.userBettingPoints(user3,3);
      assert.equal(getbrttingpoint2/1,66);

      await marketInstance.setPrice(4,40);
      const getPrice3 = await marketInstance.getPrice(4);
      assert.equal(getPrice3/1,40);
      await marketInstance.placeBet(4,{value: 4000000000000000000,from: user4});
      const getbrttingpoint3 = await marketInstance.userBettingPoints(user4,4);
      assert.equal(getbrttingpoint3/1,100);

      await marketInstance.setPrice(1,50);
      const getPrice4 = await marketInstance.getPrice(1);
      assert.equal(getPrice4/1,50);
      await marketInstance.placeBet(1,{value: 3000000000000000000,from: user5});
      const getbrttingpoint4 = await marketInstance.userBettingPoints(user5,1);
      assert.equal(getbrttingpoint4/1,60);

      await marketInstance.setPrice(2,20);
      const getPrice5 = await marketInstance.getPrice(2);
      assert.equal(getPrice5/1,20);
      await marketInstance.placeBet(2,{value: 2000000000000000000,from: user6});
      const getbrttingpoint5 = await marketInstance.userBettingPoints(user6,2);
      assert.equal(getbrttingpoint5/1,100);

      await marketInstance.setPrice(5,30);
      const getPrice6 = await marketInstance.getPrice(5);
      assert.equal(getPrice6/1,30);
      await marketInstance.placeBet(5,{value: 5000000000000000000,from: user7});
      const getbrttingpoint6 = await marketInstance.userBettingPoints(user7,5);
      assert.equal(getbrttingpoint6/1,166);

      await marketInstance.setPrice(6,20);
      const getPrice7 = await marketInstance.getPrice(6);
      assert.equal(getPrice7/1,20);
      await marketInstance.placeBet(6,{value: 5000000000000000000,from: user8});
      const getbrttingpoint7 = await marketInstance.userBettingPoints(user8,6);
      assert.equal(getbrttingpoint7/1,250);

      await marketInstance.setPrice(7,50);
      const getPrice8= await marketInstance.getPrice(7);
      assert.equal(getPrice8/1,50);
      await marketInstance.placeBet(7,{value: 7000000000000000000,from: user9}); 
      const getbrttingpoint8 = await marketInstance.userBettingPoints(user9,7);   
      assert.equal(getbrttingpoint8/1,140);
      const ClaimDonation = await web3.eth.getBalance("0x81A69EE30637601356ff15d6c4a905079b53FCE1")
      await increaseTime(3610);
      await marketInstance._closeBet(100);
      const ClaimDonation1 = await web3.eth.getBalance("0x81A69EE30637601356ff15d6c4a905079b53FCE1")
      assert.equal(ClaimDonation1/1,ClaimDonation/1)
     
      const beforeClaimUser1 = await web3.eth.getBalance(user1);
      await marketInstance.claimReward({from: user1});
      const afterClaimUser1 = await web3.eth.getBalance(user1);
      // user1 balance before close bet 95.83785637999999
      // user1 balance after  close bet 126.79330685913044
      // 30.95652174 difference should be this 
      // 30.9554504791 but it coming this
      //  taking gas limit to performing this task 0.00107126
      let num1 = (afterClaimUser1/1)/1e+18;
      let num = ((beforeClaimUser1/1)/1e18)/1+30.95652174-0.00107126
      assert.equal(num1.toFixed(8),num.toFixed(8));
      const beforeClaimUser5 = await web3.eth.getBalance(user5);
      const txInfo = await marketInstance.claimReward({from: user5});
      const tx = await web3.eth.getTransaction(txInfo.tx);
      const gasCost = tx.gasPrice * txInfo.receipt.gasUsed
      // 0.00107126
      const afterClaimUser5 = await web3.eth.getBalance(user5);
      // await marketInstance.claimReward({from: user5});
      // const afterClaimUser5 = await web3.eth.getBalance(user5);

      // user5 balance before close bet 96.99844780000001
      // user5 balance after  close bet 104.04085480086957
      // it should be add this ammount 7.043478261
      // 7.04240700087 but it adding this
      let num2 = (afterClaimUser5/1)/1e+18;
      let num3 = ((beforeClaimUser5/1)/1e18)/1+7.043478261-0.00107126;
      assert.equal(num2.toFixed(8),num3.toFixed(8));

  })
     
     
})
