const Market  = artifacts.require('Market');
const Plotus = artifacts.require('Plotus');
const Master = artifacts.require('Master');
const web3 = Market.web3

contract('Market', function([user1,user2,user3,user4,user5,user6,user7,user8,user9]){
    let MarketInstance  

    //check option ranges of each prediction.
    it('1.check option ranges',async function(){
        let nowTime = new Date()/1000;
        nowTime = parseInt(nowTime);
        const start = nowTime/1;
        masterInstance = await Master.deployed();
        plotusNewAddress = await masterInstance.plotusAddress(); 
        plotusNewInstance = await Plotus.at(plotusNewAddress);
        const addNewMarket = await plotusNewInstance.addNewMarket(0,[start,start,1000000000000000,9000,9100],"firstBet","0x47");
        const length = addNewMarket.logs[0].args.marketAdd; 
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
    it('2.check place prediction and price of each option',async function(){
        let nowTime = new Date()/1000;
        nowTime = parseInt(nowTime);
        const start = nowTime/1;
        masterInstance = await Master.deployed();
        plotusNewAddress = await masterInstance.plotusAddress(); 
        plotusNewInstance = await Plotus.at(plotusNewAddress);
        const addNewMarket = await plotusNewInstance.addNewMarket(0,[start,start,1000000000000000,9000,9100],"firstBet","0x47");
        const length = addNewMarket.logs[0].args.marketAdd; 
        marketInstance = await Market.at(length);
        assert.ok(marketInstance);
        const addressOfMarket = marketInstance.address;
        
        //place prediction for user1.
        await marketInstance.placePrediction(2,1,{value: 400000000000000000,from: user1});
        const getPrice0 = await marketInstance.getOptionPrice(2);
        assert.equal(getPrice0,13)
        const user0EthStaked = await marketInstance.ethStaked(user1,2);
        assert.equal(user0EthStaked/1,400000000000000000);
        const userPredictionPoints0 = await marketInstance.userPredictionPoints(user1,2);
        assert.equal(userPredictionPoints0/1,(user0EthStaked*1)/getPrice0);

        //place prediction for user1.
        await marketInstance.placePrediction(2,2,{value: 400000000000000000,from: user1});
        const getPrice1 = await marketInstance.getOptionPrice(2);
        assert.equal(getPrice1,13)
        const user1EthStaked = await marketInstance.ethStaked(user1,2);
        assert.equal(user1EthStaked/1, (user0EthStaked*2));
        const userPredictionPoints1 = await marketInstance.userPredictionPoints(user1,2);
        assert.equal(userPredictionPoints1/1,(user0EthStaked*3)/getPrice1);

        //place prediction for user2.
        await marketInstance.placePrediction(2,2,{value: 400000000000000000,from: user2});
        const getPrice2 = await marketInstance.getOptionPrice(2);
        assert.equal(getPrice2,13)
        const user2EthStaked = await marketInstance.ethStaked(user2,2);
        assert.equal(user2EthStaked/1,400000000000000000);
        const userPredictionPoints2 = await marketInstance.userPredictionPoints(user2,2);
        assert.equal(userPredictionPoints2/1,(user2EthStaked*2)/getPrice2);

        //place prediction for user3.
        await marketInstance.placePrediction(3,3,{value: 200000000000000000,from: user3});
        const getPrice3 = await marketInstance.getOptionPrice(3);
        assert.equal(getPrice3,6)
        const user3EthStaked = await marketInstance.ethStaked(user3,3);
        assert.equal(user3EthStaked/1,200000000000000000);
        const userPredictionPoints3 = await marketInstance.userPredictionPoints(user3,3);
        assert.equal(userPredictionPoints3/1,(user3EthStaked*3)/getPrice3);

        //place prediction for user4.
        await marketInstance.placePrediction(1,4,{value: 400000000000000000,from: user4});
        const getPrice4 = await marketInstance.getOptionPrice(1);
        assert.equal(getPrice4,20)
        const user4EthStaked = await marketInstance.ethStaked(user4,1);
        assert.equal(user4EthStaked/1,400000000000000000);
        const userPredictionPoints4 = await marketInstance.userPredictionPoints(user4,1);
        assert.equal(userPredictionPoints4/1,(user4EthStaked*4)/getPrice4);

        //place prediction for user5.
        await marketInstance.placePrediction(1,5,{value: 300000000000000000,from: user5});
        const getPrice5 = await marketInstance.getOptionPrice(1);
        assert.equal(getPrice5,20)
        const user5EthStaked = await marketInstance.ethStaked(user5,1);
        assert.equal(user5EthStaked/1,300000000000000000);
        const userPredictionPoints5 = await marketInstance.userPredictionPoints(user5,1);
        assert.equal(userPredictionPoints5/1,(user5EthStaked*5)/getPrice5);

        //place prediction for user6.
        await marketInstance.placePrediction(2,2,{value: 200000000000000000,from: user6});
        const getPrice6 = await marketInstance.getOptionPrice(2);
        assert.equal(getPrice6,13)
        const user6EthStaked = await marketInstance.ethStaked(user6,2);
        assert.equal(user6EthStaked/1,200000000000000000);
        const userPredictionPoints6 = await marketInstance.userPredictionPoints(user6,2);
        assert.equal(userPredictionPoints6/1,(user6EthStaked*2)/getPrice6);

        //place prediction for user7.
        await marketInstance.placePrediction(3,3,{value: 500000000000000000,from: user7});
        const getPrice7 = await marketInstance.getOptionPrice(3);
        assert.equal(getPrice7,6)
        const user7EthStaked = await marketInstance.ethStaked(user7,3);
        assert.equal(user7EthStaked/1,500000000000000000);
        const userPredictionPoints7 = await marketInstance.userPredictionPoints(user7,3);
        assert.equal(userPredictionPoints7/1,(user7EthStaked*3)/getPrice7);

        //place prediction for user8.
        await marketInstance.placePrediction(3,1,{value: 500000000000000000,from: user8});
        const getPrice8 = await marketInstance.getOptionPrice(3);
        assert.equal(getPrice8,6)
        const user8EthStaked = await marketInstance.ethStaked(user8,3);
        assert.equal(user8EthStaked/1,500000000000000000);
        const userPredictionPoints8 = await marketInstance.userPredictionPoints(user8,3);
        assert.equal(userPredictionPoints8/1,(user8EthStaked*1)/getPrice8);

        //place prediction for user9.
        await marketInstance.placePrediction(2,4,{value: 700000000000000000,from: user9});
        const getPrice9 = await marketInstance.getOptionPrice(2);
        assert.equal(getPrice9,13)
        const user9EthStaked = await marketInstance.ethStaked(user9,2);
        assert.equal(user9EthStaked/1,700000000000000000);
        const userPredictionPoints9 = await marketInstance.userPredictionPoints(user9,2);
        assert.equal(userPredictionPoints9/1,(user9EthStaked*4)/getPrice9);
        })

        //check reward to distribute, return Amount and claim return for each users.
        it('3.check reward to distribute, return Amount and claim return',async function(){
        let nowTime = new Date()/1000;
        nowTime = parseInt(nowTime);
        const start = nowTime/1;
        masterInstance = await Master.deployed();
        plotusNewAddress = await masterInstance.plotusAddress(); 
        plotusNewInstance = await Plotus.at(plotusNewAddress);
        const addNewMarket = await plotusNewInstance.addNewMarket(0,[start,start,1000000000000000,9000,9100],"firstBet","0x47");
        const length = addNewMarket.logs[0].args.marketAdd; 
        marketInstance = await Market.at(length);
        assert.ok(marketInstance);
        const addressOfMarket = marketInstance.address;
 
        //place prediction for user1.
        await marketInstance.placePrediction(2,1,{value: 400000000000000000,from: user1});
        const getPrice0 = await marketInstance.getOptionPrice(2);
        assert.equal(getPrice0,13)
        const user0EthStaked = await marketInstance.ethStaked(user1,2);
        assert.equal(user0EthStaked/1,400000000000000000);
        const userPredictionPoints0 = await marketInstance.userPredictionPoints(user1,2);
        assert.equal(userPredictionPoints0/1,(user0EthStaked*1)/getPrice0);

         //place prediction for user1.
         await marketInstance.placePrediction(2,2,{value: 400000000000000000,from: user1});
        const getPrice1 = await marketInstance.getOptionPrice(2);
        assert.equal(getPrice1,13)
        const user1EthStaked = await marketInstance.ethStaked(user1,2);
        assert.equal(user1EthStaked/1, (user0EthStaked*2));
        const userPredictionPoints1 = await marketInstance.userPredictionPoints(user1,2);
         assert.equal(userPredictionPoints1/1,(user0EthStaked*3)/getPrice1);

        //place prediction for user2.
        await marketInstance.placePrediction(2,2,{value: 400000000000000000,from: user2});
        const getPrice2 = await marketInstance.getOptionPrice(2);
        assert.equal(getPrice2,13)
        const user2EthStaked = await marketInstance.ethStaked(user2,2);
        assert.equal(user2EthStaked/1,400000000000000000);
        const userPredictionPoints2 = await marketInstance.userPredictionPoints(user2,2);
        assert.equal(userPredictionPoints2/1,(user2EthStaked*2)/getPrice2);

        //place prediction for user3.
        await marketInstance.placePrediction(3,3,{value: 200000000000000000,from: user3});
        const getPrice3 = await marketInstance.getOptionPrice(3);
        assert.equal(getPrice3,6)
        const user3EthStaked = await marketInstance.ethStaked(user3,3);
        assert.equal(user3EthStaked/1,200000000000000000);
        const userPredictionPoints3 = await marketInstance.userPredictionPoints(user3,3);
        assert.equal(userPredictionPoints3/1,(user3EthStaked*3)/getPrice3);

        //place prediction for user4.
        await marketInstance.placePrediction(1,4,{value: 400000000000000000,from: user4});
        const getPrice4 = await marketInstance.getOptionPrice(1);
        assert.equal(getPrice4,20)
        const user4EthStaked = await marketInstance.ethStaked(user4,1);
        assert.equal(user4EthStaked/1,400000000000000000);
        const userPredictionPoints4 = await marketInstance.userPredictionPoints(user4,1);
        assert.equal(userPredictionPoints4/1,(user4EthStaked*4)/getPrice4);

        //place prediction for user5.
        await marketInstance.placePrediction(1,5,{value: 300000000000000000,from: user5});
        const getPrice5 = await marketInstance.getOptionPrice(1);
        assert.equal(getPrice5,20)
        const user5EthStaked = await marketInstance.ethStaked(user5,1);
        assert.equal(user5EthStaked/1,300000000000000000);
        const userPredictionPoints5 = await marketInstance.userPredictionPoints(user5,1);
        assert.equal(userPredictionPoints5/1,(user5EthStaked*5)/getPrice5);

        //place prediction for user6.
        await marketInstance.placePrediction(2,2,{value: 200000000000000000,from: user6});
        const getPrice6 = await marketInstance.getOptionPrice(2);
        assert.equal(getPrice6,13)
        const user6EthStaked = await marketInstance.ethStaked(user6,2);
        assert.equal(user6EthStaked/1,200000000000000000);
        const userPredictionPoints6 = await marketInstance.userPredictionPoints(user6,2);
        assert.equal(userPredictionPoints6/1,(user6EthStaked*2)/getPrice6);

        //place prediction for user7.
        await marketInstance.placePrediction(3,3,{value: 500000000000000000,from: user7});
        const getPrice7 = await marketInstance.getOptionPrice(3);
        assert.equal(getPrice7,6)
        const user7EthStaked = await marketInstance.ethStaked(user7,3);
        assert.equal(user7EthStaked/1,500000000000000000);
        const userPredictionPoints7 = await marketInstance.userPredictionPoints(user7,3);
        assert.equal(userPredictionPoints7/1,(user7EthStaked*3)/getPrice7);

        //place prediction for user8.
        await marketInstance.placePrediction(3,1,{value: 500000000000000000,from: user8});
        const getPrice8 = await marketInstance.getOptionPrice(3);
        assert.equal(getPrice8,6)
        const user8EthStaked = await marketInstance.ethStaked(user8,3);
        assert.equal(user8EthStaked/1,500000000000000000);
        const userPredictionPoints8 = await marketInstance.userPredictionPoints(user8,3);
        assert.equal(userPredictionPoints8/1,(user8EthStaked*1)/getPrice8);

        //place prediction for user9.
        await marketInstance.placePrediction(2,4,{value: 700000000000000000,from: user9});
        const getPrice9 = await marketInstance.getOptionPrice(2);
        assert.equal(getPrice9,13)
        const user9EthStaked = await marketInstance.ethStaked(user9,2);
        assert.equal(user9EthStaked/1,700000000000000000);
        const userPredictionPoints9 = await marketInstance.userPredictionPoints(user9,2);
        assert.equal(userPredictionPoints9/1,(user9EthStaked*4)/getPrice9);

        // check winning option.
        await marketInstance.calculatePredictionResult(900,{from: user1});
        const winningOption = await marketInstance.WinningOption();
        assert.equal(winningOption/1,1);

        //reward to distribute for winners.
        const rewardToDistribute = await marketInstance.rewardToDistribute();
        assert.equal(rewardToDistribute/1,998400000000000000);
        
        //return amount of user1
        const user1Return = await marketInstance.getReturn(user1);
        console.log("user1Return",user1Return/1)
        assert.equal(user1Return/1,680000000000000000);

        //return amount of user2.
        const user2Return = await marketInstance.getReturn(user2);
        console.log("user2Return",user2Return/1)
        assert.equal(user2Return/1,320000000000000000);

        //return amount of user3.
        const user3Return = await marketInstance.getReturn(user3);
        console.log("user3Return",user3Return/1)
        assert.equal(user3Return/1,80000000000000000);

        //return amount of user4.
        const user4Return = await marketInstance.getReturn(user4);
        console.log("user4Return",user4Return/1)
        assert.equal(user4Return/1,915303225806451600);

        //return amount of user5.
        const user5Return = await marketInstance.getReturn(user5);
        console.log("user5Return",user5Return/1)
        assert.equal(user5Return/1,783096774193548400);

        //return amount of user6.
        const user6Return = await marketInstance.getReturn(user6);
        console.log("user6Return",user6Return/1)
        assert.equal(user6Return/1,160000000000000000);

        //return amount of user7.
        const user7Return = await marketInstance.getReturn(user7);
        console.log("user7Return",user7Return/1)
        assert.equal(user7Return/1,200000000000000000);

        //return amount of user8.
        const user8Return = await marketInstance.getReturn(user8);
        console.log("user8Return",user8Return/1)
        assert.equal(user8Return/1,400000000000000000);

        //return amount of user9.
        const user9Return = await marketInstance.getReturn(user9);
        console.log("user9Return",user9Return/1)
        assert.equal(user9Return/1,420000000000000000);
        
        //claim return user1.
        const beforeClaimUser1 = await web3.eth.getBalance(user1);
        const txInfo1 = await marketInstance.claimReturn({from: user1});
        const tx1 = await web3.eth.getTransaction(txInfo1.tx);
        const gasCost1 = tx1.gasPrice * txInfo1.receipt.gasUsed;
        const afterClaimUser1 = await web3.eth.getBalance(user1);
        assert.equal(((beforeClaimUser1/1)/1e18).toFixed(6),((parseFloat(afterClaimUser1)-(parseFloat(user1Return)-parseFloat(gasCost1)))/1e18).toFixed(6));

        //claim return user2.
        const beforeClaimUser2 = await web3.eth.getBalance(user2);
        const txInfo2 = await marketInstance.claimReturn({from: user2});
        const tx2 = await web3.eth.getTransaction(txInfo2.tx);
        const gasCost2 = tx2.gasPrice * txInfo2.receipt.gasUsed;
        const afterClaimUser2 = await web3.eth.getBalance(user2);
        assert.equal(((beforeClaimUser2/1)/1e18).toFixed(6),((parseFloat(afterClaimUser2)-(parseFloat(user2Return)-parseFloat(gasCost2)))/1e18).toFixed(6));

        //claim return user3.
        const beforeClaimUser3 = await web3.eth.getBalance(user3);
        const txInfo3 = await marketInstance.claimReturn({from: user3});
        const tx3 = await web3.eth.getTransaction(txInfo3.tx);
        const gasCost3 = tx3.gasPrice * txInfo3.receipt.gasUsed;
        const afterClaimUser3 = await web3.eth.getBalance(user3);
        assert.equal(((beforeClaimUser3/1)/1e18).toFixed(6),((parseFloat(afterClaimUser3)-(parseFloat(user3Return)-parseFloat(gasCost3)))/1e18).toFixed(6));

        //claim return user4.
        const beforeClaimUser4 = await web3.eth.getBalance(user4);
        const txInfo4 = await marketInstance.claimReturn({from: user4});
        const tx4 = await web3.eth.getTransaction(txInfo4.tx);
        const gasCost4 = tx4.gasPrice * txInfo4.receipt.gasUsed;
        const afterClaimUser4 = await web3.eth.getBalance(user4);
        assert.equal(((beforeClaimUser4/1)/1e18).toFixed(6),((parseFloat(afterClaimUser4)-(parseFloat(user4Return/1)-parseFloat(gasCost4)))/1e18).toFixed(6));

        //claim return user5.
        const beforeClaimUser5 = await web3.eth.getBalance(user5);
        const txInfo5 = await marketInstance.claimReturn({from: user5});
        const tx5 = await web3.eth.getTransaction(txInfo5.tx);
        const gasCost5 = tx5.gasPrice * txInfo5.receipt.gasUsed;
        const afterClaimUser5 = await web3.eth.getBalance(user5);
        assert.equal(((beforeClaimUser5/1)/1e18).toFixed(6),((parseFloat(afterClaimUser5)-(parseFloat(user5Return)-parseFloat(gasCost5)))/1e18).toFixed(6));

        //claim return user6.
        const beforeClaimUser6 = await web3.eth.getBalance(user6);
        const txInfo6 = await marketInstance.claimReturn({from: user6});
        const tx6 = await web3.eth.getTransaction(txInfo6.tx);
        const gasCost6 = tx6.gasPrice * txInfo6.receipt.gasUsed;
        const afterClaimUser6 = await web3.eth.getBalance(user6);
        assert.equal(((beforeClaimUser6/1)/1e18).toFixed(6),((parseFloat(afterClaimUser6)-(parseFloat(user6Return)-parseFloat(gasCost6)))/1e18).toFixed(6));

        //claim return user7.
        const beforeClaimUser7 = await web3.eth.getBalance(user7);
        const txInfo7 = await marketInstance.claimReturn({from: user7});
        const tx7 = await web3.eth.getTransaction(txInfo7.tx);
        const gasCost7 = tx7.gasPrice * txInfo7.receipt.gasUsed;
        const afterClaimUser7 = await web3.eth.getBalance(user7);
        assert.equal(((beforeClaimUser7/1)/1e18).toFixed(6),((parseFloat(afterClaimUser7)-(parseFloat(user7Return)-parseFloat(gasCost7)))/1e18).toFixed(6));

        //claim return user8.
        const beforeClaimUser8 = await web3.eth.getBalance(user8);
        const txInfo8 = await marketInstance.claimReturn({from: user8});
        const tx8 = await web3.eth.getTransaction(txInfo8.tx);
        const gasCost8 = tx8.gasPrice * txInfo8.receipt.gasUsed;
        const afterClaimUser8 = await web3.eth.getBalance(user8);
        assert.equal(((beforeClaimUser8/1)/1e18).toFixed(6),((parseFloat(afterClaimUser8)-(parseFloat(user8Return)-parseFloat(gasCost8)))/1e18).toFixed(6));

        //claim return user9.
        const beforeClaimUser9 = await web3.eth.getBalance(user9);
        const txInfo9 = await marketInstance.claimReturn({from: user9});
        const tx9 = await web3.eth.getTransaction(txInfo9.tx);
        const gasCost9 = tx9.gasPrice * txInfo9.receipt.gasUsed;
        const afterClaimUser9 = await web3.eth.getBalance(user9);
        assert.equal(((beforeClaimUser9/1)/1e18).toFixed(6),((parseFloat(afterClaimUser9)-(parseFloat(user9Return)-parseFloat(gasCost9)))/1e18).toFixed(6));
        })
        })
 
