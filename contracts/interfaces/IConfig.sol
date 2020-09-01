pragma solidity 0.5.7;
contract IConfig {

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
    function setCommissionPercentage(address _asset, uint _commissionPerc) external;
    function addIncentiveToken(address _tokenAddress) external;
}
