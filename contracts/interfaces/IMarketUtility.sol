pragma solidity 0.5.7;
contract IMarketUtility {

    function initialize(address payable[] calldata _addressParams) external;

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

    function getAssetPriceUSD(address _currencyAddress, bool _isCurrencyERCToken) external view returns(uint latestAnswer);
    
    function update(address pair) external;
    
    function calculatePredictionValue(uint[] memory params, address asset, address user, address marketFeedAddress, bool isChainlinkFeed, bool _checkMultiplier) public view returns(uint _predictionValue, bool _multiplierApplied);
    
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
            uint256
        );

    function getDisputeResolutionParams() public view returns (uint256);
    function calculateOptionPrice(uint[] memory params, address marketFeedAddress, bool isChainlinkFeed) public view returns(uint _optionPrice);

    /**
     * @dev Get price of provided feed address
     * @param _currencyFeedAddress  Feed Address of currency on which market options are based on
     * @param _isChainlinkFeed Flag to mention if the market currency feed address is chainlink feed
     * @return Current price of the market currency
     **/
    function getSettlemetPrice(
        address _currencyFeedAddress,
        bool _isChainlinkFeed,
        uint256 _settleTime
    ) public view returns (uint256 latestAnswer, uint256 roundId);
}
