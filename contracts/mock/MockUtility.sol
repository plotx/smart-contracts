pragma solidity 0.5.7;

import "../MarketUtility.sol";

contract MockMarketUtility is MarketUtility {
    function setInitialCummulativePrice() public {
        _setCummulativePrice();
    }
}