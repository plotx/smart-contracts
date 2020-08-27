pragma solidity 0.5.7;

import "../external/uniswap/solidity-interface.sol";
import "../external/openzeppelin-solidity/math/SafeMath.sol";
import "../interfaces/IChainLinkOracle.sol";
import "../interfaces/IToken.sol";

contract MarketConfig {

    using SafeMath for uint;
    
    address constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    uint internal STAKE_WEIGHTAGE = 40;//
    uint internal PRICE_WEIGHTAGE = 60;//
    uint internal STAKE_WEIGHTAGE_MIN_AMOUNT = 20 ether;
    uint internal minTimeElapsedDivisor = 6;
    uint internal minBet = 1e15;
    uint internal positionDecimals = 1e2;
    uint internal lotPurchasePerc = 50;
    uint internal priceStep = 10 ether;
    uint internal rate = 1e14;
    uint internal multiplier = 10;
    uint internal minStakeForMultiplier = 5e17;
    uint internal lossPercentage = 20;
    uint internal uniswapDeadline = 20 minutes;
    uint internal tokenStakeForDispute = 100 ether;
    uint internal marketCoolDownTime = 15 minutes;
    address internal plotusToken;
    address public authorizedAddress;
    
    address payable chainLinkPriceOracle;
    IUniswapV2Router02 uniswapRouter;
    address[] uniswapEthToTokenPath;
    address[] uniswapTokenToEthPath;

    address[] internal incentiveTokens;
    mapping(address => uint) internal commissionPerc;

    IChainLinkOracle internal chainLinkOracle;

    modifier onlyAuthorized() {
        require(msg.sender == authorizedAddress);
        _;
    }

    constructor(address payable[] memory _addressParams) public {
        chainLinkPriceOracle = _addressParams[0];
        uniswapRouter = IUniswapV2Router02(_addressParams[1]);
        plotusToken = _addressParams[2];
        address weth = uniswapRouter.WETH();
        uniswapEthToTokenPath.push(weth);
        uniswapEthToTokenPath.push(plotusToken);
        uniswapTokenToEthPath.push(plotusToken);
        uniswapTokenToEthPath.push(weth);
        incentiveTokens.push(plotusToken);
        commissionPerc[ETH_ADDRESS] = 10;
        commissionPerc[plotusToken] = 5;

        chainLinkOracle = IChainLinkOracle(chainLinkPriceOracle);
    }

    function setAuthorizedAddres() public {
        require(authorizedAddress == address(0));
        authorizedAddress = msg.sender;
    }

    function updateUintParameters(bytes8 code, uint256 value) external onlyAuthorized {
        if(code == "SW") {
            require(value.add(PRICE_WEIGHTAGE) == 100);
            STAKE_WEIGHTAGE = value;
        } else if(code == "PW") {
            require(value.add(STAKE_WEIGHTAGE) == 100);
            PRICE_WEIGHTAGE = value;
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
        }
    }

    function updateAddressParameters(bytes8 code, address payable value) external onlyAuthorized {
        if(code == "CLORCLE") {
            chainLinkPriceOracle = value;
        } else if(code == "UNIRTR") {
            uniswapRouter = IUniswapV2Router02(value);
        }
    }

    function getBasicMarketDetails() public view returns(uint, uint, uint, uint) {
        return (minBet, lossPercentage, priceStep, positionDecimals);
    }

    function getPriceCalculationParams(address _marketCurrencyAddress, bool _isMarketCurrencyERCToken) public view  returns(uint, uint, uint, uint, uint) {
        uint _currencyPrice = getAssetPriceUSD(_marketCurrencyAddress, _isMarketCurrencyERCToken);
        return (STAKE_WEIGHTAGE, STAKE_WEIGHTAGE_MIN_AMOUNT, PRICE_WEIGHTAGE, _currencyPrice, minTimeElapsedDivisor);
    }

    function getAssetPriceUSD(address _currencyAddress, bool _isChainlinkFeed) public view returns(uint latestAnswer) {
        // if(_currencyAddress != ETH_ADDRESS) {
        //     return latestAnswer = uint(chainLinkOracle.latestAnswer());
        // }
        if(!(_isChainlinkFeed)) {
            latestAnswer = uint(chainLinkOracle.latestAnswer()).div(1e8);
            // address _exchange = uniswapFactory.getExchange(_currencyAddress);
            address[] memory path = new address[](2);
            path[0] = _currencyAddress;
            path[1] = ETH_ADDRESS;
            uint[] memory output = uniswapRouter.getAmountsOut(10**uint(IToken(_currencyAddress).decimals()), path);
            uint tokenEthPrice = output[1];
            return latestAnswer.mul(tokenEthPrice);
        } else {
            return uint(IChainLinkOracle(_currencyAddress).latestAnswer()).div(1e8);
        }
    }

    function getAssetValueETH(address _currencyAddress, uint _amount) public view returns(uint tokenEthValue) {
        tokenEthValue = _amount;
        if(_currencyAddress != ETH_ADDRESS) {
            address[] memory path = new address[](2);
            path[0] = _currencyAddress;
            path[1] = ETH_ADDRESS;
            uint[] memory output = uniswapRouter.getAmountsOut(_amount, path);
            tokenEthValue = output[1];
        }
    }

    function getAssetPriceInETH(address _currencyAddress) public view returns(uint tokenEthValue, uint decimals) {
        tokenEthValue = 1;
        if(_currencyAddress != ETH_ADDRESS) {
            address[] memory path = new address[](2);
            path[0] = _currencyAddress;
            path[1] = ETH_ADDRESS;
            decimals = IToken(_currencyAddress).decimals();
            uint[] memory output = uniswapRouter.getAmountsOut(10**decimals, path);
            tokenEthValue = output[1];
        }
    }

    function getDisputeResolutionParams() public view returns(uint) {
        return tokenStakeForDispute;
    }

    function setCommissionPercentage(address _asset, uint _commissionPerc) external {
        require(commissionPerc[_asset] > 0,"Invalid Asset");
        require(_commissionPerc > 0 && _commissionPerc < 100);
        commissionPerc[_asset] = _commissionPerc;
    }

    function getValueAndMultiplierParameters(address _asset, uint _amount) public view returns(uint, uint, uint) {
        uint _value = _amount;
        if(_asset == ETH_ADDRESS) {
            uint[] memory output = uniswapRouter.getAmountsOut(_amount, uniswapEthToTokenPath);
            _value = output[1];
        }
        return (multiplier, minStakeForMultiplier, _value);
    }

    function getETHtoTokenRouterAndPath() public view returns(address, address[] memory) {
        return (address(uniswapRouter), uniswapEthToTokenPath);
    }

    function getMarketInitialParams() public view returns(address[] memory, uint , uint, uint, uint) {
        return (incentiveTokens, marketCoolDownTime, rate, commissionPerc[ETH_ADDRESS], commissionPerc[plotusToken]);
    }

    function getPurchasePercAndDeadline() public view returns(uint, uint) {
        return (lotPurchasePerc, uniswapDeadline);
    }
}