pragma solidity  0.5.7;

import "./external/lockable-token/IERC1132.sol";
import "./PlotusToken.sol";
import "./bLOTToken.sol";
import "./Iupgradable.sol";
import "./interfaces/IToken.sol";
import "./interfaces/IPlotus.sol";
import "./external/govblocks-protocol/Governed.sol";
import "./external/proxy/OwnedUpgradeabilityProxy.sol";

contract TokenController is IERC1132, Governed {
    using SafeMath for uint256;

    event Burned(address indexed member, bytes32 lockedUnder, uint256 amount);

   /**
    * @dev Error messages for require statements
    */
    string internal constant ALREADY_LOCKED = 'Tokens already locked';
    string internal constant NOT_LOCKED = 'No tokens locked';
    string internal constant AMOUNT_ZERO = 'Amount can not be 0';

    uint internal smLockPeriod;
    uint internal burnUptoLimit;

    bool internal constructorCheck;

    PlotusToken public token;
    IPlotus public plotus;
    BLOT public bLOTToken;

    modifier onlyAuthorized {
        require(plotus.isMarket(msg.sender));
        _;
    }

    /**
    * @dev Just for interface
    */
    function setMasterAddress() public {
        OwnedUpgradeabilityProxy proxy =  OwnedUpgradeabilityProxy(address(uint160(address(this))));
        require(msg.sender == proxy.proxyOwner(),"Sender is not proxy owner.");
        require(!constructorCheck);
        smLockPeriod = 30 days;
        burnUptoLimit = 20000000 * 1 ether;
        constructorCheck = true;
        masterAddress = msg.sender;
        Master ms = Master(msg.sender);
        token = PlotusToken(ms.dAppToken());
        bLOTToken = BLOT(ms.getLatestAddress("BL"));
        plotus = IPlotus(address(uint160(ms.getLatestAddress("PL"))));
    }

    /**
     * @dev to change the operator address
     * @param _newOperator is the new address of operator
     */
    function changeOperator(address _newOperator) public onlyAuthorizedToGovern {
        token.changeOperator(_newOperator);
        bLOTToken.changeOperator(_newOperator);
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
        if(code == "SMLP") {
            smLockPeriod = val.mul(1 days);
        } else if(code == "BRLIM") {
            burnUptoLimit = val.mul(1 ether);
        }
    }

    function getUintParameters(bytes8 code) external view returns(bytes8 codeVal, uint val) {
        codeVal = code;
        if(code == "SMLP") {
            val= smLockPeriod.div(1 days);
        } else if(code == "BRLIM") {
            val = burnUptoLimit.div(1 ether);
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

        require(_reason == "VEST" || (_reason == "SM" && _time == smLockPeriod) || _reason == "DR");
        // If tokens are already locked, then functions extendLock or
        // increaseLockAmount should be used to make any changes
        require(tokensLocked(msg.sender, _reason) == 0, ALREADY_LOCKED);
        require(_amount != 0, AMOUNT_ZERO);
        
        uint256 validUntil = _time.add(now); //solhint-disable-line

        if (locked[msg.sender][_reason].amount == 0)
            lockReason[msg.sender].push(_reason);

        token.operatorTransfer(msg.sender, _amount);
        // transfer(address(this), _amount);

        locked[msg.sender][_reason] = LockToken(_amount, validUntil, false);

        emit Locked(msg.sender, _reason, _amount, validUntil);
        return true;
    }


    /**
     * @dev Transfers and Locks a specified amount of tokens,
     *      for a specified reason and time
     * @param _to adress to which tokens are to be transfered
     * @param _reason The reason to lock tokens
     * @param _amount Number of tokens to be transfered and locked
     * @param _time Lock time in seconds
     */
    function transferWithLock(address _to, bytes32 _reason, uint256 _amount, uint256 _time)
        public
        returns (bool)
    {

        require(_reason == "VEST" || (_reason == "SM" && _time == smLockPeriod) || _reason == "DR");
        require(tokensLocked(_to, _reason) == 0, ALREADY_LOCKED);
        require(_amount != 0, AMOUNT_ZERO);
        require(!(token.isLockedForGV(msg.sender)), "Locked for governance");

        uint256 validUntil = now.add(_time); //solhint-disable-line

        if (locked[_to][_reason].amount == 0)
            lockReason[_to].push(_reason);

        token.operatorTransfer(msg.sender, _amount);

        locked[_to][_reason] = LockToken(_amount, validUntil, false);
        
        emit Locked(_to, _reason, _amount, validUntil);
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
        require(_reason == "VEST" || _reason == "SM" || _reason == "DR");
        require(_amount != 0, AMOUNT_ZERO);
        require(tokensLocked(msg.sender, _reason) > 0, NOT_LOCKED);
        token.operatorTransfer(msg.sender, _amount);
        // token.transfer(address(this), _amount);

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
            require(_time == smLockPeriod);
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
    * @dev Mints new token for an address
    * @param _member address to reward the minted tokens
    * @param _amount number of tokens to mint
    */
    function mint(address _member, uint _amount) public onlyAuthorizedToGovern {
        token.mint(_member, _amount);
    }

    /**
    * @dev burns an amount of the tokens of the message sender
    * account.
    * @param amount The amount that will be burnt.
    */
    function burnCommissionTokens(uint256 amount) public onlyAuthorized returns (bool) {
        if((token.totalSupply()).sub(amount) <= burnUptoLimit) {
            return false;
        }
        token.operatorTransfer(msg.sender, amount);
        token.burn(amount);
        return true;
    }

    /**
     * @dev Lock the user's tokens
     * @param _of user's address.
     */
    function lockForGovernanceVote(address _of, uint _days) public onlyAuthorizedToGovern {
        token.lockForGovernanceVote(_of, _days);
    }


    function burnLockedTokens(address _of, bytes32 _reason, uint256 _amount) public onlyAuthorizedToGovern
        returns (bool)
    {
        require(_reason == "DR");
        uint256 amount = tokensLocked(_of, _reason);
        require(amount >= _amount);

        if (amount == _amount) {
            locked[_of][_reason].claimed = true;
        }

        locked[_of][_reason].amount = locked[_of][_reason].amount.sub(_amount);
        if (locked[_of][_reason].amount == 0) {
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
