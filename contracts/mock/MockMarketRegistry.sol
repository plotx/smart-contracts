pragma solidity 0.5.7;

import "../MarketRegistry.sol";

contract MockMarketRegistry is MarketRegistry {

  function transferPlot(address payable _to, uint _amount) external {
    _transferAsset(address(plotToken), _to, _amount);
  }
}