pragma solidity 0.5.7;
import "./interfaces/IMarket.sol";
import "./Iupgradable.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./external/string-utils/strings.sol";
import "./interfaces/IToken.sol";
import "./interfaces/IConfig.sol";
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
      address currencyFeedAddress;
      bytes32 currencyName;
      string marketCreationHash;
      string oraclizeSource;
      string oraclizeType;
      bool isERCToken;
    }

    struct MarketOraclize {
      address marketAddress;
      uint256 marketType;
      uint256 marketCurrencyIndex;
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
    address public masterAddress;
    address public tokenController;
    address marketImplementation;
    address[] markets;
    // mapping(uint256 => address[]) public currentMarketsOfType; //Markets participated by user
    mapping(uint256 => mapping(uint256 =>address)) public currentMarketTypeCurrency; //Markets of type and currency

    MarketTypeData[] marketTypes;
    MarketCurrency[] marketCurrencies;

    bool public marketCreationPaused;
    bool public plotxInitialized;

    IToken public plotusToken;
    IConfig public marketConfig;
    IGovernance internal governance;

    struct DisputeStake {
      address staker;
      uint256 stakeAmount;
      uint256 proposalId;
      bool inDispute;
    }

    mapping(address => DisputeStake) disputeStakes;
    mapping(uint => address) disputeProposalId;

    event MarketQuestion(address indexed marketAdd, bytes32 stockName, uint256 indexed predictionType, uint256 startTime);
    event PlacePrediction(address indexed user,uint256 value, uint256 predictionPoints, address predictionAsset,uint256 prediction,address indexed marketAdd,uint256 _leverage);
    event MarketResult(address indexed marketAdd, uint256[] totalReward, uint256 winningOption, uint256 closeValue);
    event Claimed(address indexed marketAdd, address indexed user, uint256[] reward, address[] _predictionAssets, uint256[] incentive, address[] incentiveTokens);
   
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
    * @param _marketImplementation The address of market implementation.
    * @param _marketConfig The address of market config.
    * @param _plotusToken The instance of plotus token.
    */
    function initiatePlotus(address _marketImplementation, address _marketConfig, address _plotusToken) public {
      require(!plotxInitialized);
      plotxInitialized = true;
      masterAddress = msg.sender;
      marketImplementation = _marketImplementation;
      plotusToken = IToken(_plotusToken);
      tokenController = ms.getLatestAddress("TC");
      markets.push(address(0));
      marketConfig = IConfig(_marketConfig);
      marketConfig.setAuthorizedAddres();
      // marketOpenIndex = 1;
      
    }

    /**
    * @dev Start the initial market.
    */
    function addInitialMarketTypesAndStart(uint _startTime, address _ethPriceFeed, address _plotPriceFeed, uint256[] calldata _initialMinOptionETH, uint256[] calldata _initialMaxOptionETH, uint256[] calldata _initialMinOptionPLOT, uint256[] calldata _initialMaxOptionPLOT) external payable {
      marketCurrencies.push(MarketCurrency(_ethPriceFeed, "ETH", "QmPKgmEReh6XTv23N2sbeCYkFw7egVadKanmBawi4AbD1f", "json(https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT).price","URL", false));
      marketCurrencies.push(MarketCurrency(_plotPriceFeed, "PLOT", "QmPKgmEReh6XTv23N2sbeCYkFw7egVadKanmBawi4AbD1f", "json(https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT).price","URL", true));

      marketTypes.push(MarketTypeData(1 hours, 2 hours, _startTime));
      marketTypes.push(MarketTypeData(24 hours, 2 days, _startTime));
      marketTypes.push(MarketTypeData(7 days, 14 days, _startTime));
      // for(uint256 j = 0;j < marketCurrencies.length; j++) {
          for(uint256 i = 0;i < marketTypes.length; i++) {
              _createMarket(i, 0, _initialMinOptionETH[i], _initialMaxOptionETH[i]);
              _createMarket(i, 1, _initialMinOptionPLOT[i], _initialMaxOptionPLOT[i]);
          }
      // }
    }

    /**
    * @dev Add new market type.
    * @param _predictionTime The time duration of market.
    * @param _settleTime The time at which result of market will declared.
    * @param _startTime The time at which market will create.
    */
    function addNewMarketType(uint256 _predictionTime, uint256 _settleTime, uint256 _startTime, uint256[] calldata _minValue, uint256[] calldata _maxValue) external onlyInternal {
      require(_startTime > now);
      marketTypes.push(MarketTypeData(_predictionTime, _settleTime, _startTime));
      uint256 _marketType = marketTypes.length.sub(1);
      for(uint256 j = 0;j < marketCurrencies.length; j++) {
        _createMarket(_marketType, j, _minValue[j], _maxValue[j]);
      }
    }

    /**
    * @dev Add new market currency.
    */
    function addNewMarketCurrency(address _priceFeed, bytes32 _currencyName, string calldata _computationHash, string calldata _oraclizeSource, string calldata _oraclizeType, bool _isToken, uint256[] calldata _minValue, uint256[] calldata _maxValue) external onlyInternal {
      marketCurrencies.push(MarketCurrency(_priceFeed, _currencyName, _computationHash, _oraclizeSource,_oraclizeType, _isToken));
      uint256 _marketCurrencyIndex = marketCurrencies.length.sub(1);
      for(uint256 j = 0;j < marketTypes.length; j++) {
        _createMarket(j, _marketCurrencyIndex, _minValue[j], _maxValue[j]);
      }
    }

     /**
     * @dev Update the configs of the market.
     * @param _marketConfig the address of market configs.
     */
    function updateMarketConfig(address _marketConfig) public onlyInternal {
      marketConfig = IConfig(_marketConfig);
    }

     /**
     * @dev Update the implementations of the market.
     * @param _marketImplementation the address of market implementation.
     */
    function updateMarketImplementation(address _marketImplementation) public onlyInternal {
      marketImplementation = _marketImplementation;
    }

     /**
     * @dev Upgrade the implementations of the contract.
     * @param _proxyAddress the proxy address.
     * @param _contractsAddress the contract address to be upgraded.
     */
    function upgradeContractImplementation(address payable _proxyAddress, address _contractsAddress) 
        external onlyInternal
    {
        OwnedUpgradeabilityProxy tempInstance 
            = OwnedUpgradeabilityProxy(_proxyAddress);
        tempInstance.upgradeTo(_contractsAddress);
    }

     /**
     * @dev Change the address here if there is any external dependent contract.
     */
    function changeDependentContractAddress() public {
      governance = IGovernance(ms.getLatestAddress("GV"));
    }

    /**
    * @dev Creates the new market.
    * @param _marketType The type of the market.
    * @param _marketCurrencyIndex the index of market currency.
    */
    function _createMarket(uint256 _marketType, uint256 _marketCurrencyIndex, uint256 _minValue, uint256 _maxValue) internal {
      require(!marketCreationPaused);
      MarketTypeData storage _marketTypeData = marketTypes[_marketType];
      MarketCurrency memory _marketCurrencyData = marketCurrencies[_marketCurrencyIndex];
      address payable _market = _generateProxy(marketImplementation);
      isMarket[_market] = true;
      markets.push(_market);
      currentMarketTypeCurrency[_marketType][_marketCurrencyIndex] = _market;
      IMarket(_market).initiate(_marketTypeData.startTime, _marketTypeData.predictionTime, _marketTypeData.settleTime, _minValue, _maxValue, _marketCurrencyData.currencyName, _marketCurrencyData.currencyFeedAddress, _marketCurrencyData.oraclizeType, _marketCurrencyData.oraclizeSource, _marketCurrencyData.isERCToken);
      emit MarketQuestion(_market, _marketCurrencyData.currencyName, _marketType, _marketTypeData.startTime);
      _marketTypeData.startTime =_marketTypeData.startTime.add(_marketTypeData.predictionTime);
      bytes32 _oraclizeId = provable_query(_marketTypeData.startTime, "computation", _marketCurrencyData.marketCreationHash, uint2str(_marketTypeData.predictionTime), 800000);
      marketOracleId[_oraclizeId] = MarketOraclize(_market, _marketType, _marketCurrencyIndex);
    }

    function createMarketFallback(uint256 _marketType, uint256 _marketCurrencyIndex, uint256 _gasLimit) external payable{
      address _previousMarket = currentMarketTypeCurrency[_marketType][_marketCurrencyIndex];
      MarketTypeData storage _marketTypeData = marketTypes[_marketType];
      (,,,,,,, uint _status) = getMarketDetails(_previousMarket);
      require(_status == uint(IMarket.PredictionStatus.Cooling));
      require(now > _marketTypeData.startTime.add(marketCreationFallbackTime));
      if(_marketTypeData.startTime > _marketTypeData.startTime.add(_marketTypeData.predictionTime)) {
        uint diff = ((now).sub(_marketTypeData.startTime)).mul(_marketTypeData.predictionTime);
       _marketTypeData.startTime = _marketTypeData.startTime.add(diff.mul(_marketTypeData.predictionTime));
      }
      bytes32 _oraclizeId = provable_query("computation", marketCurrencies[_marketCurrencyIndex].marketCreationHash, uint2str(_marketTypeData.predictionTime), _gasLimit);
      marketOracleId[_oraclizeId] = MarketOraclize(_previousMarket, _marketType, _marketCurrencyIndex);
    }

    /**
    * @dev callback for result declaration of market.
    * @param myid The orcalize market result id.
    * @param result The current price of market currency.
    */
    function __callback(bytes32 myid, string memory result) public {
      require(msg.sender == provable_cbAddress());
      //Check oraclise address
      strings.slice memory s = result.toSlice();
      strings.slice memory delim = "-".toSlice();
      uint[] memory parts = new uint[](s.count(delim) + 1);
      for (uint i = 0; i < parts.length; i++) {
          parts[i] = parseInt(s.split(delim).toString());
      }
      IMarket(marketOracleId[myid].marketAddress).exchangeCommission();
      _createMarket(marketOracleId[myid].marketType, marketOracleId[myid].marketCurrencyIndex, parts[0], parts[1]);
      // addNewMarkets(marketOracleId[myid], parseInt(result));
      delete marketOracleId[myid];
    }

    /**
    * @dev Caluculate the option ranges of market.
    * @return uint256 representing the minimum value of option range of market.
    * @return uint256 representing the maximum value of option range of market.
    */
    function _calculateOptionRange() internal view returns(uint256, uint256) {
      uint256 _currentPrice = 9000;
      return (_currentPrice - 50, _currentPrice + 50);
    }

    /**
    * @dev Updates Flag to pause creation of market.
    */
    function pauseMarketCreation() public onlyInternal {
      require(!marketCreationPaused);
        marketCreationPaused = true;
    }

    /**
    * @dev Updates Flag to resume creation of market.
    */
    function resumeMarketCreation() public onlyInternal {
      require(marketCreationPaused);
        marketCreationPaused = true;
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
      require(disputeStakes[msg.sender].staker == address(0));
      disputeStakes[msg.sender].staker = _user;
      disputeStakes[msg.sender].stakeAmount = _stakeForDispute;
      disputeStakes[msg.sender].proposalId = governance.getProposalLength();
      disputeProposalId[disputeStakes[msg.sender].proposalId] = msg.sender;
      disputeStakes[msg.sender].inDispute = true;
      governance.createProposalwithSolution(proposalTitle, description, description, 9, solutionHash, actionHash);
    }

    /**
    * @dev Resolve the dispute if wrong value passed at the time of market result declaration.
    * @param _marketAddress The address specify the market.
    * @param _result The final result of the market.
    */
    function resolveDispute(address _marketAddress, uint256 _result) external onlyInternal {
      IMarket(_marketAddress).resolveDispute(true, _result);
      plotusToken.transfer(disputeStakes[_marketAddress].staker, disputeStakes[_marketAddress].stakeAmount);
      disputeStakes[msg.sender].inDispute = false;
      // lockedForDispute[msg.sender] = false;
    }

    function burnDisputedProposalTokens(uint _proposaId) external onlyInternal {
      IMarket(disputeProposalId[_proposaId]).resolveDispute(false, 0);
      uint _stakedAmount = disputeStakes[disputeProposalId[_proposaId]].stakeAmount;
      plotusToken.burn(_stakedAmount);
    }

    function marketDisputeStatus(address _marketAddress) public view returns(uint _status) {
      (, , _status, , ) = governance.proposal(disputeStakes[msg.sender].proposalId);
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
    * @return _predictionType uint representing the type of market.
    * @return _expireTime uint representing the expire time of the market.
    * @return _predictionStatus uint representing the status of the market.
    */
    function getMarketDetails(address _marketAdd)public view returns
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
          _openMarkets[count] = currentMarketTypeCurrency[i][j];
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
      for(i = lastClaimed; i < len && count < maxRecords; i++) {
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

    function transferAssets(address _asset, address payable _to, uint _amount) external onlyInternal {
      if(_asset == ETH_ADDRESS) {
        _to.transfer(_amount);
      } else {
        IToken(_asset).transfer(_to, _amount);
      }
    }

    function updateConfigUintParameters(bytes8 code, uint256 value) external onlyInternal {
      marketConfig.updateUintParameters(code, value);
    }

    function updateConfigAddressParameters(bytes8 code, address payable value) external onlyInternal {
      marketConfig.updateAddressParameters(code, value);
    }

}
