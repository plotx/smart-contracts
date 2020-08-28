pragma solidity 0.5.7;
contract IConfig {

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
 
    function getAssetPriceUSD(address _currencyAddress, bool _isCurrencyERCToken) external view returns(uint latestAnswer);
    function update(address pair) external;
    function setCommissionPercentage(address _asset, uint _commissionPerc) external;
    function addIncentiveToken(address _tokenAddress) external;
}
