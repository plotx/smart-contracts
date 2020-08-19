pragma solidity 0.5.7;

import "./external/oraclize/ethereum-api/provableAPI.sol";
import "./config/MarketConfig.sol";
import "./interfaces/IToken.sol";
import "./interfaces/ITokenController.sol";
import "./interfaces/IPlotus.sol";

contract Market is usingProvable {
    using SafeMath for uint;

    enum PredictionStatus {
      Live,
      InSettlement,
      Cooling,
      InDispute,
      Settled
    }
    
    address constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint constant totalOptions = 3;
    uint internal startTime;
    uint internal expireTime;
    bytes32 internal marketCurrency;
    address internal marketFeedAddress;
    bool internal isMarketCurrencyERCToken;
    uint public rate;
    uint public WinningOption;
    bool public lockedForDispute;
    bytes32 internal marketResultId;
    uint[] public rewardToDistribute;
    PredictionStatus internal predictionStatus;
    uint internal settleTime;
    uint internal marketCoolDownTime;
    // uint totalStaked;
    uint totalStakedETH;
    uint totalStakedToken;
    uint predictionTime;

    bool commissionExchanged;

    // address[] predictionAssets;
    mapping(address => uint) internal commissionPerc;
    address[] incentiveTokens;
    
    mapping(address => mapping(address => mapping(uint => uint))) public assetStaked;
    mapping(address => mapping(address => mapping(uint => uint))) internal LeverageAsset;
    mapping(address => mapping(uint => uint)) public userPredictionPoints;
    mapping(address => uint256) public commissionAmount;
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
      // address[] stakers;
    }

    mapping(address => uint256) incentiveToDistribute;
    mapping(uint=>option) public optionsAvailable;

    /**
    * @dev Initialize the market.
    * @param _startTime The time at which market will create.
    * @param _predictionTime The time duration of market.
    * @param _settleTime The time at which result of market will declared.
    * @param _minValue The minimum value of middle option range.
    * @param _maxValue The maximum value of middle option range.
    * @param _marketCurrency The stock name of market.
    * @param _marketFeedAddress The address to gets the price calculation params.
    */
    function initiate(uint _startTime, uint _predictionTime, uint _settleTime, uint _minValue, uint _maxValue, bytes32 _marketCurrency,address _marketFeedAddress, string memory _oraclizeType, string memory _oraclizeSource, bool _isERCToken) public payable {
      pl = IPlotus(msg.sender);
      marketConfig = MarketConfig(pl.marketConfig());
      tokenController = ITokenController(pl.tokenController());
      token = tokenController.token();
      startTime = _startTime;
      marketCurrency = _marketCurrency;
      marketFeedAddress = _marketFeedAddress;
      isMarketCurrencyERCToken = _isERCToken;
      // optionsAvailable[0] = option(0,0,0,0,0,address(0));
      uint _coolDownTime;
      uint _rate;
      (incentiveTokens, _coolDownTime, _rate, commissionPerc[ETH_ADDRESS], commissionPerc[token]) = marketConfig.getMarketInitialParams();

      rate = _rate;
      predictionTime = _predictionTime; 
      expireTime = startTime.add(_predictionTime);
      settleTime = startTime.add(_settleTime);
      marketCoolDownTime = settleTime.add(_coolDownTime);
      require(expireTime > now);
      setOptionRanges(_minValue,_maxValue);
      marketResultId = provable_query(settleTime, _oraclizeType, _oraclizeSource);
      // chainLinkOracle = IChainLinkOracle(marketConfig.getChainLinkPriceOracle());
      // incentiveTokens = _incentiveTokens;
      // uniswapFactoryAddress = _uniswapFactoryAdd;
      // factory = Factory(_uniswapFactoryAdd);
    }

    /**
    * @dev Gets the status of market.
    * @return PredictionStatus representing the status of market.
    */
    function marketStatus() internal view returns(PredictionStatus){
      if(predictionStatus == PredictionStatus.Live && now >= expireTime) {
        return PredictionStatus.InSettlement;
      } else if(predictionStatus == PredictionStatus.Settled && now <= marketCoolDownTime) {
        return PredictionStatus.Cooling;
      }
      return predictionStatus;
    }

    // *
    // * @dev Gets the asset value in ether.
    // * @param _exchange The exchange address of token.
    // * @param _amount The amount of token.
    // * @return uint256 representing the token value in ether.
    
    // function _getAssetValue(address _exchange, uint256 _amount) internal view returns(uint256) {
    //   return Exchange(_exchange).getTokenToEthInputPrice(_amount);
    // }
  
    /**
    * @dev Calculates the price of available option ranges.
    * @param _option The number of option ranges.
    * @param _totalStaked The total staked amount on options.
    * @param _assetStakedOnOption The asset staked on options.
    * @return _optionPrice uint representing the price of option range.
    */
    function _calculateOptionPrice(uint _option, uint _totalStaked, uint _assetStakedOnOption) internal view returns(uint _optionPrice) {
      _optionPrice = 0;
      uint currentPriceOption = 0;
      ( ,uint stakeWeightage,uint stakeWeightageMinAmount,uint predictionWeightage, uint currentPrice, uint minTimeElapsedDivisor) = marketConfig.getPriceCalculationParams(marketFeedAddress, isMarketCurrencyERCToken);
      uint minTimeElapsed = predictionTime.div(minTimeElapsedDivisor);
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

   /**
    * @dev Calculate the option price of market.
    * @param _midRangeMin The minimum value of middle option range.
    * @param _midRangeMax The maximum value of middle option range.
    */
    function setOptionRanges(uint _midRangeMin, uint _midRangeMax) internal{
      optionsAvailable[1].minValue = 0;
      optionsAvailable[1].maxValue = _midRangeMin.sub(1);
      optionsAvailable[2].minValue = _midRangeMin;
      optionsAvailable[2].maxValue = _midRangeMax;
      optionsAvailable[3].minValue = _midRangeMax.add(1);
      optionsAvailable[3].maxValue = ~uint256(0) ;
    }

   /**
    * @dev Calculates the prediction value.
    * @param _prediction The option range on which user place prediction.
    * @param _stake The amount staked by user.
    * @param _priceStep The option price will update according to priceStep.
    * @param _leverage The leverage opted by user at the time of prediction.
    * @return uint256 representing the prediction value.
    */
    function _calculatePredictionValue(uint _prediction, uint _stake, uint _positionDecimals, uint _priceStep, uint _leverage) internal view returns(uint _predictionValue) {
      uint value;
      uint flag = 0;
      (uint _tokenPrice, uint _decimals) = marketConfig.getAssetPriceInETH(token);
      uint _totalStaked = totalStakedETH.add(_calculateAssetValueInEth(totalStakedToken, _tokenPrice, _decimals));
      uint _assetStakedOnOption = optionsAvailable[_prediction].assetStaked[ETH_ADDRESS]
                                  .add(
                                    (_calculateAssetValueInEth(optionsAvailable[_prediction].assetStaked[token], _tokenPrice, _decimals)));
      _predictionValue = 0;
      while(_stake > 0) {
        if(_stake <= (_priceStep)) {
          value = (uint(_stake)).mul(_positionDecimals).div(rate);
          _predictionValue = _predictionValue.add(value.mul(_leverage).div(_calculateOptionPrice(_prediction, _totalStaked, _assetStakedOnOption + flag.mul(_priceStep))));
          break;
        } else {
          _stake = _stake.sub(_priceStep);
          value = (uint(_priceStep)).mul(_positionDecimals).div(rate);
          _predictionValue = _predictionValue.add(value.mul(_leverage).div(_calculateOptionPrice(_prediction, _totalStaked, _assetStakedOnOption + flag.mul(_priceStep))));
          _totalStaked = _totalStaked.add(_priceStep);
          flag++;
        }
      }
    }

    function _calculateAssetValueInEth(uint _amount, uint _price, uint _decimals)internal view returns(uint) {
      return _amount.mul(_price).div(10**_decimals);
    }

   /**
    * @dev Estimates the prediction value.
    * @param _prediction The option range on which user place prediction.
    * @param _stake The amount staked by user.
    * @param _leverage The leverage opted by user at the time of prediction.
    * @return uint256 representing the prediction value.
    */
    function estimatePredictionValue(uint _prediction, uint _stake, uint _leverage) public view returns(uint _predictionValue){
      ( , , , uint priceStep, uint256 positionDecimals) = marketConfig.getBasicMarketDetails();
      return _calculatePredictionValue(_prediction, _stake, positionDecimals, priceStep, _leverage);
    }

    /**
    * @dev Gets the price of specific option.
    * @param _prediction The option number to query the balance of.
    * @return uint representing the price owned by the passed prediction.
    */
    function getOptionPrice(uint _prediction) public view returns(uint) {
      // (, , , , , , ) = marketConfig.getBasicMarketDetails();
      (uint _price, uint _decimals) = marketConfig.getAssetPriceInETH(token);

     return _calculateOptionPrice(
                _prediction,
                totalStakedETH.add(totalStakedToken.mul(_price).div(10**_decimals)),
                optionsAvailable[_prediction].assetStaked[ETH_ADDRESS].add(
                  (optionsAvailable[_prediction].assetStaked[token]).mul(_price).div(10**_decimals)
                )
            );
    }

    /**
    * @dev Gets the market data.
    * @return _marketCurrency bytes32 representing the currency or stock name of the market.
    * @return minvalue uint[] memory representing the minimum range of all the options of the market.
    * @return maxvalue uint[] memory representing the maximum range of all the options of the market.
    * @return _optionPrice uint[] memory representing the option price of each option ranges of the market.
    * @return _assetStaked uint[] memory representing the assets staked on each option ranges of the market.
    * @return _predictionType uint representing the type of market.
    * @return _expireTime uint representing the expire time of the market.
    * @return _predictionStatus uint representing the status of the market.
    */
    function getData() public view returns
       (bytes32 _marketCurrency,uint[] memory minvalue,uint[] memory maxvalue,
        uint[] memory _optionPrice, uint[] memory _assetStaked,uint _predictionType,uint _expireTime, uint _predictionStatus){
        _marketCurrency = marketCurrency;
        _expireTime =expireTime;
        _predictionStatus = uint(marketStatus());
        minvalue = new uint[](totalOptions);
        maxvalue = new uint[](totalOptions);
        _optionPrice = new uint[](totalOptions);
        _assetStaked = new uint[](totalOptions);
        uint _totalStakedToken = marketConfig.getAssetValueETH(token, totalStakedToken);
        uint _totalStaked = totalStakedETH.add(_totalStakedToken);
        for (uint i = 0; i < totalOptions; i++) {
        _assetStaked[i] = optionsAvailable[i+1].assetStakedValue;
        minvalue[i] = optionsAvailable[i+1].minValue;
        maxvalue[i] = optionsAvailable[i+1].maxValue;
        _optionPrice[i] = _calculateOptionPrice(i+1, _totalStaked, optionsAvailable[i+1].assetStakedValue);
       }
    }

   /**
    * @dev Gets the result of the market.
    * @return uint256 representing the winning option of the market.
    * @return uint256 representing the positions of the winning option range.
    * @return uint[] memory representing the reward to be distribute of the market.
    * @return address[] memory representing the users who place prediction on winnning option.
    * @return uint256 representing the assets staked on winning option.
    */
    function getMarketResults() public view returns(uint256, uint256, uint256[] memory, uint256) {
      return (WinningOption, optionsAvailable[WinningOption].predictionPoints, rewardToDistribute, optionsAvailable[WinningOption].assetStakedValue);
    }

    /**
    * @dev Place prediction on the available option ranges of the market.
    * @param _asset The assets uses by user during prediction whether it is token address or in ether.
    * @param _predictionStake The amount staked by user at the time of prediction.
    * @param _prediction The option range on which user place prediction.
    * @param _leverage The leverage opted by user at the time of prediction.
    */
    function placePrediction(address _asset, uint256 _predictionStake, uint256 _prediction,uint256 _leverage) public payable {
      // require(_prediction <= 3 && _leverage <= 5);
      require(now >= startTime && now <= expireTime);

      // uint256 _stakeValue = _predictionStake;
      uint256 _stakeValue = marketConfig.getAssetValueETH(_asset, _predictionStake);
      
      if(_asset == ETH_ADDRESS) {
        require(_predictionStake == msg.value);
      } else {
        require(msg.value == 0);
        require(IToken(_asset).transferFrom(msg.sender, address(this), _predictionStake));
        // _stakeValue =_getAssetValue(_exchange, _predictionStake);
      }

      if(_asset == tokenController.bLOTToken()) {
        require(_leverage == 5);
        tokenController.swapBLOT(_predictionStake);
        _asset = token;
      } else {
        require(_isAllowedToStake(_asset));
      }
      _predictionStake = _collectInterestReturnStake(_predictionStake, _asset);

      (uint minPrediction, , , uint priceStep, uint256 positionDecimals) = marketConfig.getBasicMarketDetails();
      require(_stakeValue >= minPrediction,"Min prediction amount required");
      uint predictionPoints = _calculatePredictionValue(_prediction, _stakeValue, positionDecimals, priceStep, _leverage);
      predictionPoints = _checkMultiplier(_asset, _predictionStake, predictionPoints, _stakeValue);

      _storePredictionData(_prediction, _predictionStake, _stakeValue, _asset, _leverage, predictionPoints);
      pl.callPlacePredictionEvent(msg.sender,_predictionStake, predictionPoints, _asset, _prediction, _leverage);
    }

    function _isAllowedToStake(address _asset) internal view returns(bool) {
      return (_asset == ETH_ADDRESS ||
               _asset == token ||
               _asset == tokenController.bLOTToken()
              );
    }

    /**
    * @dev Gets the interest return of the stake after commission.
    * @param _predictionStake The amount staked by user at the time of prediction.
    * @param _asset The assets uses by user during prediction.
    * @return uint256 representing the interest return of the stake.
    */
    function _collectInterestReturnStake(uint256 _predictionStake, address _asset) internal returns(uint256) {
      uint _commision = _predictionStake.mul(commissionPerc[_asset]).div(10000);
      _predictionStake = _predictionStake.sub(_commision);
      commissionAmount[_asset] = commissionAmount[_asset].add(_commision);
      return _predictionStake;
    }

    /**
    * @dev Stores the prediction data.
    * @param _prediction The option range on which user place prediction.
    * @param _predictionStake The amount staked by user at the time of prediction.
    * @param _stakeValue The stake value of asset.
    * @param _asset The assets uses by user during prediction.
    * @param _leverage The leverage opted by user during prediction.
    * @param predictionPoints The positions user gets during prediction.
    */
    function _storePredictionData(uint _prediction, uint _predictionStake, uint _stakeValue, address _asset, uint _leverage, uint predictionPoints) internal {
      // if(userPredictionPoints[msg.sender][_prediction] == 0) {
      //   optionsAvailable[_prediction].stakers.push(msg.sender);
      // }
      if(_asset == ETH_ADDRESS) {
        totalStakedETH = totalStakedETH.add(_predictionStake);
      }
      else {
        totalStakedToken = totalStakedToken.add(_predictionStake);
      }
      userPredictionPoints[msg.sender][_prediction] = userPredictionPoints[msg.sender][_prediction].add(predictionPoints);
      assetStaked[msg.sender][_asset][_prediction] = assetStaked[msg.sender][_asset][_prediction].add(_predictionStake);
      LeverageAsset[msg.sender][_asset][_prediction] = LeverageAsset[msg.sender][_asset][_prediction].add(_predictionStake.mul(_leverage));
      optionsAvailable[_prediction].predictionPoints = optionsAvailable[_prediction].predictionPoints.add(predictionPoints);
      optionsAvailable[_prediction].assetStakedValue = optionsAvailable[_prediction].assetStakedValue.add(_stakeValue);
      optionsAvailable[_prediction].assetStaked[_asset] = optionsAvailable[_prediction].assetStaked[_asset].add(_predictionStake);
      optionsAvailable[_prediction].assetLeveraged[_asset] = optionsAvailable[_prediction].assetLeveraged[_asset].add(_predictionStake.mul(_leverage));
    }

    /**
    * @dev Check multiplier if user maitained the configurable amount of tokens.
    * @param _asset The assets uses by user during prediction.
    * @param _predictionStake The amount staked by user at the time of prediction.
    * @param predictionPoints The positions user gets during prediction.
    * @param _stakeValue The stake value of asset.
    * @return uint256 representing the interest return of the stake.
    */
    function _checkMultiplier(address _asset, uint _predictionStake, uint predictionPoints, uint _stakeValue) internal returns(uint) {
      uint _minMultiplierRatio;
      uint _minStakeForMultiplier;
      uint _predictionTime = expireTime.sub(startTime);
      uint _stakedBalance = tokenController.tokensLockedAtTime(msg.sender, "SM", (_predictionTime.mul(2)).add(now));
      uint _predictionValueInToken;
      (_minMultiplierRatio, _minStakeForMultiplier, _predictionValueInToken) = marketConfig.getValueAndMultiplierParameters(_asset, _predictionStake);
      if(_stakeValue < _minStakeForMultiplier) {
        return predictionPoints;
      }
      // _stakedBalance = _stakedBalance.sub(stakedTokenApplied[msg.sender])
      uint _stakedTokenRatio = _stakedBalance.div(_predictionValueInToken);
      if(_stakedTokenRatio > _minMultiplierRatio) {
        _stakedTokenRatio = _stakedTokenRatio.mul(10);
        predictionPoints = predictionPoints.mul(_stakedTokenRatio).div(100);
      }
      // if(_multiplier > 0) {
        // stakedTokenApplied[msg.sender] = stakedTokenApplied[msg.sender].add(_predictionStake.mul(_stakeRatio));
      // }
      return predictionPoints;
    }

    /**
    * @dev Exchanges the commission after closing the market.
    */
    function exchangeCommission() external {
      require (msg.sender == address(pl));
      uint256 _uniswapDeadline;
      uint256 _lotPurchasePerc;
      (_lotPurchasePerc, _uniswapDeadline) = marketConfig.getPurchasePercAndDeadline();
      if(commissionAmount[token] > 0){
        bool burned = tokenController.burnCommissionTokens(commissionAmount[token]);
        if(!burned) {
          _transferAsset(token, address(pl), commissionAmount[token]);
        }
      } 
      if(commissionAmount[ETH_ADDRESS] > 0) {
        uint256 _lotPurchaseAmount = (commissionAmount[ETH_ADDRESS]).mul(_lotPurchasePerc).div(100);
        uint256 _amountToPool = (commissionAmount[ETH_ADDRESS]).sub(_lotPurchaseAmount);
        _transferAsset(ETH_ADDRESS, address(pl), _amountToPool);
        uint256 _tokenOutput;
        address[] memory path;
        address _router;
        (_router , path) = marketConfig.getETHtoTokenRouterAndPath();
        IUniswapV2Router02 router = IUniswapV2Router02(_router);
        uint[] memory output = router.swapExactETHForTokens.value(_lotPurchaseAmount)(1, path, address(this), _uniswapDeadline);
        _tokenOutput = output[1];
        incentiveToDistribute[token] = incentiveToDistribute[token].add(_tokenOutput);
      }
      commissionExchanged = true;
    }

    /**
    * @dev Calculate the result of market.
    * @param _value The current price of market currency.
    */
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

    /**
    * @dev Calculate the result of market here.
    * @param _value The current price of market currency.
    */
    function _postResult(uint256 _value) internal {
      require(now >= settleTime,"Time not reached");
      require(_value > 0,"value should be greater than 0");
      ( , ,uint lossPercentage, , ) = marketConfig.getBasicMarketDetails();
      // uint distanceFromWinningOption = 0;
      predictionStatus = PredictionStatus.Settled;
      if(_value < optionsAvailable[2].minValue) {
        WinningOption = 1;
      } else if(_value > optionsAvailable[2].maxValue) {
        WinningOption = 3;
      } else {
        WinningOption = 2;
      }
      uint[] memory totalReward = new uint256[](2);
      if(optionsAvailable[WinningOption].assetStakedValue > 0){
        for(uint i=1;i <= totalOptions;i++){
          if(i!=WinningOption) {
          totalReward[0] = totalReward[0].add((lossPercentage.mul(optionsAvailable[i].assetLeveraged[token])).div(100));
          totalReward[1] = totalReward[1].add((lossPercentage.mul(optionsAvailable[i].assetLeveraged[ETH_ADDRESS])).div(100));
          }
        }
        rewardToDistribute = totalReward;
      } else {
        uint tokenAmountToPool;
        uint ethAmountToPool;
        for(uint j=1;j <= totalOptions;j++){
          tokenAmountToPool =  tokenAmountToPool.add(optionsAvailable[j].assetStaked[token]);
          ethAmountToPool =  ethAmountToPool.add(optionsAvailable[j].assetStaked[ETH_ADDRESS]);
        }
        _transferAsset(token, address(pl), tokenAmountToPool);
        _transferAsset(ETH_ADDRESS, address(pl), ethAmountToPool);
      }
      pl.callMarketResultEvent(rewardToDistribute, WinningOption);
    }

    /**
    * @dev Raises the dispute by user if wrong value passed at the time of market result declaration.
    * @param proposedValue The proposed value of market currency.
    * @param proposalTitle The title of proposal created by user.
    * @param shortDesc The short description of dispute.
    * @param description The description of dispute.
    * @param solutionHash The ipfs solution hash.
    */
    function raiseDispute(uint256 proposedValue, string memory proposalTitle, string memory shortDesc, string memory description, string memory solutionHash) public {
      require(predictionStatus == PredictionStatus.Settled);
      uint _stakeForDispute =  marketConfig.getDisputeResolutionParams();
      require(IToken(token).transferFrom(msg.sender, address(pl), _stakeForDispute));
      lockedForDispute = true;
      pl.createGovernanceProposal(proposalTitle, description, solutionHash, abi.encode(address(this), proposedValue), _stakeForDispute, msg.sender);
      predictionStatus = PredictionStatus.InDispute;
    }

    /**
    * @dev Resolve the dispute if wrong value passed at the time of market result declaration.
    * @param finalResult The final correct value of market currency.
    */
    function resolveDispute(uint256 finalResult) external {
      require(msg.sender == address(pl));
      _postResult(finalResult);
      lockedForDispute = false;
      predictionStatus = PredictionStatus.Settled;
    }

    /**
    * @dev Transfer the assets to specified address.
    * @param _asset The asset transfer to the specific address.
    * @param _recipient The address to transfer the asset of
    * @param _amount The amount which is transfer.
    */
    function _transferAsset(address _asset, address payable _recipient, uint256 _amount) internal {
      if(_asset == ETH_ADDRESS) {
        _recipient.transfer(_amount);
      } else {
        require(IToken(_asset).transfer(_recipient, _amount));
      }
    }

    /**
    * @dev Gets the return amount of the specified address.
    * @param _user The address to specify the return of
    * @return returnAmount uint[] memory representing the return amount.
    * @return incentive uint[] memory representing the incentive.
    * @return _incentiveTokens address[] memory representing the incentive token.
    */
    function getReturn(address _user)public view returns (uint[] memory returnAmount, address[] memory _predictionAssets, uint[] memory incentive, address[] memory _incentiveTokens){
      if(predictionStatus != PredictionStatus.Settled || totalStakedETH.add(totalStakedToken) ==0) {
       return (returnAmount, _predictionAssets, incentive, _incentiveTokens);
      }
      _predictionAssets = new address[](2);
      _predictionAssets[0] = token;
      _predictionAssets[1] = ETH_ADDRESS;

      // uint[] memory _return;
      uint256 _totalUserPredictionPoints = 0;
      uint256 _totalPredictionPoints = 0;
      (returnAmount, _totalUserPredictionPoints, _totalPredictionPoints) = _calculateUserReturn(_user);
      incentive = _calculateIncentives(_totalUserPredictionPoints, _totalPredictionPoints);
      // returnAmount =  _return;
      if(userPredictionPoints[_user][WinningOption] > 0) {
        returnAmount = _addUserReward(_user, returnAmount);
      }
      return (returnAmount, _predictionAssets, incentive, incentiveTokens);
    }

    /**
    * @dev Adds the reward in the total return of the specified address.
    * @param _user The address to specify the return of.
    * @param returnAmount The return amount.
    * @return uint[] memory representing the return amount after adding reward.
    */
    function _addUserReward(address _user, uint[] memory returnAmount) internal view returns(uint[] memory){
      uint reward;
      for(uint j = 0; j< returnAmount.length; j++) {
        reward = userPredictionPoints[_user][WinningOption].mul(rewardToDistribute[j]).div(optionsAvailable[WinningOption].predictionPoints);
        returnAmount[j] = returnAmount[j].add(reward);
      }
      return returnAmount;
    }

    /**
    * @dev Calculate the return of the specified address.
    * @param _user The address to query the return of.
    * @return _return uint[] memory representing the return amount owned by the passed address.
    * @return _totalUserPredictionPoints uint representing the positions owned by the passed address.
    * @return _totalPredictionPoints uint representing the total positions of winners.
    */
    function _calculateUserReturn(address _user) internal view returns(uint[] memory _return, uint _totalUserPredictionPoints, uint _totalPredictionPoints){
      ( , ,uint lossPercentage, , ) = marketConfig.getBasicMarketDetails();
      _return = new uint256[](2);
      for(uint  i=1;i<=totalOptions;i++){
        _totalUserPredictionPoints = _totalUserPredictionPoints.add(userPredictionPoints[_user][i]);
        _totalPredictionPoints = _totalPredictionPoints.add(optionsAvailable[i].predictionPoints);
        // if(i != WinningOption) {
          _return[0] =  _callReturn(_return[0], _user, i, lossPercentage, token);
          _return[1] =  _callReturn(_return[1], _user, i, lossPercentage, ETH_ADDRESS);
        // }
      }
    }

    /**
    * @dev Calculates the incentives.
    * @param _totalUserPredictionPoints The positions of user.
    * @param _totalPredictionPoints The total positions of winners.
    * @return incentive uint[] memory representing the calculated incentive.
    */
    function _calculateIncentives(uint256 _totalUserPredictionPoints, uint256 _totalPredictionPoints) internal view returns(uint256[] memory incentive){
      incentive = new uint256[](incentiveTokens.length);
      for(uint i = 0; i < incentiveTokens.length; i++) {
        incentive[i] = _totalUserPredictionPoints.mul(incentiveToDistribute[incentiveTokens[i]]).div(_totalPredictionPoints);
      }
    }

    /**
    * @dev Gets the pending return.
    * @param _user The address to specify the return of.
    * @return uint representing the pending return amount.
    */
    function getPendingReturn(address _user) external view returns(uint, uint){
      if(userClaimedReward[_user]) return (0,0);
      // return getReturn(_user);
    }
    
    /**
    * @dev Calls the total return amount internally.
    */
    function _callReturn(uint _return,address _user,uint i,uint lossPercentage, address _asset)internal view returns(uint){
      if(i == WinningOption) {
        lossPercentage = 0;
      }
      return _return.add(assetStaked[_user][_asset][i].sub((LeverageAsset[_user][_asset][i].mul(lossPercentage)).div(100)));
    }

    /**
    * @dev Claim the return amount of the specified address.
    * @param _user The address to query the claim return amount of.
    */
    function claimReturn(address payable _user) public {
      _checkIfDisputeResolved();
      require(commissionExchanged && now > marketCoolDownTime);
      require(!userClaimedReward[_user],"Already claimed");
      require(predictionStatus == PredictionStatus.Settled,"Result not declared");
      userClaimedReward[_user] = true;
      (uint[] memory _returnAmount, address[] memory _predictionAssets, uint[] memory _incentives, ) = getReturn(_user);
      // _user.transfer(returnAmount)
      uint256 i;
      _transferAsset(token, _user, _returnAmount[0]);
      _transferAsset(ETH_ADDRESS, _user, _returnAmount[1]);
      for(i = 0;i < incentiveTokens.length; i++) {
        _transferAsset(incentiveTokens[i], _user, _incentives[i]);
      }
      pl.callClaimedEvent(_user, _returnAmount, _predictionAssets, _incentives, incentiveTokens);
    }

    function _checkIfDisputeResolved() internal {
      if(lockedForDispute) {
        if(pl.marketDisputeStatus(address(this)) > 3) {
          lockedForDispute = false;
        } else {
          revert("In Dispute");
        }
      }
    }

    /**
    * @dev callback for result declaration of market.
    * @param myid The orcalize market result id.
    * @param result The current price of market currency.
    */
    function __callback(bytes32 myid, string memory result) public {
      require(msg.sender == provable_cbAddress());
      // if(myid == closeMarketId) {
      //   _closeBet();
      // } else if(myid == marketResultId) {
      require ((myid==marketResultId));
      //Check oraclise address
      calculatePredictionResult(parseInt(result));
      // }
    }

}
