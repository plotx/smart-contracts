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
import "./external/govblocks-protocol/interfaces/IGovernance.sol";
import "./interfaces/IToken.sol";
// import "./IERC20.sol";
import "./interfaces/ITokenController.sol";
// import "./interfaces/IMarketRegistry.sol";

contract AllMarkets is Governed {
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
      mapping(address => uint256) assetStaked;
      
    }

    struct MarketSettleData {
      uint64 WinningOption;
      uint64 settleTime;
    }

    address constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    // address constant marketFeedAddress = 0x6135b13325bfC4B00278B4abC5e20bbce2D6580e;
    address internal plotToken;
    IToken plt;

    // IMarketRegistry constant marketRegistry = IMarketRegistry(0x309D36e5887EA8863A721680f728487F8d70DD09);
    ITokenController constant tokenController = ITokenController(0x3A3d9ca9d9b25AF1fF7eB9d8a1ea9f61B5892Ee9);
    IMarketUtility marketUtility;
    IGovernance internal governance = IGovernance(0xf192D77d9519e12df1b548bC2c02448f7585B3f3);

    // uint8[] constant roundOfToNearest = [25,1];
    uint constant totalOptions = 3;
    mapping(address => uint256) internal commissionPerc;
    // uint constant ethCommissionPerc = 10; //with 2 decimals
    // uint constant plotCommissionPerc = 5; //with 2 decimals
    uint constant defaultMaxRecords = 20;

    // bytes32[] public constant marketCurrency = ["BTC/USD","ETH/USD"];

    uint256 internal marketCreationIncentive;
    
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

    struct PredictionData {
      uint64 predictionPoints;
      uint64 ethStaked;
      uint64 plotStaked;
    }
    
    struct UserData {
      bool claimedReward;
      bool predictedWithBlot;
      bool multiplierApplied;
      mapping(uint => PredictionData) predictionData;
      // mapping(uint => uint) predictionPoints;
      // mapping(address => mapping(uint => uint)) assetStaked;
    }

    struct UserParticipationData {
      uint64 totalEthStaked;
      uint64 totalPlotStaked;
      uint128 lastClaimedIndex;
      uint[] marketsParticipated;
      mapping(address => uint) currencyUnusedBalance;
    }

    struct MarketData {
      uint32 Mtype;
      uint32 currency;
      uint32 startTime;
      uint32 predictionTime;
      uint64 neutralMinValue;
      uint64 neutralMaxValue;
    }

    struct MarketDisputeData {
      address disputeRaisedBy;
      uint256 disputeStakeAmount;
    }

    event Deposited(address indexed user, uint256 plot, uint256 eth);
    event Withdrawn(address indexed user, uint256 plot, uint256 eth);
    event MarketTypes(uint256 indexed index, uint32 predictionTime, uint32 optionRangePerc, bool status);
    event MarketCurrencies(uint256 indexed index, address feedAddress, bytes32 currencyName, bool status);
    event MarketResult(uint256 indexed marketIndex, uint256[] totalReward, uint256 winningOption, uint256 closeValue, uint256 roundId);
    // event Claimed(uint256 indexed marketId, address indexed user, uint256[] reward, address[] _predictionAssets);
    event Claimed(address indexed user, uint256 plotReward, uint256 ethReward);
    event ClaimedIncentive(address indexed user, uint256 marketIndex, address incentiveTokenAddress, uint256 incentive);
    event PlacePrediction(address indexed user,uint256 value, uint256 predictionPoints, address predictionAsset,uint256 prediction,uint256 indexed marketId);
    event DisputeRaised(uint256 indexed marketId, address raisedBy, uint64 proposalId, uint256 proposedValue);
    event DisputeResolved(uint256 indexed marketId, bool status);

    MarketData[] public marketData;

    mapping(uint256 => MarketDisputeData) public marketDisputeData;
    mapping(uint256 => MarketSettleData) public marketSettleData;
    mapping(address => mapping(uint => UserData)) internal userData;
    mapping(address => UserParticipationData) userParticipationData;
    

    mapping(uint =>mapping(uint=>PredictionData)) public marketOptionsAvailable;
    mapping(address => uint256) marketsCreatedByUser;
    mapping(uint64 => uint256) disputeProposalId;
    struct MarketTypeData {
      uint32 predictionTime;
      uint32 optionRangePerc;
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
      bool paused;
    }


    bool public marketCreationPaused;
    MarketCurrency[] marketCurrencies;
    MarketTypeData[] marketTypeArray;
    mapping(bytes32 => uint) marketCurrency;

    mapping(uint64 => uint32) marketType;
    mapping(uint256 => mapping(uint256 => MarketCreationData)) public marketCreationData;

    function  initiate(address _plot, address _marketUtility) public {
      plotToken = _plot;
      plt = IToken(plotToken);
      marketUtility = IMarketUtility(_marketUtility);
    }

    function addMarketCurrency(bytes32 _currencyName,  address _marketFeed, uint8 decimals, uint8 roundOfToNearest) public onlyAuthorizedToGovern {
      marketCurrency[_currencyName] = marketCurrencies.length;
      marketCurrencies.push(MarketCurrency(_currencyName, _marketFeed, decimals, roundOfToNearest));
      emit MarketCurrencies(marketCurrency[_currencyName], _marketFeed, _currencyName, true);
    }

    function addMarketType(uint32 _predictionTime, uint32 _optionRangePerc) public onlyAuthorizedToGovern {
      uint32 index = uint32(marketTypeArray.length);
      marketType[_predictionTime] = index;
      marketTypeArray.push(MarketTypeData(_predictionTime, _optionRangePerc));
      emit MarketTypes(index, _predictionTime, _optionRangePerc, true);
    }

    function removeMarketType(uint32 _marketTypeIndex) public onlyAuthorizedToGovern {
      delete marketType[marketTypeArray[_marketTypeIndex].predictionTime];
      delete marketTypeArray[_marketTypeIndex];
      // uint256 topIndex = marketTypeArray.length - 1;
      // marketType[marketTypeArray[topIndex].predictionTime] = _marketTypeIndex; 
      // marketTypeArray[_marketTypeIndex] = marketTypeArray[topIndex];
      // marketTypeArray.pop();
      emit MarketTypes(_marketTypeIndex, 0, 0, false);
    }

    /**
    * @dev Start the initial market.
    */
    function addInitialMarketTypesAndStart(uint32 _marketStartTime, address _ethMarketImplementation) external {
      marketCreationIncentive = 50 ether;
      commissionPerc[ETH_ADDRESS] = 10;
      commissionPerc[plotToken] = 5;
      uint32 _predictionTime = 1 hours;
      marketType[_predictionTime] = uint32(marketTypeArray.length);
      marketTypeArray.push(MarketTypeData(_predictionTime, 50));
      marketCurrency["ETH/USD"] = marketCurrencies.length;
      marketCurrencies.push(MarketCurrency("ETH/USD", _ethMarketImplementation, 8, 1));
      for(uint32 i = 0;i < marketTypeArray.length; i++) {
          marketCreationData[i][0].initialStartTime = _marketStartTime;
          createMarket(0, _marketStartTime, i);
      }
    }

     /**
    * @dev Initialize the market.
    * @param _marketCurrencyIndex The index of market currency feed
    * @param _startTime The time at which market will create.
    * @param _marketTypeIndex The time duration of market.
    */
    function createMarket(uint32 _marketCurrencyIndex,uint32 _startTime, uint32 _marketTypeIndex) public payable {
      require(!marketCreationPaused && !marketCreationData[_marketTypeIndex][_marketCurrencyIndex].paused);

      _checkPreviousMarket( _marketTypeIndex, _marketCurrencyIndex);
      // require(marketData.startTime == 0, "Already initialized");
      // require(_startTime.add(_predictionTime) > now);
      marketUtility.update();
      uint currentPrice = marketUtility.getAssetPriceUSD(marketCurrencies[_marketCurrencyIndex].marketFeed);
      uint _optionRangePerc = marketTypeArray[_marketTypeIndex].optionRangePerc;
      _optionRangePerc = uint32(currentPrice.mul(_optionRangePerc.div(2)).div(10000));
      uint64 _decimals = marketCurrencies[_marketCurrencyIndex].decimals;
      uint8 _roundOfToNearest = marketCurrencies[_marketCurrencyIndex].roundOfToNearest;
      uint64 _minValue = uint64((ceil(currentPrice.sub(_optionRangePerc).div(_roundOfToNearest), 10**_decimals)).mul(_roundOfToNearest));
      uint64 _maxValue = uint64((ceil(currentPrice.add(_optionRangePerc).div(_roundOfToNearest), 10**_decimals)).mul(_roundOfToNearest));
      marketData.push(MarketData(_marketTypeIndex,_marketCurrencyIndex,_startTime, marketTypeArray[_marketTypeIndex].predictionTime,_minValue,_maxValue));
      (marketCreationData[_marketTypeIndex][_marketCurrencyIndex].penultimateMarket, marketCreationData[_marketTypeIndex][_marketCurrencyIndex].latestMarket) =
       (marketCreationData[_marketTypeIndex][_marketCurrencyIndex].latestMarket, uint64(marketData.length));
      marketsCreatedByUser[msg.sender]++;
    }

    /**
    * @dev function to reward user for initiating market creation calls
    */
    function claimCreationReward() external {
      require(marketsCreatedByUser[msg.sender] > 0);
      uint256 pendingReward = marketCreationIncentive.mul(marketsCreatedByUser[msg.sender]);
      require(plt.balanceOf(address(this)) > pendingReward);
      delete marketsCreatedByUser[msg.sender];
      _transferAsset(address(plotToken), msg.sender, pendingReward);
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
      lockedForDispute[_marketId] = true;
      // marketRegistry.createGovernanceProposal(proposalTitle, description, solutionHash, abi.encode(address(this), proposedValue), _stakeForDispute, msg.sender, ethAmountToPool, tokenAmountToPool, proposedValue);
      uint64 proposalId = uint64(governance.getProposalLength());
      // marketData[msg.sender].disputeStakes = DisputeStake(proposalId, _user, _stakeForDispute, _ethSentToPool, _tokenSentToPool);
      marketDisputeData[_marketId].disputeRaisedBy = msg.sender;
      marketDisputeData[_marketId].disputeStakeAmount = _stakeForDispute;
      disputeProposalId[proposalId] = _marketId;
      governance.createProposalwithSolution(proposalTitle, proposalTitle, description, 10, solutionHash, abi.encode(address(this), _proposedValue));
      emit DisputeRaised(_marketId, msg.sender, proposalId, _proposedValue);
      delete ethAmountToPool[_marketId];
      delete tokenAmountToPool[_marketId];
      predictionStatus[_marketId] = PredictionStatus.InDispute;
    }

    /**
    * @dev Resolve the dispute if wrong value passed at the time of market result declaration.
    * @param _marketId Index of market.
    * @param _result The final result of the market.
    */
    function resolveDispute(uint256 _marketId, uint256 _result) external onlyAuthorizedToGovern {
      uint256 stakedAmount = marketDisputeData[_marketId].disputeStakeAmount;
      address payable staker = address(uint160(marketDisputeData[_marketId].disputeRaisedBy));
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
      lockedForDispute[_marketId] = false;
      predictionStatus[_marketId] = PredictionStatus.Settled;
    }

    /**
    * @dev Burns the tokens of member who raised the dispute, if dispute is rejected.
    * @param _proposalId Id of dispute resolution proposal
    */
    function burnDisputedProposalTokens(uint _proposalId) external onlyAuthorizedToGovern {
      uint256 _marketId = disputeProposalId[uint64(_proposalId)];
      _resolveDispute(_marketId, false, 0);
      emit DisputeResolved(_marketId, false);
      uint _stakedAmount = marketDisputeData[_marketId].disputeStakeAmount;
      plt.burn(_stakedAmount);
    }

    function getTotalStakedValueInPLOT(uint256 _marketId) public view returns(uint256) {
      (uint256 ethStaked, uint256 plotStaked) = getTotalAssetsStaked(_marketId);
      (, ethStaked) = marketUtility.getValueAndMultiplierParameters(ETH_ADDRESS, ethStaked);
      return plotStaked.add(ethStaked);
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

    function _checkPreviousMarket(uint64 _marketTypeIndex, uint64 _marketCurrencyIndex) internal {
      uint64 penultimateMarket = marketCreationData[_marketTypeIndex][_marketCurrencyIndex].penultimateMarket;
      if(marketData.length > 0) {
        settleMarket(penultimateMarket);
      }
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
      if(predictionStatus[_marketId] == PredictionStatus.Live && now >= marketExpireTime(_marketId)) {
        return PredictionStatus.InSettlement;
      } else if(predictionStatus[_marketId] == PredictionStatus.Settled && now <= marketCoolDownTime(_marketId)) {
        return PredictionStatus.Cooling;
      }
      return predictionStatus[_marketId];
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
    function settleMarket(uint256 _marketId) public {
      (uint256 _value, uint256 _roundId) = marketUtility.getSettlemetPrice(marketCurrencies[marketData[_marketId].currency].marketFeed, uint256(marketSettleTime(_marketId)));
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
      uint256 tokenParticipation;
      uint256 ethParticipation;
      if(predictionStatus[_marketId] != PredictionStatus.InDispute) {
        marketSettleData[_marketId].settleTime = uint64(now);
      } else {
        delete marketSettleData[_marketId].settleTime;
      }
      predictionStatus[_marketId] = PredictionStatus.Settled;
      if(_value < marketData[_marketId].neutralMinValue) {
        marketSettleData[_marketId].WinningOption = 1;
      } else if(_value > marketData[_marketId].neutralMaxValue) {
        marketSettleData[_marketId].WinningOption = 3;
      } else {
        marketSettleData[_marketId].WinningOption = 2;
      }
      uint[] memory totalReward = new uint256[](2);
      uint256 _ethCommissionTotal;
      uint256 _plotCommssionTotal;
      if(marketOptionsAvailable[_marketId][marketSettleData[_marketId].WinningOption].ethStaked > 0 ||
        marketOptionsAvailable[_marketId][marketSettleData[_marketId].WinningOption].plotStaked > 0
      ){
        for(uint i=1;i <= totalOptions;i++){
          uint256 _ethCommission = _calculatePercentage(commissionPerc[ETH_ADDRESS], marketOptionsAvailable[_marketId][i].ethStaked, 10000);
          uint256 _plotCommssion = _calculatePercentage(commissionPerc[plotToken], marketOptionsAvailable[_marketId][i].plotStaked, 10000);
          if(i!=marketSettleData[_marketId].WinningOption) {
            totalReward[0] = totalReward[0].add(marketOptionsAvailable[_marketId][i].plotStaked).sub(_plotCommssion);
            totalReward[1] = totalReward[1].add(marketOptionsAvailable[_marketId][i].ethStaked).sub(_ethCommission);
          }
          _ethCommissionTotal = _ethCommissionTotal.add(_ethCommission);
          _plotCommssionTotal = _plotCommssionTotal.add(_plotCommssion);
        }
        rewardToDistribute[_marketId] = totalReward;
      } else {
        
        for(uint i=1;i <= totalOptions;i++){
          uint256 _assetStakedOnOption = marketOptionsAvailable[_marketId][i].plotStaked;
          uint256 _plotCommssion = _calculatePercentage(commissionPerc[plotToken], _assetStakedOnOption, 10000);
          tokenParticipation = tokenParticipation.add(_assetStakedOnOption).sub(_plotCommssion);

          _assetStakedOnOption = marketOptionsAvailable[_marketId][i].ethStaked;
          uint256 _ethCommission = _calculatePercentage(commissionPerc[ETH_ADDRESS], _assetStakedOnOption, 10000);
          ethParticipation = ethParticipation.add(_assetStakedOnOption).sub(_ethCommission);
          _ethCommissionTotal = _ethCommissionTotal.add(_ethCommission);
          _plotCommssionTotal = _plotCommssionTotal.add(_plotCommssion);
        }
      }
      ethCommissionAmount = ethCommissionAmount.add(_ethCommissionTotal);
      plotCommissionAmount = plotCommissionAmount.add(_plotCommssionTotal);
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

    function  deposit(uint _amount) payable public {
      userParticipationData[msg.sender].currencyUnusedBalance[ETH_ADDRESS] = userParticipationData[msg.sender].currencyUnusedBalance[ETH_ADDRESS].add(msg.value);
      if(_amount > 0) {
        plt.transferFrom (msg.sender,address(this), _amount);
        userParticipationData[msg.sender].currencyUnusedBalance[plotToken] = userParticipationData[msg.sender].currencyUnusedBalance[plotToken].add(_amount);
      }
      emit Deposited(msg.sender, _amount, msg.value);
    }

     function  withdraw(uint _maxRecords) public {
      withdrawReward(_maxRecords);
      uint _amountPlt = userParticipationData[msg.sender].currencyUnusedBalance[plotToken];
      uint _amountEth = userParticipationData[msg.sender].currencyUnusedBalance[ETH_ADDRESS];
      delete userParticipationData[msg.sender].currencyUnusedBalance[plotToken];
      delete userParticipationData[msg.sender].currencyUnusedBalance[ETH_ADDRESS];
      _transferAsset(plotToken, msg.sender, _amountPlt);
      _transferAsset(ETH_ADDRESS, msg.sender, _amountEth);
      emit Withdrawn(msg.sender, _amountPlt, _amountEth);
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
        ethStaked = ethStaked.add(marketOptionsAvailable[_marketId][i].ethStaked);
        plotStaked = plotStaked.add(marketOptionsAvailable[_marketId][i].plotStaked);
      }
    }

    function getTotalPredictionPoints(uint _marketId) public view returns(uint256 predictionPoints) {
      for(uint256 i = 1; i<= totalOptions;i++) {
        predictionPoints = predictionPoints.add(marketOptionsAvailable[_marketId][i].predictionPoints);
      }
    }

    function calculatePredictionValue(uint _marketId, uint _prediction, uint _predictionStake, address _asset) internal view returns(uint predictionPoints, bool isMultiplierApplied) {
      uint[] memory params = new uint[](8);
      params[0] = _prediction;
      params[1] = marketData[_marketId].neutralMinValue;
      params[2] = marketData[_marketId].neutralMaxValue;
      params[3] = marketData[_marketId].startTime;
      // params[4] = now + 1000;
      params[4] = marketExpireTime(_marketId);
      params[5] = getTotalPredictionPoints(_marketId);
      params[6] = marketOptionsAvailable[_marketId][_prediction].predictionPoints;
      // params[7] = marketOptionsAvailable[_marketId][_prediction].assetStaked[ETH_ADDRESS];
      // params[8] = marketOptionsAvailable[_marketId][_prediction].assetStaked[plotToken];
      params[7] = _predictionStake;
      bool checkMultiplier;
      if(!userData[msg.sender][_marketId].multiplierApplied) {
        checkMultiplier = true;
      }
      (predictionPoints, isMultiplierApplied) = marketUtility.calculatePredictionValue(params, _asset, msg.sender, marketCurrencies[marketData[_marketId].currency].marketFeed, checkMultiplier);
      
    }
    

    /**
    * @dev Place prediction on the available options of the market.
    * @param _asset The asset used by user during prediction whether it is plotToken address or in ether.
    * @param _predictionStake The amount staked by user at the time of prediction.
    * @param _prediction The option on which user placed prediction.
    */
    function placePrediction(uint _marketId, address _asset, uint256 _predictionStake, uint256 _prediction) public {
      require(!marketCreationPaused && _prediction <= totalOptions);
      require(now >= marketData[_marketId].startTime && now <= marketExpireTime(_marketId));
      uint256 _commissionStake;
      if(_asset == ETH_ADDRESS || _asset == plotToken) {
        uint256 unusedBalance = userParticipationData[msg.sender].currencyUnusedBalance[_asset];
        if(_predictionStake > unusedBalance)
        {
          withdrawReward(defaultMaxRecords);
          unusedBalance = userParticipationData[msg.sender].currencyUnusedBalance[_asset];
        }
        require(_predictionStake <= unusedBalance);
        _commissionStake = _calculatePercentage(commissionPerc[_asset], _predictionStake, 10000);
        // ethCommissionAmount = ethCommissionAmount.add(_commissionStake);
        userParticipationData[msg.sender].currencyUnusedBalance[_asset] = unusedBalance.sub(_predictionStake);
      } else {
        require(_asset == tokenController.bLOTToken());
        require(!userData[msg.sender][_marketId].predictedWithBlot);
        userData[msg.sender][_marketId].predictedWithBlot = true;
        tokenController.swapBLOT(msg.sender, address(this), _predictionStake);
        _asset = plotToken;
        _commissionStake = _calculatePercentage(commissionPerc[_asset], _predictionStake, 10000);
      }
      _commissionStake = _predictionStake.sub(_commissionStake);
      (uint predictionPoints, bool isMultiplierApplied) = calculatePredictionValue(_marketId, _prediction, _commissionStake, _asset);
      if(isMultiplierApplied) {
        userData[msg.sender][_marketId].multiplierApplied = true; 
      }
      require(predictionPoints > 0);

      _setUserGlobalPredictionData(_marketId, msg.sender,_predictionStake, predictionPoints, _asset, _prediction);
      _storePredictionData(_marketId, _prediction, _commissionStake, _asset, predictionPoints);
    }

    /**
    * @dev Claim the pending return of the market.
    * @param maxRecords Maximum number of records to claim reward for
    */
    function withdrawReward(uint256 maxRecords) public {
      uint256 i;
      uint len = userParticipationData[msg.sender].marketsParticipated.length;
      uint lastClaimed = len;
      uint count;
      uint ethReward = 0;
      uint plotReward =0 ;
      require(!marketCreationPaused);
      for(i = userParticipationData[msg.sender].lastClaimedIndex; i < len && count < maxRecords; i++) {
        (uint claimed, uint tempPlotReward, uint tempEthReward) = claimReturn(msg.sender, userParticipationData[msg.sender].marketsParticipated[i]);
        if(claimed > 0) {
          delete userParticipationData[msg.sender].marketsParticipated[i];
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
      emit Claimed(msg.sender, plotReward, ethReward);
      userParticipationData[msg.sender].currencyUnusedBalance[plotToken] = userParticipationData[msg.sender].currencyUnusedBalance[plotToken].add(plotReward);
      userParticipationData[msg.sender].currencyUnusedBalance[ETH_ADDRESS] = userParticipationData[msg.sender].currencyUnusedBalance[ETH_ADDRESS].add(ethReward);
      userParticipationData[msg.sender].lastClaimedIndex = uint128(lastClaimed);
    }

    /**
    * @dev Gets number of positions user got in prediction
    * @param _user Address of user
    * @param _option Option Id
    */
    function getUserPredictionPoints(address _user, uint256 _marketId, uint256 _option) external view returns(uint64) {
      return userData[_user][_marketId].predictionData[_option].predictionPoints;
    }

    // function sponsorIncentives(uint256 _marketId, address _token, uint256 _value) external {
    //   // require(master.isWhitelistedSponsor(msg.sender));
    //   require(marketStatus() <= PredictionStatus.InSettlement);
    //   require(incentiveToken[_marketId] == address(0), "Already sponsored");
    //   incentiveToken[_marketId] = _token;
    //   incentiveToDistribute[_marketId] = _value;
    //   plt.transferFrom(_token, msg.sender, address(this), _value);
    // }

    // function withdrawSponsoredIncentives(uint256 _marketId) external {
    //   // require(master.isWhitelistedSponsor(msg.sender));
    //   require(incentiveToDistribute[_marketId] > 0, "No incentives");
    //   require(getTotalPredictionPoints(_marketId) == 0, "Cannot Withdraw");
    //   _transferAsset(incentiveToken[_marketId], msg.sender, incentiveToDistribute[_marketId]);
    // }

    /**
    * @dev Claim the return amount of the specified address.
    * @param _user The address to query the claim return amount of.
    * @return Flag, if 0:cannot claim, 1: Already Claimed, 2: Claimed
    */
    function claimReturn(address payable _user, uint _marketId) internal returns(uint256, uint256, uint256) {

      if(marketStatus(_marketId) != PredictionStatus.Settled) {
        return (0, 0 ,0);
      }
      if(userData[_user][_marketId].claimedReward) {
        return (1, 0, 0);
      }
      userData[_user][_marketId].claimedReward = true;
      // (uint[] memory _returnAmount, address[] memory _predictionAssets,, ) = getReturn(_user, _marketId);
      uint[] memory _returnAmount = new uint256[](2);
      uint256 _winningOption = marketSettleData[_marketId].WinningOption;
      _returnAmount[0] = userData[_user][_marketId].predictionData[_winningOption].plotStaked;
      _returnAmount[1] = userData[_user][_marketId].predictionData[_winningOption].ethStaked;
      // (_returnAmount, , ) = _calculateUserReturn(_user, _marketId, _winningOption);
      uint256 userPredictionPointsOnWinngOption = userData[_user][_marketId].predictionData[_winningOption].predictionPoints;
      if(userPredictionPointsOnWinngOption > 0) {
        _returnAmount = _addUserReward(_marketId, _user, _returnAmount, _winningOption, userPredictionPointsOnWinngOption);
      }
      // _transferAsset(incentiveToken[_marketId], _user, _incentive);
      // emit Claimed(_marketId, _user, _returnAmount, _predictionAssets);
      return (2, _returnAmount[0], _returnAmount[1]);
    }

    function claimIncentive(address payable _user, uint256 _marketId) external {
      ( , , uint _incentive, ) = getReturn(_user, _marketId);
      _transferAsset(incentiveToken[_marketId], _user, _incentive);
      emit ClaimedIncentive(_user, _marketId, incentiveToken[_marketId], _incentive);
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
       return (returnAmount, _predictionAssets, incentive, incentiveToken[_marketId]);
      }
      _predictionAssets = new address[](2);
      _predictionAssets[0] = plotToken;
      _predictionAssets[1] = ETH_ADDRESS;

      uint256 _totalUserPredictionPoints = 0;
      uint256 _totalPredictionPoints = 0;
      uint256 _winningOption = marketSettleData[_marketId].WinningOption;
      (returnAmount, _totalUserPredictionPoints, _totalPredictionPoints) = _calculateUserReturn(_user, _marketId, _winningOption);
      uint256 userPredictionPointsOnWinngOption = userData[_user][_marketId].predictionData[_winningOption].predictionPoints;
      if(userPredictionPointsOnWinngOption > 0) {
        returnAmount = _addUserReward(_marketId, _user, returnAmount, _winningOption, userPredictionPointsOnWinngOption);
      }
      if(incentiveToDistribute[_marketId] > 0) {
        incentive = _calculateIncentives(_marketId, _totalUserPredictionPoints, _totalPredictionPoints);
      }
      return (returnAmount, _predictionAssets, incentive, incentiveToken[_marketId]);
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
        reward = _userPredictionPointsOnWinngOption.mul(rewardToDistribute[_marketId][j]).div(marketOptionsAvailable[_marketId][_winningOption].predictionPoints);
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
      incentive = _totalUserPredictionPoints.mul(incentiveToDistribute[_marketId].div(_totalPredictionPoints));
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
        _totalUserPredictionPoints = _totalUserPredictionPoints.add(userData[_user][_marketId].predictionData[i].predictionPoints);
        _totalPredictionPoints = _totalPredictionPoints.add(marketOptionsAvailable[_marketId][i].predictionPoints);
        if(i == _winningOption) {
          _return[0] = _return[0].add(userData[_user][_marketId].predictionData[i].plotStaked);
          _return[1] = _return[1].add(userData[_user][_marketId].predictionData[i].ethStaked);
        }
      }
    }

    /**
    * @dev Stores the prediction data.
    * @param _prediction The option on which user place prediction.
    * @param _predictionStake The amount staked by user at the time of prediction.
    * @param _asset The asset used by user during prediction.
    * @param predictionPoints The positions user got during prediction.
    */
    function _storePredictionData(uint _marketId, uint _prediction, uint _predictionStake, address _asset, uint predictionPoints) internal {
      userData[msg.sender][_marketId].predictionData[_prediction].predictionPoints = uint64(userData[msg.sender][_marketId].predictionData[_prediction].predictionPoints.add(predictionPoints));
      marketOptionsAvailable[_marketId][_prediction].predictionPoints = uint64(marketOptionsAvailable[_marketId][_prediction].predictionPoints.add(predictionPoints));
      if(_asset == ETH_ADDRESS) {
        userData[msg.sender][_marketId].predictionData[_prediction].ethStaked = uint64(userData[msg.sender][_marketId].predictionData[_prediction].ethStaked.add(_predictionStake));
        marketOptionsAvailable[_marketId][_prediction].ethStaked = uint64(marketOptionsAvailable[_marketId][_prediction].ethStaked.add(_predictionStake));
      } else {
        userData[msg.sender][_marketId].predictionData[_prediction].plotStaked = uint64(userData[msg.sender][_marketId].predictionData[_prediction].plotStaked.add(_predictionStake));
        marketOptionsAvailable[_marketId][_prediction].plotStaked = uint64(marketOptionsAvailable[_marketId][_prediction].plotStaked.add(_predictionStake));
      }
      // userData[msg.sender][_marketId].LeverageAsset[_asset][_prediction] = userData[msg.sender][_marketId].LeverageAsset[_asset][_prediction].add(_predictionStake.mul(_leverage));
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
    function _setUserGlobalPredictionData(uint256 _marketId, address _user,uint256 _value, uint256 _predictionPoints, address _predictionAsset, uint256 _prediction) internal {
      if(_predictionAsset == ETH_ADDRESS) {
        userParticipationData[_user].totalEthStaked = uint64(userParticipationData[_user].totalEthStaked.add(_value));
      } else {
        userParticipationData[_user].totalPlotStaked = uint64(userParticipationData[_user].totalPlotStaked.add(_value));
      }
      if(!_hasUserParticipated(_marketId, _user)) {
        userParticipationData[_user].marketsParticipated.push(_marketId);
      }
      emit PlacePrediction(_user, _value, _predictionPoints, _predictionAsset, _prediction, _marketId);
    }

    function _hasUserParticipated(uint256 _marketId, address _user) internal view returns(bool _hasParticipated) {
      for(uint i = 1;i <= totalOptions; i++) {
        if(userData[_user][_marketId].predictionData[i].predictionPoints > 0) {
          _hasParticipated = true;
          break;
        }
      }
    }

    function ceil(uint256 a, uint256 m) internal pure returns (uint256) {
        return ((a + m - 1) / m) * m;
    }
}
