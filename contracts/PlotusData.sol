pragma solidity 0.5.7;

import "./external/openzeppelin-solidity/math/SafeMath.sol";


contract PlotusData {
    using SafeMath for uint;

    uint public PlotusAddress; 
    address[] public allMarkets;
    mapping(address => bool) private isMarketAdd;

    event Market(address indexed marketId, string question, uint marketType);
  
    constructor() public {
    
        allMarkets.push(address(0));

    }

    function pushMarket(address _marketAddress, string memory _question, uint _type) public {
        
        allMarkets.push(_marketAddress);
        isMarketAdd[_marketAddress] = true;
        emit MarketQuestion(_marketAddress, _question, _type);
    }

    function getAllMarketsLen() public view returns(uint)
    {
        return allMarkets.length;
    }

    
    function getAllClosedMarkets() public view returns(address[] memory)
    {
        return cbs;
    }

    function callCloseMarketEvent(uint _type) public {
        require(isMarketAdd[msg.sender]);
        cbs.push(msg.sender);
        emit MarketClosed(_type, msg.sender);
    }

    function changePlotusAddress(address _newAddress) public onlyOwner {
        PlotusAddress = _newAddress;
    }
    
}
