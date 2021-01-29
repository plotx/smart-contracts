pragma solidity 0.5.7;
contract IMarketUtility {

    function initialize(address _initiater) external;

    mapping(address => uint256) public conversionRate;

	/**
     * @dev to Set authorized address to update parameters 
     */
    function setAuthorizedAddres() public;

	/**
     * @dev to update uint parameters in Market Config 
     */
    function updateUintParameters(bytes8 code, uint256 value) external;

    /**
     * @dev to Update address parameters in Market Config 
     */
    function updateAddressParameters(bytes8 code, address payable value) external;
 
     /**
    * @dev Get Parameters required to initiate market
    * @return Addresses of tokens to be distributed as incentives
    * @return Cool down time for market
    * @return Rate
    * @return Commission percent for predictions with ETH
    * @return Commission percent for predictions with PLOT
    **/
    function getMarketInitialParams() public view returns(address[] memory, uint , uint, uint, uint);

    function getAssetPriceUSD(address _currencyAddress) external view returns(uint latestAnswer);

    function getAssetValueETH(address _currencyAddress, uint256 _amount)
        public
        view
        returns (uint256 tokenEthValue);
    
    function checkMultiplier(address _asset, address _user, uint _predictionStake, uint predictionPoints, uint _stakeValue) public view returns(uint, bool);
  
    function calculatePredictionPoints(uint _marketId, uint _prediction, address _user, bool multiplierApplied, uint _predictionStake) external view returns(uint64 predictionPoints, bool isMultiplierApplied);

    function calculateOptionRange(uint _optionRangePerc, uint64 _decimals, uint8 _roundOfToNearest, address _marketFeed) external view returns(uint64 _minValue, uint64 _maxValue);
    
    function getOptionPrice(uint256 _marketId, uint _prediction) public view returns(uint64 _optionPrice);
    
    function getPriceFeedDecimals(address _priceFeed) public view returns(uint8);

    function getValueAndMultiplierParameters(address _asset, uint256 _amount)
        public
        view
        returns (uint256, uint256);

    function update() external;
    
    function calculatePredictionValue(uint[] memory params, address asset, address user, address marketFeedAddress, bool _checkMultiplier) public view returns(uint _predictionValue, bool _multiplierApplied);
    
    function isAuthorized(address _address) external view returns(bool);

    /**
     * @dev Get basic market details
     * @return Minimum amount required to predict in market
     * @return Percentage of users leveraged amount to deduct when placed in wrong prediction
     * @return Decimal points for prediction positions
     **/
    function getBasicMarketDetails()
        public
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256
        );

    function getDisputeResolutionParams() public view returns (uint256);
    function calculateOptionPrice(uint[] memory params, address marketFeedAddress) public view returns(uint _optionPrice);

    /**
     * @dev Get price of provided feed address
     * @param _currencyFeedAddress  Feed Address of currency on which market options are based on
     * @return Current price of the market currency
     **/
    function getSettlemetPrice(
        address _currencyFeedAddress,
        uint256 _settleTime
    ) public view returns (uint256 latestAnswer, uint256 roundId);


    function stakingFactorMinStake() external view returns(uint);
    function stakingFactorWeightage() external view returns(uint);
    function currentPriceWeightage() external view returns(uint32);
}
