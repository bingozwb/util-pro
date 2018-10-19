const {web3, sendSignedTx, sendSignedTxHelper, deploy} = require('./contractUtil.js')

const contractJson = require('../active-contract/MyToken.json')
const contractAbi = contractJson.abi
let poorAccounts = []
let gasPrice

/**
 * get gasPrice in a moment. make the same gasPrice used in different tx
 * @returns {gasPrice}
 */
async function getGasPrice() {
  return gasPrice ? gasPrice : await web3.eth.getGasPrice()
}

/**
 * batch transfer ether balance to _to from _accounts array
 * @param _accounts from account array
 * @param _to to account
 */
async function batchTransferETH(_accounts, _to) {
  for (const account of _accounts) {
    const from = account.address
    const gasPrice = await getGasPrice()
    const nonce = await web3.eth.getTransactionCount(from)
    // get account's balance
    const balance = await web3.eth.getBalance(from)
    const txFee = 21000 * gasPrice
    if (balance > txFee) {
      // transfer
      await sendSignedTx(_to, '', nonce, balance - txFee, gasPrice, 21000, from, account.pk)
    }
  }
}

/**
 * batch transfer token balance to _to from _accounts array
 * if from account hasn't enough txFee, then put it in poorAccounts
 * @param _accounts from account array
 * @param _to to account
 * @param _tokenAddress token contract's address
 */
async function batchTransferToken(_accounts, _to, _tokenAddress) {
  // get contract instance by token contract abi and address
  const contract = new web3.eth.Contract(contractAbi, _tokenAddress)
  // token transfer gasLimit
  const gasLimit = 60000

  for (const account of _accounts) {
    const from = account.address
    const balance = await contract.methods.balanceOf(from).call()
    if (balance > 0) {
      const data = contract.methods.transfer(_to, balance).encodeABI()
      const nonce = await web3.eth.getTransactionCount(from)
      const gasPrice = await getGasPrice()
      // make sure this account has enough txFee
      const ethBalance = await web3.eth.getBalance(from)
      const txFee = gasLimit * gasPrice
      if (ethBalance >= txFee) {
        await sendSignedTx(_tokenAddress, data, nonce, 0, gasPrice, gasLimit, from, account.pk)
      } else {
        poorAccounts.push(account)
      }
    }
  }
}

/**
 * batch transfer txFee to _accounts
 * @param _accounts account array to be recharged
 * @param _fromPk from account's pk
 */
async function chargeTxFee(_accounts, _fromPk) {
  // token transfer gasLimit
  const gasLimit = 60000
  for (const account of _accounts) {
    const from = account.address
    const gasPrice = await getGasPrice()
    const ethBalance = await web3.eth.getBalance(from)
    const txFee = gasLimit * gasPrice
    if (ethBalance < txFee) {
      await sendSignedTxHelper(account.address, null, txFee - ethBalance, _fromPk)
    }
  }
}

async function test() {
  const fromPk = ''

  let accounts = [
    {address: '', pk: ''},
    {address: '', pk: ''},
    {address: '', pk: ''}
  ]
  const to = '0x243d416DEF4fA6eF0842837d5F72D51d7AF36791'

  /* batchTransferETH test */
  // await batchTransferETH(accounts, to)

  // const contractAddr = await deploy(contractJson.abi, contractJson.bytecode)
  // console.log(contractAddr)
  // MyToken on private net
  // const contractAddr = '0xa9Ef63f574AC4A492ec799c5997bA54c512A9aE0'
  // MyToken on ropsten
  const contractAddr = '0xA26557395283B563cDc2f523678EDDc736858492'
  const contract = new web3.eth.Contract(contractAbi, contractAddr)

  /* batchTransferToken test */
  // await batchTransferToken(accounts, to, contractAddr)
  // if (poorAccounts.length > 0) {
  //   await chargeTxFee(poorAccounts, fromPk)
  //   do {
  //     accounts = poorAccounts
  //     poorAccounts = []
  //     await batchTransferToken(accounts, to, contractAddr)
  //   } while (poorAccounts.length > 0)
  // }

  /* transfer some token to those accounts for test */
  for (const acc of accounts) {
    // const data = contract.methods.transfer(acc.address, web3.utils.toWei('1', 'ether')).encodeABI()
    // await sendSignedTxHelper(contractAddr, data, 0, fromPk)
    await contract.methods.balanceOf(acc.address).call().then(data => {
      console.log('balance', data)
    })
    await web3.eth.getBalance(acc.address).then(data => {
      console.log('eth', data)
    })
  }
  await contract.methods.balanceOf(to).call().then(data => {
    console.log('balance of to', data)
  })

}

test()
