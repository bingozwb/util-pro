const property = require('./properties.js')

const Web3 = require('web3')
const web3 = new Web3(property.url)

// const provider = new HDWalletProvider('mnemonic', property.url);
// const web3 = new Web3(provider);

async function deploy(_contractAbi, _contractBytecode, _pk, _value) {
  const contract = new web3.eth.Contract(_contractAbi)
  const deploy = contract.deploy({data: _contractBytecode, arguments: _args})
  const data = deploy.encodeABI()
  const gasLimit = await deploy.estimateGas()
  const from = await web3.eth.accounts.privateKeyToAccount(_pk).address
  let nonce = await web3.eth.getTransactionCount(from)
  const gasPrice = await web3.eth.getGasPrice()
  return await sendSignedTx(0, data, nonce, _value, gasPrice, gasLimit, from, _pk)
}

async function sendSignedTx(_to, _data, _nonce, _value, _gasPrice, _gasLimit, _from, _pk) {
  console.debug('nonce', _nonce)
  console.debug('gasPrice', _gasPrice)
  console.debug('gasLimit', _gasLimit)
  const rawTx = {
    nonce: _nonce,
    gasPrice: _gasPrice,
    gasLimit: _gasLimit,
    from: _from,
    to: _to,
    value: _value,
    data: _data
  }
  const signedData = await web3.eth.accounts.signTransaction(rawTx, _pk)

  return await web3.eth.sendSignedTransaction(signedData.rawTransaction)
    .on('transactionHash', txHash => console.log('txHash', txHash))
    .catch(error => console.error('sendSignedTx error:', error))
}

async function sendSignedTxHelper(_to, _data, _value, _pk, _nonce) {
  const from = await web3.eth.accounts.privateKeyToAccount(_pk).address
  let nonce = await web3.eth.getTransactionCount(from)
  nonce = _nonce > nonce ? _nonce : nonce
  const gasPrice = await web3.eth.getGasPrice()
  const gasLimit = _data ? (await estimateGas(from, _to, _data, _value)) * 2 : 21000
  return await sendSignedTx(_to, _data, nonce, _value, gasPrice, gasLimit, from, _pk)
}

async function sendSignedTxSimple(_to, _data) {
  const nonce = await web3.eth.getTransactionCount(property.from)
  return await sendSignedTx(_to, _data, nonce, 0, property.gasPrice, property.gasLimit, property.from, property.pk)
}

async function estimateGas(_from, _to, _data, _value) {
  if (!_value) {
    _value = 0
  }
  return await web3.eth.estimateGas({from: _from, to: _to, value: _value, data: _data}, function (error, result) {
    if (error) {
      console.log(error)
    } else {
      console.info('estimateGas:', result)
    }
  })
}

/**
 * cover specific nonce tx by transfer 0 to itself with higher gasPrice
 * @param _nonce
 * @param _gasPrice
 * @param _from
 * @param _pk
 * @returns {Promise<void>}
 */
async function coverTx(_nonce, _gasPrice, _from, _pk) {
  await sendSignedTx(_from, '', _nonce, 0, _gasPrice, 21000, _from, _pk)
}

/**
 * mine a block on private net
 * @returns {Promise<void>}
 */
async function evmMine() {
  await web3.currentProvider.send({jsonrpc: "2.0", method: "evm_mine", params: [], id: 0}, function (err, result) {
    console.log(err ? err : result)
  })
}

function getString(hexString) {
  return web3.utils.hexToString(hexString)
}

function getBytes(string) {
  return web3.utils.asciiToHex(string)
}

function getMsgHash(msg) {
  return web3.utils.sha3('\x19Ethereum Signed Message:\n' + msg.length + msg)
}

module.exports = {
  web3: web3,
  property: property,
  deploy: deploy,
  sendSignedTx: sendSignedTx,
  sendSignedTxHelper: sendSignedTxHelper,
  sendSignedTxSimple:sendSignedTxSimple,
  estimateGas: estimateGas,
  coverTx: coverTx,
  evmMine: evmMine,
  getString: getString,
  getBytes: getBytes,
  getMsgHash:getMsgHash
}
