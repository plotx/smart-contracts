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

import "./external/openzeppelin-solidity/token/ERC20/ERC20.sol";
import "./external/openzeppelin-solidity/access/Roles.sol";
import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./interfaces/IMaster.sol";
import "./interfaces/Iupgradable.sol";

contract BLOTV2 is Iupgradable {
    using SafeMath for uint256;
    using Roles for Roles.Role;

    string public constant name = "PlotXBonusToken";
    string public constant symbol = "bPLOT";
    uint8 public constant decimals = 18;

    Roles.Role private _minters;

    address public operator;
    address public plotToken;
    address public constant authController = 0x6f9f333de6eCFa67365916cF95873a4DC480217a;
    address public constant migrationController = 0x3A6D2faBDf51Af157F3fC79bb50346a615c08BF6;
    
    mapping(bytes32 => MigrationStatus) public migrationStatus;
    struct MigrationStatus{
        bool initiated;
        bool completed;
    }

    event MinterAdded(address indexed account);
    event MinterRemoved(address indexed account);
    event MigrationAuthorised(bytes hash);
    event MigrationCompleted(bytes hash);

    mapping (address => uint256) internal _balances;

    bool private initiated;
    uint256 private _totalSupply;

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);
    
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Migrate(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Checks if msg.sender is token operator address.
     */
    modifier onlyOperator() {
        require(msg.sender == operator, "Only operator");
        _;
    }

    modifier onlyMinter() {
        require(
            isMinter(msg.sender),
            "MinterRole: caller does not have the Minter role"
        );
        _;
    }

    /**
     * @dev Initiates the BLOT with default minter address
     */
    function initiatebLOT(address _defaultMinter) public {
        require(!initiated);
        initiated = true;
        _addMinter(_defaultMinter);
    }

    /**
     * @dev Changes the master address and update it's instance
     */
    function setMasterAddress() public {
        OwnedUpgradeabilityProxy proxy = OwnedUpgradeabilityProxy(
            address(uint160(address(this)))
        );
        require(msg.sender == proxy.proxyOwner(), "Sender is not proxy owner.");
        require(plotToken == address(0), "Already Initialized");
        IMaster ms = IMaster(msg.sender);
        plotToken = ms.dAppToken();
        operator = ms.getLatestAddress("TC");
    }
    
 
    /**
     * @dev See `IERC20.transfer`.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     * Transfer is restricted to minter only
     */
    function transfer(address recipient, uint256 amount)
        public
        onlyMinter
        returns (bool)
    {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    /**
     * @dev Moves tokens `amount` from `sender` to `recipient`.
     *
     * This is internal function is equivalent to `transfer`, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a `Transfer` event.
     *
     * Requirements:
     *
     * - `sender` cannot be the zero address.
     * - `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     */
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        _balances[sender] = _balances[sender].sub(amount);
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }

    /**
     * @dev See `ERC20._mint`.
     *
     * Requirements:
     *
     * - the caller must have the `MinterRole`.
     * - equivalant number of PLOT will be transferred from sender to this contract
     */
    function mint(address account, uint256 amount)
        public
        onlyMinter
        returns (bool)
    {
        require(
            IERC20(plotToken).transferFrom(msg.sender, address(this), amount),
            "Error in transfer"
        );
        _mint(account, amount);
        return true;
    }

    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a `Transfer` event with `from` set to the zero address.
     *
     * Requirements
     *
     * - `to` cannot be the zero address.
     */
    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }
    
    function migrationHash( bytes memory _hash, address _to, address _from, uint256 _timestamp,uint256 _amount) public view returns (bytes32){
        return  keccak256(abi.encode(_hash, _from, _to, _timestamp,_amount));
    }
    
  
   
     /**
     * @dev Whitelist transaction to transfer bPlots.
     *
     * See `ERC20._mint`.
     */
    function whitelistMigration(
        bytes memory _hash,
        address _to,
        address _from,
        uint256 _timestamp,
        uint256 _amount
    ) public returns (bytes32) {
        require(msg.sender == authController, "msg.sender is not authController");
        require(migrationStatus[ migrationHash(_hash, _from, _to, _timestamp, _amount)].initiated == false, "Migration is already initiated");
        require(migrationStatus[ migrationHash(_hash, _from, _to, _timestamp, _amount)].completed == false, "Migration has been already completed");
        
        migrationStatus[ migrationHash(_hash, _from, _to, _timestamp, _amount)].initiated = true;
        emit MigrationAuthorised(_hash);

        return migrationHash(_hash, _from, _to, _timestamp, _amount);
        
    }
    
   
     /**
     * @dev Mint bPlots as per whitelisted transaction.
     *
     */
    function migrate(
        bytes memory _hash,
        address _to,
        address _from,
        uint256 _timestamp,
        uint256 _amount
    ) public returns (bool){
        require(msg.sender == migrationController, "msg.sender is not migration controller");
        require(migrationStatus[ migrationHash(_hash, _from, _to, _timestamp, _amount)].initiated == true, "Migration is already initiated");
        require(migrationStatus[ migrationHash(_hash, _from, _to, _timestamp, _amount)].completed == false, "Migration has been already completed");
        
        _mint( _to, _amount);
        migrationStatus[ migrationHash(_hash, _from, _to, _timestamp, _amount)].completed = true;
        emit MigrationCompleted(_hash);

        return true;
    }

    /**
     * @dev Destoys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a `Transfer` event with `to` set to the zero address.
     *
     * Requirements
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function _burn(address account, uint256 value) internal {
        require(account != address(0), "ERC20: burn from the zero address");

        _totalSupply = _totalSupply.sub(value);
        _balances[account] = _balances[account].sub(value);
        emit Transfer(account, address(0), value);
    }

    /**
     * @dev Check if `account` has minting rights
     */
    function isMinter(address account) public view returns (bool) {
        return _minters.has(account);
    }

    /**
     * @dev Add `account` as minter
     */
    function addMinter(address account) public onlyMinter {
        _addMinter(account);
    }

    /**
     * @dev Renounce self as minter
     */
    function renounceMinter() public {
        _removeMinter(msg.sender);
    }

    /**
     * @dev Add `account` as minter
     */
    function _addMinter(address account) internal {
        _minters.add(account);
        emit MinterAdded(account);
    }

    /**
     * @dev Remove `account` from minter role
     */
    function _removeMinter(address account) internal {
        _minters.remove(account);
        emit MinterRemoved(account);
    }

    /**
     * @dev See `IERC20.totalSupply`.
     */
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev See `IERC20.balanceOf`.
     */
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

}
