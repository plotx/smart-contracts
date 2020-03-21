pragma solidity 0.5.7;

import "./Market.sol";
import "./PotusData.sol";
import "./PlotusToken.sol";

contract Plotus{
    using SafeMath for uint;

    PlotusData pd;
    address plotusDataContract;

    constructor(address _plotusDataContract)
    {
      plotusDataContract = _plotusDataContract;

    }


    function addNewMarket( 
     uint[] _uintparams,
     string _feedsource,
     bytes32 _stockName,
     address[] _addressParams     
      ) public payable onlyOwner {

        // PlotusToken tk = new PlotusToken();
        // uint _expireTime = _startTime.add(bd.betTimeline(_betType));
        pd = PlotusData(plotusDataContract);
        Market marketCon = (new Market).value(msg.value)(_uintparams, _feedsource, _stockName, _addressParams);
        pd.pushMarket(address(marketCon), _feedsource, _uintparams[2]);
        // bd.updateRecentBetTypeExpire(_betType);
    }

//     function changeDependentContractAddress() public onlyInternal {
//       bd = BetData(ms.getLatestAddress("BD"));
//     }
    
// }