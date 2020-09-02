pragma solidity 0.5.7;

import "../MarketRegistry.sol";

contract MockPlotus is MarketRegistry {

	mapping(address => bytes32) marketId;
  uint256 blockId;

  function _initiateProvableQuery(uint256 _marketType, uint256 _marketCurrencyIndex, string memory _marketCreationHash, uint256 _gasLimit, address _previousMarket, uint256 _marketStartTime, uint256 _predictionTime) internal {
    bytes32 _oraclizeId = keccak256(abi.encodePacked(_marketType, _marketCurrencyIndex));
    // bool flag;
    marketOracleId[_oraclizeId] = MarketOraclize(_previousMarket, _marketType, _marketCurrencyIndex, _marketStartTime);
    marketTypeCurrencyOraclize[_marketType][_marketCurrencyIndex] = _oraclizeId;
    marketId[_previousMarket] = _oraclizeId;
    // if(marketOracleId[_oraclizeId].marketAddress == address(0)) {
    //   flag = true;
    // }
    if(_previousMarket  == address(0)) {
      _createMarket(_marketType, _marketCurrencyIndex, 900000000000, 1000000000000, _marketStartTime);
    }
  }

  function getMarketOraclizeId(address _marketAddress) public view returns(bytes32){
  	return marketId[_marketAddress];
  }

  function exchangeCommission(address _marketAddress) external {
    IMarket(_marketAddress).exchangeCommission();
  }
}