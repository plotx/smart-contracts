const Staking = artifacts.require("Staking");
const UniswapETH_Plot = artifacts.require("TokenMock");
const PlotusToken = artifacts.require('PlotXToken');
const MockStaking = artifacts.require('MockStaking');
const BN = web3.utils.BN;
const { toHex, toWei } = require("./utils/ethTools.js");
const expectEvent = require("./utils/expectEvent");
const advanceToBlock = require("./utils/advanceToBlock.js").advanceToBlock;
// const advanceToBlock = require("./utils/advanceToBlock.js").advanceToBlock;
const assertRevert = require("./utils/assertRevert.js").assertRevert;
const DummyTokenMock = artifacts.require('DummyTokenMock');
const latestTime = require("./utils/latestTime.js").latestTime;
const nullAddress = "0x0000000000000000000000000000000000000000";

async function evm_mine(blocks) {
  for (let i = 0; i < blocks; ++i)
    await web3.currentProvider.send(
      { jsonrpc: "2.0", method: "evm_mine", id: 123 },
      () => {}
    );
}

contract("InterestDistribution - Scenario based calculations for staking model", ([S1, S2, S3, vaultAdd]) => {
  let stakeTok,
      plotusToken,
      staking,
      stakeStartTime,
      dummystakeTok,
      dummyRewardTok,
      dummyStaking;

    before(async () => {
      
      stakeTok = await UniswapETH_Plot.new("UEP","UEP");
      plotusToken = await PlotusToken.new(toWei(30000000));
      dummystakeTok = await DummyTokenMock.new("UEP","UEP");
      dummyRewardTok = await DummyTokenMock.new("PLT","PLT");
      let nowTime = await latestTime();
      console.log((await web3.eth.getBlock('latest')).number);
      staking = await Staking.new(stakeTok.address, plotusToken.address, 100, toWei(500000), ((await web3.eth.getBlock('latest')).number)/1+4, vaultAdd);

      dummyStaking = await MockStaking.new(dummystakeTok.address, dummyRewardTok.address, 100, toWei(500000), ((await web3.eth.getBlock('latest')).number)/1+1, vaultAdd);

      await plotusToken.transfer(staking.address, toWei(500000));

      await dummyRewardTok.mint(dummyStaking.address, toWei(500000));
      await dummystakeTok.mint(dummyStaking.address, toWei(100));
      
      await stakeTok.mint(S1, toWei("1000"));
      await stakeTok.mint(S2, toWei("1000"));
      await stakeTok.mint(S3, toWei("1000"));
      await stakeTok.approve(staking.address, toWei("10000", "ether"), {
        from: S1
      });
      await stakeTok.approve(staking.address, toWei("10000", "ether"), {
        from: S2
      });
      await stakeTok.approve(staking.address, toWei("10000", "ether"), {
        from: S3
      });

      stakeStartTime = (await staking.stakingStartBlock())/1;
      
    });
  describe('Multiple Staker stakes, no withdrawal', function() {
    
    it("Staker 1 stakes 100 Token after 10th block", async () => {

      let beforeStakeTokBal = await stakeTok.balanceOf(S1);
      let beforeStakeTokBalStaking = await stakeTok.balanceOf(staking.address);
      let vaultBal = await plotusToken.balanceOf(vaultAdd);
      // increase block
      await evm_mine(stakeStartTime/1+9-(await web3.eth.getBlock('latest')).number);
      /**
        * S1 stakes 100 tokens
        */
        await staking.stake(toWei("100"), {
          from: S1
        });

        let vaultBalAfter = await plotusToken.balanceOf(vaultAdd);

        let afterStakeTokBal = await stakeTok.balanceOf(S1);

        let afterStakeTokBalStaking = await stakeTok.balanceOf(staking.address);

        expect((beforeStakeTokBal - afterStakeTokBal)).to.be.equal((toWei("100", "ether"))/1);
        expect((afterStakeTokBalStaking - beforeStakeTokBalStaking)).to.be.equal((toWei("100", "ether"))/1); 
        expect((vaultBalAfter - vaultBal)).to.be.equal((toWei("50000", "ether"))/1);


        let stakerData = await staking.getStakerData(S1);
        let interestData = await staking.interestData();
        let yieldData = await staking.getYieldData(S1);

        // 1st stake so globalTotalStake is 0, hence 
        // globalYieldPerToken and gdYieldRate are  0.
        expect((yieldData[0]).toString()).to.be.equal("0");
        expect((yieldData[1]).toString()).to.be.equal("0");

        // globalTotalStake
        expect((interestData[0]).toString()).to.be.equal(toWei("100", "ether")); 
        

        // totalStake of S1
        expect((stakerData[0]).toString()).to.be.equal(toWei("100", "ether")); 
    });

    it("Staker 2 stakes 50 Token at 15th block", async () => {

      let beforeStakeTokBal = await stakeTok.balanceOf(S2);

      let beforeStakeTokBalStaking = await stakeTok.balanceOf(staking.address);
      
      // increase block
      await evm_mine(stakeStartTime/1+14-(await web3.eth.getBlock('latest')).number);


      /**
        * S2 stakes 50 tokens
        */
        await staking.stake(toWei("50"), {
          from: S2
        });


        let afterStakeTokBal = await stakeTok.balanceOf(S2);

        let afterStakeTokBalStaking = await stakeTok.balanceOf(staking.address);

        expect((beforeStakeTokBal - afterStakeTokBal)).to.be.equal((toWei("50", "ether"))/1);
        expect((afterStakeTokBalStaking - beforeStakeTokBalStaking)).to.be.equal((toWei("50", "ether"))/1); 

        let stakerData = await staking.getStakerData(S2);
        let interestData = await staking.interestData();
        let yieldData = await staking.getYieldData(S2);
        expect((Math.floor(yieldData[0]/1e18)).toString()).to.be.equal("250");
        expect(((Math.round(yieldData[1]/1e18)).toString())).to.be.equal("12500");

        // globalTotalStake
        expect((interestData[0]).toString()).to.be.equal(web3.utils.toWei("150", "ether")); 

        // totalStake of S2
        expect((stakerData[0]).toString()).to.be.equal(web3.utils.toWei("50", "ether")); 
 
    });

    it("Staker 3 stakes 360 Token at 20th block", async () => {

      
      let beforeStakeTokBal = await stakeTok.balanceOf(S3);

      let beforeStakeTokBalStaking = await stakeTok.balanceOf(staking.address);

      // increase block
      await evm_mine(stakeStartTime/1+19-(await web3.eth.getBlock('latest')).number);
      
      await staking.stake(toWei("360"), {
          from: S3
        });

        let afterStakeTokBal = await stakeTok.balanceOf(S3);

        let afterStakeTokBalStaking = await stakeTok.balanceOf(staking.address);

        expect((beforeStakeTokBal - afterStakeTokBal)).to.be.equal((toWei("360", "ether"))/1);
        expect((afterStakeTokBalStaking - beforeStakeTokBalStaking)).to.be.equal((toWei("360", "ether"))/1);  

        let stakerData = await staking.getStakerData(S3);
        let interestData = await staking.interestData();
        let yieldData = await staking.getYieldData(S3);
   
        expect((Math.floor(yieldData[0]/1e18)).toString()).to.be.equal("416");
        expect((Math.floor(yieldData[1]/1e18)).toString()).to.be.equal("150000");

        // globalTotalStake
        expect((interestData[0]).toString()).to.be.equal(toWei("510")); 
        

        // totalStake of S3
        expect((stakerData[0]).toString()).to.be.equal(toWei("360")); 
        
    });

    it("Staker 1 again stakes 250 Token 30th block", async () => {

      let beforeStakeTokBal = await stakeTok.balanceOf(S1);

      let beforeStakeTokBalStaking = await stakeTok.balanceOf(staking.address);

      // increase block
      await evm_mine(stakeStartTime/1+29-(await web3.eth.getBlock('latest')).number);

      
      await staking.stake(toWei("250"), {
          from: S1
        });

        let afterStakeTokBal = await stakeTok.balanceOf(S1);

        let afterStakeTokBalStaking = await stakeTok.balanceOf(staking.address);

        expect((beforeStakeTokBal - afterStakeTokBal)).to.be.equal((toWei("250"))/1);
        expect((afterStakeTokBalStaking - beforeStakeTokBalStaking)).to.be.equal((toWei("250"))/1);   

        let stakerData = await staking.getStakerData(S1);
        let interestData = await staking.interestData();
        let yieldData = await staking.getYieldData(S1);

        expect((Math.floor(yieldData[0]/1e18)).toString()).to.be.equal("514");
        expect((Math.floor(yieldData[1]/1e18)).toString()).to.be.equal("128676");

        // globalTotalStake
        expect((interestData[0]).toString()).to.be.equal(web3.utils.toWei("760", "ether")); 
        

        // totalStake of S1
        expect((stakerData[0]).toString()).to.be.equal(web3.utils.toWei("350", "ether")); 
      
    });

    it("Computing updated yield data at 32th block", async () => {

      // increase block
      await evm_mine(stakeStartTime/1+31-(await web3.eth.getBlock('latest')).number);

      let statsDta = await staking.getStatsData(S1);


      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("760");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("212654");
      expect((Math.round((statsDta[3])/1e18)).toString()).to.be.equal("155000");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("53773");

      statsDta = await staking.getStatsData(S2);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("760");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("36261");
      expect((Math.round((statsDta[3])/1e18)).toString()).to.be.equal("155000");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("13564");

      statsDta = await staking.getStatsData(S3);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("760");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("201083");
      expect((Math.round((statsDta[3])/1e18)).toString()).to.be.equal("155000");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("37662");

          
      await staking
          .updateGlobalYield()
          .catch(e => e);

      
      let interestData = await staking.interestData();
            
      expect(((Math.floor(interestData[1]/1e18)).toString())).to.be.equal("527");

      // globalTotalStake
      expect((interestData[0]).toString()).to.be.equal(web3.utils.toWei("760", "ether")); 
      
      
      expect((Math.floor((await staking.calculateInterest(S1))/1e18)).toString()).to.be.equal("56075");
      
      expect((Math.floor((await staking.calculateInterest(S2))/1e18)).toString()).to.be.equal("13893");
      
      expect((Math.floor((await staking.calculateInterest(S3))/1e18)).toString()).to.be.equal("40030");
    });
  });

  describe('Few stakers stake and Few staker withdraw Interest', function() {
    it("Staker 1 stakes 60 Token at 33th block", async () => {

      let beforeStakeTokBal = await stakeTok.balanceOf(S1);

      let beforeStakeTokBalStaking = await stakeTok.balanceOf(staking.address);

      // increase block
      await evm_mine(stakeStartTime/1+32-(await web3.eth.getBlock('latest')).number);

      
        await staking.stake(toWei("60"), {
          from: S1
        });

        let afterStakeTokBal = await stakeTok.balanceOf(S1);

        let afterStakeTokBalStaking = await stakeTok.balanceOf(staking.address);

        expect((beforeStakeTokBal - afterStakeTokBal)).to.be.equal((toWei("60", "ether"))/1);
        expect((afterStakeTokBalStaking - beforeStakeTokBalStaking)).to.be.equal((toWei("60", "ether"))/1);   


        let stakerData = await staking.getStakerData(S1);
        let interestData = await staking.interestData();
        let yieldData = await staking.getYieldData(S1);

           
        expect(((Math.floor(yieldData[0]/1e18)).toString())).to.be.equal("534");
        expect((Math.floor(yieldData[1]/1e18)).toString()).to.be.equal("160743");

        // globalTotalStake
        expect((interestData[0]).toString()).to.be.equal(toWei("820")); 
        

        // totalStake of S1
        expect((stakerData[0]).toString()).to.be.equal(web3.utils.toWei("410", "ether")); 
        
    });

    it("Staker 2 Withdraws their share of interest at 34th block", async () => {

      let beforePlotBal = await plotusToken.balanceOf(S2);

      // increase block
      await evm_mine(stakeStartTime/1+33-(await web3.eth.getBlock('latest')).number);

      await staking.withdrawInterest( {
          from: S2
        });

        let afterPlotBal = await plotusToken.balanceOf(S2);

        expect((Math.floor((afterPlotBal - beforePlotBal)/1e18)).toString()).to.be.equal("14527"); 


        let stakerData = await staking.getStakerData(S2);
        let interestData = await staking.interestData();
        let yieldData = await staking.getYieldData(S2);

             
        expect((Math.floor(yieldData[0]/1e18)).toString()).to.be.equal("540");

        // globalTotalStake
        expect((interestData[0]).toString()).to.be.equal(web3.utils.toWei("820", "ether")); 
        
        // totalStake of S2
        expect((stakerData[0]).toString()).to.be.equal(web3.utils.toWei("50", "ether")); 

        
        expect((Math.floor((stakerData[1])/1e18)).toString()).to.be.equal("14527");
    });

    it("Staker 3 Withdraws their share of interest at 40th block", async () => {

      let beforePlotBal = await plotusToken.balanceOf(S3);

      // increase block
      await evm_mine(stakeStartTime/1+39-(await web3.eth.getBlock('latest')).number);

      
        await staking.withdrawInterest( {
          from: S3
        });

        let afterPlotBal = await plotusToken.balanceOf(S3);

        expect((Math.floor((afterPlotBal - beforePlotBal)/1e18)).toString()).to.be.equal("57765");  

        let stakerData = await staking.getStakerData(S3);
        let interestData = await staking.interestData();
        let yieldData = await staking.getYieldData(S3);

          
        expect((Math.floor(yieldData[0]/1e18)).toString()).to.be.equal("577");

        // globalTotalStake
        expect((interestData[0]).toString()).to.be.equal(web3.utils.toWei("820", "ether")); 
        

        // totalStake of S3
        expect((stakerData[0]).toString()).to.be.equal(web3.utils.toWei("360", "ether")); 
        

        
        expect((Math.floor((stakerData[1])/1e18)).toString()).to.be.equal("57765"); 
    });

    it("Staker 2 stakes 100 Token at 42th block", async () => {

      let beforeStakeTokBal = await stakeTok.balanceOf(S2);

      let beforeStakeTokBalStaking = await stakeTok.balanceOf(staking.address);

      // increase block
      await evm_mine(stakeStartTime/1+41-(await web3.eth.getBlock('latest')).number);


      
        await staking.stake(toWei("100"), {
          from: S2
        });

        let afterStakeTokBal = await stakeTok.balanceOf(S2);

        let afterStakeTokBalStaking = await stakeTok.balanceOf(staking.address);

        expect((beforeStakeTokBal - afterStakeTokBal)).to.be.equal((toWei("100", "ether"))/1);
        expect((afterStakeTokBalStaking - beforeStakeTokBalStaking)).to.be.equal((toWei("100", "ether"))/1);   

        let stakerData = await staking.getStakerData(S2);
        let interestData = await staking.interestData();
        let yieldData = await staking.getYieldData(S2);

             
        expect((Math.floor(yieldData[0]/1e18)).toString()).to.be.equal("589");
        expect((Math.floor(yieldData[1]/1e18)).toString()).to.be.equal("71432");

        // globalTotalStake
        expect((interestData[0]).toString()).to.be.equal(web3.utils.toWei("920", "ether")); 
        
        // totalStake of S1
        expect((stakerData[0]).toString()).to.be.equal(web3.utils.toWei("150", "ether")); 
    });

    it("Computing updated yield data at 45th block", async () => {

      // increase block
      await evm_mine(stakeStartTime/1+44-(await web3.eth.getBlock('latest')).number);

      let statsDta = await staking.getStatsData(S1);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("920");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("210117");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("220000");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("85335");

      statsDta = await staking.getStatsData(S2);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("920");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("49721");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("220000");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("4069");

      statsDta = await staking.getStatsData(S3);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("920");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("117868");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("220000");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("8303");

         
      await staking
          .updateGlobalYield()
          .catch(e => e);

      let interestData = await staking.interestData();
      
          
      expect(((Math.floor(interestData[1]/1e18)).toString())).to.be.equal("605");

      // globalTotalStake
      expect((interestData[0]).toString()).to.be.equal(toWei("920")); 
      
      
      expect((Math.floor((await staking.calculateInterest(S1))/1e18)).toString()).to.be.equal("87563");
      
      expect((Math.floor((await staking.calculateInterest(S2))/1e18)).toString()).to.be.equal("4884");
      
      expect((Math.floor((await staking.calculateInterest(S3))/1e18)).toString()).to.be.equal("10259");
    });
  });

  describe('No one stakes in this cycle but time will increase so some interest will be generated', function() {
    it("Computing updated yield data at 50th block", async () => {

      // increase block
      await evm_mine(stakeStartTime/1+49-(await web3.eth.getBlock('latest')).number);

      let statsDta = await staking.getStatsData(S1);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("920");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("210117");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("245000");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("96476");

      statsDta = await staking.getStatsData(S2);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("920");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("49721");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("245000");
      expect(((Math.floor((statsDta[4])/1e18)).toString())).to.be.equal("8145");

      statsDta = await staking.getStatsData(S3);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("920");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("117868");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("245000");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("18085");
 
      await staking
          .updateGlobalYield()
          .catch(e => e);
      
      let interestData = await staking.interestData();
      
   
      expect((Math.floor(interestData[1]/1e18)).toString()).to.be.equal("632");

      // globalTotalStake
      expect((interestData[0]).toString()).to.be.equal(toWei("920")); 
      

      
      expect((Math.floor((await staking.calculateInterest(S1))/1e18)).toString()).to.be.equal("98704");
      
      expect(((Math.floor((await staking.calculateInterest(S2))/1e18)).toString())).to.be.equal("8960");
      
      expect((Math.floor((await staking.calculateInterest(S3))/1e18)).toString()).to.be.equal("20042");
    });
  });

  describe('Few stakers stakes and few staker withdraw Interest and stake', function() {
    it("Staker 1 Withdraws partial stake worth 150 Token at 60th block", async () => {

      let beforestakeTokBal = await stakeTok.balanceOf(S1);
      let beforePlotBal = await plotusToken.balanceOf(S1);

      let beforestakeTokBalStaking = await stakeTok.balanceOf(staking.address);
      let beforePlotBalStaking = await plotusToken.balanceOf(staking.address);

      // increase block
      await evm_mine(stakeStartTime/1+59-(await web3.eth.getBlock('latest')).number);

      
      await staking.withdrawStakeAndInterest(toWei("150"), {
          from: S1
          });

        
        let afterstakeTokBal = await stakeTok.balanceOf(S1);
        let afterPlotBal = await plotusToken.balanceOf(S1);

        let afterstakeTokBalStaking = await stakeTok.balanceOf(staking.address);
        let afterPlotBalStaking = await plotusToken.balanceOf(staking.address);

        expect((Math.floor((afterPlotBal - beforePlotBal)/1e18)).toString()).to.be.equal("120987");
        expect((Math.floor((beforePlotBalStaking - afterPlotBalStaking)/1e18)).toString()).to.be.equal("120987"); 

        expect((Math.floor((afterstakeTokBal - beforestakeTokBal)/1e18)).toString()).to.be.equal("150");
        expect((Math.floor((beforestakeTokBalStaking - afterstakeTokBalStaking)/1e18)).toString()).to.be.equal("150"); 

        let stakerData = await staking.getStakerData(S1);
        let interestData = await staking.interestData();
        let yieldData = await staking.getYieldData(S1);



        
        expect((Math.floor(yieldData[0]/1e18)).toString()).to.be.equal("687");
        expect((Math.floor(yieldData[1]/1e18)).toString()).to.be.equal("178658");

        // globalTotalStake
        expect((interestData[0]).toString()).to.be.equal(web3.utils.toWei("770", "ether")); 
        
        // totalStake of S1
        expect((stakerData[0]).toString()).to.be.equal(web3.utils.toWei("260", "ether")); 
    });

    it("Staker 2 Withdraws Entire stake worth 150 Token at 75th block", async () => {

      let beforestakeTokBal = await stakeTok.balanceOf(S2);
      let beforePlotBal = await plotusToken.balanceOf(S2);

      let beforestakeTokBalStaking = await stakeTok.balanceOf(staking.address);
      let beforePlotBalStaking = await plotusToken.balanceOf(staking.address);

      // increase block
      await evm_mine(stakeStartTime/1+74-(await web3.eth.getBlock('latest')).number);


      await staking.withdrawStakeAndInterest(toWei("150"), {
          from: S2
          });

      let afterstakeTokBal = await stakeTok.balanceOf(S2);
      let afterPlotBal = await plotusToken.balanceOf(S2);

      let afterstakeTokBalStaking = await stakeTok.balanceOf(staking.address);
      let afterPlotBalStaking = await plotusToken.balanceOf(staking.address);

      expect((Math.floor((afterPlotBal - beforePlotBal)/1e18)).toString()).to.be.equal("31723");
      expect((Math.floor((beforePlotBalStaking - afterPlotBalStaking)/1e18)).toString()).to.be.equal("31723"); 

      expect((Math.floor((afterstakeTokBal - beforestakeTokBal)/1e18)).toString()).to.be.equal("150");
      expect((Math.floor((beforestakeTokBalStaking - afterstakeTokBalStaking)/1e18)).toString()).to.be.equal("150"); 

      let stakerData = await staking.getStakerData(S2);
      let interestData = await staking.interestData();
      let yieldData = await staking.getYieldData(S2);

    
      expect((Math.floor(yieldData[0]/1e18)).toString()).to.be.equal("784");
      expect((Math.floor(yieldData[1]/1e18)).toString()).to.be.equal("0");

      // globalTotalStake
      expect((interestData[0]).toString()).to.be.equal(web3.utils.toWei("620", "ether")); 
      
      // totalStake of S2
      expect((stakerData[0]).toString()).to.be.equal(web3.utils.toWei("0", "ether"));    
    });

    it("Staker 3 stakes 100 Token at 90th block", async () => {

      let beforeStakeTokBal = await stakeTok.balanceOf(S3);

      let beforeStakeTokBalStaking = await stakeTok.balanceOf(staking.address);

      // increase block
      await evm_mine(stakeStartTime/1+89-(await web3.eth.getBlock('latest')).number);

      
      await staking.stake(toWei("100"), {
          from: S3
        });

        let afterStakeTokBal = await stakeTok.balanceOf(S3);

        let afterStakeTokBalStaking = await stakeTok.balanceOf(staking.address);

        expect((beforeStakeTokBal - afterStakeTokBal)).to.be.equal((toWei("100"))/1);
        expect((afterStakeTokBalStaking - beforeStakeTokBalStaking)).to.be.equal((toWei("100"))/1); 

        let stakerData = await staking.getStakerData(S3);
        let interestData = await staking.interestData();
        let yieldData = await staking.getYieldData(S3);

          
        expect((Math.floor(yieldData[0]/1e18)).toString()).to.be.equal("905");
        expect((Math.floor(yieldData[1]/1e18)).toString()).to.be.equal("240551");

        // globalTotalStake
        expect((interestData[0]).toString()).to.be.equal(toWei("720")); 
        

        // totalStake of S3
        expect((stakerData[0]).toString()).to.be.equal(web3.utils.toWei("460", "ether")); 
    });

    it("Staker 1 stakes 100 Token at 95th block", async () => {

      let beforeStakeTokBal = await stakeTok.balanceOf(S1);

      let beforeStakeTokBalStaking = await stakeTok.balanceOf(staking.address);

      // increase block
      await evm_mine(stakeStartTime/1+94-(await web3.eth.getBlock('latest')).number);

      
      await staking.stake(toWei("100"), {
          from: S1
        });

        let afterStakeTokBal = await stakeTok.balanceOf(S1);

        let afterStakeTokBalStaking = await stakeTok.balanceOf(staking.address);

        expect((beforeStakeTokBal - afterStakeTokBal)).to.be.equal((toWei("100"))/1);
        expect((afterStakeTokBalStaking - beforeStakeTokBalStaking)).to.be.equal((toWei("100"))/1); 

        let stakerData = await staking.getStakerData(S1);
        let interestData = await staking.interestData();
        let yieldData = await staking.getYieldData(S1);

          
        expect((Math.floor(yieldData[0]/1e18)).toString()).to.be.equal("940");
        expect((Math.floor(yieldData[1]/1e18)).toString()).to.be.equal("272682");

        // globalTotalStake
        expect((interestData[0]).toString()).to.be.equal(toWei("820")); 
        

        // totalStake of S1
        expect((stakerData[0]).toString()).to.be.equal(web3.utils.toWei("360", "ether")); 
    });

    it("Computing updated yield data at 100th block", async () => {

      // increase block
      await evm_mine(stakeStartTime/1+99-(await web3.eth.getBlock('latest')).number);

      let statsDta = await staking.getStatsData(S1);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("820");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("76779");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("495000");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("74584");

      statsDta = await staking.getStatsData(S2);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("820");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("0");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("495000");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("0");

      statsDta = await staking.getStatsData(S3);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("820");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("148217");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("495000");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("145412");

         
    
      await staking
          .updateGlobalYield()
          .catch(e => e);
          

      let interestData = await staking.interestData();


      
          
      expect((Math.floor(interestData[1]/1e18)).toString()).to.be.equal("970");

      // globalTotalStake
      expect((interestData[0]).toString()).to.be.equal(web3.utils.toWei("820", "ether")); 
    
      
      expect((Math.floor((await staking.calculateInterest(S1))/1e18)).toString()).to.be.equal("76779");
      
      expect((Math.floor((await staking.calculateInterest(S2))/1e18)).toString()).to.be.equal("0");
      
      expect((Math.floor((await staking.calculateInterest(S3))/1e18)).toString()).to.be.equal("148217");
    });
  });

  describe('Stakers can unstake even after 365 days', function() {
    it("All stakers unstake thier entire stake after 365 days", async () => {

      let beforestakeTokBalS1 = await stakeTok.balanceOf(S1);
      let beforePlotBalS1 = await plotusToken.balanceOf(S1);

      let beforestakeTokBalS3 = await stakeTok.balanceOf(S3);
      let beforePlotBalS3 = await plotusToken.balanceOf(S3);


      // increase time
      await evm_mine(50);

      await staking.withdrawStakeAndInterest(toWei("360"), {
        from: S1
      });

      await staking.withdrawStakeAndInterest(toWei("460"), {
        from: S3
      });

      let afterstakeTokBalS1 = await stakeTok.balanceOf(S1);
      let afterPlotBalS1 = await plotusToken.balanceOf(S1);

      let afterstakeTokBalS3 = await stakeTok.balanceOf(S3);
      let afterPlotBalS3 = await plotusToken.balanceOf(S3);

      let afterstakeTokBalStaking = await stakeTok.balanceOf(staking.address);
      let afterPlotBalStaking = await plotusToken.balanceOf(staking.address);

      expect((Math.floor((afterPlotBalS1 - beforePlotBalS1)/1e18)).toString()).to.be.equal("76779");
      expect((Math.floor((afterPlotBalS3 - beforePlotBalS3)/1e18)).toString()).to.be.equal("148217");
      expect((Math.floor((afterPlotBalStaking)/1e18)).toString()).to.be.equal("0"); 

      expect((Math.floor((afterstakeTokBalS1 - beforestakeTokBalS1)/1e18)).toString()).to.be.equal("360");
      expect((Math.floor((afterstakeTokBalS3 - beforestakeTokBalS3)/1e18)).toString()).to.be.equal("460");
      expect((Math.floor((afterstakeTokBalStaking)/1e18)).toString()).to.be.equal("0");
      
      let interestData = await staking.interestData();
      
          
      expect((Math.floor(interestData[1]/1e18)).toString()).to.be.equal("970");

      // globalTotalStake
      expect((interestData[0]).toString()).to.be.equal(toWei("0")); 
      

      
      expect((Math.floor((await staking.calculateInterest(S1))/1e18)).toString()).to.be.equal("0");
      
      expect((Math.floor((await staking.calculateInterest(S2))/1e18)).toString()).to.be.equal("0");
      
      expect((Math.floor((await staking.calculateInterest(S3))/1e18)).toString()).to.be.equal("0");

      let statsDta = await staking.getStatsData(S1);
      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("0");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("0");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("0");
    });
    it("Should revert if tries to stake 0 amount", async () => {

      await assertRevert(staking.stake(0, {
              from: S1
            }));
    });
    it("Should revert if tries to stake after 365 days", async () => {

      await assertRevert(staking.stake(10, {
              from: S1
            }));
    });
    it("Should revert if tries to unstake 0 amount", async () => {

      await assertRevert(staking.withdrawStakeAndInterest(0, {
              from: S1
            }));
    });
    it("Should revert if tries to unstake more than staked", async () => {

      await assertRevert(staking.withdrawStakeAndInterest(10, {
              from: S1
            }));
    });
  });
  
  describe('reverts', function() {
    it("Should revert if transfer token failed while staking", async () => {

      await assertRevert(dummyStaking.stake(100, {
        from: S1
      }));
    });
    it("Should revert if transfer token failed while transfering to vault", async () => {

      await assertRevert(dummyStaking.updateGlobalYield( {
        from: S1
      }));
      
    });
    it("Should revert if transfer token failed while unstaking", async () => {
      await dummyStaking.addStake(S1, 200);
      await dummyStaking.setInterestData(200, toWei(10));
      await dummyRewardTok.setRetBit(true);
      await dummyStaking.setStarttime();
      await assertRevert(dummyStaking.withdrawStakeAndInterest(100, {
        from: S1
      }));
    });
    it("Should revert if transer token failed while withdrawing interest", async () => {
      await dummyStaking.setInterestData(200, toWei(10));
      await dummyRewardTok.setRetBit(false);
      await assertRevert(dummyStaking.withdrawInterest( {
        from: S1
      }));
    });
    it("Should return 0 if withdrawnTodate+stakebuin > globalyieldxstaked", async () => {
      await dummyStaking.setBuyInRate(S1, toWei(2000000));
      expect((Math.floor((await dummyStaking.calculateInterest(S1))/1e18)).toString()).to.be.equal("0");
      await dummyStaking.setInterestData(200, 0);
      let statsDta = await dummyStaking.getStatsData(S1);
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("0");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("0");
    });
    it("Should Revert if staking period pass as 0", async () => {
      let nowBlock = (await web3.eth.getBlock('latest')).number;
      await assertRevert(Staking.new(stakeTok.address, plotusToken.address, 0, toWei(500000), nowBlock/1+2, vaultAdd));
    });
    it("Should Revert if reward pass as 0", async () => {
      let nowBlock = (await web3.eth.getBlock('latest')).number;
      await assertRevert(Staking.new(stakeTok.address, plotusToken.address, 120, 0, nowBlock/1+2, vaultAdd));
    });
    it("Should Revert if start time pass as past time", async () => {
      let nowBlock = (await web3.eth.getBlock('latest')).number;
      await assertRevert(Staking.new(stakeTok.address, plotusToken.address, 1, 120, nowBlock-15, vaultAdd));
    });
    it("Should Revert if stake token is null", async () => {
      let nowBlock = (await web3.eth.getBlock('latest')).number;
      await assertRevert(Staking.new(nullAddress, plotusToken.address, 1, 120, nowBlock/1+2, vaultAdd));
    });
    it("Should Revert if reward token is null", async () => {
      let nowBlock = (await web3.eth.getBlock('latest')).number;
      await assertRevert(Staking.new(stakeTok.address, nullAddress, 1, 120, nowBlock/1+2, vaultAdd));
    });
    it("Should Revert if vault address is null", async () => {
      let nowBlock = (await web3.eth.getBlock('latest')).number;
      await assertRevert(Staking.new(stakeTok.address, plotusToken.address, 1, 120, nowBlock/1+2, nullAddress));
    });
  });

});