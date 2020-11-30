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

    function transferAssets(address _asset, address _to, uint _amount) external;

}
