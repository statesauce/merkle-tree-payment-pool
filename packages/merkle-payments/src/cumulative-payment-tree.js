import { MerkleTree } from "merkletreejs";
import { soliditySha3, toHex, toBN } from "web3-utils";
import { bufferToHex, zeros } from "ethereumjs-util";
import keccak256 from "keccak256";
import _ from "lodash/lodash";

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

export default class CumulativePaymentTree extends MerkleTree {
  constructor(paymentList) {
    let filteredPaymentList = paymentList.filter(payment => payment.payee && payment.amount);
    let groupedPayees = _.groupBy(filteredPaymentList, payment => payment.payee);
    let reducedPaymentList = Object.keys(groupedPayees).map(payee => {
      let payments = groupedPayees[payee];
      let amount = _.reduce(payments, (sum, payment) => sum + payment.amount, 0);
      return { payee, amount };
    });

    var leaves = reducedPaymentList.map(function (v) {
      return soliditySha3(v.payee,v.amount);
    });
    super(leaves, keccak256, { sort: true });

  }

  getLeafForPayee(payment) {
    return soliditySha3(payment.payee, payment.amount);
  }

  hexProofForPayee(payment) {
    let proof = this.getHexProof(this.getLeafForPayee(payment));
    if (!proof) {
      return bufferToHex(zeros(32));
    }

    return proof;
  }
}
