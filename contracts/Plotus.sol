pragma solidity 0.5.7;
import "./interfaces/IMarket.sol";
import "./Iupgradable.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./interfaces/IToken.sol";
import "./external/govblocks-protocol/interfaces/IGovernance.sol";
import "./external/oraclize/ethereum-api/provableAPI.sol";

contract Plotus is usingProvable, Iupgradable {

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
      uint256 startTime;
    }

    struct MarketCurrency {
      address currencyAddress;
      bytes32 currencyName;
    }

    mapping(address => bool) isMarket;
    mapping(address => uint256) totalStaked;
    mapping(address => uint256) rewardClaimed;
    mapping(address => uint256) marketWinningOption;
    mapping(address => uint256) lastClaimedIndex;
    mapping(address => address[]) public marketsParticipated; //Markets participated by user
    mapping(address => mapping(address => bool)) marketsParticipatedFlag; //Markets participated by user
    // mapping(address => bool) public lockedForDispute;

    mapping(bytes32 => uint256) public marketOracleId;

    // uint256 public marketOpenIndex;
    address public owner;
    address public masterAddress;
    address public marketConfig;
    address marketImplementation;
    address[] public marketConfigs;
    address[] markets;
    mapping(uint256 => address[]) public currentMarketsOfType; //Markets participated by user

    MarketTypeData[] marketTypes;
    MarketCurrency[] marketCurrencies;

    bool public marketCreationPaused;

    address public plotusToken;

    struct DisputeStake {
      address staker;
      uint256 stakeAmount;
    }

    mapping(address => DisputeStake) disputeStakes;

    event MarketQuestion(address indexed marketAdd, bytes32 stockName, uint256 indexed predictionType, uint256 startTime);
    event PlacePrediction(address indexed user,uint256 value, uint256 predictionPoints, uint256 predictionAsset,uint256 prediction,address indexed marketAdd,uint256 _leverage);
    event MarketResult(address indexed marketAddm, address[] _predictionAssets, uint256[] totalReward, uint256[] commision, uint256 winningOption);
    event Claimed(address indexed marketAdd, address indexed user, uint256[] reward, address[] _predictionAssets, uint256[] incentive, address[] incentiveTokens);
   
    /**
    * @dev Checks if msg.sender is plotus owner.
    */
    modifier onlyOwner() {
      require(msg.sender == owner);
      _;
    }

    /**
    * @dev Checks if msg.sender is master address.
    */
    modifier OnlyMaster() {
      require(msg.sender == masterAddress);
      _;
    }

    /**
    * @dev Checks if msg.sender is market address.
    */
    modifier OnlyMarket() {
      require(isMarket[msg.sender]);
      _;
    }

    /**
    * @dev Initialize the Plotus.
    * @param _owner The address of owner.
    * @param _marketImplementation The address of market implementation.
    * @param _marketConfigs The addresses of market configs.
    * @param _plotusToken The address of plotus token.
    */
    function initiatePlotus(address _owner, address _marketImplementation, address[] memory _marketConfigs, address _plotusToken) public {
      masterAddress = msg.sender;
      owner = _owner;
      marketImplementation = _marketImplementation;
      marketConfigs = _marketConfigs;
      plotusToken = _plotusToken;
      markets.push(address(0));
      // marketOpenIndex = 1;

      //Adding Default market currencies Ether and PlotusToken
      marketCurrencies.push(MarketCurrency(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, "ETH"));
      marketCurrencies.push(MarketCurrency(plotusToken, "PLOT"));
      // marketTypes.push(MarketTypeData(1 hours, 2 hours, _startTime));
    }

    /**
    * @dev Start the initial market.
    */
    function startInitialMarkets() external payable {
      for(uint256 i = 0;i < marketTypes.length; i++) {
        for(uint256 j = 0;j < marketCurrencies.length; j++) {
          _createMarket(i, j);
        }
      }
    }

    /**
    * @dev Add new market type.
    * @param _predictionTime The time duration of market.
    * @param _settleTime The time at which result of market will declared.
    * @param _startTime The time at which market will create.
    */
    function addNewMarketType(uint256 _predictionTime, uint256 _settleTime, uint256 _startTime) external {
      marketTypes.push(MarketTypeData(_predictionTime, _settleTime, _startTime));
    }

    /**
     * @dev transfer the ownership to the new owner address
     * @param newOwner is the new owner address
     */
    function transferOwnership(address newOwner) public OnlyMaster {
      require(newOwner != address(0));
      owner = newOwner;
    }

     /**
     * @dev Update the configs of the market.
     * @param _marketConfigs the address of market configs.
     */
    function updateMarketConfigs(address[] memory _marketConfigs) public onlyOwner {
      marketConfigs = _marketConfigs;
    }

     /**
     * @dev Update the implementations of the market.
     * @param _marketImplementation the address of market implementation.
     */
    function updateMarketImplementation(address _marketImplementation) public onlyOwner {
      marketImplementation = _marketImplementation;
    }

     /**
     * @dev Upgrade the implementations of the contract.
     * @param _proxyAddress the proxy address.
     * @param _contractsAddress the contract address to be upgraded.
     */
    function upgradeContractImplementation(address payable _proxyAddress, address _contractsAddress) 
        external onlyOwner
    {
        OwnedUpgradeabilityProxy tempInstance 
            = OwnedUpgradeabilityProxy(_proxyAddress);
        tempInstance.upgradeTo(_contractsAddress);
    }

     /**
     * @dev Change the address here if there is any external dependent contract.
     */
    function changeDependentContractAddress() public {

    }

    /**
    * @dev Add new market.
    * @param _marketType The type of the market.
    * @param currentPrice the current price of market currency.
    */
    function addNewMarkets( 
      uint256 _marketType, uint256 currentPrice
    ) internal
    {
      require(!marketCreationPaused && _marketType <= marketTypes.length, "Invalid market");
      for(uint256 i = 0;i < currentMarketsOfType[_marketType].length; i++) {
        IMarket(currentMarketsOfType[_marketType][i]).exchangeCommission();
      }
      delete currentMarketsOfType[_marketType];
      for(uint256 i = 0;i < marketCurrencies.length; i++) {
        _createMarket(_marketType, i);
      }
      bytes32 _oraclizeId = provable_query(marketTypes[_marketType].startTime, "URL", "json(https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT).price", 800000);
      marketOracleId[_oraclizeId] = _marketType;
    }

    /**
    * @dev Creates the new market.
    * @param _marketType The type of the market.
    * @param _marketCurrencyIndex the index of market currency.
    */
    function _createMarket(uint256 _marketType, uint _marketCurrencyIndex) internal {
      MarketTypeData storage _marketTypeData = marketTypes[_marketType];
      address payable _market = _generateProxy(marketImplementation);
      isMarket[_market] = true;
      markets.push(_market);
      currentMarketsOfType[_marketType].push(_market);
      (uint256 _minValue, uint256 _maxValue) = _calculateOptionRange();
      IMarket(_market).initiate.value(msg.value)(_marketTypeData.startTime, _marketTypeData.predictionTime, _marketTypeData.settleTime, _minValue, _maxValue, marketCurrencies[_marketCurrencyIndex].currencyName, marketCurrencies[_marketCurrencyIndex].currencyAddress);
      emit MarketQuestion(_market, marketCurrencies[_marketCurrencyIndex].currencyName, _marketType, _marketTypeData.startTime);
      _marketTypeData.startTime =_marketTypeData.startTime.add(_marketTypeData.predictionTime);
    }

    /**
    * @dev callback for result declaration of market.
    * @param myid The orcalize market result id.
    * @param result The current price of market currency.
    */
    function __callback(bytes32 myid, string memory result) public {
      //Check oraclise address
      strings.slice memory s = result.toSlice();
      strings.slice memory delim = "-".toSlice();
      uint[] memory parts = new uint[](s.count(delim) + 1);
      for (uint i = 0; i < parts.length; i++) {
          parts[i] = parseInt(s.split(delim).toString());
      }
      addNewMarkets(marketOracleId[myid], parseInt(result));
      delete marketOracleId[myid];
    }

    /**
    * @dev Caluculate the option ranges of market.
    * @return uint256 representing the minimum value of option range of market.
    * @return uint256 representing the maximum value of option range of market.
    */
    function _calculateOptionRange() internal view returns(uint256, uint256) {
      uint256 _currentPrice;
      return (_currentPrice - 50, _currentPrice + 50);
    }

    /**
    * @dev Interrupts for creation of market.
    * @param value The boolean value if wants to stop the market creation.
    */
    function toggleMarketCreation(bool value) public onlyInternal {
        marketCreationPaused = value;
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
    function createGovernanceProposal(string memory proposalTitle, string memory description, string memory solutionHash, bytes memory actionHash, uint256 _stakeForDispute, address _user) public OnlyMarket {
      // lockedForDispute[msg.sender] = true;
      disputeStakes[msg.sender].staker = _user;
      disputeStakes[msg.sender].stakeAmount = _stakeForDispute;
      IGovernance(ms.getLatestAddress("GV")).createProposalwithSolution(proposalTitle, description, description, 7, solutionHash, actionHash);
    }

    /**
    * @dev Resolve the dispute if wrong value passed at the time of market result declaration.
    * @param _marketAddress The address specify the market.
    * @param _result The final result of the market.
    */
    function resolveDispute(address _marketAddress, uint256 _result) external onlyInternal {
      IMarket(_marketAddress).resolveDispute(_result);
      IToken(plotusToken).transfer(disputeStakes[_marketAddress].staker, disputeStakes[_marketAddress].stakeAmount);
      // lockedForDispute[msg.sender] = false;
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
    * @param _predictionAssets The prediction assets of market.
    * @param _totalReward The amount of reward to be distribute.
    * @param _commision The commision amount.
    * @param winningOption The winning option of the market.
    */
    function callMarketResultEvent(address[] calldata _predictionAssets , uint256[] calldata _totalReward, uint256[] calldata _commision, uint256 winningOption) external OnlyMarket {
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
      emit MarketResult(msg.sender, _predictionAssets, _totalReward, _commision, winningOption);
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
    function callPlacePredictionEvent(address _user,uint256 _value, uint256 _predictionPoints, uint _predictionAsset, uint256 _prediction, uint256 _leverage) external OnlyMarket {
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
    * @return _predictionType uint representing the type of market.
    * @return _expireTime uint representing the expire time of the market.
    * @return _predictionStatus uint representing the status of the market.
    */
    function getMarketDetails(address payable _marketAdd)public view returns
    (bytes32 _feedsource,uint256[] memory minvalue,uint256[] memory maxvalue,
      uint256[] memory optionprice,uint256[] memory _ethStaked,uint256 _predictionType,uint256 _expireTime, uint256 _predictionStatus){
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
      if(fromIndex < marketsParticipated[user].length && toIndex <= marketsParticipated[user].length) {
        _market = new address[](toIndex.sub(fromIndex).add(1));
        _winnigOption = new uint256[](toIndex.sub(fromIndex).add(1));
        _reward = new uint256[](toIndex.sub(fromIndex).add(1));
        for(uint256 i = fromIndex; i < toIndex; i++) {
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
    function getOpenMarkets() external view returns(address[] memory _openMarkets, uint256[] memory _marketTypes) {
      uint256  count = 0;
      uint256 _status;
      uint256 _marketType;
      uint totalOpenMarkets = 0;
      _openMarkets = new address[]((marketTypes.length).mul(marketCurrencies.length));
      _marketTypes = new uint256[]((marketTypes.length).mul(marketCurrencies.length));
      for(uint256 i = 0; i< marketTypes.length; i++) {
        for(uint256 j = 0; j< currentMarketsOfType[i].length; j++) {
          _openMarkets[count] = currentMarketsOfType[i][j];
          _marketTypes[count] = i;
          count++;
        }
      }
      // for(uint256 i = 0; i < totalOpenMarkets; i++) {
      //     // _marketTypes[count] = markets.length;
      //     // return (_openMarkets, _marketTypes);
      //   ( , , , , , _marketType, , _status) = getMarketDetails(markets[i]);
      //   if(_status == uint256(Market.PredictionStatus.Started)) {
      //     _openMarkets[count] = markets[i];
      //     _marketTypes[count] = _marketType;
      //     count++;
      //  }
      // }
    }

    /**
    * @dev Calculates the user pending return amount.
    * @param _user The address to query the pending return amount of.
    * @return pendingReturn uint256 representing the pending return amount of user.
    * @return incentive uint256 representing the incentive.
    */
    function calculateUserPendingReturn(address _user) external view returns(uint256 pendingReturn, uint256 incentive) {
      uint256 _return;
      uint256 _incentive;
      for(uint256 i = lastClaimedIndex[_user]; i < marketsParticipated[_user].length; i++) {
        // pendingReturn = pendingReturn.add(marketsParticipated[_user][i].call(abi.encodeWithSignature("getPendingReturn(uint256)", _user)));
        (_return, _incentive) = IMarket(marketsParticipated[_user][i]).getPendingReturn(_user);
        pendingReturn = pendingReturn.add(_return);
        incentive = incentive.add(_incentive);
      }
    }

    /**
    * @dev Claim the pending return of the market.
    */
    function claimPendingReturn() external {
      uint256 claimFlag;
      uint256 i;
      for(i = lastClaimedIndex[msg.sender]; i < marketsParticipated[msg.sender].length; i++) {
        if(marketWinningOption[marketsParticipated[msg.sender][i]] > 0) {
          IMarket(marketsParticipated[msg.sender][i]).claimReturn(msg.sender);
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

    /**
    * @dev Withdraw the balance of contract.
    * @param amount The amount that will be withdraw.
    */
    function withdraw(uint256 amount) external onlyOwner {
      require(amount<= address(this).balance,"insufficient amount");
        msg.sender.transfer(amount);
    }
}
