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
import "./Governance.sol";

contract GovernanceNew is Governance {

    IAllMarkets internal allMarkets;
    
    /**
     * @dev Updates all dependency addresses to latest ones from Master
     */
    function setAllMarketsAddress() public {
        require(address(allMarkets) == address(0));
        allMarkets = IAllMarkets(address(uint160(ms.getLatestAddress("AM"))));
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
                address(allMarkets),
                allProposalData[_proposalId].commonIncentive
            );
        } else {
            require(canCloseProposal(_proposalId) == 1);
            _closeVote(_proposalId, category);
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
        if(keccak256(_functionHash) == resolveDisputeHash) {
            require(msg.sender == address(allMarkets));
        }
        allProposalData[_proposalId].category = _categoryId;
        allProposalData[_proposalId].commonIncentive = _incentive;
        allProposalData[_proposalId].propStatus = uint256(
            ProposalStatus.AwaitingSolution
        );

        if (_incentive > 0) {
            allMarkets.transferAssets(
                address(tokenInstance),
                address(this),
                _incentive
            );
        }

        emit ProposalCategorized(_proposalId, msg.sender, _categoryId);
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
            if ((keccak256(_functionHash) != resolveDisputeHash) &&
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
            if(keccak256(_functionHash) == resolveDisputeHash) {
                allMarkets.burnDisputedProposalTokens(_proposalId);
            }
        }

        if (proposalVoteTally[_proposalId].voters == 0 && allProposalData[_proposalId].commonIncentive > 0) {
            _transferPLOT(
                address(allMarkets),
                allProposalData[_proposalId].commonIncentive
            );
        }
    }

}
