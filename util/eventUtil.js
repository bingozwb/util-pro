const web3 = require('web3')

module.exports = {
  getEventLogs: async function (_fromBlock, _toBlock, _address, _topics) {
    return await web3.eth.getPastLogs({fromBlock: _fromBlock, toBlock: _toBlock, address: _address, topics: _topics})
  },

  getEvents: function (_abi) {
    let events = {}
    for (const o of _abi) {
      if (o.type === 'event') {
        events[o.name] = o
      }
    }
    return events
  },

  decodeLog: function (eventAbi, log) {
    const topics = eventAbi.anonymous ? log.topics : log.topics.slice(1)
    return web3.eth.abi.decodeLog(eventAbi.inputs, log.data, topics)
  }
}
