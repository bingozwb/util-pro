const {web3, property, sendSignedTx, sendSignedTxHelper} = require('./contractUtil.js')

const contractJson = require('../active-contract/MyToken.json')
const contractAbi = contractJson.abi

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
    // get contract instance by token contract abi and address
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
                // transfer txFee to this account from 'property.pk'
                await sendSignedTxHelper(from, null, txFee - ethBalance, property.pk)
            }

            await sendSignedTx(tokenAddress, data, nonce, 0, gasPrice, gasLimit, from, account.pk)
        }
    }
}
