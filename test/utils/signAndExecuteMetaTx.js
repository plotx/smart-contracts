var ethutil= require('ethereumjs-util');
var abi = require('ethereumjs-abi');
const BN = require('bn.js');

async function signAndExecuteMetaTx(...args) {

	let types = ['uint256', 'address', 'uint256', 'bytes'];
	let pKey = args[0];
	let contractInstance = args[3];
	let functionSignature = args[2];
	let user = args[1];
	let values = [new BN(await contractInstance.getNonce(user)), contractInstance.address, new BN(await contractInstance.getChainID()), ethutil.toBuffer(functionSignature)];

	let msgTosign = abi.soliditySHA3(
	        types,
	        values
	    );
	    
    	msgTosign = ethutil.hashPersonalMessage(msgTosign);

    	let privateKey = Buffer.from(pKey, 'hex');
		
	    let signature = ethutil.ecsign(msgTosign, privateKey);
	    let sign1 = [];
	      sign1[0]= signature.v ;
		  sign1[1]= '0x' + (signature.r).toString('hex');
		  sign1[2]= '0x' + (signature.s).toString('hex');
		  if(args[4])
		  {
		  	await contractInstance.executeMetaTransaction(user, functionSignature, sign1[1], sign1[2], sign1[0],{from:args[4]});	
		  }
		else
		  await contractInstance.executeMetaTransaction(user, functionSignature, sign1[1], sign1[2], sign1[0]);
}

module.exports = { signAndExecuteMetaTx };