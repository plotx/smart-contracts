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

pragma solidity  0.5.7;

import "./external/lockable-token/IERC1132.sol";
import "./PlotXToken.sol";
import "./interfaces/IbLOTToken.sol";
import "./Vesting.sol";
import "./interfaces/Iupgradable.sol";
import "./interfaces/IToken.sol";
import "./interfaces/IMarketRegistry.sol";
import "./external/govblocks-protocol/Governed.sol";
import "./external/proxy/OwnedUpgradeabilityProxy.sol";

contract TokenController is IERC1132, Governed, Iupgradable {
    using SafeMath for uint256;

    event Burned(address indexed member, bytes32 lockedUnder, uint256 amount);

   /**
    * @dev Error messages for require statements
    */
    string internal constant ALREADY_LOCKED = "Tokens already locked";
    string internal constant NOT_LOCKED = "No tokens locked";
    string internal constant AMOUNT_ZERO = "Amount can not be 0";

    uint internal smLockPeriod;

    bool internal constructorCheck;

    PlotXToken public token;
    IMarketRegistry public marketRegistry;
    IbLOTToken public bLOTToken;
    Vesting public vesting;

    modifier onlyAuthorized {
        require(marketRegistry.isMarket(msg.sender), "Not authorized");
        _;
    }

    /**
    * @dev Just for interface
    */
    function setMasterAddress() public {
        OwnedUpgradeabilityProxy proxy =  OwnedUpgradeabilityProxy(address(uint160(address(this))));
        require(msg.sender == proxy.proxyOwner(),"Sender is not proxy owner.");
        require(!constructorCheck, "Already ");
        smLockPeriod = 30 days;
        constructorCheck = true;
        masterAddress = msg.sender;
        IMaster ms = IMaster(msg.sender);
        token = PlotXToken(ms.dAppToken());
        bLOTToken = IbLOTToken(ms.getLatestAddress("BL"));
        marketRegistry = IMarketRegistry(address(uint160(ms.getLatestAddress("PL"))));
    }

    function initiateVesting(address _vesting) external {
        OwnedUpgradeabilityProxy proxy =  OwnedUpgradeabilityProxy(address(uint160(address(this))));
        require(msg.sender == proxy.proxyOwner(),"Sender is not proxy owner.");
        vesting = Vesting(_vesting);

    }

    function swapBLOT(address _of, address _to, uint256 amount) public onlyAuthorized {
        bLOTToken.convertToPLOT(_of, _to, amount);
    }

    /**
     * @dev Updates Uint Parameters of a code
     * @param code whose details we want to update
     * @param val value to set
     */
    function updateUintParameters(bytes8 code, uint val) public onlyAuthorizedToGovern {
        if(code == "SMLP") { //Stake multiplier default lock period
            smLockPeriod = val.mul(1 days);
        }
    }

    function getUintParameters(bytes8 code) external view returns(bytes8 codeVal, uint val) {
        codeVal = code;
        if(code == "SMLP") {
            val= smLockPeriod.div(1 days);
        }
    }

    /**
     * @dev Locks a specified amount of tokens against an address,
     *      for a specified reason and time
     * @param _reason The reason to lock tokens
     * @param _amount Number of tokens to be locked
     * @param _time Lock time in seconds
     */
    function lock(bytes32 _reason, uint256 _amount, uint256 _time)
        public
        returns (bool)
    {

        require((_reason == "SM" && _time == smLockPeriod) || _reason == "DR", "Unspecified reason or time");
        require(tokensLocked(msg.sender, _reason) == 0, ALREADY_LOCKED);
        require(_amount != 0, AMOUNT_ZERO);
        
        uint256 validUntil = _time.add(now); //solhint-disable-line

        lockReason[msg.sender].push(_reason);

        require(token.transferFrom(msg.sender, address(this), _amount));

        locked[msg.sender][_reason] = LockToken(_amount, validUntil, false);

        emit Locked(msg.sender, _reason, _amount, validUntil);
        return true;
    }

    /**
     * @dev Returns tokens locked for a specified address for a
     *      specified reason
     *
     * @param _of The address whose tokens are locked
     * @param _reason The reason to query the lock tokens for
     */
    function tokensLocked(address _of, bytes32 _reason)
        public
        view
        returns (uint256 amount)
    {
        if (!locked[_of][_reason].claimed)
            amount = locked[_of][_reason].amount;
    }
    
    /**
     * @dev Returns tokens locked for a specified address for a
     *      specified reason at a specific time
     *
     * @param _of The address whose tokens are locked
     * @param _reason The reason to query the lock tokens for
     * @param _time The timestamp to query the lock tokens for
     */
    function tokensLockedAtTime(address _of, bytes32 _reason, uint256 _time)
        public
        view
        returns (uint256 amount)
    {
        if (locked[_of][_reason].validity > _time)
            amount = locked[_of][_reason].amount;
    }

    /**
     * @dev Returns total tokens held by an address (locked + transferable)
     * @param _of The address to query the total balance of
     */
    function totalBalanceOf(address _of)
        public
        view
        returns (uint256 amount)
    {
        amount = token.balanceOf(_of);

        for (uint256 i = 0; i < lockReason[_of].length; i++) {
            amount = amount.add(tokensLocked(_of, lockReason[_of][i]));
        }  
        amount = amount.add(vesting.unclaimedAllocation(_of)); 
    }   

    function totalSupply() public view returns (uint256)
    {
        return token.totalSupply();
    }

    /**
     * @dev Increase number of tokens locked for a specified reason
     * @param _reason The reason to lock tokens
     * @param _amount Number of tokens to be increased
     */
    function increaseLockAmount(bytes32 _reason, uint256 _amount)
        public
        returns (bool)
    {
        require(_reason == "SM" || _reason == "DR","Unspecified reason");
        require(_amount != 0, AMOUNT_ZERO);
        require(tokensLocked(msg.sender, _reason) > 0, NOT_LOCKED);
        require(token.transferFrom(msg.sender, address(this), _amount));

        locked[msg.sender][_reason].amount = locked[msg.sender][_reason].amount.add(_amount);
        if(_reason == "SM") {
            locked[msg.sender][_reason].validity = locked[msg.sender][_reason].validity.add(smLockPeriod);
        }
        
        emit Locked(msg.sender, _reason, locked[msg.sender][_reason].amount, locked[msg.sender][_reason].validity);
        return true;
    }

    /**
     * @dev Extends lock for a specified reason and time
     * @param _reason The reason to lock tokens
     * @param _time Lock extension time in seconds
     */
    function extendLock(bytes32 _reason, uint256 _time)
        public
        returns (bool)
    {
        if(_reason == "SM") {
            require(_time == smLockPeriod, "Must be smLockPeriod");
        }
        require(_time != 0, "Time cannot be zero");
        require(tokensLocked(msg.sender, _reason) > 0, NOT_LOCKED);

        locked[msg.sender][_reason].validity = locked[msg.sender][_reason].validity.add(_time);

        emit Locked(msg.sender, _reason, locked[msg.sender][_reason].amount, locked[msg.sender][_reason].validity);
        return true;
    }

    /**
     * @dev Returns unlockable tokens for a specified address for a specified reason
     * @param _of The address to query the the unlockable token count of
     * @param _reason The reason to query the unlockable tokens for
     */
    function tokensUnlockable(address _of, bytes32 _reason)
        public
        view
        returns (uint256 amount)
    {
        if (locked[_of][_reason].validity <= now && !locked[_of][_reason].claimed) //solhint-disable-line
            amount = locked[_of][_reason].amount;
    }

    /**
     * @dev Unlocks the unlockable tokens of a specified address
     * @param _of Address of user, claiming back unlockable tokens
     */
    function unlock(address _of)
        public
        returns (uint256 unlockableTokens)
    {
        // require(!(token.isLockedForGV(_of)));
        uint256 lockedTokens;

        for (uint256 i = 0; i < lockReason[_of].length; i++) {
            lockedTokens = tokensUnlockable(_of, lockReason[_of][i]);
            if (lockedTokens > 0) {
                unlockableTokens = unlockableTokens.add(lockedTokens);
                locked[_of][lockReason[_of][i]].amount = locked[_of][lockReason[_of][i]].amount.sub(lockedTokens);
                locked[_of][lockReason[_of][i]].claimed = true;
                emit Unlocked(_of, lockReason[_of][i], lockedTokens);
            }
            if (locked[_of][lockReason[_of][i]].amount == 0) {
                _removeReason(_of, lockReason[_of][i]);
                i--;
            }
        }  

        if (unlockableTokens > 0)
            token.transfer(_of, unlockableTokens);
    }

    /**
     * @dev Gets the unlockable tokens of a specified address
     * @param _of The address to query the the unlockable token count of
     */
    function getUnlockableTokens(address _of)
        public
        view
        returns (uint256 unlockableTokens)
    {
        for (uint256 i = 0; i < lockReason[_of].length; i++) {
            unlockableTokens = unlockableTokens.add(tokensUnlockable(_of, lockReason[_of][i]));
        }  
    }

    /**
     * @dev Lock the user's tokens
     * @param _of user's address.
     */
    function lockForGovernanceVote(address _of, uint _period) public onlyAuthorizedToGovern {
        token.lockForGovernanceVote(_of, _period);
    }


    function burnLockedTokens(address _of, bytes32 _reason, uint256 _amount) public onlyAuthorizedToGovern
        returns (bool)
    {
        require(_reason == "DR","Reason must be DR");
        uint256 amount = tokensLockedAtTime(_of, _reason, now);
        require(amount >= _amount, "Tokens locked must be greater than amount");

        locked[_of][_reason].amount = locked[_of][_reason].amount.sub(_amount);
        if (locked[_of][_reason].amount == 0) {
            locked[_of][_reason].claimed = true;
            _removeReason(_of, _reason);
        }
        token.burn(_amount);
        emit Burned(_of, _reason, _amount);
    }

    function _removeReason(address _of, bytes32 _reason) internal {
        uint len = lockReason[_of].length;
        for (uint i = 0; i < len; i++) {
            if (lockReason[_of][i] == _reason) {
                lockReason[_of][i] = lockReason[_of][len.sub(1)];
                lockReason[_of].pop();
                break;
            }
        }   
    }

}
