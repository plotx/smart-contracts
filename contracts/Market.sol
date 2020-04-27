pragma solidity 0.5.7;

import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/oraclize/ethereum-api/usingOraclize.sol";

contract IPlotus {

    enum MarketType {
      HourlyMarket,
      DailyMarket,
      WeeklyMarket
    }
    address public owner;
    function() external payable{}
    function callCloseMarketEvent(uint _type) public{
    }
    function callPlaceBetEvent(address _user,uint _value, uint _betPoints, uint _prediction) public{
    }
    function callClaimedEvent(address _user , uint _reward, uint _stake) public {
    }
    function callMarketResultEvent(uint _commision, uint _donation) public {
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
    BetStatus public betStatus;
    uint public WinningOption;
    uint public predictionForDate;
    uint public minBet;
    uint public totalOptions;
    uint public rate;
    uint public currentPrice;
    uint public maxReturn;
    uint internal currentPriceLocation;
    uint internal priceStep;
    address payable public DonationAccount;
    address payable public CommissionAccount;
    uint public commissionPerc;
    uint public donationPerc;
    uint public totalReward;
    uint public delta;
    bytes32 internal closeMarketId;
    bytes32 internal marketResultId;
    IPlotus internal pl;
    mapping(address => mapping(uint=>uint)) public ethStaked;
    mapping(address => mapping(uint => uint)) public userBettingPoints;
    mapping(address => bool) public userClaimedReward;
    mapping(uint => uint) public optionPrice;
    uint public rewardToDistribute;
    
    enum BetStatus {
      Started,
      Closed,
      ResultDeclared
    }
    struct option
    {
      uint minValue;
      uint maxValue;
      uint betPoints;
      uint ethStaked;
    }

    mapping(uint=>option) public optionsAvailable;

    modifier OnlyOwner() {
      require(msg.sender == pl.owner() || msg.sender == address(pl));
      _;
    }

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
      _setPrice();
      // closeMarketId = oraclize_query(expireTime-now, "URL", "json(https://financialmodelingprep.com/api/v3/majors-indexes/.DJI).price");
      // marketResultId = oraclize_query(expireTime.add(predictionForDate).sub(now), "", "");
    }

    function () external payable {
      revert("Can be deposited only through placeBet");
    }

    //Need to add check Only Admin or Any authorized address
    function setCurrentPrice(uint _currentPrice) external OnlyOwner {
      require(betStatus == BetStatus.Started,"bet not closed");
      currentPrice = _currentPrice;
      currentPriceLocation = _getDistance(1) + 1;
      _setPrice();
    }

    function setPrice() public OnlyOwner {
      _setPrice();
    }

    function _setPrice() internal {
      for(uint i = 1; i <= 7 ; i++) {
        optionPrice[i] = _calculateOptionPrice(i, address(this).balance, optionsAvailable[i].ethStaked);
      }
    }

    function _calculateOptionPrice(uint _option, uint _totalStaked, uint _ethStakedOnOption) internal view returns(uint _optionPrice) {
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
     return _calculateOptionPrice(_prediction, address(this).balance, optionsAvailable[_prediction].ethStaked);
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
          value = (uint(_stake)).div(rate);
          _betValue = _betValue.add(value.mul(10**6).div(_calculateOptionPrice(_prediction, _totalContribution, _ethStakedOnOption + flag.mul(priceStep.mul(1 ether)))));
          break;
        } else {
          _stake = _stake.sub(priceStep.mul(1 ether));
          value = (uint(priceStep.mul(1 ether))).div(rate);
          _betValue = _betValue.add(value.mul(10**6).div(_calculateOptionPrice(_prediction, _totalContribution, _ethStakedOnOption + flag.mul(priceStep.mul(1 ether)))));
          _totalContribution = _totalContribution.add(priceStep.mul(1 ether));
          flag++;
        }
      } 
    }

    function placeBet(uint _prediction) public payable {
      require(betStatus == BetStatus.Started);
      require(now >= startTime && now <= expireTime);
      require(msg.value >= minBet,"Min bet amount required");
      uint _totalContribution = address(this).balance.sub(msg.value);
      uint betValue = _calculateBetValue(_prediction, msg.value, _totalContribution);
      require(betValue > 0, "Stake too low");
      userBettingPoints[msg.sender][_prediction] = userBettingPoints[msg.sender][_prediction].add(betValue);
      ethStaked[msg.sender][_prediction] = ethStaked[msg.sender][_prediction].add(msg.value);
      optionsAvailable[_prediction].betPoints = optionsAvailable[_prediction].betPoints.add(betValue);
      optionsAvailable[_prediction].ethStaked = optionsAvailable[_prediction].ethStaked.add(msg.value);

      pl.callPlaceBetEvent(msg.sender,msg.value, betValue, _prediction);
      _setPrice();
    }

    function _closeBet() public {      
      //Bet should be closed only by oraclize address
      //Commenting this check for testing purpose. Should be un commented after testing
      // require (msg.sender == oraclize_cbAddress());
      
      require(betStatus == BetStatus.Started && now >= expireTime,"bet not yet expired");
      
      betStatus = BetStatus.Closed;
      pl.callCloseMarketEvent(betType);    
    }

    function calculateBetResult(uint _value) public {
      require(now >= expireTime.add(predictionForDate),"bet not yet expired");

      require(betStatus == BetStatus.Closed,"bet not closed");

      require(_value > 0);

      currentPrice = _value;
      betStatus = BetStatus.ResultDeclared;
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
      pl.callMarketResultEvent(commision, donation);    
    }

    function getReward(address _user)public view returns(uint){
      uint userPoints = userBettingPoints[_user][WinningOption];
      if(betStatus != BetStatus.ResultDeclared || userPoints == 0) {
        return 0;
      }
      uint reward = 0;
      if(rewardToDistribute == 0){
        uint send = ((rate).mul(2).div(100).mul(userPoints)).div(10**6);
        if(address(pl).balance > send) {
          reward = send;
        }
      } else{
        reward = userPoints.mul(rewardToDistribute).div(optionsAvailable[WinningOption].betPoints);
        uint maxReturnCap = maxReturn * ethStaked[_user][WinningOption];
        if(reward > maxReturnCap) {
          reward = maxReturnCap;
        }
      }
      return reward;
    }

    function claimReward() public {
      require(!userClaimedReward[msg.sender],"Already claimed");
      require(betStatus == BetStatus.ResultDeclared,"Result not declared");
      userClaimedReward[msg.sender] = true;
      uint userPoints;
      uint reward = 0;
      userPoints = userBettingPoints[msg.sender][WinningOption];
      uint send= ((rate).mul(2).div(100).mul(userPoints)).div(10**6);
      require(userPoints > 0,"must have atleast 0 points");
       if(rewardToDistribute == 0 && address(pl).balance > send){
           pl.withdraw(send,msg.sender); 
       }else if(rewardToDistribute == 0 && address(pl).balance < send){
           send = 0;
       } else{
          send = 0;
          reward = userPoints.mul(rewardToDistribute).div(optionsAvailable[WinningOption].betPoints);
          uint maxReturnCap = maxReturn * ethStaked[msg.sender][WinningOption];
          if(reward > maxReturnCap) {
            _transferEther(address(pl), reward.sub(maxReturnCap));
            reward = maxReturnCap;
          }
       }
       _transferEther(msg.sender, ethStaked[msg.sender][WinningOption].add(reward));
       pl.callClaimedEvent(msg.sender,reward.add(send), ethStaked[msg.sender][WinningOption]);
    }

    function _transferEther(address payable _recipient, uint _amount) internal {
      _recipient.transfer(_amount);
    }

    function __callback(bytes32 myid, string memory result) public {
      if(myid == closeMarketId) {
        _closeBet();
      } else if(myid == marketResultId) {
        calculateBetResult(parseInt(result));
      }
    }

}