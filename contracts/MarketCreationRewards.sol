pragma solidity 0.5.7;

import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/openzeppelin-solidity/math/Math.sol";
import "./external/govblocks-protocol/Governed.sol";
import "./interfaces/ITokenController.sol";
import "./interfaces/IChainLinkOracle.sol";
import "./interfaces/IMarketUtility.sol";
import "./interfaces/IToken.sol";
import "./interfaces/IAllMarkets.sol";

contract MarketCreationRewards is Governed {

    using SafeMath for uint;

	event MarketCreatorRewardPoolShare(address indexed createdBy, uint256 indexed marketIndex, uint256 plotIncentive, uint256 ethIncentive);
    event MarketCreationReward(address indexed createdBy, uint256 marketIndex, uint256 plotIncentive, uint256 gasUsed, uint256 gasCost, uint256 gasPriceConsidered, uint256 gasPriceGiven, uint256 maxGasCap, uint256 rewardPoolSharePerc);
    event ClaimedMarketCreationReward(address indexed user, uint256 ethIncentive, uint256 plotIncentive);
    
    struct MarketCreationRewardData {
      uint ethIncentive;
      uint plotIncentive;
      uint64 rewardPoolSharePerc;
      address createdBy;
    }

    struct MarketCreationRewardUserData {
      uint incentives;
      uint128 lastClaimedIndex;
      uint256[] marketsCreated;
    }
	
	uint64 internal maxRewardPoolPercForMC;
    uint64 internal minRewardPoolPercForMC;
    uint256 internal maxGasPrice;
    address constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal plotToken;
    uint256 internal plotStakeForRewardPoolShare;
    uint256 internal rewardPoolShareThreshold;
    ITokenController internal tokenController;
    IChainLinkOracle internal clGasPriceAggregator;
    IMarketUtility internal marketUtility;
    IAllMarkets internal allMarkets;
    mapping(uint256 => MarketCreationRewardData) internal marketCreationRewardData; //Of market
    mapping(address => MarketCreationRewardUserData) internal marketCreationRewardUserData; //Of user

    /**
    * @dev Function to set inital parameters of contract
    * @param _plotAddress PLOT token address
    * @param _tcAddress Token Cntroller address
    * @param _utility MarketUtility address
    * @param _allMarkets AllMarkets address
    * @param _clGasPriceAggregator Chainlink gas price aggregator address
    */
    function initialise(address _plotAddress, address _tcAddress, address _utility, address _allMarkets, address _clGasPriceAggregator) external {
      require(plotToken == address(0));
      clGasPriceAggregator = IChainLinkOracle(_clGasPriceAggregator);
      tokenController = ITokenController(_tcAddress);
      marketUtility = IMarketUtility(_utility);
      allMarkets = IAllMarkets(_allMarkets);
      plotToken = _plotAddress;
      maxGasPrice = 100 * 10**9;
      maxRewardPoolPercForMC = 500; // Raised by 2 decimals
      minRewardPoolPercForMC = 50; // Raised by 2 decimals
      plotStakeForRewardPoolShare = 25000 ether;
      rewardPoolShareThreshold = 1 ether;
    }

    /**
    * @dev internal function to calculate market reward pool share percent to be rewarded to market creator
    */
    function _checkIfCreatorStaked(address _createdBy, uint64 _marketId) internal {
      uint256 tokensLocked = ITokenController(tokenController).tokensLockedAtTime(_createdBy, "SM", now);
      marketCreationRewardData[_marketId].createdBy = _createdBy;
      //Intentionally performed mul operation after div, to get absolute value instead of decimals
      marketCreationRewardData[_marketId].rewardPoolSharePerc
       = uint64(Math.min(
          maxRewardPoolPercForMC,
          minRewardPoolPercForMC + tokensLocked.div(plotStakeForRewardPoolShare).mul(minRewardPoolPercForMC)
        ));
    }

    /**
    * @dev function to calculate user incentive for market creation
    * @param _createdBy Address of market creator
    * @param gasProvided Gas provided by user 
    * @param _marketId Index of market
    */
    function calculateMarketCreationIncentive(address _createdBy, uint256 gasProvided, uint64 _marketId) external {
      _checkIfCreatorStaked(_createdBy, _marketId);
      marketCreationRewardUserData[msg.sender].marketsCreated.push(_marketId);
      uint256 gasUsed;
      //Adding buffer gas for below calculations
      gasUsed = 38500;
      gasUsed = gasProvided - gasleft();
      uint256 gasPrice = _checkGasPrice();
      uint256 gasCost = gasUsed.mul(gasPrice);
      (, uint256 incentive) = marketUtility.getValueAndMultiplierParameters(ETH_ADDRESS, gasCost);
      marketCreationRewardUserData[msg.sender].incentives = marketCreationRewardUserData[msg.sender].incentives.add(incentive);
      emit MarketCreationReward(msg.sender, _marketId, incentive, gasUsed, gasCost, gasPrice, tx.gasprice, maxGasPrice, marketCreationRewardData[_marketId].rewardPoolSharePerc);
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
    function depositMarketRewardPoolShare(uint256 _marketId, uint64 _plotShare) external payable {
    	uint256 _ethShare = msg.value;
    	marketCreationRewardData[_marketId].ethIncentive = _ethShare;
    	marketCreationRewardData[_marketId].plotIncentive = _plotShare;
     	emit MarketCreatorRewardPoolShare(marketCreationRewardData[_marketId].createdBy, _marketId, _plotShare, _ethShare);
    }

    /**
    * @dev Function to return the market reward pool share funds of market creator: To be used in case of dispute
    * @param _marketId Index of market
    */
    function returnMarketRewardPoolShare(uint256 _marketId) external {
    	_transferAsset(ETH_ADDRESS, msg.sender, marketCreationRewardData[_marketId].ethIncentive);
		_transferAsset(plotToken, msg.sender, marketCreationRewardData[_marketId].plotIncentive);
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
    function getMarketCreatorRPoolShareParams(uint256 _market, uint256 plotStaked, uint256 ethStaked) external view returns(uint64, bool) {
      return (marketCreationRewardData[_market].rewardPoolSharePerc, _checkIfThresholdReachedForRPS(_market, plotStaked, ethStaked));
    }

    /**
    * @dev Check if threshold reached for reward pool share percent for market creator.
    * Calculate total leveraged amount staked in market value in ETH
    * @param _marketId Index of market to check threshold
    */
    function _checkIfThresholdReachedForRPS(uint256 _marketId, uint256 plotStaked, uint256 ethStaked) internal view returns(bool) {
      uint256 ethStaked;
      uint256 plotStaked;
      plotStaked = marketUtility.getAssetValueETH(plotToken, plotStaked.mul(1e15));
      return (plotStaked.add(ethStaked.mul(1e15)) > rewardPoolShareThreshold);
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
