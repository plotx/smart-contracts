[![Build Status](https://travis-ci.org/plotx/smart-contracts.svg?branch=master)](https://travis-ci.org/plotx/smart-contracts)

[![Coverage Status](https://coveralls.io/repos/github/plotx/smart-contracts/badge.svg?branch=master)](https://coveralls.io/github/plotx/smart-contracts)

<h1><a id="PLOTX"></a>PlotX SMART CONTRACTS</h1>
<p>Smart contracts for PlotX - Curated prediction markets for crypto traders . https://plotx.io/.</p>


## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. 


### Requirements
```
Node >= 10.x
```


### Installing
Firstly, you need to clone this repo. You can do so by downloading the repo as a zip and unpacking or using the following git command

```
git clone https://github.com/plotx/smart-contracts.git
```

Now, It's time to install the dependencies. Enter the smart-contracts directory and use

```
npm install
```
Make sure you delete folder `bitcore-lib` from node_modules inside modules `eth-lightwallet` and `bitcore-mnemonic`

We need to compile the contracts before deploying.
```
npm run compile
```
Now, You should start a private network on port 8545 using Ganache or something similar. To run the private network - </br>
On Windows, Execute file startGanache.bat present in smart-contracts/scripts directory </br>
On Linux or Mac OS Systems, run the startGanache.sh file while in smart-contracts/scripts directory
```
./startGanache.sh
```
  
Then, you can deploy Plotx contracts using the migrate script. 
```
npm run deploy
```
If you want, you can run the test cases using
```
npm run test
```
And run generate the coverage report using
```
npm run coverage
```

### Contract Addresses
- PLOT Token: 0x72F020f8f3E8fd9382705723Cd26380f8D0c66Bb
- Master: 0x03c41c5Aff6D541EF7D4c51c8B2E32a5d4427275
- MarketRegistry: 0xE210330d6768030e816d223836335079C7A0c851
- MarketUtility: 0x2330058D49fA61D5C5405fA8B17fcD823c59F7Bb
- Governance: 0x16763F192d529B420F33B699dC72F39f16620717
- ProposalCategory: 0x2D90743ef134b35cE415855F1c38ca47d65b314C
- MemberRoles: 0xda06bcd22a68Fa40B63867277aA0eB34702fd80D
- TokenController: 0x12d7053Efc680Ba6671F8Cb96d1421D906ce3dE2
- bPLOT Token: 0x82cB6Cd09Bf80fB4014935871fF553b027255D36
- Vesting: 0x5172C83B5316b86861802d29746d8435f4cB67e6

Market Implementation Addresses
- ETH/USD: 0x25cf9d73b711bff4d3445a0f7f2e63ade5133e67
- BTC/USD: 0x5d24cf40ead0601893c212ff3af4895dc42a760b

