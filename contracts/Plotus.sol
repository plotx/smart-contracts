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
    mapping(address => uint) private marketIndex;
    mapping(address => uint) internal totalStaked;
    mapping(address => uint) internal rewardClaimed;
    mapping(address => address[]) internal marketsParticipated; //Markets participated by user
    mapping(address => mapping(address => bool)) internal marketsParticipatedFlag; //Markets participated by user
    address public owner;
    address public masterAddress;
    address[] public marketConfigs;
    uint public marketOpenIndex;
    event MarketQuestion(address indexed marketAdd, string question, bytes32 stockName, uint predictionType, uint startTime);
    event PlacePrediction(address indexed user,uint value, uint predictionPoints,uint prediction,address indexed marketAdd,uint _leverage);
    event MarketResult(address indexed marketAdd, uint commision, uint donation, uint totalReward);
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

    function updateMarketConfigs(address[] memory _marketConfigs) public OnlyOwner {
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

    function callMarketResultEvent(uint _commision, uint _donation, uint _totalReward) public OnlyMarket {
      if (marketOpenIndex <= marketIndex[msg.sender]) {
        uint i;
        uint _status;
        for(i = marketOpenIndex+1;i < markets.length;i++){
          //Convert to payable address
          ( , , , , , , , _status) = getMarketDetails(address(uint160(markets[i])));
          if(_status == uint(Market.PredictionStatus.Started)) {
            marketOpenIndex = i;
            break;
          }
        }
        if(i == markets.length) {
          marketOpenIndex = i-1;
        }
      }
      emit MarketResult(msg.sender, _commision, _donation, _totalReward);
    }
    
    function callPlacePredictionEvent(address _user,uint _value, uint _predictionPoints, uint _prediction, uint _leverage) public OnlyMarket {
      totalStaked[_user] += _value;
      if(!marketsParticipatedFlag[_user][msg.sender]) {
        marketsParticipated[_user].push(msg.sender);
        marketsParticipatedFlag[_user][msg.sender] = true;
      }
      emit PlacePrediction(_user, _value, _predictionPoints, _prediction, msg.sender,_leverage);
    }
    function callClaimedEvent(address _user , uint _reward, uint _stake) public OnlyMarket {
      rewardClaimed[_user] += _reward + _stake;
      emit Claimed(msg.sender, _user, _reward, _stake);
    }

    function getMarketDetails(address payable _marketAdd)public view returns
    (string memory _feedsource,uint[] memory minvalue,uint[] memory maxvalue,
      uint[] memory optionprice,uint[] memory _ethStaked,uint _predictionType,uint _expireTime, uint _predictionStatus){
      // Market _market = Market(_marketAdd);
      return Market(_marketAdd).getData();
    }

    function getMarketDetails(address user, uint256 fromIndex, uint256 toIndex)public view returns
    (address[] memory _market, uint256[] memory _winnigOption, uint256[] memory _reward){
      require(fromIndex < marketsParticipated[user].length && toIndex < marketsParticipated[user].length);
      _market = new address[](toIndex.sub(fromIndex).add(1));
      _winnigOption = new uint256[](toIndex.sub(fromIndex).add(1));
      _reward = new uint256[](toIndex.sub(fromIndex).add(1));
      for(uint256 i = fromIndex; i < toIndex; i++) {
        Market _marketInstance = Market(address(uint160(marketsParticipated[user][i])));
        _market[i] = marketsParticipated[user][i];
        _winnigOption[i] = _marketInstance.WinningOption();
        _reward[i] = _marketInstance.getReturn(user);
      }
    }

    function getOpenMarkets() public view returns(address[] memory _openMarkets, uint256[] memory _marketTypes) {
      uint  count = 0;
      uint _status;
      uint _marketType;
      _openMarkets = new address[](markets.length - marketOpenIndex);
      _marketTypes = new uint[](markets.length - marketOpenIndex);
      for(uint i = marketOpenIndex; i < markets.length; i++) {
        ( , , , , , _marketType, , _status) = getMarketDetails(address(uint160(markets[i])));
        if(_status == uint(Market.PredictionStatus.Started)) {
          _openMarkets[count] = markets[i];
          _marketTypes[count] = _marketType;
          count++;
       }
      }
    }

    // function calculatePendingReturn()

    function () external payable {
    }

    function withdraw(uint amount) external OnlyOwner {
      require(amount<= address(this).balance,"insufficient amount");
        msg.sender.transfer(amount);
    }
}