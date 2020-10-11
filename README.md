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
