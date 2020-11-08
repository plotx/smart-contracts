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
import "./MarketRegistry.sol";
import "./interfaces/IChainLinkOracle.sol";
import "./external/openzeppelin-solidity/math/Math.sol";
import "./interfaces/ITokenController.sol";

contract MarketRegistryNew is MarketRegistry {

    uint256 internal maxGasPrice;
    IChainLinkOracle public clGasPriceAggregator;
    struct MarketCreationRewardUserData {
      uint incentives;
      uint lastClaimedIndex;
      address[] marketsCreated;
    }

    struct MarketCreationRewardData {
      uint ethIncentive;
      uint plotIncentive;
      uint rewardPoolSharePerc;
    }

    uint256 maxRewardPoolPercForMC;
    uint256 minRewardPoolPercForMC;
    uint256 plotStakeForRewardPoolShare;
    uint256 rewardPoolShareThreshold;

    mapping(address => MarketCreationRewardUserData) private marketCreationRewardUserData; //Of user
    mapping(address => MarketCreationRewardData) private marketCreationRewardData; //Of user
    event MarketCreationReward(address indexed createdBy, address marketAddress, uint256 plotIncentive, uint256 gasUsed, uint256 gasCost, uint256 gasPriceConsidered, uint256 gasPriceGiven, uint256 maxGasCap, uint256 rewardPoolSharePerc);
    event ClaimedMarketCreationReward(address indexed user, uint256 ethIncentive, uint256 plotIncentive);

    /**
    * @dev Set initial market creation incentive params.
    */
    function setGasPriceAggAndMaxGas(address _clGasPriceAggregator) external {
      require(address(clGasPriceAggregator) == address(0));
      require(msg.sender == marketInitiater);
      clGasPriceAggregator = IChainLinkOracle(_clGasPriceAggregator);
      maxGasPrice = 100 * 10**9;
      maxRewardPoolPercForMC = 500; // Raised by 2 decimals
      minRewardPoolPercForMC = 50; // Raised by 2 decimals
      plotStakeForRewardPoolShare = 25000 ether;
      rewardPoolShareThreshold = 1 ether;
    }

    /**
    * @dev Creates the new market
    * @param _marketType The type of the market.
    * @param _marketCurrencyIndex the index of market currency.
    */
    function createMarket(uint256 _marketType, uint256 _marketCurrencyIndex) public payable{
      uint256 gasProvided = gasleft();
      address penultimateMarket = marketCreationData[_marketType][_marketCurrencyIndex].penultimateMarket;
      if(penultimateMarket != address(0)) {
        IMarket(penultimateMarket).settleMarket();
      }
      if(marketCreationData[_marketType][_marketCurrencyIndex].marketAddress != address(0)) {
        (,,,,,,,, uint _status) = getMarketDetails(marketCreationData[_marketType][_marketCurrencyIndex].marketAddress);
        require(_status >= uint(IMarket.PredictionStatus.InSettlement));
      }
      (uint8 _roundOfToNearest, bytes32 _currencyName, address _priceFeed) = IMarket(marketCurrencies[_marketCurrencyIndex].marketImplementation).getMarketFeedData();
      marketUtility.update();
      uint64 _marketStartTime = calculateStartTimeForMarket(_marketType, _marketCurrencyIndex);
      uint64 _optionRangePerc = marketTypes[_marketType].optionRangePerc;
      uint currentPrice = marketUtility.getAssetPriceUSD(_priceFeed);
      _optionRangePerc = uint64(currentPrice.mul(_optionRangePerc.div(2)).div(10000));
      uint64 _decimals = marketCurrencies[_marketCurrencyIndex].decimals;
      uint64 _minValue = uint64((ceil(currentPrice.sub(_optionRangePerc).div(_roundOfToNearest), 10**_decimals)).mul(_roundOfToNearest));
      uint64 _maxValue = uint64((ceil(currentPrice.add(_optionRangePerc).div(_roundOfToNearest), 10**_decimals)).mul(_roundOfToNearest));
      _createMarket(_marketType, _marketCurrencyIndex, _minValue, _maxValue, _marketStartTime, _currencyName);
      _checkIfCreatorStaked(marketCreationData[_marketType][_marketCurrencyIndex].marketAddress);
      marketCreationRewardUserData[msg.sender].marketsCreated.push(marketCreationData[_marketType][_marketCurrencyIndex].marketAddress);
      uint256 gasUsed = gasProvided - gasleft();
      _calculateIncentive(gasUsed, _marketType, _marketCurrencyIndex);
    }

    /**
    * @dev internal function to calculate user incentive for market creation
    */
    function _calculateIncentive(uint256 gasUsed, uint256 _marketType, uint256 _marketCurrencyIndex) internal{
      address _marketAddress = marketCreationData[_marketType][_marketCurrencyIndex].marketAddress;
      //Adding buffer gas for below calculations
      gasUsed = gasUsed + 38500;
      uint256 gasPrice = _checkGasPrice();
      uint256 gasCost = gasUsed.mul(gasPrice);
      (, uint256 incentive) = marketUtility.getValueAndMultiplierParameters(ETH_ADDRESS, gasCost);
      marketCreationRewardUserData[msg.sender].incentives = marketCreationRewardUserData[msg.sender].incentives.add(incentive);
      emit MarketCreationReward(msg.sender, _marketAddress, incentive, gasUsed, gasCost, gasPrice, tx.gasprice, maxGasPrice, marketCreationRewardData[_marketAddress].rewardPoolSharePerc);
    }

    /**
    * @dev internal function to calculate market reward pool share percent to be rewarded to market creator
    */
    function _checkIfCreatorStaked(address _market) internal {
      uint256 tokensLocked = ITokenController(tokenController).tokensLockedAtTime(msg.sender, "SM", now);
      //Intentionally performed mul operation after div, to get absolute value instead of decimals
      marketCreationRewardData[_market].rewardPoolSharePerc
       = Math.min(
          maxRewardPoolPercForMC,
          minRewardPoolPercForMC + tokensLocked.div(plotStakeForRewardPoolShare).mul(minRewardPoolPercForMC)
        );
    }

    /**
    * @dev Get market reward pool share percent to be rewarded to market creator
    */
    function getMarketCreatorRPoolShareParams(address _market) external view returns(uint256, uint256) {
      return (marketCreationRewardData[_market].rewardPoolSharePerc, rewardPoolShareThreshold);
    }

    /**
    * @dev internal function to calculate gas price for market creation incentives
    */
    function _checkGasPrice() internal view returns(uint256) {
      uint fastGas = uint(clGasPriceAggregator.latestAnswer());
      uint fastGasWithMaxDeviation = fastGas.mul(125).div(100);
      return Math.min(Math.min(tx.gasprice,fastGasWithMaxDeviation), maxGasPrice);
    }

    /**
    * @dev Resolve the dispute if wrong value passed at the time of market result declaration.
    * @param _marketAddress The address specify the market.
    * @param _result The final result of the market.
    */
    function resolveDispute(address payable _marketAddress, uint256 _result) external onlyAuthorizedToGovern {
      uint256 ethDepositedInPool = marketData[_marketAddress].disputeStakes.ethDeposited;
      uint256 plotDepositedInPool = marketData[_marketAddress].disputeStakes.tokenDeposited;
      uint256 stakedAmount = marketData[_marketAddress].disputeStakes.stakeAmount;
      address payable staker = address(uint160(marketData[_marketAddress].disputeStakes.staker));
      address plotTokenAddress = address(plotToken);
      plotDepositedInPool = plotDepositedInPool.add(marketCreationRewardData[_marketAddress].plotIncentive);
      ethDepositedInPool = ethDepositedInPool.add(marketCreationRewardData[_marketAddress].ethIncentive);
      delete marketCreationRewardData[_marketAddress].plotIncentive;
      delete marketCreationRewardData[_marketAddress].ethIncentive;
      _transferAsset(plotTokenAddress, _marketAddress, plotDepositedInPool);
      IMarket(_marketAddress).resolveDispute.value(ethDepositedInPool)(true, _result);
      emit DisputeResolved(_marketAddress, true);
      _transferAsset(plotTokenAddress, staker, stakedAmount);
    }

    /**
    * @dev function to reward user for initiating market creation calls as per the new incetive calculations
    */
    function claimCreationRewardV2(uint256 _maxRecords) external {
      uint256 pendingPLOTReward = marketCreationRewardUserData[msg.sender].incentives;
      require(pendingPLOTReward > 0);
      delete marketCreationRewardUserData[msg.sender].incentives;
      (uint256 ethIncentive, uint256 plotIncentive) = _getRewardPoolIncentives(_maxRecords);
      pendingPLOTReward = pendingPLOTReward.add(plotIncentive);
      _transferAsset(address(plotToken), msg.sender, pendingPLOTReward);
      _transferAsset(ETH_ADDRESS, msg.sender, ethIncentive);
      emit ClaimedMarketCreationReward(msg.sender, ethIncentive, pendingPLOTReward);
    }

    /**
    * @dev internal function to calculate market reward pool share incentives for market creator
    */
    function _getRewardPoolIncentives(uint256 _maxRecords) internal returns(uint256 ethIncentive, uint256 plotIncentive) {
      MarketCreationRewardUserData storage rewardData = marketCreationRewardUserData[msg.sender];
      uint256 len = rewardData.marketsCreated.length;
      uint lastClaimed = len;
      uint256 count;
      uint256 i;
      for(i = rewardData.lastClaimedIndex;i < len && count < _maxRecords; i++) {
        MarketCreationRewardData storage marketData = marketCreationRewardData[rewardData.marketsCreated[i]];
        if(marketData.ethIncentive > 0 || marketData.plotIncentive > 0) {
          ( , , , , , , , , uint _predictionStatus) = IMarket(rewardData.marketsCreated[i]).getData();
          if(_predictionStatus == uint(IMarket.PredictionStatus.Settled)) {
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
      }
      if(lastClaimed == len) {
        lastClaimed = i;
      }
      rewardData.lastClaimedIndex = lastClaimed;
    }

    /**
    * @dev Emits the MarketResult event.
    * @param _totalReward The amount of reward to be distribute.
    * @param winningOption The winning option of the market.
    * @param closeValue The closing value of the market currency.
    */
    function callMarketResultEventAndSetIncentives(uint256[] calldata _totalReward, uint256[] calldata marketCreatorIncentive, uint256 winningOption, uint256 closeValue, uint _roundId) external {
      require(isMarket(msg.sender));
      marketCreationRewardData[msg.sender].plotIncentive = marketCreatorIncentive[0];
      marketCreationRewardData[msg.sender].ethIncentive = marketCreatorIncentive[1];
      emit MarketResult(msg.sender, _totalReward, winningOption, closeValue, _roundId);
    }
    

    /**
    * @dev function to update address parameters of market
    */
    function updateConfigAddressParameters(bytes8 code, address payable value) external onlyAuthorizedToGovern {
      if(code == "GASAGG") { // Incentive to be distributed to user for market creation
        clGasPriceAggregator = IChainLinkOracle(value);
      } else {
        marketUtility.updateAddressParameters(code, value);
      }
    }

    /**
    * @dev function to update integer parameters of market
    */
    function updateUintParameters(bytes8 code, uint256 value) external onlyAuthorizedToGovern {
      if(code == "MCRINC") { // Incentive to be distributed to user for market creation
        marketCreationIncentive = value;
      } else if(code == "MAXGAS") { // Maximum gas upto which is considered while calculating market creation incentives
        maxGasPrice = value;
      } else if(code == "MAXRPSP") { // Max Reward Pool percent for market creator
        maxRewardPoolPercForMC = value;
      } else if(code == "MINRPSP") { // Min Reward Pool percent for market creator
        minRewardPoolPercForMC = value;
      } else if(code == "PSFRPS") { // Reward Pool percent for market creator
        plotStakeForRewardPoolShare = value;
      } else if(code == "RPSTH") { // Reward Pool percent for market creator
        rewardPoolShareThreshold = value;
      } else {
        marketUtility.updateUintParameters(code, value);
      }
    }

    /**
    * @dev Get uint config parameters
    */
    function getUintParameters(bytes8 code) external view returns(bytes8 codeVal, uint256 value) {
      codeVal = code;
      if(code == "MCRINC") {
        value = marketCreationIncentive;
      } else if(code == "MAXGAS") {
        value = maxGasPrice;
      } else if(code == "MAXRPSP") {
        value = maxRewardPoolPercForMC;
      } else if(code == "MINRPSP") {
        value = minRewardPoolPercForMC;
      } else if(code == "PSFRPS") {
        value = plotStakeForRewardPoolShare;
      } else if(code == "RPSTH") {
        value = rewardPoolShareThreshold;
      }
    }

}
