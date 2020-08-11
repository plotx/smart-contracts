pragma solidity 0.5.7;

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
    uint internal uniswapPurchasePerc = 50;

    uint internal betType;//
    uint internal priceStep;//
    uint internal totalOptions;//
    uint internal delta;//
    uint internal PREDICTION_TIME;//
    // uint internal donationPerc;//
    // uint internal commissionPerc;//
    uint internal MIN_TIME_ELAPSED;//
    
    address payable internal donationAccount;//
    address payable internal commissionAccount;//
    address payable chainLinkPriceOracle;

    address[] internal predictionAssets;
    mapping(address => bool) internal predictionAssetFlag;
    mapping(address => uint) internal commissionPerc;
    constructor(uint[] memory _uintParams, address payable[] memory _addressParams) public {
        betType = _uintParams[0];
        //Check for odd number of options
        require(_uintParams[1]/2 < (_uintParams[1] + 1)/2);
        totalOptions = _uintParams[1];
        PREDICTION_TIME = _uintParams[2];
        // donationPerc = _uintParams[3];
        commissionPerc = _uintParams[4];
        priceStep = _uintParams[5];
        // require(donationPerc <= 100);
        // require(commissionPerc <= 100);
        MIN_TIME_ELAPSED = (PREDICTION_TIME) / 6;
        donationAccount = _addressParams[0]; 
        commissionAccount = _addressParams[1];
        chainLinkPriceOracle = _addressParams[2];
    }

    function getBasicMarketDetails() public view returns(uint, uint, uint, uint, uint, uint, uint) {
        return (betType, totalOptions, minBet, maxReturn, bonusRewardPerc,lossPercentage, priceStep);
    }

    function getFundDistributionParams() public view  returns(address payable, uint, address payable, uint) {
        return (donationAccount, donationPerc, commissionAccount, commissionPerc);
    }

    function getPriceCalculationParams() public view  returns(uint, uint, uint, uint, uint, uint) {
        return (PREDICTION_TIME, OPTION_START_INDEX, STAKE_WEIGHTAGE, STAKE_WEIGHTAGE_MIN_AMOUNT, PRICE_WEIGHTAGE, MIN_TIME_ELAPSED);
    }

    function getChainLinkPriceOracle() public view returns (address){
        return chainLinkPriceOracle;
    }

    function setCommissionPercentage(address _asset, uint _commisionPerc) external {
        require(predictionAssetFlag[_asset] && _commisionPerc < 100);
        commissionPerc[_asset]
    }

    function addNewPredictionAsset(address _asset, uint _commisionPerc) external {
        require(!predictionAssetFlag[_asset] && _commisionPerc < 100);
        predictionAssets.push(_asset);
        commissionPerc[_asset] = _commisionPerc;
    }

    function getPredictionAssets() public view returns(address[] memory) {
        return predictionAssets;
    }

    function isValidPredictionAsset(address _asset) public view returns(bool) {
        return predictionAssetFlag[_asset];
    }

    function getCommissionParameters(address _asset) public view returns(uint, uint, uint) {
        return (commissionPerc[_asset], uniswapDeadline, uniswapPurchasePerc)
    }

    /**
     * @dev to change the uniswap deadline time 
     * @param newDeadline is the value
     */
    function _changeUniswapDeadlineTime(uint newDeadline) internal {
        uniswapDeadline = newDeadline;
    }
}