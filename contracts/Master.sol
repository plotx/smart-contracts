pragma solidity 0.5.7;

import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./external/openzeppelin-solidity/ownership/Ownable.sol";
import "./Plotus.sol";

contract Master is Ownable{

    address payable plotusAddress;

    constructor(address _plotusAddress) public {
        _generateProxy(_plotusAddress);
        Plotus(plotusAddress).initiatePlotus(msg.sender);
    }

    /**
     * @dev Allows the current owner to transfer control of the contract to a newOwner.
     * @param newOwner The address to transfer ownership to.
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0));
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
        Plotus(plotusAddress).transferOwnership(newOwner);
    }

    function upgradeContractImplementation(address _contractsAddress) 
        external onlyOwner
    {
        OwnedUpgradeabilityProxy tempInstance 
            = OwnedUpgradeabilityProxy(plotusAddress);
        tempInstance.upgradeTo(_contractsAddress);
    }

    /**
     * @dev to generater proxy 
     * @param _contractAddress of the proxy
     */
    function _generateProxy(address _contractAddress) internal {
        OwnedUpgradeabilityProxy tempInstance = new OwnedUpgradeabilityProxy(_contractAddress);
        plotusAddress = address(tempInstance);
    }
}