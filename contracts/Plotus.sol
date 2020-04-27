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
    mapping(address => bool) private isMarketAdd;
    mapping(address => bool) public isClosed;
    address public owner;
    address public masterAddress;
    address[] public marketImplementations;
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
      require(isMarketAdd[msg.sender]);
      _;
    }

    function initiatePlotus(address _owner, address[] memory _marketImplementations) public {
      masterAddress = msg.sender;
      owner = _owner;
      marketImplementations = _marketImplementations;
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
      require(_uintparams[1] <= uint(MarketType.WeeklyMarket), "Invalid market");
      address payable marketConAdd = _generateProxy(marketImplementations[_uintparams[1]]);
      isMarketAdd[marketConAdd] = true;
      Market _market= Market(marketConAdd);
      _market.initiate.value(msg.value)(_uintparams, _feedsource, _addressParams);
      emit MarketQuestion(marketConAdd, _feedsource, _stockName, _uintparams[1], _uintparams[0]);
    }

    function upgradeContractImplementation(address _contractsAddress, address payable _proxyAddress) 
        external OnlyOwner
    {
        OwnedUpgradeabilityProxy tempInstance 
            = OwnedUpgradeabilityProxy(_proxyAddress);
        tempInstance.upgradeTo(_contractsAddress);
    }

    /**
     * @dev to generater proxy 
     * @param _contractAddress of the proxy
     */
    function _generateProxy(address _contractAddress) internal returns(address payable) {
        OwnedUpgradeabilityProxy tempInstance = new OwnedUpgradeabilityProxy(_contractAddress);
        return address(tempInstance);
    }

    function callCloseMarketEvent(uint _type) public OnlyMarket {
      emit BetClosed(_type, msg.sender);
    }

    function callMarketResultEvent(uint _commision, uint _donation) public OnlyMarket {
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
      uint[] memory optionprice,uint[] memory _ethStaked,uint _betType,uint _expireTime){
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