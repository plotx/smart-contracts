pragma solidity 0.5.7;

import "./Market.sol";

contract MarketDaily is Market {

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

    function _calculateOptionPrice(uint _option, uint _totalStaked, uint _ethStakedOnOption) internal view returns(uint _optionPrice) {
      _optionPrice = 0;
      if(_totalStaked > 20 ether) {
        _optionPrice = (_ethStakedOnOption).mul(1000000)
                      .div(_totalStaked.mul(40));
      }

      uint distance = _getDistance(_option);
      uint maxDistance = currentPriceLocation > 3? (currentPriceLocation-1): (7-currentPriceLocation);
      // uint maxDistance = 7 - (_option > distance ? _option - distance: _option + distance);
      uint timeElapsed = now > startTime ? now - startTime : 0;
      timeElapsed = timeElapsed > 4 hours ? timeElapsed: 4 hours;
      _optionPrice = _optionPrice.add((
              (maxDistance+1 - distance).mul(1000000).mul(timeElapsed.div(1 hours))
             )
             .div(
              (maxDistance+1) * 60 * 24
             ));
      _optionPrice = _optionPrice.div(100);
    }
}
