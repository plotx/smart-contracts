pragma solidity 0.5.7;

import "./Market.sol";
import "./PotusData.sol";
import "./PlotusToken.sol";

contract Plotus{
    using SafeMath for uint;

    BetData bd;

    function addNewMarket( 
      string memory _question, 
      uint _betType,
      uint _startTime,
      uint _predictionValue,
      string memory _feedSource
      ) public payable onlyOwner {

        // PlotusToken tk = new PlotusToken();
        // uint _expireTime = _startTime.add(bd.betTimeline(_betType));
        // BetContract betCon = (new BetContract).value(msg.value)(bd.minBet(), bd.maxBet(),tk., _question, _betType, _startTime, _expireTime, _predictionValue, _feedSource, address(bd), ms.owner());
        // bd.pushBet(address(betCon), _question, _betType);
        // bd.updateRecentBetTypeExpire(_betType);
    }

//     function changeDependentContractAddress() public onlyInternal {
//       bd = BetData(ms.getLatestAddress("BD"));
//     }
    
// }