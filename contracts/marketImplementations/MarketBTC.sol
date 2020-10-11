pragma solidity 0.5.7;

import "../Market.sol";
contract MarketBTC is Market {

    bool constant isChainlinkFeed = true;
    address constant marketFeedAddress = 0x5e2aa6b66531142bEAB830c385646F97fa03D80a;
    bytes32 public constant marketCurrency = "BTC/USDT";

}
