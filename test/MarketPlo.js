const Market  = artifacts.require('Market');
const Plotus = artifacts.require('Plotus');
const Master = artifacts.require('Master');
const PlotusToken = artifacts.require('PlotusToken');
const web3 = Market.web3;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

var accounts = [];

contract('Market', function([user1,user2,user3,user4,user5,user6,user7,user8,user9]){
    let MarketInstance  

    //check option ranges of each prediction.
    it('1.check option ranges',async function(){
        accounts = [user1,user2,user3,user4,user5,user6,user7,user8,user9];
        let nowTime = new Date()/1000;
        nowTime = parseInt(nowTime);
        const start = nowTime/1;
        masterInstance = await Master.deployed();
        plotusToken = await PlotusToken.deployed();
        plotusNewAddress = await masterInstance.plotusAddress(); 
        plotusNewInstance = await Plotus.at(plotusNewAddress);
        
        for(let i = 0; i<accounts.length;i++) {
            plotusToken.mint(accounts[i], '100000000000000000000')
        }

        const addNewMarket = await plotusNewInstance.addNewMarket(0,[start,start+604800,100000000000000,9000,9100],"firstBet","0x47");
        const length = addNewMarket.logs[1].args.marketAdd; 
        console.log("market",length)
        marketInstance = await Market.at(length);
        assert.ok(marketInstance);
        const addressOfMarket = marketInstance.address;

        const options1 = await marketInstance.optionsAvailable(1);
        assert.equal(options1[0]/1,0)
        assert.equal(options1[1]/1,8999)
        const options2 = await marketInstance.optionsAvailable(2);
        assert.equal(options2[0]/1,9000)
        assert.equal(options2[1]/1,9100)
        const options3 = await marketInstance.optionsAvailable(3);
        assert.equal(options3[0]/1,9101)
        assert.equal(options3[1]/1,1.157920892373162e+77)
        })

    //check place prediction and price of each option
    it('2.check place prediction and price of each option in Ether',async function(){
        let nowTime = new Date()/1000;
        nowTime = parseInt(nowTime);
        const start = nowTime/1;
        masterInstance = await Master.deployed();
        plotusNewAddress = await masterInstance.plotusAddress(); 
        plotusNewInstance = await Plotus.at(plotusNewAddress);
        const addNewMarket = await plotusNewInstance.addNewMarket(0,[start,start,100000000000000,9000,9100],"firstBet","0x47");
        const length = addNewMarket.logs[1].args.marketAdd; 
        marketInstance = await Market.at(length);
        assert.ok(marketInstance);
        const addressOfMarket = marketInstance.address;
        for(let i = 0; i<accounts.length;i++) {
            plotusToken.approve(addressOfMarket, '10000000000000000000000000', {from:accounts[i]});
        }
        
        //place prediction for user1.
        const getPrice0 = await marketInstance.getOptionPrice(2);
        await marketInstance.placePrediction("400000000000000000", 2,1,{from: user1});
        assert.equal(getPrice0/1,18)
        console.log(getPrice0/1);
        const user0EthStaked = await marketInstance.assetStaked(user1,2);
        assert.equal(user0EthStaked/1,400000000000000000);
        const userPredictionPoints0 = await marketInstance.userPredictionPoints(user1,2);
        console.log(userPredictionPoints0/1);
        assert.equal(userPredictionPoints0/1,Math.floor((user0EthStaked*1)/(getPrice0*1e14)));

        //place prediction for user1.
        await marketInstance.placePrediction("400000000000000000", 2,2,{from: user1});
        const getPrice1 = await marketInstance.getOptionPrice(2);
        assert.equal(getPrice1/1,18)
        const user1EthStaked = await marketInstance.assetStaked(user1,2);
        assert.equal(user1EthStaked/1, (user0EthStaked*2));
        const userPredictionPoints1 = await marketInstance.userPredictionPoints(user1,2);
        assert.equal(userPredictionPoints1/1,Math.floor((user0EthStaked*3)/(getPrice1*1e14)));

        //place prediction for user2.
        await marketInstance.placePrediction("400000000000000000", 2,2,{from: user2});
        const getPrice2 = await marketInstance.getOptionPrice(2);
        assert.equal(getPrice2/1,18)
        const user2EthStaked = await marketInstance.assetStaked(user2,2);
        assert.equal(user2EthStaked/1,400000000000000000);
        const userPredictionPoints2 = await marketInstance.userPredictionPoints(user2,2);
        assert.equal(userPredictionPoints2/1,Math.floor((user2EthStaked*2)/(getPrice2*1e14)));

        //place prediction for user3.
        await marketInstance.placePrediction("200000000000000000", 3,3,{from: user3});
        const getPrice3 = await marketInstance.getOptionPrice(3);
        assert.equal(getPrice3/1,27)
        const user3EthStaked = await marketInstance.assetStaked(user3,3);
        assert.equal(user3EthStaked/1,200000000000000000);
        const userPredictionPoints3 = await marketInstance.userPredictionPoints(user3,3);
        //assert.equal(userPredictionPoints3/1,Math.floor((user3EthStaked*3)/(getPrice3*1e14)));

        //place prediction for user4.
        await marketInstance.placePrediction("400000000000000000", 1,4,{from: user4});
        const getPrice4 = await marketInstance.getOptionPrice(1);
        assert.equal(getPrice4/1,9)
        const user4EthStaked = await marketInstance.assetStaked(user4,1);
        assert.equal(user4EthStaked/1,400000000000000000);
        const userPredictionPoints4 = await marketInstance.userPredictionPoints(user4,1);
        assert.equal(userPredictionPoints4/1,Math.floor((user4EthStaked*4)/(getPrice4*1e14)));

        //place prediction for user5.
        await marketInstance.placePrediction("300000000000000000", 1,5,{from: user5});
        const getPrice5 = await marketInstance.getOptionPrice(1);
        assert.equal(getPrice5/1,9)
        const user5EthStaked = await marketInstance.assetStaked(user5,1);
        assert.equal(user5EthStaked/1,300000000000000000);
        const userPredictionPoints5 = await marketInstance.userPredictionPoints(user5,1);
        assert.equal(userPredictionPoints5/1,Math.floor((user5EthStaked*5)/(getPrice5*1e14)));

        //place prediction for user6.
        await marketInstance.placePrediction("200000000000000000", 2,2,{from: user6});
        const getPrice6 = await marketInstance.getOptionPrice(2);
        assert.equal(getPrice6/1,18)
        const user6EthStaked = await marketInstance.assetStaked(user6,2);
        assert.equal(user6EthStaked/1,200000000000000000);
        const userPredictionPoints6 = await marketInstance.userPredictionPoints(user6,2);
        assert.equal(userPredictionPoints6/1,Math.floor((user6EthStaked*2)/(getPrice6*1e14)));

        //place prediction for user7.
        await marketInstance.placePrediction("500000000000000000", 3,3,{from: user7});
        const getPrice7 = await marketInstance.getOptionPrice(3);
        assert.equal(getPrice7/1,27)
        const user7EthStaked = await marketInstance.assetStaked(user7,3);
        assert.equal(user7EthStaked/1,500000000000000000);
        const userPredictionPoints7 = await marketInstance.userPredictionPoints(user7,3);
        assert.equal(userPredictionPoints7/1,Math.floor((user7EthStaked*3)/(getPrice7*1e14)));

        //place prediction for user8.
        await marketInstance.placePrediction("500000000000000000", 3,1,{from: user8});
        const getPrice8 = await marketInstance.getOptionPrice(3);
        assert.equal(getPrice8/1,27)
        const user8EthStaked = await marketInstance.assetStaked(user8,3);
        assert.equal(user8EthStaked/1,500000000000000000);
        const userPredictionPoints8 = await marketInstance.userPredictionPoints(user8,3);
        assert.equal(userPredictionPoints8/1,Math.floor((user8EthStaked*1)/(getPrice8*1e14)));

        //place prediction for user9.
        await marketInstance.placePrediction("700000000000000000", 2,4,{from: user9});
        const getPrice9 = await marketInstance.getOptionPrice(2);
        assert.equal(getPrice9/1,18)
        const user9EthStaked = await marketInstance.assetStaked(user9,2);
        assert.equal(user9EthStaked/1,700000000000000000);
        const userPredictionPoints9 = await marketInstance.userPredictionPoints(user9,2);
        assert.equal(userPredictionPoints9/1,Math.floor((user9EthStaked*4)/(getPrice9*1e14)));
        })

        //check reward to distribute, return Amount and claim return for each users.
    it('3.check reward to distribute, return Amount and claim return',async function(){
        let nowTime = new Date()/1000;
        nowTime = parseInt(nowTime);
        const start = nowTime/1;
        masterInstance = await Master.deployed();
        plotusNewAddress = await masterInstance.plotusAddress(); 
        plotusNewInstance = await Plotus.at(plotusNewAddress);
        const addNewMarket = await plotusNewInstance.addNewMarket(0,[start,start,100000000000000,9000,9100],"firstBet","0x47");
        const length = addNewMarket.logs[1].args.marketAdd; 
        marketInstance = await Market.at(length);
        assert.ok(marketInstance);
        const addressOfMarket = marketInstance.address;
        for(let i = 0; i<accounts.length;i++) {
            plotusToken.approve(addressOfMarket, '10000000000000000000000000', {from:accounts[i]});
        }
 
        //place prediction for user1.
        await marketInstance.placePrediction("400000000000000000", 2,1,{from: user1});
        const getPrice0 = await marketInstance.getOptionPrice(2);
        assert.equal(getPrice0/1,18)
        const user0EthStaked = await marketInstance.assetStaked(user1,2);
        assert.equal(user0EthStaked/1,400000000000000000);
        const userPredictionPoints0 = await marketInstance.userPredictionPoints(user1,2);
        assert.equal(userPredictionPoints0/1,Math.floor((user0EthStaked*1)/(getPrice0*1e14)));

         //place prediction for user1.
         await marketInstance.placePrediction("400000000000000000", 2,2,{from: user1});
        const getPrice1 = await marketInstance.getOptionPrice(2);
        assert.equal(getPrice1/1,18)
        const user1EthStaked = await marketInstance.assetStaked(user1,2);
        assert.equal(user1EthStaked/1, (user0EthStaked*2));
        const userPredictionPoints1 = await marketInstance.userPredictionPoints(user1,2);
         assert.equal(userPredictionPoints1/1,Math.floor((user0EthStaked*3)/(getPrice1*1e14)));

        //place prediction for user2.
        await marketInstance.placePrediction("400000000000000000", 2,2,{from: user2});
        const getPrice2 = await marketInstance.getOptionPrice(2);
        assert.equal(getPrice2/1,18)
        const user2EthStaked = await marketInstance.assetStaked(user2,2);
        assert.equal(user2EthStaked/1,400000000000000000);
        const userPredictionPoints2 = await marketInstance.userPredictionPoints(user2,2);
        assert.equal(userPredictionPoints2/1,Math.floor((user2EthStaked*2)/(getPrice2*1e14)));

        //place prediction for user3.
        await marketInstance.placePrediction("200000000000000000", 3,3,{from: user3});
        const getPrice3 = await marketInstance.getOptionPrice(3);
        assert.equal(getPrice3/1,27)
        const user3EthStaked = await marketInstance.assetStaked(user3,3);
        assert.equal(user3EthStaked/1,200000000000000000);
        const userPredictionPoints3 = await marketInstance.userPredictionPoints(user3,3);
       // assert.equal(userPredictionPoints3/1,Math.floor((user3EthStaked*3)/(getPrice3*1e14)));

        //place prediction for user4.
        await marketInstance.placePrediction("400000000000000000", 1,4,{from: user4});
        const getPrice4 = await marketInstance.getOptionPrice(1);
        assert.equal(getPrice4/1,9)
        const user4EthStaked = await marketInstance.assetStaked(user4,1);
        assert.equal(user4EthStaked/1,400000000000000000);
        const userPredictionPoints4 = await marketInstance.userPredictionPoints(user4,1);
        console.log(userPredictionPoints4/1);
        assert.equal(userPredictionPoints4/1,Math.floor((user4EthStaked*4)/(getPrice4*1e14)));

        //place prediction for user5.
        await marketInstance.placePrediction("300000000000000000", 1,5,{from: user5});
        const getPrice5 = await marketInstance.getOptionPrice(1);
        assert.equal(getPrice5/1,9)
        const user5EthStaked = await marketInstance.assetStaked(user5,1);
        assert.equal(user5EthStaked/1,300000000000000000);
        const userPredictionPoints5 = await marketInstance.userPredictionPoints(user5,1);
        assert.equal(userPredictionPoints5/1,Math.floor((user5EthStaked*5)/(getPrice5*1e14)));

        //place prediction for user6.
        await marketInstance.placePrediction("200000000000000000", 2,2,{from: user6});
        const getPrice6 = await marketInstance.getOptionPrice(2);
        assert.equal(getPrice6/1,18)
        const user6EthStaked = await marketInstance.assetStaked(user6,2);
        assert.equal(user6EthStaked/1,200000000000000000);
        const userPredictionPoints6 = await marketInstance.userPredictionPoints(user6,2);
        assert.equal(userPredictionPoints6/1,Math.floor((user6EthStaked*2)/(getPrice6*1e14)));

        //place prediction for user7.
        await marketInstance.placePrediction("500000000000000000", 3,3,{from: user7});
        const getPrice7 = await marketInstance.getOptionPrice(3);
        assert.equal(getPrice7/1,27)
        const user7EthStaked = await marketInstance.assetStaked(user7,3);
        assert.equal(user7EthStaked/1,500000000000000000);
        const userPredictionPoints7 = await marketInstance.userPredictionPoints(user7,3);
        assert.equal(userPredictionPoints7/1,Math.floor((user7EthStaked*3)/(getPrice7*1e14)));

        //place prediction for user8.
        await marketInstance.placePrediction("500000000000000000", 3,1,{from: user8});
        const getPrice8 = await marketInstance.getOptionPrice(3);
        assert.equal(getPrice8/1,27)
        const user8EthStaked = await marketInstance.assetStaked(user8,3);
        assert.equal(user8EthStaked/1,500000000000000000);
        const userPredictionPoints8 = await marketInstance.userPredictionPoints(user8,3);
        assert.equal(userPredictionPoints8/1,Math.floor((user8EthStaked*1)/(getPrice8*1e14)));

        //place prediction for user9.
        await marketInstance.placePrediction("700000000000000000", 2,4,{from: user9});
        const getPrice9 = await marketInstance.getOptionPrice(2);
        assert.equal(getPrice9/1,18)
        const user9EthStaked = await marketInstance.assetStaked(user9,2);
        assert.equal(user9EthStaked/1,700000000000000000);
        const userPredictionPoints9 = await marketInstance.userPredictionPoints(user9,2);
        assert.equal(userPredictionPoints9/1,Math.floor((user9EthStaked*4)/(getPrice9*1e14)));

        // const plotusBalBefore = await web3.eth.getBalance(plotusNewAddress);
        // console.log("Plotus balance before result declared",plotusBalBefore)
        
        // check winning option.
        await marketInstance.calculatePredictionResult(900,{from: user1});
        const winningOption = await marketInstance.WinningOption();
        assert.equal(winningOption/1,1);

        // const plotusBalAfter = await web3.eth.getBalance(plotusNewAddress);
        // console.log("Plotus balance after result declared",plotusBalAfter)

        //reward to distribute for winners.
        const rewardToDistribute = await marketInstance.rewardToDistribute();
        assert.equal(rewardToDistribute/1,998400000000000000);
        
        //return amount of user1
        const user1Return = await marketInstance.getReturn(user1);
        console.log("user1Return",user1Return[0]/1)
        console.log("user1 PLO:",user1Return[1]/1)
        assert.equal(user1Return[0]/1,680000000000000000);
        assert.equal(user1Return[1]/1,100000000000000000000);

        //return amount of user2.
        const user2Return = await marketInstance.getReturn(user2);
        console.log("user2Return",user2Return[0]/1)
        assert.equal(user2Return[0]/1,320000000000000000);
        assert.equal(user2Return[1]/1,50000000000000000000);

        //return amount of user3.
        const user3Return = await marketInstance.getReturn(user3);
        console.log("user3Return",user3Return[0]/1)
        assert.equal(user3Return[0]/1,80000000000000000);
        assert.equal(user3Return[1]/1,25000000000000000000);

        //return amount of user4.
        const user4Return = await marketInstance.getReturn(user4);
        console.log("user4Return",user4Return[0]/1)
        assert.equal(user4Return[0]/1,915293871623584100);
        assert.equal(user4Return[1]/1,50000000000000000000);

        //return amount of user5.
        const user5Return = await marketInstance.getReturn(user5);
        console.log("user5Return",user5Return[0]/1)
        assert.equal(user5Return[0]/1,783106128376415900);
        assert.equal(user5Return[1]/1,37500000000000000000);

        //return amount of user6.
        const user6Return = await marketInstance.getReturn(user6);
        console.log("user6Return",user6Return[0]/1)
        assert.equal(user6Return[0]/1,160000000000000000);
        assert.equal(user6Return[1]/1,25000000000000000000);

        //return amount of user7.
        const user7Return = await marketInstance.getReturn(user7);
        console.log("user7Return",user7Return[0]/1)
        assert.equal(user7Return[0]/1,200000000000000000);
        assert.equal(user7Return[1]/1,62500000000000000000);

        //return amount of user8.
        const user8Return = await marketInstance.getReturn(user8);
        console.log("user8Return",user8Return[0]/1)
        assert.equal(user8Return[0]/1,400000000000000000);
        assert.equal(user8Return[1]/1,62500000000000000000);

        //return amount of user9.
        const user9Return = await marketInstance.getReturn(user9);
        console.log("user9Return",user9Return[0]/1)
        assert.equal(user9Return[0]/1,420000000000000000);
        assert.equal(user9Return[1]/1,87500000000000000000);
        
        //claim return user1.
        const beforeClaimUser1 = await plotusToken.balanceOf(user1);
        const txInfo1 = await plotusNewInstance.claimPendingReturn({from: user1});
        const tx1 = await web3.eth.getTransaction(txInfo1.tx);
        const gasCost1 = tx1.gasPrice * txInfo1.receipt.gasUsed;
        // const afterClaimUser1 = await web3.eth.getBalance(user1);
        let tokenBalanceUser1 = await plotusToken.balanceOf(user1);
        assert.equal(tokenBalanceUser1/1, user1Return[1]/1 + beforeClaimUser1/1 + user1Return[0]/1);
        // assert.equal(((beforeClaimUser1/1)/1e18).toFixed(6),((parseFloat(afterClaimUser1)-(parseFloat(user1Return[0])-parseFloat(gasCost1)))/1e18).toFixed(6));

        //claim return user2.
        const beforeClaimUser2 = await plotusToken.balanceOf(user2);
        const txInfo2 = await plotusNewInstance.claimPendingReturn({from: user2});
        const tx2 = await web3.eth.getTransaction(txInfo2.tx);
        const gasCost2 = tx2.gasPrice * txInfo2.receipt.gasUsed;
        const afterClaimUser2 = await web3.eth.getBalance(user2);
        let tokenBalanceUser2 = await plotusToken.balanceOf(user2);
        assert.equal(tokenBalanceUser2/1, user2Return[1]/1 + beforeClaimUser2/1 + user2Return[0]/1);
        // assert.equal(((beforeClaimUser2/1)/1e18).toFixed(6),((parseFloat(afterClaimUser2)-(parseFloat(user2Return[0])-parseFloat(gasCost2)))/1e18).toFixed(6));

        //claim return user3.
        const beforeClaimUser3 = await plotusToken.balanceOf(user3);
        const txInfo3 = await plotusNewInstance.claimPendingReturn({from: user3});
        const tx3 = await web3.eth.getTransaction(txInfo3.tx);
        const gasCost3 = tx3.gasPrice * txInfo3.receipt.gasUsed;
        const afterClaimUser3 = await web3.eth.getBalance(user3);
        let tokenBalanceUser3 = await plotusToken.balanceOf(user3);
        assert.equal(tokenBalanceUser3/1, user3Return[1]/1 + beforeClaimUser3/1 + user3Return[0]/1);
        // assert.equal(((beforeClaimUser3/1)/1e18).toFixed(6),((parseFloat(afterClaimUser3)-(parseFloat(user3Return[0])-parseFloat(gasCost3)))/1e18).toFixed(6));

        //claim return user4.
        const beforeClaimUser4 = await plotusToken.balanceOf(user4);
        const txInfo4 = await plotusNewInstance.claimPendingReturn({from: user4});
        const tx4 = await web3.eth.getTransaction(txInfo4.tx);
        const gasCost4 = tx4.gasPrice * txInfo4.receipt.gasUsed;
        const afterClaimUser4 = await web3.eth.getBalance(user4);
        let tokenBalanceUser4 = await plotusToken.balanceOf(user4);
        assert.equal(tokenBalanceUser4/1, user4Return[1]/1 + beforeClaimUser4/1 + user4Return[0]/1);
        // assert.equal(((beforeClaimUser4/1)/1e18).toFixed(6),((parseFloat(afterClaimUser4)-(parseFloat(user4Return[0]/1)-parseFloat(gasCost4)))/1e18).toFixed(6));

        //claim return user5.
        const beforeClaimUser5 = await plotusToken.balanceOf(user5);
        const txInfo5 = await plotusNewInstance.claimPendingReturn({from: user5});
        const tx5 = await web3.eth.getTransaction(txInfo5.tx);
        const gasCost5 = tx5.gasPrice * txInfo5.receipt.gasUsed;
        const afterClaimUser5 = await web3.eth.getBalance(user5);
        let tokenBalanceUser5 = await plotusToken.balanceOf(user5);
        assert.equal(tokenBalanceUser5/1, user5Return[1]/1 + beforeClaimUser5/1 + user5Return[0]/1);
        // assert.equal(((beforeClaimUser5/1)/1e18).toFixed(6),((parseFloat(afterClaimUser5)-(parseFloat(user5Return[0])-parseFloat(gasCost5)))/1e18).toFixed(6));

        //claim return user6.
        const beforeClaimUser6 = await plotusToken.balanceOf(user6);
        const txInfo6 = await plotusNewInstance.claimPendingReturn({from: user6});
        const tx6 = await web3.eth.getTransaction(txInfo6.tx);
        const gasCost6 = tx6.gasPrice * txInfo6.receipt.gasUsed;
        const afterClaimUser6 = await web3.eth.getBalance(user6);
        let tokenBalanceUser6 = await plotusToken.balanceOf(user6);
        assert.equal(tokenBalanceUser6/1, user6Return[1]/1 + beforeClaimUser6/1 + user6Return[0]/1);
        // assert.equal(((beforeClaimUser6/1)/1e18).toFixed(6),((parseFloat(afterClaimUser6)-(parseFloat(user6Return[0])-parseFloat(gasCost6)))/1e18).toFixed(6));

        //claim return user7.
        const beforeClaimUser7 = await plotusToken.balanceOf(user7);
        const txInfo7 = await plotusNewInstance.claimPendingReturn({from: user7});
        const tx7 = await web3.eth.getTransaction(txInfo7.tx);
        const gasCost7 = tx7.gasPrice * txInfo7.receipt.gasUsed;
        const afterClaimUser7 = await web3.eth.getBalance(user7);
        let tokenBalanceUser7 = await plotusToken.balanceOf(user7);
        assert.equal(tokenBalanceUser7/1, user7Return[1]/1 + beforeClaimUser7/1 + user7Return[0]/1);
        // assert.equal(((beforeClaimUser7/1)/1e18).toFixed(6),((parseFloat(afterClaimUser7)-(parseFloat(user7Return[0])-parseFloat(gasCost7)))/1e18).toFixed(6));

        //claim return user8.
        const beforeClaimUser8 = await plotusToken.balanceOf(user8);
        const txInfo8 = await plotusNewInstance.claimPendingReturn({from: user8});
        const tx8 = await web3.eth.getTransaction(txInfo8.tx);
        const gasCost8 = tx8.gasPrice * txInfo8.receipt.gasUsed;
        const afterClaimUser8 = await web3.eth.getBalance(user8);
        let tokenBalanceUser8 = await plotusToken.balanceOf(user8);
        assert.equal(tokenBalanceUser8/1, user8Return[1]/1 + beforeClaimUser8/1 + user8Return[0]/1);
        // assert.equal(((beforeClaimUser8/1)/1e18).toFixed(6),((parseFloat(afterClaimUser8)-(parseFloat(user8Return[0])-parseFloat(gasCost8)))/1e18).toFixed(6));

        //claim return user9.
        const beforeClaimUser9 = await plotusToken.balanceOf(user9);
        const txInfo9 = await plotusNewInstance.claimPendingReturn({from: user9});
        const tx9 = await web3.eth.getTransaction(txInfo9.tx);
        const gasCost9 = tx9.gasPrice * txInfo9.receipt.gasUsed;
        const afterClaimUser9 = await web3.eth.getBalance(user9);
        let tokenBalanceUser9 = await plotusToken.balanceOf(user9);
        assert.equal(tokenBalanceUser9/1, user9Return[1]/1 + beforeClaimUser9/1 + user9Return[0]/1);
        // assert.equal(((beforeClaimUser9/1)/1e18).toFixed(6),((parseFloat(afterClaimUser9)-(parseFloat(user9Return[0])-parseFloat(gasCost9)))/1e18).toFixed(6));
        console.log(await plotusNewInstance.getOpenMarkets());
    })
})
 
