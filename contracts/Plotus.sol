pragma solidity 0.5.7;
import "./Market.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/proxy/OwnedUpgradeabilityProxy.sol";

contract Plotus{
using SafeMath for uint; 
    
    enum MarketType {
      HourlyMarket,
      DailyMarket,
      WeeklyMarket
    }
    address[] internal markets;
    mapping(address => bool) private marketIndex;
    address public owner;
    address public masterAddress;
    address[] public marketConfigs;
    uint public marketOpenIndex;
    event MarketQuestion(address indexed marketAdd, string question, bytes32 stockName, uint betType, uint startTime);
    event PlaceBet(address indexed user,uint value, uint betPoints,uint prediction,address marketAdd);
    event BetClosed(uint betType, address indexed marketAdd);
    event MarketResult(address indexed marketAdd, uint commision, uint donation);
    event Claimed(address indexed marketAdd, address indexed user, uint reward, uint stake);
   
    modifier OnlyOwner() {
      require(msg.sender == owner);
      _;
    }

    modifier OnlyMaster() {
      require(msg.sender == masterAddress);
      _;
    }

    modifier OnlyMarket() {
      require(marketIndex[msg.sender] > 0);
      _;
    }

    function initiatePlotus(address _owner, address[] memory _marketConfigs) public {
      masterAddress = msg.sender;
      owner = _owner;
      marketConfigs = _marketConfigs;
      markets.push(address(0));
    }

    function transferOwnership(address newOwner) public OnlyMaster {
      require(newOwner != address(0));
      owner = newOwner;
    }

    function updateMarketConifigs(address[] memory _marketConfigs) public OnlyOwner {
      marketConfigs = _marketConfigs;
    }

    function addNewMarket( 
      uint _marketType,
      uint[] memory _marketparams,
      string memory _feedsource,
      bytes32 _stockName
    ) public payable OnlyOwner
    {
      require(_marketType <= uint(MarketType.WeeklyMarket), "Invalid market");
      // address payable marketConAdd = _generateProxy(marketImplementations[_marketType]);
      Market _market=  new Market();
      markets.push(address(_market));
      marketIndex[address(_market)] = markets.length;
      _market.initiate(_marketparams, _feedsource,  marketConfigs[_marketType]);
      emit MarketQuestion(address(_market), _feedsource, _stockName, _marketType, _marketparams[0]);
    }

    function callCloseMarketEvent(uint _type) public OnlyMarket {
      emit BetClosed(_type, msg.sender);
    }

    function callMarketResultEvent(uint _commision, uint _donation) public OnlyMarket {
      // if marketIndex[msg.sender]
      emit MarketResult(msg.sender, _commision, _donation);
    }
    
    function callPlaceBetEvent(address _user,uint _value, uint _betPoints, uint _prediction) public OnlyMarket {
      emit PlaceBet(_user, _value, _betPoints, _prediction, msg.sender);
    }
    function callClaimedEvent(address _user , uint _reward, uint _stake) public OnlyMarket {
      emit Claimed(msg.sender, _user, _reward, _stake);
    }

    function getMarketDetails(address payable _marketAdd)public view returns
    (string memory _feedsource,uint[] memory minvalue,uint[] memory maxvalue,
      uint[] memory optionprice,uint[] memory _ethStaked,uint _betType,uint _expireTime, uint _betStatus){
      // Market _market = Market(_marketAdd);
      return Market(_marketAdd).getData();
    }

    function () external payable {
    }

    function withdraw(uint amount) external OnlyMarket {
      require(amount<= address(this).balance,"insufficient amount");
        msg.sender.transfer(amount);
    }
}