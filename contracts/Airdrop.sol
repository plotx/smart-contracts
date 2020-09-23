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

  constructor(address _plotToken, address _bLotToken) public
  {
    require(_plotToken != address(0));
    require(_bLotToken != address(0));
    plotToken = PlotXToken(_plotToken);
    bLotToken = BLOT(_bLotToken);
    owner = msg.sender;
  }

  function airdropBLot(address[] calldata _userList, uint[] calldata _amount) external {

    require(msg.sender == owner,"Callable by owner only");
    require(_userList.length == _amount.length);

    for(uint i = 0; i < _userList.length; i++) {
      require(_userList[i] != address(0));
      plotToken.approve(address(bLotToken), _amount[i]);
      bLotToken.mint(_userList[i], _amount[i]);
    }    
  }

  function takeLeftOverPlot() external {
    require (msg.sender == owner,"Callable by owner only");
    plotToken.transfer(owner, plotToken.balanceOf(address(this)));
  }

  
}