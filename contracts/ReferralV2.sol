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

import "./Referral.sol";

contract ReferralV2 is Referral {

  Referral public referralV1;

  /**     
   * @dev Constructor     
   * @param _plotToken The address of PLOT token       
   * @param _bLotToken The address of BPlot token   
   * @param _endDate user can claim thier allocated amounts before this time.
   * @param _budget total amount of BLot to be minted
   */
  constructor(address _plotToken, address _bLotToken, address _signer, uint _endDate, uint _budget, uint _referralAmount, address _referralV1Address) public
  Referral(_plotToken, _bLotToken, _signer, _endDate, _budget, _referralAmount){
    referralV1 = Referral(_referralV1Address);
  }

  /**
   * @dev Allows users to claim their allocated tokens.
   * user should claim before end date.
   */
  function claim(uint8 v, bytes32 r, bytes32 s) external {
    require(endDate > now, "Callable only before end date");
    require(!userClaimed[msg.sender] && !referralV1.userClaimed(msg.sender), "Already claimed");
    bytes memory hash = abi.encode(msg.sender);
    require(isValidSignature(hash, v, r, s));
    userClaimed[msg.sender] = true;
    bLotToken.mint(msg.sender, referralAmount);
  } 

}
