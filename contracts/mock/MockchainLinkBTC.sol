pragma solidity 0.5.7;
  
import "../interfaces/IChainLinkOracle.sol";
import "../external/openzeppelin-solidity/ownership/Ownable.sol";
contract MockChainLinkBTC is Ownable,IChainLinkOracle{

	 int256 latestAns = 934999802346 ;

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
	 function setLatestAnswer(int256 _latestAnswer) public onlyOwner
	 {
	 	latestAns = _latestAnswer;
	 }

}