pragma solidity 0.5.7;

import "./PlotXToken.sol";
import "./bLOTToken.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/openzeppelin-solidity/token/ERC20/ERC20.sol";


contract Airdrop {

  using SafeMath for uint256;
  BLOT bLotToken;
  PlotXToken public plotToken;
  address owner;
  uint public endDate;

  mapping(address => uint) public userAllocated;
  mapping(address => bool) public userClaimed;

  constructor(address _plotToken, address _bLotToken, uint _endDate) public
  {
    require(_plotToken != address(0),"can not be null address");
    require(_bLotToken != address(0),"can not be null address");
    require(_endDate > now,"end date can not be past time");
    plotToken = PlotXToken(_plotToken);
    bLotToken = BLOT(_bLotToken);
    owner = msg.sender;
    endDate = _endDate;
    plotToken.approve(address(bLotToken), uint(1000000).mul(10 ** 18));
  }

  function airdropBLot(address[] calldata _userList, uint[] calldata _amount) external {

    require(msg.sender == owner,"Callable by owner only");
    require(_userList.length == _amount.length,"should have same length");
    require(endDate > now, "Callable only before end date");

    for(uint i = 0; i < _userList.length; i++) {
      require(_userList[i] != address(0), "can not be null address");
      require(_amount[i] > 0, "can not allocate 0");
      require(userAllocated[_userList[i]] == 0,"Can allocate only once"); 
      userAllocated[_userList[i]] = _amount[i];
    }    
  }

  function takeLeftOverPlot() external {
    require(msg.sender == owner,"Callable by owner only");
    require(endDate <= now, "Callable only after end date");
    plotToken.transfer(owner, plotToken.balanceOf(address(this)));
  }

  function claim() external {
    require(endDate > now, "Callable only before end date");
    require(!userClaimed[msg.sender], "Already claimed");
    userClaimed[msg.sender] = true;
    bLotToken.mint(msg.sender, userAllocated[msg.sender]);
  } 
}
