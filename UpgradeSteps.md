<strong> AllMarkets contract Upgarde steps </strong>
- Deploy AllMarkets.sol
- Deploy MarketCreationRewards.sol
- Deploy GovernanceNew.sol
- Deploy TokenControllerNew.sol
- Deploy MarketUtilityNew.sol
- Proposal of `category 9` to add new contract: Solution Parameters => [AllMarkets Address, "AM"]
- Proposal of `category 9` to add new contract: Solution Parameters => [MarketCreationRewards address, "MC"]
- Proposal of `category 7` to Upgrade multiple contract implementations: Solution Parameters => ["GV","TC"], [GovernanceNew, TokenControllerNew]
- Proposal of `category 6` to Upgrade market utility contract implementation: Solution Parameters => [MarketUtility contract address, MarketUtilityNew(implementation address)]
- Set authorized address in MarketUtility to AllMarkets: `setAuthorizedAddress()`, pass AllMarkets address as argument
- Initialise the MarketCreationRewards contract=> `MarketCreationRewards.initialise()` pass marketUtility address and chainlink gas price aggregator address as arguments
- Proposal to edit category `ResolveDispute` and set the action hash to `resolveDispute(uint256,uint256)` and contract code to `AM`, which enables execution of resolve dispute function in new contract
- Initialise the AllMarkets contract ans start initial markets =>`AllMarkets.addInitialMarketTypesAndStart()`, pass MarketCreationRewards contract address, ETH identifier address(0xeee...eee), marketUtility address, date at which initial markets start, eth/usd chainlink aggregator address, btc/usd chainlink aggregator address as arguments.
Edit categories 10, 15, 16, 17, 18, 25 and updated function hashes as per the new contract and set contract code to `AM`