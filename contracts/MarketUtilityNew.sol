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

  using SafeMath64 for uint64;

  function setAuthorizedAddress(address _allMarketsContract) external {
    require(msg.sender == initiater);
    authorizedAddress = _allMarketsContract;
  }

  function calculateOptionRange(uint64 _marketCurrencyIndex,uint64 _marketTypeIndex, uint _optionRangePerc, uint64 _decimals, uint8 _roundOfToNearest, address _marketFeed) external view returns(uint64 _minValue, uint64 _maxValue) {
    uint currentPrice = getAssetPriceUSD(_marketFeed);
    uint optionRangePerc = currentPrice.mul(_optionRangePerc.div(2)).div(10000);
    _minValue = uint64((ceil(currentPrice.sub(optionRangePerc).div(_roundOfToNearest), 10**_decimals)).mul(_roundOfToNearest));
    _maxValue = uint64((ceil(currentPrice.add(optionRangePerc).div(_roundOfToNearest), 10**_decimals)).mul(_roundOfToNearest));
  }

  function calculatePredictionPoints(bool multiplierApplied, uint _marketId, uint _prediction, uint _predictionStake, address _asset, uint64 totalPredictionPoints, uint64 predictionPointsOnOption) external view returns(uint64 predictionPoints, bool isMultiplierApplied) {
      uint _stakeValue = getAssetValueETH(_asset, _predictionStake.mul(1e15));
      if(_stakeValue < minPredictionAmount || _stakeValue > maxPredictionAmount) {
        return (0, isMultiplierApplied);
      }
      uint64 _optionPrice = getOptionPrice(totalPredictionPoints, predictionPointsOnOption);
      predictionPoints = uint64(_stakeValue.div(1e15).mul(1e3)).div(_optionPrice);
      if(!multiplierApplied) {
        uint256 _predictionPoints;
        (_predictionPoints, isMultiplierApplied) = checkMultiplier(_asset, msg.sender, _predictionStake.mul(1e15),  predictionPoints, _stakeValue);
        predictionPoints = uint64(_predictionPoints);
      }
    }

    function getOptionPrice(uint64 totalPredictionPoints, uint64 predictionPointsOnOption) public view returns(uint64 _optionPrice) {
      if(totalPredictionPoints > 0) {
        _optionPrice = (predictionPointsOnOption.mul(100)).div(totalPredictionPoints) + 100;
      } else {
        _optionPrice = 100;
      }
    }

    function ceil(uint256 a, uint256 m) internal pure returns (uint256) {
        return ((a + m - 1) / m) * m;
    }

}