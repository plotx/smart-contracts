pragma solidity 0.5.7;

import "./Market.sol";
import "./PlotusData.sol";

contract Plotus{
    using SafeMath for uint;

    PlotusData pd;
    address plotusDataContract;
    address public _owner;

    constructor(address _plotusDataContract) public
    {
     _owner = msg.sender;
      plotusDataContract = _plotusDataContract;

    }

    function addNewMarket( 
     uint[] memory _uintparams,
     string memory _feedsource,
     bytes32 _stockName,
     address payable[] memory _addressParams     
      ) public payable{
        require(msg.sender == _owner);
        pd = PlotusData(plotusDataContract);
        Market marketCon = (new Market).value(msg.value)(_uintparams, _feedsource, _stockName, _addressParams,plotusDataContract);
        pd.pushMarket(address(marketCon), _feedsource, _uintparams[2]);
    }
}