pragma solidity 0.5.7;

import "./external/openzeppelin-solidity/math/SafeMath.sol";


contract PlotusData {
    using SafeMath for uint;

    enum MarketStatus {NotStarted, InProgress, Ended}
    enum MarketType {Invalid, Low, Medium, High}
    uint public PlotusAddress; 
    address[] public allMarkets;

    address[] cbs;
    mapping(uint => uint) public marketTimeline;
    uint[] recentMarketTypeExpire;
    mapping(address => bool) private isMarketAdd;

    event MarketQuestion(address indexed marketId, string question, uint marketType);
    event MarketClosed(uint indexed _type, address marketId);
  
    constructor() public {

        marketTimeline[0] = 60 * 60;
        marketTimeline[1] = 1 * 1 days;
        marketTimeline[2] = 7 * 1 days;
        allMarkets.push(address(0));
        recentMarketTypeExpire.push(0);
        recentMarketTypeExpire.push(0);
        recentMarketTypeExpire.push(0);

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

    function updateMarketTimeline(uint _type, uint _val) public onlyOwner {
        require(_type > 0 && _type < 4);
        marketTimeline[_type] = _val;
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
