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

import "./Market.sol";

contract MarketNew is Market {

  /**
  * @dev Check if threshold reached for reward pool share percent for market creator.
  * Calculate total leveraged amount staked in market value in ETH
  * @param _rewardPoolShareThreshold Threshold for reward pool share
  */
  function _checkIfThresholdReachedForRPS(uint256 _rewardPoolShareThreshold) internal view returns(bool) {
    uint256 ethStaked;
    uint256 plotStaked;
    for(uint256 i = 1; i<= totalOptions;i++) {
      ethStaked = ethStaked.add(optionsAvailable[i].assetLeveraged[ETH_ADDRESS]);
      plotStaked = plotStaked.add(optionsAvailable[i].assetLeveraged[plotToken]);
    }
    ( , uint riskPercentage, , ) = marketUtility.getBasicMarketDetails();
    ethStaked = _calculatePercentage(riskPercentage, ethStaked, 100);
    plotStaked = _calculatePercentage(riskPercentage, plotStaked, 100);
    plotStaked = marketUtility.getAssetValueETH(plotToken, plotStaked);
    return (plotStaked.add(ethStaked) > _rewardPoolShareThreshold);
  }

  /**
  * @dev Calculate the result of market.
  * @param _value The current price of market currency.
  */
  function _postResult(uint256 _value, uint256 _roundId) internal {
    require(now >= marketSettleTime(),"Time not reached");
    require(_value > 0,"value should be greater than 0");
    uint riskPercentage;
    ( , riskPercentage, , ) = marketUtility.getBasicMarketDetails();
    if(predictionStatus != PredictionStatus.InDispute) {
      marketSettleData.settleTime = uint64(now);
    } else {
      delete marketSettleData.settleTime;
    }
    predictionStatus = PredictionStatus.Settled;
    if(_value < marketData.neutralMinValue) {
      marketSettleData.WinningOption = 1;
    } else if(_value > marketData.neutralMaxValue) {
      marketSettleData.WinningOption = 3;
    } else {
      marketSettleData.WinningOption = 2;
    }
    (uint256 rewardPoolSharePerc, uint256 rewardPoolShareThreshold) = marketRegistry.getMarketCreatorRPoolShareParams(address(this));
    bool _thresholdReached = _checkIfThresholdReachedForRPS(rewardPoolShareThreshold);
    uint[] memory totalReward = new uint256[](2);
    uint[] memory marketCreatorIncentive = new uint256[](2);
    if(optionsAvailable[marketSettleData.WinningOption].assetStaked[ETH_ADDRESS] > 0 ||
      optionsAvailable[marketSettleData.WinningOption].assetStaked[plotToken] > 0
    ){
      for(uint i=1;i <= totalOptions;i++){
        if(i!=marketSettleData.WinningOption) {
          uint256 leveragedAsset = _calculatePercentage(riskPercentage, optionsAvailable[i].assetLeveraged[plotToken], 100);
          totalReward[0] = totalReward[0].add(leveragedAsset);
          leveragedAsset = _calculatePercentage(riskPercentage, optionsAvailable[i].assetLeveraged[ETH_ADDRESS], 100);
          totalReward[1] = totalReward[1].add(leveragedAsset);
        }
      }
      if(_thresholdReached) {
        marketCreatorIncentive[0] = _calculatePercentage(rewardPoolSharePerc, totalReward[0], 10000);
        marketCreatorIncentive[1] = _calculatePercentage(rewardPoolSharePerc, totalReward[1], 10000);
      }
      totalReward[0] = totalReward[0].sub(marketCreatorIncentive[0]);
      totalReward[1] = totalReward[1].sub(marketCreatorIncentive[1]);
      rewardToDistribute = totalReward;
    } else {
      for(uint i=1;i <= totalOptions;i++){
        uint256 leveragedAsset = _calculatePercentage(riskPercentage, optionsAvailable[i].assetLeveraged[plotToken], 100);
        tokenAmountToPool = tokenAmountToPool.add(leveragedAsset);
        leveragedAsset = _calculatePercentage(riskPercentage, optionsAvailable[i].assetLeveraged[ETH_ADDRESS], 100);
        ethAmountToPool = ethAmountToPool.add(leveragedAsset);
      }
      if(_thresholdReached) {
        marketCreatorIncentive[0] = _calculatePercentage(rewardPoolSharePerc, tokenAmountToPool, 10000);
        marketCreatorIncentive[1] = _calculatePercentage(rewardPoolSharePerc, ethAmountToPool, 10000);
        tokenAmountToPool = tokenAmountToPool.sub(marketCreatorIncentive[0]);
        ethAmountToPool = ethAmountToPool.sub(marketCreatorIncentive[1]);
      }
    }
    _transferAsset(ETH_ADDRESS, address(marketRegistry), ethAmountToPool.add(ethCommissionAmount).add(marketCreatorIncentive[1]));
    _transferAsset(plotToken, address(marketRegistry), tokenAmountToPool.add(plotCommissionAmount).add(marketCreatorIncentive[0]));
    delete ethCommissionAmount;
    delete plotCommissionAmount;
    marketRegistry.callMarketResultEventAndSetIncentives(rewardToDistribute, marketCreatorIncentive, marketSettleData.WinningOption, _value, _roundId);
  }
}
