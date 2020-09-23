pragma solidity 0.5.7;
  
import "../interfaces/IChainLinkOracle.sol";
contract MockChainLinkAggregator is IChainLinkOracle{

	 int256 latestAns = 934999802346;
	 uint256 updatedAt = now;

	/**
    * @dev Gets the latest answer of chainLink oracle.
    * @return int256 representing the latest answer of chainLink oracle.
    */
	 function latestAnswer() external view returns (int256)
	 {
	 	return latestAns;

	 }

	/**
    * @dev Set the latest answer of chainLink oracle.
    * @param _latestAnswer The latest anser of chainLink oracle.
    */
	 function setLatestAnswer(int256 _latestAnswer) public
	 {
	 	latestAns = _latestAnswer;
	 }

	 function getRoundData(uint80 _roundId)
    external
    view
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    ) {
    	return (uint80(1),latestAns, updatedAt, updatedAt, uint80(1));
    }

  	function latestRoundData()
    external
    view
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    ) {
    	return (uint80(1),latestAns, updatedAt, updatedAt, uint80(1));
    }

}