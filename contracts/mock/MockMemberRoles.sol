import "../MemberRoles.sol";
contract MockMemberRoles is MemberRoles {
	/**
     * @dev is used to add initial advisory board members
     * @param abArray is the list of initial advisory board members
     */
    function addInitialABandDRMembers(
        address[] calldata abArray,
        address[] calldata drArray
    ) external {
        require(
            numberOfMembers(uint256(Role.AdvisoryBoard)) == 1,
            "Already initialized!"
        );

        for (uint256 i = 0; i < abArray.length; i++) {
            require(
                checkRole(abArray[i], uint256(Role.TokenHolder)),
                "not a token holder"
            );

            _updateRole(abArray[i], uint256(Role.AdvisoryBoard), true);
        }
        for (uint256 i = 0; i < drArray.length; i++) {
            require(
                checkRole(drArray[i], uint256(Role.TokenHolder)),
                "not a token holder"
            );

            _updateRole(drArray[i], uint256(Role.DisputeResolution), true);
        }
    }

}