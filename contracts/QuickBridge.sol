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


contract QuickBridge {
 
    address public MigrationController; //multi sig
    address public quickBridgeL2; 
    address public RootChainManager; 
    address public ERC20Predicate;
    address public authorised;
    uint256 constant MAX_ALLOWANCE = 2 ** 256 - 1;
    mapping(address=>bool) public tokenAllowed;

    /**
     * @dev Emitted when `value` of `_token` are moved from one account (`from`) to
     * another (`to`).
     *
     */
    event Migrate(address indexed from, address indexed to, address indexed _token, uint256 value);
    event Deposit(address indexed from, address indexed to, address indexed _token, uint256 value);
    event Withdraw(address indexed from, address indexed to, address indexed _token, uint256 value);
    
    constructor(address _MigrationController,address _PLOTToken, address _quickBridgeL2, address _RootChainManager, address _ERC20Predicate) public {
        
        MigrationController = _MigrationController;
        tokenAllowed[_PLOTToken] = true;
        quickBridgeL2 = _quickBridgeL2;
        RootChainManager = _RootChainManager;
        ERC20Predicate = _ERC20Predicate;
        authorised = msg.sender;
    }

    /**
     * @dev Checks if msg.sender is Migration Controller.
     */
    modifier onlyMigrator() {
        require(msg.sender == MigrationController, "msg.sender should be Migration Controller");
        _;
    }

    /**
     * @dev Checks if msg.sender is authorised.
     */
    modifier onlyAuthorised() {
        require(msg.sender == authorised, "msg.sender should be authorised");
        _;
    }

    /**
     * @dev Updates Authorised address
     * @param _newAuthorised address of new authorised account
     */
    function updateAuthorisedAddress(address _newAuthorised) external onlyAuthorised {
        require(_newAuthorised != address(0));
        authorised = _newAuthorised;
    } 

    /**
     * @dev Adds new token in allowed list
     * @param _tokens list of address of tokens to be allowed
     */
    function addAllowedToken(address[] calldata _tokens) external onlyAuthorised {
        for(uint i=0;i<_tokens.length;i++) {
            require(_tokens[i] != address(0),"Null Address");
            require(!tokenAllowed[_tokens[i]],"Already Exist");
            tokenAllowed[_tokens[i]] = true;
        }
    }

    /**
     * @dev Removes token from allowed list
     * @param _token address of token to be removed
     */
    function removeToken(address _token) external onlyAuthorised {
        require(_token != address(0),"Null Address");
        require(tokenAllowed[_token],"Not Exist");
        delete tokenAllowed[_token];
    }

    /**
     * @dev Approval to support DepositFor()
     *
     */
    function initiateApproval(address _token, uint256 _amount) public onlyMigrator {
        require(IToken(_token).approve(ERC20Predicate,_amount));
    }
    
    /**
     * @dev Transfers `_token` from user to the contract
     * @param _to Address when the tokens to be received on Polygon
     * @param _token token address which is need to be migrated
     * @param _amount Value to be received in Ploygon
     *
     */
    function migrate(address _to, address _token, uint256 _amount) external returns (bool){
        if(_amount == 0) {
            return false;
        }
        require(_to != address(0),"should be a non-zero address");
        require(tokenAllowed[_token], "Token is not allowed");
        require(IToken(_token).transferFrom(msg.sender, address(this), _amount));

        emit Migrate(msg.sender,_to,_token,_amount);
        return true;
    }
    
    /**
     * @dev Transfers the tokens to Polygon migration contract
     * @param _tokens Token list to be recived in L2
     * @param _amounts Values to be received in L2
     *
     */
    function depositFor(address[] calldata _tokens, uint256[] calldata _amounts) external onlyMigrator{
        require(_tokens.length == _amounts.length,"Array length should match");
        IRootChainManager rootManager = IRootChainManager(RootChainManager);
        address _quickBridgeL2Address = quickBridgeL2;
        for(uint i=0;i<_tokens.length;i++)
        {
            require(_amounts[i] > 0,"value should be greater than zero");
            require(tokenAllowed[_tokens[i]],"Token is not allowed");
            if(IToken(_tokens[i]).allowance(address(this),ERC20Predicate) <= _amounts[i]){
                initiateApproval(_tokens[i], MAX_ALLOWANCE);
            }

            rootManager.depositFor(_quickBridgeL2Address,_tokens[i],abi.encode(_amounts[i]));        
            emit Deposit(address(this),_quickBridgeL2Address,_tokens[i],_amounts[i]);
        }
    }


     /**
     * @dev Transfers `_token` to `_to` by Migration Controller
     *
     */
    function withdraw(address _token, address _to, uint256 _amount) external onlyMigrator returns (bool){
        require(_to != address(0),"address should be a non-zero address");
        require(_token != address(0),"address should be a non-zero address");
        require(_amount > 0,"value should be greater than zero");
        require(IToken(_token).transfer(_to, _amount));
        
        emit Withdraw(address(this),_to,_token, _amount);
        return true;
    }
   
}
