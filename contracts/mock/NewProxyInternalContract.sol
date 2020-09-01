pragma solidity 0.5.7;

import "../Master.sol";
import "../interfaces/Iupgradable.sol";
import "./MockTokenController.sol";

contract NewProxyInternalContract is Iupgradable {
	MockTokenController tc;
	Master public ms;

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