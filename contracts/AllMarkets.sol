/* Copyright (C) 2020 PlotX.io

  This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

  This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
    along with this program.  If not, see http://www.gnu.org/licenses/ */

pragma solidity 0.5.7;

import "./external/openzeppelin-solidity/math/SafeMath.sol";
// import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./interfaces/IMarketUtility.sol";
import "./external/govblocks-protocol/Governed.sol";
import "./interfaces/IToken.sol";
// import "./IERC20.sol";
// import "./interfaces/ITokenController.sol";
// import "./interfaces/IMarketRegistry.sol";

contract Market is Governed{
    using SafeMath for *;

       enum PredictionStatus {
      Live,
      InSettlement,
      Cooling,
      InDispute,
      Settled
    }

    struct option
    {
      uint predictionPoints;
      uint priceFactor;
      mapping(address => uint256) assetStaked;
      mapping(address => uint256) assetLeveraged;
      
    }

    struct MarketSettleData {
      uint64 WinningOption;
      uint64 settleTime;
    }

    address constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    // address constant marketFeedAddress = 0x6135b13325bfC4B00278B4abC5e20bbce2D6580e;
    address constant plotToken = 0x10FeBdffd88bD00e47B6901CB6Eb1b440931d235;
    IToken plt = IToken(plotToken);

    // IMarketRegistry constant marketRegistry = IMarketRegistry(0x309D36e5887EA8863A721680f728487F8d70DD09);
    // ITokenController constant tokenController = ITokenController(0xCEFED1C83a84FB5AcAF15734010d51B87C3cc73A);
    IMarketUtility constant marketUtility = IMarketUtility(0xFB2990f67cd035E1C62eEc9D98A66E817a830E40);

    // uint8[] constant roundOfToNearest = [25,1];
    uint constant totalOptions = 3;
    uint constant MAX_LEVERAGE = 5;
    uint constant ethCommissionPerc = 10; //with 2 decimals
    uint constant plotCommissionPerc = 5; //with 2 decimals
    // bytes32[] public constant marketCurrency = ["BTC/USD","ETH/USD"];
    
    mapping(uint => bool) internal lockedForDispute;
    mapping(uint =>address) internal incentiveToken;
    // uint internal ethAmountToPool;
    mapping(uint =>uint) internal ethAmountToPool;
    mapping(uint =>uint) internal tokenAmountToPool;

    uint internal ethCommissionAmount;
    uint internal plotCommissionAmount;
    // uint internal tokenAmountToPool;
    mapping(uint =>uint) internal incentiveToDistribute;
    mapping(uint =>uint[]) internal rewardToDistribute;
    mapping(uint =>PredictionStatus) internal predictionStatus;
    mapping(uint => bool) internal multiplierApplied;

    
    struct UserData {
      bool claimedReward;
      bool predictedWithBlot;
       bool multiplierApplied;
      mapping(uint => uint) predictionPoints;
      mapping(address => mapping(uint => uint)) assetStaked;
      mapping(address => mapping(uint => uint)) PLOTStaked;
       mapping(address => mapping(uint => uint)) LeverageAsset;
    }

    struct MarketData {
      uint32 Mtype;
      uint32 currency;
      uint32 startTime;
      uint32 predictionTime;
      uint64 neutralMinValue;
      uint64 neutralMaxValue;
    }
    
    struct UserGlobalPrediction
    {
        mapping(address => uint) currencyUsedBalance;
        mapping(address => uint) currencyUnusedBalance;
        uint totalPlotParticipated;
        uint[] marketsPredicted;
        mapping(uint=>bool) marketParticipated;
    }

    event MarketTypes(uint64 indexed predictionTime, uint64 optionRangePerc, bool status);
    event MarketCurrencies(uint256 indexed index, address feedAddress, bytes32 currencyName, bool status);
    event MarketResult(uint256 indexed marketIndex, uint256[] totalReward, uint256 winningOption, uint256 closeValue, uint256 roundId);

    MarketData[] public marketData;
    MarketSettleData public marketSettleData;

    mapping(uint256 => MarketSettleData) marketSettleData;
    mapping(address => mapping(uint=> UserData)) internal userData;

    mapping(uint =>mapping(uint=>option)) public marketOptionsAvailable;
    mapping(address => UserGlobalPrediction) UserGlobalPredictionData;
    struct MarketTypeData {
      uint64 optionRangePerc;
      uint32 index;
    }

    struct MarketCurrency {
      bytes32 currencyName;
      address marketFeed;
      uint8 decimals;
      uint8 roundOfToNearest;
    }

    struct MarketCreationData {
      uint64 initialStartTime;
      uint64 latestMarket;
      uint64 penultimateMarket;
      uint64 paused;
    }


    bool public marketCreationPaused;
    MarketCurrency[] marketCurrencies;
    mapping(bytes32 => uint) marketCurrency;

    mapping(uint64 => MarketTypeData) marketType;
    mapping(uint256 => mapping(uint256 => MarketCreationData)) public marketCreationData;
    uint64[] marketTypeArray;

    function addMarketCurrency(bytes32 _currencyName,  address _marketFeed, uint8 decimals, uint8 roundOfToNearest) public onlyAuthorizedToGovern {
      marketCurrency[_currencyName] = marketCurrencies.length;
      marketCurrencies.push(MarketCurrency(_currencyName, _marketFeed, decimals, roundOfToNearest));
      emit MarketCurrencies(marketCurrency[_currencyName], _marketFeed, _currencyName, true);
    }

    function addMarketType(uint64 _predictionTime, uint64 _optionRangePerc) public onlyAuthorizedToGovern {
      marketType[_predictionTime] = MarketTypeData(_optionRangePerc, uint32(marketTypeArray.length));
      marketTypeArray.push(_predictionTime);
      emit MarketTypes(_predictionTime, _optionRangePerc, true);
    }

    function removeMarketType(uint64 _predictionTime) public onlyAuthorizedToGovern {
      uint32 marketTypeIndex= marketType[_predictionTime].index;
      uint256 topIndex = marketTypeArray.length - 1;
      marketType[marketTypeArray[topIndex]].index = marketTypeIndex; 
      marketTypeArray[marketTypeIndex] = marketTypeArray[topIndex];
      marketTypeArray.pop();
      delete marketType[_predictionTime];
      emit MarketTypes(_predictionTime, 0, false);
    }

     /**
    * @dev Initialize the market.
    * @param _startTime The time at which market will create.
    * @param _predictionTime The time duration of market.
    */
    function initiate(uint32 _marketCurrencyIndex,uint32 _startTime, uint32 _predictionTime) public payable {
      require(!marketCreationPaused && !marketCreationData[_predictionTime][_marketCurrencyIndex].paused);
      _checkPreviousMarket( _predictionTime, _marketCurrencyIndex);
      // OwnedUpgradeabilityProxy proxy =  OwnedUpgradeabilityProxy(address(uint160(address(this))));
      // require(msg.sender == proxy.proxyOwner(),"Sender is not proxy owner.");
      // require(marketData.startTime == 0, "Already initialized");
      // require(_startTime.add(_predictionTime) > now);
      marketUtility.update();
      uint currentPrice = marketUtility.getAssetPriceUSD(marketCurrencies[_marketCurrencyIndex].marketFeed);
      uint64 _optionRangePerc = marketType[_predictionTime].optionRangePerc;
      _optionRangePerc = uint64(currentPrice.mul(_optionRangePerc.div(2)).div(10000));
      uint64 _decimals = marketCurrencies[_marketCurrencyIndex].decimals;
      uint8 _roundOfToNearest = marketCurrencies[_marketCurrencyIndex].roundOfToNearest;
      uint64 _minValue = uint64((ceil(currentPrice.sub(_optionRangePerc).div(_roundOfToNearest), 10**_decimals)).mul(_roundOfToNearest));
      uint64 _maxValue = uint64((ceil(currentPrice.add(_optionRangePerc).div(_roundOfToNearest), 10**_decimals)).mul(_roundOfToNearest));
      uint marketIndex = marketData.length;
      marketData.push(MarketData(marketType[_predictionTime].index,_marketCurrencyIndex,_startTime,_predictionTime,_minValue,_maxValue));
      (marketCreationData[_predictionTime][_marketCurrencyIndex].penultimateMarket, marketCreationData[_predictionTime][_marketCurrencyIndex].latestMarket) =
       (marketCreationData[_predictionTime][_marketCurrencyIndex].latestMarket, uint64(marketIndex));
    }

    function _checkPreviousMarket(uint64 _predictionTime, uint64 _marketCurrencyIndex) internal {
      uint64 penultimateMarket = marketCreationData[_predictionTime][_marketCurrencyIndex].penultimateMarket;
      // if(penultimateMarket != address(0)) {
      //   IMarket(penultimateMarket).settleMarket();
      // }
    }

    /**
    * @dev Get market settle time
    * @return the time at which the market result will be declared
    */
    function marketSettleTime(uint256 _marketId) public view returns(uint64) {
      if(marketSettleData[_marketId].settleTime > 0) {
        return marketSettleData[_marketId].settleTime;
      }
      return uint64(marketData[_marketId].startTime.add(marketData[_marketId].predictionTime.mul(2)));
    }

    /**
    * @dev Gets the status of market.
    * @return PredictionStatus representing the status of market.
    */
    function marketStatus(uint256 _marketId) internal view returns(PredictionStatus){
      if(predictionStatus == PredictionStatus.Live && now >= marketExpireTime(_marketId)) {
        return PredictionStatus.InSettlement;
      } else if(predictionStatus == PredictionStatus.Settled && now <= marketCoolDownTime(_marketId)) {
        return PredictionStatus.Cooling;
      }
      return predictionStatus;
    }

    /**
    * @dev Get market cooldown time
    * @return the time upto which user can raise the dispute after the market is settled
    */
    function marketCoolDownTime(uint256 _marketId) public view returns(uint256) {
      return marketSettleData[_marketId].settleTime.add(marketData[_marketId].predictionTime.div(4));
    }

    /**
    * @dev Settle the market, setting the winning option
    */
    function settleMarket(uint256 _marketId) external {
      (uint256 _value, uint256 _roundId) = marketUtility.getSettlemetPrice(marketFeedAddress, uint256(marketSettleTime(_marketId)));
      if(marketStatus(_marketId) == PredictionStatus.InSettlement) {
        _postResult(_value, _roundId, _marketId);
      }
    }

    /**
    * @dev Calculate the result of market.
    * @param _value The current price of market currency.
    */
    function _postResult(uint256 _value, uint256 _roundId, uint256 _marketId) internal {
      require(now >= marketSettleTime(_marketId),"Time not reached");
      require(_value > 0,"value should be greater than 0");
      uint riskPercentage;
      ( , riskPercentage, , ) = marketUtility.getBasicMarketDetails();
      if(predictionStatus != PredictionStatus.InDispute) {
        marketSettleData[_marketId].settleTime = uint64(now);
      } else {
        delete marketSettleData[_marketId].settleTime;
      }
      predictionStatus = PredictionStatus.Settled;
      if(_value < marketData[_marketId].neutralMinValue) {
        marketSettleData[_marketId].WinningOption = 1;
      } else if(_value > marketData[_marketId].neutralMaxValue) {
        marketSettleData[_marketId].WinningOption = 3;
      } else {
        marketSettleData[_marketId].WinningOption = 2;
      }
      uint[] memory totalReward = new uint256[](2);
      if(optionsAvailable[marketSettleData[_marketId].WinningOption].assetStaked[ETH_ADDRESS] > 0 ||
        optionsAvailable[marketSettleData[_marketId].WinningOption].assetStaked[plotToken] > 0
      ){
        for(uint i=1;i <= totalOptions;i++){
          if(i!=marketSettleData[_marketId].WinningOption) {
            uint256 leveragedAsset = _calculatePercentage(riskPercentage, optionsAvailable[i].assetLeveraged[plotToken], 100);
            totalReward[0] = totalReward[0].add(leveragedAsset);
            leveragedAsset = _calculatePercentage(riskPercentage, optionsAvailable[i].assetLeveraged[ETH_ADDRESS], 100);
            totalReward[1] = totalReward[1].add(leveragedAsset);
          }
        }
        rewardToDistribute[_marketId] = totalReward;
      } else {
        uint256 tokenParticipation;
        uint256 ethParticipation;
        for(uint i=1;i <= totalOptions;i++){
          uint256 leveragedAsset = _calculatePercentage(riskPercentage, optionsAvailable[i].assetLeveraged[plotToken], 100);
          tokenParticipation = tokenParticipation.add(leveragedAsset);
          leveragedAsset = _calculatePercentage(riskPercentage, optionsAvailable[i].assetLeveraged[ETH_ADDRESS], 100);
          ethParticipation = ethParticipation.add(leveragedAsset);
        }
      }
      ethAmountToPool[_marketId] = ethParticipation;
      tokenAmountToPool[_marketId] = tokenParticipation;
      emit MarketResult(_marketId, rewardToDistribute[_marketId], marketSettleData[_marketId].WinningOption, _value, _roundId);
    }

    function pauseMarketCreation() external onlyAuthorizedToGovern {
      require(!marketCreationPaused);
      marketCreationPaused = true;
    }

    function pauseMarketCreationType(uint64 _predictionTime, uint64 _marketCurrencyIndex) external onlyAuthorizedToGovern {
      require(!marketCreationData[_predictionTime][_marketCurrencyIndex].paused);
      marketCreationData[_predictionTime][_marketCurrencyIndex].paused = true;
    }

    function resumeMarketCreation() external onlyAuthorizedToGovern {
      require(marketCreationPaused);
      marketCreationPaused = false;
    }

    function resumeMarketCreationType(uint64 _predictionTime, uint64 _marketCurrencyIndex) external onlyAuthorizedToGovern {
      require(marketCreationData[_predictionTime][_marketCurrencyIndex].paused);
      marketCreationData[_predictionTime][_marketCurrencyIndex].paused = false;
    }

    function  deposit(uint _amount) payable public returns(bool res)  {
      plt.transferFrom (msg.sender,address(this), _amount);
      UserGlobalPredictionData[msg.sender].currencyUnusedBalance[ETH_ADDRESS] = UserGlobalPredictionData[msg.sender].currencyUnusedBalance[ETH_ADDRESS].add(msg.value);
      UserGlobalPredictionData[msg.sender].currencyUnusedBalance[plt.address]  += UserGlobalPredictionData[msg.sender].currencyUnusedBalance[plt.address].add(_amount);
    }

     function  withdraw() public returns(bool res)  {
      withdrawReward(msg.sender);
      uint _amountPlt = UserGlobalPredictionData[msg.sender].currencyUnusedBalance[plt.address];
      uint _amountEth = UserGlobalPredictionData[msg.sender].currencyUnusedBalance[ETH_ADDRESS];
      UserGlobalPredictionData[msg.sender].currencyUnusedBalance[plt.address] = 0;
      UserGlobalPredictionData[msg.sender].currencyUnusedBalance[ETH_ADDRESS] = 0;
      msg.sender.transfer(_amountEth);
      plt.transfer (msg.sender, _amountPlt);
      
    }

    /**
    * @dev Get market expire time
    * @return the time upto which user can place predictions in market
    */
    function marketExpireTime(uint _marketId) internal view returns(uint256) {
      return marketData[_marketId].startTime.add(marketData[_marketId].predictionTime);
    }

    function _calculatePercentage(uint256 _percent, uint256 _value, uint256 _divisor) internal pure returns(uint256) {
      return _percent.mul(_value).div(_divisor);
    }

    function getTotalAssetsStaked(uint _marketId) public view returns(uint256 ethStaked, uint256 plotStaked) {
      for(uint256 i = 1; i<= totalOptions;i++) {
        ethStaked = ethStaked.add(marketOptionsAvailable[_marketId][i].assetStaked[ETH_ADDRESS]);
        plotStaked = plotStaked.add(marketOptionsAvailable[_marketId][i].assetStaked[plotToken]);
      }
    }

    function calculatePredictionValue(uint _marketId, uint _prediction, uint _predictionStake, uint _leverage, address _asset) internal view returns(uint predictionPoints, bool isMultiplierApplied) {
      uint[] memory params = new uint[](11);
      params[0] = _prediction;
      params[1] = marketData.neutralMinValue;
      params[2] = marketData.neutralMaxValue;
      params[3] = marketData.startTime;
      params[4] = marketExpireTime(_marketId);
      (params[5], params[6]) = getTotalAssetsStaked(_marketId);
      params[7] = marketOptionsAvailable[_marketId][_prediction].assetStaked[ETH_ADDRESS];
      params[8] = marketOptionsAvailable[_marketId][_prediction].assetStaked[plotToken];
      params[9] = _predictionStake;
      params[10] = _leverage;
      bool checkMultiplier;
      if(!userData[msg.sender][_marketId].multiplierApplied) {
        checkMultiplier = true;
      }
      (predictionPoints, isMultiplierApplied) = marketUtility.calculatePredictionValue(params, _asset, msg.sender, marketFeedAddress, checkMultiplier);
      
    }
    

    /**
    * @dev Place prediction on the available options of the market.
    * @param _asset The asset used by user during prediction whether it is plotToken address or in ether.
    * @param _predictionStake The amount staked by user at the time of prediction.
    * @param _prediction The option on which user placed prediction.
    * @param _leverage The leverage opted by user at the time of prediction.
    */
    function placePrediction(uint _marketId, address _asset, uint256 _predictionStake, uint256 _prediction,uint256 _leverage) public {
      require(!marketCreationPaused && _prediction <= totalOptions && _leverage <= MAX_LEVERAGE);
      require(now >= marketData[_marketId].startTime && now <= marketExpireTime(_marketId));

      uint256 _commissionStake;
      if(_asset == ETH_ADDRESS) {
        require(_predictionStake <= UserGlobalPredictionData[msg.sender].currencyUnusedBalance[ETH_ADDRESS]);
        _commissionStake = _calculatePercentage(ethCommissionPerc, _predictionStake, 10000);
        ethCommissionAmount = ethCommissionAmount.add(_commissionStake);
        UserGlobalPredictionData[msg.sender].currencyUnusedBalance[ETH_ADDRESS] = UserGlobalPredictionData[msg.sender].currencyUnusedBalance[ETH_ADDRESS].sub(_predictionStake);
        UserGlobalPredictionData[msg.sender].currencyUsedBalance[ETH_ADDRESS] = UserGlobalPredictionData[msg.sender].currencyUsedBalance[ETH_ADDRESS].add(_predictionStake).sub(ethCommissionAmount);
      } else {
        if (_asset == plotToken){
          UserGlobalPredictionData[msg.sender].currencyUnusedBalance[plotToken] = UserGlobalPredictionData[msg.sender].currencyUnusedBalance[plotToken].sub(_predictionStake);
        } else {
          require(_asset == tokenController.bLOTToken());
          require(_leverage == MAX_LEVERAGE);
          require(!userData[msg.sender][_marketId].predictedWithBlot);
          userData[msg.sender][_marketId].predictedWithBlot = true;
          tokenController.swapBLOT(msg.sender, address(this), _predictionStake);
          _asset = plotToken;
        }
        _commissionStake = _calculatePercentage(plotCommissionPerc, _predictionStake, 10000);
        plotCommissionAmount = plotCommissionAmount.add(_commissionStake);
        if(_asset == plotToken) {
          UserGlobalPredictionData[msg.sender].currencyUsedBalance[plotToken] = UserGlobalPredictionData[msg.sender].currencyUsedBalance[plotToken].add(_predictionStake).sub(plotCommissionAmount);
        }
      }
      _commissionStake = _predictionStake.sub(_commissionStake);


      (uint predictionPoints, bool isMultiplierApplied) = calculatePredictionValue(_marketId, _prediction, _commissionStake, _leverage, _asset);
      if(isMultiplierApplied) {
        userData[msg.sender][_marketId].multiplierApplied = true; 
      }
      require(predictionPoints > 0);

      _storePredictionData(_prediction, _commissionStake, _asset, _leverage, predictionPoints);
      _setUserGlobalPredictionData(msg.sender,_predictionStake, predictionPoints, _asset, _prediction, _leverage);
    }

    /**
    * @dev Stores the prediction data.
    * @param _prediction The option on which user place prediction.
    * @param _predictionStake The amount staked by user at the time of prediction.
    * @param _asset The asset used by user during prediction.
    * @param _leverage The leverage opted by user during prediction.
    * @param predictionPoints The positions user got during prediction.
    */
    function _storePredictionData(uint _marketId, uint _prediction, uint _predictionStake, address _asset, uint _leverage, uint predictionPoints) internal {
      userData[msg.sender][_marketId].predictionPoints[_prediction] = userData[msg.sender][_marketId].predictionPoints[_prediction].add(predictionPoints);
      userData[msg.sender][_marketId].assetStaked[_asset][_prediction] = userData[msg.sender][_marketId].assetStaked[_asset][_prediction].add(_predictionStake);
      userData[msg.sender][_marketId].LeverageAsset[_asset][_prediction] = userData[msg.sender][_marketId].LeverageAsset[_asset][_prediction].add(_predictionStake.mul(_leverage));
      marketOptionsAvailable[_marketId][_prediction].predictionPoints = marketOptionsAvailable[_prediction][_marketId].predictionPoints.add(predictionPoints);
      marketOptionsAvailable[_marketId][_prediction].assetStaked[_asset] = marketOptionsAvailable[_prediction][_marketId].assetStaked[_asset].add(_predictionStake);
      marketOptionsAvailable[_marketId][_prediction].assetLeveraged[_asset] = marketOptionsAvailable[_prediction][_marketId].assetLeveraged[_asset].add(_predictionStake.mul(_leverage));
    }

    /**
    * @dev Emits the PlacePrediction event and sets the user data.
    * @param _user The address who placed prediction.
    * @param _value The amount of ether user staked.
    * @param _predictionPoints The positions user will get.
    * @param _predictionAsset The prediction assets user will get.
    * @param _prediction The option range on which user placed prediction.
    * @param _leverage The leverage selected by user at the time of place prediction.
    */
    function _setUserGlobalPredictionData(address _user,uint256 _value, uint256 _predictionPoints, address _predictionAsset, uint256 _prediction, uint256 _leverage) internal {
      if(_predictionAsset == ETH_ADDRESS) {
        userData[_user][_marketId].totalEthStaked = userData[_user][_marketId].totalEthStaked.add(_value);
      } else {
        userData[_user][_marketId].totalPlotStaked = userData[_user][_marketId].totalPlotStaked.add(_value);
      }
      if(!userData[_user][_marketId].marketsParticipatedFlag[msg.sender]) {
        userData[_user][_marketId].marketsParticipated.push(msg.sender);
        userData[_user][_marketId].marketsParticipatedFlag[msg.sender] = true;
      }
      emit PlacePrediction(_user, _value, _predictionPoints, _predictionAsset, _prediction, msg.sender,_leverage);
    }

    function ceil(uint256 a, uint256 m) internal pure returns (uint256) {
        return ((a + m - 1) / m) * m;
    }
}
