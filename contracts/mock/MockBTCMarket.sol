pragma solidity 0.5.7;

import "../marketImplementations/MarketBTC.sol";

contract MockBTCMarket is MarketBTC {

	mapping(uint => uint) optionPrices;

	bool public mockFlag;

	function setMockPriceFlag(bool _flag) public {
		mockFlag = _flag;
	}

  function setOptionRangesPublic(uint _midRangeMin, uint _midRangeMax) public{
      marketData.neutralMinValue = uint64(_midRangeMin*1e8);
      marketData.neutralMaxValue = uint64(_midRangeMax*1e8);
      // optionsAvailable[1].minValue = 0;
      // optionsAvailable[1].maxValue = _midRangeMin.sub(1);
      // optionsAvailable[2].minValue = _midRangeMin;
      // optionsAvailable[2].maxValue = _midRangeMax;
      // optionsAvailable[3].minValue = _midRangeMax.add(1);
      // optionsAvailable[3].maxValue = ~uint256(0) ;
    }

    function initiate(uint64 _startTime, uint64 _predictionTime, uint64 _minValue, uint64 _maxValue) public payable {
      mockFlag = true;
      super.initiate(_startTime, _predictionTime, _minValue, _maxValue);
    }

    /**
    * @dev Calculate the result of market.
    * @param _value The current price of market currency.
    */
    function calculatePredictionResult(uint _value) public {
      _postResult(_value, 0);
    }

    function setOptionPrice(uint _option, uint _price) public {
    	optionPrices[_option] = _price;
    }

}