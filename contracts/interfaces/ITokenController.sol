pragma solidity 0.5.7;

contract ITokenController {
	address public token;
    address public bLOTToken;

    /**
    * @dev Swap BLOT token.
    * account.
    * @param amount The amount that will be swapped.
    */
    function swapBLOT(address _of, address _to, uint256 amount) public;

    function totalBalanceOf(address _of)
        public
        view
        returns (uint256 amount);

    function transferFrom(address _token, address _of, address _to, uint256 amount) public;

    /**
     * @dev Returns tokens locked for a specified address for a
     *      specified reason at a specific time
     * @param _of The address whose tokens are locked
     * @param _reason The reason to query the lock tokens for
     * @param _time The timestamp to query the lock tokens for
     */
    function tokensLockedAtTime(address _of, bytes32 _reason, uint256 _time)
        public
        view
        returns (uint256 amount);

    /**
    * @dev burns an amount of the tokens of the message sender
    * account.
    * @param amount The amount that will be burnt.
    */
    function burnCommissionTokens(uint256 amount) external returns(bool);
 
    function initiateVesting(address _vesting) external;

    function lockForGovernanceVote(address _of, uint _days) public;

    function totalSupply() public view returns (uint256);

    function mint(address _member, uint _amount) public;

}