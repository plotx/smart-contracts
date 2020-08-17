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
import "./external/govblocks-protocol/Governed.sol";
import "./Iupgradable.sol";


contract ProposalCategory is  Governed, IProposalCategory, Iupgradable {

    bool public constructorCheck;
    IMemberRoles internal mr;

    struct CategoryStruct {
        uint memberRoleToVote;
        uint majorityVotePerc;
        uint quorumPerc;
        uint[] allowedToCreateProposal;
        uint closingTime;
        uint minStake;
    }

    struct CategoryAction {
        uint defaultIncentive;
        address contractAddress;
        bytes2 contractName;
    }
    
    CategoryStruct[] internal allCategory;
    mapping (uint => CategoryAction) internal categoryActionData;
    mapping (uint => bytes) public categoryActionHashes;

    bool public initated;

    /**
    * @dev Initiates Default settings for Proposal Category contract (Adding default categories)
    */
    function proposalCategoryInitiate() external { //solhint-disable-line
        require(!initated, "Category action hashes already updated");
        initated = true;
        categoryActionHashes[1] = abi.encodeWithSignature("addRole(bytes32,string,address)");
        categoryActionHashes[2] = abi.encodeWithSignature("updateRole(address,uint256,bool)");
        categoryActionHashes[3] = abi.encodeWithSignature("newCategory(string,uint256,uint256,uint256,uint256[],uint256,string,address,bytes2,uint256[],string)");//solhint-disable-line
        categoryActionHashes[4] = abi.encodeWithSignature("editCategory(uint256,string,uint256,uint256,uint256,uint256[],uint256,string,address,bytes2,uint256[],string)");//solhint-disable-line
        categoryActionHashes[5] = abi.encodeWithSignature("upgradeContractImplementation(bytes2,address)");
        categoryActionHashes[6] = abi.encodeWithSignature("transferEther(uint256,address)");
        //Upgrade master
        categoryActionHashes[6] = abi.encodeWithSignature("upgradeTo(address)");
    }

    /**
    * @dev Gets Total number of categories added till now
    */
    function totalCategories() external view returns(uint) {
        return allCategory.length;
    }

    /**
    * @dev Gets category details
    */
    function category(uint _categoryId) external view returns(uint, uint, uint, uint, uint[] memory, uint, uint) {
        return(
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
    function categoryAction(uint _categoryId) external view returns(uint, address, bytes2, uint) {

        return(
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
    function categoryActionDetails(uint _categoryId) external view returns(uint, address, bytes2, uint, bytes memory) {
        return(
            _categoryId,
            categoryActionData[_categoryId].contractAddress,
            categoryActionData[_categoryId].contractName,
            categoryActionData[_categoryId].defaultIncentive,
            categoryActionHashes[_categoryId]
        );
    }

    /**
    * @dev Updates dependant contract addresses
    */
    function changeDependentContractAddress() public {
        mr = IMemberRoles(ms.getLatestAddress("MR"));
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
        uint _memberRoleToVote,
        uint _majorityVotePerc, 
        uint _quorumPerc,
        uint[] memory _allowedToCreateProposal,
        uint _closingTime,
        string memory _actionHash,
        address _contractAddress,
        bytes2 _contractName,
        uint[] memory _incentives,
        string memory _functionHash
    ) 
        public
        onlyAuthorizedToGovern 
    {

        require(_quorumPerc <= 100 && _majorityVotePerc <= 100, "Invalid percentage");

        require((_contractName == "EX" && _contractAddress == address(0)) || bytes(_functionHash).length > 0);

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


        if (bytes(_functionHash).length > 0 && abi.encodeWithSignature(_functionHash).length == 4) {
            categoryActionHashes[allCategory.length - 1] = abi.encodeWithSignature(_functionHash);
        }
    }

    /**
     * @dev Changes the master address and update it's instance
     * @param _masterAddress is the new master address
     */
    function changeMasterAddress(address _masterAddress) public {
        if (masterAddress != address(0))
            require(masterAddress == msg.sender);
        masterAddress = _masterAddress;
        ms = Master(_masterAddress);
        
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
        uint _categoryId, 
        string memory _name, 
        uint _memberRoleToVote, 
        uint _majorityVotePerc, 
        uint _quorumPerc,
        uint[] memory _allowedToCreateProposal,
        uint _closingTime,
        string memory _actionHash,
        address _contractAddress,
        bytes2 _contractName,
        uint[] memory _incentives,
        string memory _functionHash
    )
        public
        onlyAuthorizedToGovern
    {
        require(_verifyMemberRoles(_memberRoleToVote, _allowedToCreateProposal) == 1, "Invalid Role");

        require(_quorumPerc <= 100 && _majorityVotePerc <= 100, "Invalid percentage");

        require((_contractName == "EX" && _contractAddress == address(0)) || bytes(_functionHash).length > 0);

        delete categoryActionHashes[_categoryId];
        if (bytes(_functionHash).length > 0 && abi.encodeWithSignature(_functionHash).length == 4) {
            categoryActionHashes[_categoryId] = abi.encodeWithSignature(_functionHash);
        }
        allCategory[_categoryId].memberRoleToVote = _memberRoleToVote;
        allCategory[_categoryId].majorityVotePerc = _majorityVotePerc;
        allCategory[_categoryId].closingTime = _closingTime;
        allCategory[_categoryId].allowedToCreateProposal = _allowedToCreateProposal;
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
        uint _memberRoleToVote,
        uint _majorityVotePerc, 
        uint _quorumPerc,
        uint[] memory _allowedToCreateProposal,
        uint _closingTime,
        string memory _actionHash,
        address _contractAddress,
        bytes2 _contractName,
        uint[] memory _incentives
    ) 
        internal
    {
        require(_verifyMemberRoles(_memberRoleToVote, _allowedToCreateProposal) == 1, "Invalid Role");
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
        uint categoryId = allCategory.length - 1;
        categoryActionData[categoryId] = CategoryAction(_incentives[1], _contractAddress, _contractName);
        emit Category(categoryId, _name, _actionHash);
    }

    /**
    * @dev Internal call to check if given roles are valid or not
    */
    function _verifyMemberRoles(uint _memberRoleToVote, uint[] memory _allowedToCreateProposal) 
    internal view returns(uint) { 
        uint totalRoles = mr.totalRoles();
        if (_memberRoleToVote >= totalRoles) {
            return 0;
        }
        for (uint i = 0; i < _allowedToCreateProposal.length; i++) {
            if (_allowedToCreateProposal[i] >= totalRoles) {
                return 0;
            }
        }
        return 1;
    }

}
