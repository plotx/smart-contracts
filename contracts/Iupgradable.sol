pragma solidity 0.5.7;

import "./Master.sol";


contract Iupgradable {

    Master public ms;

    modifier onlyInternal {
        require(ms.isInternal(msg.sender));
        _;
    }

    modifier onlyOwner {
        require(ms.isOwner());
        _;
    }

    modifier isMember {
        // require(ms.isMember(msg.sender), "Not member");
        _;
    }

    /**
     * @dev Iupgradable Interface to update dependent contract address
     */
    function  changeDependentContractAddress() public;

    /**
     * @dev change master address
     * @param _masterAddress is the new address
     */
    function changeMasterAddress(address _masterAddress) public {
        if (address(ms) != address(0)) {
            require(address(ms) == msg.sender, "Not master");
        }
        ms = Master(_masterAddress);
    }

}
