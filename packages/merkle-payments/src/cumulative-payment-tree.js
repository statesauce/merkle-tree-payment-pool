import { MerkleTree } from "merkletreejs";
import { soliditySha3 } from "web3-utils";
import { bufferToHex, zeros } from "ethereumjs-util";
import keccak256 from "keccak256";
import _ from "lodash/lodash";

export default class CumulativePaymentTree extends MerkleTree {
  constructor(paymentList) {
    let filteredPaymentList = paymentList.filter(
      payment => payment.payee && payment.amount
    );
    let groupedPayees = _.groupBy(
      filteredPaymentList,
      payment => payment.payee
    );
    let reducedPaymentList = Object.keys(groupedPayees).map(payee => {
      let payments = groupedPayees[payee];
      let amount = _.reduce(
        payments,
        (sum, payment) => sum + payment.amount,
        0
      );
      return { payee, amount };
    });

    var leaves = reducedPaymentList.map(function(v) {
      return soliditySha3(v.payee, v.amount);
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
