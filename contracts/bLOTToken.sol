pragma solidity  0.5.7;

import "./external/openzeppelin-solidity/token/ERC20/ERC20.sol";
import "./external/openzeppelin-solidity/access/roles/MinterRole.sol";

contract BLOT is ERC20, MinterRole {

    string public name;
    string public symbol;
    uint8 public decimals;

    address public plotusAddress;
    address public plotusToken;

    modifier onlyAuthorized {
        require(msg.sender == plotusAddress);
        _;
    }

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
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }

}