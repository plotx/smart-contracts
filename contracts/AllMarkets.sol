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
import "./interfaces/IMarketUtility.sol";
import "./external/govblocks-protocol/Governed.sol";
import "./external/govblocks-protocol/interfaces/IGovernance.sol";
import "./interfaces/IToken.sol";
import "./interfaces/ITokenController.sol";
import "./interfaces/IMarketCreationRewards.sol";

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

    event Deposited(address indexed user, uint256 plot, uint256 eth, uint256 timeStamp);
    event Withdrawn(address indexed user, uint256 plot, uint256 eth, uint256 timeStamp);
    event MarketTypes(uint256 indexed index, uint32 predictionTime, uint32 optionRangePerc, bool status);
    event MarketCurrencies(uint256 indexed index, address feedAddress, bytes32 currencyName, bool status);
    event MarketQuestion(uint256 indexed marketIndex, bytes32 currencyName, uint256 indexed predictionType, uint256 startTime, uint256 predictionTime, uint256 neutralMinValue, uint256 neutralMaxValue);
    event SponsoredIncentive(uint256 indexed marketIndex, address incentiveTokenAddress, address sponsoredBy, uint256 amount);
    event MarketResult(uint256 indexed marketIndex, uint256[] totalReward, uint256 winningOption, uint256 closeValue, uint256 roundId);
    event ReturnClaimed(address indexed user, uint256 plotReward, uint256 ethReward);
    event ClaimedIncentive(address indexed user, uint256 marketIndex, address incentiveTokenAddress, uint256 incentive);
    event PlacePrediction(address indexed user,uint256 value, uint256 predictionPoints, address predictionAsset,uint256 prediction,uint256 indexed marketIndex, uint256 commissionPercent);
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
      uint[] marketsParticipated;
      mapping(address => uint) currencyUnusedBalance;
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
      address incentiveToken;
      address incentiveSponsoredBy;
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

    address internal ETH_ADDRESS;
    address internal plotToken;

    // IMarketRegistry constant marketRegistry = IMarketRegistry(0x309D36e5887EA8863A721680f728487F8d70DD09);
    ITokenController internal tokenController;
    IMarketUtility internal marketUtility;
    IGovernance internal governance;
    IMarketCreationRewards internal marketCreationRewards;

    // uint8[] constant roundOfToNearest = [25,1];
    uint internal totalOptions;
    uint internal defaultMaxRecords;

    bool internal marketCreationPaused;
    MarketCurrency[] internal marketCurrencies;
    MarketTypeData[] internal marketTypeArray;
    mapping(bytes32 => uint) internal marketCurrency;
    mapping(address => uint64) internal commissionPerc; //with 2 decimals

    mapping(uint64 => uint32) internal marketType;
    mapping(uint256 => mapping(uint256 => MarketCreationData)) internal marketCreationData;

    MarketBasicData[] internal marketBasicData;

    mapping(uint256 => MarketDataExtended) internal marketDataExtended;
    mapping(address => UserData) internal userData;

    mapping(uint =>mapping(uint=>PredictionData)) internal marketOptionsAvailable;
    mapping(uint256 => uint256) internal disputeProposalId;

    /**
    * @dev Add new market currency.
    * @param _currencyName name of the currency
    * @param _marketFeed Price Feed address of the currency
    * @param decimals Decimals of the price provided by feed address
    * @param roundOfToNearest Round of the price to nearest number
    * @param _marketStartTime Start time of initial markets
    */
    function addMarketCurrency(bytes32 _currencyName, address _marketFeed, uint8 decimals, uint8 roundOfToNearest, uint32 _marketStartTime) external onlyAuthorizedToGovern {
      require(marketCurrencies[marketCurrency[_currencyName]].marketFeed == address(0));
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
    */
    function addMarketType(uint32 _predictionTime, uint32 _optionRangePerc, uint32 _marketStartTime) external onlyAuthorizedToGovern {
      require(marketTypeArray[marketType[_predictionTime]].predictionTime == 0);
      require(_predictionTime > 0);
      require(_optionRangePerc > 0);
      uint32 index = uint32(marketTypeArray.length);
      _addMarketType(_predictionTime, _optionRangePerc);
      for(uint32 i = 0;i < marketCurrencies.length; i++) {
          marketCreationData[index][i].initialStartTime = _marketStartTime;
      }
    }

    function _addMarketType(uint32 _predictionTime, uint32 _optionRangePerc) internal {
      uint32 index = uint32(marketTypeArray.length);
      marketType[_predictionTime] = index;
      marketTypeArray.push(MarketTypeData(_predictionTime, _optionRangePerc, false));
      emit MarketTypes(index, _predictionTime, _optionRangePerc, true);
    }

    /**
    * @dev Start the initial market and set initial variables.
    */
    function addInitialMarketTypesAndStart(address _plot, address _tc, address _gv, address _ethAddress, address _marketUtility, uint32 _marketStartTime, address _marketCreationRewards, address _ethFeed, address _btcFeed) external {
      require(marketTypeArray.length == 0);
      commissionPerc[ETH_ADDRESS] = 10;
      commissionPerc[plotToken] = 5;
      
      totalOptions = 3;
      defaultMaxRecords = 20;
      plotToken = _plot;
      marketUtility = IMarketUtility(_marketUtility);
      ETH_ADDRESS = _ethAddress;
      tokenController = ITokenController(_tc);
      governance = IGovernance(_gv);
      marketCreationRewards = IMarketCreationRewards(_marketCreationRewards);

      _addMarketType(4 hours, 100);
      _addMarketType(24 hours, 200);
      _addMarketType(168 hours, 500);

      _addMarketCurrency("ETH/USD", _ethFeed, 8, 1, _marketStartTime);
      _addMarketCurrency("BTC/USD", _btcFeed, 25, 1, _marketStartTime);

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
    function createMarket(uint32 _marketCurrencyIndex,uint32 _marketTypeIndex) public payable {
      uint256 gasProvided = gasleft();
      require(!marketCreationPaused && !marketTypeArray[_marketTypeIndex].paused);
      _closePreviousMarket( _marketTypeIndex, _marketCurrencyIndex);
      // require(marketBasicData.startTime == 0, "Already initialized");
      // require(_startTime.add(_predictionTime) > now);
      marketUtility.update();
      uint32 _startTime = calculateStartTimeForMarket(_marketCurrencyIndex, _marketTypeIndex);
      (uint64 _minValue, uint64 _maxValue) = marketUtility.calculateOptionRange(_marketCurrencyIndex, _marketTypeIndex, marketTypeArray[_marketTypeIndex].optionRangePerc, marketCurrencies[_marketCurrencyIndex].decimals, marketCurrencies[_marketCurrencyIndex].roundOfToNearest, marketCurrencies[_marketCurrencyIndex].marketFeed);
      uint64 _marketIndex = uint64(marketBasicData.length);
      marketBasicData.push(MarketBasicData(_marketTypeIndex,_marketCurrencyIndex,_startTime, marketTypeArray[_marketTypeIndex].predictionTime,_minValue,_maxValue));
      (marketCreationData[_marketTypeIndex][_marketCurrencyIndex].penultimateMarket, marketCreationData[_marketTypeIndex][_marketCurrencyIndex].latestMarket) =
       (marketCreationData[_marketTypeIndex][_marketCurrencyIndex].latestMarket, _marketIndex);
      emit MarketQuestion(_marketIndex, marketCurrencies[_marketCurrencyIndex].currencyName, _marketTypeIndex, _startTime, marketTypeArray[_marketTypeIndex].predictionTime, _minValue, _maxValue);
      marketCreationRewards.calculateMarketCreationIncentive(msg.sender, gasProvided, _marketIndex);
    }

    /**
    * @dev Calculate start time for next market of provided currency and market type indexes
    */
    function calculateStartTimeForMarket(uint32 _marketCurrencyIndex, uint32 _marketType) public view returns(uint32 _marketStartTime) {
      _marketStartTime = marketCreationData[_marketType][_marketCurrencyIndex].initialStartTime;
      uint predictionTime = marketTypeArray[_marketType].predictionTime;
      if(now > (predictionTime).add(_marketStartTime)) {
        uint noOfMarketsCycles = ((now).sub(_marketStartTime)).div(predictionTime);
       _marketStartTime = uint32((noOfMarketsCycles.mul(predictionTime)).add(_marketStartTime));
      }
    }

    /**
    * @dev Transfer the assets to specified address.
    * @param _asset The asset transfer to the specific address.
    * @param _recipient The address to transfer the asset of
    * @param _amount The amount which is transfer.
    */
    function _transferAsset(address _asset, address _recipient, uint256 _amount) internal {
      if(_amount > 0) { 
        if(_asset == ETH_ADDRESS) {
          (address(uint160(_recipient))).transfer(_amount);
        } else {
          require(IToken(_asset).transfer(_recipient, _amount));
        }
      }
    }

    /**
    * @dev Internal function to settle the previous market 
    */
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
      return marketDataExtended[_marketId].settleTime.add(marketBasicData[_marketId].predictionTime.div(4));
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
    * @dev Function to deposit PLOT/ETH for participation in markets
    * @param _amount Amount of PLOT to deposit
    * msg.value => Amount of ETH to deposit
    */
    function deposit(uint _amount) payable public {
      require(_amount > 0 || msg.value > 0);
      userData[msg.sender].currencyUnusedBalance[ETH_ADDRESS] = userData[msg.sender].currencyUnusedBalance[ETH_ADDRESS].add(msg.value);
      if(_amount > 0) {
        IToken(plotToken).transferFrom (msg.sender,address(this), _amount);
        userData[msg.sender].currencyUnusedBalance[plotToken] = userData[msg.sender].currencyUnusedBalance[plotToken].add(_amount);
      }
      emit Deposited(msg.sender, _amount, msg.value, now);
    }

    /**
    * @dev Withdraw maximum possible deposited and available assets
    * @param _maxRecords Maximum number of records to check
    */
    function withdrawMax(uint _maxRecords) public {
      (uint _plotLeft, , uint _ethLeft, ) = getUserUnusedBalance(msg.sender);
      _withdraw(_plotLeft, _ethLeft, _maxRecords, _plotLeft, _ethLeft);
    }

    /**
    * @dev Withdraw provided amount of deposited and available assets
    * @param _plot Amount of PLOT to withdraw
    * @param _eth Amount of ETH to withdraw
    * @param _maxRecords Maximum number of records to check
    */
    function withdraw(uint _plot, uint256 _eth, uint _maxRecords) public {
      (uint _plotLeft, , uint _ethLeft, ) = getUserUnusedBalance(msg.sender);
      _withdraw(_plot, _eth, _maxRecords, _plotLeft, _ethLeft);
    }

    /**
    * @dev Internal function to withdraw deposited and available assets
    * @param _plot Amount of PLOT to withdraw
    * @param _eth Amount of ETH to withdraw
    * @param _maxRecords Maximum number of records to check
    * @param _plotLeft Amount of PLOT left unused for user
    * @param _ethLeft Amount of ETH left unused for user
    */
    function _withdraw(uint _plot, uint256 _eth, uint _maxRecords, uint _plotLeft, uint _ethLeft) internal {
      withdrawReward(_maxRecords);
      userData[msg.sender].currencyUnusedBalance[plotToken] = _plotLeft.sub(_plot);
      userData[msg.sender].currencyUnusedBalance[ETH_ADDRESS] = _ethLeft.sub(_eth);
      require(_plot > 0 || _eth > 0);
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

    /**
    * @dev Sponsor Incentive for the market
    * @param _marketId Index of market to sponsor
    * @param _token Address of token to sponsor
    * @param _value Amount to sponsor
    */
    function sponsorIncentives(uint256 _marketId, address _token, uint256 _value) external {
      require(IMaster(masterAddress).whitelistedSponsor(msg.sender));
      require(marketStatus(_marketId) <= PredictionStatus.InSettlement);
      require(marketDataExtended[_marketId].incentiveToken == address(0));
      marketDataExtended[_marketId].incentiveToken = _token;
      marketDataExtended[_marketId].incentiveToDistribute = _value;
      marketDataExtended[_marketId].incentiveSponsoredBy = msg.sender;
      IToken(plotToken).transferFrom(msg.sender, address(this), _value);
      emit SponsoredIncentive(_marketId, _token, msg.sender, _value);
    }

    /**
    * @dev Deposit and Place prediction on the available options of the market.
    * @param _marketId Index of the market
    * @param _plotDeposit PLOT amount to deposit
    * @param _ethDeposit ETH amount to deposit
    * @param _asset The asset used by user during prediction whether it is plotToken address or in ether.
    * @param _predictionStake The amount staked by user at the time of prediction.
    * @param _prediction The option on which user placed prediction.
    */
    function depositAndPlacePrediction(uint _plotDeposit, uint _ethDeposit, uint _marketId, address _asset, uint64 _predictionStake, uint256 _prediction) external payable {
      uint256 plotDeposit;
      if(_asset == plotToken) {
        require(msg.value == 0);
      } else {
        require(msg.value == _ethDeposit);
      }
      deposit(_plotDeposit);
      placePrediction(_marketId, _asset, _predictionStake, _prediction);
    }

    /**
    * @dev Place prediction on the available options of the market.
    * @param _marketId Index of the market
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
      
      uint64 predictionPoints = _calculatePredictionPointsAndMultiplier(_marketId, _prediction, _asset, _commissionStake);
      require(predictionPoints > 0);

      _storePredictionData(_marketId, _prediction, _commissionStake, _asset, predictionPoints);
      emit PlacePrediction(msg.sender, _predictionStake, predictionPoints, _asset, _prediction, _marketId, commissionPerc[_asset]);
    }

    /**
    * @dev Internal function to calculate prediction points  and multiplier
    */
    function _calculatePredictionPointsAndMultiplier(uint256 _marketId, uint256 _prediction, address _asset, uint64 _stake) internal returns(uint64 predictionPoints){
      bool isMultiplierApplied;
      (predictionPoints, isMultiplierApplied) = marketUtility.calculatePredictionPoints(userData[msg.sender].userMarketData[_marketId].multiplierApplied, _marketId, _prediction, _stake, _asset, getTotalPredictionPoints(_marketId), marketOptionsAvailable[_marketId][_prediction].predictionPoints);
      if(isMultiplierApplied) {
        userData[msg.sender].userMarketData[_marketId].multiplierApplied = true; 
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
    * @param _roundId Chainlink round Id
    * @param _marketId Index of market
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
      (uint64[] memory totalReward, uint64 tokenParticipation, uint64 ethParticipation) = _calculateRewardTally(_marketId);
      (uint64 _rewardPoolShare, bool _thresholdReached) = marketCreationRewards.getMarketCreatorRPoolShareParams(_marketId, tokenParticipation, ethParticipation);
      if(_thresholdReached) {
        if(
          marketOptionsAvailable[_marketId][marketDataExtended[_marketId].WinningOption].predictionPoints == 0
        ){
          marketCreatorIncentive[0] = _calculatePercentage(_rewardPoolShare, tokenParticipation, 10000);
          marketCreatorIncentive[1] = _calculatePercentage(_rewardPoolShare, ethParticipation, 10000);
          tokenParticipation = tokenParticipation.sub(marketCreatorIncentive[0]);
          ethParticipation = ethParticipation.sub(marketCreatorIncentive[1]);
          marketDataExtended[_marketId].ethAmountToPool = ethParticipation;
          marketDataExtended[_marketId].tokenAmountToPool = tokenParticipation;
        } else {
          marketCreatorIncentive[0] = _calculatePercentage(_rewardPoolShare, totalReward[0], 10000);
          marketCreatorIncentive[1] = _calculatePercentage(_rewardPoolShare, totalReward[1], 10000);
          totalReward[0] = totalReward[0].sub(marketCreatorIncentive[0]);
          totalReward[1] = totalReward[1].sub(marketCreatorIncentive[1]);
        }
      }
      marketDataExtended[_marketId].rewardToDistribute = totalReward;

      _transferAsset(plotToken, address(marketCreationRewards), marketCreatorIncentive[0]);
      marketCreationRewards.depositMarketRewardPoolShare.value(marketCreatorIncentive[1])(_marketId, marketCreatorIncentive[0]);
      emit MarketResult(_marketId, marketDataExtended[_marketId].rewardToDistribute, marketDataExtended[_marketId].WinningOption, _value, _roundId);
    }

    /**
    * @dev Internal function to calculate the reward.
    * @param _marketId Index of market
    */
    function _calculateRewardTally(uint256 _marketId) internal view returns(uint64[] memory totalReward, uint64 tokenParticipation, uint64 ethParticipation){
      totalReward = new uint64[](2);
      for(uint i=1;i <= totalOptions;i++){
        uint64 _plotStakedOnOption = marketOptionsAvailable[_marketId][i].plotStaked;
        uint64 _ethStakedOnOption = marketOptionsAvailable[_marketId][i].ethStaked;
        tokenParticipation = tokenParticipation.add(_plotStakedOnOption);
        ethParticipation = ethParticipation.add(_ethStakedOnOption);
        if(i!=marketDataExtended[_marketId].WinningOption) {
          totalReward[0] = totalReward[0].add(_plotStakedOnOption);
          totalReward[1] = totalReward[1].add(_ethStakedOnOption);
        }
      }
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

    /**
    * @dev FUnction to return users unused deposited balance including the return earned in markets
    * @param _user Address of user
    * return PLOT Unused in deposit
    * return PLOT Return from market
    * return ETH Unused in deposit
    * return ETH Return from market
    */
    function getUserUnusedBalance(address _user) public view returns(uint256, uint256, uint256, uint256){
      uint ethReward;
      uint plotReward;
      uint len = userData[_user].marketsParticipated.length;
      uint[] memory _returnAmount = new uint256[](2);
      for(uint i = userData[_user].lastClaimedIndex; i < len; i++) {
        (_returnAmount, , ) = getReturn(_user, userData[_user].marketsParticipated[i]);
        ethReward = ethReward.add(_returnAmount[1]);
        plotReward = plotReward.add(_returnAmount[0]);
      }
      return (userData[_user].currencyUnusedBalance[plotToken], plotReward, userData[_user].currencyUnusedBalance[ETH_ADDRESS], ethReward);
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
    * @return _ethStaked uint[] memory representing the ether staked on each option ranges of the market.
    * @return _plotStaked uint[] memory representing the plot staked on each option ranges of the market.
    * @return _predictionTime uint representing the type of market.
    * @return _expireTime uint representing the time at which market closes for prediction
    * @return _predictionStatus uint representing the status of the market.
    */
    function getMarketData(uint256 _marketId) external view returns
       (bytes32 _marketCurrency,uint neutralMinValue,uint neutralMaxValue,
        uint[] memory _optionPrice, uint[] memory _ethStaked, uint[] memory _plotStaked,uint _predictionTime,uint _expireTime, PredictionStatus _predictionStatus){
        _marketCurrency = marketCurrencies[marketBasicData[_marketId].currency].currencyName;
        _predictionTime = marketBasicData[_marketId].predictionTime;
        _expireTime =marketExpireTime(_marketId);
        _predictionStatus = marketStatus(_marketId);
        neutralMinValue = marketBasicData[_marketId].neutralMinValue;
        neutralMaxValue = marketBasicData[_marketId].neutralMaxValue;
        
        _optionPrice = new uint[](totalOptions);
        _ethStaked = new uint[](totalOptions);
        _plotStaked = new uint[](totalOptions);
        uint64 totalPredictionPoints = getTotalPredictionPoints(_marketId);
        for (uint i = 0; i < totalOptions; i++) {
        _ethStaked[i] = marketOptionsAvailable[_marketId][i+1].ethStaked;
        _plotStaked[i] = marketOptionsAvailable[_marketId][i+1].plotStaked;
        uint64 predictionPointsOnOption = marketOptionsAvailable[_marketId][i+1].predictionPoints;
        _optionPrice[i] = marketUtility.getOptionPrice(totalPredictionPoints, predictionPointsOnOption);
       }
    }

    /**
    * @dev Allows the incentive sponsorer of market to claim back his incentives incase of zero participation in market
    * @param _marketId Index of market
    */
    function withdrawSponsoredIncentives(uint256 _marketId) external {
      require(marketStatus(_marketId) == PredictionStatus.Settled);
      require(getTotalPredictionPoints(_marketId) == 0);
      _transferAsset(marketDataExtended[_marketId].incentiveToken, marketDataExtended[_marketId].incentiveSponsoredBy, marketDataExtended[_marketId].incentiveToDistribute);
    }

    /**
    * @dev Claim the return amount of the specified address.
    * @param _user User address
    * @param _marketId Index of market
    * @return Flag, if 0:cannot claim, 1: Already Claimed, 2: Claimed; Return in PLOT; Return in ETH
    */
    function claimReturn(address payable _user, uint _marketId) internal returns(uint256, uint256, uint256) {

      if(marketStatus(_marketId) != PredictionStatus.Settled) {
        return (0, 0 ,0);
      }
      if(userData[_user].userMarketData[_marketId].claimedReward) {
        return (1, 0, 0);
      }
      userData[_user].userMarketData[_marketId].claimedReward = true;
      uint[] memory _returnAmount = new uint256[](2);
      (_returnAmount, , ) = getReturn(_user, _marketId);
      return (2, _returnAmount[0], _returnAmount[1]);
    }

    /** 
    * @dev Allows users to claim sponsored incentives of market
    * @param _user User address
    * @param _marketId Index of market
    */
    function claimIncentive(address payable _user, uint256 _marketId) external {
      ( , uint _incentive, ) = getReturn(_user, _marketId);
      _transferAsset(marketDataExtended[_marketId].incentiveToken, _user, _incentive);
      emit ClaimedIncentive(_user, _marketId, marketDataExtended[_marketId].incentiveToken, _incentive);
    }

    /** 
    * @dev Gets the return amount of the specified address.
    * @param _user The address to specify the return of
    * @param _marketId Index of market
    * @return returnAmount uint[] memory representing the return amount.
    * @return incentive uint[] memory representing the amount incentive.
    * @return _incentiveTokens address[] memory representing the incentive tokens.
    */
    function getReturn(address _user, uint _marketId) public view returns (uint[] memory returnAmount, uint incentive, address _incentiveToken){
      uint256 _totalUserPredictionPoints = 0;
      uint256 _totalPredictionPoints = 0;
      (_totalUserPredictionPoints, _totalPredictionPoints) = _calculatePredictionPoints(_user, _marketId);
      if(marketStatus(_marketId) != PredictionStatus.Settled || _totalPredictionPoints == 0) {
       return (returnAmount, incentive, marketDataExtended[_marketId].incentiveToken);
      }
      uint256 _winningOption = marketDataExtended[_marketId].WinningOption;
      returnAmount = new uint256[](2);
      returnAmount[0] = userData[_user].userMarketData[_marketId].predictionData[_winningOption].plotStaked;
      returnAmount[1] = userData[_user].userMarketData[_marketId].predictionData[_winningOption].ethStaked;
      uint256 userPredictionPointsOnWinngOption = userData[_user].userMarketData[_marketId].predictionData[_winningOption].predictionPoints;
      if(userPredictionPointsOnWinngOption > 0) {
        returnAmount = _addUserReward(_marketId, _user, returnAmount, _winningOption, userPredictionPointsOnWinngOption);
      }
      if(marketDataExtended[_marketId].incentiveToDistribute > 0) {
        incentive = _totalUserPredictionPoints.mul((marketDataExtended[_marketId].incentiveToDistribute).div(_totalPredictionPoints));
      }
      return (returnAmount, incentive, marketDataExtended[_marketId].incentiveToken);
    }

    /**
    * @dev Adds the reward in the total return of the specified address.
    * @param _user The address to specify the return of.
    * @param returnAmount The return amount.
    * @return uint[] memory representing the return amount after adding reward.
    */
    function _addUserReward(uint256 _marketId, address _user, uint[] memory returnAmount, uint256 _winningOption, uint256 _userPredictionPointsOnWinngOption) internal view returns(uint[] memory){
      for(uint j = 0; j< returnAmount.length; j++) {
        returnAmount[j] = returnAmount[j].add(
            _userPredictionPointsOnWinngOption.mul(marketDataExtended[_marketId].rewardToDistribute[j]).div(marketOptionsAvailable[_marketId][_winningOption].predictionPoints)
          );
      }
      return returnAmount;
    }

    /**
    * @dev Calculate the return of the specified address.
    * @param _user The address to query the return of.
    * @return _totalUserPredictionPoints uint representing the positions owned by the passed address.
    * @return _totalPredictionPoints uint representing the total positions of winners.
    */
    function _calculatePredictionPoints(address _user, uint _marketId) internal view returns(uint _totalUserPredictionPoints, uint _totalPredictionPoints){
      for(uint  i=1;i<=totalOptions;i++){
        _totalUserPredictionPoints = _totalUserPredictionPoints.add(userData[_user].userMarketData[_marketId].predictionData[i].predictionPoints);
        _totalPredictionPoints = _totalPredictionPoints.add(marketOptionsAvailable[_marketId][i].predictionPoints);
      }
    }

    /**
    * @dev Basic function to calculate percentage of given values
    */
    function _calculatePercentage(uint64 _percent, uint64 _value, uint64 _divisor) internal pure returns(uint64) {
      return _percent.mul(_value).div(_divisor);
    }

    /**
    * @dev Returns total assets staked in market by users
    * @param _marketId Index of market
    * @return ethStaked Total eth staked on market
    * @return plotStaked Total PLOT staked on market
    */
    function getTotalAssetsStaked(uint _marketId) external view returns(uint256 ethStaked, uint256 plotStaked) {
      for(uint256 i = 1; i<= totalOptions;i++) {
        ethStaked = ethStaked.add(marketOptionsAvailable[_marketId][i].ethStaked);
        plotStaked = plotStaked.add(marketOptionsAvailable[_marketId][i].plotStaked);
      }
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
      if(!_hasUserParticipated(_marketId, msg.sender)) {
        userData[msg.sender].marketsParticipated.push(_marketId);
      }
      userData[msg.sender].userMarketData[_marketId].predictionData[_prediction].predictionPoints = userData[msg.sender].userMarketData[_marketId].predictionData[_prediction].predictionPoints.add(predictionPoints);
      marketOptionsAvailable[_marketId][_prediction].predictionPoints = marketOptionsAvailable[_marketId][_prediction].predictionPoints.add(predictionPoints);
      if(_asset == ETH_ADDRESS) {
        userData[msg.sender].userMarketData[_marketId].predictionData[_prediction].ethStaked = userData[msg.sender].userMarketData[_marketId].predictionData[_prediction].ethStaked.add(_predictionStake);
        marketOptionsAvailable[_marketId][_prediction].ethStaked = marketOptionsAvailable[_marketId][_prediction].ethStaked.add(_predictionStake);
        userData[msg.sender].totalEthStaked = userData[msg.sender].totalEthStaked.add(_predictionStake);
      } else {
        userData[msg.sender].userMarketData[_marketId].predictionData[_prediction].plotStaked = userData[msg.sender].userMarketData[_marketId].predictionData[_prediction].plotStaked.add(_predictionStake);
        marketOptionsAvailable[_marketId][_prediction].plotStaked = marketOptionsAvailable[_marketId][_prediction].plotStaked.add(_predictionStake);
        userData[msg.sender].totalPlotStaked = userData[msg.sender].totalPlotStaked.add(_predictionStake);
      }
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
      require(getTotalPredictionPoints(_marketId) > 0);
      require(marketStatus(_marketId) == PredictionStatus.Cooling);
      uint _stakeForDispute =  marketUtility.getDisputeResolutionParams();
      IToken(plotToken).transferFrom(msg.sender, address(this), _stakeForDispute);
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
      address staker = marketDataExtended[_marketId].disputeRaisedBy;
      // delete marketCreationRewardData[_marketId].plotIncentive;
      // delete marketCreationRewardData[_marketId].ethIncentive;
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
        marketCreationRewards.returnMarketRewardPoolShare(_marketId);
        _postResult(finalResult, 0, _marketId);
      }
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

    /**
    * @dev Get flags set for user
    * @param _marketId Index of market.
    * @param _user User address
    * @return Flag defining if user had availed multiplier
    * @return Flag defining if user had predicted with bPLOT
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
    * @return uint256 representing the Eth staked on winning option.
    * @return uint256 representing the PLOT staked on winning option.
    */
    function getMarketResults(uint256 _marketId) external view returns(uint256 _winningOption, uint256, uint256[] memory, uint256, uint256) {
      _winningOption = marketDataExtended[_marketId].WinningOption;
      return (_winningOption, marketOptionsAvailable[_marketId][_winningOption].predictionPoints, marketDataExtended[_marketId].rewardToDistribute, marketOptionsAvailable[_marketId][_winningOption].ethStaked, marketOptionsAvailable[_marketId][_winningOption].plotStaked);
    }

    /**
    * @dev Patayble Fallback function to recieve funds
    */
    function () external payable {
    }

}
