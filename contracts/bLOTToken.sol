pragma solidity  0.5.7;

import "./external/openzeppelin-solidity/token/ERC20/ERC20.sol";
import "./external/openzeppelin-solidity/access/roles/MinterRole.sol";

contract BLOT is ERC20, MinterRole {

    string public name;
    string public symbol;
    uint8 public decimals;

    address public plotusAddress;
    address public plotusToken;

    /**
    * @dev Checks if msg.sender isauthorized address.
    */
    modifier onlyAuthorized {
        require(msg.sender == plotusAddress);
        _;
    }

    /**
    * @dev Checks to revert if locked for governance.
    */
    modifier notLocked(address _user) {
        //Add check to revert if locked for governance
        // require
        _;
    }

    constructor (address _plotus, address _lotToken) public {
        name = "PlotusBonusToken";
        symbol = "bLOT";
        decimals = 18;
        plotusAddress = _plotus;
        plotusToken = _lotToken;
    }

    /**
     * @dev See `IERC20.transfer`.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address recipient, uint256 amount) public returns (bool) {
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
    function _transfer(address sender, address recipient, uint256 amount) internal notLocked(sender) {
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
     */
    function mint(address account, uint256 amount) public onlyMinter returns (bool) {
        require(IERC20(plotusToken).transferFrom(msg.sender, address(this), amount));
        _mint(account, amount);
        return true;
    }

    /**
     * @dev Destoys `amount` tokens from the caller.
     *
     * See `ERC20._burn`.
     */
    function convert(uint256 amount) public onlyAuthorized {
        IERC20(plotusToken).mint(msg.sender, amount);
        _burn(msg.sender, amount);
    }

    /**
     * @dev Destoys `amount` tokens from the caller.
     *
     * See `ERC20._burn`.
     */
    function burn(uint256 amount) public onlyAuthorized {
        _burn(msg.sender, amount);
    }

}
