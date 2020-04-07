pragma solidity 0.5.7;

import "./Plotus.sol";
import "./external/oraclize/ethereum-api/provableAPI_0.5.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";

contract Market is usingProvable {
    using SafeMath for uint;

    uint public startTime;
    uint public expireTime;
    string public FeedSource;
    uint public betType;
    bytes32 public stockName;
    bool public betClosed;
    uint public WinningOption;
    uint public predictionForDate;
    uint public minBet;
    uint public totalOptions;
    uint public rate;
    uint public currentPrice;
    address payable public DonationAccount;
    address payable public CommissionAccount;
    uint public commissionPerc;
    uint public donationPerc;
    uint public delta;
    uint public commision;
    uint public donation;
    uint public cBal;
    uint public totalReward;
    uint public totalMarketValue;
    uint public noOfPlayers;
    address[] public players;
    Plotus private pl;
    mapping(address => mapping(uint=>uint)) public ethStaked;
    mapping(address => mapping(uint => uint)) public userBettingPoints;
    mapping(address => bool) public userClaimedReward;
    mapping(uint => uint) public optionPrice;
    uint public rewardToDistribute;
    uint maxLim = 10**12;
  
    struct option
    {
      uint minValue;
      uint maxValue;
      uint betPoints;
      uint ethStaked                                                                                                                                                                                                         ;
    }

    mapping(uint=>option) public optionsAvailable;
    mapping(address =>bool) public userPlaceBet;

    

    constructor(
     uint[] memory _uintparams,
     string memory _feedsource,
     bytes32 _stockName,
     address payable[] memory _addressParams
    ) 
    public
    payable 
    {
      pl = Plotus(msg.sender);
      startTime = _uintparams[0];
      expireTime = _uintparams[1];
      FeedSource = _feedsource;
      betType = _uintparams[2];
      stockName = _stockName;
      predictionForDate = _uintparams[3];
      minBet = _uintparams[4];
      totalOptions = _uintparams[5];
      rate = _uintparams[6];
      currentPrice = _uintparams[7];
      DonationAccount = _addressParams[0];
      CommissionAccount = _addressParams[1];
      donationPerc = _uintparams[8];
      commissionPerc  = _uintparams[9];
      delta = _uintparams[10];
      optionsAvailable[0] = option(0,0,0,0);
      setOptionRanges(currentPrice,delta,totalOptions);     
      //provable_query(expireTime.sub(now), "URL", FeedSource, 500000); //comment to deploy
    }
    

    function setOptionRanges(uint _currentPrice, uint _delta, uint _totalOptions) internal{
    uint primaryOption = uint(_totalOptions).div(2).add(1);
    optionsAvailable[primaryOption].minValue = _currentPrice.sub(uint(_delta).div(2));
    optionsAvailable[primaryOption].maxValue = _currentPrice.add(uint(_delta).div(2));
    uint _increaseOption;
    for(uint i = primaryOption ;i>1 ;i--){
     _increaseOption = ++primaryOption;
      if(i-1 > 1){
        optionsAvailable[i-1].maxValue = optionsAvailable[i].minValue.sub(1);
        optionsAvailable[i-1].minValue = optionsAvailable[i].minValue.sub(_delta);
        optionsAvailable[_increaseOption].maxValue = optionsAvailable[_increaseOption-1].maxValue.add(_delta);
        optionsAvailable[_increaseOption].minValue = optionsAvailable[_increaseOption-1].maxValue.add(1);
      }
       else{
        optionsAvailable[i-1].maxValue = optionsAvailable[i].minValue.sub(1);
        optionsAvailable[i-1].minValue = 0;
        optionsAvailable[_increaseOption].maxValue = maxLim.sub(1);
        optionsAvailable[_increaseOption].minValue = optionsAvailable[_increaseOption-1].maxValue.add(1);
        }     
      }
     }

     function getPrice(uint _prediction) public view returns(uint) {
      return optionPrice[_prediction];
     }

     function setPrice(uint _prediction, uint _value) public returns(uint ,uint){
      optionPrice[_prediction] = _value;

     } 

   function getData() public view returns
       (uint _totalMarketValue,string memory _feedsource,uint[] memory minvalue,uint[] memory maxvalue,
        uint[] memory optionprice,uint _betType,uint _expireTime){
        _totalMarketValue = totalMarketValue;
        _feedsource = FeedSource;
        _betType = betType;
        _expireTime =expireTime;
        minvalue = new uint[](totalOptions);
        maxvalue = new uint[](totalOptions);
        optionprice = new uint[](totalOptions);
       for (uint i = 0; i < totalOptions; i++) {
        minvalue[i] = optionsAvailable[i+1].minValue;
        maxvalue[i] = optionsAvailable[i+1].maxValue;
        optionprice[i] = optionPrice[i+1];
       }
    }
    
    function placeBet(uint _prediction) public payable {
      require(now >= startTime && now <= expireTime,"bet not started yet or expired");
      require(msg.value >= minBet,"value less than min bet amount");
        if(!userPlaceBet[msg.sender]){
        noOfPlayers = noOfPlayers+1;
        players.push(msg.sender);
      }
      userPlaceBet[msg.sender] = true;
      uint value = uint(msg.value).div(rate);        
      uint betValue = value.div(getPrice(_prediction));
      totalMarketValue = totalMarketValue.add(msg.value);
      userBettingPoints[msg.sender][_prediction] = userBettingPoints[msg.sender][_prediction].add(betValue);
      ethStaked[msg.sender][_prediction] = ethStaked[msg.sender][_prediction].add(msg.value);
      optionsAvailable[_prediction].betPoints = optionsAvailable[_prediction].betPoints.add(betValue);
      optionsAvailable[_prediction].ethStaked = optionsAvailable[_prediction].ethStaked.add(msg.value);

      pl.callPlaceBetEvent(msg.sender,msg.value, _prediction);
    }

    function _closeBet(uint _value) public {      
      require(now > expireTime,"bet not yet expired");
      require(!betClosed,"bet closed");
      betClosed = true;
      for(uint i=1;i <= totalOptions;i++){
        if(_value <= optionsAvailable[i].maxValue && _value >= optionsAvailable[i].minValue){
          WinningOption = i;
         }         
      else{
            totalReward = totalReward.add(optionsAvailable[i].ethStaked);
          }
      }
      cBal = address(pl).balance; 
      // when  some wins some losses.
      if(optionsAvailable[WinningOption].ethStaked > 0 && totalReward > 0){
      commision = commissionPerc.mul(totalReward).div(100);
      donation = donationPerc.mul(totalReward).div(100);
      rewardToDistribute = totalReward.sub(commision).sub(donation);
      CommissionAccount.transfer(commision);
      DonationAccount.transfer(donation);
      }
      // when all win.
      if(optionsAvailable[WinningOption].ethStaked > 0 && totalReward == 0){
          rewardToDistribute = 0;   
      }
      // when all looses. 
      else if(optionsAvailable[WinningOption].ethStaked == 0 && totalReward > 0){
          uint Reward = address(this).balance;
          commision = commissionPerc.mul(Reward).div(100);
          donation = donationPerc.mul(Reward).div(100);
          uint loseReward = Reward.sub(commision).sub(donation);
          pl.deposit.value(loseReward)();
          CommissionAccount.transfer(commision);
          DonationAccount.transfer(donation);       
      }  

      pl.callCloseMarketEvent(betType);    
    }

    function getReward(address _user)public view returns(uint){
      require(userPlaceBet[_user] && betClosed,"not placed bet or bet is not closed yet");
      uint userPoints = userBettingPoints[_user][WinningOption];
      require(userPoints > 0,"must have atleast 0 points"); 
      uint reward;
      uint send = (rate).mul(2).div(100).mul(userPoints);
        if(rewardToDistribute == 0 && cBal > send){
        reward = ethStaked[_user][WinningOption].add(send);        
      }else if(rewardToDistribute == 0 && cBal < send){
        reward = ethStaked[_user][WinningOption];
      }
      return reward;
    }

    function claimReward() public {
      require(!userClaimedReward[msg.sender] && betClosed,"claimed alredy or bet is not closed yet");
      userClaimedReward[msg.sender] = true;
      uint userPoints;
      uint reward;
      uint send= (rate).mul(2).div(100).mul(userPoints);
      userPoints = userBettingPoints[msg.sender][WinningOption];
      require(userPoints > 0,"must have atleast 0 points");
       if(rewardToDistribute == 0 && cBal > send){
           reward = ethStaked[msg.sender][WinningOption];
           (msg.sender).transfer(reward);
           pl.withdraw(send,msg.sender); 
       }else if(rewardToDistribute == 0 && cBal < send){
           reward = ethStaked[msg.sender][WinningOption];
           (msg.sender).transfer(reward);
       }
       else{   
           reward =ethStaked[msg.sender][WinningOption].add(userPoints.mul(rewardToDistribute).div(optionsAvailable[WinningOption].betPoints));
           (msg.sender).transfer(reward);
       }
       pl.callClaimedEvent(msg.sender,reward.add(send));
    }

    // function __callback(string memory result) public{      
    //     if (msg.sender != provable_cbAddress()) revert();
    //     uint resultVal = safeParseInt(result);
    //     _closeBet(resultVal);
    // }
    
}
