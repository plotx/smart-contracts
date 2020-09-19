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
        uint256 globalYieldPerToken; // after donations, Precision points = 27 + 2 (G$ decimal) - (token Decimal)
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
        uint256 stakeBuyinRate;  // Precision points = 27 + 2 (G$ decimal) = 29
    }


    // Token address
    ERC20 stakeToken;

    // Reward token
    PlotXToken rewardToken;

    // Interest and staker data
    InterestData public interestData;

    uint public stakingStartTime;

    uint public totalReward;

    // 10^18
    uint256 constant DECIMAL1e18 = 10**18;

    // seconds in 1 year
    uint256 constant oneYear = 31536000;

    /**
     * @dev Emitted when `staker` stake `value` tokens.
     */
    event Staked(address indexed staker, uint256 value);

    /**
     * @dev Emitted when `staker` withdraws their stake `value` tokens.
     */
    event StakeWithdraw(address indexed staker, uint256 value);


    /**
     * @dev Emitted when `staker` collects interest `_value`.
     */
    event InterestCollected(
        address staker,
        uint256 _value 
    );

    /**     
     * @dev Constructor     
     * @param _stakeToken The address of stake Token       
     * @param _rewardToken The address of reward Token          
     */
    constructor(
        address _stakeToken,
        address _rewardToken
    ) public {
        stakeToken = ERC20(_stakeToken);
        rewardToken = PlotXToken(_rewardToken);
        stakingStartTime = now;
        interestData.lastUpdated = now;
        totalReward = uint(500000).mul(DECIMAL1e18);
    }

    /**
     * @dev Allows a staker to deposit Tokens. Notice that `approve` is
     * needed to be executed before the execution of this method.
     * Can be executed only when the contract is not paused.
     * @param _amount The amount of tokens to stake
     */
    function stake(uint256 _amount) external {
        require(_amount > 0, "You need to stake a positive token amount");
        require(
            stakeToken.transferFrom(msg.sender, address(this), _amount),
            "transferFrom failed, make sure you approved token transfer"
        );
        require(uint(now).sub(stakingStartTime) <= oneYear);
        uint newlyInterestGenerated = uint(now).sub(interestData.lastUpdated).mul(totalReward).div(31536000);
        interestData.lastUpdated = now;
        updateGlobalYieldPerToken(newlyInterestGenerated);
        updateStakeData(msg.sender, _amount);
        emit Staked(msg.sender, _amount);
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

        uint256 currentStake = _stakerData.totalStaked;
        _stakerData.totalStaked = currentStake.add(_stake);

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
     * @param _stake              Amount staked 
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
        emit StakeWithdraw(msg.sender, _amount);
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
        uint timeSinceLastUpdate = uint(now).sub(interestData.lastUpdated);
        if(uint(now).sub(stakingStartTime) >= oneYear)
        {
            timeSinceLastUpdate = stakingStartTime.add(oneYear).sub(interestData.lastUpdated);
            interestData.lastUpdated = stakingStartTime.add(oneYear);
        } else {
            interestData.lastUpdated = now;
        }
        uint newlyInterestGenerated = timeSinceLastUpdate.mul(totalReward).div(oneYear);
        
        updateGlobalYieldPerToken(newlyInterestGenerated);
        uint256 interest = calculateInterest(msg.sender);
        Staker storage stakerData = interestData.stakers[msg.sender];
        stakerData.withdrawnToDate = stakerData.withdrawnToDate.add(interest);
        require(rewardToken.transfer(msg.sender, interest), "withdraw interest transfer failed");
        emit InterestCollected(msg.sender, interest);
    }

    function updateGlobalYield() public {
        uint timeSinceLastUpdate = uint(now).sub(interestData.lastUpdated);
        if(uint(now).sub(stakingStartTime) >= oneYear)
        {
            timeSinceLastUpdate = stakingStartTime.add(oneYear).sub(interestData.lastUpdated);
            interestData.lastUpdated = stakingStartTime.add(oneYear);
        } else {
            interestData.lastUpdated = now;
        }
        uint newlyInterestGenerated = timeSinceLastUpdate.mul(totalReward).div(31536000);
        updateGlobalYieldPerToken(newlyInterestGenerated);
    }

    function getYieldData(address _staker) public view returns(uint256, uint256)
    {

      return (interestData.globalYieldPerToken, interestData.stakers[_staker].stakeBuyinRate);
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
        if (interestData.globalTotalStaked == 0) return;
        interestData.globalYieldPerToken = interestData.globalYieldPerToken.add(
            _interestGenerated
                .mul(DECIMAL1e18) //increase precision of G$
                .div(interestData.globalTotalStaked) //earnings are after donations so we divide by global stake
        );
    }


    function getStakerData(address _staker) public view returns(uint256, uint256)
    {

      return (interestData.stakers[_staker].totalStaked, interestData.stakers[_staker].withdrawnToDate);
    }
}