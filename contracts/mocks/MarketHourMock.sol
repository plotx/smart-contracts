pragma solidity 0.5.7;

import "./MarketMock.sol";

contract MarketHourlyMock is MarketMock {

    function initiate(
     uint[] memory _uintparams,
     string memory _feedsource,
     address payable[] memory _addressParams
    ) 
    public
    payable
    {
      expireTime = _uintparams[0] + 1 hours;
      super.initiate(_uintparams, _feedsource, _addressParams);
      betType = uint(IPlotus.MarketType.HourlyMarket);
    }

    function getPrice(uint _prediction) public view returns(uint) {
      return optionPrice[_prediction];
    }

    function _calculateOptionPrice(uint _option, uint _totalStaked, uint _ethStakedOnOption) internal view returns(uint _optionPrice) {
      _optionPrice = 0;
      if(_totalStaked > 20 ether) {
        _optionPrice = (_ethStakedOnOption).mul(1000000)
                      .div(_totalStaked.mul(40));
      }

      uint distance = _getDistance(_option);
      uint maxDistance = currentPriceLocation > 3? (currentPriceLocation-1): (7-currentPriceLocation);
      uint timeElapsed = now > startTime ? now - startTime : 0;
      timeElapsed = timeElapsed > 10 minutes ? timeElapsed: 10 minutes;
      timeElapsed = (timeElapsed / 10 minutes) * 10 minutes;
      _optionPrice = _optionPrice.add((
              (maxDistance + 1 - distance).mul(1000000).mul(timeElapsed.div(1 minutes))
             )
             .div(
              (maxDistance+1) * 60 * 60
             ));
      _optionPrice = _optionPrice.div(100);
    }
}
