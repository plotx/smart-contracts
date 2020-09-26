pragma solidity 0.5.7;

import "./PlotXToken.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/openzeppelin-solidity/token/ERC20/ERC20.sol";


contract Staking {
    
    using SafeMath for uint256;

    /**
     * @dev Structure to store Interest details.
     * It contains total amount of tokens staked and globalYield.
     */
    struct InterestData {
        uint256 globalTotalStaked;
        uint256 globalYieldPerToken; 
        uint256 lastUpdated;
        mapping(address => Staker) stakers;  
    }

    /**
     * @dev Structure to store staking details.
     * It contains amount of tokens staked and withdrawn interest.
     */
    struct Staker {
        uint256 totalStaked;
        uint256 withdrawnToDate;
        uint256 stakeBuyinRate;  
    }


    // Token address
    ERC20 stakeToken;

    // Reward token
    PlotXToken rewardToken;

    // Interest and staker data
    InterestData public interestData;

    uint public stakingStartBlock;

    uint public totalReward;

    // unclaimed reward will be trasfered to this account
    address public vaultAddress; 

    // 10^18
    uint256 constant DECIMAL1e18 = 10**18;

    //Total blocks over which reward will be distributed
    uint256 public totalBlocks;

    /**
     * @dev Emitted when `staker` stake `value` tokens.
     */
    event Staked(address indexed staker, uint256 value, uint256 _globalYieldPerToken);

    /**
     * @dev Emitted when `staker` withdraws their stake `value` tokens.
     */
    event StakeWithdrawn(address indexed staker, uint256 value, uint256 _globalYieldPerToken);


    /**
     * @dev Emitted when `staker` collects interest `_value`.
     */
    event InterestCollected(
        address staker,
        uint256 _value,
        uint256 _globalYieldPerToken
    );

    /**     
     * @dev Constructor     
     * @param _stakeToken The address of stake Token       
     * @param _rewardToken The address of reward Token   
     * @param _totalBlocks valid staking blocks after staking starts
     * @param _totalRewardToBeDistributed total amount to be distributed as reward
     */
    constructor(
        address _stakeToken,
        address _rewardToken,
        uint256 _totalBlocks,
        uint256 _totalRewardToBeDistributed,
        uint256 _stakingStart,
        address _vaultAdd
    ) public {
        require(_totalBlocks > 0, "Should be positive");
        require(_totalRewardToBeDistributed > 0, "Total reward can not be 0");
        require(_stakingStart >= block.number, "Can not be past block");
        require(_stakeToken != address(0), "Can not be null address");
        require(_rewardToken != address(0), "Can not be null address");
        require(_vaultAdd != address(0), "Can not be null address");
        stakeToken = ERC20(_stakeToken);
        rewardToken = PlotXToken(_rewardToken);
        stakingStartBlock = _stakingStart;
        interestData.lastUpdated = _stakingStart;
        totalBlocks = _totalBlocks;
        totalReward = _totalRewardToBeDistributed;
        vaultAddress = _vaultAdd;
    }

    /**
     * @dev Allows a staker to deposit Tokens. Notice that `approve` is
     * needed to be executed before the execution of this method.
     * @param _amount The amount of tokens to stake
     */
    function stake(uint256 _amount) external {
        require(_amount > 0, "You need to stake a positive token amount");
        require(
            stakeToken.transferFrom(msg.sender, address(this), _amount),
            "TransferFrom failed, make sure you approved token transfer"
        );
        require(uint(block.number).sub(stakingStartBlock) <= totalBlocks, "Can not stake after staking block limit passed");
        uint newlyInterestGenerated = uint(block.number).sub(interestData.lastUpdated).mul(totalReward).div(totalBlocks);
        interestData.lastUpdated = block.number;
        updateGlobalYieldPerToken(newlyInterestGenerated);
        updateStakeData(msg.sender, _amount);
        emit Staked(msg.sender, _amount, interestData.globalYieldPerToken);
    }

    /**
     * @dev Updates InterestData and Staker data while staking.
     * must call update globalYieldPerToken before this operation
     * @param _staker                 Staker's address
     * @param _stake                  Amount of stake
     *
     */
    function updateStakeData(
        address _staker,
        uint256 _stake
    ) internal {
        Staker storage _stakerData = interestData.stakers[_staker];

        _stakerData.totalStaked = _stakerData.totalStaked.add(_stake);

        updateStakeBuyinRate(
            _stakerData,
            interestData.globalYieldPerToken,
            _stake
        );

        interestData.globalTotalStaked = interestData.globalTotalStaked.add(_stake);
    }

    /**
     * @dev Calculates and updates the yield rate in which the staker has entered
     * a staker may stake multiple times, so we calculate his cumulative rate his earning will be calculated based on GlobalYield and StakeBuyinRate
     * Formula:
     * StakeBuyinRate = [StakeBuyinRate(P) + (GlobalYield(P) x Stake)]
     *
     * @param _stakerData                  Staker's Data
     * @param _globalYieldPerToken         Total yielding amount per token 
     * @param _stake                       Amount staked 
     *
     */
    function updateStakeBuyinRate(
        Staker storage _stakerData,
        uint256 _globalYieldPerToken,
        uint256 _stake
    ) internal {

        _stakerData.stakeBuyinRate = _stakerData.stakeBuyinRate.add(
            _globalYieldPerToken.mul(_stake).div(DECIMAL1e18)
        );
    }

    /**
     * @dev Withdraws the sender staked Token.
     */
    function withdrawStakeAndInterest(uint256 _amount) external {
        Staker storage staker = interestData.stakers[msg.sender];
        require(_amount > 0, "Should withdraw positive amount");
        require(staker.totalStaked >= _amount, "Not enough token staked");
        withdrawInterest();
        updateStakeAndInterestData(msg.sender, _amount);
        require(stakeToken.transfer(msg.sender, _amount), "withdraw transfer failed");
        emit StakeWithdrawn(msg.sender, _amount, interestData.globalYieldPerToken);
    }
    
    /**
     * @dev Updates InterestData and Staker data while withdrawing stake.
     *
     * @param _staker                 Staker address
     * @param _amount                 Amount of stake to withdraw
     *
     */    
    function updateStakeAndInterestData(
        address _staker,
        uint256 _amount
    ) internal {
        Staker storage _stakerData = interestData.stakers[_staker];

        _stakerData.totalStaked = _stakerData.totalStaked.sub(_amount);

        interestData.globalTotalStaked = interestData.globalTotalStaked.sub(_amount);

        _stakerData.stakeBuyinRate = 0;
        _stakerData.withdrawnToDate = 0;
        updateStakeBuyinRate(
            _stakerData,
            interestData.globalYieldPerToken,
            _stakerData.totalStaked
        );
    }

    /**
     * @dev Withdraws the sender Earned interest.
     */
    function withdrawInterest() public {
        uint blockSinceLastUpdate = _blockSinceLastUpdate();
        uint newlyInterestGenerated = blockSinceLastUpdate.mul(totalReward).div(totalBlocks);
        
        updateGlobalYieldPerToken(newlyInterestGenerated);
        uint256 interest = calculateInterest(msg.sender);
        Staker storage stakerData = interestData.stakers[msg.sender];
        stakerData.withdrawnToDate = stakerData.withdrawnToDate.add(interest);
        require(rewardToken.transfer(msg.sender, interest), "Withdraw interest transfer failed");
        emit InterestCollected(msg.sender, interest, interestData.globalYieldPerToken);
    }

    function updateGlobalYield() public {
        uint blockSinceLastUpdate = _blockSinceLastUpdate();
        uint newlyInterestGenerated = blockSinceLastUpdate.mul(totalReward).div(totalBlocks);
        updateGlobalYieldPerToken(newlyInterestGenerated);
    }

    function getYieldData(address _staker) public view returns(uint256, uint256)
    {

      return (interestData.globalYieldPerToken, interestData.stakers[_staker].stakeBuyinRate);
    }

    function _blockSinceLastUpdate() internal returns(uint256) {
        uint blockSinceLastUpdate = uint(block.number).sub(interestData.lastUpdated);
        if(uint(block.number).sub(stakingStartBlock) > totalBlocks)
        {
            blockSinceLastUpdate = stakingStartBlock.add(totalBlocks).sub(interestData.lastUpdated);
            interestData.lastUpdated = stakingStartBlock.add(totalBlocks);
        } else {
            interestData.lastUpdated = block.number;
        }
        return blockSinceLastUpdate;
    }

    /**
     * @dev Calculates Interest for staker for their stake.
     *
     * Formula:
     * EarnedInterest = MAX[TotalStaked x GlobalYield - (StakeBuyinRate + WithdrawnToDate), 0]
     *
     * @param _staker                     Staker's address
     *
     * @return _earnedInterest The amount of tokens credit for the staker.
     */
    function calculateInterest(address _staker)
        public
        view
        returns (uint256 _earnedInterest)
    {
        Staker storage stakerData = interestData.stakers[_staker];

        
        uint256 _withdrawnToDate = stakerData.withdrawnToDate;

        uint256 intermediateInterest = stakerData
            .totalStaked
            .mul(interestData.globalYieldPerToken).div(DECIMAL1e18);

        uint256 intermediateVal = _withdrawnToDate.add(
            stakerData.stakeBuyinRate
        );

        // will lead to -ve value
        if (intermediateVal > intermediateInterest) {
            return 0;
        }

        _earnedInterest = (intermediateInterest.sub(intermediateVal));

        return _earnedInterest;
    }

    /**
     * @dev Calculates and updates new accrued amount per token since last update.
     *
     * Formula:
     * GlobalYield = GlobalYield(P) + newlyGeneratedInterest/GlobalTotalStake.
     *
     * @param _interestGenerated  Interest token earned since last update.
     *
     */
    function updateGlobalYieldPerToken(
        uint256 _interestGenerated
    ) internal {
        if (interestData.globalTotalStaked == 0) {
            require(rewardToken.transfer(vaultAddress, _interestGenerated), "Transfer failed while trasfering to vault");
            return;
        }
        interestData.globalYieldPerToken = interestData.globalYieldPerToken.add(
            _interestGenerated
                .mul(DECIMAL1e18) 
                .div(interestData.globalTotalStaked) 
        );
    }


    function getStakerData(address _staker) public view returns(uint256, uint256)
    {

      return (interestData.stakers[_staker].totalStaked, interestData.stakers[_staker].withdrawnToDate);
    }

    /**
     * @dev returns stats data.
     * @param _staker Address of staker.
     * @return Total staked.
     * @return Total reward to be distributed.
     * @return estimated reward for user at end of staking period if no one stakes from current block.
     * @return Unlocked reward based on elapsed time.
     * @return Accrued reward for user till block.
     */
    function getStatsData(address _staker) external view returns(uint, uint, uint, uint, uint)
    {

        Staker storage stakerData = interestData.stakers[_staker];
        uint estimatedReward = 0;
        uint unlockedReward = 0;
        uint accruedReward = 0;
        uint timeElapsed = uint(block.number).sub(stakingStartBlock);

        if(timeElapsed > totalBlocks)
        {
            timeElapsed = totalBlocks;
        }

        unlockedReward = timeElapsed.mul(totalReward).div(totalBlocks);

        uint blockSinceLastUpdate = uint(block.number).sub(interestData.lastUpdated);
        if(uint(block.number).sub(stakingStartBlock) >= totalBlocks)
        {
            blockSinceLastUpdate = stakingStartBlock.add(totalBlocks).sub(interestData.lastUpdated);
        }
        uint newlyInterestGenerated = blockSinceLastUpdate.mul(totalReward).div(totalBlocks);
        uint updatedGlobalYield;
        uint stakingBlocksLeft = 0;
        if(block.number < stakingStartBlock.add(totalBlocks)){
         stakingBlocksLeft = stakingStartBlock.add(totalBlocks).sub(block.number);
        }
        uint interestGeneratedEnd = stakingBlocksLeft.mul(totalReward).div(totalBlocks);
        uint globalYieldEnd;
        if (interestData.globalTotalStaked == 0) {
            updatedGlobalYield = 0;
            globalYieldEnd = 0;
        } else {
            updatedGlobalYield = interestData.globalYieldPerToken.add(
            newlyInterestGenerated
                .mul(DECIMAL1e18)
                .div(interestData.globalTotalStaked));

            globalYieldEnd = updatedGlobalYield.add(interestGeneratedEnd.mul(DECIMAL1e18).div(interestData.globalTotalStaked));
        }
        
        accruedReward = stakerData
            .totalStaked
            .mul(updatedGlobalYield).div(DECIMAL1e18);

        if (stakerData.withdrawnToDate.add(stakerData.stakeBuyinRate) > accruedReward)
        {
            accruedReward = 0;
        } else {

            accruedReward = accruedReward.sub(stakerData.withdrawnToDate.add(stakerData.stakeBuyinRate));
        }

        estimatedReward = stakerData
            .totalStaked
            .mul(globalYieldEnd).div(DECIMAL1e18);
        if (stakerData.withdrawnToDate.add(stakerData.stakeBuyinRate) > estimatedReward) {
            estimatedReward = 0;
        } else {

            estimatedReward = estimatedReward.sub(stakerData.withdrawnToDate.add(stakerData.stakeBuyinRate));
        }

        return (interestData.globalTotalStaked, totalReward, estimatedReward, unlockedReward, accruedReward);

    }
}
