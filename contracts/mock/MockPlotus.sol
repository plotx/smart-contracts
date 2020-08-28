pragma solidity 0.5.7;

import "../Plotus.sol";

contract MockPlotus is Plotus {

	mapping(address => bytes32) marketId;
	
  function initiatePlotus(address _marketImplementation, address _marketConfig, address _plotusToken) public {
    require(!plotxInitialized);
    plotxInitialized = true;
    masterAddress = msg.sender;
    marketImplementation = _marketImplementation;
    plotusToken = IToken(_plotusToken);
    tokenController = ms.getLatestAddress("TC");
    markets.push(address(0));
    marketConfig = IConfig(_marketConfig);
    marketConfig.setAuthorizedAddres();    
  }

  function startInitialMarketTypesAndStart(uint _marketStartTime, address _ethPriceFeed, address _plotPriceFeed, uint256[] memory _initialMinOptionETH, uint256[] memory _initialMaxOptionETH, uint256[] memory _initialMinOptionPLOT, uint256[] memory _initialMaxOptionPLOT) public payable {
    marketCurrencies.push(MarketCurrency(_ethPriceFeed, "ETH", "QmPKgmEReh6XTv23N2sbeCYkFw7egVadKanmBawi4AbD1f", true));
    marketCurrencies.push(MarketCurrency(_plotPriceFeed, "PLOT", "QmPKgmEReh6XTv23N2sbeCYkFw7egVadKanmBawi4AbD1f", false));

    marketTypes.push(MarketTypeData(1 hours, 2 hours, 20));
    marketTypes.push(MarketTypeData(24 hours, 2 days, 50));
    marketTypes.push(MarketTypeData(7 days, 14 days, 100));
    // for(uint256 j = 0;j < marketCurrencies.length; j++) {
        for(uint256 i = 0;i < marketTypes.length; i++) {
            // marketTypeCurrencyStartTime[i][0] = _startTime;
            // marketTypeCurrencyStartTime[i][1] = _startTime;
            _createMarket(i, 0, _initialMinOptionETH[i], _initialMaxOptionETH[i], _marketStartTime);
            _createMarket(i, 1, _initialMinOptionPLOT[i], _initialMaxOptionPLOT[i], _marketStartTime);
        }
    // }
  }

  function _createMarket(uint256 _marketType, uint256 _marketCurrencyIndex, uint256 _minValue, uint256 _maxValue, uint256 _marketStartTime) internal {
      require(!marketCreationPaused);
      MarketTypeData memory _marketTypeData = marketTypes[_marketType];
      MarketCurrency memory _marketCurrencyData = marketCurrencies[_marketCurrencyIndex];
      address payable _market = _generateProxy(marketImplementation);
      isMarket[_market] = true;
      markets.push(_market);
      IMarket(_market).initiate(_marketStartTime, _marketTypeData.predictionTime, _marketTypeData.settleTime, _minValue, _maxValue, _marketCurrencyData.currencyName, _marketCurrencyData.currencyFeedAddress, _marketCurrencyData.isChainlinkFeed);
      emit MarketQuestion(_market, _marketCurrencyData.currencyName, _marketType, _marketStartTime);
      _marketStartTime = _marketStartTime.add(_marketTypeData.predictionTime);
      _initiateProvableQuery(_marketType, _marketCurrencyIndex, _marketCurrencyData.marketCreationHash, 800000, _market, _marketStartTime, _marketTypeData.predictionTime);
      // bytes32 _oraclizeId = provable_query(_marketStartTime, "computation", _marketCurrencyData.marketCreationHash, uint2str(_marketTypeData.predictionTime), 800000);
      // marketOracleId[_oraclizeId] = MarketOraclize(_market, _marketType, _marketCurrencyIndex, _marketStartTime);
      // marketTypeCurrencyOraclize[_marketType][_marketCurrencyIndex] = _oraclizeId;
    }

  function _initiateProvableQuery(uint256 _marketType, uint256 _marketCurrencyIndex, string memory _marketCreationHash, uint256 _gasLimit, address _previousMarket, uint256 _marketStartTime, uint256 _predictionTime) internal {
  bytes32 _oraclizeId = keccak256(abi.encodePacked(_marketType, _marketCurrencyIndex));
  marketOracleId[_oraclizeId] = MarketOraclize(_previousMarket, _marketType, _marketCurrencyIndex, _marketStartTime);
  marketTypeCurrencyOraclize[_marketType][_marketCurrencyIndex] = _oraclizeId;
  marketId[_previousMarket] = _oraclizeId;
  }

  /**
  * @dev callback for result declaration of market.
  * @param myid The orcalize market result id.
  * @param result The current price of market currency.
  */
  function __callback(bytes32 myid, string memory result) public {
      // require(msg.sender == provable_cbAddress());
      //Check oraclise address
      strings.slice memory s = result.toSlice();
      strings.slice memory delim = "-".toSlice();
      uint[] memory parts = new uint[](s.count(delim) + 1);
      for (uint i = 0; i < parts.length; i++) {
          parts[i] = parseInt(s.split(delim).toString());
      }
      if(marketOracleId[myid].marketAddress != address(0)) {
        IMarket(marketOracleId[myid].marketAddress).exchangeCommission();
      }
      _createMarket(marketOracleId[myid].marketType, marketOracleId[myid].marketCurrencyIndex, parts[0], parts[1], marketOracleId[myid].startTime);
      // addNewMarkets(marketOracleId[myid], parseInt(result));
      delete marketOracleId[myid];
    }

  function getMarketOraclizeId(address _marketAddress) public view returns(bytes32){
  	return marketId[_marketAddress];
  }
}