/* Copyright (C) 2020 PlotX.io

  This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

  This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
    along with this program.  If not, see http://www.gnu.org/licenses/ */

pragma solidity 0.5.7;

import "./external/uniswap/solidity-interface.sol";
import "./external/uniswap/FixedPoint.sol";
import "./external/uniswap/oracleLibrary.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./interfaces/ITokenController.sol";
import "./interfaces/IMarketRegistry.sol";
import "./interfaces/IChainLinkOracle.sol";
import "./interfaces/IToken.sol";

contract MarketUtility {
    using SafeMath for uint256;
    using FixedPoint for *;

    address constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint256 constant updatePeriod = 1 hours;

    uint256 internal STAKE_WEIGHTAGE;
    uint256 internal STAKE_WEIGHTAGE_MIN_AMOUNT;
    uint256 internal minTimeElapsedDivisor;
    uint256 internal minPredictionAmount;
    uint256 internal maxPredictionAmount;
    uint256 internal positionDecimals;
    uint256 internal minStakeForMultiplier;
    uint256 internal riskPercentage;
    uint256 internal tokenStakeForDispute;
    address internal plotToken;
    address internal plotETHpair;
    address internal weth;
    address public authorizedAddress;
    bool public initialized;

    address payable chainLinkPriceOracle;

    struct UniswapPriceData {
        FixedPoint.uq112x112 price0Average;
        uint256 price0CumulativeLast;
        FixedPoint.uq112x112 price1Average;
        uint256 price1CumulativeLast;
        uint32 blockTimestampLast;
        bool initialized;
    }

    mapping(address => UniswapPriceData) internal uniswapPairData;
    IUniswapV2Factory uniswapFactory;

    IChainLinkOracle internal chainLinkOracle;
    ITokenController internal tokenController;
    modifier onlyAuthorized() {
        require(msg.sender == authorizedAddress, "Not authorized");
        _;
    }

    /**
     * @dev Initiates the config contact with initial values
     **/
    function initialize(address payable[] memory _addressParams) public {
        OwnedUpgradeabilityProxy proxy = OwnedUpgradeabilityProxy(
            address(uint160(address(this)))
        );
        require(msg.sender == proxy.proxyOwner(), "Sender is not proxy owner.");
        require(!initialized, "Already initialized");
        initialized = true;
        _setInitialParameters();
        authorizedAddress = msg.sender;
        tokenController = ITokenController(IMarketRegistry(msg.sender).tokenController());
        chainLinkPriceOracle = _addressParams[0];
        plotToken = _addressParams[2];
        weth = IUniswapV2Router02(_addressParams[1]).WETH();
        uniswapFactory = IUniswapV2Factory(_addressParams[3]);
        plotETHpair = uniswapFactory.getPair(plotToken, weth);

        chainLinkOracle = IChainLinkOracle(chainLinkPriceOracle);

        _setCummulativePrice();
    }

    /**
     * @dev Internal function to set initial value
     **/
    function _setInitialParameters() internal {
        STAKE_WEIGHTAGE = 40; //
        STAKE_WEIGHTAGE_MIN_AMOUNT = 20 ether;
        minTimeElapsedDivisor = 6;
        minPredictionAmount = 1e15;
        maxPredictionAmount = 28 ether;
        positionDecimals = 1e2;
        minStakeForMultiplier = 5e17;
        riskPercentage = 20;
        tokenStakeForDispute = 100 ether;
    }

    /**
    * @dev Check if user gets any multiplier on his positions
    * @param _asset The assets uses by user during prediction.
    * @param _predictionStake The amount staked by user at the time of prediction.
    * @param predictionPoints The actual positions user got during prediction.
    * @param _stakeValue The stake value of asset.
    * @return uint256 representing multiplied positions
    */
    function checkMultiplier(address _asset, address _user, uint _predictionStake, uint predictionPoints, uint _stakeValue) public view returns(uint, bool) {
      bool multiplierApplied;
      uint _stakedBalance = tokenController.tokensLockedAtTime(_user, "SM", now);
      uint _predictionValueInToken;
      (, _predictionValueInToken) = getValueAndMultiplierParameters(_asset, _predictionStake);
      if(_stakeValue < minStakeForMultiplier) {
        return (predictionPoints,multiplierApplied);
      }
      uint _muliplier = 100;
      if(_stakedBalance.div(_predictionValueInToken) > 0) {
        _muliplier = _muliplier + _stakedBalance.mul(100).div(_predictionValueInToken.mul(10));
        multiplierApplied = true;
      }
      return (predictionPoints.mul(_muliplier).div(100),multiplierApplied);
    }

    /**
     * @dev Updates integer parameters of config
     **/
    function updateUintParameters(bytes8 code, uint256 value)
        external
        onlyAuthorized
    {
        if (code == "SW") { // Stake weightage
            require(value <= 100, "Value must be less or equal to 100");
            STAKE_WEIGHTAGE = value;
        } else if (code == "SWMA") { // Minimum amount required for stake weightage
            STAKE_WEIGHTAGE_MIN_AMOUNT = value;
        } else if (code == "MTED") { // Minimum time elapsed divisor
            minTimeElapsedDivisor = value;
        } else if (code == "MINPRD") { // Minimum predictionamount
            minPredictionAmount = value;
        } else if (code == "MAXPRD") { // Minimum predictionamount
            maxPredictionAmount = value;
        } else if (code == "PDEC") { // Position's Decimals
            positionDecimals = value;
        } else if (code == "MINSTM") { // Min stake required for applying multiplier
            minStakeForMultiplier = value;
        } else if (code == "RPERC") { // Risk percentage
            riskPercentage = value;
        } else if (code == "TSDISP") { // Amount of tokens to be staked for raising a dispute
            tokenStakeForDispute = value;
        } else {
            revert("Invalid code");
        }
    }

    /**
     * @dev Updates address parameters of config
     **/
    function updateAddressParameters(bytes8 code, address payable value)
        external
        onlyAuthorized
    {
        require(value != address(0), "Value cannot be address(0)");
        if (code == "CLORCLE") { // Chainlink Eth oracle address
            chainLinkPriceOracle = value;
            chainLinkOracle = IChainLinkOracle(chainLinkPriceOracle);
        } else if (code == "UNIFAC") { // Uniswap factory address
            uniswapFactory = IUniswapV2Factory(value);
            plotETHpair = uniswapFactory.getPair(plotToken, weth);
        } else {
            revert("Invalid code");
        }
    }

    /**
     * @dev Update cumulative price of token in uniswap
     **/
    function update() external onlyAuthorized {
        UniswapPriceData storage _priceData = uniswapPairData[plotETHpair];
        (
            uint256 price0Cumulative,
            uint256 price1Cumulative,
            uint32 blockTimestamp
        ) = UniswapV2OracleLibrary.currentCumulativePrices(plotETHpair);
        uint32 timeElapsed = blockTimestamp - _priceData.blockTimestampLast; // overflow is desired

        if (timeElapsed >= updatePeriod || !_priceData.initialized) {
            // overflow is desired, casting never truncates
            // cumulative price is in (uq112x112 price * seconds) units so we simply wrap it after division by time elapsed
            _priceData.price0Average = FixedPoint.uq112x112(
                uint224(
                    (price0Cumulative - _priceData.price0CumulativeLast) /
                        timeElapsed
                )
            );
            _priceData.price1Average = FixedPoint.uq112x112(
                uint224(
                    (price1Cumulative - _priceData.price1CumulativeLast) /
                        timeElapsed
                )
            );

            _priceData.price0CumulativeLast = price0Cumulative;
            _priceData.price1CumulativeLast = price1Cumulative;
            _priceData.blockTimestampLast = blockTimestamp;
            if(!_priceData.initialized) {
              _priceData.initialized = true;
            }
        }
    }

    /**
     * @dev Internal function to update pair cummulative price
     **/
    function _setCummulativePrice() internal {
      UniswapPriceData storage _priceData = uniswapPairData[plotETHpair];
      (
          uint256 price0Cumulative,
          uint256 price1Cumulative,
          uint32 blockTimestamp
      ) = UniswapV2OracleLibrary.currentCumulativePrices(plotETHpair);
      _priceData.price0CumulativeLast = price0Cumulative;
      _priceData.price1CumulativeLast = price1Cumulative;
      _priceData.blockTimestampLast = blockTimestamp;
    }

    /**
    * @dev Get decimals of given price feed address 
    */
    function getPriceFeedDecimals(address _priceFeed) public view returns(uint8) {
      return IChainLinkOracle(_priceFeed).decimals();
    }

    /**
     * @dev Get basic market details
     * @return Minimum amount required to predict in market
     * @return Percentage of users leveraged amount to deduct when placed in wrong prediction
     * @return Decimal points for prediction positions
     * @return Maximum prediction amount
     **/
    function getBasicMarketDetails()
        public
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        return (minPredictionAmount, riskPercentage, positionDecimals, maxPredictionAmount);
    }

    /**
     * @dev Get Parameter required for option price calculation
     * @param _marketFeedAddress  Feed Address of currency on which market options are based on
     * @return Stake weightage percentage for calculation option price
     * @return minimum amount of stake required to consider stake weightage
     * @return Current price of the market currency
     * @return Divisor to calculate minimum time elapsed for a market type
     **/
    function getPriceCalculationParams(
        address _marketFeedAddress
    )
        public
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        uint256 _currencyPrice = getAssetPriceUSD(
            _marketFeedAddress
        );
        return (
            STAKE_WEIGHTAGE,
            STAKE_WEIGHTAGE_MIN_AMOUNT,
            _currencyPrice,
            minTimeElapsedDivisor
        );
    }

    /**
     * @dev Get price of provided feed address
     * @param _currencyFeedAddress  Feed Address of currency on which market options are based on
     * @return Current price of the market currency
     **/
    function getAssetPriceUSD(
        address _currencyFeedAddress
    ) public view returns (uint256 latestAnswer) {
        return uint256(IChainLinkOracle(_currencyFeedAddress).latestAnswer());
    }

    /**
     * @dev Get price of provided feed address
     * @param _currencyFeedAddress  Feed Address of currency on which market options are based on
     * @return Current price of the market currency
     **/
    function getSettlemetPrice(
        address _currencyFeedAddress,
        uint256 _settleTime
    ) public view returns (uint256 latestAnswer, uint256 roundId) {
        uint80 currentRoundId;
        uint256 currentRoundTime;
        int256 currentRoundAnswer;
        (currentRoundId, currentRoundAnswer, , currentRoundTime, )= IChainLinkOracle(_currencyFeedAddress).latestRoundData();
        while(currentRoundTime > _settleTime) {
            currentRoundId--;
            (currentRoundId, currentRoundAnswer, , currentRoundTime, )= IChainLinkOracle(_currencyFeedAddress).getRoundData(currentRoundId);
            if(currentRoundTime <= _settleTime) {
                break;
            }
        }
        return
            (uint256(currentRoundAnswer), currentRoundId);
    }

    /**
     * @dev Get value of provided currency address in ETH
     * @param _currencyAddress Address of currency
     * @param _amount Amount of provided currency
     * @return Value of provided amount in ETH
     **/
    function getAssetValueETH(address _currencyAddress, uint256 _amount)
        public
        view
        returns (uint256 tokenEthValue)
    {
        tokenEthValue = _amount;
        if (_currencyAddress != ETH_ADDRESS) {
            tokenEthValue = getPrice(plotETHpair, _amount);
        }
    }

    /**
     * @dev Get price of provided currency address in ETH
     * @param _currencyAddress Address of currency
     * @return Price of provided currency in ETH
     * @return Decimals of the currency
     **/
    function getAssetPriceInETH(address _currencyAddress)
        public
        view
        returns (uint256 tokenEthValue, uint256 decimals)
    {
        tokenEthValue = 1;
        if (_currencyAddress != ETH_ADDRESS) {
            decimals = IToken(_currencyAddress).decimals();
            tokenEthValue = getPrice(plotETHpair, 10**decimals);
        }
    }

    /**
     * @dev Get amount of stake required to raise a dispute
     **/
    function getDisputeResolutionParams() public view returns (uint256) {
        return tokenStakeForDispute;
    }

    /**
     * @dev Get value of _asset in PLOT token and multiplier parameters
     * @param _asset Address of asset for which value is requested
     * @param _amount Amount of _asset
     * @return min prediction amount required for multiplier
     * @return value of given asset in PLOT tokens
     **/
    function getValueAndMultiplierParameters(address _asset, uint256 _amount)
        public
        view
        returns (uint256, uint256)
    {
        uint256 _value = _amount;
        if (_asset == ETH_ADDRESS) {
            address pair = uniswapFactory.getPair(plotToken, weth);
            _value = (uniswapPairData[pair].price1Average)
                .mul(_amount)
                .decode144();
        }
        return (minStakeForMultiplier, _value);
    }

    /**
     * @dev Get Market feed address
     * @return Eth Chainlink feed address
     * @return Uniswap factory address
     **/
    function getFeedAddresses() public view returns (address, address) {
        return (address(chainLinkOracle), address(uniswapFactory));
    }

    /**
     * @dev Get value of token in pair
     **/
    function getPrice(address pair, uint256 amountIn)
        public
        view
        returns (uint256 amountOut)
    {
        amountOut = (uniswapPairData[pair].price0Average)
            .mul(amountIn)
            .decode144();
    }

    /**
    * @dev function to calculate square root of a number
    */
    function sqrt(uint x) internal pure returns (uint y) {
      uint z = (x + 1) / 2;
      y = x;
      while (z < y) {
          y = z;
          z = (x / z + z) / 2;
      }
    }

    /**
    * @dev Calculate the prediction value, passing all the required params
    * params index
    * 0 _prediction
    * 1 neutralMinValue
    * 2 neutralMaxValue
    * 3 startTime
    * 4 expireTime
    * 5 totalStakedETH
    * 6 totalStakedToken
    * 7 ethStakedOnOption
    * 8 plotStakedOnOption
    * 9 _stake
    * 10 _leverage
    */
    function calculatePredictionValue(uint[] memory params, address asset, address user, address marketFeedAddress, bool _checkMultiplier) public view returns(uint _predictionValue, bool _multiplierApplied) {
      uint _stakeValue = getAssetValueETH(asset, params[9]);
      if(_stakeValue < minPredictionAmount || _stakeValue > maxPredictionAmount) {
        return (_predictionValue, _multiplierApplied);
      }
      uint optionPrice;
      
      optionPrice = calculateOptionPrice(params, marketFeedAddress);
      _predictionValue = _calculatePredictionPoints(_stakeValue.mul(positionDecimals), optionPrice, params[10]);
      if(_checkMultiplier) {
        return checkMultiplier(asset, user, params[9],  _predictionValue, _stakeValue);
      }
      return (_predictionValue, _multiplierApplied);
    }

    function _calculatePredictionPoints(uint value, uint optionPrice, uint _leverage) internal pure returns(uint) {
      //leverageMultiplier = levergage + (leverage -1)*0.05; Raised by 3 decimals i.e 1000
      uint leverageMultiplier = 1000 + (_leverage-1)*50;
      value = value.mul(2500).div(1e18);
      // (amount*sqrt(amount*100)*leverage*100/(price*10*125000/1000));
      return value.mul(sqrt(value.mul(10000))).mul(_leverage*100*leverageMultiplier).div(optionPrice.mul(1250000000));
    }

    /**
    * @dev Calculate the option price for given params
    * params
    * 0 _option
    * 1 neutralMinValue
    * 2 neutralMaxValue
    * 3 startTime
    * 4 expireTime
    * 5 totalStakedETH
    * 6 totalStakedToken
    * 7 ethStakedOnOption
    * 8 plotStakedOnOption
    */
    function calculateOptionPrice(uint[] memory params, address marketFeedAddress) public view returns(uint _optionPrice) {
      uint _totalStaked = params[5].add(getAssetValueETH(plotToken, params[6]));
      uint _assetStakedOnOption = params[7]
                                .add(
                                  (getAssetValueETH(plotToken, params[8])));
      _optionPrice = 0;
      uint currentPriceOption = 0;
      uint256 currentPrice = getAssetPriceUSD(
          marketFeedAddress
      );
      uint stakeWeightage = STAKE_WEIGHTAGE;
      uint predictionWeightage = 100 - stakeWeightage;
      uint predictionTime = params[4].sub(params[3]);
      uint minTimeElapsed = (predictionTime).div(minTimeElapsedDivisor);
      if(now > params[4]) {
        return 0;
      }
      if(_totalStaked > STAKE_WEIGHTAGE_MIN_AMOUNT) {
        _optionPrice = (_assetStakedOnOption).mul(1000000).div(_totalStaked.mul(stakeWeightage));
      }

      uint maxDistance;
      if(currentPrice < params[1]) {
        currentPriceOption = 1;
        maxDistance = 2;
      } else if(currentPrice > params[2]) {
        currentPriceOption = 3;
        maxDistance = 2;
      } else {
        currentPriceOption = 2;
        maxDistance = 1;
      }
      uint distance = _getAbsoluteDifference(currentPriceOption, params[0]);
      uint timeElapsed = now > params[3] ? now.sub(params[3]) : 0;
      timeElapsed = timeElapsed > minTimeElapsed ? timeElapsed: minTimeElapsed;
      _optionPrice = _optionPrice.add((((maxDistance+1).sub(distance)).mul(1000000).mul(timeElapsed)).div((maxDistance+1).mul(predictionWeightage).mul(predictionTime)));
      _optionPrice = _optionPrice.div(100);
    }

    /**
    * @dev Internal function to get the absolute difference of two values
    */
    function _getAbsoluteDifference(uint value1, uint value2) internal pure returns(uint) {
      return value1 > value2 ? value1.sub(value2) : value2.sub(value1);
    }
}
