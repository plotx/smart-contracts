pragma solidity 0.5.7;

import "./MarketMock.sol";

contract MarketDailyMock is MarketMock {

    function initiate(
     uint[] memory _uintparams,
     string memory _feedsource,
     address payable[] memory _addressParams
    ) 
    public
    payable
    {
      expireTime = _uintparams[0] + 1 days;
      super.initiate(_uintparams, _feedsource, _addressParams);
      betType = uint(IPlotus.MarketType.DailyMarket);
    }

    function getPrice(uint _prediction) public view returns(uint) {
      return optionPrice[_prediction];
    }

    function setPrice(uint _prediction) public {
      optionPrice[_prediction] = _calculateOptionPrice(_prediction);
    }

    function _calculateOptionPrice(uint _option) internal view returns(uint _optionPrice) {
      _optionPrice = 0;
      if(address(this).balance > 20 ether) {
        _optionPrice = (optionsAvailable[_option].ethStaked).mul(10000)
                      .div((address(this).balance).mul(40));
      }

      uint distance = _getDistance(_option);
      uint maxDistance = currentPriceLocation > 3? (currentPriceLocation-1): (7-currentPriceLocation);
      // uint maxDistance = 7 - (_option > distance ? _option - distance: _option + distance);
      uint timeElapsed = now - startTime;
      timeElapsed = timeElapsed > 4 hours ? timeElapsed: 4 hours;
      _optionPrice = _optionPrice.add(
              (maxDistance+1 - distance).mul(10000).mul(timeElapsed.div(1 hours))
             )
             .div(
              360 * 24
             );
    }
}
