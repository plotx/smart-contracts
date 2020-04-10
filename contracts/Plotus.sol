pragma solidity 0.5.7;
import "./MarketDay.sol";
import "./MarketHour.sol";
import "./MarketWeek.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";
contract Plotus{
using SafeMath for uint; 
    
    enum MarketType {
      HourlyMarket,
      DailyMarket,
      WeeklyMarket
    }
    mapping(address => bool) private isMarketAdd;
    mapping(address => bool) public isClosed;
    address public owner;
    address public masterAddress;
    uint public openIndex;
    event MarketQuestion(address indexed marketAdd, string question, bytes32 stockName, uint betType);
    event PlaceBet(address indexed user,uint value, uint betPoints,uint prediction,address marketAdd);
    event BetClosed(uint betType, address indexed marketAdd, uint commision, uint donation);
    event Claimed(address indexed marketAdd, address indexed user, uint reward);
   
    modifier OnlyOwner() {
      require(msg.sender == owner);
      _;
    }

    modifier OnlyMaster() {
      require(msg.sender == masterAddress);
      _;
    }

    modifier OnlyMarket() {
      require(isMarketAdd[msg.sender]);
      _;
    }

    function initiatePlotus(address _owner) public {
      masterAddress = msg.sender;
      owner = _owner;
      openIndex = 1;
    }

    function transferOwnership(address newOwner) public OnlyMaster {
      require(newOwner != address(0));
      owner = newOwner;
    }

    function addNewMarket( 
      uint[] memory _uintparams,
      string memory _feedsource,
      bytes32 _stockName,
      address payable[] memory _addressParams     
    ) public payable OnlyOwner
    {
      if(_uintparams[1] == uint(MarketType.HourlyMarket)) {
        MarketHourly marketCon = (new MarketHourly).value(msg.value)(_uintparams, _feedsource, _addressParams);
        isMarketAdd[address(marketCon)] = true;
        emit MarketQuestion(address(marketCon), _feedsource, _stockName, _uintparams[1]);
      } else if(_uintparams[1] == uint(MarketType.DailyMarket)) {
        MarketDaily marketCon = (new MarketDaily).value(msg.value)(_uintparams, _feedsource, _addressParams);
        isMarketAdd[address(marketCon)] = true;
        emit MarketQuestion(address(marketCon), _feedsource, _stockName, _uintparams[1]);
      } else if(_uintparams[1] == uint(MarketType.WeeklyMarket)) {
        MarketWeekly marketCon = (new MarketWeekly).value(msg.value)(_uintparams, _feedsource, _addressParams);
        isMarketAdd[address(marketCon)] = true;
        emit MarketQuestion(address(marketCon), _feedsource, _stockName, _uintparams[1]);
      } else {
        revert("Invalid market");
      }
    }

    function callCloseMarketEvent(uint _type, uint _commision, uint _donation) public OnlyMarket {
      emit BetClosed(_type, msg.sender, _commision, _donation);
    }
    
    function callPlaceBetEvent(address _user,uint _value, uint _betPoints, uint _prediction) public OnlyMarket {
      emit PlaceBet(_user, _value, _betPoints, _prediction, msg.sender);
    }
    function callClaimedEvent(address _user , uint _reward) public OnlyMarket {
      emit Claimed(msg.sender, _user, _reward);
    }

    function getMarketDetails(address payable _marketAdd)public view returns
    (string memory _feedsource,uint[] memory minvalue,uint[] memory maxvalue,
      uint[] memory optionprice,uint _betType,uint _expireTime){
      Market _market = Market(_marketAdd);
      return _market.getData();
    }

    function () external payable {
    }

    function withdraw(uint amount,address payable _address) external OnlyMarket {
      require(amount<= address(this).balance,"insufficient amount");
        _address.transfer(amount);
    }
}