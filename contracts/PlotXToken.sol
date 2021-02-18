pragma solidity 0.5.7;


import "./external/openzeppelin-solidity/token/ERC20/ERC20.sol";
import "./external/NativeMetaTransaction.sol";
import "./external/openzeppelin-solidity/access/AccessControlMixin.sol";

interface IChildToken {
    function deposit(address user, bytes calldata depositData) external;
}


contract PlotXToken is
    ERC20,
    IChildToken,
    AccessControlMixin,
    NativeMetaTransaction
{
    bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address _operator,
        address childChainManager
    ) public ERC20(name_, symbol_) {
        _setupContractId("ChildERC20");
        _setupDecimals(decimals_);
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(DEPOSITOR_ROLE, childChainManager);
        _initializeEIP712(name_);
        operator = _operator;
    }
    
    mapping(address => uint256) public lockedForGV;

    address public operator;

    modifier onlyOperator() {
        require(_msgSender() == operator, "Not operator");
        _;
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
     * @dev Lock the user's tokens
     * @param _of user's address.
     */
    function lockForGovernanceVote(address _of, uint256 _period)
        public
        onlyOperator
    {
        if (_period.add(now) > lockedForGV[_of])
            lockedForGV[_of] = _period.add(now);
    }

    function isLockedForGV(address _of) public view returns (bool) {
        return (lockedForGV[_of] > now);
    }
    
     /**
     * @dev Transfer token for a specified address
     * @param to The address to transfer to.
     * @param value The amount to be transferred.
     */
    function transfer(address to, uint256 value) public returns (bool) {
        require(lockedForGV[_msgSender()] < now, "Locked for governance"); // if not voted under governance
        _transfer(_msgSender(), to, value);
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
    ) public returns (bool) {
        require(lockedForGV[from] < now, "Locked for governance"); // if not voted under governance
        super.transferFrom(from, to, value);
        return true;
    }
    
    // This is to support Native meta transactions
    // never use msg.sender directly, use _msgSender() instead
    function _msgSender()
        internal
        view
        returns (address payable sender)
    {
        return NativeMetaTransaction._msgSender();
    }

    /**
     * @notice called when token is deposited on root chain
     * @dev Should be callable only by ChildChainManager
     * Should handle deposit by minting the required amount for user
     * Make sure minting is done only by this function
     * @param user user address for whom deposit is being done
     * @param depositData abi encoded amount
     */
    function deposit(address user, bytes calldata depositData)
        external
        only(DEPOSITOR_ROLE)
    {
        uint256 amount = abi.decode(depositData, (uint256));
        _mint(user, amount);
    }

    /**
     * @notice called when user wants to withdraw tokens back to root chain
     * @dev Should burn user's tokens. This transaction will be verified when exiting on root chain
     * @param amount amount of tokens to withdraw
     */
    function withdraw(uint256 amount) external {
        _burn(_msgSender(), amount);
    }
}