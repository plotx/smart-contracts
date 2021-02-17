pragma solidity 0.5.7;

import "./interfaces/Iupgradable.sol";
import "./interfaces/IAllMarkets.sol";
import "./external/NativeMetaTransaction.sol";
import "./interfaces/IToken.sol";
import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./external/openzeppelin-solidity/math/SafeMath.sol";

contract IMaster {
    function getLatestAddress(bytes2 _module) public view returns(address);
}

contract ParticipationMining is Iupgradable, NativeMetaTransaction {

    using SafeMath for uint;

	IMaster public ms;
    IAllMarkets internal allMarkets;

    bool initiated;


    mapping(uint => mapping(address=>bool)) marketRewardUserClaimed;

    uint constant internal TOTAL_OPTION = 3;

    event Claimed(uint _marketId, address _user, address _token, uint _reward);

    /**
     * @dev Changes the master address and update it's instance
     */
    function setMasterAddress() public {
        OwnedUpgradeabilityProxy proxy = OwnedUpgradeabilityProxy(
            address(uint160(address(this)))
        );
        require(msg.sender == proxy.proxyOwner(), "Sender is not proxy owner.");
        IMaster ms = IMaster(msg.sender);
        allMarkets = IAllMarkets(ms.getLatestAddress("AM"));
        if(!initiated)
        {
            initiated = true;
            _initializeEIP712("PM");
        }
    }

    function getUserTotalPointsInMarket(uint _marketId, address _user) internal view returns(uint) {
        uint totalPoints=0;
        for(uint i =1; i<=TOTAL_OPTION; i++)
        {
            totalPoints = totalPoints.add(allMarkets.getUserPredictionPoints(_user,_marketId,i));
        }
        return totalPoints;

    }

    function claimParticipationMiningReward(uint[] calldata _marketIds, uint[] calldata _amountToDistribute, address[] calldata _tokenAddresses) external {

        require(_marketIds.length == _amountToDistribute.length,"Array Length should match");
        require(_marketIds.length == _tokenAddresses.length,"Array Length should match");

        for(uint i=0; i<_marketIds.length; i++) {
            require(allMarkets.marketStatus(_marketIds[i]) == IAllMarkets.PredictionStatus.Settled);
            require(!marketRewardUserClaimed[_marketIds[i]][_msgSender()]);
            require(_amountToDistribute[i] > 0);
            require(_tokenAddresses[i]!=address(0));
            
            uint reward=0;

            uint totalPredictionPoints = allMarkets.getTotalPredictionPoints(_marketIds[i]);

            if(totalPredictionPoints == 0) {
                continue;
            }

            uint userPredictionPoints = getUserTotalPointsInMarket(_marketIds[i],_msgSender());

            reward = _amountToDistribute[i].mul(userPredictionPoints).div(totalPredictionPoints);
            marketRewardUserClaimed[_marketIds[i]][_msgSender()] = true;
            if(reward > 0) { 
                require(IToken(_tokenAddresses[i]).transfer(_msgSender(), reward));
                emit Claimed(_marketIds[i], _msgSender(), _tokenAddresses[i], reward);
            }
        }
    }
}
