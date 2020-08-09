pragma solidity 0.5.7;
import "./Market.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/proxy/OwnedUpgradeabilityProxy.sol";

contract Plotus{
using SafeMath for uint256; 
    
    enum MarketType {
      HourlyMarket,
      DailyMarket,
      WeeklyMarket
    }
    mapping(address => uint256) marketIndex;
    mapping(address => uint256) totalStaked;
    mapping(address => uint256) rewardClaimed;
    mapping(address => uint256) marketWinningOption;
    mapping(address => uint256) lastClaimedIndex;
    mapping(address => address payable[]) public marketsParticipated; //Markets participated by user
    mapping(address => mapping(address => bool)) marketsParticipatedFlag; //Markets participated by user
    mapping(address => uint256) predictionAssetIndex; //Markets participated by user

    uint256 public marketOpenIndex;
    address public owner;
    address public masterAddress;
    address marketImplementation;
    address[] public marketConfigs;
    address payable[] markets;
    address[] predictionAssets;

    address public plotusToken;

    event MarketQuestion(address indexed marketAdd, string question, bytes32 stockName, uint256 indexed predictionType, uint256 startTime);
    event PlacePrediction(address indexed user,uint256 value, uint256 predictionPoints,uint256 prediction,address indexed marketAdd,uint256 _leverage);
    event MarketResult(address indexed marketAdd, uint256 commision, uint256 totalReward, uint256 winningOption);
    event Claimed(address indexed marketAdd, address indexed user, uint256 reward, uint256 stake, uint256 _ploIncentive);
   
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
      //Adding Default prediction assets Ether and PlotusToken
      _addPredictionAsset(address(0));
      _addPredictionAsset(plotusToken);
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

    function addPredictionAsset(address _predictionAsset) public onlyOwner {
      _addPredictionAsset(_predictionAsset);
    }

    function _addPredictionAsset(address _predictionAsset) internal {
      require(predictionAssetIndex[_predictionAsset] == 0);
      predictionAssetIndex[_predictionAsset] = predictionAssets.length;
      predictionAssets.push(_predictionAsset);
    }

    function removePredictionAsset(address _predictionAsset) public onlyOwner {
      require(predictionAssetIndex[_predictionAsset] > 0);
      predictionAssets[predictionAssetIndex[_predictionAsset]] = predictionAssets[predictionAssets.length - 1];
      predictionAssets.length--;
      predictionAssetIndex[_predictionAsset] = 0;
    }

    function addNewMarket( 
      uint256 _marketType,
      uint256[] memory _marketparams,
      string memory _feedsource,
      bytes32 _stockName
    ) public payable onlyOwner
    {
      require(_marketType <= uint256(MarketType.WeeklyMarket), "Invalid market");
      // for(uint256 i = 0;i < predictionAssets.length; i++) {
        _createMarket(_marketType, _marketparams, _feedsource, _stockName);
      // }
    }

    function _createMarket(uint256 _marketType,
      uint256[] memory _marketparams,
      string memory _feedsource,
      bytes32 _stockName
    ) internal {
      address payable _market = _generateProxy(marketImplementation);
      // Market _market=  new Market();
      marketIndex[_market] = markets.length;
      markets.push(_market);
      uint256 _ploIncentive = 500 ether;
      IERC20(plotusToken).mint(_market, _ploIncentive);
      Market(_market).initiate.value(msg.value)(_marketparams, _feedsource,  marketConfigs[_marketType], predictionAssets, _ploIncentive);
      emit MarketQuestion(_market, _feedsource, _stockName, _marketType, _marketparams[0]);
    }

    /**
     * @dev to generater proxy 
     * @param _contractAddress of the proxy
     */
    function _generateProxy(address _contractAddress) internal returns(address payable) {
        OwnedUpgradeabilityProxy tempInstance = new OwnedUpgradeabilityProxy(_contractAddress);
        return address(tempInstance);
    }

    function callMarketResultEvent(uint256 _commision, uint256 _totalReward, uint256 winningOption) external OnlyMarket {
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
      emit MarketResult(msg.sender, _commision, _totalReward, winningOption);
    }
    
    function callPlacePredictionEvent(address _user,uint256 _value, uint256 _predictionPoints, uint256 _prediction, uint256 _leverage) external OnlyMarket {
      totalStaked[_user] = totalStaked[_user].add(_value);
      if(!marketsParticipatedFlag[_user][msg.sender]) {
        marketsParticipated[_user].push(msg.sender);
        marketsParticipatedFlag[_user][msg.sender] = true;
      }
      emit PlacePrediction(_user, _value, _predictionPoints, _prediction, msg.sender,_leverage);
    }

    function callClaimedEvent(address _user , uint256 _reward, uint256 _stake, uint256 _ploIncentive) external OnlyMarket {
      rewardClaimed[_user] = rewardClaimed[_user].add(_reward).add(_stake);
      emit Claimed(msg.sender, _user, _reward, _stake, _ploIncentive);
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
          (_reward[i], ) = _marketInstance.getReturn(user);
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

    function () external payable {
    }

    function withdraw(uint256 amount) external onlyOwner {
      require(amount<= address(this).balance,"insufficient amount");
        msg.sender.transfer(amount);
    }
}