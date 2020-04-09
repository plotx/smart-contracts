pragma solidity 0.5.7;

import "./Market.sol";

contract MarketDaily is Market {

    constructor(
     uint[] memory _uintparams,
     string memory _feedsource,
     address payable[] memory _addressParams
    ) 
    public
    payable Market(_uintparams, _feedsource, _addressParams)
    {
      expireTime = startTime + 1 days;

      
      //provable_query(expireTime.sub(now), "URL", FeedSource, 500000); //comment to deploy
    }

    function getPrice(uint _prediction) public view returns(uint) {
      return optionPrice[_prediction];
    }

    function setPrice(uint _prediction, uint _value) public returns(uint ,uint){
      optionPrice[_prediction] = _value;
    }
}
