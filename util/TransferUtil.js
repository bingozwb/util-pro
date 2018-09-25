const {web3, property, sendSignedTx, sendSignedTxHelper, deploy} = require('./contractUtil.js')

const contractJson = require('../active-contract/MyToken.json')
const contractAbi = contractJson.abi
let poorAccounts = []
let gasPrice
const gasLimit = 60000

async function getGasPrice() {
    gasPrice = gasPrice ? gasPrice : await web3.eth.getGasPrice()
    return gasPrice
}

async function batchTransferETH(accounts, to) {
    for (const account of accounts) {
        const from = account.address
        // get account's balance
        const balance = await web3.eth.getBalance(from)
        const gasPrice = await getGasPrice()
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
            const nonce = await web3.eth.getTransactionCount(from)
            const gasPrice = await getGasPrice()
            // make sure this account has enough txFee
            const ethBalance = await web3.eth.getBalance(from)
            const txFee = gasLimit * gasPrice
            if (ethBalance < txFee) {
                poorAccounts.push(account)
            } else {
                await sendSignedTx(tokenAddress, data, nonce, 0, gasPrice, gasLimit, from, account.pk)
            }
        }
    }
}

async function chargeTxFee(accounts, fromPk) {
    for (const account of accounts) {
        const from = account.address
        const gasPrice = await getGasPrice()
        const ethBalance = await web3.eth.getBalance(from)
        const txFee = gasLimit * gasPrice
        if (ethBalance < txFee) {
            await sendSignedTxHelper(account.address, null, txFee - ethBalance, fromPk)
        }
    }
}

async function test() {
    let accounts = [
        {address: '', pk: ''},
        {address: '', pk: ''},
        {address: '', pk: ''}
    ]
    const to = '0x243d416DEF4fA6eF0842837d5F72D51d7AF36791'

    // await batchTransferETH(accounts, to)

    // const contractAddr = await deploy(contractJson.abi, contractJson.bytecode)
    // console.log(contractAddr)
    // MyToken on private net
    // const contractAddr = '0xa9Ef63f574AC4A492ec799c5997bA54c512A9aE0'
    // MyToken on ropsten
    const contractAddr = '0xA26557395283B563cDc2f523678EDDc736858492'
    const contract = new web3.eth.Contract(contractAbi, contractAddr)

    await batchTransferToken(accounts, to, contractAddr)
    if (poorAccounts.length > 0) {
        await chargeTxFee(poorAccounts, property.pk)
        do {
            accounts = poorAccounts
            poorAccounts = []
            await batchTransferToken(accounts, to, contractAddr)
        } while (poorAccounts.length > 0)
    }

    // transfer some token to those accounts for test
    for (const acc of accounts) {
        // const data = contract.methods.transfer(acc.address, web3.utils.toWei('1', 'ether')).encodeABI()
        // await sendSignedTxHelper(contractAddr, data, 0, property.pk)
        await contract.methods.balanceOf(acc.address).call().then(data => {console.log('balance', data)})
        await web3.eth.getBalance(acc.address).then(data => {console.log('eth', data)})
    }
    await contract.methods.balanceOf(to).call().then(data => {console.log('balance of to', data)})

}

test()