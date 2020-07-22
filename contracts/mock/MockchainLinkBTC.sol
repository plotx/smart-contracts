pragma solidity 0.5.7;
  
import "../interface/IChainLinkOracle.sol";
import "../external/openzeppelin-solidity/ownership/Ownable.sol";
contract MockChainLinkBTC is Ownable,IChainLinkOracle{

    modifier OnlyOwner() {
      require(msg.sender == owner);
      _;
    }

	 int256 latestAns = 934999802346 ;

	 function latestAnswer() external view returns (int256)
	 {
	 	return latestAns;

	 }

	 function setLatestAnswer(int256 _latestAnswer) public OnlyOwner
	 {
	 	//latestAnswer = _latestAnswer;
	 }

}