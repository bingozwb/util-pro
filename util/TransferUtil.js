const {web3, property, sendSignedTx, sendSignedTxHelper} = require('./contractUtil.js')

const contractJson = require('../active-contract/MyToken.json')
const contractAbi = contractJson.abi
const contractAddr = ''
const contract = new web3.eth.Contract(contractAbi, contractAddr)

async function deploy() {
    const contract = new web3.eth.Contract(contractAbi)
    const token = await contract.deploy({data: contractJson.bytecode}).send({from: property.from, gasLimit: property.gasLimit}).then(console.log)
    console.log('token', token)
}

async function batchTransferETH(accounts, to) {
    for (const account of accounts) {
        const from = account.address
        // get account's balance
        const balance = await web3.eth.getBalance(from)
        const gasPrice = await web3.eth.getGasPrice()
        const gasLimit = 21000
        const nonce = await web3.eth.getTransactionCount(from)
        const txFee = gasLimit * gasPrice
        console.log('txFee', txFee)
        if (balance > txFee) {
            // transfer
            await sendSignedTx(to, '', nonce, balance - txFee, gasPrice, gasLimit, from, account.pk)
        }
    }
}

async function batchTransferToken(accounts, to, tokenAddress) {
    const contract = new web3.eth.Contract(contractAbi, tokenAddress)

    for (const account of accounts) {
        const from = account.address
        const balance = await contract.methods.balanceOf(from).call()
        if (balance > 0) {
            const data = contract.methods.transfer(to, balance).encodeABI()
            const gasPrice = await web3.eth.getGasPrice()
            const nonce = await web3.eth.getTransactionCount(from)
            const gasLimit = 60000
            // make sure this account has enough txFee
            const ethBalance = await web3.eth.getBalance(from)
            const txFee = gasLimit * gasPrice
            if (ethBalance < txFee) {
                await sendSignedTxHelper(from, null, txFee - ethBalance, property.pk)
            }

            await sendSignedTx(tokenAddress, data, nonce, 0, gasPrice, gasLimit, from, account.pk)
        }
    }
}

async function test() {
    const accounts = [
        {address: '', pk: '0x'},
        {address: '', pk: '0x'},
        {address: '', pk: '0x'}
    ]
    const to = ''

    // await batchTransferETH(accounts, to)

    // await deploy()

    await batchTransferToken(accounts, to, contractAddr)

    for (acc of accounts) {
        const data = contract.methods.transfer(acc.address, web3.utils.toWei('1', 'ether')).encodeABI()
        await sendSignedTxHelper(contractAddr, data, 0, property.pk)
        await contract.methods.balanceOf(acc.address).call().then(console.log)
    }
    await contract.methods.balanceOf(to).call().then(console.log)
}

// test()
