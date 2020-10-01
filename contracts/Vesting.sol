/* Copyright (C) 2020 PlotX.io

  This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

  This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
    along with this program.  If not, see http://www.gnu.org/licenses/ */

pragma solidity 0.5.7;

import "./PlotXToken.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/openzeppelin-solidity/token/ERC20/ERC20.sol";


contract Vesting {

  using SafeMath for uint256;
  using SafeMath for uint32;
  using SafeMath for uint64;
  PlotXToken public token;
  address public owner;

  uint constant internal SECONDS_PER_DAY = 1 days;

  event Allocated(address recipient, uint64 startTime, uint256 amount, uint32 vestingDuration, uint64 vestingPeriodInDays, uint64 vestingCliff, uint _upfront);
  event TokensClaimed(address recipient, uint256 amountClaimed);

  struct Allocation {
    uint32 vestingDuration; 
    uint32 periodClaimed;
    uint64 vestingCliff;  
    uint64 periodInDays; 
    uint64 startTime; 
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
  function addTokenVesting(address _recipient, uint64 _startTime, uint256 _amount, uint32 _vestingDuration, uint64 _vestingPeriodInDays, uint64 _vestingCliff, uint256 _upFront) public 
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
    uint32 periodVested;
    uint256 amountVested;
    (periodVested, amountVested) = calculateVestingClaim(msg.sender);
    require(amountVested > 0, "token-zero-amount-vested");

    Allocation storage _tokenAllocated = tokenAllocations[msg.sender];
    _tokenAllocated.periodClaimed = uint32(_tokenAllocated.periodClaimed.add(periodVested));
    _tokenAllocated.totalClaimed = _tokenAllocated.totalClaimed.add(amountVested);
    
    require(token.transfer(msg.sender, amountVested), "token-sender-transfer-failed");
    emit TokensClaimed(msg.sender, amountVested);
  }

  /// @dev Calculate the vested and unclaimed period and tokens available for `_recepient` to claim
  /// Due to rounding errors once grant duration is reached, returns the entire left grant amount
  /// Returns (0, 0) if cliff has not been reached
  function calculateVestingClaim(address _recipient) public view returns (uint32, uint256) {
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
      return (uint32(_tokenAllocations.vestingDuration.sub(_tokenAllocations.periodClaimed)), remainingTokens);
    } else {
      uint32 elapsedPeriod = uint32(elapsedDaysAfterCliffPeriod.div(_tokenAllocations.periodInDays));
      if(_tokenAllocations.vestingCliff > 0) {
        elapsedPeriod = uint16(elapsedPeriod.add(1));
      }
      uint32 periodVested = uint32(elapsedPeriod.sub(_tokenAllocations.periodClaimed));
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