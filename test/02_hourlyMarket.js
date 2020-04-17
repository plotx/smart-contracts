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

contract('Hourly Market', function([
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
    it('get option price',async function(){

        let nowTime = new Date()/1000;
        nowTime = parseInt(nowTime);
        const start = nowTime/1 + 10;
        masterInstance = await Master.deployed();
        plotusNewAddress = await masterInstance.plotusAddress(); 
        plotusNewInstance = await Plotus.at(plotusNewAddress);
        const addNewMarket = await plotusNewInstance.addNewMarket([start,0,2,0,7,1000000000000000,10000,2,2,100,5,10],"firstBet","0x47",["0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567","0xcd7e5d0cF2908850D185Ee9cc6377D6bb6DF0567"])
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
        await increaseTime(600+11);
        await marketInstance.setCurrentPrice(10215);
        // console.log((await marketInstance._getDistance(1))/1)
        
        
        // 
        // await marketInstance.placeBet(1,{value: 0,from: user1});
        const getPrice = await marketInstance.getPrice(1);
        console.log(getPrice/1)
        // assert.equal(getPrice/1,6)
        const afterPlaceBetUser1 = await web3.eth.getBalance(user1);
        // const getbrttingpoint  = await,0);
        // const getprice

        // await marketInstance.placeBet(2,{value: 0,from: user2});
        const getPrice1 = await marketInstance.getPrice(2);
        console.log(getPrice1/1)
        // assert.equal(getPrice1,13)
        // const getbrttingpoint1 = await marketInstance.userBettingPoints(user2,2);
        // assert.equal(getbrttingpoint1/1,0);
  
        // await marketInstance.placeBet(3,{value: 0,from: user3});
        const getPrice2 = await marketInstance.getPrice(3);
        console.log(getPrice2/1)
        // assert.equal(getPrice2,20);
        // const getbrttingpoint2 = await marketInstance.userBettingPoints(user3,3);
        // assert.equal(getbrttingpoint2/1,0);
  

        // await marketInstance.placeBet(4,{value: 0,from: user4});
        const getPrice3 = await marketInstance.getPrice(4);
        console.log(getPrice3/1)
        // assert.equal(getPrice3,27)
        // const getbrttingpoint3 = await marketInstance.userBettingPoints(user4,4);
        // assert.equal(getbrttingpoint3/1,0);
  
      
        // await marketInstance.placeBet(5,{value: 0,from: user5});
        const getPrice4 = await marketInstance.getPrice(5);
        console.log(getPrice4/1);
        // assert.equal(getPrice4,34)
        // const getbrttingpoint4 = await marketInstance.userBettingPoints(user5,5);
        // assert.equal(getbrttingpoint4/1,0);

        // await marketInstance.placeBet(6,{value: 0,from: user6});
        const getPrice5 = await marketInstance.getPrice(6);
        console.log(getPrice5/1);
        // assert.equal(getPrice5,41)
        // const getbrttingpoint5 = await marketInstance.userBettingPoints(user6,6);
        // assert.equal(getbrttingpoint5/1,0);


        // await marketInstance.placeBet(7,{value: 0,from: user7});
        const getPrice6 = await marketInstance.getPrice(7);
        console.log(getPrice6/1);
        // assert.equal(getPrice6,34)
        // const getbrttingpoint6 = await marketInstance.userBettingPoints(user7,7);
        // assert.equal(getbrttingpoint6/1,0);

        // await marketInstance.placeBet(1,{value: 0,from: user8});
        // const getPrice7 = await marketInstance.getPrice(1);
        // assert.equal(getPrice7,6)
        // const getbrttingpoint7= await marketInstance.userBettingPoints(user8,1);
        // assert.equal(getbrttingpoint7/1,0);

        // // await marketInstance.placeBet(2,{value: 0,from: user9});
        // const getPrice8 = await marketInstance.getPrice(2);
        // assert.equal(getPrice8,13)
        // const getbrttingpoint8 = await marketInstance.userBettingPoints(user9,2);
        // assert.equal(getbrttingpoint8/1,0);
    })

    
 })
