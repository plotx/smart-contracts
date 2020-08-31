/* Copyright (C) 2017 GovBlocks.io
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

import "./external/govblocks-protocol/interfaces/IProposalCategory.sol";
import "./external/govblocks-protocol/interfaces/IMemberRoles.sol";
import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./external/govblocks-protocol/Governed.sol";

contract ProposalCategory is Governed, IProposalCategory {
    bool public constructorCheck;
    IMemberRoles internal mr;

    struct CategoryStruct {
        uint256 memberRoleToVote;
        uint256 majorityVotePerc;
        uint256 quorumPerc;
        uint256[] allowedToCreateProposal;
        uint256 closingTime;
        uint256 minStake;
    }

    struct CategoryAction {
        uint256 defaultIncentive;
        address contractAddress;
        bytes2 contractName;
    }

    CategoryStruct[] internal allCategory;
    mapping(uint256 => CategoryAction) internal categoryActionData;
    mapping(uint256 => bytes) public categoryActionHashes;

    bool public initated;

    /**
     * @dev Initiates Default settings for Proposal Category contract (Adding default categories)
     */
    function proposalCategoryInitiate() external {
        //solhint-disable-line
        require(!initated, "Category action hashes already updated");
        initated = true;

        _addInitialCategories("Uncategorized", "", "EX", "", 0, 0, 0);
        _addInitialCategories(
            "Add new member role",
            "QmQFnBep7AyMYU3LJDuHSpTYatnw65XjHzzirrghtZoR8U",
            "MR",
            "addRole(bytes32,string,address)",
            50,
            1,
            1
        ); //1
        _addInitialCategories(
            "Update member role",
            "QmXMzSViLBJ22P9oj51Zz7isKTRnXWPHZcQ5hzGvvWD3UV",
            "MR",
            "updateRole(address,uint256,bool)",
            50,
            1,
            1
        ); // 2
        _addInitialCategories(
            "Add new category",
            "QmYzBtW5mRMwHwKQUmRnwdXgq733WNzN5fo2yNPpkVG9Ng",
            "PC",
            "newCategory(string,uint256,uint256,uint256,uint256[],uint256,string,address,bytes2,uint256[],string)",
            50,
            1,
            1
        ); // 3
        _addInitialCategories(
            "Edit category",
            "QmcVNykyhjni7GFk8x1GrL3idzc6vxz4vNJLHPS9vJ79Qc",
            "PC",
            "editCategory(uint256,string,uint256,uint256,uint256,uint256[],uint256,string,address,bytes2,uint256[],string)",
            50,
            1,
            1
        ); //4
        _addInitialCategories(
            "Update Market Implementation",
            "",
            "PL",
            "updateMarketImplementation(address)",
            60,
            2,
            2
        ); // 5
        _addInitialCategories(
            "Update Existing Market's Implementation",
            "",
            "PL",
            "upgradeContractImplementation(address,address)",
            60,
            2,
            2
        ); // 6
        _addInitialCategories(
            "Upgrade multiple contract Implementations",
            "Qme4hGas6RuDYk9LKE2XkK9E46LNeCBUzY12DdT5uQstvh",
            "MS",
            "upgradeMultipleImplementations(bytes2[],address[])",
            50,
            2,
            2
        ); // 7
        _addInitialCategories(
            "Update master Implementation",
            "",
            "MS",
            "upgradeTo(address)",
            50,
            2,
            2
        ); // 8
        _addInitialCategories(
            "Add new contract",
            "",
            "MS",
            "addNewContract(bytes2,address)",
            50,
            2,
            2
        );
        _addInitialCategories(
            "Raise Dispute",
            "",
            "PL",
            "resolveDispute(address,uint256)",
            60,
            3,
            2
        ); 
        _addInitialCategories(
            "Burn Dispute Resolution Member Tokens",
            "",
            "TC",
            "burnLockedTokens(address,bytes32,uint256)",
            60,
            2,
            2
        ); //11
        _addInitialCategories(
            "Swap AB member",
            "",
            "MR",
            "swapABMember(address,address)",
            60,
            2,
            2
        ); 
        _addInitialCategories(
            "Update governance parameters",
            "",
            "GV",
            "updateUintParameters(bytes8,uint256)",
            60,
            2,
            2
        ); 
        _addInitialCategories(
            "Update Token Controller parameters",
            "",
            "TC",
            "updateUintParameters(bytes8,uint256)",
            60,
            2,
            2
        ); 
        _addInitialCategories(
            "Add new market type",
            "",
            "PL",
            "addNewMarketType(uint256,uint256,uint256,uint256,uint256)",
            60,
            2,
            2
        ); //15
        _addInitialCategories(
            "Add new market currency",
            "",
            "PL",
            "addNewMarketCurrency(address,bytes32,string,bool,uint256)",
            60,
            2,
            2
        ); 
        _addInitialCategories(
            "Pause Market Creation",
            "",
            "PL",
            "pauseMarketCreation()",
            60,
            2,
            2
        );
        _addInitialCategories(
            "Resume Market Creation",
            "",
            "PL",
            "resumeMarketCreation()",
            60,
            2,
            2
        );
        _addInitialCategories(
            "Transfer Plotus Assets",
            "",
            "PL",
            "transferAssets(address,address,uint256)",
            60,
            2,
            2
        );
        _addInitialCategories(
            "Update Config Uint parameters",
            "",
            "PL",
            "updateConfigUintParameters(bytes8,uint256)",
            60,
            2,
            2
        ); //20
        _addInitialCategories(
            "Update Market Config Implementation",
            "",
            "PL",
            "updateMarketConfigImplementation(address)",
            60,
            2,
            2
        ); //21
        _addInitialCategories(
            "Update Market Address parameters",
            "",
            "PL",
            "updateConfigAddressParameters(bytes8,address)",
            60,
            2,
            2
        );
        _addInitialCategories(
            "Add incentive token",
            "",
            "PL",
            "addIncentiveToken(address)",
            60,
            2,
            2
        );
        _addInitialCategories(
            "Set commission percent of token",
            "",
            "PL",
            "setCommissionPercentage(address,uint256)",
            60,
            2,
            2
        );
        _addInitialCategories(
            "Change token operator",
            "",
            "TC",
            "changeOperator(address)",
            60,
            2,
            2
        );
    }

    /**
     * @dev Gets Total number of categories added till now
     */
    function totalCategories() external view returns (uint256) {
        return allCategory.length;
    }

    /**
     * @dev Gets category details
     */
    function category(uint256 _categoryId)
        external
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256[] memory,
            uint256,
            uint256
        )
    {
        return (
            _categoryId,
            allCategory[_categoryId].memberRoleToVote,
            allCategory[_categoryId].majorityVotePerc,
            allCategory[_categoryId].quorumPerc,
            allCategory[_categoryId].allowedToCreateProposal,
            allCategory[_categoryId].closingTime,
            allCategory[_categoryId].minStake
        );
    }

    /**
     * @dev Gets the category acion details
     * @param _categoryId is the category id in concern
     * @return the category id
     * @return the contract address
     * @return the contract name
     * @return the default incentive
     */
    function categoryAction(uint256 _categoryId)
        external
        view
        returns (
            uint256,
            address,
            bytes2,
            uint256
        )
    {
        return (
            _categoryId,
            categoryActionData[_categoryId].contractAddress,
            categoryActionData[_categoryId].contractName,
            categoryActionData[_categoryId].defaultIncentive
        );
    }

    /**
     * @dev Gets the category acion details of a category id
     * @param _categoryId is the category id in concern
     * @return the category id
     * @return the contract address
     * @return the contract name
     * @return the default incentive
     * @return action function hash
     */
    function categoryActionDetails(uint256 _categoryId)
        external
        view
        returns (
            uint256,
            address,
            bytes2,
            uint256,
            bytes memory
        )
    {
        return (
            _categoryId,
            categoryActionData[_categoryId].contractAddress,
            categoryActionData[_categoryId].contractName,
            categoryActionData[_categoryId].defaultIncentive,
            categoryActionHashes[_categoryId]
        );
    }

    /**
     * @dev Changes the master address and update it's instance
     */
    function setMasterAddress() public {
        OwnedUpgradeabilityProxy proxy =  OwnedUpgradeabilityProxy(address(uint160(address(this))));
        require(msg.sender == proxy.proxyOwner(),"Sender is not proxy owner.");

        require(masterAddress == address(0));
        masterAddress = msg.sender;
        mr = IMemberRoles(IMaster(masterAddress).getLatestAddress("MR"));
    }

    /**
     * @dev Adds new category
     * @param _name Category name
     * @param _memberRoleToVote Voting Layer sequence in which the voting has to be performed.
     * @param _majorityVotePerc Majority Vote threshold for Each voting layer
     * @param _quorumPerc minimum threshold percentage required in voting to calculate result
     * @param _allowedToCreateProposal Member roles allowed to create the proposal
     * @param _closingTime Vote closing time for Each voting layer
     * @param _actionHash hash of details containing the action that has to be performed after proposal is accepted
     * @param _contractAddress address of contract to call after proposal is accepted
     * @param _contractName name of contract to be called after proposal is accepted
     * @param _incentives rewards to distributed after proposal is accepted
     * @param _functionHash function signature to be executed
     */
    function newCategory(
        string memory _name,
        uint256 _memberRoleToVote,
        uint256 _majorityVotePerc,
        uint256 _quorumPerc,
        uint256[] memory _allowedToCreateProposal,
        uint256 _closingTime,
        string memory _actionHash,
        address _contractAddress,
        bytes2 _contractName,
        uint256[] memory _incentives,
        string memory _functionHash
    ) public onlyAuthorizedToGovern {
        require(
            _quorumPerc <= 100 && _majorityVotePerc <= 100,
            "Invalid percentage"
        );

        require(
            (_contractName == "EX" && _contractAddress == address(0)) ||
                bytes(_functionHash).length > 0
        );

        _addCategory(
            _name,
            _memberRoleToVote,
            _majorityVotePerc,
            _quorumPerc,
            _allowedToCreateProposal,
            _closingTime,
            _actionHash,
            _contractAddress,
            _contractName,
            _incentives
        );

        if (
            bytes(_functionHash).length > 0 &&
            abi.encodeWithSignature(_functionHash).length == 4
        ) {
            categoryActionHashes[allCategory.length - 1] = abi
                .encodeWithSignature(_functionHash);
        }
    }

    /**
     * @dev Updates category details
     * @param _categoryId Category id that needs to be updated
     * @param _name Category name
     * @param _memberRoleToVote Voting Layer sequence in which the voting has to be performed.
     * @param _allowedToCreateProposal Member roles allowed to create the proposal
     * @param _majorityVotePerc Majority Vote threshold for Each voting layer
     * @param _quorumPerc minimum threshold percentage required in voting to calculate result
     * @param _closingTime Vote closing time for Each voting layer
     * @param _actionHash hash of details containing the action that has to be performed after proposal is accepted
     * @param _contractAddress address of contract to call after proposal is accepted
     * @param _contractName name of contract to be called after proposal is accepted
     * @param _incentives rewards to distributed after proposal is accepted
     * @param _functionHash function signature to be executed
     */
    function editCategory(
        uint256 _categoryId,
        string memory _name,
        uint256 _memberRoleToVote,
        uint256 _majorityVotePerc,
        uint256 _quorumPerc,
        uint256[] memory _allowedToCreateProposal,
        uint256 _closingTime,
        string memory _actionHash,
        address _contractAddress,
        bytes2 _contractName,
        uint256[] memory _incentives,
        string memory _functionHash
    ) public onlyAuthorizedToGovern {
        require(
            _verifyMemberRoles(_memberRoleToVote, _allowedToCreateProposal),
            "Invalid Role"
        );

        require(
            _quorumPerc <= 100 && _majorityVotePerc <= 100,
            "Invalid percentage"
        );

        require(
            (_contractName == "EX" && _contractAddress == address(0)) ||
                bytes(_functionHash).length > 0
        );

        delete categoryActionHashes[_categoryId];
        if (
            bytes(_functionHash).length > 0 &&
            abi.encodeWithSignature(_functionHash).length == 4
        ) {
            categoryActionHashes[_categoryId] = abi.encodeWithSignature(
                _functionHash
            );
        }
        allCategory[_categoryId].memberRoleToVote = _memberRoleToVote;
        allCategory[_categoryId].majorityVotePerc = _majorityVotePerc;
        allCategory[_categoryId].closingTime = _closingTime;
        allCategory[_categoryId]
            .allowedToCreateProposal = _allowedToCreateProposal;
        allCategory[_categoryId].minStake = _incentives[0];
        allCategory[_categoryId].quorumPerc = _quorumPerc;
        categoryActionData[_categoryId].defaultIncentive = _incentives[1];
        categoryActionData[_categoryId].contractName = _contractName;
        categoryActionData[_categoryId].contractAddress = _contractAddress;
        emit Category(_categoryId, _name, _actionHash);
    }

    /**
     * @dev Internal call to add new category
     * @param _name Category name
     * @param _memberRoleToVote Voting Layer sequence in which the voting has to be performed.
     * @param _majorityVotePerc Majority Vote threshold for Each voting layer
     * @param _quorumPerc minimum threshold percentage required in voting to calculate result
     * @param _allowedToCreateProposal Member roles allowed to create the proposal
     * @param _closingTime Vote closing time for Each voting layer
     * @param _actionHash hash of details containing the action that has to be performed after proposal is accepted
     * @param _contractAddress address of contract to call after proposal is accepted
     * @param _contractName name of contract to be called after proposal is accepted
     * @param _incentives rewards to distributed after proposal is accepted
     */
    function _addCategory(
        string memory _name,
        uint256 _memberRoleToVote,
        uint256 _majorityVotePerc,
        uint256 _quorumPerc,
        uint256[] memory _allowedToCreateProposal,
        uint256 _closingTime,
        string memory _actionHash,
        address _contractAddress,
        bytes2 _contractName,
        uint256[] memory _incentives
    ) internal {
        require(
            _verifyMemberRoles(_memberRoleToVote, _allowedToCreateProposal),
            "Invalid Role"
        );
        allCategory.push(
            CategoryStruct(
                _memberRoleToVote,
                _majorityVotePerc,
                _quorumPerc,
                _allowedToCreateProposal,
                _closingTime,
                _incentives[0]
            )
        );
        uint256 categoryId = allCategory.length - 1;
        categoryActionData[categoryId] = CategoryAction(
            _incentives[1],
            _contractAddress,
            _contractName
        );
        emit Category(categoryId, _name, _actionHash);
    }

    /**
     * @dev Internal call to check if given roles are valid or not
     */
    function _verifyMemberRoles(
        uint256 _memberRoleToVote,
        uint256[] memory _allowedToCreateProposal
    ) internal view returns (bool) {
        uint256 totalRoles = mr.totalRoles();
        if (_memberRoleToVote >= totalRoles) {
            return false;
        }
        for (uint256 i = 0; i < _allowedToCreateProposal.length; i++) {
            if (_allowedToCreateProposal[i] >= totalRoles) {
                return false;
            }
        }
        return true;
    }

    /**
     * @dev to add the initial categories
     * @param _name is category name
     * @param _actionHash hash of category action
     * @param _contractName is the name of contract
     * @param _majorityVotePerc percentage of majority vote
     * @param _memberRoleToVote is the member role the category can vote on
     */
    function _addInitialCategories(
        string memory _name,
        string memory _solutionHash,
        bytes2 _contractName,
        string memory _actionHash,
        uint256 _majorityVotePerc,
        uint256 _memberRoleToVote,
        uint256 _allowedToCreate
    ) internal {
        uint256[] memory allowedToCreateProposal = new uint256[](1);
        uint256[] memory stakeIncentive = new uint256[](2);
        allowedToCreateProposal[0] = _allowedToCreate;
        stakeIncentive[0] = 0;
        stakeIncentive[1] = 0;
        if (bytes(_actionHash).length > 0) {
            categoryActionHashes[allCategory.length] = abi.encodeWithSignature(
                _actionHash
            );
        }
        _addCategory(
            _name,
            _memberRoleToVote,
            _majorityVotePerc,
            10,
            allowedToCreateProposal,
            604800,
            _solutionHash,
            address(0),
            _contractName,
            stakeIncentive
        );
    }
}
