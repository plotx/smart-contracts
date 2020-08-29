pragma solidity 0.5.7;

import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./interfaces/IPlotus.sol";
import "./interfaces/IbLOTToken.sol";
import "./external/govblocks-protocol/Governed.sol";
import "./Iupgradable.sol";

contract Master is Governed {

    bytes2[] public allContractNames;
    address public dAppToken;
    address public dAppLocker;
    // address public bLOT;
    bool public masterInitialised;

    mapping(address => bool) public contractsActive;
    mapping(bytes2 => address payable) public contractAddress;

    /**
    * @dev modifier that allows only the authorized addresses to execute the function
    */
    modifier onlyAuthorizedToGovern() {
        require(getLatestAddress("GV") == msg.sender, "Not authorized");
        _;
    }

    /**
    * @dev Initialize the Master.
    * @param _implementations The address of market implementation.
    * @param _token The address of token.
    * @param _marketConfig The addresses of market configs.
    */
    function initiateMaster(address[] calldata _implementations, address _marketImplementation, address _token, address _defaultbLOTMinter, address _marketConfig) external {
        OwnedUpgradeabilityProxy proxy =  OwnedUpgradeabilityProxy(address(uint160(address(this))));
        require(!masterInitialised);
        require(msg.sender == proxy.proxyOwner(),"Sender is not proxy owner.");
        masterInitialised = true;
        
        //Initial contract names
        allContractNames.push("MR");
        allContractNames.push("PC");
        allContractNames.push("GV");
        allContractNames.push("PL");
        allContractNames.push("TC");
        allContractNames.push("BL");

        require(allContractNames.length == _implementations.length);
        contractsActive[address(this)] = true;
        dAppToken = _token;
        dAppLocker = _token;
        // bLOT = _bLot;
        for (uint i = 0; i < allContractNames.length; i++) {
            _generateProxy(allContractNames[i], _implementations[i]);
        }

        _changeMasterAddress(address(this));
        _changeAllAddress();

        // _generateProxy(_plotusImplementation);
        IPlotus(contractAddress["PL"]).initiatePlotus(_marketImplementation, _marketConfig, _token);
        IbLOTToken(contractAddress["BL"]).initiatebLOT(_defaultbLOTMinter);
    }

    /**
    * @dev To check if we use the particular contract.
    * @param _address The contract address to check if it is ative or not.
    */
    function isInternal(address _address) public view returns(bool) {
      return contractsActive[_address];
    }

    /**
    * @dev Gets latest contract address
    * @param _contractName Contract name to fetch
    */
    function getLatestAddress(bytes2 _contractName) public view returns(address) {
        return contractAddress[_contractName];
    }

    /**
    * @dev adds a new contract type to master
    */
    function addNewContract(bytes2 _contractName, address _contractAddress) external onlyAuthorizedToGovern {
        require(_contractName != "MS", "Name cannot be master");
        require(_contractAddress != address(0), "Zero address");
        require(contractAddress[_contractName] == address(0),"Contract code is already available.");
        allContractNames.push(_contractName);
        _generateProxy(_contractName, _contractAddress);
        Iupgradable up = Iupgradable(contractAddress[_contractName]);
        up.changeMasterAddress(address(this));
        _changeAllAddress();
    }

    /**
    * @dev upgrades a multiple contract implementations
    */
     function upgradeMultipleImplementations(
        bytes2[] calldata _contractNames,
        address[] calldata _contractAddresses
        ) 
        external 
        onlyAuthorizedToGovern 
    {
        require(_contractNames.length == _contractAddresses.length,"Array length should be equal.");
        for (uint i=0; i < _contractNames.length; i++) {
            require(_contractAddresses[i] != address(0),"null address is not allowed.");
            _replaceImplementation(_contractNames[i], _contractAddresses[i]);
        }
    }

    /**
    * @dev checks if an address is authorized to govern
    */
    function isAuthorizedToGovern(address _toCheck) public view returns(bool) {
        return (getLatestAddress("GV") == _toCheck);
    }

    /**
    * @dev Changes Master contract address
    */
    function _changeMasterAddress(address _masterAddress) internal {
        for (uint i = 0; i < allContractNames.length; i++) {
            Iupgradable up = Iupgradable(contractAddress[allContractNames[i]]);
            up.changeMasterAddress(_masterAddress);
        }
    }

    /**
     * @dev Changes the address of token controller.
     */
    function _changeAllAddress() internal {
        for (uint i = 0; i < allContractNames.length; i++) {
            Iupgradable up = Iupgradable(contractAddress[allContractNames[i]]);
            up.changeDependentContractAddress();
        }
    }

    /**
     * @dev Replaces the implementations of the contract.
     * @param _contractsName The name of the contract.
     * @param _contractAddress The address of the contract to replace the implementations for.
     */
    function _replaceImplementation(bytes2 _contractsName, address _contractAddress) internal {
        OwnedUpgradeabilityProxy tempInstance 
                = OwnedUpgradeabilityProxy(contractAddress[_contractsName]);
        tempInstance.upgradeTo(_contractAddress);
    }

    /**
     * @dev to generater proxy 
     * @param _contractAddress of the proxy
     */
    function _generateProxy(bytes2 _contractName, address _contractAddress) internal {
        OwnedUpgradeabilityProxy tempInstance = new OwnedUpgradeabilityProxy(_contractAddress);
        contractAddress[_contractName] = address(tempInstance);
        contractsActive[address(tempInstance)] = true;
    }
}
