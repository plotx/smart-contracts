pragma solidity 0.5.7;

import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/oraclize/ethereum-api/usingOraclize.sol";
import "./config/MarketConfig.sol";
import "./interface/IChainLinkOracle.sol";
import "./external/openzeppelin-solidity/token/ERC20/IERC20.sol";

contract IPlotus {

    enum MarketType {
      HourlyMarket,
      DailyMarket,
      WeeklyMarket
    }
    address public owner;
    address public plotusToken;
    function() external payable{}
    function callPlacePredictionEvent(address _user,uint _value, uint _predictionPoints, uint _prediction,uint _leverage) public{
    }
    function callClaimedEvent(address _user , uint _reward, uint _stake, uint _ploIncentive) public {
    }
    function callMarketResultEvent(uint _commision, uint _donation, uint _totalReward, uint _winningOption) public {
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
    uint public rate;
    uint public minBet;
    uint public WinningOption;
    bytes32 internal marketResultId;
    uint public rewardToDistribute;
    PredictionStatus internal predictionStatus;
    uint internal predictionForDate;
    address public predictionAsset;
    uint incentiveToDistribute;
    uint totalStaked;
    
    mapping(address => mapping(uint => uint)) public assetStaked;
    mapping(address => mapping(uint => uint)) internal LeverageAsset;
    mapping(address => mapping(uint => uint)) public userPredictionPoints;
    mapping(address => bool) internal userClaimedReward;

    IPlotus internal pl;
    MarketConfig internal marketConfig;
    
    struct option
    {
      uint minValue;
      uint maxValue;
      uint predictionPoints;
      uint assetStaked;
      uint assetLeveraged;
      address[] stakers;
    }

    mapping(uint=>option) public optionsAvailable;

    IChainLinkOracle internal chainLinkOracle;

    modifier OnlyOwner() {
      require(msg.sender == pl.owner() || msg.sender == address(pl));
      _;
    }

    function initiate(uint[] memory _uintparams,string memory _feedsource,address _marketConfig, address _predictionAsset, uint256 _ploIncentive) public payable {
      pl = IPlotus(msg.sender);
      marketConfig = MarketConfig(_marketConfig);
      startTime = _uintparams[0];
      FeedSource = _feedsource;
      predictionForDate = _uintparams[1];
      rate = _uintparams[2];
      // optionsAvailable[0] = option(0,0,0,0,0,address(0));
      (uint predictionTime, , , , , ) = marketConfig.getPriceCalculationParams();
      expireTime = startTime + predictionTime;
      require(expireTime > now);
      setOptionRanges(_uintparams[3],_uintparams[4]);
      marketResultId = oraclize_query(predictionForDate, "URL", "json(https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT).price", 400000);
      chainLinkOracle = IChainLinkOracle(marketConfig.getChainLinkPriceOracle());
      predictionAsset = _predictionAsset;
      incentiveToDistribute = _ploIncentive;
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

    function getAssetBalance() internal view returns(uint256) {
      if(address(predictionAsset) == address(0)) {
        return address(this).balance;
      } else {
        return IERC20(predictionAsset).balanceOf(address(this));
      }
    }
  
    function _calculateOptionPrice(uint _option, uint _totalStaked, uint _assetStakedOnOption) internal view returns(uint _optionPrice) {
      _optionPrice = 0;
      uint currentPriceOption = 0;
      (uint predictionTime, ,uint stakeWeightage,uint stakeWeightageMinAmount,uint predictionWeightage,uint minTimeElapsed) = marketConfig.getPriceCalculationParams();
      if(now > expireTime) {
        return 0;
      }
      if(_totalStaked > stakeWeightageMinAmount) {
        _optionPrice = (_assetStakedOnOption).mul(1000000).div(_totalStaked.mul(stakeWeightage));
      }
      uint currentPrice = uint(chainLinkOracle.latestAnswer()).div(10**8);
      uint maxDistance;
      if(currentPrice < optionsAvailable[2].minValue) {
        currentPriceOption = 1;
        maxDistance = 2;
      } else if(currentPrice > optionsAvailable[2].maxValue) {
        currentPriceOption = 3;
        maxDistance = 2;
      } else {
        currentPriceOption = 2;
        maxDistance = 1;
      }
      uint distance = currentPriceOption > _option ? currentPriceOption.sub(_option) : _option.sub(currentPriceOption);
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

    function _calculatePredictionValue(uint _prediction, uint _stake, uint _priceStep, uint _leverage) internal view returns(uint _predictionValue) {
      uint value;
      uint flag = 0;
      uint _totalStaked = totalStaked;
      uint _assetStakedOnOption = optionsAvailable[_prediction].assetStaked;
      _predictionValue = 0;
      while(_stake > 0) {
        if(_stake <= (_priceStep)) {
          value = (uint(_stake)).div(rate);
          _predictionValue = _predictionValue.add(value.mul(_leverage).div(_calculateOptionPrice(_prediction, _totalStaked, _assetStakedOnOption + flag.mul(_priceStep))));
          break;
        } else {
          _stake = _stake.sub(_priceStep);
          value = (uint(_priceStep)).div(rate);
          _predictionValue = _predictionValue.add(value.mul(_leverage).div(_calculateOptionPrice(_prediction, _totalStaked, _assetStakedOnOption + flag.mul(_priceStep))));
          _totalStaked = _totalStaked.add(_priceStep);
          flag++;
        }
      } 
    }

    function estimatePredictionValue(uint _prediction, uint _stake, uint _leverage) public view returns(uint _predictionValue){
      (, , , , , , uint priceStep) = marketConfig.getBasicMarketDetails();
      return _calculatePredictionValue(_prediction, _stake, priceStep, _leverage);
    }


    function getOptionPrice(uint _prediction) public view returns(uint) {
      // (, , , , , , ) = marketConfig.getBasicMarketDetails();
     return _calculateOptionPrice(_prediction, totalStaked, optionsAvailable[_prediction].assetStaked);
    }

    function getData() public view returns
       (string memory _feedsource,uint[] memory minvalue,uint[] memory maxvalue,
        uint[] memory _optionPrice, uint[] memory _assetStaked,uint _predictionType,uint _expireTime, uint _predictionStatus){
        uint totalOptions;
        (_predictionType, totalOptions, , , , , ) = marketConfig.getBasicMarketDetails();
        _feedsource = FeedSource;
        _expireTime =expireTime;
        _predictionStatus = uint(marketStatus());
        minvalue = new uint[](3);
        maxvalue = new uint[](3);
        _optionPrice = new uint[](3);
        _assetStaked = new uint[](3);
        for (uint i = 0; i < 3; i++) {
        _assetStaked[i] = optionsAvailable[i+1].assetStaked;
        minvalue[i] = optionsAvailable[i+1].minValue;
        maxvalue[i] = optionsAvailable[i+1].maxValue;
        _optionPrice[i] = _calculateOptionPrice(i+1, totalStaked, optionsAvailable[i+1].assetStaked);
       }
    }

    function getMarketResults() public view returns(uint256, uint256, uint256, address[] memory, uint256) {
      return (WinningOption, optionsAvailable[WinningOption].predictionPoints, rewardToDistribute, optionsAvailable[WinningOption].stakers, optionsAvailable[WinningOption].assetStaked);
    }

    /**
    * @dev Place prediction with '_predictionStake' amount on '_prediction' option with '_leverage' leverage
    */
    function placePrediction(uint256 _predictionStake, uint256 _prediction,uint256 _leverage) public payable {
      // require(_prediction <= 3 && _leverage <= 5);
      require(now >= startTime && now <= expireTime);
      (, ,uint minPrediction, , , , uint priceStep) = marketConfig.getBasicMarketDetails();
      require(_predictionStake >= minPrediction,"Min prediction amount required");

      if(predictionAsset == address(0)) {
        require(_predictionStake == msg.value);
      } else {
        require(msg.value == 0);
        require(IERC20(predictionAsset).transferFrom(msg.sender, address(this), _predictionStake));
      }

      uint optionPrice = _calculatePredictionValue(_prediction, _predictionStake, priceStep, _leverage);
      uint predictionPoints = optionPrice;
      if(userPredictionPoints[msg.sender][_prediction] == 0) {
        optionsAvailable[_prediction].stakers.push(msg.sender);
      }
      totalStaked = totalStaked.add(_predictionStake);
      userPredictionPoints[msg.sender][_prediction] = userPredictionPoints[msg.sender][_prediction].add(predictionPoints);
      assetStaked[msg.sender][_prediction] = assetStaked[msg.sender][_prediction].add(_predictionStake);
      LeverageAsset[msg.sender][_prediction] = LeverageAsset[msg.sender][_prediction].add(_predictionStake.mul(_leverage));
      optionsAvailable[_prediction].predictionPoints = optionsAvailable[_prediction].predictionPoints.add(predictionPoints);
      optionsAvailable[_prediction].assetStaked = optionsAvailable[_prediction].assetStaked.add(_predictionStake);
      optionsAvailable[_prediction].assetLeveraged = optionsAvailable[_prediction].assetLeveraged.add(_predictionStake.mul(_leverage));
      pl.callPlacePredictionEvent(msg.sender,_predictionStake, predictionPoints, _prediction, _leverage);
    }

    function calculatePredictionResult(uint _value) public {
      require(msg.sender == pl.owner() || msg.sender == oraclize_cbAddress());
      require(now >= predictionForDate,"Time not reached");
      require(_value > 0,"value should be greater than 0");
      (,uint totalOptions, , , ,uint lossPercentage, ) = marketConfig.getBasicMarketDetails();
      uint totalReward = 0;
      uint distanceFromWinningOption = 0;
      predictionStatus = PredictionStatus.ResultDeclared;
      if(_value < optionsAvailable[2].minValue) {
        WinningOption = 1;
      } else if(_value > optionsAvailable[2].maxValue) {
        WinningOption = 3;
      } else {
        WinningOption = 2;
      }
      for(uint i=1;i <= totalOptions;i++){
       distanceFromWinningOption = i>WinningOption ? i.sub(WinningOption) : WinningOption.sub(i);    
       totalReward = totalReward.add((distanceFromWinningOption.mul(lossPercentage).mul(optionsAvailable[i].assetLeveraged)).div(100));
      }
      //Get donation, commission addresses and percentage
      (address payable donationAccount, uint donation, address payable commissionAccount, uint commission) = marketConfig.getFundDistributionParams();
       commission = commission.mul(totalReward).div(100);
       donation = donation.mul(totalReward).div(100);
       rewardToDistribute = totalReward.sub(commission).sub(donation);
       _transferAsset(predictionAsset, commissionAccount, commission);
       _transferAsset(predictionAsset, donationAccount, donation);
      if(optionsAvailable[WinningOption].assetStaked == 0){
       _transferAsset(predictionAsset, address(pl), rewardToDistribute);
      }

       pl.callMarketResultEvent(commission, donation, rewardToDistribute, WinningOption);    
    }

    function _transferAsset(address _asset, address payable _recipient, uint256 _amount) internal {
      if(_asset == address(0)) {
        _recipient.transfer(_amount);
      } else {
        require(IERC20(_asset).transfer(_recipient, _amount));
      }
    }

    function getReturn(address _user)public view returns(uint, uint){
      uint _return = 0; 
      uint distanceFromWinningOption = 0;
      (,uint totalOptions, , , ,uint lossPercentage, ) = marketConfig.getBasicMarketDetails();
      if(predictionStatus != PredictionStatus.ResultDeclared ) {
       return (0,0);
      }
      uint totalUserAssetStaked = 0;
      for(uint i=1;i<=totalOptions;i++){
        totalUserAssetStaked = totalUserAssetStaked.add(assetStaked[_user][i]);
        distanceFromWinningOption = i>WinningOption ? i.sub(WinningOption) : WinningOption.sub(i); 
        _return =  _callReturn(_return, _user, i, lossPercentage, distanceFromWinningOption);
      }
      uint incentive =  totalUserAssetStaked.mul(incentiveToDistribute).div(totalStaked);
      uint reward = userPredictionPoints[_user][WinningOption].mul(rewardToDistribute).div(optionsAvailable[WinningOption].predictionPoints);
      uint returnAmount =  reward.add(_return);
      return (returnAmount, incentive);
    }

    function getPendingReturn(address _user) external view returns(uint, uint){
      if(userClaimedReward[_user]) return (0,0);
      return getReturn(_user);
    }
    
    //Split getReturn() function otherwise it shows compilation error(e.g; stack too deep).
    function _callReturn(uint _return,address _user,uint i,uint lossPercentage,uint distanceFromWinningOption)internal view returns(uint){
      return _return.add(assetStaked[_user][i].sub((LeverageAsset[_user][i].mul(distanceFromWinningOption).mul(lossPercentage)).div(100)));
    }

    function claimReturn(address payable _user) public {
      require(!userClaimedReward[_user],"Already claimed");
      require(predictionStatus == PredictionStatus.ResultDeclared,"Result not declared");
      userClaimedReward[_user] = true;
      (uint returnAmount, uint incentive) = getReturn(_user);
      // _user.transfer(returnAmount);
      _transferAsset(predictionAsset, _user, returnAmount);
      _transferAsset(pl.plotusToken(), _user, incentive);
      pl.callClaimedEvent(_user,returnAmount, assetStaked[_user][WinningOption], incentive);
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
