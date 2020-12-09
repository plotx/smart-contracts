pragma solidity 0.5.7;

contract IMarketCreationRewards {

    function calculateMarketCreationIncentive(address _createdBy, uint256 _gasCosumed, uint64 _marketId) external;    

    function depositMarketRewardPoolShare(uint256 _marketId, uint256 _ethShare, uint256 _plotShare, uint64 _ethDeposit, uint64 _plotDeposit) external payable;

    function returnMarketRewardPoolShare(uint256 _marketId) external;

    function getMarketCreatorRPoolShareParams(uint256 _market, uint256 plotStaked, uint256 ethStaked) external view returns(uint16, bool);

    function transferAssets(address _asset, address _to, uint _amount) external;

}
