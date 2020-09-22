const Staking = artifacts.require("Staking");
const UniswapETH_Plot = artifacts.require("TokenMock");
const PlotusToken = artifacts.require('PlotXToken');
const MockStaking = artifacts.require('MockStaking');
const BN = web3.utils.BN;
const { toHex, toWei } = require("./utils/ethTools.js");
const expectEvent = require("./utils/expectEvent");
const increaseTimeTo = require("./utils/increaseTime.js").increaseTimeTo;
const assertRevert = require("./utils/assertRevert.js").assertRevert;
const DummyTokenMock = artifacts.require('DummyTokenMock');
const latestTime = require("./utils/latestTime.js").latestTime;
const nullAddress = "0x0000000000000000000000000000000000000000";

contract("InterestDistribution - Scenario based calculations for staking model", ([S1, S2, S3]) => {
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
      staking = await Staking.new(stakeTok.address, plotusToken.address, (24*3600*365), toWei(500000), await latestTime());

      dummyStaking = await MockStaking.new(dummystakeTok.address, dummyRewardTok.address, (24*3600*365), toWei(500000), (await latestTime())/1+1500);

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

      stakeStartTime = (await staking.stakingStartTime())/1;
      
    });
  describe('Multiple Staker stakes, no withdrawal', function() {
    
    it("Staker 1 stakes 100 Token after 10 seconds", async () => {

      let beforeStakeTokBal = await stakeTok.balanceOf(S1);
      let beforeStakeTokBalStaking = await stakeTok.balanceOf(staking.address);
      
      // increase 10 seconds
      await increaseTimeTo(stakeStartTime + 10);

      /**
        * S1 stakes 100 tokens
        */
        await staking.stake(toWei("100"), {
          from: S1
        });


        let afterStakeTokBal = await stakeTok.balanceOf(S1);

        let afterStakeTokBalStaking = await stakeTok.balanceOf(staking.address);

        expect((beforeStakeTokBal - afterStakeTokBal)).to.be.equal((toWei("100", "ether"))/1);
        expect((afterStakeTokBalStaking - beforeStakeTokBalStaking)).to.be.equal((toWei("100", "ether"))/1); 


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

    it("Staker 2 stakes 50 Token at 100 seconds", async () => {

      let beforeStakeTokBal = await stakeTok.balanceOf(S2);

      let beforeStakeTokBalStaking = await stakeTok.balanceOf(staking.address);
      
      // increase 90 seconds
      await increaseTimeTo(stakeStartTime + 100);


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
      
        expect((Math.floor(yieldData[0]/1e15)).toString()).to.be.equal("14");
        expect(((Math.floor(yieldData[1]/1e16 - 71)).toString())/1).to.be.below(2);

        // globalTotalStake
        expect((interestData[0]).toString()).to.be.equal(web3.utils.toWei("150", "ether")); 

        // totalStake of S2
        expect((stakerData[0]).toString()).to.be.equal(web3.utils.toWei("50", "ether")); 
 
    });

    it("Staker 3 stakes 360 Token at 500 seconds", async () => {

      
      let beforeStakeTokBal = await stakeTok.balanceOf(S3);

      let beforeStakeTokBalStaking = await stakeTok.balanceOf(staking.address);

      // increase 400 seconds
      await increaseTimeTo(stakeStartTime + 500);
      
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
   
        expect((Math.floor(yieldData[0]/1e15)).toString()).to.be.equal("56");
        expect((Math.floor(yieldData[1]/1e18)).toString()).to.be.equal("20");

        // globalTotalStake
        expect((interestData[0]).toString()).to.be.equal(toWei("510")); 
        

        // totalStake of S3
        expect((stakerData[0]).toString()).to.be.equal(toWei("360")); 
        
    });

    it("Staker 1 again stakes 250 Token 800 seconds", async () => {

      let beforeStakeTokBal = await stakeTok.balanceOf(S1);

      let beforeStakeTokBalStaking = await stakeTok.balanceOf(staking.address);

      // increase time
      await increaseTimeTo(stakeStartTime + 800);

      
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

        expect((Math.floor(yieldData[0]/1e15)).toString()).to.be.equal("65");
        expect((Math.floor(yieldData[1]/1e18)).toString()).to.be.equal("16");

        // globalTotalStake
        expect((interestData[0]).toString()).to.be.equal(web3.utils.toWei("760", "ether")); 
        

        // totalStake of S1
        expect((stakerData[0]).toString()).to.be.equal(web3.utils.toWei("350", "ether")); 
      
    });

    it("Computing updated yield data at 1000 seconds", async () => {

      // increase time
      await increaseTimeTo(stakeStartTime + 1000);

      let statsDta = await staking.getStatsData(S1);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("760");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("230263");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("15");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("8");

      statsDta = await staking.getStatsData(S2);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("760");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("32896");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("15");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("2");

      statsDta = await staking.getStatsData(S3);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("760");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("236839");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("15");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("4");

          
      await staking
          .updateGlobalYield()
          .catch(e => e);

      
      let interestData = await staking.interestData();
            
      expect(((Math.floor(interestData[1]/1e15 - 70)).toString())/1).to.be.below(2);

      // globalTotalStake
      expect((interestData[0]).toString()).to.be.equal(web3.utils.toWei("760", "ether")); 
      
      
      expect((Math.floor((await staking.calculateInterest(S1))/1e18)).toString()).to.be.equal("8");
      
      expect((Math.floor((await staking.calculateInterest(S2))/1e18)).toString()).to.be.equal("2");
      
      expect((Math.floor((await staking.calculateInterest(S3))/1e18)).toString()).to.be.equal("4");
    });
  });

  describe('Few stakers stake and Few staker withdraw Interest', function() {
    it("Staker 1 stakes 60 Token at 2000 seconds", async () => {

      let beforeStakeTokBal = await stakeTok.balanceOf(S1);

      let beforeStakeTokBalStaking = await stakeTok.balanceOf(staking.address);

      // increase time
      await increaseTimeTo(stakeStartTime + 2000);

      
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

           
        expect(((Math.floor(yieldData[0]/1e15 - 90)).toString())/1).to.be.below(2);
        expect((Math.floor(yieldData[1]/1e18)).toString()).to.be.equal("21");

        // globalTotalStake
        expect((interestData[0]).toString()).to.be.equal(toWei("820")); 
        

        // totalStake of S1
        expect((stakerData[0]).toString()).to.be.equal(web3.utils.toWei("410", "ether")); 
        
    });

    it("Staker 2 Withdraws their share of interest at 2500 seconds", async () => {

      let beforePlotBal = await plotusToken.balanceOf(S2);

      // increase time
      await increaseTimeTo(stakeStartTime + 2500);

      await staking.withdrawInterest( {
          from: S2
        });

        let afterPlotBal = await plotusToken.balanceOf(S2);

        expect((Math.floor((afterPlotBal - beforePlotBal)/1e18)).toString()).to.be.equal("4"); 


        let stakerData = await staking.getStakerData(S2);
        let interestData = await staking.interestData();
        let yieldData = await staking.getYieldData(S2);

             
        expect((Math.floor(yieldData[0]/1e15)).toString()).to.be.equal("100");

        // globalTotalStake
        expect((interestData[0]).toString()).to.be.equal(web3.utils.toWei("820", "ether")); 
        
        // totalStake of S2
        expect((stakerData[0]).toString()).to.be.equal(web3.utils.toWei("50", "ether")); 

        
        expect((Math.floor((stakerData[1])/1e18)).toString()).to.be.equal("4");
    });

    it("Staker 3 Withdraws their share of interest at 3000 seconds", async () => {

      let beforePlotBal = await plotusToken.balanceOf(S3);

      // increase time
      await increaseTimeTo(stakeStartTime + 3000);

      
        await staking.withdrawInterest( {
          from: S3
        });

        let afterPlotBal = await plotusToken.balanceOf(S3);

        expect((Math.floor((afterPlotBal - beforePlotBal)/1e18)).toString()).to.be.equal("19");  

        let stakerData = await staking.getStakerData(S3);
        let interestData = await staking.interestData();
        let yieldData = await staking.getYieldData(S3);

          
        expect((Math.floor(yieldData[0]/1e15)).toString()).to.be.equal("110");

        // globalTotalStake
        expect((interestData[0]).toString()).to.be.equal(web3.utils.toWei("820", "ether")); 
        

        // totalStake of S3
        expect((stakerData[0]).toString()).to.be.equal(web3.utils.toWei("360", "ether")); 
        

        
        expect((Math.floor((stakerData[1])/1e18)).toString()).to.be.equal("19"); 
    });

    it("Staker 2 stakes 100 Token at 4500 seconds", async () => {

      let beforeStakeTokBal = await stakeTok.balanceOf(S2);

      let beforeStakeTokBalStaking = await stakeTok.balanceOf(staking.address);

      // increase time
      await increaseTimeTo(stakeStartTime + 4500);


      
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

             
        expect((Math.floor(yieldData[0]/1e15)).toString()).to.be.equal("139");
        expect((Math.floor(yieldData[1]/1e18)).toString()).to.be.equal("14");

        // globalTotalStake
        expect((interestData[0]).toString()).to.be.equal(web3.utils.toWei("920", "ether")); 
        
        // totalStake of S1
        expect((stakerData[0]).toString()).to.be.equal(web3.utils.toWei("150", "ether")); 
    });

    it("Computing updated yield data at 10000 seconds", async () => {

      // increase time
      await increaseTimeTo(stakeStartTime + 10000);

      let statsDta = await staking.getStatsData(S1);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("920");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("222829");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("158");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("74");

      statsDta = await staking.getStatsData(S2);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("920");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("81512");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("158");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("16");

      statsDta = await staking.getStatsData(S3);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("920");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("195634");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("158");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("44");

         
      await staking
          .updateGlobalYield()
          .catch(e => e);

      let interestData = await staking.interestData();
      
          
      expect(((Math.floor(interestData[1]/1e15 - 234)).toString())/1).to.be.below(2);

      // globalTotalStake
      expect((interestData[0]).toString()).to.be.equal(toWei("920")); 
      
      
      expect((Math.floor((await staking.calculateInterest(S1))/1e18)).toString()).to.be.equal("74");
      
      expect((Math.floor((await staking.calculateInterest(S2))/1e18)).toString()).to.be.equal("16");
      
      expect((Math.floor((await staking.calculateInterest(S3))/1e18)).toString()).to.be.equal("44");
    });
  });

  describe('No one stakes in this cycle but time will increase so some interest will be generated', function() {
    it("Computing updated yield data at 20000 seconds", async () => {

      // increase time
      await increaseTimeTo(stakeStartTime + 20000);

      let statsDta = await staking.getStatsData(S1);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("920");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("222829");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("317");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("144");

      statsDta = await staking.getStatsData(S2);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("920");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("81512");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("317");
      expect(((Math.floor((statsDta[4])/1e18) - 41).toString())/1).to.be.below(2);

      statsDta = await staking.getStatsData(S3);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("920");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("195634");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("317");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("106");
 
      await staking
          .updateGlobalYield()
          .catch(e => e);
      
      let interestData = await staking.interestData();
      
   
      expect((Math.floor(interestData[1]/1e15)).toString()).to.be.equal("406");

      // globalTotalStake
      expect((interestData[0]).toString()).to.be.equal(toWei("920")); 
      

      
      expect((Math.floor((await staking.calculateInterest(S1))/1e18)).toString()).to.be.equal("144");
      
      expect(((Math.floor((await staking.calculateInterest(S2))/1e18) - 41).toString())/1).to.be.below(2);
      
      expect((Math.floor((await staking.calculateInterest(S3))/1e18)).toString()).to.be.equal("106");
    });
  });

  describe('Few stakers stakes and few staker withdraw Interest and stake', function() {
    it("Staker 1 Withdraws partial stake worth 150 Token at 25000 seconds", async () => {

      let beforestakeTokBal = await stakeTok.balanceOf(S1);
      let beforePlotBal = await plotusToken.balanceOf(S1);

      let beforestakeTokBalStaking = await stakeTok.balanceOf(staking.address);
      let beforePlotBalStaking = await plotusToken.balanceOf(staking.address);

      // increase Time
      await increaseTimeTo(stakeStartTime + 25000);

      
      await staking.withdrawStakeAndInterest(toWei("150"), {
          from: S1
          });

        
        let afterstakeTokBal = await stakeTok.balanceOf(S1);
        let afterPlotBal = await plotusToken.balanceOf(S1);

        let afterstakeTokBalStaking = await stakeTok.balanceOf(staking.address);
        let afterPlotBalStaking = await plotusToken.balanceOf(staking.address);

        expect((Math.floor((afterPlotBal - beforePlotBal)/1e18)).toString()).to.be.equal("180");
        expect((Math.floor((beforePlotBalStaking - afterPlotBalStaking)/1e18)).toString()).to.be.equal("180"); 

        expect((Math.floor((afterstakeTokBal - beforestakeTokBal)/1e18)).toString()).to.be.equal("150");
        expect((Math.floor((beforestakeTokBalStaking - afterstakeTokBalStaking)/1e18)).toString()).to.be.equal("150"); 

        let stakerData = await staking.getStakerData(S1);
        let interestData = await staking.interestData();
        let yieldData = await staking.getYieldData(S1);



        
        expect((Math.floor(yieldData[0]/1e15)).toString()).to.be.equal("492");
        expect((Math.floor(yieldData[1]/1e18)).toString()).to.be.equal("128");

        // globalTotalStake
        expect((interestData[0]).toString()).to.be.equal(web3.utils.toWei("770", "ether")); 
        
        // totalStake of S1
        expect((stakerData[0]).toString()).to.be.equal(web3.utils.toWei("260", "ether")); 
    });

    it("Staker 2 Withdraws Entire stake worth 150 Token at 30000 seconds", async () => {

      let beforestakeTokBal = await stakeTok.balanceOf(S2);
      let beforePlotBal = await plotusToken.balanceOf(S2);

      let beforestakeTokBalStaking = await stakeTok.balanceOf(staking.address);
      let beforePlotBalStaking = await plotusToken.balanceOf(staking.address);

      // increase Time
      await increaseTimeTo(stakeStartTime + 30000);


      await staking.withdrawStakeAndInterest(toWei("150"), {
          from: S2
          });

      let afterstakeTokBal = await stakeTok.balanceOf(S2);
      let afterPlotBal = await plotusToken.balanceOf(S2);

      let afterstakeTokBalStaking = await stakeTok.balanceOf(staking.address);
      let afterPlotBalStaking = await plotusToken.balanceOf(staking.address);

      expect((Math.floor((afterPlotBal - beforePlotBal)/1e18)).toString()).to.be.equal("70");
      expect((Math.floor((beforePlotBalStaking - afterPlotBalStaking)/1e18)).toString()).to.be.equal("70"); 

      expect((Math.floor((afterstakeTokBal - beforestakeTokBal)/1e18)).toString()).to.be.equal("150");
      expect((Math.floor((beforestakeTokBalStaking - afterstakeTokBalStaking)/1e18)).toString()).to.be.equal("150"); 

      let stakerData = await staking.getStakerData(S2);
      let interestData = await staking.interestData();
      let yieldData = await staking.getYieldData(S2);

    
      expect((Math.floor(yieldData[0]/1e15)).toString()).to.be.equal("595");
      expect((Math.floor(yieldData[1]/1e18)).toString()).to.be.equal("0");

      // globalTotalStake
      expect((interestData[0]).toString()).to.be.equal(web3.utils.toWei("620", "ether")); 
      
      // totalStake of S2
      expect((stakerData[0]).toString()).to.be.equal(web3.utils.toWei("0", "ether"));    
    });

    it("Staker 3 stakes 100 Token at 100000 seconds", async () => {

      let beforeStakeTokBal = await stakeTok.balanceOf(S3);

      let beforeStakeTokBalStaking = await stakeTok.balanceOf(staking.address);

      // increase time
      await increaseTimeTo(stakeStartTime + 100000);

      
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

          
        expect((Math.floor(yieldData[0]/1e16)).toString()).to.be.equal("238");
        expect((Math.floor(yieldData[1]/1e18)).toString()).to.be.equal("258");

        // globalTotalStake
        expect((interestData[0]).toString()).to.be.equal(toWei("720")); 
        

        // totalStake of S3
        expect((stakerData[0]).toString()).to.be.equal(web3.utils.toWei("460", "ether")); 
    });

    it("Computing updated yield data at 31536000 seconds", async () => {

      // increase time
      await increaseTimeTo(stakeStartTime + 31536000);

      let statsDta = await staking.getStatsData(S1);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("720");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("180475");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("180475");

      statsDta = await staking.getStatsData(S2);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("720");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("0");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("0");

      statsDta = await staking.getStatsData(S3);

      expect((Math.floor((statsDta[0])/1e18)).toString()).to.be.equal("720");
      expect((Math.floor((statsDta[1])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[2])/1e18)).toString()).to.be.equal("319250");
      expect((Math.floor((statsDta[3])/1e18)).toString()).to.be.equal("500000");
      expect((Math.floor((statsDta[4])/1e18)).toString()).to.be.equal("319250");

         
      await staking
          .updateGlobalYield()
          .catch(e => e);

      let interestData = await staking.interestData();


      
          
      expect((Math.floor(interestData[1]/1e18)).toString()).to.be.equal("694");

      // globalTotalStake
      expect((interestData[0]).toString()).to.be.equal(web3.utils.toWei("720", "ether")); 
    
      
      expect((Math.floor((await staking.calculateInterest(S1))/1e18)).toString()).to.be.equal("180475");
      
      expect((Math.floor((await staking.calculateInterest(S2))/1e18)).toString()).to.be.equal("0");
      
      expect((Math.floor((await staking.calculateInterest(S3))/1e18)).toString()).to.be.equal("319250");
    });
  });

  describe('Stakers can unstake even after 365 days', function() {
    it("All stakers unstake thier entire stake after 365 days", async () => {

      let beforestakeTokBalS1 = await stakeTok.balanceOf(S1);
      let beforePlotBalS1 = await plotusToken.balanceOf(S1);

      let beforestakeTokBalS3 = await stakeTok.balanceOf(S3);
      let beforePlotBalS3 = await plotusToken.balanceOf(S3);


      // increase time
      await increaseTimeTo(stakeStartTime + 31968000);

      await staking.withdrawStakeAndInterest(toWei("260"), {
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

      expect((Math.floor((afterPlotBalS1 - beforePlotBalS1)/1e18)).toString()).to.be.equal("180475");
      expect((Math.floor((afterPlotBalS3 - beforePlotBalS3)/1e18)).toString()).to.be.equal("319250");
      expect((Math.floor((afterPlotBalStaking)/1e18)).toString()).to.be.equal("0"); 

      expect((Math.floor((afterstakeTokBalS1 - beforestakeTokBalS1)/1e18)).toString()).to.be.equal("260");
      expect((Math.floor((afterstakeTokBalS3 - beforestakeTokBalS3)/1e18)).toString()).to.be.equal("460");
      expect((Math.floor((afterstakeTokBalStaking)/1e18)).toString()).to.be.equal("0");
      
      let interestData = await staking.interestData();
      
          
      expect((Math.floor(interestData[1]/1e18)).toString()).to.be.equal("694");

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
    it("Should revert if transer token failed while staking", async () => {

      await assertRevert(dummyStaking.stake(100, {
        from: S1
      }));
    });
    it("Should revert if transer token failed while unstaking", async () => {
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
      let nowTime = await latestTime();
      await assertRevert(Staking.new(stakeTok.address, plotusToken.address, 0, toWei(500000), nowTime));
    });
    it("Should Revert if reward pass as 0", async () => {
      let nowTime = await latestTime();
      await assertRevert(Staking.new(stakeTok.address, plotusToken.address, 120, 0, nowTime));
    });
    it("Should Revert if start time pass as past time", async () => {
      let nowTime = await latestTime();
      await assertRevert(Staking.new(stakeTok.address, plotusToken.address, 1, 120, nowTime-1500));
    });
    it("Should Revert if stake token is null", async () => {
      let nowTime = await latestTime();
      await assertRevert(Staking.new(nullAddress, plotusToken.address, 1, 120, nowTime));
    });
    it("Should Revert if reward token is null", async () => {
      let nowTime = await latestTime();
      await assertRevert(Staking.new(stakeTok.address, nullAddress, 1, 120, nowTime));
    });
  });

});