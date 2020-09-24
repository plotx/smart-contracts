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

  constructor(address _plotToken, address _bLotToken, uint _endDate) public
  {
    require(_plotToken != address(0));
    require(_bLotToken != address(0));
    require(_endDate > now);
    plotToken = PlotXToken(_plotToken);
    bLotToken = BLOT(_bLotToken);
    owner = msg.sender;
    endDate = _endDate;
    plotToken.approve(address(bLotToken), uint(1000000).mul(10 ** 18));
  }

  function airdropBLot(address[] calldata _userList, uint[] calldata _amount) external {

    require(msg.sender == owner,"Callable by owner only");
    require(_userList.length == _amount.length);

    for(uint i = 0; i < _userList.length; i++) {
      require(_userList[i] != address(0), "can not be null address");
      require(userAllocated[_userList[i]] == 0,"Can allocate only once"); // need to rethink for condition, because if user claims thier tokens it will still be 0 and can allocate again.
      userAllocated[_userList[i]] = _amount[i];
    }    
  }

  function takeLeftOverPlot() external {
    require(endDate <= now, "Callable only after end date");
    require(msg.sender == owner,"Callable by owner only");
    plotToken.transfer(owner, plotToken.balanceOf(address(this)));
  }

  function claim() external {
    require(endDate > now, "Callable only before end date");
    require(userAllocated[msg.sender] > 0, "No Blot allocated");
    uint _amount = userAllocated[msg.sender];
    userAllocated[msg.sender] = 0;
    bLotToken.mint(msg.sender, _amount);
    
  }

  
}