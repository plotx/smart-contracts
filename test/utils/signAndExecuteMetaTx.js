var ethutil= require('ethereumjs-util');
var abi = require('ethereumjs-abi');

async function signAndExecuteMetaTx(...args) {

	let pKey = args[0];
	let types = args[1];
	let values = args[2];
	let user = args[3];
	let functionSignature = args[4];
	let contractInstance = args[5];

	let msgTosign = abi.soliditySHA3(
	        types,
	        values
	    );
	    
    	msgTosign = ethutil.hashPersonalMessage(msgTosign);

    	let privateKey = Buffer.from(pKey, 'hex');
		
	    let signature = ethutil.ecsign(msgTosign, privateKey);
	    let sign1 = [];
	      sign1[0]= signature.v ;
		  sign1[1]= '0x' + ethutil.toUnsigned(ethutil.fromSigned(signature.r)).toString('hex');
		  sign1[2]= '0x' + ethutil.toUnsigned(ethutil.fromSigned(signature.s)).toString('hex');

		  await contractInstance.executeMetaTransaction(user, functionSignature, sign1[1], sign1[2], sign1[0]);
}

module.exports = { signAndExecuteMetaTx };