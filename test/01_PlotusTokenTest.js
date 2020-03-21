const PlotusToken = artifacts.require('PlotusToken');
const web3 = PlotusToken.web3
const utils = require('./utils')
const BN = web3.utils.BN;
const { ether, toHex, toWei } = require('./utils/ethTools');
const { assertRevert } =  require('./utils/assertRevert')

const deployPlotusToken = (owners,  tokenPrice,  supply ,names , symbols , decimals) => {
    return PlotusToken.new(owners,  tokenPrice,  supply ,names , symbols , decimals)
}
// const BN = web3.utils.BN;
// const utils = require('./utils')
// const utils = require('./utils')
const ONE_DAY = 24*3600

contract('PlotusToken', function([
  user1,
  user2,
  operator2,
  operator
]) {
	let PlotusTokenInstance 
    const tokenPrice = 1000
    const supply  = 1000000000000000000000
    const names = ["PLOTUSS", "PLOTUS"]
    const symbols = ["PLOTUSS", "PLOTUS"]
    const decimals = 18
   
    beforeEach(async () => {
        PlotusTokenInstance = await PlotusToken.deployed()
        assert.ok(PlotusTokenInstance)
    })
    // it('operator cant be null address', async function() {
    //   const operator = await PlotusTokenInstance.operator();
    //   assert.notEqual(operator,"0x0000000000000000000000000000000000000000");     
    // })

    it('change operator cant be null address', async function() {
      const newOperator = await PlotusTokenInstance.changeOperator(operator2);
      const operator = await PlotusTokenInstance.operator();
      assert.equal(operator2,operator)
    })
    // toWei(10)
    // assert.equal(parseInt((checkETHs/1+toWei(10))/1e18),parseInt(checkETH1s/1e18));
    it('total Supply', async function() {
      const supply = await PlotusTokenInstance.totalSupply()
      assert.equal(parseFloat(supply),1000000000000000000000)
    })

    it('check owner balance', async function() {
      const check = await PlotusTokenInstance.balanceOf(user1);
      assert.equal(check/1,1000*1e18)
    })

    it('give allowances permission', async function() {
      const checkAllowance = await PlotusTokenInstance.allowance(user1, user2)
      assert.equal(checkAllowance,0)
    })

    it('give approval for txn limit', async function() {  
      await PlotusTokenInstance.approve( user2,1000)
      let txnLimit = await PlotusTokenInstance.allowance(user1,user2);
      assert.equal(txnLimit/1,1000)
    })   
// it('increase allowance for txn limit', async function() {
//       await hopcoinInstance.increaseAllowance( user2, 10000)
//       let txnLimit = await hopcoinInstance.allowance(user1,user2);
//       assert.equal(txnLimit,25000)

//     }) 
//       it('decrease allowance for txn limit', async function() {
//       await hopcoinInstance.decreaseAllowance( user2, 1000)
//       let txnLimit = await hopcoinInstance.allowance(user1,user2);
//       assert.equal(txnLimit,24000)

//     })  
     

    it('transfer', async function(){
      assertRevert(PlotusTokenInstance.transfer(user2,"10000000000000000000"));
    })  
   
    it('burn', async function(){
       let checkAllowance = await PlotusTokenInstance.allowance(user1,user2) 
       let user1BalBeforeBurn = await PlotusTokenInstance.balanceOf(user1);
       await PlotusTokenInstance.burn("10000000000000000000")
       let user1BalAfterBurn = await PlotusTokenInstance.balanceOf(user1);
       assert.equal(user1BalBeforeBurn/1-10000000000000000000,user1BalAfterBurn)
  
    })  

    it('burn from',async function(){
       let checkAllowance = await PlotusTokenInstance.allowance(user1,user2) 
       let user1BalBeforeBurnFrom = await PlotusTokenInstance.balanceOf(user1);
       await PlotusTokenInstance.burnFrom(user1,"1000",{from:user2})
       let user1BalAfterBurnFrom = await PlotusTokenInstance.balanceOf(user1);
       assert.equal(user1BalBeforeBurnFrom/1-1000,user1BalAfterBurnFrom)
  
     })  
        
    it('Mint', async function(){
        let checkAllowance = await PlotusTokenInstance.allowance(user1,user2) 
        let operator =await PlotusTokenInstance.operator()
        let user1BalBeforeMint = await PlotusTokenInstance.balanceOf(user1);
        await PlotusTokenInstance.mint(user1,"1000",{from: operator2})
        let user1BalAfterMint = await PlotusTokenInstance.balanceOf(user1);
        assert.equal(user1BalBeforeMint/1-1000,user1BalAfterMint)
        let BeforeMint = await PlotusTokenInstance.balanceOf(user2);
        await PlotusTokenInstance.mint(user2,"1000",{from: operator2})
        let AfterMint = await PlotusTokenInstance.balanceOf(user2);
        assert.equal(BeforeMint/1+1000,AfterMint)
     })
    it('lock token', async function(){
      let lockToken = await PlotusTokenInstance.lock()
    })

    it('transfer from',async function(){
       assertRevert(PlotusTokenInstance.transferFrom(user1,user2,"1000",{from:user2}))
    })      
})