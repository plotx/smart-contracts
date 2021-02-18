pragma solidity 0.5.7;
import "../PlotXToken.sol";

contract MockPLOT is PlotXToken {

	constructor(string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address _operator,
        address childChainManager) public PlotXToken(name_,symbol_,decimals_,_operator,childChainManager) {
    }

    function mint(address user, uint amount) public returns(bool) {
    	_mint(user,amount);
    }

	function burnTokens(address _of, uint _amount) external {
        _burn(_of, _amount);
	}

	function burn(uint _amount) external {
        _burn(msg.sender, _amount);
	}
}