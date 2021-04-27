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

import "./MarketUtilityV2.sol";

contract MarketUtilityV2_1 is MarketUtilityV2 {
    /**
     * @dev Get price of provided feed address
     * @param _currencyFeedAddress  Feed Address of currency on which market options are based on
     * @return Current price of the market currency
     **/
    function getSettlemetPriceByRoundId(
        address _currencyFeedAddress,
        uint256 _settleTime,
        uint80 _roundId
    ) public view returns (uint256 latestAnswer, uint256 roundId) {
        uint80 roundIdToCheck;
        uint256 currentRoundTime;
        int256 currentRoundAnswer;
        (roundIdToCheck, currentRoundAnswer, , currentRoundTime, )= IChainLinkOracle(_currencyFeedAddress).latestRoundData();
        if(roundIdToCheck == _roundId) {
          if(currentRoundTime <= _settleTime) {
            return (uint256(currentRoundAnswer), roundIdToCheck);
          }
        } else {
          (roundIdToCheck, currentRoundAnswer, , currentRoundTime, )= IChainLinkOracle(_currencyFeedAddress).getRoundData(_roundId + 1);
          require(currentRoundTime > _settleTime);
          roundIdToCheck = _roundId + 1;
        }
        while(currentRoundTime > _settleTime) {
            roundIdToCheck--;
            (roundIdToCheck, currentRoundAnswer, , currentRoundTime, )= IChainLinkOracle(_currencyFeedAddress).getRoundData(roundIdToCheck);
        }
        return
            (uint256(currentRoundAnswer), roundIdToCheck);
    }
}