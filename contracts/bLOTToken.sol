pragma solidity  0.5.7;

import "./external/openzeppelin-solidity/token/ERC20/ERC20.sol";
import "./external/openzeppelin-solidity/access/roles/MinterRole.sol";

contract BLOT is ERC20, MinterRole {

    string public name = "PlotusBonusToken";
    string public symbol = "bLOT";
    uint8 public decimals = 18;

    address public operator;
    address public plotusToken;

    /**
    * @dev Checks if msg.sender is token operator address.
    */
    modifier onlyOperator() {
        if (operator != address(0))
            require(msg.sender == operator);
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

    constructor (address _lotToken) public {
        plotusToken = _lotToken;
        operator = msg.sender;
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
     * @dev See `IERC20.transfer`.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address recipient, uint256 amount) public onlyMinter returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    /**
     * @dev See `IERC20.transferFrom`.
     *
     * Emits an `Approval` event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of `ERC20`;
     *
     * Requirements:
     * - `sender` and `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `value`.
     * - the caller must have allowance for `sender`'s tokens of at least
     * `amount`.
     */
    function transferFrom(address sender, address recipient, uint256 amount) public onlyOperator returns (bool) {
        _transferFrom(sender, recipient, amount);
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
    function convertToPLOT(address _of, address _to, uint256 amount) public onlyOperator {
        _burn(_of, amount);
        require(IERC20(plotusToken).transfer(_to, amount));
    }

}
