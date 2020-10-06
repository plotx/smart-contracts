pragma solidity 0.5.7;

import "../MarketUtility.sol";

contract MockConfig is MarketUtility {

	uint public priceOfToken;
    bool public mockFlag;
    mapping(uint => uint) optionPrices;

	function initialize(address payable[] memory _addressParams) public {
		priceOfToken = 1e16;
        mockFlag = true;
		super.initialize(_addressParams);
	}

    function setWeth(address _weth) external {
        weth = _weth;
    }

	function setPrice(uint _newPrice) external {
		priceOfToken = _newPrice;
	}

	function getPrice(address pair, uint amountIn) public view returns (uint amountOut) {
		return amountIn.mul(priceOfToken).div(1e18);
	}

	function getValueAndMultiplierParameters(address _asset, uint _amount) public view returns(uint, uint) {
        uint _value = _amount;
        if(_asset == ETH_ADDRESS) {
            // address pair = uniswapFactory.getPair(plotToken, weth);
            _value = _amount.mul(1e18).div(priceOfToken);
            // uint[] memory output = uniswapRouter.getAmountsOut(_amount, uniswapEthToTokenPath);
            // _value = output[1];
        }
        return (minStakeForMultiplier, _value);
    }

    /**
     * @dev Internal function to update pair cummulative price
     **/
    function _setCummulativePrice() internal {
    }

    function update() external {
    
    }

    function setOptionPrice(uint _option, uint _price) public {
        optionPrices[_option] = _price;
    }

    function setMockPriceFlag(bool _flag) public {
        mockFlag = _flag;
    }

    function calculateOptionPrice(uint[] memory params, address marketFeedAddress) public view returns(uint _optionPrice) {
        if(mockFlag) {
            return optionPrices[params[0]];
          }
        return super.calculateOptionPrice(params, marketFeedAddress);
    }
}