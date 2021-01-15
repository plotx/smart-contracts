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
}
