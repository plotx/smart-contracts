pragma solidity 0.5.7;

import "../external/uniswap/solidity-interface.sol";
import "../external/openzeppelin-solidity/math/SafeMath.sol";
import "../interfaces/IChainLinkOracle.sol";
import "../interfaces/IToken.sol";

contract MarketConfig {

    using SafeMath for uint;

    uint constant lossPercentage = 10;
    uint constant STAKE_WEIGHTAGE = 40;//
    uint constant PRICE_WEIGHTAGE = 60;//
    uint constant OPTION_START_INDEX = 1;//
    uint constant minBet = 1e15;
    uint constant STAKE_WEIGHTAGE_MIN_AMOUNT = 20 ether;//
    address constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    //Two extra decimals added for percentage
    uint internal bonusRewardPerc = 50;
    uint internal uniswapDeadline = 20 minutes;
    uint internal lotPurchasePerc = 50;
    uint internal positionDecimals = 2;

    uint internal betType;//
    uint internal priceStep;//
    uint internal delta;//
    uint internal rate;//
    uint internal PREDICTION_TIME;//
    // uint internal donationPerc;//
    // uint internal commissionPerc;//
    uint internal MIN_TIME_ELAPSED;//
    
    uint internal multiplier;
    uint internal minStakeForMultiplier;
    uint internal stakeForDispute;
    uint internal marketCoolDownTime;
    address internal plotusToken;
    
    address payable internal donationAccount;//
    address payable internal commissionAccount;//
    address payable chainLinkPriceOracle;
    IUniswapV2Router02 uniswapRouter;
    address[] uniswapEthToTokenPath;
    address[] uniswapTokenToEthPath;

    address[] internal predictionAssets;
    address[] internal incentiveTokens;
    mapping(address => bool) internal predictionAssetFlag;
    mapping(address => uint) internal commissionPerc;
    mapping(address => uint) internal stakeRatioForMultiplier;

    IChainLinkOracle internal chainLinkOracle;
    constructor(uint[] memory _uintParams, address payable[] memory _addressParams) public {
        marketCoolDownTime = _uintParams[0];
        priceStep = _uintParams[1];
        lotPurchasePerc = _uintParams[2];
        uniswapDeadline = _uintParams[3];
        rate = _uintParams[4];
        stakeForDispute = _uintParams[5];
        commissionAccount = _addressParams[0];
        chainLinkPriceOracle = _addressParams[1];
        uniswapRouter = IUniswapV2Router02(_addressParams[2]);
        plotusToken = _addressParams[3];
        address weth = uniswapRouter.WETH();
        uniswapEthToTokenPath.push(weth);
        uniswapEthToTokenPath.push(plotusToken);
        uniswapTokenToEthPath.push(plotusToken);
        uniswapTokenToEthPath.push(weth);

        chainLinkOracle = IChainLinkOracle(chainLinkPriceOracle);
    }

    function getBasicMarketDetails() public view returns(uint, uint, uint, uint, uint) {
        return (minBet, bonusRewardPerc,lossPercentage, priceStep, positionDecimals);
    }

    function getPriceCalculationParams(address _marketCurrencyAddress) public view  returns(uint, uint, uint, uint, uint) {
        uint _currencyPrice = getAssetPriceUSD(_marketCurrencyAddress);
        return (OPTION_START_INDEX, STAKE_WEIGHTAGE, STAKE_WEIGHTAGE_MIN_AMOUNT, PRICE_WEIGHTAGE, _currencyPrice);
    }

    function getAssetPriceUSD(address _currencyAddress) public view returns(uint latestAnswer) {
        latestAnswer = uint(chainLinkOracle.latestAnswer());
        if(_currencyAddress != ETH_ADDRESS) {
            // address _exchange = uniswapFactory.getExchange(_currencyAddress);
            uint[] memory output = uniswapRouter.getAmountsOut(IToken(_currencyAddress).decimals(), uniswapTokenToEthPath);
            uint tokenEthPrice = output[1];
            return latestAnswer.mul(tokenEthPrice);
        }
    }

    function getAssetValueETH(address _currencyAddress, uint _amount) public view returns(uint tokenEthValue) {
        tokenEthValue = _amount;
        if(_currencyAddress != ETH_ADDRESS) {
            // address _exchange = uniswapFactory.getExchange(_currencyAddress);
            uint[] memory output = uniswapRouter.getAmountsOut(_amount, uniswapTokenToEthPath);
            tokenEthValue = output[1];
        }
    }

    function getLatestPrice() public view returns(uint) {
        uint latestAnswer = uint(chainLinkOracle.latestAnswer());
        return latestAnswer;
    }

    function getChainLinkPriceOracle() public view returns (address) {
        return chainLinkPriceOracle;
    }

    function getDisputeResolutionParams() public view returns(uint) {
        return stakeForDispute;
    }

    function setCommissionPercentage(address _asset, uint _commissionPerc) external {
        require(predictionAssetFlag[_asset] && _commissionPerc < 100);
        commissionPerc[_asset] = _commissionPerc;
    }

    function getValueAndMultiplierParameters(address _asset, uint _amount) public view returns(uint, uint, uint, uint) {
        uint _value = _amount;
        if(_asset == ETH_ADDRESS) {
            uint[] memory output = uniswapRouter.getAmountsOut(_amount, uniswapEthToTokenPath);
            _value = output[1];
        }
        return (stakeRatioForMultiplier[_asset], multiplier, minStakeForMultiplier, _value);
    }

    function getETHtoTokenRouterAndPath() public view returns(address, address[] memory) {
        return (address(uniswapRouter), uniswapEthToTokenPath);
    }

    function addNewPredictionAsset(address _asset, uint _commisionPerc, uint _ratio) external {
        require(!predictionAssetFlag[_asset] && _commisionPerc < 100);
        predictionAssetFlag[_asset] = true;
        predictionAssets.push(_asset);
        commissionPerc[_asset] = _commisionPerc;
        stakeRatioForMultiplier[_asset] = _ratio;
    }

    function getMarketInitialParams() public view returns(address[] memory, uint , uint, uint, uint) {
        return (incentiveTokens, marketCoolDownTime, rate, commissionPerc[ETH_ADDRESS], commissionPerc[plotusToken]);
    }

    function isValidPredictionAsset(address _asset) public view returns(bool) {
        return predictionAssetFlag[_asset];
    }

 //To be Removed
    function getAssetCommisionAndValue(address _asset, uint _amount) public view returns(uint _commisionPerc, uint _value) {
        _value = _amount;
        if(_asset != ETH_ADDRESS) {
            uint[] memory output = uniswapRouter.getAmountsOut(_amount, uniswapEthToTokenPath);
            _value = output[1];
        }
        return (commissionPerc[_asset], _value);
    }

    function getPurchasePercAndDeadline() public view returns(uint, uint) {
        return (lotPurchasePerc, uniswapDeadline);
    }

    /**
     * @dev to change the uniswap deadline time 
     * @param newDeadline is the value
     */
    function _changeUniswapDeadlineTime(uint newDeadline) internal {
        uniswapDeadline = newDeadline;
    }
}