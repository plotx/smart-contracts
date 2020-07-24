pragma solidity 0.5.7;

import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/oraclize/ethereum-api/usingOraclize.sol";
import "./config/MarketConfig.sol";
import "./interface/IChainLinkOracle.sol";

contract IPlotus {

    enum MarketType {
      HourlyMarket,
      DailyMarket,
      WeeklyMarket
    }
    address public owner;
    function() external payable{}
    function callPlacePredictionEvent(address _user,uint _value, uint _predictionPoints, uint _prediction,uint _leverage) public{
    }
    function callClaimedEvent(address _user , uint _reward, uint _stake) public {
    }
    function callMarketResultEvent(uint _commision, uint _donation) public {
    }
}
contract Market is usingOraclize {
    using SafeMath for uint;

    enum PredictionStatus {
      Started,
      Closed,
      ResultDeclared
    }
  
    uint internal startTime;
    uint internal expireTime;
    string internal FeedSource;
    uint internal rate;
    uint public WinningOption;
    bytes32 internal marketResultId;
    uint public rewardToDistribute;
    PredictionStatus internal predictionStatus;
    uint internal predictionForDate;
    
    mapping(address => mapping(uint => uint)) public ethStaked;
    mapping(address => mapping(uint => uint)) internal LeverageEth;
    mapping(address => mapping(uint => uint)) public userPredictionPoints;
    mapping(address => bool) internal userClaimedReward;

    IPlotus internal pl;
    MarketConfig internal marketConfig;
    
    struct option
    {
      uint minValue;
      uint maxValue;
      uint predictionPoints;
      uint ethStaked;
      uint ethLeveraged;
    }

    mapping(uint=>option) public optionsAvailable;

    IChainLinkOracle internal chainLinkOracle;

    modifier OnlyOwner() {
      require(msg.sender == pl.owner() || msg.sender == address(pl));
      _;
    }

    function initiate(uint[] memory _uintparams,string memory _feedsource,address marketConfigs) public {
      pl = IPlotus(msg.sender);
      marketConfig = MarketConfig(marketConfigs);
      startTime = _uintparams[0];
      FeedSource = _feedsource;
      predictionForDate = _uintparams[1];
      rate = _uintparams[2];
      optionsAvailable[0] = option(0,0,0,0,0);
      (uint predictionTime, , , , , ) = marketConfig.getPriceCalculationParams();
      expireTime = startTime + predictionTime;
      require(expireTime > now);
      setOptionRanges(_uintparams[3],_uintparams[4]);
      marketResultId = oraclize_query(predictionForDate, "URL", "json(https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT).price");
      chainLinkOracle = IChainLinkOracle(marketConfig.getChainLinkPriceOracle());
    }

    function () external payable {
      revert("Can be deposited only through placePrediction");
    }

    function marketStatus() internal view returns(PredictionStatus){
      if(predictionStatus == PredictionStatus.Started && now >= expireTime) {
        return PredictionStatus.Closed;
      }
        return predictionStatus;
    }
  
    function _calculateOptionPrice(uint _option, uint _totalStaked, uint _ethStakedOnOption, uint _totalOptions) internal view returns(uint _optionPrice) {
      _optionPrice = 0;
      uint currentPriceOption = 0;
      (uint predictionTime,uint optionStartIndex,uint stakeWeightage,uint stakeWeightageMinAmount,uint predictionWeightage,uint minTimeElapsed) = marketConfig.getPriceCalculationParams();
      if(now > expireTime) {
        return 0;
      }
      if(_totalStaked > stakeWeightageMinAmount) {
        _optionPrice = (_ethStakedOnOption).mul(1000000).div(_totalStaked.mul(stakeWeightage));
      }
      uint currentPrice = uint(chainLinkOracle.latestAnswer()).div(10**8);
         for(uint i=1;i <= _totalOptions;i++){
        if(currentPrice <= optionsAvailable[i].maxValue && currentPrice >= optionsAvailable[i].minValue){
          currentPriceOption = i;
        }
        }    
      uint distance = currentPriceOption > _option ? currentPriceOption.sub(_option) : _option.sub(currentPriceOption);
      uint maxDistance = currentPriceOption > (_totalOptions.div(2))? (currentPriceOption.sub(optionStartIndex)): (_totalOptions.sub(currentPriceOption));
      // uint maxDistance = 7 - (_option > distance ? _option - distance: _option + distance);
      uint timeElapsed = now > startTime ? now.sub(startTime) : 0;
      timeElapsed = timeElapsed > minTimeElapsed ? timeElapsed: minTimeElapsed;
      _optionPrice = _optionPrice.add((((maxDistance+1).sub(distance)).mul(1000000).mul(timeElapsed)).div((maxDistance+1).mul(predictionWeightage).mul(predictionTime)));
       _optionPrice = _optionPrice.div(100);
    }

    function setOptionRanges(uint _midRangeMin, uint _midRangeMax) internal{
     optionsAvailable[1].minValue = 0;
     optionsAvailable[1].maxValue = _midRangeMin.sub(1);
     optionsAvailable[2].minValue = _midRangeMin;
     optionsAvailable[2].maxValue = _midRangeMax;
     optionsAvailable[3].minValue = _midRangeMax.add(1);
     optionsAvailable[3].maxValue = ~uint256(0) ;
    }

    function getOptionPrice(uint _prediction) public view returns(uint) {
      (, uint totalOptions, , , , ) = marketConfig.getBasicMarketDetails();
     return _calculateOptionPrice(_prediction, address(this).balance, optionsAvailable[_prediction].ethStaked, totalOptions);
    }

    function getData() public view returns
       (string memory _feedsource,uint[] memory minvalue,uint[] memory maxvalue,
        uint[] memory _optionPrice, uint[] memory _ethStaked,uint _predictionType,uint _expireTime, uint _predictionStatus){
        uint totalOptions;
        (_predictionType, totalOptions, , , , ) = marketConfig.getBasicMarketDetails();
        _feedsource = FeedSource;
        _expireTime =expireTime;
        _predictionStatus = uint(marketStatus());
        minvalue = new uint[](totalOptions);
        maxvalue = new uint[](totalOptions);
        _optionPrice = new uint[](totalOptions);
        _ethStaked = new uint[](totalOptions);
        for (uint i = 0; i < totalOptions; i++) {
        _ethStaked[i] = optionsAvailable[i+1].ethStaked;
        minvalue[i] = optionsAvailable[i+1].minValue;
        maxvalue[i] = optionsAvailable[i+1].maxValue;
        _optionPrice[i] = _calculateOptionPrice(i+1, address(this).balance, optionsAvailable[i+1].ethStaked, totalOptions);
       }
    }

    function placePrediction(uint _prediction,uint _leverage) public payable {
      require(now >= startTime && now <= expireTime);
      (, ,uint minPrediction, , , ) = marketConfig.getBasicMarketDetails();
      require(msg.value >= minPrediction,"Min prediction amount required");
      uint optionPrice = getOptionPrice(_prediction); // need to fix getOptionPrice function.
      uint predictionPoints = (msg.value.div(optionPrice)).mul(_leverage);
      userPredictionPoints[msg.sender][_prediction] = userPredictionPoints[msg.sender][_prediction].add(predictionPoints);
      ethStaked[msg.sender][_prediction] = ethStaked[msg.sender][_prediction].add(msg.value);
      LeverageEth[msg.sender][_prediction] = LeverageEth[msg.sender][_prediction].add(msg.value.mul(_leverage));
      optionsAvailable[_prediction].predictionPoints = optionsAvailable[_prediction].predictionPoints.add(predictionPoints);
      optionsAvailable[_prediction].ethStaked = optionsAvailable[_prediction].ethStaked.add(msg.value);
      optionsAvailable[_prediction].ethLeveraged = optionsAvailable[_prediction].ethLeveraged.add(msg.value.mul(_leverage));
      pl.callPlacePredictionEvent(msg.sender,msg.value, predictionPoints, _prediction, _leverage);
    }

    function calculatePredictionResult(uint _value) public {
      require(msg.sender == pl.owner() || msg.sender == oraclize_cbAddress());
      require(now >= predictionForDate,"Time not reached");
      require(_value > 0,"value should be greater than 0");
     (,uint totalOptions, , , ,uint lossPercentage) = marketConfig.getBasicMarketDetails();
      uint totalReward = 0;
      uint distanceFromWinningOption = 0;
      predictionStatus = PredictionStatus.ResultDeclared;
      for(uint i=1;i <= totalOptions;i++){
        if(_value <= optionsAvailable[i].maxValue && _value >= optionsAvailable[i].minValue){
          WinningOption = i;
        }
        } 
       for(uint i=1;i <= totalOptions;i++){
        distanceFromWinningOption = i>WinningOption ? i.sub(WinningOption) : WinningOption.sub(i);    
        totalReward = totalReward.add((distanceFromWinningOption.mul(lossPercentage).mul(optionsAvailable[i].ethLeveraged)).div(100));
       }
       //Get donation, commission addresses and percentage
       (address payable donationAccount, uint donation, address payable commissionAccount, uint commission) = marketConfig.getFundDistributionParams();
        commission = commission.mul(totalReward).div(100);
        donation = donation.mul(totalReward).div(100);
        rewardToDistribute = totalReward.sub(commission).sub(donation);
        commissionAccount.transfer(commission);
        donationAccount.transfer(donation);
       if(optionsAvailable[WinningOption].ethStaked == 0){
        address(pl).transfer(rewardToDistribute);
       }

       pl.callMarketResultEvent(commission, donation);    
    }

    function getReturn(address _user)public view returns(uint){
     uint ethReturn = 0; 
     uint distanceFromWinningOption = 0;
      (,uint totalOptions, , , ,uint lossPercentage) = marketConfig.getBasicMarketDetails();
       if(predictionStatus != PredictionStatus.ResultDeclared ) {
        return 0;
       }
     for(uint i=1;i<=totalOptions;i++){
      distanceFromWinningOption = i>WinningOption ? i.sub(WinningOption) : WinningOption.sub(i); 
      ethReturn =  _calEthReturn(ethReturn,_user,i,lossPercentage,distanceFromWinningOption);
      }     
     uint reward = userPredictionPoints[_user][WinningOption].mul(rewardToDistribute).div(optionsAvailable[WinningOption].predictionPoints);
     uint returnAmount =  reward.add(ethReturn);
     return returnAmount;
    }
    
    //Split getReturn() function otherwise it shows compilation error(e.g; stack too deep).
    function _calEthReturn(uint ethReturn,address _user,uint i,uint lossPercentage,uint distanceFromWinningOption)internal view returns(uint){
        return ethReturn.add(ethStaked[_user][i].sub((LeverageEth[_user][i].mul(distanceFromWinningOption).mul(lossPercentage)).div(100)));
    }

    function claimReturn() public {
      require(!userClaimedReward[msg.sender],"Already claimed");
      require(predictionStatus == PredictionStatus.ResultDeclared,"Result not declared");
      userClaimedReward[msg.sender] = true;
      (uint returnAmount) = getReturn(msg.sender);
       msg.sender.transfer(returnAmount);
      pl.callClaimedEvent(msg.sender,returnAmount, ethStaked[msg.sender][WinningOption]);
    }

    function __callback(bytes32 myid, string memory result) public {
      // if(myid == closeMarketId) {
      //   _closeBet();
      // } else if(myid == marketResultId) {
      require ((myid==marketResultId));
      //Check oraclise address
      calculatePredictionResult(parseInt(result));
      // }
    }

}
