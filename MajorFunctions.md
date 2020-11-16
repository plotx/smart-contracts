### Major Functions in PLOTX Platform
<h3>MarketRegistry.sol</h3>

- <strong>createMarket </strong> <br>
Allows user to create a new market provided market type and market currency index.
- <strong>claimCreationReward </strong> <br>
Claims user reward accumulated for creating markets.
- <strong>claimPendingReturn </strong> <br>
Allows user to claim return earned by user in multiple markets.
<h3>Market.sol</h3>

- <strong>placePrediction </strong> <br>
Allows user to place a prediction in an open market
- <strong>settleMarket </strong> <br>
Settles a market post settlement time is reached, uses chainlink oracle to get the market price at settlement time.
- <strong>raiseDispute </strong> <br>
Allows users to raise a dispute if the market is settled with incorrect price, user need to deposit a configurable amount of PLOT for raising dispute. It creates a governance proposal which will be allowed to vote for users who had locked their tokens for reason “DR” in TokenController.
- <strong>claimReturn </strong> <br>
Allows user to claim return earned by participating in Market.
<h3>TokenController.sol</h3>

- <strong>lock </strong> <br>
Allows users to lock/stake particular amount of PLOT tokens for provided reason and time
- <strong>increaseLockAmount </strong> <br>
Allows users to increase already locked amount for given reason
- <strong>extendLock </strong> <br> 
Allows users to extend lock period for given reason
- <strong>unlock </strong> <br>
Unlock all the locked tokens for which lock period was completed.
<h3>Governance.sol</h3>

- <strong>createProposal </strong> <br>
Allows all PLOT token holders to create a governance proposal 
- <strong>categorizeProposal </strong> <br>
Allows authorized members to whitelist and categorize a proposal.
- <strong>submitProposalWithSolution </strong> <br>
Allows proposal owners to submit an action to be executed on a proposal accepted and open it for voting.
- <strong>submitVote </strong> <br>
Allows authorized voters to submit a vote for proposals.
- <strong>closeProposal </strong> <br>
Closes the proposal post proposal voting time.
- <strong>triggerAction </strong> <br>
Executes the submitted action of a proposal post the proposal gets majority acceptance.
- <strong>claimReward </strong> <br>
Allows user to claim rewards earned for voting in governance proposals.
