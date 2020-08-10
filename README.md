
<h1><a id="PLOTUS"></a>PLOTUS SMART CONTRACTS</h1>
<p>Smart contracts for PLOTUS - Curated pprediction markets for crypto traders . https://plotus.io/.</p>


## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. 


### Requirements
```
Node >= 10.x
```


### Installing
Firstly, you need to clone this repo. You can do so by downloading the repo as a zip and unpacking or using the following git command

```
git clone https://github.com/somish/plotus-smart-contracts.git
```

Now, It's time to install the dependencies. Enter the plotus-smart-contracts directory and use

```
npm install
```
Make sure you delete folder `bitcore-lib` from node_modules inside modules `eth-lightwallet` and `bitcore-mnemonic`

We need to compile the contracts before deploying.
```
npm run compile
```
Now, You should start a private network on port 8545 using Ganache or something similar. To run the private network - </br>
On Windows, Execute file startGanache.bat present in plotus-smart-contracts/scripts directory </br>
On Linux or Mac OS Systems, run the startGanache.sh file while in plotus-smart-contracts/scripts directory
```
./startGanache.sh
```
  
Then, you can deploy Plotus contracts using the migrate script. 
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