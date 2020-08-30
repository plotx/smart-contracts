pragma solidity 0.5.7;

import "../config/MarketConfig.sol";

contract MockConfig is MarketConfig {

	uint public priceOfToken;

	function initialize(address payable[] memory _addressParams) public {
		priceOfToken = 1e16;
		super.initialize(_addressParams);
	}

	function setPrice(uint _newPrice) external {
		priceOfToken = _newPrice;
	}

	function getPrice(address pair, uint amountIn) public view returns (uint amountOut) {
		return amountIn.mul(priceOfToken).div(1e18);
	}

	function getValueAndMultiplierParameters(address _asset, uint _amount) public view returns(uint, uint, uint) {
        uint _value = _amount;
        if(_asset == ETH_ADDRESS) {
            // address pair = uniswapFactory.getPair(plotusToken, weth);
            _value = _amount.mul(1e18).div(priceOfToken);
            // uint[] memory output = uniswapRouter.getAmountsOut(_amount, uniswapEthToTokenPath);
            // _value = output[1];
        }
        return (multiplier, minStakeForMultiplier, _value);
    }

    function update(address pair) external {
    
    }
}