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

import "./interfaces/IToken.sol";


contract PLOTMigration {
 
    address public migrationController; //0x3A6D2faBDf51Af157F3fC79bb50346a615c08BF6;
    address public PLOTToken;
    

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Migrate(address indexed from, address indexed to, uint256 value);
    
    constructor(address _PLOTToken,address _migrationController) public {
        
        migrationController = _migrationController;
        PLOTToken = _PLOTToken;
    }
    
    /**
     * @dev Transfers Plot to Migration Controller
     *
     */
    function migrate(
        address _to,
        uint256 _amount
    ) public returns (bool){
        require(IToken(PLOTToken).transferFrom(msg.sender, _to, _amount));
        emit Migrate(msg.sender,_to,_amount);
        return true;
    }
   
}
