pragma solidity 0.5.7;

import "../Market.sol";

contract MockMarket is Market {

	mapping(uint => uint) optionPrices;

	bool public mockFlag;

	function setMockPriceFlag(bool _flag) public {
		mockFlag = _flag;
	}

	function initiate(uint _startTime, uint _predictionTime, uint _settleTime, uint _minValue, uint _maxValue, bytes32 _marketCurrency,address _marketFeedAddress, string memory _oraclizeType, string memory _oraclizeSource, bool _isERCToken) public payable {
      mockFlag = true;
      pl = IPlotus(msg.sender);
      marketConfig = MarketConfig(pl.marketConfig());
      tokenController = ITokenController(pl.tokenController());
      token = tokenController.token();
      startTime = _startTime;
      marketCurrency = _marketCurrency;
      marketFeedAddress = _marketFeedAddress;
      isMarketCurrencyERCToken = _isERCToken;
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

    /**
    * @dev Exchanges the commission after closing the market.
    */
    function exchangeCommission() external {
      uint256 _uniswapDeadline;
      uint256 _lotPurchasePerc;
      (_lotPurchasePerc, _uniswapDeadline) = marketConfig.getPurchasePercAndDeadline();
      if(commissionAmount[token] > 0){
        bool burned = tokenController.burnCommissionTokens(commissionAmount[token]);
        if(!burned) {
          _transferAsset(token, address(pl), commissionAmount[token]);
        }
      } 
      if(commissionAmount[ETH_ADDRESS] > 0) {
        uint256 _lotPurchaseAmount = (commissionAmount[ETH_ADDRESS]).sub((commissionAmount[ETH_ADDRESS]).mul(_lotPurchasePerc).div(100));
        uint256 _amountToPool = (commissionAmount[ETH_ADDRESS]).sub(_lotPurchasePerc);
        _transferAsset(ETH_ADDRESS, address(pl), _amountToPool);
        uint256 _tokenOutput;
        address[] memory path;
        address _router;
        (_router , path) = marketConfig.getETHtoTokenRouterAndPath();
        IUniswapV2Router02 router = IUniswapV2Router02(_router);
        uint[] memory output = router.swapExactETHForTokens.value(_lotPurchaseAmount)(1, path, address(this), _uniswapDeadline);
        _tokenOutput = output[1];
        incentiveToDistribute[token] = incentiveToDistribute[token].add(_tokenOutput);
      }
      commissionExchanged = true;
    }

}