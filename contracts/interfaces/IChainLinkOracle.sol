pragma solidity 0.5.7;

interface IChainLinkOracle
{
	/**
    * @dev Gets the latest answer of chainLink oracle.
    * @return int256 representing the latest answer of chainLink oracle.
    */
	function latestAnswer() external view returns (int256);
	 
}