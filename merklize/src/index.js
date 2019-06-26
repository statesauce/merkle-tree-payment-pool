
import Web3 from 'web3'
import fs from 'fs'
import util from 'util'
import CumulativePaymentTree from '../../lib/cumulative-payment-tree.js'
const web3 = new Web3(Web3.givenProvider || 'ws://some.local-or-remote.node:8546', null, {})
let accounts = []
let accountsL = []
let payments = []
let paymentsL = []
var argv = require('yargs')
  .command(
      'make root-hash <ifile>',
      'generate root hash',
      (yargs) => {
          yargs.describe('generate root hash from accounts and accumulatedValues')
      },
      (argv) => {
          let paymentsJson = JSON.parse(fs.readFileSync(argv.ifile))
          for (var addr in paymentsJson) {
              payments.push({ payee: addr, amount: paymentsJson[addr] })
              accounts.push(addr)
          }
          let merkleTree = new CumulativePaymentTree(payments)
          console.log("root: " + merkleTree.getHexRoot())
          console.log("payee: " + accounts[2])
          console.log("proof: " + merkleTree.hexProofForPayee(accounts[2], 1))
          for (var addr in paymentsJson) {
              paymentsL.push({ payee: addr.toLowerCase(), amount: paymentsJson[addr] })
              accountsL.push(addr.toLowerCase())
          }
          let merkleTreeL = new CumulativePaymentTree(paymentsL)
          console.log("root: " + merkleTreeL.getHexRoot())
          console.log("payee: " + accountsL[2])
          console.log("payee: " + paymentsL[2].payee)
          console.log("amount: " + paymentsL[2].amount)
          console.log("proof: " + merkleTreeL.hexProofForPayee(accountsL[2], 1))

          process.exit(1)
      }
  ).command(
      "gen-test-payments <ofile>",
      'generate payments for test accounts',
      (yargs) => {
          accounts = [
              '0xa3a0080036b8dbc21f63da1189ef5355989255a2a40787a58c33ae63ed20e069',
              '0x2b08f442dbed805005ada6feed49fdae6b3bcf9a5a0f1ee8349bdea9789ee772',
              '0x2897dec6026dc93e64e787ef2d820d273d4d9141f066fc75bb209c52db0d8c39',
              '0xbca7c4a5c1458e0dbbf7b64d3bcab00403c36caca1098defbdc2acc0d3278eca',
              '0x494641c3d2ab250df050936c6304c783f8303137878fc3103f73c3f417789795',
              '0xb3db90f160d9abe170e53d199d426489d7f3fa925c3521e11101777981b1f99f',
              '0xeb086d581d30628bec7424f910df4388d67623e77cae465fd7b3f07ea3018e46',
              '0xcdfa5086cc6ef4f9f259ec3065b0ac2a41093f359168c8b2a544dc56f23bb0e2',
              '0xb3f37cdb4b990f6a0c1e88e12dc3b3ba9a6cf79cc49f1807b1678f0bf0a0eaef',
              '0x52c97e409618367e81f559255fb01a10d68fc4edbf22c51f459a61fddef8dfc5']
      },
      (argv) => {
          accounts = accounts.map((val) => {
               return web3.eth.accounts.privateKeyToAccount(val).address
          })
          console.log(accounts)
          let pay_values = [0, 0, 10, 12, 2, 1, 32, 10, 9, 101]
          let paymentsJson = {}
          accounts.reduce((_, val, index, array) => {
              console.log("addr: " + val + "amount: " + pay_values[index] + ", index: "+  index)
              paymentsJson[val] = pay_values[index]
          }, accounts[0])
          fs.writeFileSync(argv.ofile, JSON.stringify(paymentsJson, null, 2))
          process.exit(1)
      })
    .help()
    .argv

module.exports = () => {
}
