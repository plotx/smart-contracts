pragma solidity 0.5.7;

import "../external/uniswap/solidity-interface.sol";
import "../external/uniswap/FixedPoint.sol";
import "../external/uniswap/oracleLibrary.sol";
import "../external/openzeppelin-solidity/math/SafeMath.sol";
import "../external/proxy/OwnedUpgradeabilityProxy.sol";
import "../interfaces/IChainLinkOracle.sol";
import "../interfaces/IToken.sol";

contract MarketUtility {
    using SafeMath for uint256;
    using FixedPoint for *;

    address constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint256 constant updatePeriod = 1 hours;

    uint256 internal STAKE_WEIGHTAGE;
    uint256 internal STAKE_WEIGHTAGE_MIN_AMOUNT;
    uint256 internal minTimeElapsedDivisor;
    uint256 internal minBet;
    uint256 internal positionDecimals;
    uint256 internal lotPurchasePerc;
    uint256 internal priceStep;
    uint256 internal rate;
    uint256 internal multiplier;
    uint256 internal minStakeForMultiplier;
    uint256 internal lossPercentage;
    uint256 internal disributePercFromMFPool;
    uint256 internal transferPercToMFPool;
    uint256 internal uniswapDeadline;
    uint256 internal tokenStakeForDispute;
    uint256 internal marketCoolDownTime;
    uint256 internal kycThreshold;
    address internal plotToken;
    address internal plotETHpair;
    address internal weth;
    address public authorizedAddress;
    address internal authorizedToWhitelist;
    bool public initialized;

    address payable chainLinkPriceOracle;

    struct UniswapPriceData {
        FixedPoint.uq112x112 price0Average;
        uint256 price0CumulativeLast;
        FixedPoint.uq112x112 price1Average;
        uint256 price1CumulativeLast;
        uint32 blockTimestampLast;
    }
    struct UserData {
        bool isKycCompliant;
        bool isAMLCompliant;
    }

    mapping(address => UserData) userData;

    mapping(address => UniswapPriceData) internal uniswapPairData;
    address payable uniswapRouter;
    IUniswapV2Factory uniswapFactory;
    address[] uniswapEthToTokenPath;

    address[] internal incentiveTokens;
    mapping(address => uint256) internal commissionPerc;

    IChainLinkOracle internal chainLinkOracle;

    modifier onlyAuthorized() {
        require(msg.sender == authorizedAddress, "Not authorized");
        _;
    }

    modifier onlyAuthorizedToWhitelist() {
        require(msg.sender == authorizedToWhitelist, "Not AUthorized to whitelist");
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
        chainLinkPriceOracle = _addressParams[0];
        uniswapRouter = _addressParams[1];
        plotToken = _addressParams[2];
        weth = IUniswapV2Router02(_addressParams[1]).WETH();
        uniswapFactory = IUniswapV2Factory(_addressParams[3]);
        plotETHpair = uniswapFactory.getPair(plotToken, weth);
        uniswapEthToTokenPath.push(weth);
        uniswapEthToTokenPath.push(plotToken);
        incentiveTokens.push(plotToken);
        commissionPerc[ETH_ADDRESS] = 10;
        commissionPerc[plotToken] = 5;
        authorizedToWhitelist = _addressParams[4];

        chainLinkOracle = IChainLinkOracle(chainLinkPriceOracle);
    }

    /**
     * @dev Internal function to set initial value
     **/
    function _setInitialParameters() internal {
        STAKE_WEIGHTAGE = 40; //
        STAKE_WEIGHTAGE_MIN_AMOUNT = 20 ether;
        minTimeElapsedDivisor = 6;
        transferPercToMFPool = 2;
        disributePercFromMFPool= 5;
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
        kycThreshold = 10000;
    }

    /**
     * @dev Updates integer parameters of config
     **/
    function updateUintParameters(bytes8 code, uint256 value)
        external
        onlyAuthorized
    {
        if (code == "SW") {
            require(value <= 100, "Value must be less or equal to 100");
            STAKE_WEIGHTAGE = value;
        } else if (code == "SWMA") {
            STAKE_WEIGHTAGE_MIN_AMOUNT = value;
        } else if (code == "MTED") {
            minTimeElapsedDivisor = value;
        } else if (code == "MINBET") {
            minBet = value;
        } else if (code == "PDEC") {
            positionDecimals = value;
        } else if (code == "PPPERC") {
            require(value <= 100, "Value must be less or equal to 100");
            lotPurchasePerc = value;
        } else if (code == "FROMMF") {
            require(value <= 100, "Value must be less or equal to 100");
            disributePercFromMFPool = value;
        } else if (code == "TOMFPOOL") {
            require(value <= 100, "Value must be less or equal to 100");
            transferPercToMFPool = value;
        } else if (code == "PSTEP") {
            priceStep = value;
        } else if (code == "RATE") {
            rate = value;
        } else if (code == "MINSTM") {
            minStakeForMultiplier = value;
        } else if (code == "LPERC") {
            lossPercentage = value;
        } else if (code == "UNIDL") {
            uniswapDeadline = value;
        } else if (code == "TSDISP") {
            tokenStakeForDispute = value;
        } else if (code == "CDTIME") {
            marketCoolDownTime = value;
        } else if (code == "KYCTH") {
            kycThreshold = value;
        } else if (code == "ETHCOM") {
            require(value > 0 && value < 10000, "Value must be between 0-10000");
            commissionPerc[ETH_ADDRESS] = value;
        } else if (code == "PLOTCOM") {
            require(value > 0 && value < 10000, "Value must be between 0-10000");
            commissionPerc[plotToken] = value;
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
        if (code == "CLORCLE") {
            chainLinkPriceOracle = value;
            chainLinkOracle = IChainLinkOracle(chainLinkPriceOracle);
        } else if (code == "UNIRTR") {
            uniswapRouter = value;
        } else if (code == "UNIFAC") {
            uniswapFactory = IUniswapV2Factory(value);
            plotETHpair = uniswapFactory.getPair(plotToken, weth);
        } else if (code == "INCTOK") {
            incentiveTokens.push(address(value));
        } else if (code == "WLAUTH") {
            authorizedToWhitelist = address(value);
        } else {
            revert("Invalid code");
        }
    }

    /**
     * @dev Update cumulative price of token in uniswap
     * @param pairAddress Token pair address
     **/
    function update(address pairAddress) external onlyAuthorized {
        if (pairAddress != plotToken) {
            _update(pairAddress);
        }
        _update(plotETHpair);
    }

    function _update(address pair) internal {
        UniswapPriceData storage _priceData = uniswapPairData[pair];
        (
            uint256 price0Cumulative,
            uint256 price1Cumulative,
            uint32 blockTimestamp
        ) = UniswapV2OracleLibrary.currentCumulativePrices(pair);
        uint32 timeElapsed = blockTimestamp - _priceData.blockTimestampLast; // overflow is desired

        if (timeElapsed >= updatePeriod) {
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
        }
    }

    /**
     * @dev Get basic market details
     * @return Minimum amount required to predict in market
     * @return Percentage of users prediction amount to deduct when placed in wrong prediction
     * @return Range for step pricing calculation
     * @return Decimal points for prediction positions
     **/
    function getBasicMarketDetails()
        public
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        return (minBet, lossPercentage, priceStep, positionDecimals, transferPercToMFPool, disributePercFromMFPool);
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
    function getPriceCalculationParams(
        address _marketFeedAddress,
        bool _isChainlinkFeed
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
            _marketFeedAddress,
            _isChainlinkFeed
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
     * @param _isChainlinkFeed Flag to mention if the market currency feed address is chainlink feed
     * @return Current price of the market currency
     **/
    function getAssetPriceUSD(
        address _currencyFeedAddress,
        bool _isChainlinkFeed
    ) public view returns (uint256 latestAnswer) {
        if(_currencyFeedAddress == ETH_ADDRESS) {
            return (uint256(chainLinkOracle.latestAnswer()))/1e8;
        }
        if (!(_isChainlinkFeed)) {
            uint256 decimals = IToken(
                IUniswapV2Pair(_currencyFeedAddress).token0()
            )
                .decimals();
            uint256 price = getPrice(_currencyFeedAddress, 10**decimals);
            return price;
        } else {
            return
                uint256(IChainLinkOracle(_currencyFeedAddress).latestAnswer());
        }
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
     * @dev Get Ether to Plot token conversion path for uniswap
     * @return Uniswap router address
     * @return Path
     **/
    function getETHtoTokenRouterAndPath()
        public
        view
        returns (address, address[] memory)
    {
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
    function getMarketInitialParams()
        public
        view
        returns (
            address[] memory,
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        return (
            incentiveTokens,
            marketCoolDownTime,
            rate,
            commissionPerc[ETH_ADDRESS],
            commissionPerc[plotToken]
        );
    }

    /**
     * @dev Get Parameters required to exchanging commission
     * @return Percentage of amount to buy PLOT in uniswap
     * @return Deadline for uniswap exchanges
     **/
    function getPurchasePercAndDeadline()
        public
        view
        returns (uint256, uint256)
    {
        return (lotPurchasePerc, uniswapDeadline);
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

    function setAMLComplianceStatus(address _user, bool _status) external onlyAuthorizedToWhitelist {
        userData[_user].isAMLCompliant = _status;
    }

    function setKYCComplianceStatus(address _user, bool _status) external onlyAuthorizedToWhitelist {
        userData[_user].isKycCompliant = _status;
    }

    function checkAMLKYCCompliance(address _user, uint256 _totalEthStaked, uint256 _totalPlotStaked) external returns(bool) {
        if(!userData[_user].isAMLCompliant) {
            return false;
        }
        uint256 _ethPriceUSD = getAssetPriceUSD(ETH_ADDRESS, true);
        uint _totalStaked = _totalEthStaked.mul(_ethPriceUSD).div(1e18);
        uint _plotValueInEth = getAssetValueETH(plotToken, _totalPlotStaked);
        _totalStaked = _totalStaked.add(_plotValueInEth.mul(_ethPriceUSD).div(1e18));
        // _totalStaked = _totalStaked.add(getAssetPriceUSD(ETH_ADDRESS, _totalEthStaked));
        if(_totalStaked > kycThreshold) {
            if(!userData[_user].isKycCompliant) {
                return false;
            }
        }
        return true;
    }
}
