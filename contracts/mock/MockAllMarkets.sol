pragma solidity 0.5.7;

import "../AllMarkets.sol";

contract MockAllMarkets is AllMarkets {

    function postResultMock(uint _val, uint _marketId) external {
        _postResult(_val, 0 , _marketId);
    } 

}