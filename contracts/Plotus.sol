pragma solidity 0.5.7;

import "./Market.sol";

contract Plotus{

    address[] public allMarkets;
    mapping(address => bool) private isMarketAdd;

    address public owner;
    address public masterAddress;

    event MarketQuestion(address indexed MarketAdd, string question, uint _type);
  
    modifier OnlyOwner() {
      require(msg.sender == owner);
      _;
    }

    modifier OnlyMaster() {
      require(msg.sender == masterAddress);
      _;
    }

    function initiatePlotus(address _owner) public {
      masterAddress = msg.sender;
      owner = _owner;
      allMarkets.push(address(0));
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
      ) public payable OnlyOwner {
        Market marketCon = (new Market).value(msg.value)(_uintparams, _feedsource, _stockName, _addressParams);
        allMarkets.push(address(marketCon));
        isMarketAdd[address(marketCon)] = true;
        emit MarketQuestion(address(marketCon), _feedsource, _uintparams[2]);
    }

    function deposit() external payable {
    }

    function withdraw(uint amount,address payable _address) external {
      require(amount<= address(this).balance,"insufficient amount");
        _address.transfer(amount);
    }
}