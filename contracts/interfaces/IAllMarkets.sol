pragma solidity 0.5.7;

contract IAllMarkets {

	enum PredictionStatus {
      Live,
      InSettlement,
      Cooling,
      InDispute,
      Settled
    }

    function marketStatus(uint256 _marketId) public view returns(PredictionStatus);

    function burnDisputedProposalTokens(uint _proposaId) external;

    function getTotalStakedValueInPLOT(uint256 _marketId) public view returns(uint256);

    function getTotalAssetsStaked(uint _marketId) public view returns(uint256 tokenStaked);

    function getTotalStakedWorthInPLOT(uint256 _marketId) public view returns(uint256 _tokenStakedWorth);

    function getMarketCurrencyData(bytes32 currencyType) external view returns(address);

    function getMarketOptionPricingParams(uint _marketId, uint _option) public view returns(uint[] memory,uint32,address);

    function getMarketData(uint256 _marketId) external view returns
       (bytes32 _marketCurrency,uint neutralMinValue,uint neutralMaxValue, uint[] memory _tokenStaked,uint _predictionTime,uint _expireTime, PredictionStatus _predictionStatus);
}
