pragma solidity 0.5.7;

contract MockChainLinkBTC is Ownable,IChainLinkOracle{

	int256 latestAnswer = 934999802346 ;

	 function latestAnswer() external view returns (int256)
	 {
	 	return latestAnswer;

	 }

	 function setLatestAnswer(int256 _latestAnswer) onlyOwner
	 {
	 	latestAnswer = _latestAnswer;
	 }

}