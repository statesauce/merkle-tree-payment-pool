import { MerkleTree } from 'merkletreejs';
import { soliditySha3, toHex, toBN  } from 'web3-utils';
import { bufferToHex, zeros } from 'ethereumjs-util';
const keccak256 = require('keccak256')
import _ from 'lodash/lodash';

/*
 * `paymentList` is an array of objects that have a property `payee` to hold the
 * payee's Ethereum address and `amount` to hold the cumulative amount of tokens
 * paid to the payee across all payment cycles:
 *
 * [{
 *   payee: "0x627306090abab3a6e1400e9345bc60c78a8bef57",
 *   amount: 20
 * },{
 *   payee: "0xf17f52151ebef6c7334fad080c5704d77216b732",
 *   amount: 12
 * },{
 *   payee: "0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef",
 *   amount: 15 {
 * }]
 *
 */

/*
"balance of proof for payee that has mulitple entries in the payment list returns the sum of all their amounts in the payment pool"
this is the current problem test.

> soliditySha3('0x95A59988186b582325004aC7C8d5724fD21414c3',packBN(toBN(4)))
'0x96cf572e373c66b3e833262059ae989434960c64cfe47af650c9b89abbbd0f6f'
> soliditySha3('0x95A59988186b582325004aC7C8d5724fD21414c3',4)
'0x96cf572e373c66b3e833262059ae989434960c64cfe47af650c9b89abbbd0f6f'

solution is roughly around here. need to update old cumulative payment tree lookup data method
which is not yet implemented



*/


function packBN(bigNum) {
  let zeros = "0x0000000000000000000000000000000000000000000000000000000000000000"
  let hexNum = toHex(bigNum).slice(2)
  return zeros.slice(0, 66 - hexNum.length) + hexNum
}

export default class CumulativePaymentTree extends MerkleTree {
  constructor(paymentList) {
    // const leaves = paymentList.map(v => {
    //   return soliditySha3(v.payee,v.amount)
    //   }
    // )
    const leaves = paymentList.map(v => {
      return v.payee + v.amount
      }
    )
    super(leaves, keccak256, { sort: true, hashLeaves: true })
    
    // const root = tree.getHexRoot()
    // const leaf = soliditySha3(payments[2].payee, payments[2].amount)
    // const proof = tree.getHexProof(leaf)


    // let filteredPaymentList = paymentList.filter(payment => payment.payee && payment.amount);
    // let groupedPayees = _.groupBy(filteredPaymentList, payment => payment.payee);
    // let reducedPaymentList = Object.keys(groupedPayees).map(payee => {
    //   let payments = groupedPayees[payee];
    //   let amount = _.reduce(payments, (sum, payment) => sum + payment.amount, 0);
    //   return { payee, amount };
    // });
    // let paymentNodes = reducedPaymentList.map(payment => payment.payee + ',' + payment.amount);

    // super(paymentNodes);

    // this.paymentNodes = paymentNodes;
    // this.paymentList = reducedPaymentList;
  }

  // amountForPayee(payee) {
  //   let payment = _.find(this.paymentList, { payee });
  //   if (!payment) { return 0; }

  //   return payment.amount;
  // }

  getLeafForPayee(payment) {
    return soliditySha3(payment.payee, payment.amount)
  }
  getLeafForPayeeNoHash(payment) {
    return soliditySha3(payment.payee, payment.amount)
  }

  hexProofForPayee(payment) {
    let proof = this.getHexProof(this.getLeafForPayee(payment))
    if (!proof) { return bufferToHex(zeros(32)); }

    return proof
  }
}
