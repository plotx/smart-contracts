pragma solidity 0.5.7;

import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/openzeppelin-solidity/math/Math.sol";
import "./external/govblocks-protocol/Governed.sol";
import "./interfaces/ITokenController.sol";
import "./interfaces/IChainLinkOracle.sol";
import "./interfaces/IMarketUtility.sol";
import "./interfaces/IToken.sol";
import "./interfaces/IAllMarkets.sol";

contract MarketCreationRewards is Governed {

    using SafeMath for *;

	  event MarketCreatorRewardPoolShare(address indexed createdBy, uint256 indexed marketIndex, uint256 plotIncentive, uint256 ethIncentive);
    event MarketCreationReward(address indexed createdBy, uint256 marketIndex, uint256 plotIncentive, uint256 gasUsed, uint256 gasCost, uint256 gasPriceConsidered, uint256 gasPriceGiven, uint256 maxGasCap, uint256 rewardPoolSharePerc);
    event ClaimedMarketCreationReward(address indexed user, uint256 ethIncentive, uint256 plotIncentive);

    modifier onlyInternal() {
      IMaster(masterAddress).isInternal(msg.sender);
      _;
    }
    
    struct MarketCreationRewardData {
      uint ethIncentive;
      uint plotIncentive;
      uint64 ethDeposited;
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
    uint256 internal maxGasPrice;
    address constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal plotToken;
    uint256 internal plotStakeForRewardPoolShare;
    uint256 internal rewardPoolShareThreshold;
    uint internal predictionDecimalMultiplier;
    ITokenController internal tokenController;
    IChainLinkOracle internal clGasPriceAggregator;
    IMarketUtility internal marketUtility;
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
    * @param _utility MarketUtility address
    * @param _clGasPriceAggregator Chainlink gas price aggregator address
    */
    function initialise(address _utility, address _clGasPriceAggregator) external {
      require(address(clGasPriceAggregator) == address(0));
      clGasPriceAggregator = IChainLinkOracle(_clGasPriceAggregator);
      marketUtility = IMarketUtility(_utility);
      maxGasPrice = 100 * 10**9;
      maxRewardPoolPercForMC = 500; // Raised by 2 decimals
      minRewardPoolPercForMC = 50; // Raised by 2 decimals
      plotStakeForRewardPoolShare = 25000 ether;
      rewardPoolShareThreshold = 1 ether;
      predictionDecimalMultiplier = 10;
    }

    /**
    * @dev function to update integer parameters
    */
    function updateUintParameters(bytes8 code, uint256 value) external onlyAuthorizedToGovern {
      if(code == "MAXGAS") { // Maximum gas upto which is considered while calculating market creation incentives
        maxGasPrice = value;
      } else if(code == "MAXRPSP") { // Max Reward Pool percent for market creator
        maxRewardPoolPercForMC = uint16(value);
      } else if(code == "MINRPSP") { // Min Reward Pool percent for market creator
        minRewardPoolPercForMC = uint16(value);
      } else if(code == "PSFRPS") { // Reward Pool percent for market creator
        plotStakeForRewardPoolShare = value;
      } else if(code == "RPSTH") { // Reward Pool percent for market creator
        rewardPoolShareThreshold = value;
      }
    }

    /**
    * @dev function to update address parameters
    */
    function updateAddressParameters(bytes8 code, address payable value) external onlyAuthorizedToGovern {
      if(code == "GASAGG") { // Incentive to be distributed to user for market creation
        clGasPriceAggregator = IChainLinkOracle(value);
      }
    }

    /**
    * @dev function to get integer parameters
    */
    function getUintParameters(bytes8 code) external view returns(bytes8 codeVal, uint256 value) {
      codeVal = code;
      if(code == "MAXGAS") { // Maximum gas upto which is considered while calculating market creation incentives
        value = maxGasPrice;
      } else if(code == "MAXRPSP") { // Max Reward Pool percent for market creator
        value = maxRewardPoolPercForMC;
      } else if(code == "MINRPSP") { // Min Reward Pool percent for market creator
        value = minRewardPoolPercForMC;
      } else if(code == "PSFRPS") { // Reward Pool percent for market creator
        value = plotStakeForRewardPoolShare;
      } else if(code == "RPSTH") { // Reward Pool percent for market creator
        value = rewardPoolShareThreshold;
      }
    }

    /**
    * @dev function to get address parameters
    */
    function getAddressParameters(bytes8 code) external view returns(bytes8 codeVal, address value) {
      codeVal = code;
      if(code == "GASAGG") { // Incentive to be distributed to user for market creation
        value = address(clGasPriceAggregator);
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
    * @param _gasCosumed Gas consumed by the transaction till now 
    * @param _marketId Index of market
    */
    function calculateMarketCreationIncentive(address _createdBy, uint256 _gasCosumed, uint64 _marketId) external onlyInternal {
      _checkIfCreatorStaked(_createdBy, _marketId);
      marketCreationRewardUserData[_createdBy].marketsCreated.push(_marketId);
      uint256 gasUsedTotal;
      //Adding buffer gas for below calculations
      gasUsedTotal = _gasCosumed + 84000;
      uint256 gasPrice = _checkGasPrice();
      uint256 gasCost = gasUsedTotal.mul(gasPrice);
      (, uint256 incentive) = marketUtility.getValueAndMultiplierParameters(ETH_ADDRESS, gasCost);
      marketCreationRewardUserData[_createdBy].incentives = marketCreationRewardUserData[_createdBy].incentives.add(incentive);
      emit MarketCreationReward(_createdBy, _marketId, incentive, gasUsedTotal, gasCost, gasPrice, tx.gasprice, maxGasPrice, marketCreationRewardData[_marketId].rewardPoolSharePerc);
    }

    /**
    * @dev internal function to calculate gas price for market creation incentives
    */
    function _checkGasPrice() internal view returns(uint256) {
      uint fastGas = uint(clGasPriceAggregator.latestAnswer());
      uint fastGasWithMaxDeviation = fastGas.mul(125).div(100);
      return Math.min(Math.min(tx.gasprice,fastGasWithMaxDeviation), maxGasPrice);
    }

    /**
    * @dev Function to deposit market reward pool share funds for market creator
    * @param _marketId Index of market
    * @param _plotShare PLOT reward pool share
    * msg.value ETH reward pool share
    */
    function depositMarketRewardPoolShare(uint256 _marketId, uint256 _ethShare, uint256 _plotShare, uint64 _ethDeposited, uint64 _plotDeposited) external payable onlyInternal {
    	marketCreationRewardData[_marketId].ethIncentive = _ethShare;
    	marketCreationRewardData[_marketId].plotIncentive = _plotShare;
      marketCreationRewardData[_marketId].ethDeposited = _ethDeposited;
      marketCreationRewardData[_marketId].plotDeposited = _plotDeposited;
     	emit MarketCreatorRewardPoolShare(marketCreationRewardData[_marketId].createdBy, _marketId, _plotShare, _ethShare);
    }

    /**
    * @dev Function to return the market reward pool share funds of market creator: To be used in case of dispute
    * @param _marketId Index of market
    */
    function returnMarketRewardPoolShare(uint256 _marketId) external onlyInternal{
      uint256 plotToTransfer = marketCreationRewardData[_marketId].plotIncentive.add(marketCreationRewardData[_marketId].plotDeposited.mul(10**predictionDecimalMultiplier));
      uint256 ethToTransfer = marketCreationRewardData[_marketId].ethIncentive.add(marketCreationRewardData[_marketId].ethDeposited.mul(10**predictionDecimalMultiplier));
      delete marketCreationRewardData[_marketId].ethIncentive;
      delete marketCreationRewardData[_marketId].plotIncentive;
      delete marketCreationRewardData[_marketId].ethDeposited;
      delete marketCreationRewardData[_marketId].plotDeposited;
      _transferAsset(ETH_ADDRESS, msg.sender, ethToTransfer);
      _transferAsset(plotToken, msg.sender, plotToTransfer);
    }

    /**
    * @dev function to reward user for initiating market creation calls as per the new incetive calculations
    */
    function claimCreationReward(uint256 _maxRecords) external {
      uint256 pendingPLOTReward = marketCreationRewardUserData[msg.sender].incentives;
      delete marketCreationRewardUserData[msg.sender].incentives;
      (uint256 ethIncentive, uint256 plotIncentive) = _getRewardPoolIncentives(_maxRecords);
      pendingPLOTReward = pendingPLOTReward.add(plotIncentive);
      require(pendingPLOTReward > 0 || ethIncentive > 0, "No pending");
      _transferAsset(address(plotToken), msg.sender, pendingPLOTReward);
      _transferAsset(ETH_ADDRESS, msg.sender, ethIncentive);
      emit ClaimedMarketCreationReward(msg.sender, ethIncentive, pendingPLOTReward);
    }

    /**
    * @dev internal function to calculate market reward pool share incentives for market creator
    */
    function _getRewardPoolIncentives(uint256 _maxRecords) internal returns(uint256 ethIncentive, uint256 plotIncentive) {
      MarketCreationRewardUserData storage rewardData = marketCreationRewardUserData[msg.sender];
      uint256 len = rewardData.marketsCreated.length;
      uint256 lastClaimed = len;
      uint256 count;
      uint128 i;
      for(i = rewardData.lastClaimedIndex;i < len && count < _maxRecords; i++) {
        MarketCreationRewardData storage marketData = marketCreationRewardData[rewardData.marketsCreated[i]];
        if(allMarkets.marketStatus(rewardData.marketsCreated[i]) == IAllMarkets.PredictionStatus.Settled) {
          ethIncentive = ethIncentive.add(marketData.ethIncentive);
          plotIncentive = plotIncentive.add(marketData.plotIncentive);
          delete marketData.ethIncentive;
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
    * @return pendingETHReward ETH Reward pool share of markets created by user
    */
    function getPendingMarketCreationRewards(address _user) external view returns(uint256 plotIncentive, uint256 pendingPLOTReward, uint256 pendingETHReward){
      plotIncentive = marketCreationRewardUserData[_user].incentives;
      (pendingETHReward, pendingPLOTReward) = _getPendingRewardPoolIncentives(_user);
    }

    /**
    * @dev Get market reward pool share percent to be rewarded to market creator
    */
    function getMarketCreatorRPoolShareParams(uint256 _market, uint256 plotStaked, uint256 ethStaked) external view returns(uint16, bool) {
      return (marketCreationRewardData[_market].rewardPoolSharePerc, _checkIfThresholdReachedForRPS(_market, plotStaked, ethStaked));
    }

    /**
    * @dev Check if threshold reached for reward pool share percent for market creator.
    * Calculate total leveraged amount staked in market value in ETH
    * @param _marketId Index of market to check threshold
    */
    function _checkIfThresholdReachedForRPS(uint256 _marketId, uint256 plotStaked, uint256 ethStaked) internal view returns(bool) {
      uint256 _plotStaked;
      _plotStaked = marketUtility.getAssetValueETH(plotToken, plotStaked.mul(1e10));
      return (_plotStaked.add(ethStaked.mul(1e10)) > rewardPoolShareThreshold);
    }

    /**
    * @dev internal function to calculate market reward pool share incentives for market creator
    */
    function _getPendingRewardPoolIncentives(address _user) internal view returns(uint256 ethIncentive, uint256 plotIncentive) {
      MarketCreationRewardUserData memory rewardData = marketCreationRewardUserData[_user];
      uint256 len = rewardData.marketsCreated.length;
      for(uint256 i = rewardData.lastClaimedIndex;i < len; i++) {
        MarketCreationRewardData memory marketData = marketCreationRewardData[rewardData.marketsCreated[i]];
        if(marketData.ethIncentive > 0 || marketData.plotIncentive > 0) {
          if(allMarkets.marketStatus(rewardData.marketsCreated[i]) == IAllMarkets.PredictionStatus.Settled) {
            ethIncentive = ethIncentive.add(marketData.ethIncentive);
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
        if(_asset == ETH_ADDRESS) {
          _recipient.transfer(_amount);
        } else {
          require(IToken(_asset).transfer(_recipient, _amount));
        }
      }
    }

}
