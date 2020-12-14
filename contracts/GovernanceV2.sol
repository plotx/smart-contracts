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

import "./interfaces/IAllMarkets.sol";
import "./interfaces/IMarketCreationRewards.sol";
import "./Governance.sol";

contract GovernanceV2 is Governance {

    IAllMarkets internal allMarkets;
    IMarketCreationRewards internal mcr;
    bytes32 constant resolveDisputeHashV2 = keccak256(abi.encodeWithSignature("resolveDispute(uint256,uint256)"));

    /**
     * @dev Updates all dependency addresses to latest ones from Master
     */
    function setAllMarketsAddress() public {
        require(address(allMarkets) == address(0));
        allMarkets = IAllMarkets(address(uint160(ms.getLatestAddress("AM"))));
        mcr = IMarketCreationRewards(address(uint160(ms.getLatestAddress("MC"))));
    }

    /**
     * @dev Internal call to create proposal
     * @param _proposalTitle of proposal
     * @param _proposalSD is short description of proposal
     * @param _proposalDescHash IPFS hash value of propsal
     * @param _categoryId of proposal
     */
    function _createProposal(
        string memory _proposalTitle,
        string memory _proposalSD,
        string memory _proposalDescHash,
        uint256 _categoryId
    ) internal {
        uint256 _proposalId = totalProposals;
        allProposalData[_proposalId].owner = msg.sender;
        allProposalData[_proposalId].dateUpd = now;
        allProposalSolutions[_proposalId].push("");
        totalProposals++;

        emit Proposal(
            msg.sender,
            _proposalId,
            now,
            _proposalTitle,
            _proposalSD,
            _proposalDescHash
        );

        if (_categoryId > 0) {
            (, , , uint defaultIncentive, bytes memory _functionHash) = proposalCategory
            .categoryActionDetails(_categoryId);
            require(allowedToCategorize() ||
                keccak256(_functionHash) ==
                 resolveDisputeHashV2 ||
                keccak256(_functionHash) == swapABMemberHash
            );
            if(keccak256(_functionHash) == swapABMemberHash) {
                defaultIncentive = 0;
            }
            _categorizeProposal(_proposalId, _categoryId, defaultIncentive, _functionHash);
        }
    }


    /**
     * @dev Internal call to categorize a proposal
     * @param _proposalId of proposal
     * @param _categoryId of proposal
     * @param _incentive is commonIncentive
     */
    function _categorizeProposal(
        uint256 _proposalId,
        uint256 _categoryId,
        uint256 _incentive,
        bytes memory _functionHash
    ) internal {
        require(
            _categoryId > 0 && _categoryId < proposalCategory.totalCategories(),
            "Invalid category"
        );
        if(keccak256(_functionHash) == resolveDisputeHashV2) {
            require(msg.sender == address(allMarkets));
        }
        allProposalData[_proposalId].category = _categoryId;
        allProposalData[_proposalId].commonIncentive = _incentive;
        allProposalData[_proposalId].propStatus = uint256(
            ProposalStatus.AwaitingSolution
        );

        if (_incentive > 0) {
            mcr.transferAssets(
                address(tokenInstance),
                address(this),
                _incentive
            );
        }

        emit ProposalCategorized(_proposalId, msg.sender, _categoryId);
    }

        /**
     * @dev Called when vote majority is reached
     * @param _proposalId of proposal in concern
     * @param _status of proposal in concern
     * @param category of proposal in concern
     * @param max vote value of proposal in concern
     */
    function _callIfMajReached(
        uint256 _proposalId,
        uint256 _status,
        uint256 category,
        uint256 max,
        uint256 role
    ) internal {
        allProposalData[_proposalId].finalVerdict = max;
        _updateProposalStatus(_proposalId, _status);
        emit ProposalAccepted(_proposalId);
        if (
            proposalActionStatus[_proposalId] != uint256(ActionStatus.NoAction)
        ) {
            if (role == actionRejectAuthRole) {
                _triggerAction(_proposalId, category);
            } else {
                proposalActionStatus[_proposalId] = uint256(
                    ActionStatus.Accepted
                );
                bytes memory functionHash = proposalCategory.categoryActionHashes(category);
                if(keccak256(functionHash)
                    == swapABMemberHash ||
                    keccak256(functionHash)
                    == resolveDisputeHashV2 
                ) {
                    _triggerAction(_proposalId, category);
                } else {
                    proposalExecutionTime[_proposalId] = actionWaitingTime.add(now);
                }
            }
        }
    }

    /**
     * @dev Closes the proposal.
     * @param _proposalId of proposal to be closed.
     */
    function closeProposal(uint256 _proposalId) external {
        uint256 category = allProposalData[_proposalId].category;

        if (
            allProposalData[_proposalId].dateUpd.add(maxDraftTime) <= now &&
            allProposalData[_proposalId].propStatus <
            uint256(ProposalStatus.VotingStarted)
        ) {
            _updateProposalStatus(_proposalId, uint256(ProposalStatus.Denied));
            _transferPLOT(
                address(mcr),
                allProposalData[_proposalId].commonIncentive
            );
        } else {
            require(canCloseProposal(_proposalId) == 1);
            _closeVote(_proposalId, category);
        }
    }

    /**
     * @dev Internal call to close member voting
     * @param _proposalId of proposal in concern
     * @param category of proposal in concern
     */
    function _closeVote(uint256 _proposalId, uint256 category) internal {
        uint256 majorityVote;
        uint256 mrSequence;
        (, mrSequence, majorityVote, , , , ) = proposalCategory.category(
            category
        );
        bytes memory _functionHash = proposalCategory.categoryActionHashes(category);
        if (_checkForThreshold(_proposalId, category)) {
            if (
                (
                    (
                        proposalVoteTally[_proposalId].voteValue[1]
                            .mul(100)
                    )
                        .div(allProposalData[_proposalId].totalVoteValue)
                ) >= majorityVote
            ) {
                _callIfMajReached(
                    _proposalId,
                    uint256(ProposalStatus.Accepted),
                    category,
                    1,
                    mrSequence
                );
            } else {
                _updateProposalStatus(
                    _proposalId,
                    uint256(ProposalStatus.Rejected)
                );
            }
        } else {
            if ((keccak256(_functionHash) != resolveDisputeHashV2) &&
             (mrSequence != uint(IMemberRoles.Role.AdvisoryBoard)) &&
             proposalVoteTally[_proposalId].abVoteValue[1].mul(100)
                .div(memberRole.numberOfMembers(uint(IMemberRoles.Role.AdvisoryBoard))) >= advisoryBoardMajority
            ) {
                _callIfMajReached(
                    _proposalId,
                    uint256(ProposalStatus.Accepted),
                    category,
                    1,
                    mrSequence
                );
            } else {
                _updateProposalStatus(_proposalId, uint(ProposalStatus.Denied));
            }
        }
        if(allProposalData[_proposalId].propStatus > uint256(ProposalStatus.Accepted)) {
            if(keccak256(_functionHash) == resolveDisputeHashV2) {
                allMarkets.burnDisputedProposalTokens(_proposalId);
            }
        }

        if (proposalVoteTally[_proposalId].voters == 0 && allProposalData[_proposalId].commonIncentive > 0) {
            _transferPLOT(
                address(mcr),
                allProposalData[_proposalId].commonIncentive
            );
        }
    }

    /**
     * @dev Checks if the vote count against any solution passes the threshold value or not.
     */
    function _checkForThreshold(uint256 _proposalId, uint256 _category)
        internal
        view
        returns (bool check)
    {
        uint256 categoryQuorumPerc;
        uint256 roleAuthorized;
        (, roleAuthorized, , categoryQuorumPerc, , , ) = proposalCategory
            .category(_category);
        if (roleAuthorized == uint256(IMemberRoles.Role.TokenHolder)) {
            check =
                (allProposalData[_proposalId].totalVoteValue).mul(100).div(
                    tokenController.totalSupply()
                ) >=
                categoryQuorumPerc;
        } else if (roleAuthorized == uint256(IMemberRoles.Role.DisputeResolution)) {
            (uint256 marketId, ) = abi.decode(allProposalSolutions[_proposalId][1], (uint256, uint256));
            uint256 totalStakeValueInPlot = allMarkets.getTotalStakedValueInPLOT(marketId);
            if(allProposalData[_proposalId].totalVoteValue > 0) {
                check =
                    (allProposalData[_proposalId].totalVoteValue) >=
                    (_minOf(totalStakeValueInPlot.mul(drQuorumMulitplier), (tokenController.totalSupply()).mul(100).div(totalSupplyCapForDRQrm)));
            } else {
                check = false;
            }
        } else {
            check =
                (proposalVoteTally[_proposalId].voters).mul(100).div(
                    memberRole.numberOfMembers(roleAuthorized)
                ) >=
                categoryQuorumPerc;
        }
    }

}
