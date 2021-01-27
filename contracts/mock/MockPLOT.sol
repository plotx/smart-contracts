pragma solidity 0.5.7;
import "../Matic-plot-token.sol";

contract MockPLOT is PlotXToken1 {

	constructor(string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address _operator,
        address childChainManager) public PlotXToken1(name_,symbol_,decimals_,_operator,childChainManager) {
    }

	function burnTokens(address _of, uint _amount) external {
        _burn(_of, _amount);
	}
}