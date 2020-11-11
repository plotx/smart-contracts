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

import "./MarketUtility.sol";

contract MarketUtilityNew is MarketUtility {
  /**
    * @dev Calculate the option price for given params
    * params
    * 0 _option
    * 1 neutralMinValue
    * 2 neutralMaxValue
    * 3 startTime
    * 4 expireTime
    * 5 total positions
    * 6 positions OnOption
    */
    function calculateOptionPrice(uint[] memory params, address marketFeedAddress) public view returns(uint _optionPrice) {
      // uint _totalStaked = params[5].add(getAssetValueETH(plotToken, params[6]));
      uint _totalStaked = params[5];
      uint _assetStakedOnOption = params[6];
      _optionPrice = 0;
      uint currentPriceOption = 0;
      uint256 currentPrice = getAssetPriceUSD(
          marketFeedAddress
      );
      uint stakeWeightage = STAKE_WEIGHTAGE;
      uint predictionWeightage = 100 - stakeWeightage;
      uint predictionTime = params[4].sub(params[3]);
      uint minTimeElapsed = (predictionTime).div(minTimeElapsedDivisor);
      if(now > params[4]) {
        return 0;
      }
      if(_totalStaked > STAKE_WEIGHTAGE_MIN_AMOUNT) {
        _optionPrice = (_assetStakedOnOption).mul(1000000).div(_totalStaked.mul(stakeWeightage));
      }

      uint maxDistance;
      if(currentPrice < params[1]) {
        currentPriceOption = 1;
        maxDistance = 2;
      } else if(currentPrice > params[2]) {
        currentPriceOption = 3;
        maxDistance = 2;
      } else {
        currentPriceOption = 2;
        maxDistance = 1;
      }
      uint distance = _getAbsoluteDifference(currentPriceOption, params[0]);
      uint timeElapsed = now > params[3] ? now.sub(params[3]) : 0;
      timeElapsed = timeElapsed > minTimeElapsed ? timeElapsed: minTimeElapsed;
      _optionPrice = _optionPrice.add((((maxDistance+1).sub(distance)).mul(1000000).mul(timeElapsed)).div((maxDistance+1).mul(predictionWeightage).mul(predictionTime)));
      _optionPrice = _optionPrice.div(100);
    }

    /**
    * @dev Calculate the prediction value, passing all the required params
    * params index
    * 0 _prediction
    * 1 neutralMinValue
    * 2 neutralMaxValue
    * 3 startTime
    * 4 expireTime
    * 5 totalStakedETH
    * 6 totalStakedToken
    * 7 ethStakedOnOption
    * 8 plotStakedOnOption
    * 9 _stake
    * 10 _leverage
    */
    function calculatePredictionValue(uint[] memory params, address asset, address user, address marketFeedAddress, bool _checkMultiplier) public view returns(uint _predictionValue, bool _multiplierApplied) {
      uint _stakeValue = getAssetValueETH(asset, params[7]);
      if(_stakeValue < minPredictionAmount || _stakeValue > maxPredictionAmount) {
        return (_predictionValue, _multiplierApplied);
      }
      uint optionPrice;
      
      optionPrice = calculateOptionPrice(params, marketFeedAddress);
      _predictionValue = _stakeValue.mul(positionDecimals).div(optionPrice);
      if(_checkMultiplier) {
        return checkMultiplier(asset, user, params[7],  _predictionValue, _stakeValue);
      }
      return (_predictionValue, _multiplierApplied);
    }
}