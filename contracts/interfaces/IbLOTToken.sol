pragma solidity 0.5.7;

contract IbLOTToken {
    function initiatebLOT(address _defaultMinter) external;
    function changeOperator(address _newOperator) public returns (bool);
    function convertToPLOT(address _of, address _to, uint256 amount) public;
}