pragma solidity 0.5.7;

contract ITokenController {
	address public token;
    address public bLOTToken;

    function swapBLOT(uint256 amount) public;

    function tokensLockedAtTime(address _of, bytes32 _reason, uint256 _time)
        public
        view
        returns (uint256 amount);

    function burnCommissionTokens(uint256 amount) external;
}