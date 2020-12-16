pragma solidity  0.5.7;

import "../TokenController.sol";

contract MockTokenController is TokenController {

	uint public bit;

    /**
     * @dev to change the operator address
     * @param _newOperator is the new address of operator
     */
    function changeOperator(address _newOperator) public {
        token.changeOperator(_newOperator);
    }

    function dummyOnlyInternalFunction(uint _val) public {
        require(IMaster(masterAddress).isInternal(msg.sender));
    	bit = _val;
    }

}
