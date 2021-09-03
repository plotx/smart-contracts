pragma solidity 0.5.7;

contract IERC20 {
	function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

contract ERC20PredicateMock{


	function pullFunds(address _user,address _token,uint _amount) public {
		IERC20(_token).transferFrom(_user,address(this),_amount);
	}
}

contract RootChainManagerMock{

	ERC20PredicateMock _predicate;

	constructor(address _add) public {
		_predicate = ERC20PredicateMock(_add);
	}
	function depositFor(address user,address rootToken,bytes calldata depositData) external{

		_predicate.pullFunds(msg.sender,rootToken,abi.decode(depositData,(uint)));
	}

	function depositEtherFor(address user) external payable {
		
	}

} 