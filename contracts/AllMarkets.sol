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

// import "./SafeMath.sol";
// import "./external/proxy/OwnedUpgradeabilityProxy.sol";
// import "./interfaces/IMarketUtility.sol";
import "./external/govblocks-protocol/Governed.sol";
import "./interfaces/IToken.sol";
// import "./IERC20.sol";
// import "./interfaces/ITokenController.sol";
// import "./interfaces/IMarketRegistry.sol";

contract Market is Governed{
    // using SafeMath for *;

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
    // IMarketUtility constant marketUtility = IMarketUtility(0xFB2990f67cd035E1C62eEc9D98A66E817a830E40);

    // uint8[] constant roundOfToNearest = [25,1];
    uint constant totalOptions = 3;
    uint constant MAX_LEVERAGE = 5;
    uint constant ethCommissionPerc = 10; //with 2 decimals
    uint constant plotCommissionPerc = 5; //with 2 decimals
    // bytes32[] public constant marketCurrency = ["BTC/USD","ETH/USD"];
    
    mapping(uint => bool) internal lockedForDispute;
    mapping(uint =>address) internal incentiveToken;
    // uint internal ethAmountToPool;
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
        uint usedBalance;
        uint unusedBalance;
        uint totalPlotParticipated;
        uint[] marketsPredicted;
        mapping(uint=>bool) marketParticipated;
    }

    event MarketTypes(uint64 indexed predictionTime, uint64 optionRangePerc, bool status);
    event MarketCurrencies(uint256 indexed index, address feedAddress, bytes32 currencyName, bool status);

    MarketData[] public marketData;
    MarketSettleData public marketSettleData;

    mapping(address => mapping(uint=> UserData)) internal userData;

    mapping(uint =>mapping(uint=>option)) public optionsAvailable;
    mapping(address => UserGlobalPrediction) UserGlobalPredictionData;
    struct MarketTypeData {
      uint64 optionRangePerc;
      uint64 index;
    }

    struct MarketCurrency {
      bytes32 currencyName;
      address marketFeed;
      uint8 decimals;
    }

    MarketCurrency[] marketCurrencies;
    mapping(bytes32 => uint) marketCurrency;

    mapping(uint64 => MarketTypeData) marketType;
    uint64[] marketTypeArray;

    function addMarketCurrency(bytes32 _currencyName,  address _marketFeed, uint8 decimals) public onlyAuthorizedToGovern {
      marketCurrency[_currencyName] = marketCurrencies.length;
      marketCurrencies.push(MarketCurrency(_currencyName, _marketFeed, decimals));
      emit MarketCurrencies(marketCurrency[_currencyName], _marketFeed, _currencyName, true);
    }

    function addMarketType(uint64 _predictionTime, uint64 _optionRangePerc) public onlyAuthorizedToGovern {
      marketType[_predictionTime] = MarketTypeData(_optionRangePerc, uint64(marketTypeArray.length));
      marketTypeArray.push(_predictionTime);
      emit MarketTypes(_predictionTime, _optionRangePerc, true);
    }

    function removeMarketType(uint64 _predictionTime) public onlyAuthorizedToGovern {
      uint64 marketTypeIndex= marketType[_predictionTime].index;
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
    * @param _minValue The minimum value of neutral option range.
    * @param _maxValue The maximum value of neutral option range.
    */
    function initiate(uint32 _startTime, uint32 _predictionTime, uint64 _minValue, uint64 _maxValue) public payable {
      // OwnedUpgradeabilityProxy proxy =  OwnedUpgradeabilityProxy(address(uint160(address(this))));
      // require(msg.sender == proxy.proxyOwner(),"Sender is not proxy owner.");
      // require(marketData.startTime == 0, "Already initialized");
      // require(_startTime.add(_predictionTime) > now);
      marketData.push(MarketData(0,0,_startTime,_predictionTime,_minValue,_maxValue));
    
    }

    function  deposit(uint _amount) public returns(bool res)  {
      plt.transferFrom (msg.sender,address(this), _amount);
       UserGlobalPredictionData[msg.sender].unusedBalance  += _amount ;
    }

     function  withdraw() public returns(bool res)  {
       UserGlobalPredictionData[msg.sender].usedBalance  = 0 ;
      plt.transfer (msg.sender, UserGlobalPredictionData [msg.sender].usedBalance );
      
    }
    

    /**
    * @dev Place prediction on the available options of the market.
    * @param _asset The asset used by user during prediction whether it is plotToken address or in ether.
    * @param _predictionStake The amount staked by user at the time of prediction.
    * @param _prediction The option on which user placed prediction.
    * @param _leverage The leverage opted by user at the time of prediction.
    */
    function placePrediction(uint _marketId, address _asset, uint256 _predictionStake, uint256 _prediction,uint256 _leverage) public payable {
    //   require(!marketRegistry.marketCreationPaused() && _prediction <= totalOptions && _leverage <= MAX_LEVERAGE);
    //   require(now >= marketData.startTime && now <= marketExpireTime());
     
      uint256 _commissionStake;
        _commissionStake = _predictionStake * 1000 / 100000;
        plotCommissionAmount = plotCommissionAmount + _commissionStake ;
       UserGlobalPredictionData[msg.sender].usedBalance += _predictionStake - _commissionStake;
       UserGlobalPredictionData[msg.sender].unusedBalance -= _predictionStake;
       UserGlobalPredictionData[msg.sender].totalPlotParticipated += _predictionStake;
       UserGlobalPredictionData[msg.sender].marketsPredicted.push(_marketId);
       UserGlobalPredictionData[msg.sender].marketParticipated[_marketId]=true;
     


      // (uint predictionPoints, bool isMultiplierApplied) = calculatePredictionValue(_prediction, _commissionStake, _leverage, _asset);
      uint predictionPoints = optionsAvailable[_marketId][_prediction].priceFactor  * _predictionStake * 12 * 12;
      optionsAvailable [_marketId][_prediction].priceFactor = 10;
      
        userData[msg.sender][_marketId].multiplierApplied = true; 
      
    //   require(predictionPoints > 0);

      _storePredictionData(_marketId,_prediction, _commissionStake, _asset, _leverage, predictionPoints);
    //   marketRegistry.setUserGlobalPredictionData(msg.sender,_predictionStake, predictionPoints, _asset, _prediction, _leverage);
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
      userData[msg.sender][_marketId].predictionPoints[_prediction] = userData[msg.sender][_marketId].predictionPoints[_prediction]+(predictionPoints);
      userData[msg.sender][_marketId].assetStaked[_asset][_prediction] = userData[msg.sender][_marketId].assetStaked[_asset][_prediction]+(_predictionStake);
      userData[msg.sender][_marketId].LeverageAsset[_asset][_prediction] = userData[msg.sender][_marketId].LeverageAsset[_asset][_prediction]+(_predictionStake*(_leverage));
      optionsAvailable[_marketId][_prediction].predictionPoints = optionsAvailable[_prediction][_marketId].predictionPoints+(predictionPoints);
      optionsAvailable[_marketId][_prediction].assetStaked[_asset] = optionsAvailable[_prediction][_marketId].assetStaked[_asset]+(_predictionStake);
      optionsAvailable[_marketId][_prediction].assetLeveraged[_asset] = optionsAvailable[_prediction][_marketId].assetLeveraged[_asset]+(_predictionStake*(_leverage));
    }
}
