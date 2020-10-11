pragma solidity 0.5.7;


contract MockUniswapFactory {

  address public plotETHPair;
  function getPair(address tokenA, address tokenB) external view returns (address pair) {
    return plotETHPair;
  }

  function setPair(address _plotETHPair) public {
  	plotETHPair = _plotETHPair;
  }
}
