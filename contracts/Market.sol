pragma solidity 0.5.7;
import "./PlotusToken";
import "./PlotusData.sol";
import "./external/oraclize/ethereum-api/provableAPI_0.5.sol";

contract Market is usingProvable {
    using SafeMath for uint;


    uint public startTime;
    uint public expireTime;
    string public FeedSource;
    uint public betType;
    string public stockName;
    PlotusToken public tk;
    bool public betClosed;
    uint public WinningOption;
    uint public predictionForDate;
    uint public minBet;
    uint public totalOptions; // make function for total options
    uint public rate;
    uint public commissionPerc;
    uint public donationPerc;
    PlotusData pl;
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
      uint ethStaked;                                                                                                                                                                                                             ;
    }

    mapping(uint=>option) optionsAvailable;
  
    event BetQuestion(address indexed betId, string question, uint betType);
    event Bet(address indexed _user, uint _betAmount, bool _prediction);
    event Claimed(address _user, uint _reward);

    constructor(
     uint[] _uintparams,
     string _feedsource,
     bytes32 _stockName,
     address[] _addressParams 
    ) 
    public
    payable 
    {
      startTime = _uintparams[0];

      // minBet = _minBet;
      // PlotusToken = _agree;
      // startTime = _startTime;
      // betType = _betType;
      // expireTime = _expireTime;
      // FeedSource = _feedSource;
      // tk.changeOperator(address(this));
      // pl = PlotusData(plAdd);
      // DonationAccount = _donation;
      // CommissionAccount = _commission;
      // stockName = _question;
      Initialise values
      Set option ranges
      optionsAvailable[0] = option(0,0,0,0);
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
     // uint tokenPrice = getPrice(_prediction);
      uint value = uint(msg.value).mul(10**18).div(rate);        
      uint betValue = value.div(getPrice(_prediction));
      userBettingPoints[msg.sender][_prediction] = betValue;
      ethStaked[msg.sender][_prediction] = ethStaked[msg.sender][_prediction].add(msg.value);
      userBettingPoints[msg.sender][_prediction] = userBettingPoints[msg.sender][_prediction].add(msg.value);
      optionsAvailable[_prediction].betPoints = optionsAvailable[_prediction].betPoints.add(betValue);
      optionsAvailable[_prediction].ethStaked = optionsAvailable[_prediction].ethStaked.add(msg.value);
      emit Bet(msg.sender, betValue, _prediction);
    }

    function _closeBet(uint _value) internal {      
      require(now > expireTime);
      require(!betClosed);
      uint totalReward;
      betClosed = true;
     
      
      for(uint i=1;i <= totalOptions;i++){
         if(_value <= optionsAvailable[i].maxValue && _value >= optionsAvailable[i].minValue){
          WinningOption = i;
          else
           totalReward = totalReward.add(optionsAvailable[i].ethStaked);
      } 
      uint commision = commissionPerc.mul(totalReward).div(100);
      uint donation = donationPerc.mul(totalReward).div(100);

      rewardToDistribute = totalReward.sub(commision).sub(donation);
      CommissionAccount.transfer(commision);
      DonationAccount.transfer(donation);

     pl.callCloseMarketEvent(betType); 
    function claimReward() public {
     }

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
