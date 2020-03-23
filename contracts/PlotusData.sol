pragma solidity 0.5.7;

import "./external/openzeppelin-solidity/math/SafeMath.sol";


contract PlotusData {
    using SafeMath for uint;

    address public PlotusAddress; 
    address[] public allMarkets;
    mapping(address => bool) private isMarketAdd;

    event MarketQuestion(address indexed MarketAdd, string question, uint _type);
  
    modifier OnlyInternal() {
        if (PlotusAddress != address(0))
            require(msg.sender == PlotusAddress);
        _;
    }

    constructor() public {
        allMarkets.push(address(0));
    }

    function pushMarket(address _marketAddress, string memory _question, uint _type) public {    
        allMarkets.push(_marketAddress);
        isMarketAdd[_marketAddress] = true;
        emit MarketQuestion(_marketAddress, _question,_type);
    }

    function getAllMarketsLen() public view returns(uint)
    {
        return allMarkets.length;
    }

    
    function changePlotusAddress(address _newAddress) public OnlyInternal{
      PlotusAddress = _newAddress;
    }
    
}
