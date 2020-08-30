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
    bool public initialized
    
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
        } else if(code == "MULT") {
            multiplier = value;
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
        } else {
            revert("Invalid code");
        }
    }

    function updateAddressParameters(bytes8 code, address payable value) external onlyAuthorized {
        if(code == "CLORCLE") {
            chainLinkPriceOracle = value;
            chainLinkOracle = IChainLinkOracle(chainLinkPriceOracle);
        } else if(code == "UNIRTR") {
            uniswapRouter = value;
        } else if(code == "UNIFAC") {
            uniswapFactory = IUniswapV2Factory(value);
            plotETHpair = uniswapFactory.getPair(plotusToken, weth);
        } else {
            revert("Invalid code");
        }
    }

    function addIncentiveToken(address _tokenAddress) external onlyAuthorized {
        incentiveTokens.push(_tokenAddress);
    }

    function getBasicMarketDetails() public view returns(uint, uint, uint, uint) {
        return (minBet, lossPercentage, priceStep, positionDecimals);
    }

    function getPriceCalculationParams(address _marketCurrencyAddress, bool _isMarketCurrencyERCToken) public view  returns(uint, uint, uint, uint) {
        uint _currencyPrice = getAssetPriceUSD(_marketCurrencyAddress, _isMarketCurrencyERCToken);
        return (STAKE_WEIGHTAGE, STAKE_WEIGHTAGE_MIN_AMOUNT, _currencyPrice, minTimeElapsedDivisor);
    }

    function getAssetPriceUSD(address _currencyFeedAddress, bool _isChainlinkFeed) public view returns(uint latestAnswer) {
        // if(_currencyFeedAddress != ETH_ADDRESS) {
        //     return latestAnswer = uint(chainLinkOracle.latestAnswer());
        // }
        if(!(_isChainlinkFeed)) {
            latestAnswer = uint(chainLinkOracle.latestAnswer()).div(1e8);
            // address _exchange = uniswapFactory.getExchange(_currencyFeedAddress);
            // address[] memory path = new address[](2);
            // path[0] = _currencyFeedAddress;
            // path[1] = ETH_ADDRESS;
            // uint[] memory output = uniswapRouter.getAmountsOut(10**uint(IToken(_currencyFeedAddress).decimals()), path);
            // uint tokenEthPrice = output[1];
            // return latestAnswer.mul(tokenEthPrice);
            uint decimals = IToken(IUniswapV2Pair(_currencyFeedAddress).token0()).decimals();
            uint price = getPrice(_currencyFeedAddress, 10**decimals);
            return price;
        } else {
            return uint(IChainLinkOracle(_currencyFeedAddress).latestAnswer()).div(1e8);
        }
    }

    function getAssetValueETH(address _currencyAddress, uint _amount) public view returns(uint tokenEthValue) {
        tokenEthValue = _amount;
        if(_currencyAddress != ETH_ADDRESS) {
            tokenEthValue = getPrice(plotETHpair, _amount);
            // address[] memory path = new address[](2);
            // path[0] = _currencyAddress;
            // path[1] = ETH_ADDRESS;
            // uint[] memory output = uniswapRouter.getAmountsOut(_amount, path);
            // tokenEthValue = output[1];
        }
    }

    function getAssetPriceInETH(address _currencyAddress) public view returns(uint tokenEthValue, uint decimals) {
        tokenEthValue = 1;
        if(_currencyAddress != ETH_ADDRESS) {
            decimals = IToken(_currencyAddress).decimals();
            tokenEthValue = getPrice(plotETHpair, 10**decimals);
            // address[] memory path = new address[](2);
            // path[0] = _currencyAddress;
            // path[1] = ETH_ADDRESS;
            // uint[] memory output = uniswapRouter.getAmountsOut(10**decimals, path);
            // tokenEthValue = output[1];
        }
    }

    function getDisputeResolutionParams() public view returns(uint) {
        return tokenStakeForDispute;
    }

    function setCommissionPercentage(address _asset, uint _commissionPerc) external onlyAuthorized {
        require(commissionPerc[_asset] > 0,"Invalid Asset");
        require(_commissionPerc > 0 && _commissionPerc < 100);
        commissionPerc[_asset] = _commissionPerc;
    }

    function getValueAndMultiplierParameters(address _asset, uint _amount) public view returns(uint, uint, uint) {
        uint _value = _amount;
        if(_asset == ETH_ADDRESS) {
            address pair = uniswapFactory.getPair(plotusToken, weth);
            _value = (uniswapPairData[pair].price1Average).mul(_amount).decode144();
            // uint[] memory output = uniswapRouter.getAmountsOut(_amount, uniswapEthToTokenPath);
            // _value = output[1];
        }
        return (multiplier, minStakeForMultiplier, _value);
    }

    function getETHtoTokenRouterAndPath() public view returns(address, address[] memory) {
        return (uniswapRouter, uniswapEthToTokenPath);
    }

    function getMarketInitialParams() public view returns(address[] memory, uint , uint, uint, uint) {
        return (incentiveTokens, marketCoolDownTime, rate, commissionPerc[ETH_ADDRESS], commissionPerc[plotusToken]);
    }

    function getPurchasePercAndDeadline() public view returns(uint, uint) {
        return (lotPurchasePerc, uniswapDeadline);
    }

    function getFeedAddresses() public view returns(address, address) {
        return (address(chainLinkOracle), address(uniswapFactory));
    }

    function update(address pair) external {
        _update(pair);
        _update(plotETHpair);
    }

    function _update(address pair) internal {
        UniswapPriceData storage _priceData = uniswapPairData[pair];
        (uint price0Cumulative, uint price1Cumulative, uint32 blockTimestamp) =
            UniswapV2OracleLibrary.currentCumulativePrices(pair);
        uint32 timeElapsed = blockTimestamp - _priceData.blockTimestampLast; // overflow is desired

        // ensure that at least one full period has passed since the last update
        // require(timeElapsed >= PERIOD, 'ExampleOracleSimple: PERIOD_NOT_ELAPSED');

        // overflow is desired, casting never truncates
        // cumulative price is in (uq112x112 price * seconds) units so we simply wrap it after division by time elapsed
        _priceData.price0Average = FixedPoint.uq112x112(uint224((price0Cumulative - _priceData.price0CumulativeLast) / timeElapsed));
        _priceData.price1Average = FixedPoint.uq112x112(uint224((price1Cumulative - _priceData.price1CumulativeLast) / timeElapsed));

        _priceData.price0CumulativeLast = price0Cumulative;
        _priceData.price1CumulativeLast = price1Cumulative;
        _priceData.blockTimestampLast = blockTimestamp;
    }


    function getPrice(address pair, uint amountIn) public view returns (uint amountOut) {
        amountOut = (uniswapPairData[pair].price0Average).mul(amountIn).decode144();
    }
}