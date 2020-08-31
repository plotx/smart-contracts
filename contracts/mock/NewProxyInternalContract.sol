pragma solidity 0.5.7;

import "../Master.sol";
import "../Iupgradable.sol";
import "./MockTokenController.sol";

contract NewProxyInternalContract is Iupgradable {
	MockTokenController tc;
	Master ms;

    function setMasterAddress() public {
    	ms = Master(msg.sender);
    }

    function callDummyOnlyInternalFunction(uint _val) public {
    	tc = MockTokenController(ms.getLatestAddress('TC'));
    	tc.dummyOnlyInternalFunction(_val);
    }

    function changeDependentContractAddress() public {
        require(ms.isInternal(msg.sender));
    }
}