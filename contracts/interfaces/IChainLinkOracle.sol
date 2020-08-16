pragma solidity 0.5.7;

interface IChainLinkOracle
{
	function latestAnswer() external view returns (int256);
	 
}