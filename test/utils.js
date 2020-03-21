function getParamFromTxEvent(transaction, paramName, contractFactory, eventName) {
    assert.isObject(transaction)
    let logs = transaction.logs
    if(eventName != null) {
        logs = logs.filter((l) => l.event === eventName)
    }
    assert.equal(logs.length, 1, 'too many logs found!')
    let param = logs[0].args[paramName]
    if(contractFactory != null) {
        let contract = contractFactory.at(param)
        assert.isObject(contract, `getting ${paramName} failed for ${param}`)
        return contract
    } else {
        return param
    }
}

function mineBlock(web3, reject, resolve) {
    web3.currentProvider.send({
        method: "evm_mine",
        jsonrpc: "2.0",
        id: new Date().getTime()
      }, (e) => (e ? reject(e) : resolve()))
}

function increaseTimestamp(web3, increase) {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            method: "evm_increaseTime",
            params: [increase],
            jsonrpc: "2.0",
            id: new Date().getTime()
          }, (e) => (e ? reject(e) : mineBlock(web3, reject, resolve)))
    })    
}

function balanceOf(web3, account) {
    return new Promise((resolve, reject) => web3.eth.getBalance(account, (e, balance) => (e ? reject(e) : resolve(balance))))
}

async function callByWallet(multisigInstance, encodedData,accounts)
{
    var txid = getParamFromTxEvent(
            await multisigInstance.submitTransaction(multisigInstance.address, 0, encodedData, {from: accounts[0]}),
            'transactionId', null, 'Submission')
    return txid;
}

async function callByWallet1(multisigInstance, encodedData,accounts)
{
    var txid = getParamFromTxEvent(
            await multisigInstance.submitTransaction(multisigInstance.address, 0, encodedData, {from: accounts[3]}),
            'transactionId', null, 'Submission')
    return txid;
}

async function assertThrowsAsynchronously(test, error) {
    try {
        await test();
    } catch(e) {
        if (!error || e instanceof error)
            return "everything is fine";
    }
    throw new Error("Missing rejection" + (error ? " with "+error.name : ""));
}

Object.assign(exports, {
    getParamFromTxEvent,
    increaseTimestamp,
    balanceOf,
    assertThrowsAsynchronously,
    callByWallet,
    callByWallet1
})