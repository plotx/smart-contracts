pragma solidity 0.5.7;

import "./PlotXToken.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/openzeppelin-solidity/token/ERC20/ERC20.sol";


contract Vesting {

  using SafeMath for uint256;
  using SafeMath for uint16;
  using SafeMath for uint32;
  PlotXToken public token;
  address public owner;

  uint constant internal SECONDS_PER_DAY = 1 days;

  event Allocated(address recipient, uint32 startTime, uint256 amount, uint16 vestingDuration, uint16 vestingPeriodInDays, uint16 vestingCliff, uint _upfront);
  event TokensClaimed(address recipient, uint256 amountClaimed);

  struct Allocation {
    uint16 vestingDuration; // considering vesting duration will not be more than 2^16 = 65536 let me know if it is not the case
    uint16 vestingCliff;  //considering vesting cliff  will not be more than 2^16 = 65536 let me know if it is not the case
    uint16 periodInDays; //considering period in days  will not be more than 2^16 = 65536 let me know if it is not the case
    uint16 periodClaimed;
    uint32 startTime; // considering start time  will not be more than 2^32 = 4294967296 let me know if it is not the case
    uint256 amount;
    uint256 totalClaimed;
  }
  mapping (address => Allocation) public tokenAllocations;

  modifier onlyOwner {
    require(msg.sender == owner, "unauthorized");
    _;
  }

  modifier nonZeroAddress(address x) {
    require(x != address(0), "token-zero-address");
    _;
  }

  modifier noGrantExistsForUser(address _user) {
    require(tokenAllocations[_user].startTime == 0, "token-user-grant-exists");
    _;
  }

  constructor(address _token, address _owner) public
  nonZeroAddress(_token)
  nonZeroAddress(_owner)
  {
    token = PlotXToken(_token);
    owner = _owner;
  }

  /// @dev Add a new token vesting for user `_recipient`. Only one vesting per user is allowed
  /// The amount of PlotX tokens here need to be preapproved for transfer by this `Vesting` contract before this call
  /// @param _recipient Address of the token recipient entitled to claim the vested funds
  /// @param _startTime Vesting start time as seconds since unix epoch 
  /// @param _amount Total number of tokens in vested
  /// @param _vestingDuration Number of Periods 
  /// @param _vestingPeriodInDays Number of days in each Period
  /// @param _vestingCliff Number of days of the vesting cliff
  /// @param _upFront Amount of tokens `_recipient` will get  right away
  function addTokenVesting(address _recipient, uint32 _startTime, uint256 _amount, uint16 _vestingDuration, uint16 _vestingPeriodInDays, uint16 _vestingCliff, uint256 _upFront) public 
  onlyOwner
  noGrantExistsForUser(_recipient)
  {
    require(_startTime != 0, "should be positive");
    if(_vestingCliff > 0){
      require(_upFront == 0, "Upfront is non zero");
    }
    uint256 amountVestedPerPeriod = _amount.div(_vestingDuration);
    require(amountVestedPerPeriod > 0, "0-amount-vested-per-period");

    // Transfer the vesting tokens under the control of the vesting contract
    token.transferFrom(owner, address(this), _amount.add(_upFront));

    Allocation memory _allocation = Allocation({
      startTime: _startTime, 
      amount: _amount,
      vestingDuration: _vestingDuration,
      periodInDays: _vestingPeriodInDays,
      vestingCliff: _vestingCliff,
      periodClaimed: 0,
      totalClaimed: 0
    });
    tokenAllocations[_recipient] = _allocation;

    if(_upFront > 0) {
      token.transfer(_recipient, _upFront);
    }

    emit Allocated(_recipient, _allocation.startTime, _amount, _vestingDuration, _vestingPeriodInDays, _vestingCliff, _upFront);
  }

  /// @dev Allows a vesting recipient to claim their vested tokens. Errors if no tokens have vested
  /// It is advised recipients check they are entitled to claim via `calculateVestingClaim` before calling this
  function claimVestedTokens() public {

    require(!token.isLockedForGV(msg.sender),"Locked for GV vote");
    uint16 periodVested;
    uint256 amountVested;
    (periodVested, amountVested) = calculateVestingClaim(msg.sender);
    require(amountVested > 0, "token-zero-amount-vested");

    Allocation storage _tokenAllocated = tokenAllocations[msg.sender];
    _tokenAllocated.periodClaimed = uint16(_tokenAllocated.periodClaimed.add(periodVested));
    _tokenAllocated.totalClaimed = _tokenAllocated.totalClaimed.add(amountVested);
    
    require(token.transfer(msg.sender, amountVested), "token-sender-transfer-failed");
    emit TokensClaimed(msg.sender, amountVested);
  }

  /// @dev Calculate the vested and unclaimed months and tokens available for `_recepient` to claim
  /// Due to rounding errors once grant duration is reached, returns the entire left grant amount
  /// Returns (0, 0) if cliff has not been reached
  function calculateVestingClaim(address _recipient) public view returns (uint16, uint256) {
    Allocation storage _tokenAllocations = tokenAllocations[_recipient];

    // For vesting created with a future start date, that hasn't been reached, return 0, 0
    if (now < _tokenAllocations.startTime) {
      return (0, 0);
    }

    // Check cliff was reached
    uint256 elapsedTime = uint(now).sub(_tokenAllocations.startTime);
    uint256 elapsedDays = elapsedTime / SECONDS_PER_DAY;
    
    if (elapsedDays < _tokenAllocations.vestingCliff) {
      return (0, 0);
    }
    uint256 elapsedDaysAfterCliffPeriod = elapsedDays.sub(_tokenAllocations.vestingCliff);
    // If over vesting duration, all tokens vested
    if (elapsedDaysAfterCliffPeriod >= _tokenAllocations.vestingDuration.mul(_tokenAllocations.periodInDays)) {
      uint256 remainingTokens = _tokenAllocations.amount.sub(_tokenAllocations.totalClaimed);
      return (uint16(_tokenAllocations.vestingDuration.sub(_tokenAllocations.periodClaimed)), remainingTokens);
    } else {
      uint16 elapsedPeriod = uint16(elapsedDaysAfterCliffPeriod.div(_tokenAllocations.periodInDays));
      if(_tokenAllocations.vestingCliff > 0) {
        elapsedPeriod = uint16(elapsedPeriod.add(1));
      }
      uint16 periodVested = uint16(elapsedPeriod.sub(_tokenAllocations.periodClaimed));
      uint256 amountVestedPerPeriod = _tokenAllocations.amount.div(_tokenAllocations.vestingDuration);
      uint256 amountVested = periodVested.mul(amountVestedPerPeriod);
      return (periodVested, amountVested);
    }
  }

  /// @dev Returns unclaimed allocation of user. 
  function unclaimedAllocation(address _user) external view returns(uint) {
    return tokenAllocations[_user].amount.sub(tokenAllocations[_user].totalClaimed);
  }
}