/* Copyright (C) 2020 PlotX.io

  This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

  This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
    along with this program.  If not, see http://www.gnu.org/licenses/ */

pragma solidity 0.5.7;

import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./external/govblocks-protocol/Governed.sol";
import "./interfaces/IMarketRegistry.sol";
import "./interfaces/IbLOTToken.sol";
import "./interfaces/ITokenController.sol";
import "./interfaces/Iupgradable.sol";

contract Master is Governed {
    bytes2[] public allContractNames;
    address public dAppToken;
    address public dAppLocker;
    bool public masterInitialised;

    mapping(address => bool) public contractsActive;
    mapping(address => bool) public whitelistedSponsor;
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
     * @param _token The address of PLOT token.
     * @param _marketUtiliy The addresses of market utility.
     */
    function initiateMaster(
        address[] calldata _implementations,
        address _token,
        address _defaultAddress,
        address _marketUtiliy,
        address payable[] calldata _configParams,
        address _vesting
    ) external {
        OwnedUpgradeabilityProxy proxy = OwnedUpgradeabilityProxy(
            address(uint160(address(this)))
        );
        require(!masterInitialised);
        require(msg.sender == proxy.proxyOwner(), "Sender is not proxy owner.");
        masterInitialised = true;

        //Initial contract names
        allContractNames.push("MR");
        allContractNames.push("PC");
        allContractNames.push("GV");
        allContractNames.push("PL");
        allContractNames.push("TC");
        allContractNames.push("BL");

        require(
            allContractNames.length == _implementations.length,
            "Implementation length not match"
        );
        contractsActive[address(this)] = true;
        dAppToken = _token;
        for (uint256 i = 0; i < allContractNames.length; i++) {
            _generateProxy(allContractNames[i], _implementations[i]);
        }
        dAppLocker = contractAddress["TC"];

        _setMasterAddress();

        IMarketRegistry(contractAddress["PL"]).initiate(
            _defaultAddress,
            _marketUtiliy,
            _token,
            _configParams
        );
        IbLOTToken(contractAddress["BL"]).initiatebLOT(_defaultAddress);
        ITokenController(contractAddress["TC"]).initiateVesting(_vesting);
    }

    /**
     * @dev adds a new contract type to master
     */
    function addNewContract(bytes2 _contractName, address _contractAddress)
        external
        onlyAuthorizedToGovern
    {
        require(_contractName != "MS", "Name cannot be master");
        require(_contractAddress != address(0), "Zero address");
        require(
            contractAddress[_contractName] == address(0),
            "Contract code already available"
        );
        allContractNames.push(_contractName);
        _generateProxy(_contractName, _contractAddress);
        Iupgradable up = Iupgradable(contractAddress[_contractName]);
        up.setMasterAddress();
    }

    /**
     * @dev upgrades a multiple contract implementations
     */
    function upgradeMultipleImplementations(
        bytes2[] calldata _contractNames,
        address[] calldata _contractAddresses
    ) external onlyAuthorizedToGovern {
        require(
            _contractNames.length == _contractAddresses.length,
            "Array length should be equal."
        );
        for (uint256 i = 0; i < _contractNames.length; i++) {
            require(
                _contractAddresses[i] != address(0),
                "null address is not allowed."
            );
            _replaceImplementation(_contractNames[i], _contractAddresses[i]);
        }
    }

    function whitelistSponsor(address _address) external onlyAuthorizedToGovern {
        whitelistedSponsor[_address] = true;
    }

    
    /**
     * @dev To check if we use the particular contract.
     * @param _address The contract address to check if it is active or not.
     */
    function isInternal(address _address) public view returns (bool) {
        return contractsActive[_address];
    }

    /**
     * @dev Gets latest contract address
     * @param _contractName Contract name to fetch
     */
    function getLatestAddress(bytes2 _contractName)
        public
        view
        returns (address)
    {
        return contractAddress[_contractName];
    }

    /**
     * @dev checks if an address is authorized to govern
     */
    function isAuthorizedToGovern(address _toCheck) public view returns (bool) {
        return (getLatestAddress("GV") == _toCheck);
    }

    /**
     * @dev Changes Master contract address
     */
    function _setMasterAddress() internal {
        for (uint256 i = 0; i < allContractNames.length; i++) {
            Iupgradable up = Iupgradable(contractAddress[allContractNames[i]]);
            up.setMasterAddress();
        }
    }

    /**
     * @dev Replaces the implementations of the contract.
     * @param _contractsName The name of the contract.
     * @param _contractAddress The address of the contract to replace the implementations for.
     */
    function _replaceImplementation(
        bytes2 _contractsName,
        address _contractAddress
    ) internal {
        OwnedUpgradeabilityProxy tempInstance = OwnedUpgradeabilityProxy(
            contractAddress[_contractsName]
        );
        tempInstance.upgradeTo(_contractAddress);
    }

    /**
     * @dev to generator proxy
     * @param _contractAddress of the proxy
     */
    function _generateProxy(bytes2 _contractName, address _contractAddress)
        internal
    {
        OwnedUpgradeabilityProxy tempInstance = new OwnedUpgradeabilityProxy(
            _contractAddress
        );
        contractAddress[_contractName] = address(tempInstance);
        contractsActive[address(tempInstance)] = true;
    }
}
