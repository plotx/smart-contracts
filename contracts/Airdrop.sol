pragma solidity 0.5.7;

import "./PlotXToken.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/openzeppelin-solidity/token/ERC20/ERC20.sol";

interface IbLOTToken {
  function mint(address account, uint256 amount) external returns (bool);
}

contract Airdrop {

  using SafeMath for uint256;
  IbLOTToken bLotToken;
  PlotXToken public plotToken;
  address public owner;
  uint public endDate;
  uint public remainingbudget;

  /// @dev mapping to maintain allocated tokens to each user
  mapping(address => uint) public userAllocated;

  /// @dev mapping to maintain if user have claimed or not
  mapping(address => bool) public userClaimed;

  /**
     * @dev modifier that allows only the owner to execute the function
     */
  modifier onlyOwner() {
    require(owner == msg.sender, "Not owner");
        _;
  }

  /**     
   * @dev Constructor     
   * @param _plotToken The address of plot token       
   * @param _bLotToken The address of BLot token   
   * @param _endDate user can claim thier allocated amounts before this time.
   * @param _budget total amount of BLot to be minted
   */
  constructor(address _plotToken, address _bLotToken, uint _endDate, uint _budget) public
  {
    require(_plotToken != address(0),"Can not be null address");
    require(_bLotToken != address(0),"Can not be null address");
    require(_endDate > now,"End date can not be past time");
    plotToken = PlotXToken(_plotToken);
    bLotToken = IbLOTToken(_bLotToken);
    owner = msg.sender;
    endDate = _endDate;
    remainingbudget = _budget;
    plotToken.approve(address(bLotToken), _budget);
  }

  /**
   * @dev Allows owner to allocate Blot to user as mentioned in array.
   * @param _userList The user addresses.
   * @param _amount list of amount to be allocated to user list.
   */
  function airdropBLot(address[] calldata _userList, uint[] calldata _amount) external onlyOwner {

    require(_userList.length == _amount.length,"Should have same length");
    require(endDate > now, "Callable only before end date");
    uint totalAmount=0;

    for(uint i = 0; i < _userList.length; i++) {
      totalAmount = totalAmount.add(_amount[i]);
      require(_userList[i] != address(0), "Can not be null address");
      require(_amount[i] > 0, "Can not allocate 0");
      require(userAllocated[_userList[i]] == 0,"Can allocate only once"); 
      userAllocated[_userList[i]] = _amount[i];
    }  
    require(remainingbudget >= totalAmount, "Limit exceeds");
    remainingbudget = remainingbudget.sub(totalAmount);
  }

  /**
   * @dev Allows owner to take back left over plot token after end date.
   */
  function takeLeftOverPlot() external onlyOwner {
    require(endDate <= now, "Callable only after end date");
    plotToken.transfer(owner, plotToken.balanceOf(address(this)));
  }

  /**
   * @dev Allows users to claim their allocated tokens.
   * user should claim before end date.
   */
  function claim() external {
    require(endDate > now, "Callable only before end date");
    require(!userClaimed[msg.sender], "Already claimed");
    userClaimed[msg.sender] = true;
    bLotToken.mint(msg.sender, userAllocated[msg.sender]);
  } 

  /**
   * @dev Allows owner to transfer ownership to other address.
   * @param _newOwner new owner address
   */
  function tranferOwnership(address _newOwner) external onlyOwner {
    require(_newOwner != address(0), "Can not be null address");
    owner = _newOwner;
  }
  
}
