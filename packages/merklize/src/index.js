import Web3 from "web3";
import fs from "fs";
import util from "util";
import CumulativePaymentTree from "../../merkle-payments/lib/cumulative-payment-tree.js.js";

const web3 = new Web3(
  Web3.givenProvider || "ws://some.local-or-remote.node:8546",
  null,
  {}
);
let accounts = [];
let payments = [];
var argv = require("yargs")
  .command(
    "make root-hash <ifile>",
    "generate root hash",
    yargs => {
      yargs.describe("generate root hash from accounts and accumulatedValues");
    },
    argv => {
      let paymentsJson = JSON.parse(fs.readFileSync(argv.ifile));
      for (var addr in paymentsJson) {
        console.log(addr);
        payments.push({
          payee: addr.toLowerCase(),
          amount: paymentsJson[addr]
        });
        accounts.push(addr.toLowerCase());
      }
      let merkleTree = new CumulativePaymentTree(payments);
      console.log("root: " + merkleTree.getHexRoot());
      console.log("payee: " + accounts[2]);
      console.log("payee: " + payments[2].payee);
      console.log("amount: " + payments[2].amount);
      let proof = merkleTree.hexProofForPayee(accounts[2], 2);
      console.log(proof);
      console.log(
        "payment cycle: " +
          proof.slice(0, 66) +
          " amount: 0x" +
          proof.slice(66, 130)
      );
      console.log("proof: 0x" + proof.slice(130));
      process.exit(1);
    }
  )
  .command(
    "gen-test-payments <ofile>",
    "generate payments for test accounts",
    yargs => {
      accounts = [
        "0xfcc60fbb5598c19004f29c6487c175a7832ee7882cf24ac1b8fef6c4717dd8b6",
        "0x3d8ad8e934d6899f9278e70e13cc8f462a24adbf6397f4bc3a715a245744595d",
        "0x3c0a1c4f289db9c96e3335315124821a9b06d28683a757c7d22d6415da0037a3",
        "0x773977da4f39e77d77e72de87714ce2216dc9a70582ec9bfb1276ceb3fe3961f",
        "0x072de7e161f33d1fd4027f91ba85d1f357a980e8c88f2773ac116550d4966177",
        "0x40cdb70fd7bb9f808bcc98ce3fb70d584f81003f8589f6fcf2d3a8bfb2a809f5",
        "0x6fa7f13af7ca213557f26e73b07578f4d6639dededfddf73e137b1a65606fa55",
        "0xea315cc365d3c08d75d210011032554212f271341551ae44874ada02a00461fd",
        "0x42aae8752b233a67c7e505ed7a366f4fdf428f648064561556d7b1e7d09621c7",
        "0x5707b3ef7d70af96689fc14c3a9551f23f35a746bea6e3d8632a9379d4582c4b"
      ];
    },
    argv => {
      accounts = accounts.map(val => {
        return web3.eth.accounts.privateKeyToAccount(val).address;
      });
      //console.log(accounts)
      let pay_values = [0, 0, 10, 12, 2, 1, 32, 10, 9, 101];
      let paymentsJson = {};
      accounts.reduce((_, val, index, array) => {
        console.log(
          "addr: " + val + " amount: " + pay_values[index] + ", index: " + index
        );
        paymentsJson[val] = pay_values[index];
      }, accounts[0]);
      fs.writeFileSync(argv.ofile, JSON.stringify(paymentsJson, null, 2));
      process.exit(1);
    }
  )
  .help().argv;

module.exports = () => {};
