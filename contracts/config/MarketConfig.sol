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
    //Two extra decimals added for percentage
    uint internal bonusRewardPerc = 50;
    uint internal uniswapDeadline = 20 minutes;
    uint internal lotPurchasePerc = 50;

    uint internal betType;//
    uint internal priceStep;//
    uint internal totalOptions;//
    uint internal delta;//
    uint internal rate;//
    uint internal PREDICTION_TIME;//
    // uint internal donationPerc;//
    // uint internal commissionPerc;//
    uint internal MIN_TIME_ELAPSED;//
    
    uint internal multiplier;
    uint internal minStakeForMultiplier;
    uint internal stakeForDispute;
    uint internal positionDecimals;
    uint internal marketCoolDownTime;
    
    address payable internal donationAccount;//
    address payable internal commissionAccount;//
    address payable chainLinkPriceOracle;
    Factory uniswapFactory;

    address[] internal predictionAssets;
    address[] internal incentiveTokens;
    mapping(address => bool) internal predictionAssetFlag;
    mapping(address => uint) internal commissionPerc;
    mapping(address => uint) internal stakeRatioForMultiplier;

    IChainLinkOracle internal chainLinkOracle;
    constructor(uint[] memory _uintParams, address payable[] memory _addressParams) public {
        betType = _uintParams[0];
        //Check for odd number of options
        require(_uintParams[1]/2 < (_uintParams[1] + 1)/2);
        PREDICTION_TIME = _uintParams[2];
        // donationPerc = _uintParams[3];
        // commissionPerc = _uintParams[4];
        priceStep = _uintParams[5];
        // require(donationPerc <= 100);
        // require(commissionPerc <= 100);
        MIN_TIME_ELAPSED = (PREDICTION_TIME) / 6;
        donationAccount = _addressParams[0]; 
        commissionAccount = _addressParams[1];
        chainLinkPriceOracle = _addressParams[2];
        uniswapFactory = Factory(_addressParams[3]);
        chainLinkOracle = IChainLinkOracle(chainLinkPriceOracle);
    }

    function getBasicMarketDetails() public view returns(uint, uint, uint, uint, uint, uint) {
        return (betType, minBet, bonusRewardPerc,lossPercentage, priceStep, positionDecimals);
    }

    function getPriceCalculationParams(address _marketCurrencyAddress) public view  returns(uint, uint, uint, uint, uint, uint, uint) {
        uint _currencyPrice = getAssetPriceUSD(_marketCurrencyAddress);
        return (PREDICTION_TIME, OPTION_START_INDEX, STAKE_WEIGHTAGE, STAKE_WEIGHTAGE_MIN_AMOUNT, PRICE_WEIGHTAGE, MIN_TIME_ELAPSED, _currencyPrice);
    }

    function getAssetPriceUSD(address _currencyAddress) public view returns(uint latestAnswer) {
        latestAnswer = uint(chainLinkOracle.latestAnswer());
        if(_currencyAddress != 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            address _exchange = uniswapFactory.getExchange(_currencyAddress);
            uint tokenEthPrice = Exchange(_exchange).getTokenToEthInputPrice(IToken(_currencyAddress).decimals());
            return latestAnswer.mul(tokenEthPrice);
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

    function getMultiplierParameters(address _asset) public view returns(uint, uint, uint) {
        return (stakeRatioForMultiplier[_asset], multiplier, minStakeForMultiplier);
    }

    function addNewPredictionAsset(address _asset, uint _commisionPerc, uint _ratio) external {
        require(!predictionAssetFlag[_asset] && _commisionPerc < 100);
        predictionAssetFlag[_asset] = true;
        predictionAssets.push(_asset);
        commissionPerc[_asset] = _commisionPerc;
        stakeRatioForMultiplier[_asset] = _ratio;
    }

    function getMarketInitialParams() public view returns(address[] memory, address[] memory, uint , uint) {
        return (predictionAssets, incentiveTokens, marketCoolDownTime, rate);
    }

    function isValidPredictionAsset(address _asset) public view returns(bool) {
        return predictionAssetFlag[_asset];
    }

    function getAssetData(address _asset) public view returns(uint _commisionPerc, address _exchange) {
        _exchange = uniswapFactory.getExchange(_asset);
        return (commissionPerc[_asset], _exchange);
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