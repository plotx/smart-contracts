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
import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./external/govblocks-protocol/interfaces/IGovernance.sol";
import "./external/BasicMetaTransaction.sol";
import "./interfaces/IMarketUtility.sol";   
import "./interfaces/IToken.sol";
import "./interfaces/ITokenController.sol";
import "./interfaces/IMarketCreationRewards.sol";

contract IMaster {
    mapping(address => bool) public whitelistedSponsor;
    function dAppToken() public view returns(address);
    function getLatestAddress(bytes2 _module) public view returns(address);
}


contract Governed {

    address public masterAddress; // Name of the dApp, needs to be set by contracts inheriting this contract

    /// @dev modifier that allows only the authorized addresses to execute the function
    modifier onlyAuthorizedToGovern() {
        IMaster ms = IMaster(masterAddress);
        require(ms.getLatestAddress("GV") == msg.sender);
        _;
    }

}

contract AllMarkets is Governed, BasicMetaTransaction {
    using SafeMath32 for uint32;
    using SafeMath64 for uint64;
    using SafeMath128 for uint128;
    using SafeMath for uint;

    enum PredictionStatus {
      Live,
      InSettlement,
      Cooling,
      InDispute,
      Settled
    }

    event Deposited(address indexed user, uint256 amount, uint256 timeStamp);
    event Withdrawn(address indexed user, uint256 amount, uint256 timeStamp);
    event MarketTypes(uint256 indexed index, uint32 predictionTime, uint32 cooldownTime, uint32 optionRangePerc, bool status, uint32 minTimePassed);
    event MarketCurrencies(uint256 indexed index, address feedAddress, bytes32 currencyName, bool status);
    event MarketQuestion(uint256 indexed marketIndex, bytes32 currencyName, uint256 indexed predictionType, uint256 startTime, uint256 predictionTime, uint256 neutralMinValue, uint256 neutralMaxValue);
    event OptionPricingParams(uint256 _stakingFactorMinStake,uint256 _stakingFactorWeightage,uint256 _currentPriceWeightage,uint32 _minTimePassed);
    event MarketResult(uint256 indexed marketIndex, uint256 totalReward, uint256 winningOption, uint256 closeValue, uint256 roundId);
    event ReturnClaimed(address indexed user, uint256 amount);
    event PlacePrediction(address indexed user,uint256 value, uint256 predictionPoints, address predictionAsset,uint256 prediction,uint256 indexed marketIndex);
    event DisputeRaised(uint256 indexed marketIndex, address raisedBy, uint256 proposalId, uint256 proposedValue);
    event DisputeResolved(uint256 indexed marketIndex, bool status);
    event ReferralLog(address indexed referrer, address indexed referee, uint256 referredOn);

    struct PredictionData {
      uint64 predictionPoints;
      uint64 amountStaked;
    }
    
    struct UserMarketData {
      bool claimedReward;
      bool predictedWithBlot;
      bool multiplierApplied;
      mapping(uint => PredictionData) predictionData;
    }

    struct UserData {
      uint128 totalStaked;
      uint128 lastClaimedIndex;
      uint[] marketsParticipated;
      uint unusedBalance;
      uint referrerFee;
      uint refereeFee;
      address referrer;
      mapping(uint => UserMarketData) userMarketData;
    }


    struct MarketBasicData {
      uint32 Mtype;
      uint32 currency;
      uint32 startTime;
      uint32 predictionTime;
      uint64 neutralMinValue;
      uint64 neutralMaxValue;
    }

    struct MarketDataExtended {
      uint32 WinningOption;
      uint32 settleTime;
      address disputeRaisedBy;
      uint64 disputeStakeAmount;
      uint incentiveToDistribute;
      uint rewardToDistribute;
      PredictionStatus predictionStatus;
    }

    struct MarketTypeData {
      uint32 predictionTime;
      uint32 optionRangePerc;
      uint32 cooldownTime;
      bool paused;
      uint32 minTimePassed;
    }

    struct MarketCurrency {
      bytes32 currencyName;
      address marketFeed;
      uint8 decimals;
      uint8 roundOfToNearest;
    }

    struct MarketCreationData {
      uint32 initialStartTime;
      uint64 latestMarket;
      uint64 penultimateMarket;
      bool paused;
    }

    struct PricingData {
      uint256 stakingFactorMinStake;
      uint256 stakingFactorWeightage;
      uint256 currentPriceWeightage;
      uint32 minTimePassed;
    }

    uint64 public cummulativeFeePercent;
    uint64 public daoCommissionPercent;
    uint64 public referrerFeePercent;
    uint64 public refereeFeePercent;
    mapping (address => uint256) public relayerFeeEarned;
    mapping(uint256 => PricingData) internal marketPricingData;
    

    address internal plotToken;

    address internal predictionToken;

    ITokenController internal tokenController;
    IMarketUtility internal marketUtility;
    IGovernance internal governance;
    IMarketCreationRewards internal marketCreationRewards;

    uint internal totalOptions;
    uint internal predictionDecimalMultiplier;
    uint internal defaultMaxRecords;

    bool public marketCreationPaused;
    MarketCurrency[] internal marketCurrencies;
    MarketTypeData[] internal marketTypeArray;
    mapping(bytes32 => uint) internal marketCurrency;

    mapping(uint64 => uint32) internal marketType;
    mapping(uint256 => mapping(uint256 => MarketCreationData)) internal marketCreationData;
    mapping(uint256 => uint256) public marketTotalTokenStaked;

    MarketBasicData[] internal marketBasicData;

    mapping(uint256 => MarketDataExtended) internal marketDataExtended;
    mapping(address => UserData) internal userData;

    mapping(uint =>mapping(uint=>PredictionData)) internal marketOptionsAvailable;
    mapping(uint256 => uint256) internal disputeProposalId;

    function setReferrer(address _referrer, address _referee) external {
      require(marketUtility.isAuthorized(msg.sender));
      require(userData[_referee].totalStaked == 0);
      require(userData[_referee].referrer == address(0));
      userData[_referee].referrer = _referrer;
      emit ReferralLog(_referrer, _referee, now);
    }

    /**
    * @dev Get fees earned by participating in the referral program
    * @param _user Address of the user
    * @return _referrerFee Fees earned by referring other users
    * @return _refereeFee Fees earned if referred by some one
    */
    function getReferralFees(address _user) external view returns(uint256 _referrerFee, uint256 _refereeFee) {
      return (userData[_user].referrerFee, userData[_user].refereeFee);
    }

    function claimReferralFee(address _user) external {
      uint256 _referrerFee = userData[_user].referrerFee;
      delete userData[_user].referrerFee;
      uint256 _refereeFee = userData[_user].refereeFee;
      delete userData[_user].refereeFee;
      _transferAsset(predictionToken, _user, (_refereeFee.add(_referrerFee)).mul(10**predictionDecimalMultiplier));
    }

    /**
    * @dev Add new market currency.
    * @param _currencyName name of the currency
    * @param _marketFeed Price Feed address of the currency
    * @param decimals Decimals of the price provided by feed address
    * @param roundOfToNearest Round of the price to nearest number
    * @param _marketStartTime Start time of initial markets
    */
    function addMarketCurrency(bytes32 _currencyName, address _marketFeed, uint8 decimals, uint8 roundOfToNearest, uint32 _marketStartTime) external onlyAuthorizedToGovern {
      require((marketCurrencies[marketCurrency[_currencyName]].currencyName != _currencyName));
      require(decimals != 0);
      require(roundOfToNearest != 0);
      require(_marketFeed != address(0));
      _addMarketCurrency(_currencyName, _marketFeed, decimals, roundOfToNearest, _marketStartTime);
    }

    function _addMarketCurrency(bytes32 _currencyName, address _marketFeed, uint8 decimals, uint8 roundOfToNearest, uint32 _marketStartTime) internal {
      uint32 index = uint32(marketCurrencies.length);
      marketCurrency[_currencyName] = index;
      marketCurrencies.push(MarketCurrency(_currencyName, _marketFeed, decimals, roundOfToNearest));
      emit MarketCurrencies(index, _marketFeed, _currencyName, true);      
      for(uint32 i = 0;i < marketTypeArray.length; i++) {
          marketCreationData[i][index].initialStartTime = _marketStartTime;
      }
    }

    /**
    * @dev Add new market type.
    * @param _predictionTime The time duration of market.
    * @param _optionRangePerc Option range percent of neutral min, max options (raised by 2 decimals)
    * @param _marketCooldownTime Cool down time of the market after market is settled
    */
    function addMarketType(uint32 _predictionTime, uint32 _optionRangePerc, uint32 _marketStartTime, uint32 _marketCooldownTime, uint32 _minTimePassed) external onlyAuthorizedToGovern {
      require(marketTypeArray[marketType[_predictionTime]].predictionTime != _predictionTime);
      require(_predictionTime > 0);
      require(_optionRangePerc > 0);
      require(_marketCooldownTime > 0);
      require(_minTimePassed > 0);
      uint32 index = uint32(marketTypeArray.length);
      _addMarketType(_predictionTime, _optionRangePerc, _marketCooldownTime, _minTimePassed);
      for(uint32 i = 0;i < marketCurrencies.length; i++) {
          marketCreationData[index][i].initialStartTime = _marketStartTime;
      }
    }

    function _addMarketType(uint32 _predictionTime, uint32 _optionRangePerc, uint32 _marketCooldownTime, uint32 _minTimePassed) internal {
      uint32 index = uint32(marketTypeArray.length);
      marketType[_predictionTime] = index;
      marketTypeArray.push(MarketTypeData(_predictionTime, _optionRangePerc, _marketCooldownTime, false, _minTimePassed));
      emit MarketTypes(index, _predictionTime, _marketCooldownTime, _optionRangePerc, true, _minTimePassed);
    }

    // function updateMarketType(uint32 _marketType, uint32 _optionRangePerc, uint32 _marketCooldownTime) external onlyAuthorizedToGovern {
    //   require(_optionRangePerc > 0);
    //   require(_marketCooldownTime > 0);
    //   marketTypeArray[_marketType].optionRangePerc = _optionRangePerc;
    //   marketTypeArray[_marketType].cooldownTime = _marketCooldownTime;
    //   emit MarketTypes(_marketType, _predictionTime, _marketCooldownTime, _optionRangePerc, true);
    // }

    /**
     * @dev Changes the master address and update it's instance
     */
    function setMasterAddress() public {
      OwnedUpgradeabilityProxy proxy =  OwnedUpgradeabilityProxy(address(uint160(address(this))));
      require(msg.sender == proxy.proxyOwner());
      IMaster ms = IMaster(msg.sender);
      masterAddress = msg.sender;
      plotToken = ms.dAppToken();
      predictionToken = ms.dAppToken();
      governance = IGovernance(ms.getLatestAddress("GV"));
      tokenController = ITokenController(ms.getLatestAddress("TC"));
    }

    /**
    * @dev Start the initial market and set initial variables.
    */
    function addInitialMarketTypesAndStart(uint32 _marketStartTime, address _ethFeed, address _btcFeed) external {
      require(marketTypeArray.length == 0);
      
      IMaster ms = IMaster(masterAddress);
      marketCreationRewards = IMarketCreationRewards(ms.getLatestAddress("MC"));
      marketUtility = IMarketUtility(ms.getLatestAddress("MU"));
      require(marketUtility.isAuthorized(msg.sender));
      
      totalOptions = 3;
      predictionDecimalMultiplier = 10;
      defaultMaxRecords = 20;
      cummulativeFeePercent = 200;
      daoCommissionPercent = 1000;
      refereeFeePercent = 500;
      referrerFeePercent = 500;

      
      _addMarketType(4 hours, 100, 1 hours, 40 minutes);
      _addMarketType(24 hours, 200, 6 hours, 4 hours);
      _addMarketType(168 hours, 500, 8 hours, 28 hours);

      _addMarketCurrency("ETH/USD", _ethFeed, 8, 1, _marketStartTime);
      _addMarketCurrency("BTC/USD", _btcFeed, 8, 25, _marketStartTime);

      marketBasicData.push(MarketBasicData(0,0,0, 0,0,0));
      for(uint32 i = 0;i < marketTypeArray.length; i++) {
          createMarket(0, i);
          createMarket(1, i);
      }
    }

    /**
    * @dev Create the market.
    * @param _marketCurrencyIndex The index of market currency feed
    * @param _marketTypeIndex The time duration of market.
    */
    function createMarket(uint32 _marketCurrencyIndex,uint32 _marketTypeIndex) public {
      require(!marketCreationPaused && !marketTypeArray[_marketTypeIndex].paused);
      _closePreviousMarket( _marketTypeIndex, _marketCurrencyIndex);
      // marketUtility.update();
      uint32 _startTime = calculateStartTimeForMarket(_marketCurrencyIndex, _marketTypeIndex);
      (uint64 _minValue, uint64 _maxValue) = marketUtility.calculateOptionRange(marketTypeArray[_marketTypeIndex].optionRangePerc, marketCurrencies[_marketCurrencyIndex].decimals, marketCurrencies[_marketCurrencyIndex].roundOfToNearest, marketCurrencies[_marketCurrencyIndex].marketFeed);
      uint64 _marketIndex = uint64(marketBasicData.length);
      marketBasicData.push(MarketBasicData(_marketTypeIndex,_marketCurrencyIndex,_startTime, marketTypeArray[_marketTypeIndex].predictionTime,_minValue,_maxValue));
      (marketCreationData[_marketTypeIndex][_marketCurrencyIndex].penultimateMarket, marketCreationData[_marketTypeIndex][_marketCurrencyIndex].latestMarket) =
       (marketCreationData[_marketTypeIndex][_marketCurrencyIndex].latestMarket, _marketIndex);
      marketPricingData[_marketIndex] = PricingData(marketUtility.stakingFactorMinStake(), marketUtility.stakingFactorWeightage(), marketUtility.currentPriceWeightage(), marketTypeArray[_marketTypeIndex].minTimePassed);
      emit MarketQuestion(_marketIndex, marketCurrencies[_marketCurrencyIndex].currencyName, _marketTypeIndex, _startTime, marketTypeArray[_marketTypeIndex].predictionTime, _minValue, _maxValue);
      emit OptionPricingParams(marketPricingData[_marketIndex].stakingFactorMinStake,marketPricingData[_marketIndex].stakingFactorWeightage,marketPricingData[_marketIndex].currentPriceWeightage,marketPricingData[_marketIndex].minTimePassed);
      marketCreationRewards.calculateMarketCreationIncentive(_msgSender(), _marketIndex);
    }

    /**
    * @dev Calculate start time for next market of provided currency and market type indexes
    */
    function calculateStartTimeForMarket(uint32 _marketCurrencyIndex, uint32 _marketType) public view returns(uint32 _marketStartTime) {
      _marketStartTime = marketCreationData[_marketType][_marketCurrencyIndex].initialStartTime;
      uint predictionTime = marketTypeArray[_marketType].predictionTime;
      if(now > (predictionTime) + (_marketStartTime)) {
        uint noOfMarketsCycles = ((now) - (_marketStartTime)) / (predictionTime);
       _marketStartTime = uint32((noOfMarketsCycles * (predictionTime)) + (_marketStartTime));
      }
    }

    /**
    * @dev Transfer the _asset to specified address.
    * @param _recipient The address to transfer the asset of
    * @param _amount The amount which is transfer.
    */
    function _transferAsset(address _asset, address _recipient, uint256 _amount) internal {
      if(_amount > 0) { 
          require(IToken(_asset).transfer(_recipient, _amount));
      }
    }

    /**
    * @dev Internal function to settle the previous market 
    */
    function _closePreviousMarket(uint64 _marketTypeIndex, uint64 _marketCurrencyIndex) internal {
      uint64 currentMarket = marketCreationData[_marketTypeIndex][_marketCurrencyIndex].latestMarket;
      if(currentMarket != 0) {
        require(marketStatus(currentMarket) >= PredictionStatus.InSettlement);
        uint64 penultimateMarket = marketCreationData[_marketTypeIndex][_marketCurrencyIndex].penultimateMarket;
        if(penultimateMarket > 0 && now >= marketSettleTime(penultimateMarket)) {
          _settleMarket(penultimateMarket);
        }
      }
    }

    /**
    * @dev Get market settle time
    * @return the time at which the market result will be declared
    */
    function marketSettleTime(uint256 _marketId) public view returns(uint32) {
      if(marketDataExtended[_marketId].settleTime > 0) {
        return marketDataExtended[_marketId].settleTime;
      }
      return marketBasicData[_marketId].startTime + (marketBasicData[_marketId].predictionTime * 2);
    }

    /**
    * @dev Gets the status of market.
    * @return PredictionStatus representing the status of market.
    */
    function marketStatus(uint256 _marketId) public view returns(PredictionStatus){
      if(marketDataExtended[_marketId].predictionStatus == PredictionStatus.Live && now >= marketExpireTime(_marketId)) {
        return PredictionStatus.InSettlement;
      } else if(marketDataExtended[_marketId].predictionStatus == PredictionStatus.Settled && now <= marketCoolDownTime(_marketId)) {
        return PredictionStatus.Cooling;
      }
      return marketDataExtended[_marketId].predictionStatus;
    }

    /**
    * @dev Get market cooldown time
    * @return the time upto which user can raise the dispute after the market is settled
    */
    function marketCoolDownTime(uint256 _marketId) public view returns(uint256) {
      return (marketSettleTime(_marketId) + marketTypeArray[marketBasicData[_marketId].Mtype].cooldownTime);
    }

    /**
    * @dev Updates Flag to pause creation of market.
    */
    function pauseMarketCreation() external onlyAuthorizedToGovern {
      require(!marketCreationPaused);
      marketCreationPaused = true;
    }

    /**
    * @dev Updates Flag to resume creation of market.
    */
    function resumeMarketCreation() external onlyAuthorizedToGovern {
      require(marketCreationPaused);
      marketCreationPaused = false;
    }

    /**
    * @dev Set the flag to pause/resume market creation of particular market type
    */
    function toggleMarketCreationType(uint64 _marketTypeIndex, bool _flag) external onlyAuthorizedToGovern {
      require(marketTypeArray[_marketTypeIndex].paused != _flag);
      marketTypeArray[_marketTypeIndex].paused = _flag;
    }

    /**
    * @dev Function to deposit prediction token for participation in markets
    * @param _amount Amount of prediction token to deposit
    */
    function _deposit(uint _amount) internal {
      address payable _msgSender = _msgSender();
      address _predictionToken = predictionToken;
      IToken(_predictionToken).transferFrom(_msgSender,address(this), _amount);
      userData[_msgSender].unusedBalance = userData[_msgSender].unusedBalance.add(_amount);
      emit Deposited(_msgSender, _amount, now);
    }

    /**
    * @dev Withdraw provided amount of deposited and available prediction token
    * @param _token Amount of prediction token to withdraw
    * @param _maxRecords Maximum number of records to check
    */
    function withdraw(uint _token, uint _maxRecords) public {
      (uint _tokenLeft, uint _tokenReward) = getUserUnusedBalance(_msgSender());
      _tokenLeft = _tokenLeft.add(_tokenReward);
      _withdraw(_token, _maxRecords, _tokenLeft);
    }

    /**
    * @dev Internal function to withdraw deposited and available assets
    * @param _token Amount of prediction token to withdraw
    * @param _maxRecords Maximum number of records to check
    * @param _tokenLeft Amount of prediction token left unused for user
    */
    function _withdraw(uint _token, uint _maxRecords, uint _tokenLeft) internal {
      address payable _msgSender = _msgSender();
      withdrawReward(_maxRecords);
      address _predictionToken = predictionToken;
      userData[_msgSender].unusedBalance = _tokenLeft.sub(_token);
      require(_token > 0);
      _transferAsset(predictionToken, _msgSender, _token);
      emit Withdrawn(_msgSender, _token, now);
    }

    /**
    * @dev Get market expire time
    * @return the time upto which user can place predictions in market
    */
    function marketExpireTime(uint _marketId) internal view returns(uint256) {
      return marketBasicData[_marketId].startTime + (marketBasicData[_marketId].predictionTime);
    }

    /**
    * @dev Deposit and Place prediction on the available options of the market.
    * @param _marketId Index of the market
    * @param _tokenDeposit prediction token amount to deposit
    * @param _asset The asset used by user during prediction whether it is prediction token address or in Bonus token.
    * @param _predictionStake The amount staked by user at the time of prediction.
    * @param _prediction The option on which user placed prediction.
    * _tokenDeposit should be passed with 18 decimals
    * _predictioStake should be passed with 8 decimals, reduced it to 8 decimals to reduce the storage space of prediction data
    */
    function depositAndPlacePrediction(uint _tokenDeposit, uint _marketId, address _asset, uint64 _predictionStake, uint256 _prediction) external {
      if(_tokenDeposit > 0) {
        _deposit(_tokenDeposit);
      }
      _placePrediction(_marketId, _asset, _predictionStake, _prediction);
    }

    /**
    * @dev Place prediction on the available options of the market.
    * @param _marketId Index of the market
    * @param _asset The asset used by user during prediction whether it is prediction token address or in Bonus token.
    * @param _predictionStake The amount staked by user at the time of prediction.
    * @param _prediction The option on which user placed prediction.
    * _predictioStake should be passed with 8 decimals, reduced it to 8 decimals to reduce the storage space of prediction data
    */
    function _placePrediction(uint _marketId, address _asset, uint64 _predictionStake, uint256 _prediction) internal {
      address payable _msgSender = _msgSender();
      require(!marketCreationPaused && _prediction <= totalOptions && _prediction >0);
      require(now >= marketBasicData[_marketId].startTime && now <= marketExpireTime(_marketId));
      uint64 _predictionStakePostDeduction = _predictionStake;
      uint decimalMultiplier = 10**predictionDecimalMultiplier;
      if(_asset == predictionToken) {
        uint256 unusedBalance = userData[_msgSender].unusedBalance;
        unusedBalance = unusedBalance.div(decimalMultiplier);
        if(_predictionStake > unusedBalance)
        {
          withdrawReward(defaultMaxRecords);
          unusedBalance = userData[_msgSender].unusedBalance;
          unusedBalance = unusedBalance.div(decimalMultiplier);
        }
        require(_predictionStake <= unusedBalance);
        userData[_msgSender].unusedBalance = (unusedBalance.sub(_predictionStake)).mul(decimalMultiplier);
      } else {
        require(_asset == tokenController.bLOTToken());
        require(!userData[_msgSender].userMarketData[_marketId].predictedWithBlot);
        userData[_msgSender].userMarketData[_marketId].predictedWithBlot = true;
        tokenController.swapBLOT(_msgSender, address(this), (decimalMultiplier).mul(_predictionStake));
        _asset = plotToken;
      }
      _predictionStakePostDeduction = _deductRelayerFee(_predictionStake, _asset, _msgSender);
      
      uint64 predictionPoints = _calculatePredictionPointsAndMultiplier(_msgSender, _marketId, _prediction, _asset, _predictionStakePostDeduction);
      require(predictionPoints > 0);

      _storePredictionData(_marketId, _prediction, _predictionStakePostDeduction, _asset, predictionPoints);
      emit PlacePrediction(_msgSender, _predictionStake, predictionPoints, _asset, _prediction, _marketId);
    }

    function _deductRelayerFee(uint64 _amount, address _asset, address _msgSender) internal returns(uint64 _amountPostFee){
      uint64 _fee;
      address _relayer;
      if(_msgSender != tx.origin) {
        _relayer = tx.origin;
      } else {
        _relayer = _msgSender;
      }
      _fee = _calculateAmulBdivC(cummulativeFeePercent, _amount, 10000);
      _amountPostFee = _amount.sub(_fee);
      uint64 _referrerFee;
      uint64 _refereeFee;
      uint64 _daoCommission = _fee.mul(daoCommissionPercent).div(10000);
      address _referrer = userData[_msgSender].referrer;
      if(_referrer != address(0)) {
        //Commission for referee
        _refereeFee = _calculateAmulBdivC(refereeFeePercent, _fee, 10000);
        userData[_msgSender].refereeFee = userData[_msgSender].refereeFee.add(_refereeFee);
        //Commission for referrer
        _referrerFee = _calculateAmulBdivC(referrerFeePercent, _fee, 10000);
        userData[_referrer].referrerFee = userData[_referrer].referrerFee.add(_referrerFee);
      }
      _fee = _fee.sub(_daoCommission).sub(_referrerFee).sub(_refereeFee);
      relayerFeeEarned[_relayer] = relayerFeeEarned[_relayer].add(_fee);
      _transferAsset(predictionToken, address(marketCreationRewards), (10**predictionDecimalMultiplier).mul(_daoCommission));
    }

    /**
    * @dev Internal function to calculate prediction points  and multiplier
    */
    function _calculatePredictionPointsAndMultiplier(address _user, uint256 _marketId, uint256 _prediction, address _asset, uint64 _stake) internal returns(uint64 predictionPoints){
      bool isMultiplierApplied;
      (predictionPoints, isMultiplierApplied) = marketUtility.calculatePredictionPoints(_marketId, _prediction, _user, userData[_user].userMarketData[_marketId].multiplierApplied, _stake);
      if(isMultiplierApplied) {
        userData[_user].userMarketData[_marketId].multiplierApplied = true; 
      }
    }

    /**
    * @dev Settle the market, setting the winning option
    */
    function settleMarket(uint256 _marketId) external {
      _settleMarket(_marketId);
    }

    /**
    * @dev Settle the market explicitly by manually passing the price of market currency
    * @param _marketId Index of market
    * @param _marketSettleValue The current price of market currency.
    */
    function postMarketResult(uint256 _marketId, uint256 _marketSettleValue) external {
      require(marketUtility.isAuthorized(msg.sender));
      if(marketStatus(_marketId) == PredictionStatus.InSettlement) {
        _postResult(_marketSettleValue, 0, _marketId);
      }
    }

    /**
    * @dev Settle the market, setting the winning option
    */
    function _settleMarket(uint256 _marketId) internal {
      if(marketStatus(_marketId) == PredictionStatus.InSettlement) {
        (uint256 _value, uint256 _roundId) = marketUtility.getSettlemetPrice(marketCurrencies[marketBasicData[_marketId].currency].marketFeed, marketSettleTime(_marketId));
        _postResult(_value, _roundId, _marketId);
      }
    }

    /**
    * @dev Calculate the result of market.
    * @param _value The current price of market currency.
    * @param _roundId Chainlink round Id
    * @param _marketId Index of market
    */
    function _postResult(uint256 _value, uint256 _roundId, uint256 _marketId) internal {
      require(now >= marketSettleTime(_marketId));
      require(_value > 0);
      if(marketDataExtended[_marketId].predictionStatus != PredictionStatus.InDispute) {
        marketDataExtended[_marketId].settleTime = uint32(now);
      } else {
        delete marketDataExtended[_marketId].settleTime;
      }
      _setMarketStatus(_marketId, PredictionStatus.Settled);
      uint32 _winningOption; 
      if(_value < marketBasicData[_marketId].neutralMinValue) {
        _winningOption = 1;
      } else if(_value > marketBasicData[_marketId].neutralMaxValue) {
        _winningOption = 3;
      } else {
        _winningOption = 2;
      }
      marketDataExtended[_marketId].WinningOption = _winningOption;
      uint64 marketCreatorIncentive;
      (uint64 totalReward, uint64 tokenParticipation) = _calculateRewardTally(_marketId, _winningOption);
      (uint64 _rewardPoolShare, bool _thresholdReached) = marketCreationRewards.getMarketCreatorRPoolShareParams(_marketId, tokenParticipation);
      if(_thresholdReached) {
        if(
          marketOptionsAvailable[_marketId][_winningOption].predictionPoints == 0
        ){
          marketCreatorIncentive = _calculateAmulBdivC(_rewardPoolShare, tokenParticipation, 10000);
          tokenParticipation = tokenParticipation.sub(marketCreatorIncentive);
        } else {
          marketCreatorIncentive = _calculateAmulBdivC(_rewardPoolShare, totalReward, 10000);
          totalReward = totalReward.sub(marketCreatorIncentive);
          tokenParticipation = 0;
        }
      } else {
        if(
          marketOptionsAvailable[_marketId][_winningOption].predictionPoints > 0
        ){
          tokenParticipation = 0;
        }
      }
      marketDataExtended[_marketId].rewardToDistribute = totalReward;
      _transferAsset(predictionToken, address(marketCreationRewards), (10**predictionDecimalMultiplier).mul(marketCreatorIncentive.add(tokenParticipation)));
      marketCreationRewards.depositMarketRewardPoolShare(_marketId, (10**predictionDecimalMultiplier).mul(marketCreatorIncentive), tokenParticipation);
      emit MarketResult(_marketId, marketDataExtended[_marketId].rewardToDistribute, _winningOption, _value, _roundId);
    }

    /**
    * @dev Internal function to calculate the reward.
    * @param _marketId Index of market
    * @param _winningOption WinningOption of market
    */
    function _calculateRewardTally(uint256 _marketId, uint256 _winningOption) internal view returns(uint64 totalReward, uint64 tokenParticipation){
      for(uint i=1;i <= totalOptions;i++){
        uint64 _tokenStakedOnOption = marketOptionsAvailable[_marketId][i].amountStaked;
        tokenParticipation = tokenParticipation.add(_tokenStakedOnOption);
        if(i != _winningOption) {
          totalReward = totalReward.add(_tokenStakedOnOption);
        }
      }

      /* Steps followed to calculate commission amount
      * We were storing users particpation amount post dedcuting commission amount, in userParticipationAmount
      * userParticipationAmount = Actual amount passed by user - commissionAmount
      * actualAmountUserPassed = (100 * userParticipationAmount)/(100-commissionPercent)
      * commissionAmount = actualAmountUserPassed - userParticipationAmount
      */
      // commission = _calculateAmulBdivC(10000, tokenParticipation, 10000 - marketDataExtended[_marketId].commission) - tokenParticipation;
    }

    /**
    * @dev Claim fees earned by the relayer address
    */
    function claimRelayerRewards() external {
      uint _decimalMultiplier = 10**predictionDecimalMultiplier;
      address _relayer = msg.sender;
      uint256 _fee = (_decimalMultiplier).mul(relayerFeeEarned[_relayer]);
      delete relayerFeeEarned[_relayer];
      _transferAsset(predictionToken, _relayer, _fee);
    }

    /**
    * @dev Claim the pending return of the market.
    * @param maxRecords Maximum number of records to claim reward for
    */
    function withdrawReward(uint256 maxRecords) internal {
      address payable _msgSender = _msgSender();
      uint256 i;
      uint len = userData[_msgSender].marketsParticipated.length;
      uint lastClaimed = len;
      uint count;
      uint tokenReward =0 ;
      require(!marketCreationPaused);
      for(i = userData[_msgSender].lastClaimedIndex; i < len && count < maxRecords; i++) {
        (uint claimed, uint tempTokenReward) = claimReturn(_msgSender, userData[_msgSender].marketsParticipated[i]);
        if(claimed > 0) {
          delete userData[_msgSender].marketsParticipated[i];
          tokenReward = tokenReward.add(tempTokenReward);
          count++;
        } else {
          if(lastClaimed == len) {
            lastClaimed = i;
          }
        }
      }
      if(lastClaimed == len) {
        lastClaimed = i;
      }
      emit ReturnClaimed(_msgSender, tokenReward);
      userData[_msgSender].unusedBalance = userData[_msgSender].unusedBalance.add(tokenReward.mul(10**predictionDecimalMultiplier));
      userData[_msgSender].lastClaimedIndex = uint128(lastClaimed);
    }

    /**
    * @dev FUnction to return users unused deposited balance including the return earned in markets
    * @param _user Address of user
    * return prediction token Unused in deposit
    * return prediction token Return from market
    */
    function getUserUnusedBalance(address _user) public view returns(uint256, uint256){
      uint tokenReward;
      uint decimalMultiplier = 10**predictionDecimalMultiplier;
      uint len = userData[_user].marketsParticipated.length;
      for(uint i = userData[_user].lastClaimedIndex; i < len; i++) {
        tokenReward = tokenReward.add(getReturn(_user, userData[_user].marketsParticipated[i]));
      }
      return (userData[_user].unusedBalance, tokenReward.mul(decimalMultiplier));
    }

    /**
    * @dev Gets number of positions user got in prediction
    * @param _user Address of user
    * @param _marketId Index of market
    * @param _option Option Id
    * return Number of positions user got in prediction
    */
    function getUserPredictionPoints(address _user, uint256 _marketId, uint256 _option) external view returns(uint64) {
      return userData[_user].userMarketData[_marketId].predictionData[_option].predictionPoints;
    }

    /**
    * @dev Gets the market data.
    * @return _marketCurrency returns the currency name of the market.
    * @return neutralMinValue Neutral min value deciding the option ranges of market
    * @return neutralMaxValue Neutral max value deciding the option ranges of market
    * @return _optionPrice uint[] memory representing the option price of each option ranges of the market.
    * @return _tokenStaked uint[] memory representing the prediction token staked on each option ranges of the market.
    * @return _predictionTime uint representing the type of market.
    * @return _expireTime uint representing the time at which market closes for prediction
    * @return _predictionStatus uint representing the status of the market.
    */
    function getMarketData(uint256 _marketId) external view returns
       (bytes32 _marketCurrency,uint neutralMinValue,uint neutralMaxValue, uint[] memory _tokenStaked,uint _predictionTime,uint _expireTime, PredictionStatus _predictionStatus){
        _marketCurrency = marketCurrencies[marketBasicData[_marketId].currency].currencyName;
        _predictionTime = marketBasicData[_marketId].predictionTime;
        _expireTime =marketExpireTime(_marketId);
        _predictionStatus = marketStatus(_marketId);
        neutralMinValue = marketBasicData[_marketId].neutralMinValue;
        neutralMaxValue = marketBasicData[_marketId].neutralMaxValue;
        
        _tokenStaked = new uint[](totalOptions);
        for (uint i = 0; i < totalOptions; i++) {
          _tokenStaked[i] = marketOptionsAvailable[_marketId][i+1].amountStaked;
       }
    }

    /**
    * @dev Claim the return amount of the specified address.
    * @param _user User address
    * @param _marketId Index of market
    * @return Flag, if 0:cannot claim, 1: Already Claimed, 2: Claimed; Return in prediction token
    */
    function claimReturn(address payable _user, uint _marketId) internal returns(uint256, uint256) {

      if(marketStatus(_marketId) != PredictionStatus.Settled) {
        return (0, 0);
      }
      if(userData[_user].userMarketData[_marketId].claimedReward) {
        return (1, 0);
      }
      userData[_user].userMarketData[_marketId].claimedReward = true;
      return (2, getReturn(_user, _marketId));
    }

    /** 
    * @dev Gets the return amount of the specified address.
    * @param _user The address to specify the return of
    * @param _marketId Index of market
    * @return returnAmount uint[] memory representing the return amount.
    * @return incentive uint[] memory representing the amount incentive.
    * @return _incentiveTokens address[] memory representing the incentive tokens.
    */
    function getReturn(address _user, uint _marketId) public view returns (uint returnAmount){
      if(marketStatus(_marketId) != PredictionStatus.Settled || getTotalPredictionPoints(_marketId) == 0) {
       return (returnAmount);
      }
      uint256 _winningOption = marketDataExtended[_marketId].WinningOption;
      returnAmount = userData[_user].userMarketData[_marketId].predictionData[_winningOption].amountStaked;
      uint256 userPredictionPointsOnWinngOption = userData[_user].userMarketData[_marketId].predictionData[_winningOption].predictionPoints;
      if(userPredictionPointsOnWinngOption > 0) {
        returnAmount = _addUserReward(_marketId, returnAmount, _winningOption, userPredictionPointsOnWinngOption);
      }
      return returnAmount;
    }

    /**
    * @dev Adds the reward in the total return of the specified address.
    * @param returnAmount The return amount.
    * @return uint[] memory representing the return amount after adding reward.
    */
    function _addUserReward(uint256 _marketId, uint returnAmount, uint256 _winningOption, uint256 _userPredictionPointsOnWinngOption) internal view returns(uint){
        return returnAmount.add(
            _userPredictionPointsOnWinngOption.mul(marketDataExtended[_marketId].rewardToDistribute).div(marketOptionsAvailable[_marketId][_winningOption].predictionPoints)
          );
    }

    /**
    * @dev Basic function to perform mathematical operation of (`_a` * `_b` / `_c`)
    * @param _a value of variable a
    * @param _b value of variable b
    * @param _c value of variable c
    */
    function _calculateAmulBdivC(uint64 _a, uint64 _b, uint64 _c) internal pure returns(uint64) {
      return _a.mul(_b).div(_c);
    }

    /**
    * @dev Returns total assets staked in market by users
    * @param _marketId Index of market
    * @return tokenStaked Total prediction token staked on market
    */
    function getTotalAssetsStaked(uint _marketId) public view returns(uint256 tokenStaked) {
      for(uint256 i = 1; i<= totalOptions;i++) {
        tokenStaked = tokenStaked.add(marketOptionsAvailable[_marketId][i].amountStaked);
      }
    }

    /**
    * @dev Returns total assets staked in market in PLOT value
    * @param _marketId Index of market
    * @return tokenStaked Total prediction token staked on market value in PLOT
    */
    function getTotalStakedWorthInPLOT(uint256 _marketId) public view returns(uint256 _tokenStakedWorth) {
      uint256 _conversionRate = marketUtility.conversionRate(predictionToken);
      return (getTotalAssetsStaked(_marketId)).mul(_conversionRate).mul(10**predictionDecimalMultiplier);
    }

    /**
    * @dev Returns total prediction points allocated to users
    * @param _marketId Index of market
    * @return predictionPoints total prediction points allocated to users
    */
    function getTotalPredictionPoints(uint _marketId) public view returns(uint64 predictionPoints) {
      for(uint256 i = 1; i<= totalOptions;i++) {
        predictionPoints = predictionPoints.add(marketOptionsAvailable[_marketId][i].predictionPoints);
      }
    }

    /**
    * @dev Stores the prediction data.
    * @param _prediction The option on which user place prediction.
    * @param _predictionStake The amount staked by user at the time of prediction.
    * @param _asset The asset used by user during prediction.
    * @param predictionPoints The positions user got during prediction.
    */
    function _storePredictionData(uint _marketId, uint _prediction, uint64 _predictionStake, address _asset, uint64 predictionPoints) internal {
      address payable _msgSender = _msgSender();
      if(!_hasUserParticipated(_marketId, _msgSender)) {
        userData[_msgSender].marketsParticipated.push(_marketId);
      }
      userData[_msgSender].userMarketData[_marketId].predictionData[_prediction].predictionPoints = userData[_msgSender].userMarketData[_marketId].predictionData[_prediction].predictionPoints.add(predictionPoints);
      marketOptionsAvailable[_marketId][_prediction].predictionPoints = marketOptionsAvailable[_marketId][_prediction].predictionPoints.add(predictionPoints);
      
      userData[_msgSender].userMarketData[_marketId].predictionData[_prediction].amountStaked = userData[_msgSender].userMarketData[_marketId].predictionData[_prediction].amountStaked.add(_predictionStake);
      marketOptionsAvailable[_marketId][_prediction].amountStaked = marketOptionsAvailable[_marketId][_prediction].amountStaked.add(_predictionStake);
      userData[_msgSender].totalStaked = userData[_msgSender].totalStaked.add(_predictionStake);
      marketTotalTokenStaked[_marketId] = marketTotalTokenStaked[_marketId].add(_predictionStake);
      
    }

    /**
    * @dev Function to check if user had participated in given market
    * @param _marketId Index of market
    * @param _user Address of user
    */
    function _hasUserParticipated(uint256 _marketId, address _user) internal view returns(bool _hasParticipated) {
      for(uint i = 1;i <= totalOptions; i++) {
        if(userData[_user].userMarketData[_marketId].predictionData[i].predictionPoints > 0) {
          _hasParticipated = true;
          break;
        }
      }
    }

    /**
    * @dev Raise the dispute if wrong value passed at the time of market result declaration.
    * @param _proposedValue The proposed value of market currency.
    * @param proposalTitle The title of proposal created by user.
    * @param description The description of dispute.
    * @param solutionHash The ipfs solution hash.
    */
    function raiseDispute(uint256 _marketId, uint256 _proposedValue, string memory proposalTitle, string memory description, string memory solutionHash) public {
      address payable _msgSender = _msgSender();
      require(getTotalPredictionPoints(_marketId) > 0);
      require(marketStatus(_marketId) == PredictionStatus.Cooling);
      uint _stakeForDispute =  marketUtility.getDisputeResolutionParams();
      IToken(plotToken).transferFrom(_msgSender, address(this), _stakeForDispute);
      // marketRegistry.createGovernanceProposal(proposalTitle, description, solutionHash, abi.encode(address(this), proposedValue), _stakeForDispute, msg.sender, ethAmountToPool, tokenAmountToPool, proposedValue);
      uint proposalId = governance.getProposalLength();
      // marketBasicData[msg.sender].disputeStakes = DisputeStake(proposalId, _user, _stakeForDispute, _ethSentToPool, _tokenSentToPool);
      marketDataExtended[_marketId].disputeRaisedBy = _msgSender;
      marketDataExtended[_marketId].disputeStakeAmount = uint64(_stakeForDispute.div(10**predictionDecimalMultiplier));
      disputeProposalId[proposalId] = _marketId;
      governance.createProposalwithSolution(proposalTitle, proposalTitle, description, 9, solutionHash, abi.encode(_marketId, _proposedValue));
      emit DisputeRaised(_marketId, _msgSender, proposalId, _proposedValue);
      _setMarketStatus(_marketId, PredictionStatus.InDispute);
    }

    /**
    * @dev Resolve the dispute if wrong value passed at the time of market result declaration.
    * @param _marketId Index of market.
    * @param _result The final proposed result of the market.
    */
    function resolveDispute(uint256 _marketId, uint256 _result) external onlyAuthorizedToGovern {
      // delete marketCreationRewardData[_marketId].plotIncentive;
      // delete marketCreationRewardData[_marketId].ethIncentive;
      _resolveDispute(_marketId, true, _result);
      emit DisputeResolved(_marketId, true);
      _transferAsset(plotToken, marketDataExtended[_marketId].disputeRaisedBy, (10**predictionDecimalMultiplier).mul(marketDataExtended[_marketId].disputeStakeAmount));
    }

    /**
    * @dev Resolve the dispute
    * @param _marketId Index of market.
    * @param accepted Flag mentioning if dispute is accepted or not
    * @param finalResult The final correct value of market currency.
    */
    function _resolveDispute(uint256 _marketId, bool accepted, uint256 finalResult) internal {
      require(marketStatus(_marketId) == PredictionStatus.InDispute);
      if(accepted) {
        marketCreationRewards.returnMarketRewardPoolShare(_marketId);
        _postResult(finalResult, 0, _marketId);
      }
      _setMarketStatus(_marketId, PredictionStatus.Settled);
    }

    /**
    * @dev Burns the tokens of member who raised the dispute, if dispute is rejected.
    * @param _proposalId Id of dispute resolution proposal
    */
    function burnDisputedProposalTokens(uint _proposalId) external onlyAuthorizedToGovern {
      uint256 _marketId = disputeProposalId[_proposalId];
      _resolveDispute(_marketId, false, 0);
      emit DisputeResolved(_marketId, false);
      IToken(plotToken).transfer(address(marketCreationRewards),(10**predictionDecimalMultiplier).mul(marketDataExtended[_marketId].disputeStakeAmount));
    }

    /**
    * @dev Get flags set for user
    * @param _marketId Index of market.
    * @param _user User address
    * @return Flag defining if user had predicted with bPLOT
    * @return Flag defining if user had availed multiplier
    */
    function getUserFlags(uint256 _marketId, address _user) external view returns(bool, bool) {
      return (
              userData[_user].userMarketData[_marketId].predictedWithBlot,
              userData[_user].userMarketData[_marketId].multiplierApplied
      );
    }

    /**
    * @dev Gets the result of the market.
    * @param _marketId Index of market.
    * @return uint256 representing the winning option of the market.
    * @return uint256 Value of market currently at the time closing market.
    * @return uint256 representing the positions of the winning option.
    * @return uint[] memory representing the reward to be distributed.
    * @return uint256 representing the prediction token staked on winning option.
    */
    function getMarketResults(uint256 _marketId) external view returns(uint256 _winningOption, uint256, uint256, uint256) {
      _winningOption = marketDataExtended[_marketId].WinningOption;
      return (_winningOption, marketOptionsAvailable[_marketId][_winningOption].predictionPoints, marketDataExtended[_marketId].rewardToDistribute, marketOptionsAvailable[_marketId][_winningOption].amountStaked);
    }

    /**
    * @dev Internal function set market status
    * @param _marketId Index of market
    * @param _status Status of market to set
    */    
    function _setMarketStatus(uint256 _marketId, PredictionStatus _status) internal {
      marketDataExtended[_marketId].predictionStatus = _status;
    }

    function getMarketOptionPricingParams(uint _marketId, uint _option) external view returns(uint[] memory, uint32,address) {
      uint[] memory _optionPricingParams = new uint256[](6);
      _optionPricingParams[0] = marketOptionsAvailable[_marketId][_option].amountStaked;
      _optionPricingParams[1] = marketTotalTokenStaked[_marketId];
      _optionPricingParams[2] = marketPricingData[_marketId].stakingFactorMinStake;
      _optionPricingParams[3] = marketPricingData[_marketId].stakingFactorWeightage;
      _optionPricingParams[4] = marketPricingData[_marketId].currentPriceWeightage;
      _optionPricingParams[5] = uint(marketPricingData[_marketId].minTimePassed);
      return (_optionPricingParams,marketBasicData[_marketId].startTime,marketCurrencies[marketBasicData[_marketId].currency].marketFeed);
    }

}
