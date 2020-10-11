pragma solidity 0.5.7;

import "../Governance.sol";

contract MockGovernance is Governance {

	function _initiateGovernance() internal {
		super._initiateGovernance();
	   	maxVoteWeigthPer = 50;
	}
}