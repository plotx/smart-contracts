pragma solidity 0.5.7;

import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/openzeppelin-solidity/math/Math.sol";
import "./external/govblocks-protocol/Governed.sol";
import "./interfaces/ITokenController.sol";
import "./interfaces/IToken.sol";
import "./interfaces/IAllMarkets.sol";

contract MarketCreationRewards is Governed {

    using SafeMath for *;

	  event MarketCreatorRewardPoolShare(address indexed createdBy, uint256 indexed marketIndex, uint256 plotIncentive);
    event MarketCreationReward(address indexed createdBy, uint256 marketIndex, uint256 plotIncentive, uint256 rewardPoolSharePerc);
    event ClaimedMarketCreationReward(address indexed user, uint256 plotIncentive);

    modifier onlyInternal() {
      IMaster(masterAddress).isInternal(msg.sender);
      _;
    }
    
    struct MarketCreationRewardData {
      uint plotIncentive;
      uint64 plotDeposited;
      uint16 rewardPoolSharePerc;
      address createdBy;
    }

    struct MarketCreationRewardUserData {
      uint incentives;
      uint128 lastClaimedIndex;
      uint64[] marketsCreated;
    }
	
	  uint16 internal maxRewardPoolPercForMC;
    uint16 internal minRewardPoolPercForMC;
    uint256 internal marketCreatorReward;
    address internal plotToken;
    uint256 internal plotStakeForRewardPoolShare;
    uint256 internal rewardPoolShareThreshold;
    uint internal predictionDecimalMultiplier;
    ITokenController internal tokenController;
    IAllMarkets internal allMarkets;
    mapping(uint256 => MarketCreationRewardData) internal marketCreationRewardData; //Of market
    mapping(address => MarketCreationRewardUserData) internal marketCreationRewardUserData; //Of user

    /**
     * @dev Changes the master address and update it's instance
     */
    function setMasterAddress() public {
      OwnedUpgradeabilityProxy proxy =  OwnedUpgradeabilityProxy(address(uint160(address(this))));
      require(msg.sender == proxy.proxyOwner(),"not owner.");
      IMaster ms = IMaster(msg.sender);
      masterAddress = msg.sender;
      plotToken = ms.dAppToken();
      tokenController = ITokenController(ms.getLatestAddress("TC"));
      allMarkets = IAllMarkets(ms.getLatestAddress("AM"));
    }

    /**
    * @dev Function to set inital parameters of contract
    */
    function initialise() external {
      maxRewardPoolPercForMC = 500; // Raised by 2 decimals
      minRewardPoolPercForMC = 50; // Raised by 2 decimals
      plotStakeForRewardPoolShare = 25000 ether;
      rewardPoolShareThreshold = 1 ether; //need to change value (in plot)
      predictionDecimalMultiplier = 10;
      marketCreatorReward = 10 ether; // need to change the value (in plot)
    }

    /**
    * @dev function to update integer parameters
    */
    function updateUintParameters(bytes8 code, uint256 value) external onlyAuthorizedToGovern {
      if(code == "MAXRPSP") { // Max Reward Pool percent for market creator
        maxRewardPoolPercForMC = uint16(value);
      } else if(code == "MINRPSP") { // Min Reward Pool percent for market creator
        minRewardPoolPercForMC = uint16(value);
      } else if(code == "PSFRPS") { // Reward Pool percent for market creator
        plotStakeForRewardPoolShare = value;
      } else if(code == "RPSTH") { // Reward Pool percent for market creator
        rewardPoolShareThreshold = value;
      } else if(code == "MCR") { // Reward for market creator
        marketCreatorReward = value;
      }
    }

    /**
    * @dev function to get integer parameters
    */
    function getUintParameters(bytes8 code) external view returns(bytes8 codeVal, uint256 value) {
      codeVal = code;
      if(code == "MAXRPSP") { // Max Reward Pool percent for market creator
        value = maxRewardPoolPercForMC;
      } else if(code == "MINRPSP") { // Min Reward Pool percent for market creator
        value = minRewardPoolPercForMC;
      } else if(code == "PSFRPS") { // Reward Pool percent for market creator
        value = plotStakeForRewardPoolShare;
      } else if(code == "RPSTH") { // Reward Pool percent for market creator
        value = rewardPoolShareThreshold;
      } else if(code == "MCR") { // Reward for market creator
        value = marketCreatorReward;
      }
    }

    /**
    * @dev internal function to calculate market reward pool share percent to be rewarded to market creator
    */
    function _checkIfCreatorStaked(address _createdBy, uint64 _marketId) internal {
      uint256 tokensLocked = ITokenController(tokenController).tokensLockedAtTime(_createdBy, "SM", now);
      marketCreationRewardData[_marketId].createdBy = _createdBy;
      //Intentionally performed mul operation after div, to get absolute value instead of decimals
      marketCreationRewardData[_marketId].rewardPoolSharePerc
       = uint16(Math.min(
          maxRewardPoolPercForMC,
          minRewardPoolPercForMC + tokensLocked.div(plotStakeForRewardPoolShare).mul(minRewardPoolPercForMC)
        ));
    }

    /**
    * @dev function to calculate user incentive for market creation
    * @param _createdBy Address of market creator
    * @param _marketId Index of market
    */
    function calculateMarketCreationIncentive(address _createdBy, uint64 _marketId) external onlyInternal {
      _checkIfCreatorStaked(_createdBy, _marketId);
      marketCreationRewardUserData[_createdBy].marketsCreated.push(_marketId);
      uint256 incentive = marketCreatorReward;
      marketCreationRewardUserData[_createdBy].incentives = marketCreationRewardUserData[_createdBy].incentives.add(incentive);
      emit MarketCreationReward(_createdBy, _marketId, incentive, marketCreationRewardData[_marketId].rewardPoolSharePerc);
    }

    /**
    * @dev Function to deposit market reward pool share funds for market creator
    * @param _marketId Index of market
    * @param _plotShare PLOT reward pool share
    */
    function depositMarketRewardPoolShare(uint256 _marketId, uint256 _plotShare, uint64 _plotDeposited) external onlyInternal {
    	marketCreationRewardData[_marketId].plotIncentive = _plotShare;
      marketCreationRewardData[_marketId].plotDeposited = _plotDeposited;
     	emit MarketCreatorRewardPoolShare(marketCreationRewardData[_marketId].createdBy, _marketId, _plotShare);
    } 

    /**
    * @dev Function to return the market reward pool share funds of market creator: To be used in case of dispute
    * @param _marketId Index of market
    */
    function returnMarketRewardPoolShare(uint256 _marketId) external onlyInternal{
      uint256 plotToTransfer = marketCreationRewardData[_marketId].plotIncentive.add(marketCreationRewardData[_marketId].plotDeposited.mul(10**predictionDecimalMultiplier));
      delete marketCreationRewardData[_marketId].plotIncentive;
      delete marketCreationRewardData[_marketId].plotDeposited;
      _transferAsset(plotToken, msg.sender, plotToTransfer);
    }

    /**
    * @dev function to reward user for initiating market creation calls as per the new incetive calculations
    */
    function claimCreationReward(uint256 _maxRecords) external {
      uint256 pendingPLOTReward = marketCreationRewardUserData[msg.sender].incentives;
      delete marketCreationRewardUserData[msg.sender].incentives;
      uint256 plotIncentive = _getRewardPoolIncentives(_maxRecords);
      pendingPLOTReward = pendingPLOTReward.add(plotIncentive);
      require(pendingPLOTReward > 0, "No pending");
      _transferAsset(address(plotToken), msg.sender, pendingPLOTReward);
      emit ClaimedMarketCreationReward(msg.sender, pendingPLOTReward);
    }

    /**
    * @dev Transfer `_amount` number of market registry assets contract to `_to` address
    */
    function transferAssets(address _asset, address payable _to, uint _amount) external onlyAuthorizedToGovern {
      _transferAsset(_asset, _to, _amount);
    }

    /**
    * @dev internal function to calculate market reward pool share incentives for market creator
    */
    function _getRewardPoolIncentives(uint256 _maxRecords) internal returns(uint256 plotIncentive) {
      MarketCreationRewardUserData storage rewardData = marketCreationRewardUserData[msg.sender];
      uint256 len = rewardData.marketsCreated.length;
      uint256 lastClaimed = len;
      uint256 count;
      uint128 i;
      for(i = rewardData.lastClaimedIndex;i < len && count < _maxRecords; i++) {
        MarketCreationRewardData storage marketData = marketCreationRewardData[rewardData.marketsCreated[i]];
        if(allMarkets.marketStatus(rewardData.marketsCreated[i]) == IAllMarkets.PredictionStatus.Settled) {
          plotIncentive = plotIncentive.add(marketData.plotIncentive);
          delete marketData.plotIncentive;
          count++;
        } else {
          if(lastClaimed == len) {
            lastClaimed = i;
          }
        }
      }
      if(lastClaimed == len) {
        lastClaimed = i;
      }
      rewardData.lastClaimedIndex = uint128(lastClaimed);
    }

    /**
    * @dev function to get pending reward of user for initiating market creation calls as per the new incetive calculations
    * @param _user Address of user for whom pending rewards to be checked
    * @return plotIncentive Incentives given for creating market as per the gas consumed
    * @return pendingPLOTReward PLOT Reward pool share of markets created by user
    */
    function getPendingMarketCreationRewards(address _user) external view returns(uint256 plotIncentive, uint256 pendingPLOTReward){
      plotIncentive = marketCreationRewardUserData[_user].incentives;
      pendingPLOTReward = _getPendingRewardPoolIncentives(_user);
    }

    /**
    * @dev Get market reward pool share percent to be rewarded to market creator
    */
    function getMarketCreatorRPoolShareParams(uint256 _market, uint256 plotStaked) external view returns(uint16, bool) {
      return (marketCreationRewardData[_market].rewardPoolSharePerc, _checkIfThresholdReachedForRPS(_market, plotStaked));
    }

    /**
    * @dev Check if threshold reached for reward pool share percent for market creator.
    * Calculate total leveraged amount staked in market value in plot
    * @param _marketId Index of market to check threshold
    */
    function _checkIfThresholdReachedForRPS(uint256 _marketId, uint256 plotStaked) internal view returns(bool) {
      return (plotStaked > rewardPoolShareThreshold);
    }

    /**
    * @dev internal function to calculate market reward pool share incentives for market creator
    */
    function _getPendingRewardPoolIncentives(address _user) internal view returns(uint256 plotIncentive) {
      MarketCreationRewardUserData memory rewardData = marketCreationRewardUserData[_user];
      uint256 len = rewardData.marketsCreated.length;
      for(uint256 i = rewardData.lastClaimedIndex;i < len; i++) {
        MarketCreationRewardData memory marketData = marketCreationRewardData[rewardData.marketsCreated[i]];
        if(marketData.plotIncentive > 0) {
          if(allMarkets.marketStatus(rewardData.marketsCreated[i]) == IAllMarkets.PredictionStatus.Settled) {
            plotIncentive = plotIncentive.add(marketData.plotIncentive);
          }
        }
      }
    }

    /**
    * @dev Transfer the assets to specified address.
    * @param _asset The asset transfer to the specific address.
    * @param _recipient The address to transfer the asset of
    * @param _amount The amount which is transfer.
    */
    function _transferAsset(address _asset, address payable _recipient, uint256 _amount) internal {
      if(_amount > 0) { 
          require(IToken(_asset).transfer(_recipient, _amount));
      }
    }

}
