pragma solidity 0.5.7;

contract IRootChainManager {
   function depositFor(address user,address rootToken,bytes calldata depositData) external;
}