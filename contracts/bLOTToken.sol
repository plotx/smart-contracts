pragma solidity 0.5.7;

import "./external/openzeppelin-solidity/token/ERC20/ERC20.sol";
import "./external/openzeppelin-solidity/access/Roles.sol";
import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./interfaces/IMaster.sol";
import "./interfaces/Iupgradable.sol";

contract BLOT is Iupgradable {
    using SafeMath for uint256;
    using Roles for Roles.Role;

    string public constant name = "PlotXBonusToken";
    string public constant symbol = "bLOT";
    uint8 public constant decimals = 18;

    Roles.Role private _minters;

    address public operator;
    address public plotToken;

    event MinterAdded(address indexed account);
    event MinterRemoved(address indexed account);

    mapping (address => uint256) internal _balances;

    mapping (address => mapping (address => uint256)) private _allowances;

    uint256 private _totalSupply;

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

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
     * @dev change operator address
     * @param _newOperator address of new operator
     */
    function changeOperator(address _newOperator)
        public
        onlyOperator
        returns (bool)
    {
        require(_newOperator != address(0), "New operator cannot be 0 address");
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

    /**
     * @dev Destroys `amount` tokens from the caller.
     *
     * See `ERC20._burn`.
     */
    function convertToPLOT(
        address _of,
        address _to,
        uint256 amount
    ) public onlyOperator {
        _burn(_of, amount);
        require(IERC20(plotToken).transfer(_to, amount), "Error in transfer");
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
