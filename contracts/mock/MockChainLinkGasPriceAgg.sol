pragma solidity 0.5.7;
  
import "../interfaces/IChainLinkOracle.sol";
contract MockChainLinkGasPriceAgg is IChainLinkOracle{

	 int256 latestAns = 45000000000;
	 uint256 updatedAt = now;

   struct RoundData {
      uint80 roundId;
      int256 answer;
      uint256 startedAt;
      uint256 updatedAt;
      uint80 answeredInRound;
   }

   mapping(uint80 => RoundData) public roundData;
   uint80 public currentRound;

   constructor() public {
      currentRound = 0;
      roundData[0] = RoundData(uint80(0),latestAns, updatedAt, updatedAt, uint80(0));
   }

  function decimals() external view returns (uint8) {
    return uint8(8);
  }
	/**
    * @dev Gets the latest answer of chainLink oracle.
    * @return int256 representing the latest answer of chainLink oracle.
    */
	 function latestAnswer() external view returns (int256)
	 {
	 	return roundData[currentRound].answer;

	 }

	/**
    * @dev Set the latest answer of chainLink oracle.
    * @param _latestAnswer The latest anser of chainLink oracle.
    */
	 function setLatestAnswer(int256 _latestAnswer) public
	 {
    currentRound = currentRound + uint80(1);
    roundData[currentRound] = RoundData(currentRound,_latestAnswer, now, now, currentRound);
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
    	return (roundData[_roundId].roundId, roundData[_roundId].answer, roundData[_roundId].startedAt,
              roundData[_roundId].updatedAt,roundData[_roundId].answeredInRound);
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
    	return (roundData[currentRound].roundId, roundData[currentRound].answer, roundData[currentRound].startedAt,
              roundData[currentRound].updatedAt,roundData[currentRound].answeredInRound);
    }

}