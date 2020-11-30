pragma solidity 0.5.7;

import "../AllMarkets.sol";

contract MockAllMarkets is AllMarkets {

	mapping(uint=>mapping(uint=>uint64)) val;

	// bool public mockFlag;

	// function setMockPriceFlag(bool _flag) public {
	// 	mockFlag = _flag;
	// }

  // function setOptionRangesPublic(uint _midRangeMin, uint _midRangeMax) public{
  //     marketData.neutralMinValue = uint64(_midRangeMin*1e8);
  //     marketData.neutralMaxValue = uint64(_midRangeMax*1e8);
  //     // optionsAvailable[1].minValue = 0;
  //     // optionsAvailable[1].maxValue = _midRangeMin.sub(1);
  //     // optionsAvailable[2].minValue = _midRangeMin;
  //     // optionsAvailable[2].maxValue = _midRangeMax;
  //     // optionsAvailable[3].minValue = _midRangeMax.add(1);
  //     // optionsAvailable[3].maxValue = ~uint256(0) ;
  //   }

    // function initiate(address _plot, address _marketUtility) public {
    //   mockFlag = true;
    //   super.initiate(_plot, _marketUtility);
    // }

    function postResultMock(uint _val, uint _marketId) external {
        _postResult(_val, 0 , _marketId);
    } 

}