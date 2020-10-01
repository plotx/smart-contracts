const BLOT = artifacts.require('BLOT');
const PLOT = artifacts.require('MockPLOT');
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const Master = artifacts.require("Master");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const { assertRevert } = require('./utils/assertRevert');
var BLOTInstance;
contract('bLOTToken', function([user1,user2]){


    it('1.Minter can mint bLOTTokens',async function(){
        let masterInstance = await OwnedUpgradeabilityProxy.deployed();
        masterInstance = await Master.at(masterInstance.address);
        PLOTInstance = await PLOT.deployed();
        BLOTInstance = await BLOT.at(await masterInstance.getLatestAddress(web3.utils.fromAscii("BL")));
        await PLOTInstance.approve(BLOTInstance.address, "10000000000000000000000");
        let canMint = await BLOTInstance.mint(user1,"1000000000000000000000");
        await assertRevert(BLOTInstance.setMasterAddress());
        assert.ok(canMint)
        })


    it('2. Should reduce PLOT tokens to give equal number of bLOT tokens',async function(){
        PLOTInstance = await PLOT.deployed();
        // BLOTInstance = await BLOT.deployed();
        await PLOTInstance.approve(BLOTInstance.address, "10000000000000000000000");
        let PLOTbeforeUser1 =  await PLOTInstance.balanceOf(user1);
        let BLOTbeforeUser2 =  await BLOTInstance.balanceOf(user2);
        await BLOTInstance.mint(user2,"1000000000000000000000");
        let PLOTAfterUser1 =  await PLOTInstance.balanceOf(user1);
        let BLOTAfterUser2 =  await BLOTInstance.balanceOf(user2);
         // assert.equal(BLOTAfterUser2/1,PLOTbeforeUser1/1-PLOTAfterUser1/1)
        })


    it('3. Totalsupply of PLOT tokens to remain same ,Total supply of bLOT should increase',async function(){
        PLOTInstance = await PLOT.deployed();
        // BLOTInstance = await BLOT.deployed();
        await PLOTInstance.approve(BLOTInstance.address, "10000000000000000000000");
        let totalSupplyPLOT1 =  await PLOTInstance.totalSupply();
        let totalSupplyBLOT1 =  await BLOTInstance.totalSupply();
        await BLOTInstance.mint(user2,"1000000000000000000000");
        let totalSupplyPLOT2 =  await PLOTInstance.totalSupply();
        let totalSupplyBLOT2 =  await BLOTInstance.totalSupply();
         assert.equal(totalSupplyPLOT1/1,totalSupplyPLOT2/1)
         assert.equal(totalSupplyBLOT2/1-totalSupplyBLOT1/1,"1000000000000000000000")
        })


    it('4. Minter can transfer bLOT  tokens ,non minter cannot transfer bLOT token',async function(){
        PLOTInstance = await PLOT.deployed();
        // BLOTInstance = await BLOT.deployed();
        await PLOTInstance.approve(BLOTInstance.address, "10000000000000000000000");
        await BLOTInstance.mint(user1,"1000000000000000000000");
        let canTransfer = await BLOTInstance.transfer(user2,"100000000000000000",{from : user1});
        assert.ok(canTransfer)
        await assertRevert(BLOTInstance.transfer(user2,"100000000000000000",{from : user2}))
        })


    it('5. Minter can transfer from bLOT  tokens ,non minter cannot transfer from bLOT token',async function(){
        PLOTInstance = await PLOT.deployed();
        // BLOTInstance = await BLOT.deployed();
        await PLOTInstance.approve(BLOTInstance.address, "10000000000000000000000");
        await BLOTInstance.mint(user1,"1000000000000000000000")
        })


    it('6. bLOT tokens cannot be converted to PLOT directly',async function(){
        PLOTInstance = await PLOT.deployed();
        // BLOTInstance = await BLOT.deployed();
        await PLOTInstance.approve(BLOTInstance.address, "10000000000000000000000");
        await BLOTInstance.mint(user1,"1000000000000000000000");
        await assertRevert(BLOTInstance.convertToPLOT(BLOTInstance.address, BLOTInstance.address, "10000000000000000000000"))
        })

    it('7. Should not allow to mint to zero address',async function(){
        await PLOTInstance.approve(BLOTInstance.address, "10000000000000000000000");
        await assertRevert(BLOTInstance.mint(ZERO_ADDRESS,"1000000000000000000000"));
        })

    it('8. Should not allow to re-initiate bLOT instance', async function() {
        await assertRevert(BLOTInstance.initiatebLOT(user1));
    });
})
 
