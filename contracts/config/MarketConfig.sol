pragma solidity 0.5.7;

contract MarketConfig {
    
    uint constant STAKE_WEIGHTAGE = 40;//
    uint constant PRICE_WEIGHTAGE = 60;//
    uint constant OPTION_START_INDEX = 1;//
    uint constant maxReturn = 5;
    uint constant minBet = 1e15;
    uint constant priceStep = 10 ether;
    uint constant STAKE_WEIGHTAGE_MIN_AMOUNT = 20 ether;//
    //Two extra decimals added for percentage
    uint public bonusRewardPerc = 50;

    uint public betType;//
    uint public totalOptions;//
    uint public delta;//
    uint public PREDICTION_TIME;//
    uint public donationPerc;//
    uint public commissionPerc;//
    uint public MIN_TIME_ELAPSED;//
    
    address payable public donationAccount;//
    address payable public commissionAccount;//
    constructor(uint[] memory _uintParams, address payable[] memory _addressParams) public {
        betType = _uintParams[0];
        delta = _uintParams[1];
        //Check for odd number of options
        require(_uintParams[2]/2 < (_uintParams[2] + 1)/2);
        totalOptions = _uintParams[2];
        PREDICTION_TIME = _uintParams[3];
        donationPerc = _uintParams[4];
        commissionPerc = _uintParams[5];
        require(donationPerc <= 100);
        require(commissionPerc <= 100);
        MIN_TIME_ELAPSED = (PREDICTION_TIME) / 6;
        donationAccount = _addressParams[0]; 
        commissionAccount = _addressParams[1];
    }

    function getBasicMarketDetails() public view returns(uint, uint, uint, uint, uint, uint) {
        return (betType, totalOptions, minBet, priceStep, maxReturn, bonusRewardPerc);
    }

    function getFundDistributionParams() public view  returns(address payable, uint, address payable, uint) {
        return (donationAccount, donationPerc, commissionAccount, commissionPerc);
    }

    function getPriceCalculationParams() public view  returns(uint, uint, uint, uint, uint, uint, uint) {
        return (PREDICTION_TIME, OPTION_START_INDEX, STAKE_WEIGHTAGE, STAKE_WEIGHTAGE_MIN_AMOUNT, PRICE_WEIGHTAGE, MIN_TIME_ELAPSED, delta);
    }
}