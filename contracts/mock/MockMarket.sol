pragma solidity 0.5.7;

import "../Market.sol";

contract MockMarket is Market {
	function initiate(uint _startTime, uint _predictionTime, uint _settleTime, uint _minValue, uint _maxValue, bytes32 _marketCurrency,address _marketFeedAddress, string memory _oraclizeType, string memory _oraclizeSource) public payable {
      pl = IPlotus(msg.sender);
      marketConfig = MarketConfig(pl.marketConfig());
      tokenController = ITokenController(pl.tokenController());
      token = tokenController.token();
      startTime = _startTime;
      marketCurrency = _marketCurrency;
      marketFeedAddress = _marketFeedAddress;
      // optionsAvailable[0] = option(0,0,0,0,0,address(0));
      uint _coolDownTime;
      uint _rate;
      (incentiveTokens, _coolDownTime, _rate, commissionPerc[ETH_ADDRESS], commissionPerc[token]) = marketConfig.getMarketInitialParams();

      rate = _rate;
      predictionTime = _predictionTime; 
      expireTime = startTime.add(_predictionTime);
      settleTime = startTime.add(_settleTime);
      marketCoolDownTime = settleTime.add(_coolDownTime);
      require(expireTime > now);
      setOptionRanges(_minValue,_maxValue);
    }

    /**
    * @dev Calculate the result of market.
    * @param _value The current price of market currency.
    */
    function calculatePredictionResult(uint _value) public {
      _postResult(_value);
    }

}