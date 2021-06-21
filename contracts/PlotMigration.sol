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
import "./interfaces/IRootChainManager.sol";


contract PLOTMigration {
 
    address public MigrationController; //0x47Db3C5bBbAF73Da7F6C5F2817b6043E52Bf35FF; //multi sig
    address public PLOTToken; //0x07ddc851a1bee757335ebcd7b14348359fdab60f;
    address public PLOTMigrationL2; //0x32387Ae6c518a0efA2D8a3908d88CE4aFFCB0F01;
    address public RootChainManager; //0xBbD7cBFA79faee899Eaf900F13C9065bF03B1A74
    address public ERC20Predicate;//0xdD6596F2029e6233DEFfaCa316e6A95217d4Dc34
    uint256 const MAX_ALLOWANCE = 115792089237316195423570985008687907853269984665640564039457584007913129639935;

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Migrate(address indexed from, address indexed to, uint256 value);
    event Deposit(address indexed from, address indexed to, uint256 value);
    event Withdraw(address indexed from, address indexed to, uint256 value);
    
    constructor(address _MigrationController,address _PLOTToken, address _plotMigrationL2, address _RootChainManager, address _ERC20Predicate) public {
        
        MigrationController = _MigrationController;
        PLOTToken = _PLOTToken;
        PLOTMigrationL2 = _plotMigrationL2;
        RootChainManager = _RootChainManager;
        ERC20Predicate = _ERC20Predicate;
    }
    
    /**
     * @dev Approval to support DepositFor()
     *
     */
    function updateAllowance(uint256 _amount) public {
        require(msg.sender == MigrationController,"msg.sender should be Migration Controller");
        require(IToken(PLOTToken).approve(ERC20Predicate,_amount));
    }
    
    /**
     * @dev Transfers Plot from user to the contract
     * @param _to Address when the tokens to be received on Polygon
     * @param _amount Value to be received in Ploygon
     *
     */
    function migrate(address _to, uint256 _amount) public returns (bool){
        require(_to != address(0),"should be a non-zero address");
        require(IToken(PLOTToken).transferFrom(msg.sender, address(this), _amount));
        emit Migrate(msg.sender,_to,_amount);
        return true;
    }
    
    /**
     * @dev Transfers the tokens to Polygon migration contract
     * @param _amount Value to be received in Ploygon
     *
     */
    function depositFor(uint256 _amount) public {
        require(msg.sender == MigrationController,"msg.sender should be Migration Controller");   
        if(IToken(PLOTToken).allowance(address(this),ERC20Predicate) <= _amount){
            require(IToken(PLOTToken).approve(ERC20Predicate,MAX_ALLOWANCE));
        }
        IRootChainManager(RootChainManager).depositFor(PLOTMigrationL2,PLOTToken,abi.encode(_amount));
        
        emit Deposit(address(this),PLOTMigrationL2,_amount);
    }

     /**
     * @dev Transfers Plot to Migration Controller
     *
     */
    function withdraw(address _to,uint256 _amount) public returns (bool){
        require(msg.sender == MigrationController,"msg.sender should be Migration Controller");
        require(_to != address(0),"should be a non-zero address");
        require(IToken(PLOTToken).transfer(_to, _amount));
        
        emit Withdraw(address(this),_to,_amount);
        return true;
    }
   
}
