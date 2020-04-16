pragma solidity 0.5.7;

import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/oraclize/ethereum-api/usingOraclize.sol";

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
contract Market is usingOraclize {
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
    uint public maxReturn;
    uint internal currentPriceLocation;
    uint public priceStep;
    address payable public DonationAccount;
    address payable public CommissionAccount;
    uint public commissionPerc;
    uint public donationPerc;
    uint public totalReward;
    uint public delta;
    IPlotus internal pl;
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
      uint ethStaked;
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
      maxReturn = _uintparams[10];
      priceStep = _uintparams[11];
      require(expireTime > now);
      require(donationPerc <= 100);
      require(commissionPerc <= 100);
      setOptionRanges(totalOptions);
      currentPriceLocation = _getDistance(1) + 1;
      setPrice();
      // _oraclizeQuery(expireTime, "json(https://financialmodelingprep.com/api/v3/majors-indexes/.DJI).price", "", 0);
    }

    function () external payable {
      revert("Can be deposited only through placeBet");
    }

    //Need to add check Only Admin or Any authorized address
    function setCurrentPrice(uint _currentPrice) external {
      currentPrice = _currentPrice;
      currentPriceLocation = _getDistance(1) + 1;
      setPrice();
    }

    function setPrice() public {
      for(uint i = 1; i <= 7 ; i++) {
        optionPrice[i] = _calculateOptionPrice(i, address(this).balance, optionsAvailable[i].ethStaked);
      }
    }

    function _calculateOptionPrice(uint _option, uint _totalStaked, uint _ethStakedOnOption) internal view returns(uint _optionPrice) {;
    }

    function _getDistance(uint _option) internal view returns(uint _distance) {
      
      if(currentPrice > optionsAvailable[7].minValue) {
        _distance = 7 - _option;
      } else if(currentPrice < optionsAvailable[1].maxValue) {
        _distance = _option - 1;
      } else if(currentPrice > optionsAvailable[_option].maxValue) {
        _distance = ((currentPrice - optionsAvailable[_option].maxValue) / delta) + 1;
      } else if(_option == 7) {
        _distance = (optionsAvailable[_option].minValue + delta - currentPrice) / delta;
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
        uint[] memory _optionPrice, uint[] memory _ethStaked,uint _betType,uint _expireTime){
        _feedsource = FeedSource;
        _betType = betType;
        _expireTime =expireTime;
        minvalue = new uint[](totalOptions);
        maxvalue = new uint[](totalOptions);
        _optionPrice = new uint[](totalOptions);
        _ethStaked = new uint[](totalOptions);
       for (uint i = 0; i < totalOptions; i++) {
        _ethStaked[i] = optionsAvailable[i+1].ethStaked;
        minvalue[i] = optionsAvailable[i+1].minValue;
        maxvalue[i] = optionsAvailable[i+1].maxValue;
        _optionPrice[i] = optionPrice[i+1];
       }
    }

    function estimateBetValue(uint _prediction, uint _stake) public view returns(uint _betValue){
      return _calculateBetValue(_prediction, _stake, address(this).balance);
    }

    function _calculateBetValue(uint _prediction, uint _stake, uint _totalContribution) internal view returns(uint _betValue) {
      uint value;
      _betValue = 0;
      uint flag = 0;
      uint _ethStakedOnOption = optionsAvailable[_prediction].ethStaked;
      while(_stake > 0) {
        if(_stake <= (priceStep.mul(1 ether))) {
          value = uint(_stake).div(rate);
          _betValue = _betValue.add(value.div(_calculateOptionPrice(_prediction, _totalContribution, _ethStakedOnOption + flag.mul(priceStep.mul(1 ether)))));
          break;
        } else {
          _stake = _stake.sub(priceStep.mul(1 ether));
          value = uint(priceStep.mul(1 ether)).div(rate);
          _betValue = _betValue.add(value.div(_calculateOptionPrice(_prediction, _totalContribution, _ethStakedOnOption + flag.mul(priceStep.mul(1 ether)))));
          _totalContribution = _totalContribution.add(priceStep.mul(1 ether));
          flag++;
        }
      } 
    }

    function placeBet(uint _prediction) public payable {
      require(now >= startTime && now <= expireTime,"bet not started yet or expired");
      require(msg.value >= minBet,"value less than min bet amount");
      uint _totalContribution = address(this).balance.sub(msg.value);
      uint betValue = _calculateBetValue(_prediction, msg.value, _totalContribution);
      userBettingPoints[msg.sender][_prediction] = userBettingPoints[msg.sender][_prediction].add(betValue);
      ethStaked[msg.sender][_prediction] = ethStaked[msg.sender][_prediction].add(msg.value);
      optionsAvailable[_prediction].betPoints = optionsAvailable[_prediction].betPoints.add(betValue);
      optionsAvailable[_prediction].ethStaked = optionsAvailable[_prediction].ethStaked.add(msg.value);

      pl.callPlaceBetEvent(msg.sender,msg.value, betValue, _prediction);
      setPrice();
    }

    function _closeBet(uint _value) public {      
      //Bet should be closed only by oraclize address
      //Commenting this check for testing purpose. Should be un commented after testing
      // require (msg.sender == oraclize_cbAddress());
      
      require(now > expireTime,"bet not yet expired");
      
      require(!betClosed,"bet closed");
      
      require(_value > 0);
      
      currentPrice = _value;
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
        _transferEther(CommissionAccount, commision);
        _transferEther(DonationAccount, donation);
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
        _transferEther(address(pl), loseReward);
        _transferEther(CommissionAccount, commision);
        _transferEther(DonationAccount, donation);
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
        uint _rew = userPoints.mul(rewardToDistribute).div(optionsAvailable[WinningOption].betPoints);
        uint maxReturnCap = maxReturn * ethStaked[_user][WinningOption];
        if(_rew > maxReturnCap) {
          _rew = maxReturnCap;
        }
        reward = ethStaked[_user][WinningOption].add(_rew);
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
           pl.withdraw(send,msg.sender); 
       }else if(rewardToDistribute == 0 && address(pl).balance < send){
           reward = ethStaked[msg.sender][WinningOption];
       } else{
          uint _rew = userPoints.mul(rewardToDistribute).div(optionsAvailable[WinningOption].betPoints);
          uint maxReturnCap = maxReturn * ethStaked[msg.sender][WinningOption];
          if(_rew > maxReturnCap) {
            _transferEther(address(pl), _rew.sub(maxReturnCap));
            _rew = maxReturnCap;
          }
          reward =ethStaked[msg.sender][WinningOption].add(_rew);
       }
       _transferEther(msg.sender, reward);
       pl.callClaimedEvent(msg.sender,reward.add(send));
    }

    function _transferEther(address payable _recipient, uint _amount) internal {
      _recipient.transfer(_amount);
    }

    /**
     * @dev oraclize query
     * @param timestamp is the current timestamp
     * @param datasource in concern
     * @param arg in concern
     * @param gasLimit required for query
     * @return id of oraclize query
     */
    function _oraclizeQuery(
        uint timestamp,
        string memory datasource,
        string memory arg,
        uint gasLimit
    ) 
        internal
        returns (bytes32 id)
    {
        id = oraclize_query(timestamp, datasource, arg, gasLimit);
    }

    function __callback(bytes32 myid, string memory result) public {
        _closeBet(parseInt(result));
    }

}