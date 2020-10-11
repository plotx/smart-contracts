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

import "./external/openzeppelin-solidity/math/SafeMath.sol";
import "./external/govblocks-protocol/interfaces/IMemberRoles.sol";
import "./external/govblocks-protocol/Governed.sol";
import "./external/proxy/OwnedUpgradeabilityProxy.sol";
import "./interfaces/Iupgradable.sol";
import "./interfaces/ITokenController.sol";

contract MemberRoles is IMemberRoles, Governed, Iupgradable {

    using SafeMath for uint256;

    ITokenController internal tokenController;
    struct MemberRoleDetails {
        uint256 memberCounter;
        mapping(address => uint256) memberIndex;
        address[] memberAddress;
        address authorized;
    }

    MemberRoleDetails[] internal memberRoleData;
    bool internal constructorCheck;
    address internal initiator;
    uint256 internal minLockAmountForDR;
    uint256 internal lockTimeForDR;

    modifier checkRoleAuthority(uint256 _memberRoleId) {
        if (memberRoleData[_memberRoleId].authorized != address(0))
            require(
                msg.sender == memberRoleData[_memberRoleId].authorized,
                "Not authorized"
            );
        else require(isAuthorizedToGovern(msg.sender), "Not Authorized");
        _;
    }

    /**
     * @dev to swap advisory board member
     * @param _newABAddress is address of new AB member
     * @param _removeAB is advisory board member to be removed
     */
    function swapABMember(address _newABAddress, address _removeAB)
        external
        checkRoleAuthority(uint256(Role.AdvisoryBoard))
    {
        _updateRole(_newABAddress, uint256(Role.AdvisoryBoard), true);
        _updateRole(_removeAB, uint256(Role.AdvisoryBoard), false);
    }

    /**
     * @dev to change the master address
     */
    function setMasterAddress() public {
        OwnedUpgradeabilityProxy proxy = OwnedUpgradeabilityProxy(
            address(uint160(address(this)))
        );
        require(msg.sender == proxy.proxyOwner(), "Sender is not proxy owner.");

        require(masterAddress == address(0), "Master address already set");
        masterAddress = msg.sender;
        IMaster masterInstance = IMaster(masterAddress);
        tokenController = ITokenController(
            masterInstance.getLatestAddress("TC")
        );
        minLockAmountForDR = 500 ether;
        lockTimeForDR = 15 days;
    }

    /**
     * @dev Set the authorized address to add the initial roles and members
     * @param _initiator is address of the initiator
     */
    function setInititorAddress(address _initiator) external {
        OwnedUpgradeabilityProxy proxy = OwnedUpgradeabilityProxy(
            address(uint160(address(this)))
        );
        require(msg.sender == proxy.proxyOwner(), "Sender is not proxy owner.");
        require(initiator == address(0), "Already Set");
        initiator = _initiator;
    }

    /**
     * @dev to initiate the member roles and add initial AB, DR board members
     * @param _abArray is array of addresses of the Initial AB members
     */
    function memberRolesInitiate(
        address[] calldata _abArray
    ) external {
        require(msg.sender == initiator);
        require(!constructorCheck, "Already constructed");
        _addInitialMemberRoles();
        for (uint256 i = 0; i < _abArray.length; i++) {
            _updateRole(_abArray[i], uint256(Role.AdvisoryBoard), true);
        }
        constructorCheck = true;
    }

    /// @dev Adds new member role
    /// @param _roleName New role name
    /// @param _roleDescription New description hash
    /// @param _authorized Authorized member against every role id
    function addRole(
        //solhint-disable-line
        bytes32 _roleName,
        string memory _roleDescription,
        address _authorized
    ) public onlyAuthorizedToGovern {
        _addRole(_roleName, _roleDescription, _authorized);
    }

    /// @dev Assign or Delete a member from specific role.
    /// @param _memberAddress Address of Member
    /// @param _roleId RoleId to update
    /// @param _active active is set to be True if we want to assign this role to member, False otherwise!
    function updateRole(
        //solhint-disable-line
        address _memberAddress,
        uint256 _roleId,
        bool _active
    ) public checkRoleAuthority(_roleId) {
        _updateRole(_memberAddress, _roleId, _active);
    }

    /// @dev Return number of member roles
    function totalRoles() public view returns (uint256) {
        //solhint-disable-line
        return memberRoleData.length;
    }

    /// @dev Change Member Address who holds the authority to Add/Delete any member from specific role.
    /// @param _roleId roleId to update its Authorized Address
    /// @param _newAuthorized New authorized address against role id
    function changeAuthorized(uint256 _roleId, address _newAuthorized)
        public
        checkRoleAuthority(_roleId)
    {
        //solhint-disable-line
        memberRoleData[_roleId].authorized = _newAuthorized;
    }

    /// @dev Gets the member addresses assigned by a specific role
    /// @param _memberRoleId Member role id
    /// @return roleId Role id
    /// @return allMemberAddress Member addresses of specified role id
    function members(uint256 _memberRoleId)
        public
        view
        returns (uint256, address[] memory memberArray)
    {
        return (_memberRoleId, memberRoleData[_memberRoleId].memberAddress);
    }

    /// @dev Gets all members' length
    /// @param _memberRoleId Member role id
    /// @return memberRoleData[_memberRoleId].memberCounter Member length
    function numberOfMembers(uint256 _memberRoleId)
        public
        view
        returns (uint256)
    {
        //solhint-disable-line
        return memberRoleData[_memberRoleId].memberCounter;
    }

    /// @dev Return member address who holds the right to add/remove any member from specific role.
    function authorized(uint256 _memberRoleId) public view returns (address) {
        //solhint-disable-line
        return memberRoleData[_memberRoleId].authorized;
    }

    /// @dev Get All role ids array that has been assigned to a member so far.
    function roles(address _memberAddress)
        public
        view
        returns (uint256[] memory)
    {
        //solhint-disable-line
        uint256 length = memberRoleData.length;
        uint256[] memory assignedRoles = new uint256[](length);
        uint256 counter = 0;
        for (uint256 i = 1; i < length; i++) {
            if (memberRoleData[i].memberIndex[_memberAddress] > 0) {
                assignedRoles[counter] = i;
                counter++;
            }
        }
        if (tokenController.totalBalanceOf(_memberAddress) > 0) {
            assignedRoles[counter] = uint256(Role.TokenHolder);
            counter++;
        }
        if (tokenController.tokensLockedAtTime(_memberAddress, "DR", (lockTimeForDR).add(now)) >= minLockAmountForDR) {
            assignedRoles[counter] = uint256(Role.DisputeResolution);
        }
        return assignedRoles;
    }

    /**
     * @dev Updates Uint Parameters of a code
     * @param code whose details we want to update
     * @param val value to set
     */
    function updateUintParameters(bytes8 code, uint val) public onlyAuthorizedToGovern {
        if(code == "MNLOCKDR") { //Minimum lock amount to consider user as DR member
            minLockAmountForDR = val;
        } else if (code == "TLOCDR") { // Lock period required for DR
            lockTimeForDR = val * (1 days);
        } 
    }

    function getUintParameters(bytes8 code) external view returns(bytes8 codeVal, uint val) {
        codeVal = code;
        if(code == "MNLOCKDR") {
            val = minLockAmountForDR;
        } else if (code == "TLOCDR") { // Lock period required for DR
            val = lockTimeForDR / (1 days);
        } 
    }


    /// @dev Returns true if the given role id is assigned to a member.
    /// @param _memberAddress Address of member
    /// @param _roleId Checks member's authenticity with the roleId.
    /// i.e. Returns true if this roleId is assigned to member
    function checkRole(address _memberAddress, uint256 _roleId)
        public
        view
        returns (bool)
    {
        //solhint-disable-line
        if (_roleId == uint256(Role.UnAssigned)) {
            return true;
        } else if (_roleId == uint256(Role.TokenHolder)) {
            if (tokenController.totalBalanceOf(_memberAddress) > 0) {
                return true;
            }
        } else if (_roleId == uint256(Role.DisputeResolution)) {
            if (tokenController.tokensLockedAtTime(_memberAddress, "DR", (lockTimeForDR).add(now)) >= minLockAmountForDR) {
                return true;
            }
        } else if (memberRoleData[_roleId].memberIndex[_memberAddress] > 0) {
            //solhint-disable-line
            return true;
        }
        return false;
    }

    /// @dev Return total number of members assigned against each role id.
    /// @return totalMembers Total members in particular role id
    function getMemberLengthForAllRoles()
        public
        view
        returns (uint256[] memory totalMembers)
    {
        //solhint-disable-line
        totalMembers = new uint256[](memberRoleData.length);
        for (uint256 i = 0; i < memberRoleData.length; i++) {
            totalMembers[i] = numberOfMembers(i);
        }
    }

    /**
     * @dev to update the member roles
     * @param _memberAddress in concern
     * @param _roleId the id of role
     * @param _active if active is true, add the member, else remove it
     */
    function _updateRole(
        address _memberAddress,
        uint256 _roleId,
        bool _active
    ) internal {
        require(
            _roleId != uint256(Role.TokenHolder) && _roleId != uint256(Role.DisputeResolution),
            "Membership to this role is detected automatically"
        );
        if (_active) {
            require(
                memberRoleData[_roleId].memberIndex[_memberAddress] == 0,
                "already active"
            );

            memberRoleData[_roleId].memberCounter = SafeMath.add(
                memberRoleData[_roleId].memberCounter,
                1
            );
            memberRoleData[_roleId]
                .memberIndex[_memberAddress] = memberRoleData[_roleId]
                .memberAddress
                .length;
            memberRoleData[_roleId].memberAddress.push(_memberAddress);
        } else {
            //Remove the selected member and swap its index with the member at last index
            require(
                memberRoleData[_roleId].memberIndex[_memberAddress] > 0,
                "not active"
            );
            uint256 _memberIndex = memberRoleData[_roleId]
                .memberIndex[_memberAddress];
            address _topElement = memberRoleData[_roleId]
                .memberAddress[memberRoleData[_roleId].memberCounter];
            memberRoleData[_roleId].memberIndex[_topElement] = _memberIndex;
            memberRoleData[_roleId].memberCounter = SafeMath.sub(
                memberRoleData[_roleId].memberCounter,
                1
            );
            memberRoleData[_roleId].memberAddress[_memberIndex] = _topElement;
            memberRoleData[_roleId].memberAddress.length--;
            delete memberRoleData[_roleId].memberIndex[_memberAddress];
        }
    }

    /// @dev Adds new member role
    /// @param _roleName New role name
    /// @param _roleDescription New description hash
    /// @param _authorized Authorized member against every role id
    function _addRole(
        bytes32 _roleName,
        string memory _roleDescription,
        address _authorized
    ) internal {
        emit MemberRole(memberRoleData.length, _roleName, _roleDescription);
        memberRoleData.push(
            MemberRoleDetails(0, new address[](1), _authorized)
        );
    }

    /**
     * @dev to add initial member roles
     */
    function _addInitialMemberRoles() internal {
        _addRole("Unassigned", "Unassigned", address(0));
        _addRole(
            "Advisory Board",
            "Selected few members that are deeply entrusted by the dApp. An ideal advisory board should be a mix of skills of domain, governance, research, technology, consulting etc to improve the performance of the dApp.", //solhint-disable-line
            address(0)
        );
        _addRole(
            "Token Holder",
            "Represents all users who hold dApp tokens. This is the most general category and anyone holding token balance is a part of this category by default.", //solhint-disable-line
            address(0)
        );
        _addRole(
            "DisputeResolution",
            "Represents members who are assigned to vote on resolving disputes", //solhint-disable-line
            address(0)
        );
    }
}
