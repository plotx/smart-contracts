pragma solidity >=0.4.21 <0.7.0;

contract Migrations {
  address public owner;
  uint public last_completed_migration;

  constructor() public {
    owner = msg.sender;
  }

    /**
    * @dev Checks if msg.sender is not owner.
    */
  modifier restricted() {
    if (msg.sender == owner) _;
  }

    /**
    * @dev Set the last completed migration.
    * @param completed The last completed migration.
    */
  function setCompleted(uint completed) public restricted {
    last_completed_migration = completed;
  }
}
