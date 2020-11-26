pragma solidity 0.5.7;

contract IMarketCreationRewards {

    function calculateMarketCreationIncentive(address _createdBy, uint256 gasProvided, uint256 _marketType, uint256 _marketCurrencyIndex, uint64 _marketId) external;    

    function depositMarketRewardPoolShare(uint256 _marketId, uint64 _plotShare) external payable;

    function returnMarketRewardPoolShare(uint256 _marketId) external;

    function getMarketCreatorRPoolShareParams(uint256 _market, uint256 plotStaked, uint256 ethStaked) external view returns(uint64, bool);

}
