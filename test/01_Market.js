const Market  = artifacts.require('Market');
const web3 = Market.web3
const market = artifacts.require('Market');
const utils = require('./utils')
const BN = web3.utils.BN;
const { ether, toHex, toWei } = require('./utils/ethTools');
const { assertRevert } =  require('./utils/assertRevert')

// const deployPlotusToken = (owners,  tokenPrice,  supply ,names , symbols , decimals) => {
//     return PlotusToken.new(owners,  tokenPrice,  supply ,names , symbols , decimals)
// }
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
    let nowTime = new Date()/1000;
    nowTime = parseInt(nowTime);
    let thenTime = new BN(((nowTime/1+(3600)).toString()));
    const uintparams = [nowTime,thenTime,1,2,1,7,1000000000000000,10000,2,2,100]
    const feedsource  = "jonas"
    const stockName = "0x47"
    const addressParams = ["0x81A69EE30637601356ff15d6c4a905079b53FCE1","0x81A69EE30637601356ff15d6c4a905079b53FCE1"]
    beforeEach(async () => {
        marketInstance = await Market.deployed()
        // console.log(marketInstance.address)
        assert.ok(marketInstance)
    })

    it('set price of option',async function() {

      await marketInstance.setPrice(1,10);
      const getPrice = await marketInstance.getPrice(1);
      assert.equal(getPrice/1,10);
      // await marketInstance.setPrice(1,20);
      // const getPrice2 = await marketInstance.getPrice(1);
      // assert.equal(getPrice2/1,20);
      
    })

    it('user bet points',async function() {
      // await marketInstance.setPrice(7,10);
      // const getPrice = await marketInstance.getPrice(7);
      await marketInstance.placeBet(1,{value: 1,from: user1});
      const getbrttingpoint = await marketInstance.userBettingPoints(user1,1);
      assert.equal(getbrttingpoint/1,100);
      // await marketInstance.placeBet(1,{value: 1,from: user5});
      // const getbrttingpoint1 = await marketInstance.userBettingPoints(user5,1);
      // console.log(getbrttingpoint1/1)
      // assert.equal(getbrttingpoint1/1,50000000000000000);
    }) 
     
})