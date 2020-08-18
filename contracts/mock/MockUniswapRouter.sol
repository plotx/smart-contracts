pragma solidity 0.5.7;

import "../external/uniswap/solidity-interface.sol";
import "../external/openzeppelin-solidity/math/SafeMath.sol";
import "../interfaces/IToken.sol";

contract MockUniswapRouter is IUniswapV2Router02 {

	using SafeMath for uint;

	uint priceOfToken = 1e14;
	address token;

	constructor(address _token) public {
		token = _token;
	}

    function WETH() external pure returns (address) {
    	return 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    }

    function setPrice(uint _newPrice) external {
    	priceOfToken = _newPrice;
    }


    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        payable
        returns (uint[] memory amounts) {
        	uint ethSent = msg.value;
        	uint tokenOutput = ethSent.mul(priceOfToken);
	    	IToken(token).transfer(to, tokenOutput); 
        }

    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts) {
    	amounts = new uint[](2);
    	amounts[0] = amountIn;
    	if(path[0] == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
    		amounts[1] = amountIn.mul(priceOfToken);
    	} else {
    		amounts[1] = amountIn.div(priceOfToken);
    	}
    }

    function () payable external {

    }


}