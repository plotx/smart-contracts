pragma solidity 0.5.7;

import "../external/uniswap/solidity-interface.sol";

contract MarketConfig {

    uint constant lossPercentage = 10;
    uint constant STAKE_WEIGHTAGE = 40;//
    uint constant PRICE_WEIGHTAGE = 60;//
    uint constant OPTION_START_INDEX = 1;//
    uint constant maxReturn = 5;
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
    uint internal PREDICTION_TIME;//
    // uint internal donationPerc;//
    // uint internal commissionPerc;//
    uint internal MIN_TIME_ELAPSED;//
    
    uint internal multiplier;
    uint internal stakeForDispute;
    
    address payable internal donationAccount;//
    address payable internal commissionAccount;//
    address payable chainLinkPriceOracle;
    Factory uniswapFactory;

    address[] internal predictionAssets;
    address[] internal incentiveTokens;
    mapping(address => bool) internal predictionAssetFlag;
    mapping(address => uint) internal commissionPerc;
    mapping(address => uint) internal stakeRatioForMultiplier;
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
    }

    function getBasicMarketDetails() public view returns(uint, uint, uint, uint, uint, uint) {
        return (betType, minBet, maxReturn, bonusRewardPerc,lossPercentage, priceStep);
    }

    function getPriceCalculationParams() public view  returns(uint, uint, uint, uint, uint, uint) {
        return (PREDICTION_TIME, OPTION_START_INDEX, STAKE_WEIGHTAGE, STAKE_WEIGHTAGE_MIN_AMOUNT, PRICE_WEIGHTAGE, MIN_TIME_ELAPSED);
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

    function getMultiplierParameters(address _asset) public view returns(uint, uint) {
        return (stakeRatioForMultiplier[_asset], multiplier);
    }

    function addNewPredictionAsset(address _asset, uint _commisionPerc, uint _ratio) external {
        require(!predictionAssetFlag[_asset] && _commisionPerc < 100);
        predictionAssetFlag[_asset] = true;
        predictionAssets.push(_asset);
        commissionPerc[_asset] = _commisionPerc;
        stakeRatioForMultiplier[_asset] = _ratio;
    }

    function getPredictionAssets() public view returns(address[] memory) {
        return predictionAssets;
    }

    function isValidPredictionAsset(address _asset) public view returns(bool) {
        return predictionAssetFlag[_asset];
    }

    function getAssetData(address _asset) public view returns(bool isValidAsset, uint _commisionPerc, address _exchange) {
        uniswapFactory.getExchange(_asset);
        return ( predictionAssetFlag[_asset], commissionPerc[_asset], _exchange);
    }

    function getAssetsAndCommissionParams() public view returns(address[] memory, uint[] memory, address[] memory, uint, uint) {
        uint[] memory _commisionPerc = new uint[](predictionAssets.length);
        for(uint i = 0;i<predictionAssets.length;i++) {
            _commisionPerc[i] = commissionPerc[predictionAssets[i]];
        }
        return (predictionAssets, _commisionPerc, incentiveTokens, uniswapDeadline, lotPurchasePerc);
    }

    /**
     * @dev to change the uniswap deadline time 
     * @param newDeadline is the value
     */
    function _changeUniswapDeadlineTime(uint newDeadline) internal {
        uniswapDeadline = newDeadline;
    }
}