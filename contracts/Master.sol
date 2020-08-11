pragma solidity 0.5.7;

// import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./external/openzeppelin-solidity/ownership/Ownable.sol";
import "./Plotus.sol";
import "./Iupgradable.sol";

contract Master is Ownable {

    bytes2[] public allContractNames;
    address payable public plotusAddress;
    address public dAppToken;
    address public dAppLocker;

    mapping(address => bool) public contractsActive;
    mapping(bytes2 => address payable) public contractAddress;

    /// @dev modifier that allows only the authorized addresses to execute the function
    modifier onlyAuthorizedToGovern() {
        require(getLatestAddress("GV") == msg.sender, "Not authorized");
        _;
    }

    constructor(address[] memory _implementations, address _token, address _lockableToken, address[] memory marketConfigs) public {
    // constructor(address _plotusImplementation, address _marketImplementation, address[] memory marketConfigs, address _plotusToken) public {
        _addContractNames();
        require(allContractNames.length == _implementations.length);
        contractsActive[address(this)] = true;
        dAppToken = _token;
        dAppLocker = _lockableToken;
        for (uint i = 0; i < allContractNames.length; i++) {
            _generateProxy(allContractNames[i], _implementations[i]);
        }

        _changeMasterAddress(address(this));
        _changeAllAddress();

        // _generateProxy(_plotusImplementation);
        // Plotus(plotusAddress).initiatePlotus(msg.sender, _marketImplementation, marketConfigs, _plotusToken);
    }

    function isInternal(address _address) public view returns(bool) {
      return contractsActive[_address];
    }

    /// @dev Save the initials of all the contracts
    function _addContractNames() internal {
        allContractNames.push("MR");
        allContractNames.push("PC");
        allContractNames.push("GV");
        allContractNames.push("PL");
    }

    /// @dev Gets latest contract address
    /// @param _contractName Contract name to fetch
    function getLatestAddress(bytes2 _contractName) public view returns(address) {
        return contractAddress[_contractName];
    }


    /// @dev adds a new contract type to master
    function addNewContract(bytes2 _contractName, address _contractAddress) external onlyAuthorizedToGovern {
        allContractNames.push(_contractName);
        _generateProxy(_contractName, _contractAddress);
        _changeMasterAddress(address(this));
        _changeAllAddress();
    }

    /// @dev upgrades a single contract
    function upgradeContractImplementation(bytes2 _contractsName, address _contractAddress) 
        external onlyAuthorizedToGovern
    {
        if (_contractsName == "MS") {
            _changeMasterAddress(_contractAddress);
        } else {
            _replaceImplementation(_contractsName, _contractAddress);
        }
    }

    /// @dev checks if an address is authorized to govern
    function isAuthorizedToGovern(address _toCheck) public view returns(bool) {
        return (getLatestAddress("GV") == _toCheck);
    }


    /// @dev Changes Master contract address
    function _changeMasterAddress(address _masterAddress) internal {
        for (uint i = 0; i < allContractNames.length; i++) {
            Iupgradable up = Iupgradable(contractAddress[allContractNames[i]]);
            up.changeMasterAddress(_masterAddress);
        }
    }

    function _changeAllAddress() internal {
        for (uint i = 0; i < allContractNames.length; i++) {
            Iupgradable up = Iupgradable(contractAddress[allContractNames[i]]);
            up.changeDependentContractAddress();
        }
    }

    function _replaceImplementation(bytes2 _contractsName, address _contractAddress) internal {
        OwnedUpgradeabilityProxy tempInstance 
                = OwnedUpgradeabilityProxy(contractAddress[_contractsName]);
        tempInstance.upgradeTo(_contractAddress);
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
    function _generateProxy(bytes2 _contractName, address _contractAddress) internal {
        OwnedUpgradeabilityProxy tempInstance = new OwnedUpgradeabilityProxy(_contractAddress);
        contractAddress[_contractName] =  address(tempInstance);
    }
}