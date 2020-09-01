pragma solidity 0.5.7;

import "../external/uniswap/solidity-interface.sol";
import "../external/uniswap/FixedPoint.sol";
import "../external/uniswap/oracleLibrary.sol";
import "../external/openzeppelin-solidity/math/SafeMath.sol";
import "../external/proxy/OwnedUpgradeabilityProxy.sol";
import "../interfaces/IChainLinkOracle.sol";
import "../interfaces/IToken.sol";

contract MarketConfig {

    using SafeMath for uint;
    using FixedPoint for *;

    address constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint constant updatePeriod = 1 hours;

    uint internal STAKE_WEIGHTAGE;
    uint internal STAKE_WEIGHTAGE_MIN_AMOUNT;
    uint internal minTimeElapsedDivisor;
    uint internal minBet;
    uint internal positionDecimals;
    uint internal lotPurchasePerc;
    uint internal priceStep;
    uint internal rate;
    uint internal multiplier;
    uint internal minStakeForMultiplier;
    uint internal lossPercentage;
    uint internal uniswapDeadline;
    uint internal tokenStakeForDispute;
    uint internal marketCoolDownTime;
    address internal plotusToken;
    address internal plotETHpair;
    address internal weth;
    address public authorizedAddress;
    bool public initialized;
    
    address payable chainLinkPriceOracle;

    struct UniswapPriceData {
        FixedPoint.uq112x112 price0Average;
        uint price0CumulativeLast;
        FixedPoint.uq112x112 price1Average;
        uint price1CumulativeLast;
        uint32 blockTimestampLast;
    }
    mapping(address => UniswapPriceData) internal uniswapPairData;
    address payable uniswapRouter;
    IUniswapV2Factory uniswapFactory;
    address[] uniswapEthToTokenPath;

    address[] internal incentiveTokens;
    mapping(address => uint) internal commissionPerc;

    IChainLinkOracle internal chainLinkOracle;

    modifier onlyAuthorized() {
        require(msg.sender == authorizedAddress);
        _;
    }

    /**
    * @dev Initiates the config contact with initial values
    **/
    function initialize(address payable[] memory _addressParams) public {
        OwnedUpgradeabilityProxy proxy =  OwnedUpgradeabilityProxy(address(uint160(address(this))));
        require(msg.sender == proxy.proxyOwner(),"Sender is not proxy owner.");
        require(!initialized, "Already initialized");
        initialized = true;
        _setInitialParameters();
        authorizedAddress = msg.sender;
        chainLinkPriceOracle = _addressParams[0];
        uniswapRouter = _addressParams[1];
        plotusToken = _addressParams[2];
        weth = IUniswapV2Router02(_addressParams[1]).WETH();
        uniswapFactory = IUniswapV2Factory(_addressParams[3]);
        plotETHpair = uniswapFactory.getPair(plotusToken, weth);
        uniswapEthToTokenPath.push(weth);
        uniswapEthToTokenPath.push(plotusToken);
        incentiveTokens.push(plotusToken);
        commissionPerc[ETH_ADDRESS] = 10;
        commissionPerc[plotusToken] = 5;

        chainLinkOracle = IChainLinkOracle(chainLinkPriceOracle);
    }

    /**
    * @dev Internal function to set initial value
    **/
    function _setInitialParameters() internal {
        STAKE_WEIGHTAGE = 40;//
        STAKE_WEIGHTAGE_MIN_AMOUNT = 20 ether;
        minTimeElapsedDivisor = 6;
        minBet = 1e15;
        positionDecimals = 1e2;
        lotPurchasePerc = 50;
        priceStep = 10 ether;
        rate = 1e14;
        multiplier = 10;
        minStakeForMultiplier = 5e17;
        lossPercentage = 20;
        uniswapDeadline = 20 minutes;
        tokenStakeForDispute = 100 ether;
        marketCoolDownTime = 15 minutes;
    }


    /**
    * @dev Updates integer parameters of config
    **/
    function updateUintParameters(bytes8 code, uint256 value) external onlyAuthorized {
        if(code == "SW") {
            require(value <= 100);
            STAKE_WEIGHTAGE = value;
        } else if(code == "SWMA") {
            STAKE_WEIGHTAGE_MIN_AMOUNT = value;
        } else if(code == "MTED") {
            minTimeElapsedDivisor = value;
        } else if(code == "MINBET") {
            minBet = value;
        } else if(code == "PDEC") {
            positionDecimals = value;
        } else if(code == "PPPERC") {
            require(value < 100);
            lotPurchasePerc = value;
        } else if(code == "PSTEP") {
            priceStep = value;
        } else if(code == "RATE") {
            rate = value;
        } else if(code == "MINSTM") {
            minStakeForMultiplier = value;
        } else if(code == "LPERC") {
            lossPercentage = value;
        } else if(code == "UNIDL") {
            uniswapDeadline = value;
        } else if(code == "TSDISP") {
            tokenStakeForDispute = value;
        } else if(code == "CDTIME") {
            marketCoolDownTime = value;
        } else if(code == "ETHCOM") {
            require(_commissionPerc > 0 && _commissionPerc < 100);
            commissionPerc[ETH_ADDRESS] = value;
        } else if(code == "PLOTCOM") {
            require(_commissionPerc > 0 && _commissionPerc < 100);
            commissionPerc[plotusToken] = value;
        } else {
            revert("Invalid code");
        }
    }

    /**
    * @dev Updates address parameters of config
    **/
    function updateAddressParameters(bytes8 code, address payable value) external onlyAuthorized {
        require(value != address(0))
        if(code == "CLORCLE") {
            chainLinkPriceOracle = value;
            chainLinkOracle = IChainLinkOracle(chainLinkPriceOracle);
        } else if(code == "UNIRTR") {
            uniswapRouter = value;
        } else if(code == "UNIFAC") {
            uniswapFactory = IUniswapV2Factory(value);
            plotETHpair = uniswapFactory.getPair(plotusToken, weth);
        } else if(code == "INCTOK") {
            incentiveTokens.push(address(value));
        } else {
            revert("Invalid code");
        }
    }

    /**
    * @dev Get basic market details
    * @return Minimum amount required to predict in market
    * @return Percentage of users prediction amount to deduct when placed in wrong prediction
    * @return Range for step pricing calculation 
    * @return Decimal points for prediction positions 
    **/
    function getBasicMarketDetails() public view returns(uint, uint, uint, uint) {
        return (minBet, lossPercentage, priceStep, positionDecimals);
    }

    /**
    * @dev Get Parameter required for option price calculation
    * @param _marketFeedAddress  Feed Address of currency on which market options are based on
    * @param _isChainlinkFeed Flag to mention if the market currency feed address is chainlink feed
    * @return Stake weightage percentage for calculation option price 
    * @return minimum amount of stake required to consider stake weightage
    * @return Current price of the market currency
    * @return Divisor to calculate minimum time elapsed for a market type 
    **/
    function getPriceCalculationParams(address _marketFeedAddress, bool _isChainlinkFeed) public view  returns(uint, uint, uint, uint) {
        uint _currencyPrice = getAssetPriceUSD(_marketFeedAddress, _isChainlinkFeed);
        return (STAKE_WEIGHTAGE, STAKE_WEIGHTAGE_MIN_AMOUNT, _currencyPrice, minTimeElapsedDivisor);
    }

    /**
    * @dev Get price of provided feed address
    * @param _currencyFeedAddress  Feed Address of currency on which market options are based on
    * @param _isChainlinkFeed Flag to mention if the market currency feed address is chainlink feed
    * @return Current price of the market currency
    **/
    function getAssetPriceUSD(address _currencyFeedAddress, bool _isChainlinkFeed) public view returns(uint latestAnswer) {
        if(!(_isChainlinkFeed)) {
            latestAnswer = uint(chainLinkOracle.latestAnswer()).div(1e8);
            uint decimals = IToken(IUniswapV2Pair(_currencyFeedAddress).token0()).decimals();
            uint price = getPrice(_currencyFeedAddress, 10**decimals);
            return price;
        } else {
            return uint(IChainLinkOracle(_currencyFeedAddress).latestAnswer());
        }
    }

    /**
    * @dev Get value of provided currency address in ETH
    * @param _currencyAddress Address of currency
    * @param _amount Amount of provided currency
    * @return Value of provided amount in ETH
    **/
    function getAssetValueETH(address _currencyAddress, uint _amount) public view returns(uint tokenEthValue) {
        tokenEthValue = _amount;
        if(_currencyAddress != ETH_ADDRESS) {
            tokenEthValue = getPrice(plotETHpair, _amount);
        }
    }

    /**
    * @dev Get price of provided currency address in ETH
    * @param _currencyAddress Address of currency
    * @return Price of provided currency in ETH
    * @return Decimals of the currency
    **/
    function getAssetPriceInETH(address _currencyAddress) public view returns(uint tokenEthValue, uint decimals) {
        tokenEthValue = 1;
        if(_currencyAddress != ETH_ADDRESS) {
            decimals = IToken(_currencyAddress).decimals();
            tokenEthValue = getPrice(plotETHpair, 10**decimals);
        }
    }

    /**
    * @dev Get amount of stake required to raise a dispute
    **/
    function getDisputeResolutionParams() public view returns(uint) {
        return tokenStakeForDispute;
    }

    /**
    * @dev Get value of _asset in PLOT token and multiplier parameters
    * @param _asset Address of asset for which value is requested
    * @param _amount Amount of _asset
    * @return min prediction amount required for multiplier
    * @return value of given assetin PLOT tokens
    **/
    function getValueAndMultiplierParameters(address _asset, uint _amount) public view returns(uint, uint) {
        uint _value = _amount;
        if(_asset == ETH_ADDRESS) {
            address pair = uniswapFactory.getPair(plotusToken, weth);
            _value = (uniswapPairData[pair].price1Average).mul(_amount).decode144();
        }
        return (minStakeForMultiplier, _value);
    }

    /**
    * @dev Get Ether to Plot token conversion path for uniswap
    * @return Uniswap router address
    * @return Path
    **/
    function getETHtoTokenRouterAndPath() public view returns(address, address[] memory) {
        return (uniswapRouter, uniswapEthToTokenPath);
    }

    /**
    * @dev Get Parameters required to initiate market
    * @return Addresses of tokens to be distributed as incentives
    * @return Cool down time for market
    * @return Rate
    * @return Commission percent for predictions with ETH
    * @return Commission percent for predictions with PLOT
    **/
    function getMarketInitialParams() public view returns(address[] memory, uint , uint, uint, uint) {
        return (incentiveTokens, marketCoolDownTime, rate, commissionPerc[ETH_ADDRESS], commissionPerc[plotusToken]);
    }

    /**
    * @dev Get Parameters required to exchanging commission
    * @return Percentage of amount to buy PLOT in uniswap
    * @return Deadline for uniswap exchanges
    **/
    function getPurchasePercAndDeadline() public view returns(uint, uint) {
        return (lotPurchasePerc, uniswapDeadline);
    }

    /**
    * @dev Get Market feed address
    * @return Eth Chainlink feed address 
    * @return Uniswap factory address
    **/
    function getFeedAddresses() public view returns(address, address) {
        return (address(chainLinkOracle), address(uniswapFactory));
    }

    /**
    * @dev Update cummulative price of token in uniswap
    * @param pairAddress Token pair address
    **/
    function update(address pairAddress) external onlyAuthorized {
        if(pairAddress != plotusToken) {
            _update(pairAddress);
        }
        _update(plotETHpair);
    }

    function _update(address pair) internal {
        UniswapPriceData storage _priceData = uniswapPairData[pair];
        (uint price0Cumulative, uint price1Cumulative, uint32 blockTimestamp) =
            UniswapV2OracleLibrary.currentCumulativePrices(pair);
        uint32 timeElapsed = blockTimestamp - _priceData.blockTimestampLast; // overflow is desired

        if(timeElapsed >= updatePeriod) {
            // overflow is desired, casting never truncates
            // cumulative price is in (uq112x112 price * seconds) units so we simply wrap it after division by time elapsed
            _priceData.price0Average = FixedPoint.uq112x112(uint224((price0Cumulative - _priceData.price0CumulativeLast) / timeElapsed));
            _priceData.price1Average = FixedPoint.uq112x112(uint224((price1Cumulative - _priceData.price1CumulativeLast) / timeElapsed));

            _priceData.price0CumulativeLast = price0Cumulative;
            _priceData.price1CumulativeLast = price1Cumulative;
            _priceData.blockTimestampLast = blockTimestamp;
        }
    }

    /**
    * @dev Get value of token in pair
    **/
    function getPrice(address pair, uint amountIn) public view returns (uint amountOut) {
        amountOut = (uniswapPairData[pair].price0Average).mul(amountIn).decode144();
    }
}