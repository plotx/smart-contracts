pragma solidity 0.5.7;

contract IMarket {

    function initiate(uint _startTime, uint _predictionTime, uint _settleTime, uint _minValue, uint _maxValue, bytes32 _marketCurrency,address _marketCurrencyAddress) external payable; 
	
	function exchangeCommission() external;

    function resolveDispute(uint256 finalResult) external;

    function getData() external view 
    	returns (
    		bytes32 _marketCurrency,uint[] memory minvalue,uint[] memory maxvalue,
        	uint[] memory _optionPrice, uint[] memory _assetStaked,uint _predictionType,
        	uint _expireTime, uint _predictionStatus
        );

    function getPendingReturn(address _user) external view returns(uint, uint);

    function claimReturn(address payable _user) public;

}