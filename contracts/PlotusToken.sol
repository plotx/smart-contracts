pragma solidity  0.5.7;

import "./external/lockable-token/LockableToken.sol";
import "./external/openzeppelin-solidity/access/roles/MinterRole.sol";

contract PlotusToken is LockableToken, MinterRole {

    string public name;
    string public symbol;
    uint8 public decimals;

    modifier notLocked(address _user) {
        //Add check to revert if locked for governance
        // require
        _;
    }

    constructor () public {
        name = "PlotusToken";
        symbol = "LOT";
        decimals = 18;
    }

    /**
     * @dev See `IERC20.transfer`.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address recipient, uint256 amount) public notLocked(msg.sender) returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    /**
     * @dev See `ERC20._mint`.
     *
     * Requirements:
     *
     * - the caller must have the `MinterRole`.
     */
    function mint(address account, uint256 amount) public onlyMinter returns (bool) {
        _mint(account, amount);
        return true;
    }

    /**
     * @dev Destoys `amount` tokens from the caller.
     *
     * See `ERC20._burn`.
     */
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }

    /**
     * @dev See `ERC20._burnFrom`.
     */
    function burnFrom(address account, uint256 amount) public {
        _burnFrom(account, amount);
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
        require(_reason == "VEST" || (_reason == "SM" && _time == 30 days) || _reason == "DR");
        uint256 validUntil = now.add(_time); //solhint-disable-line

        // If tokens are already locked, then functions extendLock or
        // increaseLockAmount should be used to make any changes
        require(tokensLocked(msg.sender, _reason) == 0, ALREADY_LOCKED);
        require(_amount != 0, AMOUNT_ZERO);

        if (locked[msg.sender][_reason].amount == 0)
            lockReason[msg.sender].push(_reason);

        transfer(address(this), _amount);

        locked[msg.sender][_reason] = lockToken(_amount, validUntil, false);

        emit Locked(msg.sender, _reason, _amount, validUntil);
        return true;
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
        require(tokensLocked(msg.sender, _reason) > 0, NOT_LOCKED);
        transfer(address(this), _amount);

        locked[msg.sender][_reason].amount = locked[msg.sender][_reason].amount.add(_amount);

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
        require(_reason == "VEST" || _reason == "DR");
        require(tokensLocked(msg.sender, _reason) > 0, NOT_LOCKED);

        locked[msg.sender][_reason].validity = locked[msg.sender][_reason].validity.add(_time);

        emit Locked(msg.sender, _reason, locked[msg.sender][_reason].amount, locked[msg.sender][_reason].validity);
        return true;
    }

}