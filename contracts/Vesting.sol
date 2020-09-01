/*
  This file is part of The Colony Network.

  The Colony Network is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  The Colony Network is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with The Colony Network. If not, see <http://www.gnu.org/licenses/>.
*/

pragma solidity 0.5.7;

import "./PlotusToken.sol";
import "./TokenController.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/openzeppelin-solidity/token/ERC20/ERC20.sol";


contract Vesting {

  using SafeMath for uint256;
  PlotusToken public token;
  TokenController public tokenController;
  address public owner;

  uint constant internal SECONDS_PER_DAY = 1 days;

  event Allocated(address recipient, uint256 startTime, uint256 amount, uint256 vestingDuration, uint256 vestingPeriodInDays, uint256 vestingCliff);
  event TokensClaimed(address recipient, uint256 amountClaimed);

  struct Allocation {
    uint256 startTime;
    uint256 amount;
    uint256 vestingDuration;
    uint256 vestingCliff;
    uint256 upFront;
    uint256 periodInDays;
    uint256 periodClaimed;
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
    token = PlotusToken(_token);
    owner = _owner;
    tokenController = TokenController(token.operator());
  }

  /// @notice Add a new token grant for user `_recipient`. Only one grant per user is allowed
  /// The amount of CLNY tokens here need to be preapproved for transfer by this `Vesting` contract before this call
  /// Secured to the Colony MultiSig only
  /// @param _recipient Address of the token grant recipient entitled to claim the grant funds
  /// @param _startTime Grant start time as seconds since unix epoch
  /// Allows backdating grants by passing time in the past. If `0` is passed here current blocktime is used. 
  /// @param _amount Total number of tokens in grant
  /// @param _vestingDuration Number of months of the grant's duration
  /// @param _vestingCliff Number of months of the grant's vesting cliff
  function addTokenGrant(address _recipient, uint256 _startTime, uint256 _amount, uint256 _vestingDuration, uint256 _vestingPeriodInDays, uint256 _vestingCliff, uint256 _upFront) public 
  onlyOwner
  noGrantExistsForUser(_recipient)
  {
    if(_vestingCliff > 0){
      require(_upFront == 0, "Upfront is non zero for non zero cliff");
    }
    // require(_vestingCliff > 0, "token-zero-vesting-cliff");
    require(_vestingDuration > _vestingCliff, "token-cliff-longer-than-duration");
    uint256 amountVestedPerPeriod = _amount.div(_vestingDuration); // need to change 
    require(amountVestedPerPeriod > 0, "token-zero-amount-vested-per-period");

    // Transfer the grant tokens under the control of the vesting contract
    token.transferFrom(owner, address(this), _amount);

    Allocation memory _allocation = Allocation({
      startTime: _startTime, 
      amount: _amount,
      vestingDuration: _vestingDuration,
      periodInDays: _vestingPeriodInDays,
      vestingCliff: _vestingCliff,
      upFront: _upFront,
      periodClaimed: 0,
      totalClaimed: 0
    });
    if(_upFront > 0 && !token.isLockedForGV(_recipient)) {
      token.transfer(_recipient, _upFront);
    }

    tokenAllocations[_recipient] = _allocation;
    emit Allocated(_recipient, _allocation.startTime, _amount, _vestingDuration, _vestingPeriodInDays, _vestingCliff);
  }

  /// @notice Allows a grant recipient to claim their vested tokens. Errors if no tokens have vested
  /// It is advised recipients check they are entitled to claim via `calculateGrantClaim` before calling this
  function claimVestedTokens() public {

    require(!token.isLockedForGV(msg.sender));
    uint256 periodVested;  //
    uint256 amountVested;
    (periodVested, amountVested) = calculateGrantClaim(msg.sender);
    require(amountVested > 0, "token-zero-amount-vested");

    Allocation storage _tokenAllocated = tokenAllocations[msg.sender];
    _tokenAllocated.periodClaimed = _tokenAllocated.periodClaimed.add(periodVested);
    _tokenAllocated.totalClaimed = _tokenAllocated.totalClaimed.add(amountVested);
    
    require(token.transfer(msg.sender, amountVested), "token-sender-transfer-failed");
    emit TokensClaimed(msg.sender, amountVested);
  }

  /// @notice Calculate the vested and unclaimed months and tokens available for `_recepient` to claim
  /// Due to rounding errors once grant duration is reached, returns the entire left grant amount
  /// Returns (0, 0) if cliff has not been reached
  function calculateGrantClaim(address _recipient) public view returns (uint256, uint256) {
    Allocation storage _tokenAllocations = tokenAllocations[_recipient];

    // For grants created with a future start date, that hasn't been reached, return 0, 0
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
      return (_tokenAllocations.vestingDuration, remainingTokens);
    } else {
      uint256 elapsedPeriod = elapsedDaysAfterCliffPeriod.div(_tokenAllocations.periodInDays);
      uint256 periodVested = elapsedPeriod.sub(_tokenAllocations.periodClaimed); //need to review
      uint256 amountVestedPerPeriod = _tokenAllocations.amount.div(_tokenAllocations.vestingDuration);
      uint256 amountVested = periodVested.mul(amountVestedPerPeriod);
      return (periodVested, amountVested);
    }
  }

  function unclaimedAllocation(address _user) external view returns(uint) {
    return tokenAllocations[_user].amount.sub(tokenAllocations[_user].totalClaimed);
  }
}