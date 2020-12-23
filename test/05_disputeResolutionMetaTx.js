const { assert } = require("chai");
const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');
const Market = artifacts.require("MockMarket");
const Master = artifacts.require("Master");
const AllMarkets = artifacts.require("MockAllMarkets");
const web3 = Market.web3;
const encode = require("./utils/encoder.js").encode;
const encode1 = require("./utils/encoder.js").encode1;
const {toHex, toWei, toChecksumAddress} = require('./utils/ethTools');
const { assertRevert } = require('./utils/assertRevert');
let gv,masterInstance, tokenController, mr;
const signAndExecuteMetaTx = require("./utils/signAndExecuteMetaTx.js").signAndExecuteMetaTx;

contract("Market", ([user1,user2])=>{
      
   
    describe("Meta tx test",()=>{
        it("should create a market with meta transaction", async function(){

            masterInstance = await OwnedUpgradeabilityProxy.deployed();
            masterInstance = await Master.at(masterInstance.address); 

            let allMarkets = await masterInstance.getLatestAddress(web3.utils.toHex("AM"));
            allMarkets = await AllMarkets.at(allMarkets);

            let functionSignature = encode("createMarket(uint256,uint256)", 0, 0);        
            await signAndExecuteMetaTx(
              "fb437e3e01939d9d4fef43138249f23dc1d0852e69b0b5d1647c087f869fabbd",              
              user1,
              functionSignature,
              allMarkets
            );
            assert.equal(0,0);
        })
    })
    
  })
