pragma solidity 0.5.7;
import "./Market.sol";

contract Plotus{

    address[] public allMarkets;
    mapping(address => bool) private isMarketAdd;
    mapping(address => bool) private isClosed;
    address public owner;
    address public masterAddress;
    uint public openIndex;
    
    event MarketQuestion(address indexed MarketAdd, string question, uint _type);
    event placeBet(address indexed _user,uint _value,uint _prediction);
    event BetClosed(uint _type, address marketAdd);
    event Claimed(address _user, uint _reward);
   
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
      ) public payable {
        Market marketCon = (new Market).value(msg.value)(_uintparams, _feedsource, _stockName, _addressParams);
        allMarkets.push(address(marketCon));
        isMarketAdd[address(marketCon)] = true;
        emit MarketQuestion(address(marketCon), _feedsource, _uintparams[2]);
    }

   function callCloseMarketEvent(uint _type) public {
        require(isMarketAdd[msg.sender]);
        bool firstOpen;
        if(allMarkets[openIndex] == msg.sender){
             for(uint i = openIndex +1;i<=allMarkets.length;i++){
              if(!isClosed[allMarkets[i]]  && !firstOpen){
                openIndex =i;
                firstOpen = true;
              }
             else{
              openIndex = allMarkets.length;
             }
         } 
        }
        isClosed[msg.sender];
        emit BetClosed(_type, msg.sender);
    }
    
    function callPlaceBetEvent(address _user,uint _value, uint _prediction) public {
        emit placeBet(_user,_value,_prediction);
    }
    function callClaimedEvent(address _user , uint _reward) public {
        emit Claimed(_user, _reward);
    }

    function getMarketDetails(address _marketAdd)public view returns
    (string memory _feedsource,uint _totalMarketValue){
      Market _market = Market(_marketAdd);
       _totalMarketValue = _market.totalMarketValue();
       _feedsource = _market.FeedSource();
    }

    function deposit() external payable {
    }

    function withdraw(uint amount,address payable _address) external {
      require(amount<= address(this).balance,"insufficient amount");
        _address.transfer(amount);
    }
}