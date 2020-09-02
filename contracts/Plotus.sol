pragma solidity 0.5.7;
import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/govblocks-protocol/interfaces/IGovernance.sol";
import "./external/govblocks-protocol/Governed.sol";
import "./external/oraclize/ethereum-api/provableAPI.sol";
import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./external/string-utils/strings.sol";
import "./interfaces/IToken.sol";
import "./interfaces/IMarket.sol";
import "./interfaces/Iupgradable.sol";
import "./interfaces/IConfig.sol";

contract Plotus is usingProvable, Governed, Iupgradable {

    using SafeMath for uint256; 
    using strings for *; 
    
    enum MarketType {
      HourlyMarket,
      DailyMarket,
      WeeklyMarket
    }

    struct MarketTypeData {
      uint256 predictionTime;
      uint256 settleTime;
      uint256 optionRangePerc;
    }

    struct MarketCurrency {
      address currencyFeedAddress;
      bytes32 currencyName;
      string marketCreationHash;
      bool isChainlinkFeed;
    }

    struct MarketOraclize {
      address marketAddress;
      uint256 marketType;
      uint256 marketCurrencyIndex;
      uint256 startTime;
    }

    uint public constant marketCreationFallbackTime = 15 minutes;

    mapping(address => bool) public isMarket;
    mapping(address => uint256) totalStaked;
    mapping(address => uint256) rewardClaimed;
    mapping(address => uint256) marketWinningOption;
    mapping(address => uint256) lastClaimedIndex;
    mapping(address => address[]) public marketsParticipated; //Markets participated by user
    mapping(address => mapping(address => bool)) marketsParticipatedFlag; //Markets participated by user
    // mapping(address => bool) public lockedForDispute;

    mapping(bytes32 => MarketOraclize) public marketOracleId;

    // uint256 public marketOpenIndex;
    address constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public tokenController;
    address public marketImplementation;
    address[] markets;
    // mapping(uint256 => address[]) public currentMarketsOfType; //Markets participated by user
    // mapping(uint256 => mapping(uint256 => address)) public currentMarketTypeCurrency; //Markets of type and currency
    mapping(uint256 => mapping(uint256 => bytes32)) public marketTypeCurrencyOraclize; //Markets of type and currency
    // mapping(uint256 => mapping(uint256 => uint256)) public marketTypeCurrencyStartTime; //Markets of type and currency

    MarketTypeData[] marketTypes;
    MarketCurrency[] marketCurrencies;

    bool public marketCreationPaused;
    bool public plotxInitialized;

    IToken public plotusToken;
    IConfig public marketConfig;
    IGovernance internal governance;
    IMaster ms;

    struct DisputeStake {
      address staker;
      uint256 stakeAmount;
      uint256 proposalId;
      uint256 ethDeposited;
      uint256 tokenDeposited;
      bool inDispute;
    }

    mapping(address => DisputeStake) disputeStakes;
    mapping(uint => address) disputeProposalId;

    event MarketQuestion(address indexed marketAdd, bytes32 stockName, uint256 indexed predictionType, uint256 startTime);
    event PlacePrediction(address indexed user,uint256 value, uint256 predictionPoints, address predictionAsset,uint256 prediction,address indexed marketAdd,uint256 _leverage);
    event MarketResult(address indexed marketAdd, uint256[] totalReward, uint256 winningOption, uint256 closeValue);
    event Claimed(address indexed marketAdd, address indexed user, uint256[] reward, address[] _predictionAssets, uint256[] incentive, address[] incentiveTokens);
    event MarketTypes(uint256 indexed index, uint256 predictionTime, uint256 settleTime, uint256 optionRangePerc);
    event MarketCurrencies(uint256 indexed index, address feedAddress, bytes32 currencyName, string marketCreationHash, bool isChainlinkFeed);

    /**
    * @dev Checks if msg.sender is market address.
    */
    modifier OnlyMarket() {
      require(isMarket[msg.sender]);
      _;
    }

    /**
    * @dev Initialize the Plotus.
    * @param _marketImplementation The address of market implementation.
    * @param _marketConfig The address of market config.
    * @param _plotusToken The instance of plotus token.
    */
    function initiatePlotus(address _marketImplementation, address _marketConfig, address _plotusToken, address payable[] memory _configParams) public {
      require(address(ms) == msg.sender && !plotxInitialized);
      plotxInitialized = true;
      marketImplementation = _marketImplementation;
      plotusToken = IToken(_plotusToken);
      tokenController = ms.getLatestAddress("TC");
      markets.push(address(0));
      marketConfig = IConfig(_generateProxy(_marketConfig));
      marketConfig.initialize(_configParams);
      // marketConfig.setAuthorizedAddres();
      // provable_setProof(proofType_Android | proofType_Ledger);
      // marketOpenIndex = 1;
      
    }

    /**
    * @dev Start the initial market.
    */
    function addInitialMarketTypesAndStart(uint _marketStartTime, address _ethPriceFeed, address _plotPriceFeed) external payable {
      require(marketTypes.length == 0);
      _addNewMarketCurrency(_ethPriceFeed, "ETH", "Qme2JKFxGqSNed98Ec613fY3nfTmSrLLj5tR4R6pwrbaaU", true);
      _addNewMarketCurrency(_plotPriceFeed, "BTC", "QmQZta2dVxz5m6XqTng8MymQQe7YgBKcmpy2prCA1Fjvot", true);
      _addMarket(1 hours, 2 hours, 20);
      _addMarket(24 hours, 2 days, 50);
      _addMarket(7 days, 14 days, 100);

      for(uint256 i = 0;i < marketTypes.length; i++) {
          _initiateProvableQuery(i, 0, marketCurrencies[0].marketCreationHash, 1600000, address(0), _marketStartTime, marketTypes[i].predictionTime);
          _initiateProvableQuery(i, 1, marketCurrencies[1].marketCreationHash, 1600000, address(0), _marketStartTime, marketTypes[i].predictionTime);
      }
    }

    /**
    * @dev Add new market type.
    * @param _predictionTime The time duration of market.
    * @param _settleTime The time at which result of market will declared.
    * @param _marketStartTime The time at which market will create.
    */
    function addNewMarketType(uint256 _predictionTime, uint256 _settleTime, uint256 _marketStartTime, uint256 _gasLimit, uint256 _optionRangePerc) external onlyAuthorizedToGovern {
      require(_marketStartTime > now);
      uint256 _marketType = marketTypes.length;
      _addMarket(_predictionTime, _settleTime, _optionRangePerc);
      for(uint256 j = 0;j < marketCurrencies.length; j++) {
        _initiateProvableQuery(_marketType, j, marketCurrencies[j].marketCreationHash, _gasLimit, address(0), _marketStartTime, _predictionTime);
      }
    }

    function _addMarket(uint256 _predictionTime, uint256 _settleTime, uint256 _optionRangePerc) internal {
      uint256 _marketType = marketTypes.length;
      marketTypes.push(MarketTypeData(_predictionTime, _settleTime, _optionRangePerc));
      emit MarketTypes(_marketType, _predictionTime, _settleTime, _optionRangePerc);
    }

    /**
    * @dev Add new market currency.
    */
    function addNewMarketCurrency(address _priceFeed, bytes32 _currencyName, string calldata _computationHash, bool _isChainlinkFeed, uint256 _marketStartTime) external onlyAuthorizedToGovern {
      uint256 _marketCurrencyIndex = marketCurrencies.length;
      _addNewMarketCurrency(_priceFeed, _currencyName, _computationHash, _isChainlinkFeed);
      for(uint256 j = 0;j < marketTypes.length; j++) {
        _initiateProvableQuery(j, _marketCurrencyIndex, _computationHash, 1600000, address(0), _marketStartTime, marketTypes[j].predictionTime);
      }
    }

    function _addNewMarketCurrency(address _priceFeed, bytes32 _currencyName, string memory _computationHash, bool _isChainlinkFeed) internal {
      uint256 _marketCurrencyIndex = marketCurrencies.length;
      marketCurrencies.push(MarketCurrency(_priceFeed, _currencyName, _computationHash, _isChainlinkFeed));
      emit MarketCurrencies(_marketCurrencyIndex, _priceFeed, _currencyName, _computationHash, _isChainlinkFeed);
    }

    /**
    * @dev Update the implementations of the market.
    * @param _marketImplementation the address of market implementation.
    */
    function updateMarketImplementation(address _marketImplementation) external onlyAuthorizedToGovern {
      marketImplementation = _marketImplementation;
    }

    /**
    * @dev Upgrade the implementations of the contract.
    * @param _proxyAddress the proxy address.
    * @param _newImplementation Address of new implementation contract
    */
    function upgradeContractImplementation(address payable _proxyAddress, address _newImplementation) 
        external onlyAuthorizedToGovern
    {
      require(_newImplementation != address(0));
      OwnedUpgradeabilityProxy tempInstance 
          = OwnedUpgradeabilityProxy(_proxyAddress);
      tempInstance.upgradeTo(_newImplementation);
    }

    /**
     * @dev Changes the master address and update it's instance
     */
    function setMasterAddress() public {
      OwnedUpgradeabilityProxy proxy =  OwnedUpgradeabilityProxy(address(uint160(address(this))));
      require(msg.sender == proxy.proxyOwner(),"Sender is not proxy owner.");
      ms = IMaster(msg.sender);
      masterAddress = msg.sender;
      governance = IGovernance(ms.getLatestAddress("GV"));
    }

    function createMarket(uint256 _marketType, uint256 _marketCurrencyIndex) external {
      (address _previousMarket, uint _marketStartTime, uint256 predictionTime, ) = _calculateStartTimeForMarket(_marketType, _marketCurrencyIndex);
      _initiateProvableQuery(_marketType, _marketCurrencyIndex, marketCurrencies[_marketCurrencyIndex].marketCreationHash, 1600000, _previousMarket, 0, predictionTime);
    }

    /**
    * @dev Creates the new market.
    * @param _marketType The type of the market.
    * @param _marketCurrencyIndex the index of market currency.
    */
    function _createMarket(uint256 _marketType, uint256 _marketCurrencyIndex, uint256 _minValue, uint256 _maxValue, uint256 _marketStartTime) internal {
      require(!marketCreationPaused);
      MarketTypeData memory _marketTypeData = marketTypes[_marketType];
      MarketCurrency memory _marketCurrencyData = marketCurrencies[_marketCurrencyIndex];
      address _feedAddress;
      if(!(_marketCurrencyData.isChainlinkFeed) && (_marketTypeData.predictionTime == 1 hours)) {
        _feedAddress = _marketCurrencyData.currencyFeedAddress;
      } else {
        _feedAddress = address(plotusToken);
      }
      marketConfig.update(_feedAddress);
      address payable _market = _generateProxy(marketImplementation);
      isMarket[_market] = true;
      markets.push(_market);
      IMarket(_market).initiate(_marketStartTime, _marketTypeData.predictionTime, _marketTypeData.settleTime, _minValue, _maxValue, _marketCurrencyData.currencyName, _marketCurrencyData.currencyFeedAddress, _marketCurrencyData.isChainlinkFeed);
      emit MarketQuestion(_market, _marketCurrencyData.currencyName, _marketType, _marketStartTime);
      _marketStartTime = _marketStartTime.add(_marketTypeData.predictionTime);
      _initiateProvableQuery(_marketType, _marketCurrencyIndex, _marketCurrencyData.marketCreationHash, 1600000, _market, _marketStartTime, _marketTypeData.predictionTime);
    }

    /**
    * @dev Creates the new market incase of failure of the provable callback.
    * @param _marketType The type of the market.
    * @param _marketCurrencyIndex the index of market currency.
    */
    function createMarketFallback(uint256 _marketType, uint256 _marketCurrencyIndex) external payable{
      (, uint _marketStartTime, , uint256 _optionRangePerc) = _calculateStartTimeForMarket(_marketType, _marketCurrencyIndex);
      uint currentPrice = marketConfig.getAssetPriceUSD(marketCurrencies[_marketCurrencyIndex].currencyFeedAddress, marketCurrencies[_marketCurrencyIndex].isChainlinkFeed);
      uint _minValue = currentPrice.sub(currentPrice.mul(_optionRangePerc.div(2)).div(1000));
      uint _maxValue = currentPrice.add(currentPrice.mul(_optionRangePerc.div(2)).div(1000));
      _createMarket(_marketType, _marketCurrencyIndex, _minValue, _maxValue, _marketStartTime);
      // _initiateProvableQuery(_marketType, _marketCurrencyIndex, marketCurrencies[_marketCurrencyIndex].marketCreationHash, _gasLimit, _previousMarket, _marketStartTime, _marketTypeData.predictionTime);
    }

    function _calculateStartTimeForMarket(uint256 _marketType, uint256 _marketCurrencyIndex) internal returns(address _previousMarket, uint256 _marketStartTime, uint256 predictionTime, uint256 _optionRangePerc) {
      bytes32 _oraclizeId = marketTypeCurrencyOraclize[_marketType][_marketCurrencyIndex];
      _previousMarket = marketOracleId[_oraclizeId].marketAddress;
      _marketStartTime = marketOracleId[_oraclizeId].startTime;
      MarketTypeData storage _marketTypeData = marketTypes[_marketType];
      predictionTime = _marketTypeData.predictionTime;
      _optionRangePerc = _marketTypeData.optionRangePerc;
      (,,,,,,,, uint _status) = getMarketDetails(_previousMarket);
      require(_status >= uint(IMarket.PredictionStatus.InSettlement));
      require(now > _marketStartTime.add(marketCreationFallbackTime));
      if(now > _marketStartTime.add(_marketTypeData.predictionTime)) {
        uint noOfMarketsSkipped = ((now).sub(_marketStartTime)).div(_marketTypeData.predictionTime);
       _marketStartTime = _marketStartTime.add(noOfMarketsSkipped.mul(_marketTypeData.predictionTime));
      }
    }

    function _initiateProvableQuery(uint256 _marketType, uint256 _marketCurrencyIndex, string memory _marketCreationHash, uint256 _gasLimit, address _previousMarket, uint256 _marketStartTime, uint256 _predictionTime) internal {
      bytes32 _oraclizeId = provable_query(_marketStartTime, "computation", _marketCreationHash, uint2str(_predictionTime), _gasLimit);
      marketOracleId[_oraclizeId] = MarketOraclize(_previousMarket, _marketType, _marketCurrencyIndex, _marketStartTime);
      marketTypeCurrencyOraclize[_marketType][_marketCurrencyIndex] = _oraclizeId;
    }

    /**
    * @dev callback for result declaration of market.
    * @param myid The orcalize market result id.
    * @param result The current price of market currency.
    */
    function __callback(bytes32 myid, string memory result) public {
      require(msg.sender == provable_cbAddress());
      // require(provable_randomDS_proofVerify__returnCode(myid, result, proof) == 0, "Proof verification failed");
      //Check oraclise address
      strings.slice memory s = result.toSlice();
      strings.slice memory delim = "-".toSlice();
      uint[] memory parts = new uint[](s.count(delim) + 1);
      for (uint i = 0; i < parts.length; i++) {
          parts[i] = parseInt(s.split(delim).toString());
      }
      if(marketOracleId[myid].marketAddress != address(0)) {
        IMarket(marketOracleId[myid].marketAddress).exchangeCommission();
      }
      _createMarket(marketOracleId[myid].marketType, marketOracleId[myid].marketCurrencyIndex, parts[0], parts[1], marketOracleId[myid].startTime);
      // addNewMarkets(marketOracleId[myid], parseInt(result));
      delete marketOracleId[myid];
    }


    /**
    * @dev Updates Flag to pause creation of market.
    */
    function pauseMarketCreation() external onlyAuthorizedToGovern {
      require(!marketCreationPaused);
        marketCreationPaused = true;
    }

    /**
    * @dev Updates Flag to resume creation of market.
    */
    function resumeMarketCreation() external onlyAuthorizedToGovern {
      require(marketCreationPaused);
        marketCreationPaused = false;
    }

    /**
    * @dev Create proposal if user wants to raise the dispute.
    * @param proposalTitle The title of proposal created by user.
    * @param description The description of dispute.
    * @param solutionHash The ipfs solution hash.
    * @param actionHash The action hash for solution.
    * @param _stakeForDispute The token staked to raise the diospute.
    * @param _user The address who raises the dispute.
    */
    function createGovernanceProposal(string memory proposalTitle, string memory description, string memory solutionHash, bytes memory actionHash, uint256 _stakeForDispute, address _user, uint256 _ethSentToPool, uint256 _tokenSentToPool) public OnlyMarket {
      // lockedForDispute[msg.sender] = true;
      // require(disputeStakes[msg.sender].staker == address(0));
      disputeStakes[msg.sender] = DisputeStake(_user, _stakeForDispute, governance.getProposalLength(), _ethSentToPool, _tokenSentToPool, true);
      disputeStakes[msg.sender].proposalId = governance.getProposalLength();
      disputeProposalId[disputeStakes[msg.sender].proposalId] = msg.sender;
      governance.createProposalwithSolution(proposalTitle, description, description, 10, solutionHash, actionHash);
    }

    /**
    * @dev Resolve the dispute if wrong value passed at the time of market result declaration.
    * @param _marketAddress The address specify the market.
    * @param _result The final result of the market.
    */
    function resolveDispute(address payable _marketAddress, uint256 _result) external onlyAuthorizedToGovern {
      _transferAsset(ETH_ADDRESS, _marketAddress, disputeStakes[_marketAddress].ethDeposited);
      _transferAsset(address(plotusToken), _marketAddress, disputeStakes[_marketAddress].tokenDeposited);
      IMarket(_marketAddress).resolveDispute(true, _result);
      _transferAsset(address(plotusToken), address(uint160(disputeStakes[_marketAddress].staker)), disputeStakes[_marketAddress].stakeAmount);
      // plotusToken.transfer(disputeStakes[_marketAddress].staker, disputeStakes[_marketAddress].stakeAmount);
      disputeStakes[msg.sender].inDispute = false;
    }

    function burnDisputedProposalTokens(uint _proposaId) external onlyAuthorizedToGovern {
      IMarket(disputeProposalId[_proposaId]).resolveDispute(false, 0);
      uint _stakedAmount = disputeStakes[disputeProposalId[_proposaId]].stakeAmount;
      plotusToken.burn(_stakedAmount);
    }

    function marketDisputeStatus(address _marketAddress) external view returns(uint _status) {
      (, , _status, , ) = governance.proposal(disputeStakes[_marketAddress].proposalId);
    }

    /**
     * @dev to generater proxy 
     * @param _contractAddress of the proxy
     */
    function _generateProxy(address _contractAddress) internal returns(address payable) {
        OwnedUpgradeabilityProxy tempInstance = new OwnedUpgradeabilityProxy(_contractAddress);
        return address(tempInstance);
    }

    /**
    * @dev Emits the MarketResult event.
    * @param _totalReward The amount of reward to be distribute.
    * @param winningOption The winning option of the market.
    * @param closeValue The closing value of the market currency.
    */
    function callMarketResultEvent(uint256[] calldata _totalReward, uint256 winningOption, uint256 closeValue) external OnlyMarket {
      // if (marketOpenIndex < marketIndex[msg.sender]) {
      //   uint256 i;
      //   uint256 _status;
      //   for(i = marketOpenIndex;i < markets.length;i++){
      //     //Convert to payable address
      //     ( , , , , , , , _status) = getMarketDetails(markets[i]);
      //     if(_status == uint256(Market.PredictionStatus.Started)) {
      //       marketOpenIndex = i;
      //       break;
      //     }
      //   }
      //   if(i == markets.length) {
      //     marketOpenIndex = i-1;
      //   }
      // } else {
      //   marketOpenIndex = marketIndex[msg.sender];
      // }
      marketWinningOption[msg.sender] = winningOption;
      emit MarketResult(msg.sender, _totalReward, winningOption, closeValue);
    }
    
    /**
    * @dev Emits the PlacePrediction event.
    * @param _user The address who placed prediction.
    * @param _value The amount of ether user staked.
    * @param _predictionPoints The positions user will get.
    * @param _predictionAsset The prediction assets user will get.
    * @param _prediction The option range on which user placed prediction.
    * @param _leverage The leverage selected by user at the time of place prediction.
    */
    function callPlacePredictionEvent(address _user,uint256 _value, uint256 _predictionPoints, address _predictionAsset, uint256 _prediction, uint256 _leverage) external OnlyMarket {
      totalStaked[_user] = totalStaked[_user].add(_value);
      if(!marketsParticipatedFlag[_user][msg.sender]) {
        marketsParticipated[_user].push(msg.sender);
        marketsParticipatedFlag[_user][msg.sender] = true;
      }
      emit PlacePrediction(_user, _value, _predictionPoints, _predictionAsset, _prediction, msg.sender,_leverage);
    }

    /**
    * @dev Emits the claimed event.
    * @param _user The address who claim their reward.
    * @param _reward The reward which is claimed by user.
    * @param predictionAssets The prediction assets of user.
    * @param incentives The incentives of user.
    * @param incentiveTokens The incentive tokens of user.
    */
    function callClaimedEvent(address _user ,uint[] calldata _reward, address[] calldata predictionAssets, uint[] calldata incentives, address[] calldata incentiveTokens) external OnlyMarket {
      // rewardClaimed[_user] = rewardClaimed[_user].add(_reward).add(_stake);
      // emit Claimed(msg.sender, _user, _reward, _stake, _ploIncentive);
      emit Claimed(msg.sender, _user, _reward, predictionAssets, incentives, incentiveTokens);
    }

    /**
    * @dev Gets the market details of the specified address.
    * @param _marketAdd The market address to query the details of market.
    * @return _feedsource bytes32 representing the currency or stock name of the market.
    * @return minvalue uint[] memory representing the minimum range of all the options of the market.
    * @return maxvalue uint[] memory representing the maximum range of all the options of the market.
    * @return optionprice uint[] memory representing the option price of each option ranges of the market.
    * @return _ethStaked uint[] memory representing the ether staked on each option ranges of the market.
    * @return _plotStaked uint[] memory representing the plot staked on each option ranges of the market.
    * @return _predictionType uint representing the type of market.
    * @return _expireTime uint representing the expire time of the market.
    * @return _predictionStatus uint representing the status of the market.
    */
    function getMarketDetails(address _marketAdd)public view returns
    (bytes32 _feedsource,uint256[] memory minvalue,uint256[] memory maxvalue,
      uint256[] memory optionprice,uint256[] memory _ethStaked, uint256[] memory _plotStaked,uint256 _predictionType,uint256 _expireTime, uint256 _predictionStatus){
      // Market _market = Market(_marketAdd);
      return IMarket(_marketAdd).getData();
    }

    /**
    * @dev Gets the market details of the specified user address.
    * @param user The address to query the details of market.
    * @param fromIndex The index to query the details from.
    * @param toIndex The index to query the details to
    * @return _market address[] memory representing the address of the market.
    * @return _winnigOption uint256[] memory representing the winning option range of the market.
    * @return _reward uint256[] memory representing the reward of the market.
    */
    function getMarketDetailsUser(address user, uint256 fromIndex, uint256 toIndex) external view returns
    (address[] memory _market, uint256[] memory _winnigOption, uint256[] memory _reward){
      if(marketsParticipated[user].length > 0 && fromIndex < marketsParticipated[user].length) {
        uint256 _toIndex = toIndex;
        if(_toIndex >= marketsParticipated[user].length) {
          _toIndex = marketsParticipated[user].length - 1;
        }
        _market = new address[](_toIndex.sub(fromIndex).add(1));
        _winnigOption = new uint256[](_toIndex.sub(fromIndex).add(1));
        _reward = new uint256[](_toIndex.sub(fromIndex).add(1));
        for(uint256 i = fromIndex; i <= _toIndex; i++) {
          // Market _marketInstance = Market(marketsParticipated[user][i]);
          _market[i] = marketsParticipated[user][i];
          _winnigOption[i] = marketWinningOption[marketsParticipated[user][i]];
          // (_reward[i], ) = _marketInstance.getReturn(user);
        }
      }
    }

    /**
    * @dev Gets the addresses of open markets.
    * @return _openMarkets address[] memory representing the open market addresses.
    * @return _marketTypes uint256[] memory representing the open market types.
    */
    function getOpenMarkets() external view returns(address[] memory _openMarkets, uint256[] memory _marketTypes, bytes32[] memory _marketCurrencies) {
      uint256  count = 0;
      uint256 _status;
      uint256 _marketType;
      uint totalOpenMarkets = 0;
      _openMarkets = new address[]((marketTypes.length).mul(marketCurrencies.length));
      _marketTypes = new uint256[]((marketTypes.length).mul(marketCurrencies.length));
      _marketCurrencies = new bytes32[]((marketTypes.length).mul(marketCurrencies.length));
      for(uint256 i = 0; i< marketTypes.length; i++) {
        for(uint256 j = 0; j< marketCurrencies.length; j++) {
          _openMarkets[count] = marketOracleId[marketTypeCurrencyOraclize[i][j]].marketAddress;
          _marketTypes[count] = i;
          _marketCurrencies[count] = marketCurrencies[j].currencyName;
          count++;
        }
      }
    }

    // /**
    // * @dev Calculates the user pending return amount.
    // * @param _user The address to query the pending return amount of.
    // * @return pendingReturn uint256 representing the pending return amount of user.
    // * @return incentive uint256 representing the incentive.
    // */
    // function calculateUserPendingReturn(address _user) external view returns(uint[] memory returnAmount, address[] memory _predictionAssets, uint[] memory incentive, address[] memory _incentiveTokens) {
    //   uint256 _return;
    //   uint256 _incentive;
    //   for(uint256 i = lastClaimedIndex[_user]; i < marketsParticipated[_user].length; i++) {
    //     // pendingReturn = pendingReturn.add(marketsParticipated[_user][i].call(abi.encodeWithSignature("getPendingReturn(uint256)", _user)));
    //     (_return, _incentive) = IMarket(marketsParticipated[_user][i]).getPendingReturn(_user);
    //     pendingReturn = pendingReturn.add(_return);
    //     incentive = incentive.add(_incentive);
    //   }
    // }

    /**
    * @dev Claim the pending return of the market.
    * @param maxRecords Maximum number of records to claim reward for
    */
    function claimPendingReturn(uint256 maxRecords) external {
      uint256 i;
      uint len = marketsParticipated[msg.sender].length;
      uint lastClaimed = len;
      uint count;
      for(i = lastClaimedIndex[msg.sender]; i < len && count < maxRecords; i++) {
        if(marketWinningOption[marketsParticipated[msg.sender][i]] > 0 && !(disputeStakes[marketsParticipated[msg.sender][i]].inDispute)) {
          IMarket(marketsParticipated[msg.sender][i]).claimReturn(msg.sender);
          count++;
        } else {
          if(lastClaimed == len) {
            lastClaimed = i;
          }
        }
      }
      if(lastClaimed == len) {
        lastClaimed = i;
      }
      lastClaimedIndex[msg.sender] = lastClaimed;
    }

    function () external payable {
    }

    function transferAssets(address _asset, address payable _to, uint _amount) external onlyAuthorizedToGovern {
      _transferAsset(_asset, _to, _amount);
    }

    /**
    * @dev Transfer the assets to specified address.
    * @param _asset The asset transfer to the specific address.
    * @param _recipient The address to transfer the asset of
    * @param _amount The amount which is transfer.
    */
    function _transferAsset(address _asset, address payable _recipient, uint256 _amount) internal {
      if(_amount > 0) { 
        if(_asset == ETH_ADDRESS) {
          _recipient.transfer(_amount);
        } else {
          require(IToken(_asset).transfer(_recipient, _amount));
        }
      }
    }

    function updateConfigUintParameters(bytes8 code, uint256 value) external onlyAuthorizedToGovern {
      marketConfig.updateUintParameters(code, value);
    }

    function updateConfigAddressParameters(bytes8 code, address payable value) external onlyAuthorizedToGovern {
      marketConfig.updateAddressParameters(code, value);
    }

}
