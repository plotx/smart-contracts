pragma solidity 0.5.7;

import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./external/openzeppelin-solidity/ownership/Ownable.sol";
import "./Plotus.sol";

contract Master is Ownable{

    address payable public plotusAddress;

    constructor(address _plotusAddress, address[] memory implementations, address _plotusToken) public {
        _generateProxy(_plotusAddress);
        Plotus(plotusAddress).initiatePlotus(msg.sender, implementations, _plotusToken);
    }

    /**
     * @dev Allows the current owner to transfer control of the contract to a newOwner.
     * @param newOwner The address to transfer ownership to.
     */
    function transferOwnership(address newOwner) public onlyOwner {
        _transferOwnership(newOwner);
        Plotus(plotusAddress).transferOwnership(newOwner);
    }

    function upgradeContractImplementation(address _contractsAddress) 
        external onlyOwner
    {
        OwnedUpgradeabilityProxy tempInstance 
            = OwnedUpgradeabilityProxy(plotusAddress);
        tempInstance.upgradeTo(_contractsAddress);
    }

    function transferProxyOwnership(address _newOwner) external onlyOwner {
      OwnedUpgradeabilityProxy tempInstance 
            = OwnedUpgradeabilityProxy(plotusAddress);
        tempInstance.transferProxyOwnership(_newOwner);
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