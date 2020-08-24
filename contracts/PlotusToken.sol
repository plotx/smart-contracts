/* Copyright (C) 2017 NexusMutual.io

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

import "./external/openzeppelin-solidity/token/ERC20/ERC20.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";


contract PlotusToken is ERC20 {
    using SafeMath for uint256;

    mapping (address => mapping (address => uint256)) private _allowed;

    mapping(address => uint) public lockedForGV;

    string public name = "PLOT";
    string public symbol = "PLOT";
    uint8 public decimals = 18;
    address public operator;

    modifier onlyOperator() {
        if (operator != address(0))
            require(msg.sender == operator);
        _;
    }

    constructor(uint256 initialSupply) public {
        _mint(msg.sender, initialSupply);
        operator = msg.sender;
    }

    /**
    * @dev Gets the balance of the specified address.
    * @param owner The address to query the balance of.
    * @return An uint256 representing the amount owned by the passed address.
    */
    function balanceOf(address owner) public view returns (uint256) {
        return _balances[owner];
    }

    /**
    * @dev change operator address 
    * @param _newOperator address of new operator
    */
    function changeOperator(address _newOperator) public onlyOperator returns (bool) {
        operator = _newOperator;
        return true;
    }

    /**
    * @dev burns an amount of the tokens of the message sender
    * account.
    * @param amount The amount that will be burnt.
    */
    function burn(uint256 amount) public returns (bool) {
        _burn(msg.sender, amount);
        return true;
    }

    /**
    * @dev Burns a specific amount of tokens from the target address and decrements allowance
    * @param from address The address which you want to send tokens from
    * @param value uint256 The amount of token to be burned
    */
    function burnFrom(address from, uint256 value) public returns (bool) {
        _burnFrom(from, value);
        return true;
    }

    /**
    * @dev function that mints an amount of the token and assigns it to
    * an account.
    * @param account The account that will receive the created tokens.
    * @param amount The amount that will be created.
    */
    function mint(address account, uint256 amount) public onlyOperator returns(bool) {
        _mint(account, amount);
        return true;
    }

    /**
    * @dev Transfer token for a specified address
    * @param to The address to transfer to.
    * @param value The amount to be transferred.
    */
    function transfer(address to, uint256 value) public returns (bool) {

        require(lockedForGV[msg.sender] < now); // if not voted under governance
        require(value <= _balances[msg.sender]);
        _transfer(msg.sender, to, value); 
        return true;
    }

    /**
    * @dev Transfer tokens to the operator from the specified address
    * @param from The address to transfer from.
    * @param value The amount to be transferred.
    */
    function operatorTransfer(address from, uint256 value) public onlyOperator returns (bool) {
        require(value <= _balances[from]);
        _transfer(from, operator, value);
        return true;
    }

    /**
    * @dev Transfer tokens from one address to another
    * @param from address The address which you want to send tokens from
    * @param to address The address which you want to transfer to
    * @param value uint256 the amount of tokens to be transferred
    */
    function transferFrom(
        address from,
        address to,
        uint256 value
    )
        public
        returns (bool)
    {
        require(lockedForGV[from] < now); // if not voted under governance
        _transferFrom(from, to, value);
        return true;
    }

    /**
     * @dev Lock the user's tokens 
     * @param _of user's address.
     */
    function lockForGovernanceVote(address _of, uint _days) public onlyOperator {
        if (_days.add(now) > lockedForGV[_of])
            lockedForGV[_of] = _days.add(now);
    }

    function isLockedForGV(address _of) public view returns(bool) {
        return (lockedForGV[_of] > now);
    }

}
