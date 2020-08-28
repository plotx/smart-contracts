pragma solidity 0.5.7;

import "../Master.sol";
import "../Iupgradable.sol";
import "./MockTokenController.sol";

contract NewProxyInternalContract is Iupgradable {
	MockTokenController tc;
    function callDummyOnlyInternalFunction(uint _val) public {
    	tc = MockTokenController(ms.getLatestAddress('TC'));
    	tc.dummyOnlyInternalFunction(_val);
    }

    function changeDependentContractAddress() public onlyInternal {
        
    }
}