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
import "./external/openzeppelin-solidity/math/Math.sol";
import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./interfaces/IMarketUtility.sol";
import "./external/govblocks-protocol/Governed.sol";
import "./external/govblocks-protocol/interfaces/IGovernance.sol";
import "./interfaces/IToken.sol";
import "./interfaces/ITokenController.sol";
import "./interfaces/IChainLinkOracle.sol";

contract AllMarkets is Governed {
    using SafeMath64 for uint64;
    using SafeMath32 for uint32;
    using SafeMath for uint;

    enum PredictionStatus {
      Live,
      InSettlement,
      Cooling,
      InDispute,
      Settled
    }

    event MarketCreatorRewardPoolShare(address indexed createdBy, uint256 indexed marketIndex, uint256 plotIncentive, uint256 ethIncentive);
    event MarketCreationReward(address indexed createdBy, uint256 marketIndex, uint256 plotIncentive, uint256 gasUsed, uint256 gasCost, uint256 gasPriceConsidered, uint256 gasPriceGiven, uint256 maxGasCap, uint256 rewardPoolSharePerc);
    event ClaimedMarketCreationReward(address indexed user, uint256 ethIncentive, uint256 plotIncentive);
    event Deposited(address indexed user, uint256 plot, uint256 eth, uint256 timeStamp);
    event Withdrawn(address indexed user, uint256 plot, uint256 eth, uint256 timeStamp);
    event MarketTypes(uint256 indexed index, uint32 predictionTime, uint32 optionRangePerc, bool status);
    event MarketCurrencies(uint256 indexed index, address feedAddress, bytes32 currencyName, bool status);
    event MarketQuestion(uint256 indexed marketIndex, bytes32 currencyName, uint256 indexed predictionType, uint256 startTime, uint256 predictionTime, uint256 neutralMinValue, uint256 neutralMaxValue);
    event SponsoredIncentive(uint256 indexed marketIndex, address incentiveTokenAddress, address sponsoredBy, uint256 amount);
    event MarketResult(uint256 indexed marketIndex, uint256[] totalReward, uint256 winningOption, uint256 closeValue, uint256 roundId);
    event ReturnClaimed(address indexed user, uint256 plotReward, uint256 ethReward);
    event ClaimedIncentive(address indexed user, uint256 marketIndex, address incentiveTokenAddress, uint256 incentive);
    event PlacePrediction(address indexed user,uint256 value, uint256 predictionPoints, address predictionAsset,uint256 prediction,uint256 indexed marketIndex);
    event DisputeRaised(uint256 indexed marketIndex, address raisedBy, uint256 proposalId, uint256 proposedValue);
    event DisputeResolved(uint256 indexed marketIndex, bool status);

    struct PredictionData {
      uint64 predictionPoints;
      uint64 ethStaked;
      uint64 plotStaked;
    }
    
    struct UserMarketData {
      bool claimedReward;
      bool predictedWithBlot;
      bool multiplierApplied;
      mapping(uint => PredictionData) predictionData;
    }

    struct UserData {
      uint64 totalEthStaked;
      uint64 totalPlotStaked;
      uint128 lastClaimedIndex;
      uint128 marketCreationLastClaimedIndex;
      uint256 marketCreationIncentives;
      uint256[] marketsCreated;
      uint[] marketsParticipated;
      mapping(address => uint) currencyUnusedBalance;
      mapping(uint => UserMarketData) userMarketData;
    }

    struct MarketCreationRewardData {
      uint ethIncentive;
      uint plotIncentive;
      uint64 rewardPoolSharePerc;
      address createdBy;
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
      bool lockedForDispute;
      address disputeRaisedBy;
      address incentiveToken;
      uint disputeStakeAmount;
      uint ethAmountToPool;
      uint tokenAmountToPool;
      uint incentiveToDistribute;
      uint[] rewardToDistribute;
      PredictionStatus predictionStatus;
    }

    struct MarketTypeData {
      uint32 predictionTime;
      uint32 optionRangePerc;
      bool paused;
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

    address constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal plotToken;

    // IMarketRegistry constant marketRegistry = IMarketRegistry(0x309D36e5887EA8863A721680f728487F8d70DD09);
    ITokenController constant tokenController = ITokenController(0x3A3d9ca9d9b25AF1fF7eB9d8a1ea9f61B5892Ee9);
    IMarketUtility marketUtility;
    IGovernance constant governance = IGovernance(0xf192D77d9519e12df1b548bC2c02448f7585B3f3);
    IChainLinkOracle public clGasPriceAggregator;

    // uint8[] constant roundOfToNearest = [25,1];
    uint constant totalOptions = 3;
    uint constant defaultMaxRecords = 20;
    uint internal ethCommissionAmount;
    uint internal plotCommissionAmount;
    uint256 internal maxGasPrice;
    uint64 maxRewardPoolPercForMC;
    uint64 minRewardPoolPercForMC;
    uint256 plotStakeForRewardPoolShare;
    uint256 rewardPoolShareThreshold;

    bool public marketCreationPaused;
    MarketCurrency[] marketCurrencies;
    MarketTypeData[] marketTypeArray;
    mapping(bytes32 => uint) marketCurrency;
    mapping(address => uint64) internal commissionPerc; //with 2 decimals

    mapping(uint64 => uint32) marketType;
    mapping(uint256 => mapping(uint256 => MarketCreationData)) internal marketCreationData;

    MarketBasicData[] public marketBasicData;

    mapping(uint256 => MarketCreationRewardData) internal marketCreationRewardData; //Of market

    mapping(uint256 => MarketDataExtended) internal marketDataExtended;
    mapping(address => UserData) internal userData;

    mapping(uint =>mapping(uint=>PredictionData)) public marketOptionsAvailable;
    mapping(uint256 => uint256) disputeProposalId;

    function  initiate(address _plot, address _marketUtility) public {
      plotToken = _plot;
      marketUtility = IMarketUtility(_marketUtility);
    }

    function addMarketCurrency(bytes32 _currencyName,  address _marketFeed, uint8 decimals, uint8 roundOfToNearest) public onlyAuthorizedToGovern {
      require(marketCurrencies[marketCurrency[_currencyName]].marketFeed == address(0));
      require(decimals != 0);
      require(roundOfToNearest != 0);
      require(_marketFeed != address(0));
      marketCurrency[_currencyName] = marketCurrencies.length;
      marketCurrencies.push(MarketCurrency(_currencyName, _marketFeed, decimals, roundOfToNearest));
      emit MarketCurrencies(marketCurrency[_currencyName], _marketFeed, _currencyName, true);
    }

    function addMarketType(uint32 _predictionTime, uint32 _optionRangePerc) public onlyAuthorizedToGovern {
      require(marketTypeArray[marketType[_predictionTime]].predictionTime == 0);
      require(_predictionTime > 0);
      require(_optionRangePerc > 0);
      uint32 index = uint32(marketTypeArray.length);
      marketType[_predictionTime] = index;
      marketTypeArray.push(MarketTypeData(_predictionTime, _optionRangePerc, false));
      emit MarketTypes(index, _predictionTime, _optionRangePerc, true);
    }

    /**
    * @dev Start the initial market.
    */
    function addInitialMarketTypesAndStart(uint32 _marketStartTime, address _ethFeed, address _clGasPriceAggregator) external {
      require(marketTypeArray.length == 0);
      commissionPerc[ETH_ADDRESS] = 10;
      commissionPerc[plotToken] = 5;
      clGasPriceAggregator = IChainLinkOracle(_clGasPriceAggregator);
      maxGasPrice = 100 * 10**9;
      maxRewardPoolPercForMC = 500; // Raised by 2 decimals
      minRewardPoolPercForMC = 50; // Raised by 2 decimals
      plotStakeForRewardPoolShare = 25000 ether;
      rewardPoolShareThreshold = 1 ether;
      uint32 _predictionTime = 4 hours;
      marketType[_predictionTime] = uint32(marketTypeArray.length);
      marketTypeArray.push(MarketTypeData(_predictionTime, 100, false));
      _predictionTime = 24 hours;
      marketType[_predictionTime] = uint32(marketTypeArray.length);
      marketTypeArray.push(MarketTypeData(_predictionTime, 200, false));
      _predictionTime = 168 hours;
      marketType[_predictionTime] = uint32(marketTypeArray.length);
      marketTypeArray.push(MarketTypeData(_predictionTime, 500, false));
      marketCurrency["ETH/USD"] = marketCurrencies.length;
      marketCurrencies.push(MarketCurrency("ETH/USD", _ethFeed, 8, 1));
      marketBasicData.push(MarketBasicData(0,0,0, 0,0,0));
      for(uint32 i = 0;i < marketTypeArray.length; i++) {
          marketCreationData[i][0].initialStartTime = _marketStartTime;
          createMarket(0, i);
      }
    }

     /**
    * @dev Initialize the market.
    * @param _marketCurrencyIndex The index of market currency feed
    * @param _marketTypeIndex The time duration of market.
    */
    function createMarket(uint32 _marketCurrencyIndex,uint32 _marketTypeIndex) public payable {
      uint256 gasProvided = gasleft();
      require(!marketCreationPaused && !marketTypeArray[_marketTypeIndex].paused);
      _closePreviousMarket( _marketTypeIndex, _marketCurrencyIndex);
      // require(marketBasicData.startTime == 0, "Already initialized");
      // require(_startTime.add(_predictionTime) > now);
      marketUtility.update();
      uint32 _startTime = calculateStartTimeForMarket(_marketCurrencyIndex, _marketTypeIndex);
      (uint64 _minValue, uint64 _maxValue) = _calculateOptionRange(_marketCurrencyIndex, _marketTypeIndex);
      uint64 _marketIndex = uint64(marketBasicData.length);
      marketBasicData.push(MarketBasicData(_marketTypeIndex,_marketCurrencyIndex,_startTime, marketTypeArray[_marketTypeIndex].predictionTime,_minValue,_maxValue));
      (marketCreationData[_marketTypeIndex][_marketCurrencyIndex].penultimateMarket, marketCreationData[_marketTypeIndex][_marketCurrencyIndex].latestMarket) =
       (marketCreationData[_marketTypeIndex][_marketCurrencyIndex].latestMarket, _marketIndex);
      _checkIfCreatorStaked(_marketIndex);
      userData[msg.sender].marketsCreated.push(_marketIndex);
      emit MarketQuestion(_marketIndex, marketCurrencies[_marketCurrencyIndex].currencyName, _marketTypeIndex, _startTime, marketTypeArray[_marketTypeIndex].predictionTime, _minValue, _maxValue);
      uint256 gasUsed = gasProvided - gasleft();
      __calculateMarketCreationIncentive(gasUsed, _marketTypeIndex, _marketCurrencyIndex, _marketIndex);
    }

    function _calculateOptionRange(uint64 _marketCurrencyIndex,uint64 _marketTypeIndex) internal view returns(uint64 _minValue, uint64 _maxValue) {
      uint currentPrice = marketUtility.getAssetPriceUSD(marketCurrencies[_marketCurrencyIndex].marketFeed);
      uint _optionRangePerc = marketTypeArray[_marketTypeIndex].optionRangePerc;
      _optionRangePerc = currentPrice.mul(_optionRangePerc.div(2)).div(10000);
      uint64 _decimals = marketCurrencies[_marketCurrencyIndex].decimals;
      uint8 _roundOfToNearest = marketCurrencies[_marketCurrencyIndex].roundOfToNearest;
      _minValue = uint64((ceil(currentPrice.sub(_optionRangePerc).div(_roundOfToNearest), 10**_decimals)).mul(_roundOfToNearest));
      _maxValue = uint64((ceil(currentPrice.add(_optionRangePerc).div(_roundOfToNearest), 10**_decimals)).mul(_roundOfToNearest));
    }

    /**
    * @dev internal function to calculate market reward pool share percent to be rewarded to market creator
    */
    function _checkIfCreatorStaked(uint64 _market) internal {
      uint256 tokensLocked = ITokenController(tokenController).tokensLockedAtTime(msg.sender, "SM", now);
      marketCreationRewardData[_market].createdBy = msg.sender;
      //Intentionally performed mul operation after div, to get absolute value instead of decimals
      marketCreationRewardData[_market].rewardPoolSharePerc
       = uint64(Math.min(
          maxRewardPoolPercForMC,
          minRewardPoolPercForMC + tokensLocked.div(plotStakeForRewardPoolShare).mul(minRewardPoolPercForMC)
        ));
    }

    /**
    * @dev internal function to calculate user incentive for market creation
    */
    function __calculateMarketCreationIncentive(uint256 gasUsed, uint256 _marketType, uint256 _marketCurrencyIndex, uint64 _marketIndex) internal{
      //Adding buffer gas for below calculations
      gasUsed = gasUsed + 38500;
      uint256 gasPrice = _checkGasPrice();
      uint256 gasCost = gasUsed.mul(gasPrice);
      (, uint256 incentive) = marketUtility.getValueAndMultiplierParameters(ETH_ADDRESS, gasCost);
      userData[msg.sender].marketCreationIncentives = userData[msg.sender].marketCreationIncentives.add(incentive);
      emit MarketCreationReward(msg.sender, _marketIndex, incentive, gasUsed, gasCost, gasPrice, tx.gasprice, maxGasPrice, marketCreationRewardData[_marketIndex].rewardPoolSharePerc);
    }

    /**
    * @dev internal function to calculate gas price for market creation incentives
    */
    function _checkGasPrice() internal view returns(uint256) {
      uint fastGas = uint(clGasPriceAggregator.latestAnswer());
      uint fastGasWithMaxDeviation = fastGas.mul(125).div(100);
      return Math.min(Math.min(tx.gasprice,fastGasWithMaxDeviation), maxGasPrice);
    }

    function calculateStartTimeForMarket(uint32 _marketCurrencyIndex, uint32 _marketType) public view returns(uint32 _marketStartTime) {
      _marketStartTime = marketCreationData[_marketType][_marketCurrencyIndex].initialStartTime;
      uint predictionTime = marketTypeArray[_marketType].predictionTime;
      if(now > (predictionTime).add(_marketStartTime)) {
        uint noOfMarketsCycles = ((now).sub(_marketStartTime)).div(predictionTime);
       _marketStartTime = uint32((noOfMarketsCycles.mul(predictionTime)).add(_marketStartTime));
      }
    }

    /**
    * @dev function to reward user for initiating market creation calls as per the new incetive calculations
    */
    function claimCreationReward(uint256 _maxRecords) external {
      uint256 pendingPLOTReward = userData[msg.sender].marketCreationIncentives;
      delete userData[msg.sender].marketCreationIncentives;
      (uint256 ethIncentive, uint256 plotIncentive) = _getRewardPoolIncentives(_maxRecords);
      pendingPLOTReward = pendingPLOTReward.add(plotIncentive);
      require(pendingPLOTReward > 0 || ethIncentive > 0, "No pending");
      _transferAsset(address(plotToken), msg.sender, pendingPLOTReward);
      _transferAsset(ETH_ADDRESS, msg.sender, ethIncentive);
      emit ClaimedMarketCreationReward(msg.sender, ethIncentive, pendingPLOTReward);
    }

    /**
    * @dev internal function to calculate market reward pool share incentives for market creator
    */
    function _getRewardPoolIncentives(uint256 _maxRecords) internal returns(uint256 ethIncentive, uint256 plotIncentive) {
      UserData storage rewardData = userData[msg.sender];
      uint256 len = rewardData.marketsCreated.length;
      uint256 lastClaimed = len;
      uint256 count;
      uint128 i;
      for(i = rewardData.marketCreationLastClaimedIndex;i < len && count < _maxRecords; i++) {
        MarketCreationRewardData storage marketData = marketCreationRewardData[rewardData.marketsCreated[i]];
        if(marketStatus(rewardData.marketsCreated[i]) == PredictionStatus.Settled) {
          ethIncentive = ethIncentive.add(marketData.ethIncentive);
          plotIncentive = plotIncentive.add(marketData.plotIncentive);
          delete marketData.ethIncentive;
          delete marketData.plotIncentive;
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
      rewardData.marketCreationLastClaimedIndex = uint128(lastClaimed);
    }

    /**
    * @dev function to get pending reward of user for initiating market creation calls as per the new incetive calculations
    * @param _user Address of user for whom pending rewards to be checked
    * @return plotIncentive Incentives given for creating market as per the gas consumed
    * @return pendingPLOTReward PLOT Reward pool share of markets created by user
    * @return pendingETHReward ETH Reward pool share of markets created by user
    */
    function getPendingMarketCreationRewards(address _user) external view returns(uint256 plotIncentive, uint256 pendingPLOTReward, uint256 pendingETHReward){
      plotIncentive = userData[_user].marketCreationIncentives;
      (pendingETHReward, pendingPLOTReward) = _getPendingRewardPoolIncentives(_user);
    }

    /**
    * @dev internal function to calculate market reward pool share incentives for market creator
    */
    function _getPendingRewardPoolIncentives(address _user) internal view returns(uint256 ethIncentive, uint256 plotIncentive) {
      UserData memory rewardData = userData[_user];
      uint256 len = rewardData.marketsCreated.length;
      for(uint256 i = rewardData.marketCreationLastClaimedIndex;i < len; i++) {
        MarketCreationRewardData memory marketData = marketCreationRewardData[rewardData.marketsCreated[i]];
        if(marketData.ethIncentive > 0 || marketData.plotIncentive > 0) {
          if(marketStatus(rewardData.marketsCreated[i]) == PredictionStatus.Settled) {
            ethIncentive = ethIncentive.add(marketData.ethIncentive);
            plotIncentive = plotIncentive.add(marketData.plotIncentive);
          }
        }
      }
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

    function _closePreviousMarket(uint64 _marketTypeIndex, uint64 _marketCurrencyIndex) internal {
      uint64 currentMarket = marketCreationData[_marketTypeIndex][_marketCurrencyIndex].latestMarket;
      if(currentMarket != 0) {
        require(marketStatus(currentMarket) == PredictionStatus.InSettlement);
        uint64 penultimateMarket = marketCreationData[_marketTypeIndex][_marketCurrencyIndex].penultimateMarket;
        if(penultimateMarket > 0 && now >= marketSettleTime(penultimateMarket)) {
          settleMarket(penultimateMarket);
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
      return marketBasicData[_marketId].startTime.add(marketBasicData[_marketId].predictionTime.mul(2));
    }

    /**
    * @dev Gets the status of market.
    * @return PredictionStatus representing the status of market.
    */
    function marketStatus(uint256 _marketId) internal view returns(PredictionStatus){
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
      return marketDataExtended[_marketId].settleTime.add(marketBasicData[_marketId].predictionTime.div(4));
    }

    function pauseMarketCreation() external onlyAuthorizedToGovern {
      require(!marketCreationPaused);
      marketCreationPaused = true;
    }

    function resumeMarketCreation() external onlyAuthorizedToGovern {
      require(marketCreationPaused);
      marketCreationPaused = false;
    }

    function toggleMarketCreationType(uint64 _marketTypeIndex, bool _flag) external onlyAuthorizedToGovern {
      require(marketTypeArray[_marketTypeIndex].paused != _flag);
      marketTypeArray[_marketTypeIndex].paused = _flag;
    }

    function deposit(uint _amount) payable public {
      require(_amount > 0 || msg.value > 0);
      userData[msg.sender].currencyUnusedBalance[ETH_ADDRESS] = userData[msg.sender].currencyUnusedBalance[ETH_ADDRESS].add(msg.value);
      if(_amount > 0) {
        IToken(plotToken).transferFrom (msg.sender,address(this), _amount);
        userData[msg.sender].currencyUnusedBalance[plotToken] = userData[msg.sender].currencyUnusedBalance[plotToken].add(_amount);
      }
      emit Deposited(msg.sender, _amount, msg.value, now);
    }

    function withdrawMax(uint _maxRecords) public {
      withdrawReward(_maxRecords);
      (uint _amountPlt, uint _amountEth) = getUserUnusedBalance(msg.sender);
      delete userData[msg.sender].currencyUnusedBalance[plotToken];
      delete userData[msg.sender].currencyUnusedBalance[ETH_ADDRESS];
      require(_amountPlt > 0 || _amountEth > 0);
      _transferAndLogWithdraw(_amountPlt, _amountEth);
    }

    function withdraw(uint _plot, uint256 _eth, uint _maxRecords) public {
      withdrawReward(_maxRecords);
      (uint _amountPlt, uint _amountEth) = getUserUnusedBalance(msg.sender);
      userData[msg.sender].currencyUnusedBalance[plotToken] = _amountPlt.sub(_plot);
      userData[msg.sender].currencyUnusedBalance[ETH_ADDRESS] = _amountEth.sub(_eth);
      require(_plot > 0 || _eth > 0);
      _transferAndLogWithdraw(_plot, _eth);
    }

    function _transferAndLogWithdraw(uint _plot, uint256 _eth) internal {
      _transferAsset(plotToken, msg.sender, _plot);
      _transferAsset(ETH_ADDRESS, msg.sender, _eth);
      emit Withdrawn(msg.sender, _plot, _eth, now);
    }

    /**
    * @dev Get market expire time
    * @return the time upto which user can place predictions in market
    */
    function marketExpireTime(uint _marketId) internal view returns(uint256) {
      return marketBasicData[_marketId].startTime.add(marketBasicData[_marketId].predictionTime);
    }

    function sponsorIncentives(uint256 _marketId, address _token, uint256 _value) external {
      // require(master.isWhitelistedSponsor(msg.sender));
      require(marketStatus(_marketId) <= PredictionStatus.InSettlement);
      require(marketDataExtended[_marketId].incentiveToken == address(0), "Already sponsored");
      marketDataExtended[_marketId].incentiveToken = _token;
      marketDataExtended[_marketId].incentiveToDistribute = _value;
      IToken(plotToken).transferFrom(msg.sender, address(this), _value);
      emit SponsoredIncentive(_marketId, _token, msg.sender, _value);
    }

    function depositAndPlacePrediction(uint _marketId, address _asset, uint64 _predictionStake, uint256 _prediction) public payable {
      uint256 plotDeposit;
      if(_asset == plotToken) {
        plotDeposit = _predictionStake;
        require(msg.value == 0);
      } else {
        require(msg.value == _predictionStake);
      }
      deposit(plotDeposit);
      placePrediction(_marketId, _asset, _predictionStake, _prediction);
    }

    /**
    * @dev Place prediction on the available options of the market.
    * @param _asset The asset used by user during prediction whether it is plotToken address or in ether.
    * @param _predictionStake The amount staked by user at the time of prediction.
    * @param _prediction The option on which user placed prediction.
    */
    function placePrediction(uint _marketId, address _asset, uint64 _predictionStake, uint256 _prediction) public {
      require(!marketCreationPaused && _prediction <= totalOptions);
      require(now >= marketBasicData[_marketId].startTime && now <= marketExpireTime(_marketId));
      uint64 _commissionStake;
      if(_asset == ETH_ADDRESS || _asset == plotToken) {
        uint256 unusedBalance = userData[msg.sender].currencyUnusedBalance[_asset];
        unusedBalance = unusedBalance.div(1e15);
        if(_predictionStake > unusedBalance)
        {
          withdrawReward(defaultMaxRecords);
          unusedBalance = userData[msg.sender].currencyUnusedBalance[_asset];
          unusedBalance = unusedBalance.div(1e15);
        }
        require(_predictionStake <= unusedBalance);
        _commissionStake = _calculatePercentage(commissionPerc[_asset], _predictionStake, 10000);
        // ethCommissionAmount = ethCommissionAmount.add(_commissionStake);
        userData[msg.sender].currencyUnusedBalance[_asset] = (unusedBalance.sub(_predictionStake)).mul(1e15);
      } else {
        require(_asset == tokenController.bLOTToken());
        require(!userData[msg.sender].userMarketData[_marketId].predictedWithBlot);
        userData[msg.sender].userMarketData[_marketId].predictedWithBlot = true;
        tokenController.swapBLOT(msg.sender, address(this), _predictionStake);
        _asset = plotToken;
        _commissionStake = _calculatePercentage(commissionPerc[_asset], _predictionStake, 10000);
      }
      _commissionStake = _predictionStake.sub(_commissionStake);
      (uint64 predictionPoints, bool isMultiplierApplied) = calculatePredictionValue(_marketId, _prediction, _commissionStake, _asset);
      if(isMultiplierApplied) {
        userData[msg.sender].userMarketData[_marketId].multiplierApplied = true; 
      }
      require(predictionPoints > 0);

      _setUserGlobalPredictionData(_marketId, msg.sender,_predictionStake, predictionPoints, _asset, _prediction);
      _storePredictionData(_marketId, _prediction, _commissionStake, _asset, predictionPoints);
    }


    function calculatePredictionValue(uint _marketId, uint _prediction, uint64 _predictionStake, address _asset) internal view returns(uint64 predictionPoints, bool isMultiplierApplied) {
      (uint256 minPredictionAmount, , , uint256 maxPredictionAmount) = marketUtility.getBasicMarketDetails();
      uint _stakeValue = marketUtility.getAssetValueETH(_asset, _predictionStake.mul(1e15));
      if(_stakeValue < minPredictionAmount || _stakeValue > maxPredictionAmount) {
        return (0, isMultiplierApplied);
      }
      uint64 _optionPrice = calculateOptionPrice(_marketId, _prediction);
      predictionPoints = uint64(_stakeValue.div(1e15)).div(_optionPrice);
      if(!userData[msg.sender].userMarketData[_marketId].multiplierApplied) {
        uint256 _predictionPoints;
        (_predictionPoints, isMultiplierApplied) = marketUtility.checkMultiplier(_asset, msg.sender, _predictionStake,  predictionPoints, _stakeValue);
        predictionPoints = uint64(_predictionPoints);
      }
    }

    function calculateOptionPrice(uint256 _marketId, uint256 _prediction) public view returns(uint64 _optionPrice) {
      uint64 totalPredictionPoints = getTotalPredictionPoints(_marketId);
      uint64 predictionPointsOnOption = marketOptionsAvailable[_marketId][_prediction].predictionPoints;
      if(totalPredictionPoints > 0) {
        _optionPrice = (predictionPointsOnOption.mul(100)).div(totalPredictionPoints) + 100;
      } else {
        _optionPrice = 100;
      }
    }

    /**
    * @dev Settle the market, setting the winning option
    */
    function settleMarket(uint256 _marketId) public {
      if(marketStatus(_marketId) == PredictionStatus.InSettlement) {
        (uint256 _value, uint256 _roundId) = marketUtility.getSettlemetPrice(marketCurrencies[marketBasicData[_marketId].currency].marketFeed, marketSettleTime(_marketId));
        _postResult(_value, _roundId, _marketId);
      }
    }

    /**
    * @dev Calculate the result of market.
    * @param _value The current price of market currency.
    */
    function _postResult(uint256 _value, uint256 _roundId, uint256 _marketId) internal {
      require(now >= marketSettleTime(_marketId),"Not reached");
      require(_value > 0);
      if(marketDataExtended[_marketId].predictionStatus != PredictionStatus.InDispute) {
        marketDataExtended[_marketId].settleTime = uint32(now);
      } else {
        delete marketDataExtended[_marketId].settleTime;
      }
      marketDataExtended[_marketId].predictionStatus = PredictionStatus.Settled;
      if(_value < marketBasicData[_marketId].neutralMinValue) {
        marketDataExtended[_marketId].WinningOption = 1;
      } else if(_value > marketBasicData[_marketId].neutralMaxValue) {
        marketDataExtended[_marketId].WinningOption = 3;
      } else {
        marketDataExtended[_marketId].WinningOption = 2;
      }
      uint64[] memory marketCreatorIncentive = new uint64[](2);
      bool _thresholdReached = _checkIfThresholdReachedForRPS(_marketId);
      (uint64[] memory totalReward, uint64 tokenParticipation, uint64 ethParticipation, uint256 _ethCommissionTotal, uint256 _plotCommssionTotal) = _calculateRewardTally(_marketId);

      if(_thresholdReached) {
        if(
          marketOptionsAvailable[_marketId][marketDataExtended[_marketId].WinningOption].predictionPoints == 0
        ){
          marketCreatorIncentive[0] = _calculatePercentage(marketCreationRewardData[_marketId].rewardPoolSharePerc, tokenParticipation, 10000);
          marketCreatorIncentive[1] = _calculatePercentage(marketCreationRewardData[_marketId].rewardPoolSharePerc, ethParticipation, 10000);
          tokenParticipation = tokenParticipation.sub(marketCreatorIncentive[0]);
          ethParticipation = ethParticipation.sub(marketCreatorIncentive[1]);
        } else {
          marketCreatorIncentive[0] = _calculatePercentage(marketCreationRewardData[_marketId].rewardPoolSharePerc, totalReward[0], 10000);
          marketCreatorIncentive[1] = _calculatePercentage(marketCreationRewardData[_marketId].rewardPoolSharePerc, totalReward[1], 10000);
          totalReward[0] = totalReward[0].sub(marketCreatorIncentive[0]);
          totalReward[1] = totalReward[1].sub(marketCreatorIncentive[1]);
        }
      }
      marketDataExtended[_marketId].rewardToDistribute = totalReward;
      ethCommissionAmount = ethCommissionAmount.add(_ethCommissionTotal);
      plotCommissionAmount = plotCommissionAmount.add(_plotCommssionTotal);
      marketDataExtended[_marketId].ethAmountToPool = ethParticipation;
      marketDataExtended[_marketId].tokenAmountToPool = tokenParticipation;

      marketCreationRewardData[_marketId].plotIncentive = marketCreatorIncentive[0];
      marketCreationRewardData[_marketId].ethIncentive = marketCreatorIncentive[1];
      
      emit MarketCreatorRewardPoolShare(marketCreationRewardData[_marketId].createdBy, _marketId, marketCreatorIncentive[0], marketCreatorIncentive[1]);
      emit MarketResult(_marketId, marketDataExtended[_marketId].rewardToDistribute, marketDataExtended[_marketId].WinningOption, _value, _roundId);
    }

    function _calculateRewardTally(uint256 _marketId) internal view returns(uint64[] memory totalReward, uint64 tokenParticipation, uint64 ethParticipation, uint256 _ethCommissionTotal, uint256 _plotCommssionTotal){
      totalReward = new uint64[](2);
      for(uint i=1;i <= totalOptions;i++){
        uint64 _plotStakedOnOption = marketOptionsAvailable[_marketId][i].plotStaked;
        uint64 _ethStakedOnOption = marketOptionsAvailable[_marketId][i].ethStaked;
        uint64 _plotCommssion = _calculatePercentage(commissionPerc[plotToken], _plotStakedOnOption, 10000);
        uint64 _ethCommission = _calculatePercentage(commissionPerc[ETH_ADDRESS], _ethStakedOnOption, 10000);
        if(
          marketOptionsAvailable[_marketId][marketDataExtended[_marketId].WinningOption].predictionPoints == 0
        ){
          tokenParticipation = tokenParticipation.add(_plotStakedOnOption).sub(_plotCommssion);
          ethParticipation = ethParticipation.add(_ethStakedOnOption).sub(_ethCommission);
        } else {
          if(i!=marketDataExtended[_marketId].WinningOption) {
            totalReward[0] = totalReward[0].add(_plotStakedOnOption).sub(_plotCommssion);
            totalReward[1] = totalReward[1].add(_ethStakedOnOption).sub(_ethCommission);
          }
        }
        _ethCommissionTotal = _ethCommissionTotal.add(_ethCommission);
        _plotCommssionTotal = _plotCommssionTotal.add(_plotCommssion);
      }
    }

    /**
    * @dev Check if threshold reached for reward pool share percent for market creator.
    * Calculate total leveraged amount staked in market value in ETH
    * @param _marketId Index of market to check threshold
    */
    function _checkIfThresholdReachedForRPS(uint256 _marketId) internal view returns(bool) {
      uint256 ethStaked;
      uint256 plotStaked;
      for(uint256 i = 1; i<= totalOptions;i++) {
        ethStaked = ethStaked.add(marketOptionsAvailable[_marketId][i].ethStaked);
        plotStaked = plotStaked.add(marketOptionsAvailable[_marketId][i].plotStaked);
      }
      plotStaked = marketUtility.getAssetValueETH(plotToken, plotStaked.mul(1e15));
      return (plotStaked.add(ethStaked.mul(1e15)) > rewardPoolShareThreshold);
    }

    /**
    * @dev Claim the pending return of the market.
    * @param maxRecords Maximum number of records to claim reward for
    */
    function withdrawReward(uint256 maxRecords) public {
      uint256 i;
      uint len = userData[msg.sender].marketsParticipated.length;
      uint lastClaimed = len;
      uint count;
      uint ethReward = 0;
      uint plotReward =0 ;
      require(!marketCreationPaused);
      for(i = userData[msg.sender].lastClaimedIndex; i < len && count < maxRecords; i++) {
        (uint claimed, uint tempPlotReward, uint tempEthReward) = claimReturn(msg.sender, userData[msg.sender].marketsParticipated[i]);
        if(claimed > 0) {
          delete userData[msg.sender].marketsParticipated[i];
          ethReward = ethReward.add(tempEthReward);
          plotReward = plotReward.add(tempPlotReward);
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
      emit ReturnClaimed(msg.sender, plotReward, ethReward);
      userData[msg.sender].currencyUnusedBalance[plotToken] = userData[msg.sender].currencyUnusedBalance[plotToken].add(plotReward.mul(1e15));
      userData[msg.sender].currencyUnusedBalance[ETH_ADDRESS] = userData[msg.sender].currencyUnusedBalance[ETH_ADDRESS].add(ethReward.mul(1e15));
      userData[msg.sender].lastClaimedIndex = uint128(lastClaimed);
    }

    function getUserUnusedBalance(address _user) public view returns(uint256, uint256){
      return (userData[_user].currencyUnusedBalance[plotToken], userData[msg.sender].currencyUnusedBalance[ETH_ADDRESS]);
    }

    /**
    * @dev Gets number of positions user got in prediction
    * @param _user Address of user
    * @param _option Option Id
    */
    function getUserPredictionPoints(address _user, uint256 _marketId, uint256 _option) external view returns(uint64) {
      return userData[_user].userMarketData[_marketId].predictionData[_option].predictionPoints;
    }

    function getMarketData(uint256 _marketId) public view returns
       (bytes32 _marketCurrency,uint[] memory minvalue,uint[] memory maxvalue,
        uint[] memory _optionPrice, uint[] memory _ethStaked, uint[] memory _plotStaked,uint _predictionTime,uint _expireTime, uint _predictionStatus){
        _marketCurrency = marketCurrencies[marketBasicData[_marketId].currency].currencyName;
        _predictionTime = marketBasicData[_marketId].predictionTime;
        _expireTime =marketExpireTime(_marketId);
        _predictionStatus = uint(marketStatus(_marketId));
        minvalue = new uint[](totalOptions);
        minvalue[1] = marketBasicData[_marketId].neutralMinValue;
        minvalue[2] = marketBasicData[_marketId].neutralMaxValue.add(1);
        maxvalue = new uint[](totalOptions);
        maxvalue[0] = marketBasicData[_marketId].neutralMinValue.sub(1);
        maxvalue[1] = marketBasicData[_marketId].neutralMaxValue;
        maxvalue[2] = ~uint256(0);
        
        _optionPrice = new uint[](totalOptions);
        _ethStaked = new uint[](totalOptions);
        _plotStaked = new uint[](totalOptions);
        for (uint i = 0; i < totalOptions; i++) {
        _ethStaked[i] = marketOptionsAvailable[_marketId][i+1].ethStaked;
        _plotStaked[i] = marketOptionsAvailable[_marketId][i+1].plotStaked;
        _optionPrice[i] = calculateOptionPrice(_marketId, i+1);
       }
    }

    function withdrawSponsoredIncentives(uint256 _marketId) external {
      // require(master.isWhitelistedSponsor(msg.sender));
      require(marketDataExtended[_marketId].incentiveToDistribute > 0, "No incentives");
      require(getTotalPredictionPoints(_marketId) == 0, "Cannot Withdraw");
      _transferAsset(marketDataExtended[_marketId].incentiveToken, msg.sender, marketDataExtended[_marketId].incentiveToDistribute);
    }

    /**
    * @dev Claim the return amount of the specified address.
    * @param _user The address to query the claim return amount of.
    * @return Flag, if 0:cannot claim, 1: Already Claimed, 2: Claimed
    */
    function claimReturn(address payable _user, uint _marketId) internal returns(uint256, uint256, uint256) {

      if(marketStatus(_marketId) != PredictionStatus.Settled) {
        return (0, 0 ,0);
      }
      if(userData[_user].userMarketData[_marketId].claimedReward) {
        return (1, 0, 0);
      }
      userData[_user].userMarketData[_marketId].claimedReward = true;
      // (uint[] memory _returnAmount, address[] memory _predictionAssets,, ) = getReturn(_user, _marketId);
      uint[] memory _returnAmount = new uint256[](2);
      uint256 _winningOption = marketDataExtended[_marketId].WinningOption;
      _returnAmount[0] = userData[_user].userMarketData[_marketId].predictionData[_winningOption].plotStaked;
      _returnAmount[1] = userData[_user].userMarketData[_marketId].predictionData[_winningOption].ethStaked;
      // (_returnAmount, , ) = _calculateUserReturn(_user, _marketId, _winningOption);
      uint256 userPredictionPointsOnWinngOption = userData[_user].userMarketData[_marketId].predictionData[_winningOption].predictionPoints;
      if(userPredictionPointsOnWinngOption > 0) {
        _returnAmount = _addUserReward(_marketId, _user, _returnAmount, _winningOption, userPredictionPointsOnWinngOption);
      }
      // _transferAsset(incentiveToken[_marketId], _user, _incentive);
      // emit Claimed(_marketId, _user, _returnAmount, _predictionAssets);
      return (2, _returnAmount[0], _returnAmount[1]);
    }

    function claimIncentive(address payable _user, uint256 _marketId) external {
      ( , , uint _incentive, ) = getReturn(_user, _marketId);
      _transferAsset(marketDataExtended[_marketId].incentiveToken, _user, _incentive);
      emit ClaimedIncentive(_user, _marketId, marketDataExtended[_marketId].incentiveToken, _incentive);
    }

    /** 
    * @dev Gets the return amount of the specified address.
    * @param _user The address to specify the return of
    * @return returnAmount uint[] memory representing the return amount.
    * @return incentive uint[] memory representing the amount incentive.
    * @return _incentiveTokens address[] memory representing the incentive tokens.
    */
    function getReturn(address _user, uint _marketId)public view returns (uint[] memory returnAmount, address[] memory _predictionAssets, uint incentive, address _incentiveToken){
      if(marketStatus(_marketId) != PredictionStatus.Settled || commissionPerc[ETH_ADDRESS].add(commissionPerc[plotToken]) ==0) {
       return (returnAmount, _predictionAssets, incentive, marketDataExtended[_marketId].incentiveToken);
      }
      _predictionAssets = new address[](2);
      _predictionAssets[0] = plotToken;
      _predictionAssets[1] = ETH_ADDRESS;

      uint256 _totalUserPredictionPoints = 0;
      uint256 _totalPredictionPoints = 0;
      uint256 _winningOption = marketDataExtended[_marketId].WinningOption;
      (returnAmount, _totalUserPredictionPoints, _totalPredictionPoints) = _calculateUserReturn(_user, _marketId, _winningOption);
      uint256 userPredictionPointsOnWinngOption = userData[_user].userMarketData[_marketId].predictionData[_winningOption].predictionPoints;
      if(userPredictionPointsOnWinngOption > 0) {
        returnAmount = _addUserReward(_marketId, _user, returnAmount, _winningOption, userPredictionPointsOnWinngOption);
      }
      if(marketDataExtended[_marketId].incentiveToDistribute > 0) {
        incentive = _calculateIncentives(_marketId, _totalUserPredictionPoints, _totalPredictionPoints);
      }
      return (returnAmount, _predictionAssets, incentive, marketDataExtended[_marketId].incentiveToken);
    }

    /**
    * @dev Adds the reward in the total return of the specified address.
    * @param _user The address to specify the return of.
    * @param returnAmount The return amount.
    * @return uint[] memory representing the return amount after adding reward.
    */
    function _addUserReward(uint256 _marketId, address _user, uint[] memory returnAmount, uint256 _winningOption, uint256 _userPredictionPointsOnWinngOption) internal view returns(uint[] memory){
      uint reward;
      for(uint j = 0; j< returnAmount.length; j++) {
        reward = _userPredictionPointsOnWinngOption.mul(marketDataExtended[_marketId].rewardToDistribute[j]).div(marketOptionsAvailable[_marketId][_winningOption].predictionPoints);
        returnAmount[j] = returnAmount[j].add(reward);
      }
      return returnAmount;
    }

    /**
    * @dev Calculates the incentives.
    * @param _totalUserPredictionPoints The positions of user.
    * @param _totalPredictionPoints The total positions of winners.
    * @return incentive the calculated incentive.
    */
    function _calculateIncentives(uint256 _marketId, uint256 _totalUserPredictionPoints, uint256 _totalPredictionPoints) internal view returns(uint256 incentive){
      incentive = _totalUserPredictionPoints.mul((marketDataExtended[_marketId].incentiveToDistribute).div(_totalPredictionPoints));
    }

    /**
    * @dev Calculate the return of the specified address.
    * @param _user The address to query the return of.
    * @return _return uint[] memory representing the return amount owned by the passed address.
    * @return _totalUserPredictionPoints uint representing the positions owned by the passed address.
    * @return _totalPredictionPoints uint representing the total positions of winners.
    */
    function _calculateUserReturn(address _user, uint _marketId, uint _winningOption) internal view returns(uint[] memory _return, uint _totalUserPredictionPoints, uint _totalPredictionPoints){
      _return = new uint256[](2);
      for(uint  i=1;i<=totalOptions;i++){
        _totalUserPredictionPoints = _totalUserPredictionPoints.add(userData[_user].userMarketData[_marketId].predictionData[i].predictionPoints);
        _totalPredictionPoints = _totalPredictionPoints.add(marketOptionsAvailable[_marketId][i].predictionPoints);
        if(i == _winningOption) {
          _return[0] = _return[0].add(userData[_user].userMarketData[_marketId].predictionData[i].plotStaked);
          _return[1] = _return[1].add(userData[_user].userMarketData[_marketId].predictionData[i].ethStaked);
        }
      }
    }

    function _calculatePercentage(uint64 _percent, uint64 _value, uint64 _divisor) internal pure returns(uint64) {
      return _percent.mul(_value).div(_divisor);
    }

    function getTotalAssetsStaked(uint _marketId) public view returns(uint256 ethStaked, uint256 plotStaked) {
      for(uint256 i = 1; i<= totalOptions;i++) {
        ethStaked = ethStaked.add(marketOptionsAvailable[_marketId][i].ethStaked);
        plotStaked = plotStaked.add(marketOptionsAvailable[_marketId][i].plotStaked);
      }
    }

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
      userData[msg.sender].userMarketData[_marketId].predictionData[_prediction].predictionPoints = userData[msg.sender].userMarketData[_marketId].predictionData[_prediction].predictionPoints.add(predictionPoints);
      marketOptionsAvailable[_marketId][_prediction].predictionPoints = uint64(marketOptionsAvailable[_marketId][_prediction].predictionPoints.add(predictionPoints));
      if(_asset == ETH_ADDRESS) {
        userData[msg.sender].userMarketData[_marketId].predictionData[_prediction].ethStaked = userData[msg.sender].userMarketData[_marketId].predictionData[_prediction].ethStaked.add(_predictionStake);
        marketOptionsAvailable[_marketId][_prediction].ethStaked = marketOptionsAvailable[_marketId][_prediction].ethStaked.add(_predictionStake);
      } else {
        userData[msg.sender].userMarketData[_marketId].predictionData[_prediction].plotStaked = userData[msg.sender].userMarketData[_marketId].predictionData[_prediction].plotStaked.add(_predictionStake);
        marketOptionsAvailable[_marketId][_prediction].plotStaked = marketOptionsAvailable[_marketId][_prediction].plotStaked.add(_predictionStake);
      }
      // userMarketData[msg.sender][_marketId].LeverageAsset[_asset][_prediction] = userMarketData[msg.sender][_marketId].LeverageAsset[_asset][_prediction].add(_predictionStake.mul(_leverage));
      // marketOptionsAvailable[_marketId][_prediction].assetLeveraged[_asset] = marketOptionsAvailable[_prediction][_marketId].assetLeveraged[_asset].add(_predictionStake.mul(_leverage));
    }

    /**
    * @dev Emits the PlacePrediction event and sets the user data.
    * @param _user The address who placed prediction.
    * @param _value The amount of ether user staked.
    * @param _predictionPoints The positions user will get.
    * @param _predictionAsset The prediction assets user will get.
    * @param _prediction The option range on which user placed prediction.
    */
    function _setUserGlobalPredictionData(uint256 _marketId, address _user, uint64 _value, uint64 _predictionPoints, address _predictionAsset, uint256 _prediction) internal {
      if(_predictionAsset == ETH_ADDRESS) {
        userData[_user].totalEthStaked = userData[_user].totalEthStaked.add(_value);
      } else {
        userData[_user].totalPlotStaked = userData[_user].totalPlotStaked.add(_value);
      }
      if(!_hasUserParticipated(_marketId, _user)) {
        userData[_user].marketsParticipated.push(_marketId);
      }
      emit PlacePrediction(_user, _value, _predictionPoints, _predictionAsset, _prediction, _marketId);
    }

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
      require(getTotalStakedValueInPLOT(_marketId) > 0, "No participation");
      require(marketStatus(_marketId) == PredictionStatus.Cooling);
      uint _stakeForDispute =  marketUtility.getDisputeResolutionParams();
      tokenController.transferFrom(plotToken, msg.sender, address(this), _stakeForDispute);
      marketDataExtended[_marketId].lockedForDispute = true;
      // marketRegistry.createGovernanceProposal(proposalTitle, description, solutionHash, abi.encode(address(this), proposedValue), _stakeForDispute, msg.sender, ethAmountToPool, tokenAmountToPool, proposedValue);
      uint proposalId = governance.getProposalLength();
      // marketBasicData[msg.sender].disputeStakes = DisputeStake(proposalId, _user, _stakeForDispute, _ethSentToPool, _tokenSentToPool);
      marketDataExtended[_marketId].disputeRaisedBy = msg.sender;
      marketDataExtended[_marketId].disputeStakeAmount = _stakeForDispute;
      disputeProposalId[proposalId] = _marketId;
      governance.createProposalwithSolution(proposalTitle, proposalTitle, description, 10, solutionHash, abi.encode(address(this), _proposedValue));
      emit DisputeRaised(_marketId, msg.sender, proposalId, _proposedValue);
      delete marketDataExtended[_marketId].ethAmountToPool;
      delete marketDataExtended[_marketId].tokenAmountToPool;
      marketDataExtended[_marketId].predictionStatus = PredictionStatus.InDispute;
    }

    /**
    * @dev Resolve the dispute if wrong value passed at the time of market result declaration.
    * @param _marketId Index of market.
    * @param _result The final result of the market.
    */
    function resolveDispute(uint256 _marketId, uint256 _result) external onlyAuthorizedToGovern {
      uint256 stakedAmount = marketDataExtended[_marketId].disputeStakeAmount;
      address payable staker = address(uint160(marketDataExtended[_marketId].disputeRaisedBy));
      delete marketCreationRewardData[_marketId].plotIncentive;
      delete marketCreationRewardData[_marketId].ethIncentive;
      _resolveDispute(_marketId, true, _result);
      emit DisputeResolved(_marketId, true);
      _transferAsset(plotToken, staker, stakedAmount);
    }

    /**
    * @dev Resolve the dispute
    * @param accepted Flag mentioning if dispute is accepted or not
    * @param finalResult The final correct value of market currency.
    */
    function _resolveDispute(uint256 _marketId, bool accepted, uint256 finalResult) internal {
      require(marketStatus(_marketId) == PredictionStatus.InDispute);
      if(accepted) {
        _postResult(finalResult, 0, _marketId);
      }
      marketDataExtended[_marketId].lockedForDispute = false;
      marketDataExtended[_marketId].predictionStatus = PredictionStatus.Settled;
    }

    /**
    * @dev Burns the tokens of member who raised the dispute, if dispute is rejected.
    * @param _proposalId Id of dispute resolution proposal
    */
    function burnDisputedProposalTokens(uint _proposalId) external onlyAuthorizedToGovern {
      uint256 _marketId = disputeProposalId[_proposalId];
      _resolveDispute(_marketId, false, 0);
      emit DisputeResolved(_marketId, false);
      uint _stakedAmount = marketDataExtended[_marketId].disputeStakeAmount;
      IToken(plotToken).burn(_stakedAmount);
    }

    function getTotalStakedValueInPLOT(uint256 _marketId) public view returns(uint256) {
      (uint256 ethStaked, uint256 plotStaked) = getTotalAssetsStaked(_marketId);
      (, ethStaked) = marketUtility.getValueAndMultiplierParameters(ETH_ADDRESS, ethStaked);
      return plotStaked.add(ethStaked);
    }

    function ceil(uint256 a, uint256 m) internal pure returns (uint256) {
        return ((a + m - 1) / m) * m;
    }
}
