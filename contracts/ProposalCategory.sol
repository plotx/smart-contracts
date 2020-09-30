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

import "./external/govblocks-protocol/interfaces/IProposalCategory.sol";
import "./external/govblocks-protocol/interfaces/IMemberRoles.sol";
import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./external/govblocks-protocol/Governed.sol";
import "./interfaces/Iupgradable.sol";

contract ProposalCategory is Governed, IProposalCategory, Iupgradable {
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

    bool public initiated;

    /**
     * @dev Initiates Default settings for Proposal Category contract (Adding default categories)
     */
    function proposalCategoryInitiate() external {
        //solhint-disable-line
        require(!initiated, "Category action hashes already updated");
        initiated = true;

        uint256 advisoryBoardRole = uint256(IMemberRoles.Role.AdvisoryBoard);
        uint256 tokenHolder = uint256(IMemberRoles.Role.TokenHolder);
        uint256 disputeResolutionBoard = uint256(IMemberRoles.Role.DisputeResolution);

        _addInitialCategories("Uncategorized", "", "EX", "", 0, 0, 0);
        _addInitialCategories(
            "Add new member role",
            "QmQFnBep7AyMYU3LJDuHSpTYatnw65XjHzzirrghtZoR8U",
            "MR",
            "addRole(bytes32,string,address)",
            50,
            advisoryBoardRole,
            advisoryBoardRole
        ); //1
        _addInitialCategories(
            "Update member role",
            "QmXMzSViLBJ22P9oj51Zz7isKTRnXWPHZcQ5hzGvvWD3UV",
            "MR",
            "updateRole(address,uint256,bool)",
            50,
            advisoryBoardRole,
            advisoryBoardRole
        ); // 2
        _addInitialCategories(
            "Add new category",
            "QmaVtv7NDR36X2ZEBjCmh1ny4UXKYSHPMfg8peuPLnNc3f",
            "PC",
            "newCategory(string,uint256,uint256,uint256,uint256[],uint256,string,address,bytes2,uint256[],string)",
            50,
            advisoryBoardRole,
            advisoryBoardRole
        ); // 3
        _addInitialCategories(
            "Edit category",
            "QmdmQhGo6hU5HzrNLuoyq2TUh1N3DQ7pT2SkPUhZvnsBYZ",
            "PC",
            "editCategory(uint256,string,uint256,uint256,uint256,uint256[],uint256,string,address,bytes2,uint256[],string)",
            50,
            advisoryBoardRole,
            advisoryBoardRole
        ); //4
        _addInitialCategories(
            "Update Market Implementations",
            "QmbyrHnGgTU9WWFq7DgtRTdpExLg9MqcFRYpWNpo7Ezjd5",
            "PL",
            "updateMarketImplementations(uint256[],address[])",
            60,
            tokenHolder,
            tokenHolder
        ); // 5
        _addInitialCategories(
            "Update contract's Implementation",
            "QmesiuX929bJHmgH8E58L6FWPazcLdgcdjmFzinEdsMfre",
            "PL",
            "upgradeContractImplementation(address,address)",
            60,
            tokenHolder,
            tokenHolder
        ); // 6
        _addInitialCategories(
            "Upgrade multiple contract Implementations",
            "QmcL1jUk7oda2cumSUTCrF6vTSeQN7qd1bYDFdz3v7BbUH",
            "MS",
            "upgradeMultipleImplementations(bytes2[],address[])",
            50,
            tokenHolder,
            tokenHolder
        ); // 7
        _addInitialCategories(
            "Update master Implementation",
            "QmPrGbWA4cuWzZbc9ZmqFmSRSFJnp5sa747wKsJnQkkj4t",
            "MS",
            "upgradeTo(address)",
            50,
            tokenHolder,
            tokenHolder
        ); // 8
        _addInitialCategories(
            "Add new contract",
            "QmXq5Jb4oeNzD2NHBLuWqy2m9J4N1KtkwyirBjkPBRNHii",
            "MS",
            "addNewContract(bytes2,address)",
            50,
            tokenHolder,
            tokenHolder
        );
        _addInitialCategories(
            "Raise Dispute",
            "QmQLKazba2dL8nTtGaoon6DsPv5FcpKqWZPRdxLv2tfUQW",
            "PL",
            "resolveDispute(address,uint256)",
            60,
            disputeResolutionBoard,
            tokenHolder
        );
        _addInitialCategories(
            "Burn Dispute Resolution Member Tokens",
            "QmTV2xSz5R5LVi9VozCyvNgnguq6xEsfVx7JaFbSatVVvQ",
            "TC",
            "burnLockedTokens(address,bytes32,uint256)",
            60,
            tokenHolder,
            tokenHolder
        ); //11
        _addInitialCategories(
            "Swap AB member",
            "QmV5HJMmhkEiHWt5qdNp6AbCqcn9Lw9ASA9efHDKGm8mdh",
            "MR",
            "swapABMember(address,address)",
            60,
            tokenHolder,
            tokenHolder
        );
        _addInitialCategories(
            "Update governance parameters",
            "QmTzKKxzpp1E4b8N3ch1kumetYRieEpN7ecTd3MNg4V1T9",
            "GV",
            "updateUintParameters(bytes8,uint256)",
            60,
            tokenHolder,
            tokenHolder
        );
        _addInitialCategories(
            "Update Token Controller parameters",
            "QmdVH5FdXbiGbqsj17643KVEEBQ3ciBZnjn9Mj24ehsrGm",
            "TC",
            "updateUintParameters(bytes8,uint256)",
            60,
            tokenHolder,
            tokenHolder
        );
        _addInitialCategories(
            "Add new market type",
            "QmPwAdEj6quzB65JWr6hDz6HrLtjTfbezwUiAe6mBq2sxY",
            "PL",
            "addNewMarketType(uint64,uint64,uint64)",
            60,
            tokenHolder,
            tokenHolder
        ); //15
        _addInitialCategories(
            "Add new market currency",
            "QmTu2FnkqUWhhNbeQraSrtbdA4DfGLavTsLRKRCeLV51x1",
            "PL",
            "addNewMarketCurrency(address,uint64)",
            60,
            tokenHolder,
            tokenHolder
        );
        _addInitialCategories(
            "Pause Market Creation",
            "QmamFs4k5ZbzajipsbWb4LCaKtyxDUwb9U5dYiNFqExb2W",
            "PL",
            "pauseMarketCreation()",
            60,
            tokenHolder,
            tokenHolder
        );
        _addInitialCategories(
            "Resume Market Creation",
            "QmZ9W1gHTJjSnt3ieiNv1Ux6ooX7ngU4Jrpvk3QiiBeP5r",
            "PL",
            "resumeMarketCreation()",
            60,
            tokenHolder,
            tokenHolder
        );
        _addInitialCategories(
            "Transfer Market Registry Assets",
            "QmeRCfGJuA6oTqY8a7nuVxdHih2SmZUTaZLVrttGv6yKy5",
            "PL",
            "transferAssets(address,address,uint256)",
            60,
            tokenHolder,
            tokenHolder
        );
        _addInitialCategories(
            "Update Market Uint parameters",
            "QmXPXBkSKfidTgbDcRBLqokqAa9SU2wwErTyedPAZPfr5z",
            "PL",
            "updateUintParameters(bytes8,uint256)",
            60,
            tokenHolder,
            tokenHolder
        ); //20
        _addInitialCategories(
            "Update Market Address parameters",
            "QmbbNRchZHMULBbKFT8qjCWgCRPa4qdkst8mE8A2Kffy7N",
            "PL",
            "updateConfigAddressParameters(bytes8,address)",
            60,
            tokenHolder,
            tokenHolder
        );
        _addInitialCategories(
            "Whitelist Sponsor",
            "QmRB2twfkzjox4ZAStnZTvtqr7Tr7ByGVdjTziWnpxXmWw",
            "MS",
            "whitelistSponsor(address)",
            60,
            tokenHolder,
            tokenHolder
        );
        _addInitialCategories(
            "Any other item",
            "",
            "EX",
            "",
            60,
            tokenHolder,
            tokenHolder
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
     * @dev Gets the category action details
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
     * @dev Gets the category action details of a category id
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
        OwnedUpgradeabilityProxy proxy = OwnedUpgradeabilityProxy(
            address(uint160(address(this)))
        );
        require(msg.sender == proxy.proxyOwner(), "Sender is not proxy owner.");

        require(masterAddress == address(0), "Master address already set");
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
                bytes(_functionHash).length > 0,
            "Wrong parameters passed"
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
                bytes(_functionHash).length > 0,
            "Wrong parameters passed"
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
        if (_memberRoleToVote == 3) {
            stakeIncentive[1] = 100 ether;
        }
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
