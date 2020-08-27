pragma solidity 0.5.7;

contract IMarket {

    enum PredictionStatus {
      Live,
      InSettlement,
      Cooling,
      InDispute,
      Settled
    }

    /**
    * @dev Initialize the market.
    * @param _startTime The time at which market will create.
    * @param _predictionTime The time duration of market.
    * @param _settleTime The time at which result of market will declared.
    * @param _minValue The minimum value of middle option range.
    * @param _maxValue The maximum value of middle option range.
    * @param _marketCurrency The stock name of market.
    * @param _marketCurrencyAddress The address to gets the price calculation params.
    */
    function initiate(uint _startTime, uint _predictionTime, uint _settleTime, uint _minValue, uint _maxValue, bytes32 _marketCurrency,address _marketCurrencyAddress, bool _isERCToken) external payable; 
	
    /**
    * @dev Exchanges the commission after closing the market.
    */
	function exchangeCommission() external;

    /**
    * @dev Resolve the dispute if wrong value passed at the time of market result declaration.
    * @param accepted The flag defining that the dispute raised is accepted or not 
    * @param finalResult The final correct value of market currency.
    */
    function resolveDispute(bool accepted, uint256 finalResult) external;

    /**
    * @dev Gets the market data.
    * @return _marketCurrency bytes32 representing the currency or stock name of the market.
    * @return minvalue uint[] memory representing the minimum range of all the options of the market.
    * @return maxvalue uint[] memory representing the maximum range of all the options of the market.
    * @return _optionPrice uint[] memory representing the option price of each option ranges of the market.
    * @return _assetStaked uint[] memory representing the assets staked on each option ranges of the market.
    * @return _predictionType uint representing the type of market.
    * @return _expireTime uint representing the expire time of the market.
    * @return _predictionStatus uint representing the status of the market.
    */
    function getData() external view 
    	returns (
    		bytes32 _marketCurrency,uint[] memory minvalue,uint[] memory maxvalue,
        	uint[] memory _optionPrice, uint[] memory _assetStaked,uint _predictionType,
        	uint _expireTime, uint _predictionStatus
        );

    // /**
    // * @dev Gets the pending return.
    // * @param _user The address to specify the return of.
    // * @return uint representing the pending return amount.
    // */
    // function getPendingReturn(address _user) external view returns(uint[] memory returnAmount, address[] memory _predictionAssets, uint[] memory incentive, address[] memory _incentiveTokens);

    /**
    * @dev Claim the return amount of the specified address.
    * @param _user The address to query the claim return amount of.
    */
    function claimReturn(address payable _user) public;

}