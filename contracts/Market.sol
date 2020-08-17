pragma solidity 0.5.7;

import "./external/oraclize/ethereum-api/provableAPI.sol";
import "./config/MarketConfig.sol";
import "./interfaces/IToken.sol";
import "./interfaces/ITokenController.sol";

contract IPlotus {

    enum MarketType {
      HourlyMarket,
      DailyMarket,
      WeeklyMarket
    }
    address public owner;
    address public tokenController;
    address public marketConfig;
    function() external payable{}
    function createGovernanceProposal(string memory proposalTitle, string memory description, string memory solutionHash, bytes memory actionHash, uint256 stakeForDispute, address user) public {
    }
    function callPlacePredictionEvent(address _user,uint _value, uint _predictionPoints, uint _predictionAsset, uint _prediction,uint _leverage) public{
    }
    function callClaimedEvent(address _user , uint[] memory _reward, address[] memory predictionAssets, uint[] memory incentives, address[] memory incentiveTokens) public {
    }
    function callMarketResultEvent(address[] memory predictionAssets, uint[] memory _totalReward, uint[] memory _commision, uint _winningOption) public {
    }
}
contract Market is usingProvable {
    using SafeMath for uint;

    enum PredictionStatus {
      Started,
      Closed,
      ResultDeclared
    }
  
    uint constant totalOptions = 3;
    uint internal startTime;
    uint internal expireTime;
    bytes32 internal marketCurrency;
    address internal marketCurrencyAddress;
    uint public rate;
    uint public WinningOption;
    bool public lockedForDispute;
    bytes32 internal marketResultId;
    uint[] public rewardToDistribute;
    PredictionStatus internal predictionStatus;
    uint internal settleTime;
    uint internal marketCoolDownTime;
    uint totalStaked;

    bool commissionExchanged;

    address[] predictionAssets;
    address[] incentiveTokens;
    
    mapping(address => mapping(address => mapping(uint => uint))) public assetStaked;
    mapping(address => mapping(address => mapping(uint => uint))) internal LeverageAsset;
    mapping(address => mapping(uint => uint)) public userPredictionPoints;
    mapping(address => uint256) internal commissionAmount;
    mapping(address => uint256) internal stakedTokenApplied;
    mapping(address => bool) internal userClaimedReward;

    IPlotus internal pl;
    ITokenController internal tokenController;
    MarketConfig internal marketConfig;
    address internal token;
    
    struct option
    {
      uint minValue;
      uint maxValue;
      uint predictionPoints;
      uint assetStakedValue;
      mapping(address => uint256) assetStaked;
      mapping(address => uint256) assetLeveraged;
      address[] stakers;
    }

    mapping(address => uint256) incentiveToDistribute;
    mapping(uint=>option) public optionsAvailable;

    function initiate(uint _startTime, uint _predictionTime, uint _settleTime, uint _minValue, uint _maxValue, bytes32 _marketCurrency,address _marketCurrencyAddress) public payable {
      pl = IPlotus(msg.sender);
      marketConfig = MarketConfig(pl.marketConfig());
      tokenController = ITokenController(pl.tokenController());
      token = tokenController.token();
      startTime = _startTime;
      marketCurrency = _marketCurrency;
      marketCurrencyAddress = _marketCurrencyAddress;
      settleTime = _settleTime;
      // optionsAvailable[0] = option(0,0,0,0,0,address(0));
      uint _coolDownTime;
      uint _rate;
      (predictionAssets, incentiveTokens, _coolDownTime, _rate) = marketConfig.getMarketInitialParams();
      rate = _rate;
      uint predictionTime = _predictionTime; 
      expireTime = startTime + predictionTime;
      marketCoolDownTime = expireTime + _coolDownTime;
      require(expireTime > now);
      setOptionRanges(_minValue,_maxValue);
      marketResultId = provable_query(settleTime, "URL", "json(https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT).price", 400000);
      // chainLinkOracle = IChainLinkOracle(marketConfig.getChainLinkPriceOracle());
      // incentiveTokens = _incentiveTokens;
      // uniswapFactoryAddress = _uniswapFactoryAdd;
      // factory = Factory(_uniswapFactoryAdd);
    }

    function marketStatus() internal view returns(PredictionStatus){
      if(predictionStatus == PredictionStatus.Started && now >= expireTime) {
        return PredictionStatus.Closed;
      }
      return predictionStatus;
    }

    function _getAssetValue(address _exchange, uint256 _amount) internal view returns(uint256) {
      return Exchange(_exchange).getTokenToEthInputPrice(_amount);
    }
  
    function _calculateOptionPrice(uint _option, uint _totalStaked, uint _assetStakedOnOption) internal view returns(uint _optionPrice) {
      _optionPrice = 0;
      uint currentPriceOption = 0;
      (uint predictionTime, ,uint stakeWeightage,uint stakeWeightageMinAmount,uint predictionWeightage,uint minTimeElapsed, uint currentPrice) = marketConfig.getPriceCalculationParams(marketCurrencyAddress);
      if(now > expireTime) {
        return 0;
      }
      if(_totalStaked > stakeWeightageMinAmount) {
        _optionPrice = (_assetStakedOnOption).mul(1000000).div(_totalStaked.mul(stakeWeightage));
      }

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
      uint _assetStakedOnOption = optionsAvailable[_prediction].assetStakedValue;
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
      (, , , , uint priceStep, uint256 positionDecimals) = marketConfig.getBasicMarketDetails();
      return _calculatePredictionValue(_prediction, _stake.mul(positionDecimals), priceStep, _leverage);
    }


    function getOptionPrice(uint _prediction) public view returns(uint) {
      // (, , , , , , ) = marketConfig.getBasicMarketDetails();
     return _calculateOptionPrice(_prediction, totalStaked, optionsAvailable[_prediction].assetStakedValue);
    }

    function getData() public view returns
       (bytes32 _marketCurrency,uint[] memory minvalue,uint[] memory maxvalue,
        uint[] memory _optionPrice, uint[] memory _assetStaked,uint _predictionType,uint _expireTime, uint _predictionStatus){
        (_predictionType, , , , , ) = marketConfig.getBasicMarketDetails();
        _marketCurrency = marketCurrency;
        _expireTime =expireTime;
        _predictionStatus = uint(marketStatus());
        minvalue = new uint[](totalOptions);
        maxvalue = new uint[](totalOptions);
        _optionPrice = new uint[](totalOptions);
        _assetStaked = new uint[](totalOptions);
        for (uint i = 0; i < totalOptions; i++) {
        _assetStaked[i] = optionsAvailable[i+1].assetStakedValue;
        minvalue[i] = optionsAvailable[i+1].minValue;
        maxvalue[i] = optionsAvailable[i+1].maxValue;
        _optionPrice[i] = _calculateOptionPrice(i+1, totalStaked, optionsAvailable[i+1].assetStakedValue);
       }
    }

    function getMarketResults() public view returns(uint256, uint256, uint256[] memory, address[] memory, uint256) {
      return (WinningOption, optionsAvailable[WinningOption].predictionPoints, rewardToDistribute, optionsAvailable[WinningOption].stakers, optionsAvailable[WinningOption].assetStakedValue);
    }

    /**
    * @dev Place prediction with '_predictionStake' amount on '_prediction' option with '_leverage' leverage
    */
    function placePrediction(address _asset, uint256 _predictionStake, uint256 _prediction,uint256 _leverage) public payable {
      // require(_prediction <= 3 && _leverage <= 5);
      require(now >= startTime && now <= expireTime);
      if(_asset == tokenController.bLOTToken()) {
        require(_leverage == 5);
        tokenController.swapBLOT(_predictionStake);
        _asset = token;
      } else {
        require(_isAllowedToStake(_asset));
      }
      (uint256 _commision, address _exchange) = marketConfig.getAssetData(_asset);
      _predictionStake = _collectInterestReturnStake(_commision, _predictionStake, _asset);
      uint256 _stakeValue = _predictionStake;
      if(_asset == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
        require(_predictionStake == msg.value);
      } else {
        require(msg.value == 0);
        require(IToken(_asset).transferFrom(msg.sender, address(this), _predictionStake));
        _stakeValue =_getAssetValue(_exchange, _predictionStake);
      }
      (, uint minPrediction, , , uint priceStep, uint256 positionDecimals) = marketConfig.getBasicMarketDetails();
      require(_stakeValue >= minPrediction,"Min prediction amount required");

      uint predictionPoints = _calculatePredictionValue(_prediction, _stakeValue.mul(positionDecimals), priceStep, _leverage);
      predictionPoints = _checkMultiplier(_asset, _predictionStake, predictionPoints, _stakeValue);

      _storePredictionData(_prediction, _predictionStake, _stakeValue, _asset, _leverage, predictionPoints);
      // pl.callPlacePredictionEvent(msg.sender,_predictionStake, predictionPoints, _asset, _prediction, _leverage);
    }

    function _isAllowedToStake(address _asset) internal view returns(bool) {
      for(uint256 i = 0; i < predictionAssets.length; i++) {
        if(predictionAssets[i] == _asset) {
          return true;
        }
      }
    }

    function _collectInterestReturnStake(uint256 _commision, uint256 _predictionStake, address _asset) internal returns(uint256) {
      _commision = _predictionStake.mul(_commision).div(100);
      _predictionStake = _predictionStake.sub(_commision);
      commissionAmount[_asset] = commissionAmount[_asset].add(_commision);
      return _predictionStake;
    }

    function _storePredictionData(uint _prediction, uint _predictionStake, uint _stakeValue, address _asset, uint _leverage, uint predictionPoints) internal {
      if(userPredictionPoints[msg.sender][_prediction] == 0) {
        optionsAvailable[_prediction].stakers.push(msg.sender);
      }

      totalStaked = totalStaked.add(_stakeValue);
      userPredictionPoints[msg.sender][_prediction] = userPredictionPoints[msg.sender][_prediction].add(predictionPoints);
      assetStaked[msg.sender][_asset][_prediction] = assetStaked[msg.sender][_asset][_prediction].add(_predictionStake);
      LeverageAsset[msg.sender][_asset][_prediction] = LeverageAsset[msg.sender][_asset][_prediction].add(_predictionStake.mul(_leverage));
      optionsAvailable[_prediction].predictionPoints = optionsAvailable[_prediction].predictionPoints.add(predictionPoints);
      optionsAvailable[_prediction].assetStakedValue = optionsAvailable[_prediction].assetStakedValue.add(_stakeValue);
      optionsAvailable[_prediction].assetStaked[_asset] = optionsAvailable[_prediction].assetStaked[_asset].add(_stakeValue);
      optionsAvailable[_prediction].assetLeveraged[_asset] = optionsAvailable[_prediction].assetLeveraged[_asset].add(_predictionStake.mul(_leverage));
    }

    function _checkMultiplier(address _asset, uint _predictionStake, uint predictionPoints, uint _stakeValue) internal returns(uint) {
      uint _stakeRatio;
      uint _minMultiplierRatio;
      uint _minStakeForMultiplier;
      uint _predictionTime = expireTime.sub(startTime);
      (_stakeRatio, _minMultiplierRatio, _minStakeForMultiplier) = marketConfig.getMultiplierParameters(_asset);
      if(_stakeValue < _minStakeForMultiplier) {
        return predictionPoints;
      }
      uint _stakedBalance = tokenController.tokensLockedAtTime(msg.sender, "SM", (_predictionTime.mul(2)).add(now));
      // _stakedBalance = _stakedBalance.sub(stakedTokenApplied[msg.sender])
      uint _stakedTokenRatio = _stakedBalance.div(_predictionStake.mul(_stakeRatio));
      if(_stakedTokenRatio > _minMultiplierRatio) {
        _stakedTokenRatio = _stakedTokenRatio.mul(10);
        predictionPoints = predictionPoints.mul(_stakedTokenRatio).div(100);
      }
      // if(_multiplier > 0) {
        // stakedTokenApplied[msg.sender] = stakedTokenApplied[msg.sender].add(_predictionStake.mul(_stakeRatio));
      // }
      return predictionPoints;
    }

    function exchangeCommission() external {
      uint256 _uniswapDeadline;
      uint256 _lotPurchasePerc;
      (_lotPurchasePerc, _uniswapDeadline) = marketConfig.getPurchasePercAndDeadline();
      for(uint256 i = 0; i < predictionAssets.length; i++ ) {
        if(commissionAmount[predictionAssets[i]] > 0) {
          if(predictionAssets[i] == token){
            IToken(token).burn(commissionAmount[predictionAssets[i]]);
          } else {
            address _exchange;
            ( , _exchange) = marketConfig.getAssetData(token);
            Exchange exchange = Exchange(_exchange);
            uint256 _lotPurchaseAmount = (commissionAmount[predictionAssets[i]]).sub((commissionAmount[predictionAssets[i]]).mul(_lotPurchasePerc).div(100));
            uint256 _amountToPool = (commissionAmount[predictionAssets[i]]).sub(_lotPurchasePerc);
            _transferAsset(predictionAssets[i], address(pl), _amountToPool);
            uint256 _tokenOutput;
            if(predictionAssets[i] == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
              _tokenOutput = exchange.ethToTokenSwapInput.value(_lotPurchaseAmount)(1, _uniswapDeadline);
            } else {
              _tokenOutput = exchange.tokenToTokenSwapInput(_lotPurchaseAmount, 1, 1, _uniswapDeadline, predictionAssets[i]);
            }
            incentiveToDistribute[token] = incentiveToDistribute[token].add(_tokenOutput);
          }
        }
      }
      commissionExchanged = true;
    }

    function calculatePredictionResult(uint _value) public {
      //Owner can set the result, for testing. To be removed when deployed on mainnet
      require(msg.sender == pl.owner() || msg.sender == provable_cbAddress());
      _postResult(_value);
      //Get donation, commission addresses and percentage
      // (, , address payable commissionAccount, uint commission) = marketConfig.getFundDistributionParams();
       // commission = commission.mul(totalReward).div(100);
       // donation = donation.mul(totalReward).div(100);
       // rewardToDistribute = totalReward.sub(commission);
       // _transferAsset(predictionAssets[0], commissionAccount, commission);
       // _transferAsset(predictionAsset, donationAccount, donation);
      // if(optionsAvailable[WinningOption].assetStaked == 0){
      // }

    }

    function _postResult(uint256 _value) internal {
      require(now >= settleTime,"Time not reached");
      require(_value > 0,"value should be greater than 0");
      (, , ,uint lossPercentage, , ) = marketConfig.getBasicMarketDetails();
      // uint distanceFromWinningOption = 0;
      predictionStatus = PredictionStatus.ResultDeclared;
      if(_value < optionsAvailable[2].minValue) {
        WinningOption = 1;
      } else if(_value > optionsAvailable[2].maxValue) {
        WinningOption = 3;
      } else {
        WinningOption = 2;
      }
      uint[] memory totalReward = new uint256[](predictionAssets.length);
      uint[] memory _commission = new uint[](predictionAssets.length);
      if(optionsAvailable[WinningOption].assetStakedValue > 0){
        for(uint j = 0; j < predictionAssets.length; j++) {
          _commission[j] = commissionAmount[predictionAssets[j]];
          for(uint i=1;i <= totalOptions;i++){
         // distanceFromWinningOption = i>WinningOption ? i.sub(WinningOption) : WinningOption.sub(i);
            if(i!=WinningOption) {
            totalReward[j] = totalReward[j].add((lossPercentage.mul(optionsAvailable[i].assetLeveraged[predictionAssets[j]])).div(100));
            }
          }
        }
        rewardToDistribute = totalReward;
      } else {
        for(uint i = 0; i< predictionAssets.length; i++) {
          for(uint j=1;j <= totalOptions;j++){
            _transferAsset(predictionAssets[i], address(pl), optionsAvailable[j].assetStaked[predictionAssets[i]]);
          }
        }
      }
      pl.callMarketResultEvent(predictionAssets, rewardToDistribute, _commission, WinningOption);
    }

    function raiseDispute(uint256 proposedValue, string memory proposalTitle, string memory shortDesc, string memory description, string memory solutionHash) public {
      require(predictionStatus == PredictionStatus.ResultDeclared);
      uint _stakeForDispute =  marketConfig.getDisputeResolutionParams();
      require(IToken(token).transferFrom(msg.sender, address(pl), _stakeForDispute));
      lockedForDispute = true;
      pl.createGovernanceProposal(proposalTitle, description, solutionHash, abi.encode(address(this), proposedValue), _stakeForDispute, msg.sender);
    }

    function resolveDispute(uint256 finalResult) external {
      require(msg.sender == address(pl));
      _postResult(finalResult);
      lockedForDispute = false;
    }

    function _transferAsset(address _asset, address payable _recipient, uint256 _amount) internal {
      if(_asset == address(0)) {
        _recipient.transfer(_amount);
      } else {
        require(IToken(_asset).transfer(_recipient, _amount));
      }
    }

    function getReturn(address _user)public view returns (uint[] memory returnAmount, address[] memory _predictionAssets, uint[] memory incentive, address[] memory _incentiveTokens){
      if(predictionStatus != PredictionStatus.ResultDeclared || totalStaked ==0) {
       return (returnAmount, _predictionAssets, incentive, _incentiveTokens);
      }
      // uint[] memory _return;
      uint256 _totalUserPredictionPoints = 0;
      uint256 _totalPredictionPoints = 0;
      (returnAmount, _totalUserPredictionPoints, _totalPredictionPoints) = _calculateUserReturn(_user);
      incentive = _calculateIncentives(_totalUserPredictionPoints, _totalPredictionPoints);
      // returnAmount =  _return;
      if(userPredictionPoints[_user][WinningOption] > 0) {
        returnAmount = _addUserReward(_user, returnAmount);
      }
      return (returnAmount, predictionAssets, incentive, incentiveTokens);
    }

    function _addUserReward(address _user, uint[] memory returnAmount) internal view returns(uint[] memory){
      uint reward;
      for(uint j = 0; j< predictionAssets.length; j++) {
        reward = userPredictionPoints[_user][WinningOption].mul(rewardToDistribute[j]).div(optionsAvailable[WinningOption].predictionPoints);
        returnAmount[j] = returnAmount[j].add(reward);
      }
      return returnAmount;
    }

    function _calculateUserReturn(address _user) internal view returns(uint[] memory _return, uint _totalUserPredictionPoints, uint _totalPredictionPoints){
      (, , ,uint lossPercentage, , ) = marketConfig.getBasicMarketDetails();
      _return = new uint256[](predictionAssets.length);
      for(uint  i=1;i<=totalOptions;i++){
        _totalUserPredictionPoints = _totalUserPredictionPoints.add(userPredictionPoints[_user][i]);
        _totalPredictionPoints = _totalPredictionPoints.add(optionsAvailable[i].predictionPoints);
        if(i != WinningOption) {
          for(uint j = 0; j< predictionAssets.length; j++) {
            _return[j] =  _callReturn(_return[j], _user, i, lossPercentage, predictionAssets[j]);
          }
        }
      }
    }

    function _calculateIncentives(uint256 _totalUserPredictionPoints, uint256 _totalPredictionPoints) internal view returns(uint256[] memory incentive){
      incentive = new uint256[](incentiveTokens.length);
      for(uint i = 0; i < incentiveTokens.length; i++) {
        incentive[i] = _totalUserPredictionPoints.mul(incentiveToDistribute[incentiveTokens[i]]).div(_totalPredictionPoints);
      }
    }

    function getPendingReturn(address _user) external view returns(uint, uint){
      if(userClaimedReward[_user]) return (0,0);
      // return getReturn(_user);
    }
    
    //Split getReturn() function otherwise it shows compilation error(e.g; stack too deep).
    function _callReturn(uint _return,address _user,uint i,uint lossPercentage, address _asset)internal view returns(uint){
      return _return.add(assetStaked[_user][_asset][i].sub((LeverageAsset[_user][_asset][i].mul(lossPercentage)).div(100)));
    }

    function claimReturn(address payable _user) public {
      require(commissionExchanged && !lockedForDispute && now > marketCoolDownTime);
      require(!userClaimedReward[_user],"Already claimed");
      require(predictionStatus == PredictionStatus.ResultDeclared,"Result not declared");
      userClaimedReward[_user] = true;
      (uint[] memory _returnAmount, , uint[] memory _incentives, ) = getReturn(_user);
      // _user.transfer(returnAmount)
      uint256 i;
      for(i = 0;i< predictionAssets.length;i++) {
        _transferAsset(predictionAssets[i], _user, _returnAmount[i]);
      }
      for(i = 0;i < incentiveTokens.length; i++) {
        _transferAsset(incentiveTokens[i], _user, _incentives[i]);
      }
      pl.callClaimedEvent(_user, _returnAmount, predictionAssets, _incentives, incentiveTokens);
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
