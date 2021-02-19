pragma solidity 0.5.7;

import "./interfaces/Iupgradable.sol";
import "./interfaces/IAllMarkets.sol";
import "./external/NativeMetaTransaction.sol";
import "./interfaces/IToken.sol";
import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";

contract IMaster {
    mapping(address => bool) public whitelistedSponsor;
    function getLatestAddress(bytes2 _module) public view returns(address);
}

contract ParticipationMining is Iupgradable, NativeMetaTransaction {

    using SafeMath for uint;

	IMaster public ms;
    IAllMarkets internal allMarkets;

    struct SponsorIncentives {
        address incentiveToken;
        uint incentiveToDistribute;
        address incentiveSponsoredBy;
    }
    
    mapping(uint => SponsorIncentives) public marketSponsorship;
    
    mapping(uint => mapping(address=>bool)) public marketRewardUserClaimed;

    uint constant internal TOTAL_OPTION = 3;

    event SponsoredIncentive(uint256 indexed marketIndex, address incentiveTokenAddress, address sponsoredBy, uint256 amount);
    event Claimed(uint _marketId, address _user, address _token, uint _reward);

    /**
     * @dev Changes the master address and update it's instance
     */
    function setMasterAddress() public {
        OwnedUpgradeabilityProxy proxy = OwnedUpgradeabilityProxy(
            address(uint160(address(this)))
        );
        require(msg.sender == proxy.proxyOwner(), "Sender is not proxy owner.");
        ms = IMaster(msg.sender);
        allMarkets = IAllMarkets(ms.getLatestAddress("AM"));
        _initializeEIP712("PM");    
    }

    /**
     * @dev Gets total prediction points of user in all options for given market.
     * @param _marketId Market id
     * @param _user address of user
     * @return total prediction points in all options
     */
    function getUserTotalPointsInMarket(uint _marketId, address _user) public view returns(uint) {
        uint totalPoints=0;
        for(uint i =1; i<=TOTAL_OPTION; i++)
        {
            totalPoints = totalPoints.add(allMarkets.getUserPredictionPoints(_user,_marketId,i));
        }
        return totalPoints;

    }

    /**
     * @dev Claims participation mining rewards of user for given marketId's
     * @param _marketIds array of Market ids
     */
    function claimParticipationMiningReward(uint[] calldata _marketIds, address _incentiveToken) external {
        address payable msgSender = _msgSender();
        uint reward=0;

        require(_incentiveToken != address(0), "Incentive Token cannot be null");

        for(uint i=0; i<_marketIds.length; i++) {
            SponsorIncentives storage _sponsorIncentives = marketSponsorship[_marketIds[i]];
            require(_sponsorIncentives.incentiveToken == _incentiveToken,"One of the Makets are having different Sponsored Token");
            require(allMarkets.marketStatus(_marketIds[i]) == IAllMarkets.PredictionStatus.Settled,"One of the Markets are not Settled");
            require(!marketRewardUserClaimed[_marketIds[i]][msgSender],"Already claimed for one of the market Id");
            marketRewardUserClaimed[_marketIds[i]][msgSender] = true;
            
            uint totalPredictionPoints = allMarkets.getTotalPredictionPoints(_marketIds[i]);
            uint userPredictionPoints = getUserTotalPointsInMarket(_marketIds[i],msgSender);
            reward = reward.add(_sponsorIncentives.incentiveToDistribute.mul(userPredictionPoints).div(totalPredictionPoints));
            emit Claimed(_marketIds[i], msgSender, _sponsorIncentives.incentiveToken, reward);
            
        }


        require(reward > 0, "No Pending Reward");
        
        require(IToken(_incentiveToken).transfer(msgSender, reward),"Transfer Failed");
    }

    /**
    * @dev Sponsor Incentive for the market
    * @param _marketId Index of market to sponsor
    * @param _token Address of token to sponsor
    * @param _value Amount to sponsor
    */
    function sponsorIncentives(uint256 _marketId, address _token, uint256 _value) external {
        address payable msgSender =  _msgSender();
        require(ms.whitelistedSponsor(msgSender),"Sponsor is not whitelisted");
        require(_token != address(0), "Incentive Token can not be null");
        require(_value > 0,"Incentive to distribute should not be 0");
        require(allMarkets.marketStatus(_marketId) <= IAllMarkets.PredictionStatus.InSettlement,"Market is not Live");
        require(marketSponsorship[_marketId].incentiveToken == address(0),"Already Sponsored");
        marketSponsorship[_marketId] = SponsorIncentives(_token,_value,msgSender);
        require(IToken(_token).transferFrom(msgSender, address(this), _value),"Transfer Failed");
        emit SponsoredIncentive(_marketId, _token, msgSender, _value);
    }
}
