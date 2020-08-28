pragma solidity 0.5.7;


contract MockUniswapPair {

	address public token0;
	address public token1;
	constructor(address _token0, address _token1) public {
		token0 = _token0;
		token1 = _token1;
	}

}
