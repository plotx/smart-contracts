pragma solidity 0.5.7;

contract IMarketRegistry {

    enum MarketType {
      HourlyMarket,
      DailyMarket,
      WeeklyMarket
    }
    address public owner;
    address public tokenController;
    address public marketUtility;
    bool public marketCreationPaused;

    mapping(address => bool) public isMarket;
    function() external payable{}

    function marketDisputeStatus(address _marketAddress) public view returns(uint _status);

    function burnDisputedProposalTokens(uint _proposaId) external;

    function isWhitelistedSponsor(address _address) public view returns(bool);

    function transferAssets(address _asset, address _to, uint _amount) external;

    /**
    * @dev Initialize the PlotX.
    * @param _marketConfig The address of market config.
    * @param _plotToken The address of PLOT token.
    */
    function initiate(address _defaultAddress, address _marketConfig, address _plotToken, address payable[] memory _configParams) public;

    /**
    * @dev Create proposal if user wants to raise the dispute.
    * @param proposalTitle The title of proposal created by user.
    * @param description The description of dispute.
    * @param solutionHash The ipfs solution hash.
    * @param actionHash The action hash for solution.
    * @param stakeForDispute The token staked to raise the diospute.
    * @param user The address who raises the dispute.
    */
    function createGovernanceProposal(string memory proposalTitle, string memory description, string memory solutionHash, bytes memory actionHash, uint256 stakeForDispute, address user, uint256 ethSentToPool, uint256 tokenSentToPool, uint256 proposedValue) public {
    }

    /**
    * @dev Emits the PlacePrediction event and sets user data.
    * @param _user The address who placed prediction.
    * @param _value The amount of ether user staked.
    * @param _predictionPoints The positions user will get.
    * @param _predictionAsset The prediction assets user will get.
    * @param _prediction The option range on which user placed prediction.
    * @param _leverage The leverage selected by user at the time of place prediction.
    */
    function setUserGlobalPredictionData(address _user,uint _value, uint _predictionPoints, address _predictionAsset, uint _prediction,uint _leverage) public{
    }

    /**
    * @dev Emits the claimed event.
    * @param _user The address who claim their reward.
    * @param _reward The reward which is claimed by user.
    * @param incentives The incentives of user.
    * @param incentiveToken The incentive tokens of user.
    */
    function callClaimedEvent(address _user , uint[] memory _reward, address[] memory predictionAssets, uint incentives, address incentiveToken) public {
    }

        /**
    * @dev Emits the MarketResult event.
    * @param _totalReward The amount of reward to be distribute.
    * @param _winningOption The winning option of the market.
    * @param _closeValue The closing value of the market currency.
    */
    function callMarketResultEvent(uint[] memory _totalReward, uint _winningOption, uint _closeValue, uint roundId) public {
    }
}
