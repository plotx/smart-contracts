pragma solidity 0.5.7;

import "./external/oraclize/ethereum-api/provableAPI.sol";
import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./config/MarketUtility.sol";
import "./interfaces/IToken.sol";
import "./interfaces/ITokenController.sol";
import "./interfaces/IMarketRegistry.sol";

contract Market is usingProvable {
    using SafeMath for uint;

    enum PredictionStatus {
      Live,
      InSettlement,
      Cooling,
      InDispute,
      Settled
    }
    
    struct option
    {
      uint minValue;
      uint maxValue;
      uint predictionPoints;
      mapping(address => uint256) assetStaked;
      mapping(address => uint256) assetLeveraged;
    }

    address constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint constant totalOptions = 3;
    uint constant MAX_LEVERAGE = 5;
    
    bool internal isChainlinkFeed;
    bool public lockedForDispute;
    bool internal commissionExchanged;
    bytes32 internal marketCurrency;
    bytes32 internal marketResultId;
    address internal marketFeedAddress;
    address internal plotToken;
    uint internal startTime;
    uint internal expireTime;
    uint public rate;
    uint public WinningOption;
    uint public marketCloseValue;
    uint internal settleTime;
    uint internal marketCoolDownTime;
    uint internal ethAmountToPool;
    uint internal tokenAmountToPool;
    uint internal totalStakedETH;
    uint internal totalStakedToken;
    uint internal predictionTime;
    address[] incentiveTokens;
    uint[] public rewardToDistribute;
    PredictionStatus internal predictionStatus;

    
    struct UserData {
      bool claimedReward;
      bool predictedWithBlot;
      bool multiplierApplied;
      mapping(uint => uint) predictionPoints;
      mapping(address => mapping(uint => uint)) assetStaked;
      mapping(address => mapping(uint => uint)) LeverageAsset;
    }

    struct AssetData {
      uint256 commissionPerc;
      uint256 commissionAmount;
    }

    mapping(address => AssetData) internal assetData;

    mapping(address => UserData) internal userData;

    IMarketRegistry internal marketRegistry;
    ITokenController internal tokenController;
    MarketUtility internal marketUtility;

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
    function initiate(uint _startTime, uint _predictionTime, uint _settleTime, uint _minValue, uint _maxValue, bytes32 _marketCurrency,address _marketFeedAddress, bool _isChainlinkFeed) public payable {
      OwnedUpgradeabilityProxy proxy =  OwnedUpgradeabilityProxy(address(uint160(address(this))));
      require(msg.sender == proxy.proxyOwner(),"Sender is not proxy owner.");
      require(startTime == 0, "Already initialized");
      marketRegistry = IMarketRegistry(msg.sender);
      marketUtility = MarketUtility(marketRegistry.marketUtility());
      tokenController = ITokenController(marketRegistry.tokenController());
      plotToken = tokenController.token();
      startTime = _startTime;
      marketCurrency = _marketCurrency;
      marketFeedAddress = _marketFeedAddress;
      isChainlinkFeed = _isChainlinkFeed;
      uint _coolDownTime;
      uint _rate;
      (incentiveTokens, _coolDownTime, _rate, assetData[ETH_ADDRESS].commissionPerc, assetData[plotToken].commissionPerc) = marketUtility.getMarketInitialParams();

      rate = _rate;
      predictionTime = _predictionTime; 
      expireTime = startTime.add(_predictionTime);
      settleTime = startTime.add(_settleTime);
      marketCoolDownTime = _coolDownTime;
      require(expireTime > now);
      setOptionRanges(_minValue,_maxValue);
      // marketResultId = provable_query(settleTime, "", "");
    }

   /**
    * @dev Set the option ranges of the market
    * @param _midRangeMin The minimum value of middle option.
    * @param _midRangeMax The maximum value of middle option.
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
    * @dev Place prediction on the available options of the market.
    * @param _asset The asset used by user during prediction whether it is plotToken address or in ether.
    * @param _predictionStake The amount staked by user at the time of prediction.
    * @param _prediction The option on which user placed prediction.
    * @param _leverage The leverage opted by user at the time of prediction.
    */
    function placePrediction(address _asset, uint256 _predictionStake, uint256 _prediction,uint256 _leverage) public payable {
      require(!marketRegistry.marketCreationPaused() && _prediction <= totalOptions && _leverage <= MAX_LEVERAGE);
      require(now >= startTime && now <= expireTime);


      if(_asset == tokenController.bLOTToken()) {
        require(_leverage == MAX_LEVERAGE);
        require(msg.value == 0);
        require(!userData[msg.sender].predictedWithBlot);
        userData[msg.sender].predictedWithBlot = true;
        tokenController.swapBLOT(msg.sender, address(this), _predictionStake);
        _asset = plotToken;
      } else {
        require(_isAllowedToStake(_asset));
        if(_asset == ETH_ADDRESS) {
          require(_predictionStake == msg.value);
        } else {
          require(msg.value == 0);
          require(IToken(_asset).transferFrom(msg.sender, address(this), _predictionStake));
        }
      }

      _predictionStake = _collectInterestReturnStake(_predictionStake, _asset);
      
      uint256 _stakeValue = marketUtility.getAssetValueETH(_asset, _predictionStake);

      (uint minPrediction, , uint priceStep, uint256 positionDecimals, , ) = marketUtility.getBasicMarketDetails();
      require(_stakeValue >= minPrediction,"Min prediction amount required");
      uint predictionPoints = _calculatePredictionValue(_prediction, _stakeValue, positionDecimals, priceStep, _leverage);
      predictionPoints = _checkMultiplier(_asset, _predictionStake, predictionPoints, _stakeValue);

      _storePredictionData(_prediction, _predictionStake, _asset, _leverage, predictionPoints);
      marketRegistry.setUserGlobalPredictionData(msg.sender,_predictionStake, predictionPoints, _asset, _prediction, _leverage);
    }

    /**
    * @dev Stores the prediction data.
    * @param _prediction The option on which user place prediction.
    * @param _predictionStake The amount staked by user at the time of prediction.
    * @param _asset The asset used by user during prediction.
    * @param _leverage The leverage opted by user during prediction.
    * @param predictionPoints The positions user got during prediction.
    */
    function _storePredictionData(uint _prediction, uint _predictionStake, address _asset, uint _leverage, uint predictionPoints) internal {
      if(_asset == ETH_ADDRESS) {
        totalStakedETH = totalStakedETH.add(_predictionStake);
      }
      else {
        totalStakedToken = totalStakedToken.add(_predictionStake);
      }
      userData[msg.sender].predictionPoints[_prediction] = userData[msg.sender].predictionPoints[_prediction].add(predictionPoints);
      userData[msg.sender].assetStaked[_asset][_prediction] = userData[msg.sender].assetStaked[_asset][_prediction].add(_predictionStake);
      userData[msg.sender].LeverageAsset[_asset][_prediction] = userData[msg.sender].LeverageAsset[_asset][_prediction].add(_predictionStake.mul(_leverage));
      optionsAvailable[_prediction].predictionPoints = optionsAvailable[_prediction].predictionPoints.add(predictionPoints);
      optionsAvailable[_prediction].assetStaked[_asset] = optionsAvailable[_prediction].assetStaked[_asset].add(_predictionStake);
      optionsAvailable[_prediction].assetLeveraged[_asset] = optionsAvailable[_prediction].assetLeveraged[_asset].add(_predictionStake.mul(_leverage));
    }

    /**
    * @dev Check if the given `_asset` is supported to stake
    * @param _asset The asset used by user during prediction whether it is plotToken address or in ether.
    */
    function _isAllowedToStake(address _asset) internal view returns(bool) {
      return (_asset == ETH_ADDRESS ||
               _asset == plotToken ||
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
      uint _commision = _predictionStake.mul(assetData[_asset].commissionPerc).div(10000);
      _predictionStake = _predictionStake.sub(_commision);
      assetData[_asset].commissionAmount = assetData[_asset].commissionAmount.add(_commision);
      return _predictionStake;
    }

    /**
    * @dev Check if user gets any multiplier on his positions
    * @param _asset The assets uses by user during prediction.
    * @param _predictionStake The amount staked by user at the time of prediction.
    * @param predictionPoints The actual positions user got during prediction.
    * @param _stakeValue The stake value of asset.
    * @return uint256 representing multiplied positions
    */
    function _checkMultiplier(address _asset, uint _predictionStake, uint predictionPoints, uint _stakeValue) internal returns(uint) {
      uint _minPredictionForMultiplier;
      uint _stakedBalance = tokenController.tokensLockedAtTime(msg.sender, "SM", now);
      uint _predictionValueInToken;
      (_minPredictionForMultiplier, _predictionValueInToken) = marketUtility.getValueAndMultiplierParameters(_asset, _predictionStake);
      if(_stakeValue < _minPredictionForMultiplier || userData[msg.sender].multiplierApplied) {
        return predictionPoints;
      }
      uint _muliplier = 100;
      if(_stakedBalance.div(_predictionValueInToken) > 0) {
        _muliplier = _muliplier + _stakedBalance.mul(100).div(_predictionValueInToken.mul(10));
        userData[msg.sender].multiplierApplied = true;
      }
      predictionPoints = predictionPoints.mul(_muliplier).div(100);
      return predictionPoints;
    }

   /**
    * @dev Calculates the prediction value, i.e options allocated for staked prediction amount.
    * @param _prediction The option on which user placed prediction.
    * @param _stake The value of user stake in eth.
    * @param _priceStep Price step at which new price of option is calculated.
    * @param _leverage The leverage opted by user at the time of prediction.
    * @return The prediction points.
    */
    function _calculatePredictionValue(uint _prediction, uint _stake, uint _positionDecimals, uint _priceStep, uint _leverage) internal view returns(uint _predictionValue) {
      uint optionPrice;
      uint flag = 0;
      (uint _tokenPrice, uint _decimals) = marketUtility.getAssetPriceInETH(plotToken);
      uint _totalStaked = totalStakedETH.add(_calculateAssetValueInEth(totalStakedToken, _tokenPrice, _decimals));
      uint _assetStakedOnOption = optionsAvailable[_prediction].assetStaked[ETH_ADDRESS]
                                  .add(
                                    (_calculateAssetValueInEth(optionsAvailable[_prediction].assetStaked[plotToken], _tokenPrice, _decimals)));
      _predictionValue = 0;

      // Step price with step limit as `_priceStep`
      while(_stake > 0) {
        if(_stake <= (_priceStep)) {
          optionPrice = _calculateOptionPrice(_prediction, _totalStaked, _assetStakedOnOption.add(flag.mul(_priceStep)));
          _predictionValue = _predictionValue.add(_calculatePredictionPoints(_stake.mul(_positionDecimals), optionPrice, _leverage));
          break;
        } else {
          _stake = _stake.sub(_priceStep);
          optionPrice = _calculateOptionPrice(_prediction, _totalStaked, _assetStakedOnOption.add(flag.mul(_priceStep)));
          _predictionValue = _predictionValue.add(_calculatePredictionPoints(_priceStep.mul(_positionDecimals), optionPrice, _leverage));
          _totalStaked = _totalStaked.add(_priceStep);
          flag++;
        }
      }
    }

    /**
    * @dev internal function to calculate the prediction points 
    */
    function _calculatePredictionPoints(uint value, uint optionPrice, uint _leverage) internal pure returns(uint) {
      //leverageMultiplier = levergage + (leverage -1)*0.05; Raised by 3 decimals i.e 1000
      uint leverageMultiplier = 1000 + (_leverage-1)*50;
      value = value.mul(2500).div(1e18);
      // (amount*sqrt(amount*100)*leverage*100/(price*10*125000/1000));
      return value.mul(sqrt(value.mul(10000))).mul(_leverage*100*leverageMultiplier).div(optionPrice.mul(1250000000));
    }


    /**
    * @dev Calculates the price of `_option`.
    * @param _option Option chosen
    * @param _totalStaked The total asset staked on market.
    * @param _assetStakedOnOption Asset staked on options.
    * @return _optionPrice Price of the given option.
    */
    function _calculateOptionPrice(uint _option, uint _totalStaked, uint _assetStakedOnOption) internal view returns(uint _optionPrice) {
      _optionPrice = 0;
      uint currentPriceOption = 0;
      (uint stakeWeightage,uint stakeWeightageMinAmount, uint currentPrice, uint minTimeElapsedDivisor) = marketUtility.getPriceCalculationParams(marketFeedAddress, isChainlinkFeed);
      uint predictionWeightage = 100 - stakeWeightage;
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
    * @dev function to calculate square root of a number
    */
    function sqrt(uint x) internal pure returns (uint y) {
      uint z = (x + 1) / 2;
      y = x;
      while (z < y) {
          y = z;
          z = (x / z + z) / 2;
      }
    }

    /**
    * @dev Exchanges the commission after closing the market.
    */
    function exchangeCommission() external {
      if(!commissionExchanged) {
        _exchangeCommission();
      }
    }

    /**
    * @dev Exchanges the commission after closing the market.
    */
    function _exchangeCommission() internal {
      if(marketStatus() >= PredictionStatus.InSettlement) {
        commissionExchanged = true;
        uint256 _uniswapDeadline;
        uint256 _lotPurchasePerc;
        (_lotPurchasePerc, _uniswapDeadline) = marketUtility.getPurchasePercAndDeadline();
        if(assetData[plotToken].commissionAmount > 0){
          bool burned = tokenController.burnCommissionTokens(assetData[plotToken].commissionAmount);
          if(!burned) {
            _transferAsset(plotToken, address(marketRegistry), assetData[plotToken].commissionAmount);
          }
        } 
        if(assetData[ETH_ADDRESS].commissionAmount > 0) {
          uint256 _lotPurchaseAmount = (assetData[ETH_ADDRESS].commissionAmount).mul(_lotPurchasePerc).div(100);
          uint256 _amountToPool = (assetData[ETH_ADDRESS].commissionAmount).sub(_lotPurchaseAmount);
          _transferAsset(ETH_ADDRESS, address(marketRegistry), _amountToPool);
          uint256 _tokenOutput;
          address[] memory path;
          address _router;
          (_router , path) = marketUtility.getETHtoTokenRouterAndPath();
          IUniswapV2Router02 router = IUniswapV2Router02(_router);
          uint[] memory output = router.swapExactETHForTokens.value(_lotPurchaseAmount)(1, path, address(this), _uniswapDeadline);
          _tokenOutput = output[1];
          incentiveToDistribute[plotToken] = incentiveToDistribute[plotToken].add(_tokenOutput);
        }
      }
    }

    /**
    * @dev Settle the market, setting the winning option
    */
    function settleMarket() external {
      uint256 _value = marketUtility.getAssetPriceUSD(marketFeedAddress, isChainlinkFeed);
      require(marketStatus() == PredictionStatus.InSettlement);
      _postResult(_value);
    }

    /**
    * @dev Calculate the result of market.
    * @param _value The current price of market currency.
    */
    function _postResult(uint256 _value) internal {
      require(now >= settleTime,"Time not reached");
      require(_value > 0,"value should be greater than 0");
      uint disributePercFromMFPool;
      uint transferPercToMFPool;
      uint lossPercentage;
      ( , lossPercentage, , , transferPercToMFPool, disributePercFromMFPool) = marketUtility.getBasicMarketDetails();
      predictionStatus = PredictionStatus.Settled;
      marketCoolDownTime = (now).add(marketCoolDownTime);
      if(_value < optionsAvailable[2].minValue) {
        WinningOption = 1;
      } else if(_value > optionsAvailable[2].maxValue) {
        WinningOption = 3;
      } else {
        WinningOption = 2;
      }
      uint[] memory totalReward = new uint256[](2);
      if(optionsAvailable[WinningOption].assetStaked[ETH_ADDRESS] > 0 ||
        optionsAvailable[WinningOption].assetStaked[plotToken] > 0
      ){
        for(uint i=1;i <= totalOptions;i++){
          if(i!=WinningOption) {
          totalReward[0] = totalReward[0].add(_calculatePercentage(lossPercentage, optionsAvailable[i].assetLeveraged[plotToken], 100));
          totalReward[1] = totalReward[1].add(_calculatePercentage(lossPercentage, optionsAvailable[i].assetLeveraged[ETH_ADDRESS], 100));
          }
        }
        if(totalReward[0].add(totalReward[1]) == 0) {
          totalReward[0] = _calculatePercentage(disributePercFromMFPool, IToken(plotToken).balanceOf(address(marketRegistry)), 100);
          marketRegistry.withdrawForRewardDistribution(totalReward[0]);
        } else {
          tokenAmountToPool = _calculatePercentage(transferPercToMFPool, totalReward[0], 100);
          ethAmountToPool = _calculatePercentage(transferPercToMFPool, totalReward[1], 100);
          totalReward[0] = totalReward[0].sub(tokenAmountToPool);
          totalReward[1] = totalReward[1].sub(ethAmountToPool);
        }
        rewardToDistribute = totalReward;
      } else {
        for(uint i=1;i <= totalOptions;i++){
          tokenAmountToPool = tokenAmountToPool.add(_calculatePercentage(lossPercentage, optionsAvailable[i].assetLeveraged[plotToken], 100));
          ethAmountToPool = ethAmountToPool.add(_calculatePercentage(lossPercentage, optionsAvailable[i].assetLeveraged[ETH_ADDRESS], 100));
        }
      }
      _transferAsset(ETH_ADDRESS, address(marketRegistry), ethAmountToPool);
      _transferAsset(plotToken, address(marketRegistry), tokenAmountToPool);
      marketCloseValue = _value;
      marketRegistry.callMarketResultEvent(rewardToDistribute, WinningOption, _value);
    }

    function _calculatePercentage(uint256 _percent, uint256 _value, uint256 _divisor) internal pure returns(uint256) {
      return _percent.mul(_value).div(_divisor);
    }

    /**
    * @dev Raise the dispute if wrong value passed at the time of market result declaration.
    * @param proposedValue The proposed value of market currency.
    * @param proposalTitle The title of proposal created by user.
    * @param description The description of dispute.
    * @param solutionHash The ipfs solution hash.
    */
    function raiseDispute(uint256 proposedValue, string memory proposalTitle, string memory description, string memory solutionHash) public {
      require(marketStatus() == PredictionStatus.Cooling);
      uint _stakeForDispute =  marketUtility.getDisputeResolutionParams();
      require(IToken(plotToken).transferFrom(msg.sender, address(marketRegistry), _stakeForDispute));
      lockedForDispute = true;
      marketRegistry.createGovernanceProposal(proposalTitle, description, solutionHash, abi.encode(address(this), proposedValue), _stakeForDispute, msg.sender, ethAmountToPool, tokenAmountToPool);
      predictionStatus = PredictionStatus.InDispute;
    }

    /**
    * @dev Resolve the dispute
    * @param accepted Flag mentioning if dispute is accepted or not
    * @param finalResult The final correct value of market currency.
    */
    function resolveDispute(bool accepted, uint256 finalResult) external {
      require(msg.sender == address(marketRegistry));
      if(accepted) {
        require(marketStatus() == PredictionStatus.InDispute);
        _postResult(finalResult);
      }
      lockedForDispute = false;
      predictionStatus = PredictionStatus.Settled;
    }


    /**
    * @dev Claim the return amount of the specified address.
    * @param _user The address to query the claim return amount of.
    * @return Flag, if 0:cannot claim, 1: Already Claimed, 2: Claimed
    */
    function claimReturn(address payable _user) public returns(uint256) {

      if(lockedForDispute || marketStatus() != PredictionStatus.Settled || marketRegistry.marketCreationPaused()) {
        return 0;
      }
      if(userData[_user].claimedReward) {
        return 1;
      }
      if(!commissionExchanged) {
        _exchangeCommission();
      }
      userData[_user].claimedReward = true;
      (uint[] memory _returnAmount, address[] memory _predictionAssets, uint[] memory _incentives, ) = getReturn(_user);
      uint256 i;
      _transferAsset(plotToken, _user, _returnAmount[0]);
      _transferAsset(ETH_ADDRESS, _user, _returnAmount[1]);
      for(i = 0;i < incentiveTokens.length; i++) {
        _transferAsset(incentiveTokens[i], _user, _incentives[i]);
      }
      marketRegistry.callClaimedEvent(_user, _returnAmount, _predictionAssets, _incentives, incentiveTokens);
      return 2;
    }

    /**
    * @dev Transfer the assets to specified address.
    * @param _asset The asset transfer to the specific address.
    * @param _recipient The address to transfer the asset of
    * @param _amount The amount which is transfer.
    */
    function _transferAsset(address _asset, address payable _recipient, uint256 _amount) internal {
      if(_amount > 0) { 
        if(_asset == ETH_ADDRESS) {
          _recipient.transfer(_amount);
        } else {
          require(IToken(_asset).transfer(_recipient, _amount));
        }
      }
    }


    /**
    * @dev Calculate the given asset value in eth 
    */
    function _calculateAssetValueInEth(uint _amount, uint _price, uint _decimals)internal pure returns(uint) {
      return _amount.mul(_price).div(10**_decimals);
    }

   /**
    * @dev Get estimated amount of prediction points for given inputs.
    * @param _prediction The option on which user place prediction.
    * @param _stakeValueInEth The amount staked by user.
    * @param _leverage The leverage opted by user at the time of prediction.
    * @return uint256 representing the prediction points.
    */
    function estimatePredictionValue(uint _prediction, uint _stakeValueInEth, uint _leverage) public view returns(uint _predictionValue){
      ( , , uint priceStep, uint256 positionDecimals, , ) = marketUtility.getBasicMarketDetails();
      return _calculatePredictionValue(_prediction, _stakeValueInEth, positionDecimals, priceStep, _leverage);
    }

    /**
    * @dev Gets the price of specific option.
    * @param _prediction The option number to query the balance of.
    * @return Price of the option.
    */
    function getOptionPrice(uint _prediction) public view returns(uint) {
      (uint _price, uint _decimals) = marketUtility.getAssetPriceInETH(plotToken);

     return _calculateOptionPrice(
                _prediction,
                totalStakedETH.add(totalStakedToken.mul(_price).div(10**_decimals)),
                optionsAvailable[_prediction].assetStaked[ETH_ADDRESS].add(
                  (optionsAvailable[_prediction].assetStaked[plotToken]).mul(_price).div(10**_decimals)
                )
            );
    }

    /**
    * @dev Gets number of positions user got in prediction
    * @param _user Address of user
    * @param _option Option Id
    */
    function getUserPredictionPoints(address _user, uint256 _option) external view returns(uint256) {
      return userData[_user].predictionPoints[_option];
    }

    /**
    * @dev Gets the market data.
    * @return _marketCurrency bytes32 representing the currency or stock name of the market.
    * @return minvalue uint[] memory representing the minimum range of all the options of the market.
    * @return maxvalue uint[] memory representing the maximum range of all the options of the market.
    * @return _optionPrice uint[] memory representing the option price of each option ranges of the market.
    * @return _ethStaked uint[] memory representing the ether staked on each option ranges of the market.
    * @return _plotStaked uint[] memory representing the plot staked on each option ranges of the market.
    * @return _predictionTime uint representing the type of market.
    * @return _expireTime uint representing the time at which market closes for prediction
    * @return _predictionStatus uint representing the status of the market.
    */
    function getData() public view returns
       (bytes32 _marketCurrency,uint[] memory minvalue,uint[] memory maxvalue,
        uint[] memory _optionPrice, uint[] memory _ethStaked, uint[] memory _plotStaked,uint _predictionTime,uint _expireTime, uint _predictionStatus){
        _marketCurrency = marketCurrency;
        _predictionTime = expireTime.sub(startTime);
        _expireTime =expireTime;
        _predictionStatus = uint(marketStatus());
        minvalue = new uint[](totalOptions);
        maxvalue = new uint[](totalOptions);
        _optionPrice = new uint[](totalOptions);
        _ethStaked = new uint[](totalOptions);
        _plotStaked = new uint[](totalOptions);
        (uint _tokenPrice, uint _decimals) = marketUtility.getAssetPriceInETH(plotToken);
        uint _totalStaked = totalStakedETH.add(_calculateAssetValueInEth(totalStakedToken, _tokenPrice, _decimals));
        uint _assetStaked;
        for (uint i = 0; i < totalOptions; i++) {
        _assetStaked = optionsAvailable[i+1].assetStaked[ETH_ADDRESS];
        _assetStaked = _assetStaked.add(
          _calculateAssetValueInEth(optionsAvailable[i+1].assetStaked[plotToken], _tokenPrice, _decimals)
        );
        _ethStaked[i] = optionsAvailable[i+1].assetStaked[ETH_ADDRESS];
        _plotStaked[i] = optionsAvailable[i+1].assetStaked[plotToken];
        minvalue[i] = optionsAvailable[i+1].minValue;
        maxvalue[i] = optionsAvailable[i+1].maxValue;
        _optionPrice[i] = _calculateOptionPrice(i+1, _totalStaked, _assetStaked);
       }
    }

   /**
    * @dev Gets the result of the market.
    * @return uint256 representing the winning option of the market.
    * @return uint256 Value of market currently at the time closing market.
    * @return uint256 representing the positions of the winning option.
    * @return uint[] memory representing the reward to be distributed.
    * @return uint256 representing the Eth staked on winning option.
    * @return uint256 representing the PLOT staked on winning option.
    */
    function getMarketResults() public view returns(uint256, uint256, uint256, uint256[] memory, uint256, uint256) {
      return (WinningOption, marketCloseValue, optionsAvailable[WinningOption].predictionPoints, rewardToDistribute, optionsAvailable[WinningOption].assetStaked[ETH_ADDRESS], optionsAvailable[WinningOption].assetStaked[plotToken]);
    }


    /**
    * @dev Gets the return amount of the specified address.
    * @param _user The address to specify the return of
    * @return returnAmount uint[] memory representing the return amount.
    * @return incentive uint[] memory representing the amount incentive.
    * @return _incentiveTokens address[] memory representing the incentive tokens.
    */
    function getReturn(address _user)public view returns (uint[] memory returnAmount, address[] memory _predictionAssets, uint[] memory incentive, address[] memory _incentiveTokens){
      if(marketStatus() != PredictionStatus.Settled || totalStakedETH.add(totalStakedToken) ==0) {
       return (returnAmount, _predictionAssets, incentive, _incentiveTokens);
      }
      _predictionAssets = new address[](2);
      _predictionAssets[0] = plotToken;
      _predictionAssets[1] = ETH_ADDRESS;

      uint256 _totalUserPredictionPoints = 0;
      uint256 _totalPredictionPoints = 0;
      (returnAmount, _totalUserPredictionPoints, _totalPredictionPoints) = _calculateUserReturn(_user);
      incentive = _calculateIncentives(_totalUserPredictionPoints, _totalPredictionPoints);
      if(userData[_user].predictionPoints[WinningOption] > 0) {
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
        reward = userData[_user].predictionPoints[WinningOption].mul(rewardToDistribute[j]).div(optionsAvailable[WinningOption].predictionPoints);
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
      ( , uint lossPercentage, , , , ) = marketUtility.getBasicMarketDetails();
      _return = new uint256[](2);
      for(uint  i=1;i<=totalOptions;i++){
        _totalUserPredictionPoints = _totalUserPredictionPoints.add(userData[_user].predictionPoints[i]);
        _totalPredictionPoints = _totalPredictionPoints.add(optionsAvailable[i].predictionPoints);
        _return[0] =  _callReturn(_return[0], _user, i, lossPercentage, plotToken);
        _return[1] =  _callReturn(_return[1], _user, i, lossPercentage, ETH_ADDRESS);
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

    // /**
    // * @dev Gets the pending return.
    // * @param _user The address to specify the return of.
    // * @return uint representing the pending return amount.
    // */
    // function getPendingReturn(address _user) external view returns(uint[] memory returnAmount, address[] memory _predictionAssets, uint[] memory incentive, address[] memory _incentiveTokens){
    //   if(userClaimedReward[_user]) return (0,0);
    //   return getReturn(_user);
    // }
    
    /**
    * @dev Calls the total return amount internally.
    */
    function _callReturn(uint _return,address _user,uint i,uint lossPercentage, address _asset)internal view returns(uint){
      if(i == WinningOption) {
        lossPercentage = 0;
      }
      return _return.add(userData[_user].assetStaked[_asset][i].sub((userData[_user].LeverageAsset[_asset][i].mul(lossPercentage)).div(100)));
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

    // /**
    // * @dev callback for result declaration of market.
    // * @param myid The orcalize market result id.
    // * @param result The current price of market currency.
    // */
    // function __callback(bytes32 myid, string memory result) public {
    //   require(msg.sender == provable_cbAddress());
    //   require ((myid==marketResultId));
    //   uint _currentPrice = marketUtility.getAssetPriceUSD(marketFeedAddress, isChainlinkFeed);
    //   _postResult(_currentPrice);
    //   delete marketResultId;
    // }

}
