pragma solidity 0.5.7;
import "./PlotusToken";
import "./PlotusData.sol";
import "./external/oraclize/ethereum-api/provableAPI_0.5.sol";

contract Market is usingProvable {
    using SafeMath for uint;


    uint public startTime;
    uint public expireTime;
    uint public finalResult;
    string public FeedSource;
    uint public betType;
    string public stockName;
    PlotusToken public tk;
    address payable public AdminAccount;

    bool public betClosed;
    uint public WinningOption;
    uint public predictionForDate;
    uint public minBet;
    uint public totalOptions = 7; // make function for total options
    PlotusData pl;
    uint cx1000;

    mapping(address => mapping(uint=>uint)) public ethStaked;
    mapping(address => mapping(uint => uint)) public userBettingPoints;
    mapping(address => bool) public userClaimedReward;
    uint public result;
    uint rewardToDistribute;
    // uint public betTimeline;

    struct option
    {
      uint minValue;
      uint maxValue;
      uint betPoints;
      // uint ethStaked;
      bool correctOption;
    }

    mapping(uint=>option) optionsAvailable;
  
    event BetQuestion(address indexed betId, string question, uint betType);
    event Bet(address indexed _user, uint _betAmount, bool _prediction);
    event Claimed(address _user, uint _reward);

    constructor(
      uint _minBet,
      PlotusToken _agree, 
      string memory _question, 
      uint _betType,
      uint _startTime,
      uint _expireTime,
      string memory _feedSource,
      address plAdd,
      address payable _donation,
      address payable _commission
    ) 
    public
    payable 
    {
      minBet = _minBet;
      PlotusToken = _agree;
      startTime = _startTime;
      betType = _betType;
      expireTime = _expireTime;
      FeedSource = _feedSource;
      tk.changeOperator(address(this));
      pl = PlotusData(plAdd);
      DonationAccount = _donation;
      CommissionAccount = _commission;
      stockName = _question;
      provable_query(_expireTime.sub(now), "URL", _feedSource, 500000);
      emit BetQuestion(address(this), _question, _betType);
    }

    function getPrice(uint _prediction) public view returns(uint) {
      return prediction * 5;
    }

    function placeBet(uint _prediction) public payable {
      require(now >= startTime && now <= expireTime);
      require(msg.value >= minBet);
      // require(userBettingPoints[msg.sender] == 0);
      bytes32 reason = keccak256(abi.encodePacked(address(this),_prediction);
     // uint tokenPrice = getPrice(_prediction);
      uint value = uint(msg.value).mul(10**18).div(tk.tokenPrice);
      tk.mint(msg.sender, value);
      if(tk.tokensLocked(msg.sender, reason) == 0){
        tk.lock(reason,value,uint(2 ** 251).sub(now))
      }
      else{
        tk.increaseLockAmount(reason,value)
      }  
      uint betValue = value.div(getPrice(_prediction));
      userBettingPoints[msg.sender][_prediction] = betValue;
      ethStaked[msg.sender][_prediction] = ethStaked[msg.sender][_prediction].add(msg.value);
      optionsAvailable[_prediction].betPoints = optionsAvailable[_prediction].betPoints.add(betValue);
      optionsAvailable[_prediction].ethStaked = optionsAvailable[_prediction].ethStaked.add(msg.value);
      emit Bet(msg.sender, betValue, _prediction);
    }

    function _closeBet(uint _value) internal {      
      require(now > expireTime);
      require(!betClosed);
      betClosed = true;
      rewardToDistribute = address(this).balance;
      CommissionAccount.transfer((0.02).mul(address(this).balance));
      DonationAccount.transfer((0.02).mul(address(this).balance));
      for(uint i=1;i <= totalOptions;i++){
         if(_value <= optionsAvailable[i].maxValue && _value >= optionsAvailable[i].minValue){
          WinningOption = i;
      }         
     pl.callCloseMarketEvent(betType); 
     }

    function claimReward() public {
      require(!userClaimedReward[msg.sender] && betClosed);
      userClaimedReward[msg.sender] = true;
      uint userPoints;
      userPoints = userBettingPoints[msg.sender][WinningOption];
      require(userPoints > 0);
      uint reward =ethStaked[msg.sender][WinningOption].add(userPoints.mul(rewardToDistribute).div(optionsAvailable[WinningOption].betPoints));
      (msg.sender).transfer(reward);  
      emit Claimed(msg.sender, reward);
    }

    function __callback(bytes32 myid, string memory result, bytes memory proof) public{      
        if (msg.sender != provable_cbAddress()) revert();
        uint resultVal = safeParseInt(result);
        _closeBet(resultVal);
    }
    
}
