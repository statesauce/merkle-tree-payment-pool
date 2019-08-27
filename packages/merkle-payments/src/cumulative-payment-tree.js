import { MerkleTree, MerkleFromLeaves } from "@statesauce/merkletreejs";
import { soliditySha3, toHex, toBN } from "web3-utils";
import { bufferToHex, zeros } from "ethereumjs-util";
import BN from "bn.js";
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
 *
 *
 *
 *
 */

function isInt(str) {
  return parseInt(str) != NaN;
}

function myIndexOf(src, val, start = 0) {
  for (let i = start; i < src.length; i++) {
    if (src.slice(i, i + val.length) == val) {
      return i;
    }
  }
  return -1;
}

function stringCrazy(str) {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    result =
      result + (i % 2 == 0 ? str[i].toLowerCase() : str[i].toUpperCase());
  }
  return result;
}

function stringCrazyBad(str) {
  for (let i; i < str.length; i++) {
    str[i] = i % 2 == 0 ? str[i].toLowerCase() : str[i].toUpperCase();
  }
  return st;
}

function createLeafCreator(pps) {
  return function({ payee, balance }) {
    //const amount = balance.mul(pps).roundFloor();
    const amount = Math.floor(pps * balance);
    return {
      data: Buffer.from(soliditySha3(payee, amount)),
      meta: { payee, balance, amount }
    };
  };
}

function createLeafCreator2(pps) {
  return function({ payee, balance }) {
    //const amount = balance.mul(pps).roundFloor();
    const amount = Math.floor(pps * balance);
    return Buffer.from(soliditySha3(payee, amount));
  };
}

function randomPaymentList(number) {
  const random = x => Math.floor(Math.random() * x);
  const payments = [];
  for (let i = 0; i < number; i++) {
    let payee = "";
    for (let i = 0; i < 3; i++) {
      const part = random(0xfffffffffffff).toString(16);
      if (part.length < 13) {
        part = "0".repeat(13 - part.length) + part;
      }
      payee = payee + part;
    }
    payee = payee + random(0xf).toString(16);
    const amount = random(0xffff);
    payments.push({
      payee: "0x" + payee,
      balance: amount
    });
  }
  return payments;
}

const payments = [
  { payee: "0xa287582f24e018c76cb5cf38b0a8b18680057ecb", balance: 35612 },
  { payee: "0xf02eab91273cc3697839f101402d887f4e1a8078", balance: 5892 },
  { payee: "0x1e9754a56f6a50a5a0dfb1770e8a96d92a01dd64", balance: 17401 },
  { payee: "0x0000dbd459473ee5919a53cafe7bdbf5178439ca", balance: 9596 },
  { payee: "0x0ce498e5366820e3c90732168b12076661cd6d61", balance: 45732 },
  { payee: "0xf982ae24f9f47d616609ec2b5588027955a385bb", balance: 38338 },
  { payee: "0xae757673c63a7e799549bc51a42b08afa3995cc0", balance: 28924 },
  { payee: "0xa7fa017cd509c7bdece7ca45cdc43ae021743fc2", balance: 21885 },
  { payee: "0x73343c87100135fcbb47beb8c925501c14604881", balance: 45219 },
  { payee: "0x27eab0ec95c1814d51b30bcfff2cd444809382e4", balance: 47866 },
  { payee: "0x98c35c89f83edfa133037238cf919cd3a3c85b41", balance: 60170 },
  { payee: "0xc338d1dbea3106ca4d927cd405c1b480451dc01a", balance: 37428 },
  { payee: "0x84f6eb72ebcfe60ae84d36aba02e5722e307c168", balance: 35581 },
  { payee: "0xa228b53e55115cf6b9589651f2ef45bd81364b65", balance: 8761 },
  { payee: "0xd56927dd4a6047f8fa5246ef506358ee9361a8f5", balance: 8703 },
  { payee: "0x7503f565eaf76182b204fbede9521f969d0bfa17", balance: 26632 },
  { payee: "0x536641d6812d803dd88c185780da2189872b0370", balance: 26337 },
  { payee: "0xc56b45b9bad755e46200934e0b69fabd660f663a", balance: 25643 },
  { payee: "0x3dec4ede4eff75a2bf9064dfa5d602248fc0ed3b", balance: 55467 },
  { payee: "0xa59952dd0336d1e15cb5610f50eb2942dcb1eeb7", balance: 23335 }
];

const payments2 = [
  { payee: "0xa287582f24e018c76cb5cf38b0a8b18680057ecb", balance: 35612 },
  { payee: "0xf02eab91273cc3697839f101402d887f4e1a8078", balance: 5892 },
  { payee: "0x1e9754a56f6a50a5a0dfb1770e8a96d92a01dd64", balance: 17401 },
  { payee: "0x0000dbd459473ee5919a53cafe7bdbf5178439ca", balance: 9596 },
  { payee: "0x0ce498e5366820e3c90732168b12076661cd6d61", balance: 45732 },
  { payee: "0xf982ae24f9f47d616609ec2b5588027955a385bb", balance: 38338 },
  { payee: "0xae757673c63a7e799549bc51a42b08afa3995cc0", balance: 28924 }
  // { payee: "0xa7fa017cd509c7bdece7ca45cdc43ae021743fc2", balance: 21885 },
  // { payee: "0x73343c87100135fcbb47beb8c925501c14604881", balance: 45219 },
  // { payee: "0x27eab0ec95c1814d51b30bcfff2cd444809382e4", balance: 47866 },
  // { payee: "0x98c35c89f83edfa133037238cf919cd3a3c85b41", balance: 60170 },
  // { payee: "0xc338d1dbea3106ca4d927cd405c1b480451dc01a", balance: 37428 },
  // { payee: "0x84f6eb72ebcfe60ae84d36aba02e5722e307c168", balance: 35581 },
  // { payee: "0xa228b53e55115cf6b9589651f2ef45bd81364b65", balance: 8761 },
  // { payee: "0xd56927dd4a6047f8fa5246ef506358ee9361a8f5", balance: 8703 },
  // { payee: "0x7503f565eaf76182b204fbede9521f969d0bfa17", balance: 26632 },
  // { payee: "0x536641d6812d803dd88c185780da2189872b0370", balance: 26337 },
  // { payee: "0xc56b45b9bad755e46200934e0b69fabd660f663a", balance: 25643 },
  // { payee: "0x3dec4ede4eff75a2bf9064dfa5d602248fc0ed3b", balance: 55467 }
];

class CumulativePaymentTree extends MerkleTree {
  constructor({ create, recreate }) {
    if (create) {
      let paymentList = create;
      let filteredPaymentList = paymentList.filter(
        payment => payment.payee && payment.balance
      );
      let groupedPayees = _.groupBy(
        filteredPaymentList,
        payment => payment.payee
      );
      let reducedPaymentList = Object.keys(groupedPayees).map(payee => {
        let payments = groupedPayees[payee];
        let balance = _.reduce(
          payments,
          (sum, payment) => sum + payment.balance,
          0
        );
        return { payee, balance };
      });

      // let leaves = reducedPaymentList.map(function(v) {
      //   return soliditySha3(v.payee, v.balance * 2);
      // });
      super({
        create: {
          leaves: reducedPaymentList,
          hashAlgorithm: keccak256,
          options: {
            sort: true,
            createLeaves: createLeafCreator(2)
          }
        }
      });
    } else if (recreate) {
      super({
        recreate: {
          leaves: recreate.leaves,
          layers: recreate.layers,
          options: { createLeaves: true }
        }
      });
    }
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

function getLeavesFromObject(layers, createLeaves) {
  const arr = [layers];
  const leaves = [];
  let i = 0;
  while (arr.length) {
    const a = arr.shift();
    const nodeKey = Object.keys(a)[0];
    if (createLeaves && Object.keys(a[nodeKey])[0] === "meta") {
      leaves.push(a);
    } else if (a[nodeKey] == null) {
      leaves.push(a);
    } else {
      Object.keys(a[nodeKey]).forEach(key => {
        const b = {};
        b[key] = a[nodeKey][key];
        arr.push(b);
      });
    }
  }
  return leaves;
}

function getLayersFromObject(layersObject, createLeaves) {
  const arr = [[layersObject]];
  const layers = [[]];
  let i = 0;
  const j = 0;
  while (arr.length) {
    if (arr[0].length) {
      const a = arr[i].shift();
      const nodeKey = Object.keys(a)[0];
      if (createLeaves && Object.keys(a[nodeKey])[0] === "meta") {
        layers[0].push(a);
      } else if (a[nodeKey] == null) {
        layers[0].push(a);
      } else {
        Object.keys(a[nodeKey]).forEach(key => {
          const b = {};
          b[key] = a[nodeKey][key];
          arr[i].push(b);
        });
      }
    } else {
    }
  }
  return leaves;
}

const fmtArray = (x, l, r) => {
  return { [x]: [l, r] };
};

const fmtObj = (x, l, r) => {
  const lkey = Object.keys(l)[0];
  const rkey = Object.keys(r)[0];
  return { [x]: { [lkey]: l[lkey], [rkey]: r[rkey] } };
};

function generateObjectFromMerkleTree(leaves, nodeFmt) {
  const mt = new MerkleFromLeaves(leaves, keccak256, {
    sortPairs: true,
    duplicateOdd: false
  });
  let curlayer = [];
  let nextlayer = [];
  let depth = 0;
  for (let x of mt) {
    const node = x.value;
    const index = x.index;
    if (depth != x.depth) {
      depth = x.depth;
      curlayer = nextlayer;
      nextlayer = [];
    }
    if (node) {
      if (depth == 1) {
        if (node.leaf) {
          continue;
        }
        const data = node.value.toString("hex");
        const l = {};
        const r = {};
        l[node.left.leaf.data] = node.left.leaf.meta;
        r[node.right.leaf.data] = node.right.leaf.meta;
        const obj = nodeFmt(data, r.toString("hex"), l.toString("hex"));
        nextlayer.push(obj);
      } else if (depth > 1) {
        if (node.leaf) {
          continue;
        }
        const data = node.value.toString("hex");
        const l = curlayer.shift();
        const r = curlayer.shift();
        if (node.right.value) {
          const obj = nodeFmt(data, l, r);
          nextlayer.push(obj);
        } else {
          const r = {};
          r[node.right.leaf.data] = node.right.leaf.meta;
          const obj = nodeFmt(data, l, r);
          nextlayer.push(obj);
        }
      }
    }
  }
  return nextlayer[0];
}

function generateFromObject(obj, getChildren) {
  let node = obj;
  let key = Object.keys(obj)[0];
  const layers = [0];
}

export default CumulativePaymentTree;
