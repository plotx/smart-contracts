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

contract MarketRegistryNew is MarketRegistry {

    IChainLinkOracle internal clGasPriceAggregator;

    mapping(address => uint256) userIncentives;
    event MarketCreationReward(address indexed createdBy, uint256 plotIncentive, uint256 gasUsed, uint256 gasCost);
    event ClaimedCreationReward(address indexed user, uint256 plotIncentive);

    /**
    * @dev Set initial market creation incentive params.
    */
    function setChainLinkGasPriceAggregator(address _clGasPriceAggregator) public {
      require(address(clGasPriceAggregator) == address(0));
      clGasPriceAggregator = IChainLinkOracle(_clGasPriceAggregator);
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
      // userData[msg.sender].marketsCreated++;
      uint256 gasUsed = gasProvided - gasleft();
      _calculateIncentive(gasUsed, _marketStartTime);
    }

    function _calculateIncentive(uint256 gasUsed, uint256 _marketStartTime) internal{
      //Adding buffer gas for below calculations
      gasUsed = gasUsed + 38500;
      uint256 gasCost = gasUsed.mul(_checkGasPrice());
      (, uint256 incentive) = marketUtility.getValueAndMultiplierParameters(ETH_ADDRESS, gasCost);
      userIncentives[msg.sender] = userIncentives[msg.sender].add(incentive);
      emit MarketCreationReward(msg.sender, incentive, gasUsed, gasCost);
    }

    function _checkGasPrice() internal view returns(uint256) {
      uint fastGas = uint(clGasPriceAggregator.latestAnswer());
      uint fastGasWithMaxDeviation = fastGas.mul(125).div(100);
      return Math.max(Math.min(tx.gasprice,fastGasWithMaxDeviation), fastGas);
    }


    /**
    * @dev function to reward user for initiating market creation calls as per the new incetive calculations
    */
    function claimCreationRewardV2() external {
      uint256 pendingPLOTReward = userIncentives[msg.sender];
      require(pendingPLOTReward > 0);
      require(plotToken.balanceOf(address(this)) > pendingPLOTReward);
      _transferAsset(address(plotToken), msg.sender, pendingPLOTReward);
      emit ClaimedCreationReward(msg.sender, pendingPLOTReward);
      delete userIncentives[msg.sender];
    }

}
