pragma solidity >=0.4.0 <0.7.0;

import "./external/BasicMetaTransaction.sol";

contract MyToken is BasicMetaTransaction {
    
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 totalSupply_;
        
    event Approval(address indexed tokenOwner, address indexed spender, uint tokens);
    event Transfer(address indexed from, address indexed to, uint tokens);
    
    mapping(address => uint256) balances;

    mapping(address => mapping (address => uint256)) allowed;
    

    using SafeMath for uint256;
    
    constructor (string memory _name, string memory _symbol, uint256 _totalSupply, address _owner) public {
        name = _name;
        symbol = _symbol;
        totalSupply_ = _totalSupply;
        balances[_owner] = _totalSupply;
    }

    function totalSupply() public view returns (uint256) {
	    return totalSupply_;
    }
    
    function balanceOf(address tokenOwner) public view returns (uint) {
        return balances[tokenOwner];
    }
    
    function transfer(address receiver, uint numTokens) public returns (bool) {
        address requested_address = _msgSender();
        require(numTokens <= balances[requested_address]);
        balances[requested_address] = balances[requested_address].sub(numTokens);
        balances[receiver] = balances[receiver].add(numTokens);
        emit Transfer(requested_address, receiver, numTokens);
        return true;
    }
    
    function approve(address delegate, uint numTokens) public returns (bool) {
        address requested_address = _msgSender();
        allowed[requested_address][delegate] = numTokens;
        emit Approval(requested_address, delegate, numTokens);
        return true;
    }
    
    function allowance(address owner, address delegate) public view returns (uint) {
        return allowed[owner][delegate];
    }
    
    function transferFrom(address owner, address buyer, uint numTokens) public returns (bool) {
        address requested_address = _msgSender();
        require(numTokens <= balances[owner]);    
        require(numTokens <= allowed[owner][requested_address]);
    
        balances[owner] = balances[owner].sub(numTokens);
        allowed[owner][requested_address] = allowed[owner][requested_address].sub(numTokens);
        balances[buyer] = balances[buyer].add(numTokens);
        emit Transfer(owner, buyer, numTokens);
        return true;
    }
}

// library SafeMath { 
//     function sub(uint256 a, uint256 b) internal pure returns (uint256) {
//       assert(b <= a);
//       return a - b;
//     }
    
//     function add(uint256 a, uint256 b) internal pure returns (uint256) {
//       uint256 c = a + b;
//       assert(c >= a);
//       return c;
//     }
// }
