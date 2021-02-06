var ethutil= require('ethereumjs-util');
var abi = require('ethereumjs-abi');
const BN = require('bn.js');
var eip = require('eip-712');


async function signAndExecuteMetaTx(...args) {

	let types = ['uint256', 'address', 'uint256', 'bytes'];
	let pKey = args[0];
	let contractInstance = args[3];
	let functionSignature = args[2];
	let user = args[1];
	let contractName = args[4];
	var originalMessage1 = {
		  "types": {
		    "EIP712Domain": [
		      { "name": "name", "type": "string" },
		      { "name": "version", "type": "string" },
		      { "name": "verifyingContract", "type": "address" },
		      { "name": 'salt', "type": 'bytes32' }
		    ],
		    "MetaTransaction": [
		            { "name": "nonce", "type": "uint256" },
		            { "name": "from", "type": "address" },
		            { "name": "functionSignature", "type": "bytes" },
		          ]
		  },
		  "primaryType": "MetaTransaction",
		  "domain": {
		    "name": contractName,
		    "version": await contractInstance.ERC712_VERSION(),
		    "salt": "0x0000000000000000000000000000000000000000000000000000000000000089",//await contractInstance.getChainId(),
		    "verifyingContract": contractInstance.address
		  },
		  "message": {
		        "nonce" : await contractInstance.getNonce(user),
		        "from": user,
		        "functionSignature" : functionSignature
		      }
		}

    	let privateKey = Buffer.from(pKey, 'hex');
		
	    let signature = ethutil.ecsign(eip.getMessage(originalMessage1,true), privateKey);
	    let sign1 = [];
	      sign1[0]= signature.v ;
		  sign1[1]= '0x' + (signature.r).toString('hex');
		  sign1[2]= '0x' + (signature.s).toString('hex');
		  if(args[5])
		  {
		  	await contractInstance.executeMetaTransaction(user, functionSignature, sign1[1], sign1[2], sign1[0],{from:args[4]});	
		  }
		else
		  await contractInstance.executeMetaTransaction(user, functionSignature, sign1[1], sign1[2], sign1[0]);
}

module.exports = { signAndExecuteMetaTx };