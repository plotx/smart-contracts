pragma solidity 0.5.7;

import "../Market.sol";

contract DummyMockMarket is Market {

	mapping(uint => uint) optionPrices;

	bool public mockFlag;

	function setMockPriceFlag(bool _flag) public {
		mockFlag = _flag;
	}

  function dummyFunction() public view returns(uint)
  {

    return 123;
  }

    /**
    * @dev Calculate the result of market.
    * @param _value The current price of market currency.
    */
    function calculatePredictionResult(uint _value) public {
      _postResult(_value, 0);
    }
}