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

import "./AllMarkets.sol";

contract AllMarketsV2 is AllMarkets {

		/**
     * @dev Changes the master address and update it's instance
     */
    function setMasterAddress() public {
    }

    /**
    * @dev Start the initial market and set initial variables.
    */
    function addInitialMarketTypesAndStart(address _marketCreationRewards,address _ethAddress, address _marketUtility, uint32 _marketStartTime, address _ethFeed, address _btcFeed) external {
    }

    /**
    * @dev Create the market.
    * @param _marketCurrencyIndex The index of market currency feed
    * @param _marketTypeIndex The time duration of market.
    */
    function createMarket(uint32 _marketCurrencyIndex,uint32 _marketTypeIndex) public payable {
    }

    /**
    * @dev Create the market and settle the prenultimate market.
    * @param _marketCurrencyIndex The index of market currency feed
    * @param _marketTypeIndex The time duration of market.
    * @param _roundId The chainlink round id of the penultimate market, with the round updated time closest to market settlement time
    */
    function createMarketAndSettle(uint32 _marketCurrencyIndex,uint32 _marketTypeIndex, uint80 _roundId) public {
    	uint256 gasProvided = gasleft();
      require(!marketCreationPaused && !marketTypeArray[_marketTypeIndex].paused);
      _closePreviousMarketV2( _marketTypeIndex, _marketCurrencyIndex, _roundId);
      marketUtility.update();
      uint32 _startTime = calculateStartTimeForMarket(_marketCurrencyIndex, _marketTypeIndex);
      (uint64 _minValue, uint64 _maxValue) = marketUtility.calculateOptionRange(marketTypeArray[_marketTypeIndex].optionRangePerc, marketCurrencies[_marketCurrencyIndex].decimals, marketCurrencies[_marketCurrencyIndex].roundOfToNearest, marketCurrencies[_marketCurrencyIndex].marketFeed);
      uint64 _marketIndex = uint64(marketBasicData.length);
      marketBasicData.push(MarketBasicData(_marketTypeIndex,_marketCurrencyIndex,_startTime, marketTypeArray[_marketTypeIndex].predictionTime,_minValue,_maxValue));
      marketDataExtended[_marketIndex].ethCommission = commissionPercGlobal.ethCommission;
      marketDataExtended[_marketIndex].plotCommission = commissionPercGlobal.plotCommission;
      (marketCreationData[_marketTypeIndex][_marketCurrencyIndex].penultimateMarket, marketCreationData[_marketTypeIndex][_marketCurrencyIndex].latestMarket) =
       (marketCreationData[_marketTypeIndex][_marketCurrencyIndex].latestMarket, _marketIndex);
      emit MarketQuestion(_marketIndex, marketCurrencies[_marketCurrencyIndex].currencyName, _marketTypeIndex, _startTime, marketTypeArray[_marketTypeIndex].predictionTime, _minValue, _maxValue);
      marketCreationRewards.calculateMarketCreationIncentive(msg.sender, gasProvided - gasleft(), _marketIndex);
    }

    /**
    * @dev Internal function to settle the previous market 
    */
    function _closePreviousMarket(uint64 _marketTypeIndex, uint64 _marketCurrencyIndex) internal {
    }

    /**
    * @dev Internal function to settle the previous market 
    */
    function _closePreviousMarketV2(uint64 _marketTypeIndex, uint64 _marketCurrencyIndex, uint80 _roundId) internal {
    	uint64 currentMarket = marketCreationData[_marketTypeIndex][_marketCurrencyIndex].latestMarket;
      if(currentMarket != 0 && _roundId > 0) {
        require(marketStatus(currentMarket) >= PredictionStatus.InSettlement);
        uint64 penultimateMarket = marketCreationData[_marketTypeIndex][_marketCurrencyIndex].penultimateMarket;
        if(penultimateMarket > 0 && now >= marketSettleTime(penultimateMarket)) {
          settleMarketByRoundId(penultimateMarket, _roundId);
        }
      }
    }

    /**
    * @dev Settle the market, setting the winning option
    */
    function settleMarket(uint256 _marketId) public {
    }

    /**
    * @dev Settle the market, setting the winning option
    */
    function settleMarketByRoundId(uint256 _marketId, uint80 _roundId) public {
      if(marketStatus(_marketId) == PredictionStatus.InSettlement) {
        (uint256 _value, uint256 _roundIdUsed) = marketUtility.getSettlemetPriceByRoundId(marketCurrencies[marketBasicData[_marketId].currency].marketFeed, marketSettleTime(_marketId), _roundId);
        _postResult(_value, _roundIdUsed, _marketId);
      }
    }
}