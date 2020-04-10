pragma solidity 0.5.7;

import "./external/oraclize/ethereum-api/provableAPI_0.5.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";

contract IPlotus {

    enum MarketType {
      HourlyMarket,
      DailyMarket,
      WeeklyMarket
    }
    function() external payable{}
    function callCloseMarketEvent(uint _type, uint _commision, uint _donation) public{
    }
    
    function callPlaceBetEvent(address _user,uint _value, uint _betPoints, uint _prediction) public{
    }
    function callClaimedEvent(address _user , uint _reward) public {
    }
    function withdraw(uint amount,address payable _address) external {
    }
}
contract Market is usingProvable {
    using SafeMath for uint;

    uint public startTime;
    uint public expireTime;
    string public FeedSource;
    uint public betType;
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
    uint public totalReward;
    uint public delta;
    IPlotus private pl;
    mapping(address => mapping(uint=>uint)) public ethStaked;
    mapping(address => mapping(uint => uint)) public userBettingPoints;
    mapping(address => bool) public userClaimedReward;
    mapping(uint => uint) public optionPrice;
    uint public rewardToDistribute;
  
    struct option
    {
      uint minValue;
      uint maxValue;
      uint betPoints;
      uint ethStaked                                                                                                                                                                                                         ;
    }

    mapping(uint=>option) public optionsAvailable;

    function initiate(
     uint[] memory _uintparams,
     string memory _feedsource,
     address payable[] memory _addressParams
    ) 
    public
    payable 
    {
      pl = IPlotus(msg.sender);
      startTime = _uintparams[0];
      FeedSource = _feedsource;
      predictionForDate = _uintparams[2];
      minBet = _uintparams[3];
      totalOptions = _uintparams[4];
      rate = _uintparams[5];
      currentPrice = _uintparams[6];
      DonationAccount = _addressParams[0];
      CommissionAccount = _addressParams[1];
      donationPerc = _uintparams[7];
      commissionPerc  = _uintparams[8];
      optionsAvailable[0] = option(0,0,0,0);
      delta = _uintparams[9];
      require(startTime > now);
      require(donationPerc <= 100);
      require(commissionPerc <= 100);
      setOptionRanges(totalOptions);
      // _oraclizeQuery(4, endTime, "json(https://financialmodelingprep.com/api/v3/majors-indexes/.DJI).price", "", 0);
      // provable_query(expireTime, "json(https://financialmodelingprep.com/api/v3/majors-indexes/.DJI).price"); //comment to deploy
      //provable_query(expireTime.sub(now), "URL", FeedSource, 500000); //comment to deploy
    }

    function () external payable {
      revert("Can be deposited only through placeBet");
    }

    //Need to add check Only Admin or Any authorized address
    function setCurrentPrice(uint _currentPrice) external {
      currentPrice = _currentPrice;
    }

    function setPrice(uint _prediction) public {
    }

    function _getDistance(uint _option) internal view returns(uint _distance) {
      if(currentPrice > optionsAvailable[_option].maxValue) {
        _distance = (currentPrice - optionsAvailable[_option].maxValue) / delta;
      } else if(currentPrice < (optionsAvailable[_option].maxValue - delta)) {
        _distance = (optionsAvailable[_option].maxValue - currentPrice) / delta;
      }
    }

    function setOptionRanges(uint _totalOptions) internal{
      uint primaryOption = uint(_totalOptions).div(2).add(1);
      optionsAvailable[primaryOption].minValue = currentPrice.sub(uint(delta).div(2));
      optionsAvailable[primaryOption].maxValue = currentPrice.add(uint(delta).div(2));
      uint _increaseOption;
      for(uint i = primaryOption ;i>1 ;i--){
        _increaseOption = ++primaryOption;
        if(i-1 > 1){
          optionsAvailable[i-1].maxValue = optionsAvailable[i].minValue.sub(1);
          optionsAvailable[i-1].minValue = optionsAvailable[i].minValue.sub(delta);
          optionsAvailable[_increaseOption].maxValue = optionsAvailable[_increaseOption-1].maxValue.add(delta);
          optionsAvailable[_increaseOption].minValue = optionsAvailable[_increaseOption-1].maxValue.add(1);
        }
        else{
          optionsAvailable[i-1].maxValue = optionsAvailable[i].minValue.sub(1);
          optionsAvailable[i-1].minValue = 0;
          //Hard coded max uint value
          optionsAvailable[_increaseOption].maxValue = 115792089237316195423570985008687907853269984665640564039457584007913129639934;
          optionsAvailable[_increaseOption].minValue = optionsAvailable[_increaseOption-1].maxValue.add(1);
        }
      }
    }

    function getPrice(uint _prediction) public view returns(uint) {
     return optionPrice[_prediction];
    }

    function getData() public view returns
       (string memory _feedsource,uint[] memory minvalue,uint[] memory maxvalue,
        uint[] memory _optionPrice,uint _betType,uint _expireTime){
        _feedsource = FeedSource;
        _betType = betType;
        _expireTime =expireTime;
        minvalue = new uint[](totalOptions);
        maxvalue = new uint[](totalOptions);
        _optionPrice = new uint[](totalOptions);
       for (uint i = 0; i < totalOptions; i++) {
        minvalue[i] = optionsAvailable[i+1].minValue;
        maxvalue[i] = optionsAvailable[i+1].maxValue;
        _optionPrice[i] = optionPrice[i+1];
       }
    }
    
    function placeBet(uint _prediction) public payable {
      require(now >= startTime && now <= expireTime,"bet not started yet or expired");
      require(msg.value >= minBet,"value less than min bet amount");
      uint value = uint(msg.value).div(rate);
      uint betValue = value.div(getPrice(_prediction));
      userBettingPoints[msg.sender][_prediction] = userBettingPoints[msg.sender][_prediction].add(betValue);
      ethStaked[msg.sender][_prediction] = ethStaked[msg.sender][_prediction].add(msg.value);
      optionsAvailable[_prediction].betPoints = optionsAvailable[_prediction].betPoints.add(betValue);
      optionsAvailable[_prediction].ethStaked = optionsAvailable[_prediction].ethStaked.add(msg.value);

      pl.callPlaceBetEvent(msg.sender,msg.value, betValue, _prediction);
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
      uint commision;
      uint donation;
      if(optionsAvailable[WinningOption].ethStaked > 0 && totalReward > 0){
        // when  some wins some losses.
        commision = commissionPerc.mul(totalReward).div(100);
        donation = donationPerc.mul(totalReward).div(100);
        rewardToDistribute = totalReward.sub(commision).sub(donation);
        CommissionAccount.transfer(commision);
        DonationAccount.transfer(donation);
      } else if(optionsAvailable[WinningOption].ethStaked > 0 && totalReward == 0){
        // when all win.
        rewardToDistribute = 0;
        commision = 0;
        donation = 0;
      } else if(optionsAvailable[WinningOption].ethStaked == 0 && totalReward > 0){
        // when all looses. 
        uint Reward = address(this).balance;
        commision = commissionPerc.mul(Reward).div(100);
        donation = donationPerc.mul(Reward).div(100);
        uint loseReward = Reward.sub(commision).sub(donation);
        address(pl).transfer(loseReward);
        CommissionAccount.transfer(commision);
        DonationAccount.transfer(donation);       
      }  

      pl.callCloseMarketEvent(betType, commision, donation);    
    }

    function getReward(address _user)public view returns(uint){
      require(betClosed,"Bet not closed");
      uint userPoints = userBettingPoints[_user][WinningOption];
      require(userPoints > 0,"must have atleast 0 points"); 
      uint reward;
      uint send = (rate).mul(2).div(100).mul(userPoints);
      if(rewardToDistribute == 0 && address(pl).balance > send){
        reward = ethStaked[_user][WinningOption].add(send);        
      }else if(rewardToDistribute == 0 && address(pl).balance < send){
        reward = ethStaked[_user][WinningOption];
      }
      else{   
           reward =ethStaked[_user][WinningOption].add(userPoints.mul(rewardToDistribute).div(optionsAvailable[WinningOption].betPoints));
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
       if(rewardToDistribute == 0 && address(pl).balance > send){
           reward = ethStaked[msg.sender][WinningOption];
           (msg.sender).transfer(reward);
           pl.withdraw(send,msg.sender); 
       }else if(rewardToDistribute == 0 && address(pl).balance < send){
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
