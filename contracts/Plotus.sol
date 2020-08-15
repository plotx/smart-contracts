pragma solidity 0.5.7;
import "./Market.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/proxy/OwnedUpgradeabilityProxy.sol";

contract Plotus is usingProvable{
using SafeMath for uint256; 
    
    enum MarketType {
      HourlyMarket,
      DailyMarket,
      WeeklyMarket
    }

    struct MarketData {
      uint256 predictionTime;
      uint256 settleTime;
      uint256 startTime;
    }
    mapping(address => uint256) marketIndex;
    mapping(address => uint256) totalStaked;
    mapping(address => uint256) rewardClaimed;
    mapping(address => uint256) marketWinningOption;
    mapping(address => uint256) lastClaimedIndex;
    mapping(address => address payable[]) public marketsParticipated; //Markets participated by user
    mapping(address => mapping(address => bool)) marketsParticipatedFlag; //Markets participated by user
    mapping(address => uint256) predictionAssetIndex; //Markets participated by user
    mapping(address => uint256) public tokenLockedForGov; //Date upto which User tokens are locked
    mapping(address => bool) public lockedForDispute;

    mapping(address => uint256) public marketAddressType;
    mapping(uint => address) public marketOracleId;

    uint256 public marketOpenIndex;
    address public owner;
    address public masterAddress;
    address marketImplementation;
    address[] public marketConfigs;
    address payable[] markets;

    MarketData[] marketTypes;

    uint256[] settleTime;

    address[] marketCurrencies;

    address public plotusToken;

    struct DisputeStake {
      address staker;
      uint256 stakeAmount;
    }

    mapping(address => DisputeStake) disputeStakes;

    event MarketQuestion(address indexed marketAdd, string question, bytes32 stockName, uint256 indexed predictionType, uint256 startTime);
    event PlacePrediction(address indexed user,uint256 value, uint256 predictionPoints, uint256 predictionAsset,uint256 prediction,address indexed marketAdd,uint256 _leverage);
    event MarketResult(address indexed marketAddm, address[] _predictionAssets, uint256[] totalReward, uint256[] commision, uint256 winningOption);
    event Claimed(address indexed marketAdd, address indexed user, uint256[] reward, address[] _predictionAssets, uint256[] incentive, address[] incentiveTokens);
   
    modifier onlyOwner() {
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

    function initiatePlotus(address _owner, address _marketImplementation, address[] memory _marketConfigs, address _plotusToken) public {
      masterAddress = msg.sender;
      owner = _owner;
      marketImplementation = _marketImplementation;
      marketConfigs = _marketConfigs;
      plotusToken = _plotusToken;
      markets.push(address(0));
      marketOpenIndex = 1;

      //Adding Default market currencies Ether and PlotusToken
      marketCurrencies.push(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
      marketCurrencies.push(_plotusToken);

    }

    function startInitialMarkets() external payable {
      for(uint256 i = 0;i < marketTypes.length; i++) {
        for(uint256 j = 0;j < marketCurrencies.length; j++) {
          _createMarket(i, marketCurrencies[i]);
        }
      }
    }

    function addNewMarketType(uint256 _predictionTime, uint256 _settleTime, uint256 _startTime) external {
      marketTypes.push(Market(_predictionTime, _settleTime, _startTime));
      // marketPredictionTimes.push(_predictionTime);
      // settleTime.push(_settleTime)
    }

    function transferOwnership(address newOwner) public OnlyMaster {
      require(newOwner != address(0));
      owner = newOwner;
    }

    function updateMarketConfigs(address[] memory _marketConfigs) public onlyOwner {
      marketConfigs = _marketConfigs;
    }

    function updateMarketImplementation(address _marketImplementation) public onlyOwner {
      marketImplementation = _marketImplementation;
    }

    function upgradeContractImplementation(address payable _proxyAddress, address _contractsAddress) 
        external onlyOwner
    {
        OwnedUpgradeabilityProxy tempInstance 
            = OwnedUpgradeabilityProxy(_proxyAddress);
        tempInstance.upgradeTo(_contractsAddress);
    }

//
//     function addNewMarket( 
//       uint256 _marketType, uint256 currentPrice
//     ) public payable
//     {
//       require(_marketType <= uint256(MarketType.WeeklyMarket), "Invalid market");
//       for(uint256 i = 0;i < marketCurrencies.length; i++) {
//         _createMarket(_marketType, marketCurrencies[i]);
//       }
//     }

    function _createMarket(uint256 _marketType, bytes32 _stockName) internal {
      MarketData storage _marketData = marketTypes[_marketType];
      address payable _market = _generateProxy(marketImplementation);
      marketIndex[_market] = markets.length;
      markets.push(_market);
      marketAddressType[_market].push(_marketType);
      (uint256 _minValue, uint256 _maxValue) = _calculateOptionRange(_currentPrice);
      Market(_market).initiate.value(msg.value)(_marketData.startTime, _marketData.predictionTime, _marketData.settleTime, _minValue, _maxValue, _stockName, marketConfigs[_stockName]);
      emit MarketQuestion(_market, _stockName, _marketType, _marketData.startTime);
      _marketData.startTime =_marketData.startTime.add(_marketData.predictionTime);
      bytes32 _oraclizeId = oraclize_query(_marketData.startTime, "URL", "json(https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT).price", 800000);
      Market(marketOracleId[_callbackId]).transferCommission();
      delete marketOracleId[_callbackId];
      marketOracleId[_oraclizeId] = _market;
    }

    function __callback(bytes32 myid, string memory result) public {
      // if(myid == closeMarketId) {
      //   _closeBet();
      // } else if(myid == marketResultId) {
      //Check oraclise address
      addNewMarket(myid, parseInt(result));
      // }
    }

    function _calculateOptionRange(uint256 _currentPrice) internal view returns(uint256, uint256) {
      return (_currentPrice - 50, _currentPrice + 50);
    }

    function createGovernanceProposal(string memory proposalTitle, string memory description, string memory solutionHash, bytes memory actionHash, uint256 _stakeForDispute, address _user) public OnlyMarket {
      lockedForDispute[msg.sender] = true;
      disputeStakes[msg.sender].staker = _user;
      disputeStakes[msg.sender].stakeAmount = _stakeForDispute;
      // createProposalwithSolution(proposalTitle, sd, description, 7, solutionHash, actionHash);
    }

    function resolveDispute(address _marketAddress, uint256 _result) external {
      Market(_marketAddress).resolveDispute(_result);
      IERC20.transfer(disputeStakes[_marketAddress].staker, disputeStakes[_marketAddress].stakeAmount);
      lockedForDispute[msg.sender] = false;
    }

    /**
     * @dev to generater proxy 
     * @param _contractAddress of the proxy
     */
    function _generateProxy(address _contractAddress) internal returns(address payable) {
        OwnedUpgradeabilityProxy tempInstance = new OwnedUpgradeabilityProxy(_contractAddress);
        return address(tempInstance);
    }

    function callMarketResultEvent(address[] calldata _predictionAssets , uint256[] calldata _totalReward, uint256[] calldata _commision, uint256 winningOption) external OnlyMarket {
      if (marketOpenIndex < marketIndex[msg.sender]) {
        uint256 i;
        uint256 _status;
        for(i = marketOpenIndex;i < markets.length;i++){
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
      } else {
        marketOpenIndex = marketIndex[msg.sender];
      }
      marketWinningOption[msg.sender] = winningOption;
      emit MarketResult(msg.sender, _predictionAssets, _totalReward, _commision, winningOption);
    }
    
    function callPlacePredictionEvent(address _user,uint256 _value, uint256 _predictionPoints, uint _predictionAsset, uint256 _prediction, uint256 _leverage) external OnlyMarket {
      totalStaked[_user] = totalStaked[_user].add(_value);
      if(!marketsParticipatedFlag[_user][msg.sender]) {
        marketsParticipated[_user].push(msg.sender);
        marketsParticipatedFlag[_user][msg.sender] = true;
      }
      emit PlacePrediction(_user, _value, _predictionPoints, _predictionAsset, _prediction, msg.sender,_leverage);
    }

    function callClaimedEvent(address _user ,uint[] calldata _reward, address[] calldata predictionAssets, uint[] calldata incentives, address[] calldata incentiveTokens) external OnlyMarket {
      // rewardClaimed[_user] = rewardClaimed[_user].add(_reward).add(_stake);
      // emit Claimed(msg.sender, _user, _reward, _stake, _ploIncentive);
      emit Claimed(msg.sender, _user, _reward, predictionAssets, incentives, incentiveTokens);
    }

    function getMarketDetails(address payable _marketAdd)public view returns
    (string memory _feedsource,uint256[] memory minvalue,uint256[] memory maxvalue,
      uint256[] memory optionprice,uint256[] memory _ethStaked,uint256 _predictionType,uint256 _expireTime, uint256 _predictionStatus){
      // Market _market = Market(_marketAdd);
      return Market(_marketAdd).getData();
    }

    function getMarketDetailsUser(address user, uint256 fromIndex, uint256 toIndex) external view returns
    (address payable[] memory _market, uint256[] memory _winnigOption, uint256[] memory _reward){
      if(fromIndex < marketsParticipated[user].length && toIndex <= marketsParticipated[user].length) {
        _market = new address payable[](toIndex.sub(fromIndex).add(1));
        _winnigOption = new uint256[](toIndex.sub(fromIndex).add(1));
        _reward = new uint256[](toIndex.sub(fromIndex).add(1));
        for(uint256 i = fromIndex; i < toIndex; i++) {
          Market _marketInstance = Market(marketsParticipated[user][i]);
          _market[i] = marketsParticipated[user][i];
          _winnigOption[i] = marketWinningOption[marketsParticipated[user][i]];
          // (_reward[i], ) = _marketInstance.getReturn(user);
        }
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

    function calculateUserPendingReturn(address _user) external view returns(uint256 pendingReturn, uint256 incentive) {
      uint256 _return;
      uint256 _incentive;
      for(uint256 i = lastClaimedIndex[_user]; i < marketsParticipated[_user].length; i++) {
        // pendingReturn = pendingReturn.add(marketsParticipated[_user][i].call(abi.encodeWithSignature("getPendingReturn(uint256)", _user)));
        (_return, _incentive) = Market(marketsParticipated[_user][i]).getPendingReturn(_user);
        pendingReturn = pendingReturn.add(_return);
        incentive = incentive.add(_incentive);
      }
    }

    function claimPendingReturn() external {
      uint256 claimFlag;
      uint256 i;
      for(i = lastClaimedIndex[msg.sender]; i < marketsParticipated[msg.sender].length; i++) {
        if(marketWinningOption[marketsParticipated[msg.sender][i]] > 0) {
          Market(marketsParticipated[msg.sender][i]).claimReturn(msg.sender);
        } else {
          claimFlag = i;
        }
      }
      if(claimFlag == 0) {
        claimFlag = i;
      }
      lastClaimedIndex[msg.sender] = claimFlag + 1;
    }

    function votedOnGovernance(address _user, uint256 _lockTime) external {
      tokenLockedForGov[_user] = now + _lockTime;
    }

    function () external payable {
    }

    function withdraw(uint256 amount) external onlyOwner {
      require(amount<= address(this).balance,"insufficient amount");
        msg.sender.transfer(amount);
    }
}