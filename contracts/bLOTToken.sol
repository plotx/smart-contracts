pragma solidity  0.5.7;

import "./external/openzeppelin-solidity/token/ERC20/ERC20.sol";
import "./external/openzeppelin-solidity/access/Roles.sol";
import "./Iupgradable.sol";

contract BLOT is ERC20, Iupgradable {

    using Roles for Roles.Role;

    string public constant name = "PlotusBonusToken";
    string public constant symbol = "bLOT";
    uint8 public constant decimals = 18;

    Roles.Role private _minters;

    address public operator;
    address public plotusToken;

    event MinterAdded(address indexed account);
    event MinterRemoved(address indexed account);

    /**
    * @dev Checks if msg.sender is token operator address.
    */
    modifier onlyOperator() {
        if (operator != address(0))
            require(msg.sender == operator);
        _;
    }

    modifier onlyMinter() {
        require(isMinter(msg.sender), "MinterRole: caller does not have the Minter role");
        _;
    }

    function initiatebLOT(address _defaultMinter) public {
        _addMinter(_defaultMinter);
    }

    /**
    * @dev Change dependancy contrac addresses 
    */
    function changeDependentContractAddress() public {
        plotusToken = ms.dAppToken();
        operator = ms.getLatestAddress("TC");
    }

    /**
     * @dev Changes the master address and update it's instance
     * @param _masterAddress is the new master address
     */
    function changeMasterAddress(address _masterAddress) public {
        if (address(ms) != address(0)) require(address(ms) == msg.sender);
        ms = Master(_masterAddress);
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
    function _transfer(address sender, address recipient, uint256 amount) internal {
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

    function isMinter(address account) public view returns (bool) {
        return _minters.has(account);
    }

    function addMinter(address account) public onlyMinter {
        _addMinter(account);
    }

    function renounceMinter() public {
        _removeMinter(msg.sender);
    }

    function _addMinter(address account) internal {
        _minters.add(account);
        emit MinterAdded(account);
    }

    function _removeMinter(address account) internal {
        _minters.remove(account);
        emit MinterRemoved(account);
    }


}
