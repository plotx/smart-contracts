pragma solidity 0.5.7;

contract IPlotus {

    enum MarketType {
      HourlyMarket,
      DailyMarket,
      WeeklyMarket
    }
    address public owner;
    address public tokenController;
    address public marketConfig;
    function() external payable{}
    function createGovernanceProposal(string memory proposalTitle, string memory description, string memory solutionHash, bytes memory actionHash, uint256 stakeForDispute, address user) public {
    }
    function callPlacePredictionEvent(address _user,uint _value, uint _predictionPoints, uint _predictionAsset, uint _prediction,uint _leverage) public{
    }
    function callClaimedEvent(address _user , uint[] memory _reward, address[] memory predictionAssets, uint[] memory incentives, address[] memory incentiveTokens) public {
    }
    function callMarketResultEvent(address[] memory predictionAssets, uint[] memory _totalReward, uint[] memory _commision, uint _winningOption) public {
    }
}
