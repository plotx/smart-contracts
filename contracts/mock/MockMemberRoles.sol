import "../MemberRoles.sol";
contract MockMemberRoles is MemberRoles {
	/**
     * @dev is used to add initial advisory board members
     * @param abArray is the list of initial advisory board members
     */
    function addInitialABMembers(
        address[] calldata abArray
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
    }

}