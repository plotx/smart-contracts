pragma solidity 0.5.7;
import "./Market.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";
// import "./external/proxy/OwnedUpgradeabilityProxy.sol";

contract Plotus{
using SafeMath for uint256; 
    
    enum MarketType {
      HourlyMarket,
      DailyMarket,
      WeeklyMarket
    }
    address payable[] markets;
    mapping(address => uint256) marketIndex;
    mapping(address => uint256) totalStaked;
    mapping(address => uint256) rewardClaimed;
    mapping(address => uint256) marketWinningOption;
    mapping(address => uint256) lastClaimedIndex;
    mapping(address => address payable[]) marketsParticipated; //Markets participated by user
    mapping(address => mapping(address => bool)) marketsParticipatedFlag; //Markets participated by user
    address public owner;
    address public masterAddress;
    address[] public marketConfigs;
    uint256 public marketOpenIndex;
    event MarketQuestion(address indexed marketAdd, string question, bytes32 stockName, uint256 predictionType, uint256 startTime);
    event PlacePrediction(address indexed user,uint256 value, uint256 predictionPoints,uint256 prediction,address indexed marketAdd,uint256 _leverage);
    event MarketResult(address indexed marketAdd, uint256 commision, uint256 donation, uint256 totalReward, uint256 winningOption);
    event Claimed(address indexed marketAdd, address indexed user, uint256 reward, uint256 stake);
   
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
      marketOpenIndex = 1;
    }

    function transferOwnership(address newOwner) public OnlyMaster {
      require(newOwner != address(0));
      owner = newOwner;
    }

    function updateMarketConfigs(address[] memory _marketConfigs) public OnlyOwner {
      marketConfigs = _marketConfigs;
    }

    function addNewMarket( 
      uint256 _marketType,
      uint256[] calldata _marketparams,
      string calldata _feedsource,
      bytes32 _stockName
    ) external payable OnlyOwner
    {
      require(_marketType <= uint256(MarketType.WeeklyMarket), "Invalid market");
      // address payable marketConAdd = _generateProxy(marketImplementations[_marketType]);
      Market _market=  new Market();
      markets.push(address(_market));
      marketIndex[address(_market)] = markets.length;
      _market.initiate(_marketparams, _feedsource,  marketConfigs[_marketType]);
      emit MarketQuestion(address(_market), _feedsource, _stockName, _marketType, _marketparams[0]);
    }

    function callMarketResultEvent(uint256 _commision, uint256 _donation, uint256 _totalReward, uint256 winningOption) external OnlyMarket {
      if (marketOpenIndex <= marketIndex[msg.sender]) {
        uint256 i;
        uint256 _status;
        for(i = marketOpenIndex+1;i < markets.length;i++){
          //Convert to payable address
          ( , , , , , , , _status) = getMarketDetails(markets[i]);
          if(_status == uint256(Market.PredictionStatus.Started)) {
            marketOpenIndex = i;
            break;
          }
        }
        if(i == markets.length) {
          marketOpenIndex = i-1;
        }
      }
      marketWinningOption[msg.sender] = winningOption;
      emit MarketResult(msg.sender, _commision, _donation, _totalReward, winningOption);
    }
    
    function callPlacePredictionEvent(address _user,uint256 _value, uint256 _predictionPoints, uint256 _prediction, uint256 _leverage) external OnlyMarket {
      totalStaked[_user] = totalStaked[_user].add(_value);
      if(!marketsParticipatedFlag[_user][msg.sender]) {
        marketsParticipated[_user].push(msg.sender);
        marketsParticipatedFlag[_user][msg.sender] = true;
      }
      emit PlacePrediction(_user, _value, _predictionPoints, _prediction, msg.sender,_leverage);
    }

    function callClaimedEvent(address _user , uint256 _reward, uint256 _stake) external OnlyMarket {
      rewardClaimed[_user] = rewardClaimed[_user].add(_reward).add(_stake);
      emit Claimed(msg.sender, _user, _reward, _stake);
    }

    function getMarketDetails(address payable _marketAdd)public view returns
    (string memory _feedsource,uint256[] memory minvalue,uint256[] memory maxvalue,
      uint256[] memory optionprice,uint256[] memory _ethStaked,uint256 _predictionType,uint256 _expireTime, uint256 _predictionStatus){
      // Market _market = Market(_marketAdd);
      return Market(_marketAdd).getData();
    }

    function getMarketDetails(address user, uint256 fromIndex, uint256 toIndex) external view returns
    (address payable[] memory _market, uint256[] memory _winnigOption, uint256[] memory _reward){
      require(fromIndex < marketsParticipated[user].length && toIndex < marketsParticipated[user].length);
      _market = new address payable[](toIndex.sub(fromIndex).add(1));
      _winnigOption = new uint256[](toIndex.sub(fromIndex).add(1));
      _reward = new uint256[](toIndex.sub(fromIndex).add(1));
      for(uint256 i = fromIndex; i < toIndex; i++) {
        Market _marketInstance = Market(marketsParticipated[user][i]);
        _market[i] = marketsParticipated[user][i];
        _winnigOption[i] = marketWinningOption[marketsParticipated[user][i]];
        _reward[i] = _marketInstance.getReturn(user);
      }
    }

    function getOpenMarkets() external view returns(address[] memory _openMarkets, uint256[] memory _marketTypes) {
      uint256  count = 0;
      uint256 _status;
      uint256 _marketType;
      _openMarkets = new address[](markets.length - marketOpenIndex);
      _marketTypes = new uint256[](markets.length - marketOpenIndex);
      for(uint256 i = marketOpenIndex; i < markets.length; i++) {
          // _marketTypes[count] = markets.length;
          // return (_openMarkets, _marketTypes);
        ( , , , , , _marketType, , _status) = getMarketDetails(markets[i]);
        if(_status == uint256(Market.PredictionStatus.Started)) {
          _openMarkets[count] = markets[i];
          _marketTypes[count] = _marketType;
          count++;
       }
      }
    }

    function calculatePendingReturn(address _user) external returns(uint256 pendingReturn) {
      for(uint256 i = lastClaimedIndex[_user]+1; i < marketsParticipated[_user].length; i++) {
        // pendingReturn = pendingReturn.add(marketsParticipated[_user][i].call(abi.encodeWithSignature("getPendingReturn(uint256)", _user)));
        pendingReturn = pendingReturn.add(Market(marketsParticipated[_user][i]).getPendingReturn(_user));
      }
    }

    function claimPendingReturn() external {
      for(uint256 i = lastClaimedIndex[msg.sender]+1; i < marketsParticipated[msg.sender].length; i++) {
        // marketsParticipated[_user][i].call(abi.encodeWithSignature("getPendingReturn(uint256)", _user));
        Market(marketsParticipated[msg.sender][i]).claimReturn(msg.sender);
        lastClaimedIndex[msg.sender] = i;
      }
    }

    // function () external payable {
    // }

    function withdraw(uint256 amount) external OnlyOwner {
      require(amount<= address(this).balance,"insufficient amount");
        msg.sender.transfer(amount);
    }
}