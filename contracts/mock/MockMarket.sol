pragma solidity 0.5.7;

import "../Market.sol";

contract MockMarket is Market {

	mapping(uint => uint) optionPrices;

	bool public mockFlag;

	function setMockPriceFlag(bool _flag) public {
		mockFlag = _flag;
	}

  function setOptionRangesPublic(uint _midRangeMin, uint _midRangeMax) public{
      _midRangeMin = _midRangeMin*1e8;
      _midRangeMax = _midRangeMax*1e8;
      optionsAvailable[1].minValue = 0;
      optionsAvailable[1].maxValue = _midRangeMin.sub(1);
      optionsAvailable[2].minValue = _midRangeMin;
      optionsAvailable[2].maxValue = _midRangeMax;
      optionsAvailable[3].minValue = _midRangeMax.add(1);
      optionsAvailable[3].maxValue = ~uint256(0) ;
    }

    function initiate(uint _startTime, uint _predictionTime, uint _settleTime, uint _minValue, uint _maxValue, bytes32 _marketCurrency,address _marketFeedAddress, bool _isChainlinkFeed) public payable {
      mockFlag = true;
      super.initiate(_startTime, _predictionTime, _settleTime, _minValue, _maxValue, _marketCurrency, _marketFeedAddress, _isChainlinkFeed);
    }

    /**
    * @dev Calculate the result of market.
    * @param _value The current price of market currency.
    */
    function calculatePredictionResult(uint _value) public {
      _postResult(_value);
    }

    function setOptionPrice(uint _option, uint _price) public {
    	optionPrices[_option] = _price;
    }
    /**
    * @dev Calculates the price of available option ranges.
    * @param _option The number of option ranges.
    * @param _totalStaked The total staked amount on options.
    * @param _assetStakedOnOption The asset staked on options.
    * @return _optionPrice uint representing the price of option range.
    */
    function _calculateOptionPrice(uint _option, uint _totalStaked, uint _assetStakedOnOption) internal view returns(uint _optionPrice) {
      if(mockFlag) {
      	return optionPrices[_option];
      }
      return super._calculateOptionPrice(_option, _totalStaked, _assetStakedOnOption);
    }

}