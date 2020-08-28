pragma solidity 0.5.7;


contract MockUniswapFactory {

  function getPair(address tokenA, address tokenB) external view returns (address pair) {
    return address(0);
  }
}
