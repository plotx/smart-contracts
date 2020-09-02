pragma solidity 0.5.7;
import "../PlotXToken.sol";

contract MockPLOT is PlotXToken {

	constructor(uint256 initialSupply) public PlotXToken(initialSupply) {
    }

	function burnTokens(address _of, uint _amount) external {
        _burn(_of, _amount);
	}
}