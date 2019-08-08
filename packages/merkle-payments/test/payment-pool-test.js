import Web3 from "web3";
import CumulativePaymentTree from "../lib/cumulative-payment-tree.js";
import { assertRevert } from "./utils";

const PaymentPool = artifacts.require("PaymentPool");
const Token = artifacts.require("Token");
const MerkleProofLib = artifacts.require("MerkleProof");

const web3 = new Web3(Web3.givenProvider || "http://localhost:8545");
// this provides abi.encodePacked(keccak256(...)) functionality
const soliditySha3 = web3.eth.utils.soliditySha3;
contract("PaymentPool", function(accounts) {
  describe("payment pool", function() {
    let paymentPool;
    let token;
    let payments = [
      {
        payee: accounts[2],
        amount: 10
      },
      {
        payee: accounts[3],
        amount: 12
      },
      {
        payee: accounts[4],
        amount: 2
      },
      {
        payee: accounts[5],
        amount: 1
      },
      {
        payee: accounts[6],
        amount: 32
      },
      {
        payee: accounts[7],
        amount: 10
      },
      {
        payee: accounts[8],
        amount: 9
      },
      {
        payee: accounts[9],
        amount: 101 // this amount is used to test logic when the payment pool doesn't have sufficient funds
      }
    ];
    let initialBlockNumber;
    beforeEach(async function() {
      let merkleProofLib = await MerkleProofLib.new();
      token = await Token.new();
      PaymentPool.link("MerkleProof", merkleProofLib.address);
      paymentPool = await PaymentPool.new(token.address);
      initialBlockNumber = await web3.eth.getBlockNumber();
    });

    afterEach(async function() {
      // one of the tests is bleeding state...
      payments[0].amount = 10;
    });

    describe("submitPayeeMerkleRoot", function() {
      it("starts a new payment cycle after the payee merkle root is submitted", async function() {
        let merkleTree = new CumulativePaymentTree({ create: payments });
        let root = merkleTree.getHexRoot();
        let paymentCycleNumber = await paymentPool.numPaymentCycles();
        assert.equal(
          paymentCycleNumber.toNumber(),
          1,
          "the payment cycle number is correct"
        );

        let txn = await paymentPool.submitPayeeMerkleRoot(root);
        let currentBlockNumber = await web3.eth.getBlockNumber();
        paymentCycleNumber = await paymentPool.numPaymentCycles();

        assert.equal(
          paymentCycleNumber.toNumber(),
          2,
          "the payment cycle number is correct"
        );
        assert.equal(
          txn.logs.length,
          1,
          "the correct number of events were fired"
        );
        let event = txn.logs[0];
        assert.equal(
          event.event,
          "PaymentCycleEnded",
          "the event type is correct"
        );
        assert.equal(
          event.args.paymentCycle,
          1,
          "the payment cycle number is correct"
        );
        assert.equal(
          event.args.startBlock,
          initialBlockNumber,
          "the payment cycle start block is correct"
        );
        assert.equal(
          event.args.endBlock,
          currentBlockNumber,
          "the payment cycle end block is correct"
        );
      });

      it("allows a new merkle root to be submitted in a block after the previous payment cycle has ended", async function() {
        let merkleTree = new CumulativePaymentTree({ create: payments });
        let root = merkleTree.getHexRoot();
        await paymentPool.submitPayeeMerkleRoot(root);

        let updatedPayments = payments.slice();
        updatedPayments[0].amount += 10;
        let updatedMerkleTree = new CumulativePaymentTree({
          create: updatedPayments
        });
        let updatedRoot = updatedMerkleTree.getHexRoot();

        // do something that causes a block to be mined
        await token.mint(accounts[0], 1);
        await paymentPool.submitPayeeMerkleRoot(updatedRoot);
        let paymentCycleNumber = await paymentPool.numPaymentCycles();

        assert.equal(
          paymentCycleNumber.toNumber(),
          3,
          "the payment cycle number is correct"
        );
      });

      it("does not allow 2 merkle roots to be submitted in the same block after the previous payment cycle has ended", async function() {
        let merkleTree = new CumulativePaymentTree({ create: payments });
        let root = merkleTree.getHexRoot();
        await paymentPool.submitPayeeMerkleRoot(root);

        let updatedPayments = payments.slice();
        updatedPayments[0].amount += 10;
        let updatedMerkleTree = new CumulativePaymentTree({
          create: updatedPayments
        });
        let updatedRoot = updatedMerkleTree.getHexRoot();

        await assertRevert(
          async () => await paymentPool.submitPayeeMerkleRoot(updatedRoot)
        );

        let paymentCycleNumber = await paymentPool.numPaymentCycles();

        assert.equal(
          paymentCycleNumber.toNumber(),
          2,
          "the payment cycle number is correct"
        );
      });

      it("does not allow non-owner to submit merkle root", async function() {
        let merkleTree = new CumulativePaymentTree({ create: payments });
        let root = merkleTree.getHexRoot();
        await assertRevert(async () =>
          paymentPool.submitPayeeMerkleRoot(root, { from: accounts[2] })
        );
        let paymentCycleNumber = await paymentPool.numPaymentCycles();

        assert.equal(
          paymentCycleNumber.toNumber(),
          1,
          "the payment cycle number is correct"
        );
      });
    });

    describe("balanceForProof", function() {
      let paymentPoolBalance;
      let paymentCycle;
      let leaf;
      let proof;
      let payeeIndex = 0;
      let payee = payments[payeeIndex].payee;
      let paymentAmount = payments[payeeIndex].amount;
      let merkleTree = new CumulativePaymentTree({ create: payments });
      let root = merkleTree.getHexRoot();
      beforeEach(async function() {
        paymentPoolBalance = 100;
        await token.mint(paymentPool.address, paymentPoolBalance);
        paymentCycle = await paymentPool.numPaymentCycles();
        paymentCycle = paymentCycle.toNumber();
        proof = merkleTree.hexProofForPayee(payments[payeeIndex]);
        await paymentPool.submitPayeeMerkleRoot(root);
      });

      it("payee can get their available balance in the payment pool from their proof", async function() {
        let balance = await paymentPool.balanceForProof(
          paymentAmount,
          paymentCycle,
          proof,
          { from: payee }
        );
        assert.equal(
          balance.toNumber(),
          paymentAmount,
          "the balance is correct"
        );
      });

      it("non-payee can get the available balance in the payment pool for an address and proof", async function() {
        let balance = await paymentPool.balanceForProofWithAddress(
          payee,
          paymentAmount,
          paymentCycle,
          proof
        );
        assert.equal(
          balance.toNumber(),
          paymentAmount,
          "the balance is correct"
        );
      });

      it("an invalid proof/address pair returns a balance of 0 in the payment pool", async function() {
        let differentPayee = payments[4].payee;
        let differentUsersProof = merkleTree.hexProofForPayee(payments[4]);
        let balance = await paymentPool.balanceForProofWithAddress(
          payee,
          paymentAmount,
          paymentCycle,
          differentUsersProof
        );
        assert.equal(balance.toNumber(), 0, "the balance is correct");
      });

      it("garbage proof data returns a balance of 0 in payment pool", async function() {
        let literalGarbage = [
          "0x0123456789abcdef0123456789abdef0123456789abcdef0123456789abdef00",
          "0x6786798abcdf7553edf18274348acde47aded478dada478da4d874a784d8a4d8",
          "0x678675769abdccdeffacccef765766564ccceaaee7967858ccafffeeccaaa032"
        ];
        let balance = await paymentPool.balanceForProofWithAddress(
          payee,
          paymentAmount,
          paymentCycle,
          literalGarbage
        );
        assert.equal(balance.toNumber(), 0, "the balance is correct");
      });

      it("can handle balance for proofs from different payment cycles", async function() {
        let updatedPayments = payments.slice();
        let updatedPaymentAmount = 20;
        updatedPayments[payeeIndex].amount = updatedPaymentAmount;
        let updatedMerkleTree = new CumulativePaymentTree({
          create: updatedPayments
        });
        let updatedRoot = updatedMerkleTree.getHexRoot();
        let oldPaymentCycle = paymentCycle;
        // do something that causes a block to be mined
        await token.mint(accounts[0], 1);
        paymentCycle = await paymentPool.numPaymentCycles();
        paymentCycle = paymentCycle.toNumber();
        let updatedProof = updatedMerkleTree.hexProofForPayee(
          updatedPayments[payeeIndex]
        );
        await paymentPool.submitPayeeMerkleRoot(updatedRoot);

        let balance = await paymentPool.balanceForProof(
          updatedPaymentAmount,
          paymentCycle,
          updatedProof,
          { from: payee }
        );
        assert.equal(
          balance.toNumber(),
          updatedPaymentAmount,
          "the balance is correct for the updated proof"
        );
        balance = await paymentPool.balanceForProof(
          paymentAmount,
          oldPaymentCycle,
          proof,
          { from: payee }
        );
        assert.equal(
          balance.toNumber(),
          paymentAmount,
          "the balance is correct for the original proof"
        );
      });

      it("balance of payee that has 0 tokens in payment list returns 0 balance in payment pool", async function() {
        let aPayee = accounts[1];
        let updatedPayments = payments.slice();
        updatedPayments.push({ payee: aPayee, amount: 0 });
        let updatedMerkleTree = new CumulativePaymentTree({
          create: updatedPayments
        });
        let updatedRoot = updatedMerkleTree.getHexRoot();

        // do something that causes a block to be mined
        await token.mint(accounts[0], 1);

        paymentCycle = await paymentPool.numPaymentCycles();
        paymentCycle = paymentCycle.toNumber();
        let updatedProof = updatedMerkleTree.hexProofForPayee(
          updatedPayments[8]
        );
        await paymentPool.submitPayeeMerkleRoot(updatedRoot);

        let balance = await paymentPool.balanceForProof(
          updatedPayments[8].amount,
          paymentCycle,
          updatedProof,
          { from: aPayee }
        );
        assert.equal(
          balance.toNumber(),
          0,
          "the balance is correct for the updated proof"
        );
      });

      it("balance of proof for payee that has mulitple entries in the payment list returns the sum of all their amounts in the payment pool", async function() {
        let updatedPayments = payments.slice();
        updatedPayments.push({
          payee,
          amount: 8
        });
        let updatedMerkleTree = new CumulativePaymentTree({
          create: updatedPayments
        });
        let updatedRoot = updatedMerkleTree.getHexRoot();
        // do something that causes a block to be mined
        await token.mint(accounts[0], 1);

        paymentCycle = await paymentPool.numPaymentCycles();
        paymentCycle = paymentCycle.toNumber();
        let updatedProof = updatedMerkleTree.hexProofForPayee({
          payee: payee,
          amount: 18
        });
        await paymentPool.submitPayeeMerkleRoot(updatedRoot);
        let balance = await paymentPool.balanceForProof(
          18,
          paymentCycle,
          updatedProof,
          {
            from: payee
          }
        );
        assert.equal(
          balance.toNumber(),
          18,
          "the balance is correct for the updated proof"
        );
      });
    });

    describe("withdraw", function() {
      let paymentPoolBalance;
      let paymentCycle;
      let proof;
      let payeeIndex = 0;
      let payee = payments[payeeIndex].payee;
      let paymentAmount = payments[payeeIndex].amount;
      let merkleTree = new CumulativePaymentTree({ create: payments });
      let root = merkleTree.getHexRoot();

      beforeEach(async function() {
        paymentPoolBalance = 100;
        await token.mint(paymentPool.address, paymentPoolBalance);
        paymentCycle = await paymentPool.numPaymentCycles();
        paymentCycle = paymentCycle.toNumber();
        proof = merkleTree.hexProofForPayee(payments[payeeIndex]);
        await paymentPool.submitPayeeMerkleRoot(root);
      });
      it("payee can withdraw up to their allotted amount from pool", async function() {
        let txn = await paymentPool.withdraw(
          paymentAmount,
          paymentAmount,
          paymentCycle,
          proof,
          {
            from: payee
          }
        );

        let withdrawEvent = txn.logs.find(log => log.event === "PayeeWithdraw");
        assert.equal(withdrawEvent.args.payee, payee, "event payee is correct");
        assert.equal(
          withdrawEvent.args.amount.toNumber(),
          paymentAmount,
          "event amount is correct"
        );

        let payeeBalance = await token.balanceOf(payee);
        let poolBalance = await token.balanceOf(paymentPool.address);
        let withdrawals = await paymentPool.withdrawals(payee);
        let proofBalance = await paymentPool.balanceForProof(
          paymentAmount,
          paymentCycle,
          proof,
          {
            from: payee
          }
        );

        assert.equal(
          payeeBalance.toNumber(),
          paymentAmount,
          "the payee balance is correct"
        );
        assert.equal(
          poolBalance.toNumber(),
          paymentPoolBalance - paymentAmount,
          "the pool balance is correct"
        );
        assert.equal(
          withdrawals.toNumber(),
          paymentAmount,
          "the withdrawals amount is correct"
        );
        assert.equal(
          proofBalance.toNumber(),
          0,
          "the proof balance is correct"
        );
      });
      it("payee can make a withdrawal less than their allotted amount from the pool", async function() {
        let withdrawalAmount = 8;
        let txn = await paymentPool.withdraw(
          withdrawalAmount,
          paymentAmount,
          paymentCycle,
          proof,
          {
            from: payee
          }
        );

        let withdrawEvent = txn.logs.find(log => log.event === "PayeeWithdraw");
        assert.equal(withdrawEvent.args.payee, payee, "event payee is correct");
        assert.equal(
          withdrawEvent.args.amount.toNumber(),
          withdrawalAmount,
          "event amount is correct"
        );

        let payeeBalance = await token.balanceOf(payee);
        let poolBalance = await token.balanceOf(paymentPool.address);
        let withdrawals = await paymentPool.withdrawals(payee);
        let proofBalance = await paymentPool.balanceForProof(
          paymentAmount,
          paymentCycle,
          proof,
          {
            from: payee
          }
        );
        assert.equal(
          payeeBalance.toNumber(),
          withdrawalAmount,
          "the payee balance is correct"
        );
        assert.equal(
          poolBalance.toNumber(),
          paymentPoolBalance - withdrawalAmount,
          "the pool balance is correct"
        );
        assert.equal(
          withdrawals.toNumber(),
          withdrawalAmount,
          "the withdrawals amount is correct"
        );
        assert.equal(
          proofBalance.toNumber(),
          paymentAmount - withdrawalAmount,
          "the proof balance is correct"
        );
      });
      it("payee can make mulitple withdrawls within their allotted amount from the pool", async function() {
        let withdrawalAmount = 4 + 6;
        await paymentPool.withdraw(4, paymentAmount, paymentCycle, proof, {
          from: payee
        });
        await paymentPool.withdraw(6, paymentAmount, paymentCycle, proof, {
          from: payee
        });

        let payeeBalance = await token.balanceOf(payee);
        let poolBalance = await token.balanceOf(paymentPool.address);
        let withdrawals = await paymentPool.withdrawals(payee);
        let proofBalance = await paymentPool.balanceForProof(
          paymentAmount,
          paymentCycle,
          proof,
          {
            from: payee
          }
        );

        assert.equal(
          payeeBalance.toNumber(),
          withdrawalAmount,
          "the payee balance is correct"
        );
        assert.equal(
          poolBalance.toNumber(),
          paymentPoolBalance - withdrawalAmount,
          "the pool balance is correct"
        );
        assert.equal(
          withdrawals.toNumber(),
          withdrawalAmount,
          "the withdrawals amount is correct"
        );
        assert.equal(
          proofBalance.toNumber(),
          paymentAmount - withdrawalAmount,
          "the proof balance is correct"
        );
      });

      it("payee cannot withdraw more than their allotted amount from the pool", async function() {
        let withdrawalAmount = 11;
        await assertRevert(
          async () =>
            await paymentPool.withdraw(
              withdrawalAmount,
              paymentAmount,
              paymentCycle,
              proof,
              { from: payee }
            )
        );

        let payeeBalance = await token.balanceOf(payee);
        let poolBalance = await token.balanceOf(paymentPool.address);
        let withdrawals = await paymentPool.withdrawals(payee);
        let proofBalance = await paymentPool.balanceForProof(
          paymentAmount,
          paymentCycle,
          proof,
          {
            from: payee
          }
        );

        assert.equal(
          payeeBalance.toNumber(),
          0,
          "the payee balance is correct"
        );
        assert.equal(
          poolBalance.toNumber(),
          paymentPoolBalance,
          "the pool balance is correct"
        );
        assert.equal(
          withdrawals.toNumber(),
          0,
          "the withdrawals amount is correct"
        );
        assert.equal(
          proofBalance.toNumber(),
          paymentAmount,
          "the proof balance is correct"
        );
      });

      it("payee cannot make mulitple withdrawls that total to more than their allotted amount from the pool", async function() {
        let withdrawalAmount = 4;
        await paymentPool.withdraw(4, paymentAmount, paymentCycle, proof, {
          from: payee
        });
        await assertRevert(
          async () =>
            await paymentPool.withdraw(7, paymentAmount, paymentCycle, proof, {
              from: payee
            })
        );

        let payeeBalance = await token.balanceOf(payee);
        let poolBalance = await token.balanceOf(paymentPool.address);
        let withdrawals = await paymentPool.withdrawals(payee);
        let proofBalance = await paymentPool.balanceForProof(
          paymentAmount,
          paymentCycle,
          proof,
          {
            from: payee
          }
        );

        assert.equal(
          payeeBalance.toNumber(),
          withdrawalAmount,
          "the payee balance is correct"
        );
        assert.equal(
          poolBalance.toNumber(),
          paymentPoolBalance - withdrawalAmount,
          "the pool balance is correct"
        );
        assert.equal(
          withdrawals.toNumber(),
          withdrawalAmount,
          "the withdrawals amount is correct"
        );
        assert.equal(
          proofBalance.toNumber(),
          paymentAmount - withdrawalAmount,
          "the proof balance is correct"
        );
      });

      it("payee cannot withdraw 0 tokens from payment pool", async function() {
        let withdrawalAmount = 0;
        await assertRevert(
          async () =>
            await paymentPool.withdraw(
              withdrawalAmount,
              paymentAmount,
              paymentCycle,
              proof,
              { from: payee }
            )
        );

        let payeeBalance = await token.balanceOf(payee);
        let poolBalance = await token.balanceOf(paymentPool.address);
        let withdrawals = await paymentPool.withdrawals(payee);
        let proofBalance = await paymentPool.balanceForProof(
          paymentAmount,
          paymentCycle,
          proof,
          {
            from: payee
          }
        );

        assert.equal(
          payeeBalance.toNumber(),
          0,
          "the payee balance is correct"
        );
        assert.equal(
          poolBalance.toNumber(),
          paymentPoolBalance,
          "the pool balance is correct"
        );
        assert.equal(
          withdrawals.toNumber(),
          0,
          "the withdrawals amount is correct"
        );
        assert.equal(
          proofBalance.toNumber(),
          paymentAmount,
          "the proof balance is correct"
        );
      });

      it("non-payee cannot withdraw from pool", async function() {
        let withdrawalAmount = 10;
        await assertRevert(
          async () =>
            await paymentPool.withdraw(
              withdrawalAmount,
              paymentAmount,
              paymentCycle,
              proof,
              {
                from: accounts[0]
              }
            )
        );

        let payeeBalance = await token.balanceOf(payee);
        let poolBalance = await token.balanceOf(paymentPool.address);
        let withdrawals = await paymentPool.withdrawals(payee);
        let proofBalance = await paymentPool.balanceForProof(
          paymentAmount,
          paymentCycle,
          proof,
          {
            from: payee
          }
        );

        assert.equal(
          payeeBalance.toNumber(),
          0,
          "the payee balance is correct"
        );
        assert.equal(
          poolBalance.toNumber(),
          paymentPoolBalance,
          "the pool balance is correct"
        );
        assert.equal(
          withdrawals.toNumber(),
          0,
          "the withdrawals amount is correct"
        );
        assert.equal(
          proofBalance.toNumber(),
          paymentAmount,
          "the proof balance is correct"
        );
      });
      it("payee cannot withdraw their allotted tokens from the pool when the pool does not have enough tokens", async function() {
        let insufficientFundsPayeeIndex = 7;
        let insufficientFundsPayee =
          payments[insufficientFundsPayeeIndex].payee;
        let insufficientFundsPaymentAmount =
          payments[insufficientFundsPayeeIndex].amount;
        let insufficientFundsProof = merkleTree.hexProofForPayee({
          payee: insufficientFundsPayee,
          amount: insufficientFundsPaymentAmount
        });

        await assertRevert(
          async () =>
            await paymentPool.withdraw(
              insufficientFundsPaymentAmount,
              insufficientFundsPaymentAmount,
              paymentCycle,
              insufficientFundsProof,
              { from: insufficientFundsPayee }
            )
        );

        let payeeBalance = await token.balanceOf(insufficientFundsPayee);
        let poolBalance = await token.balanceOf(paymentPool.address);
        let withdrawals = await paymentPool.withdrawals(insufficientFundsPayee);
        let proofBalance = await paymentPool.balanceForProof(
          insufficientFundsPaymentAmount,
          paymentCycle,
          insufficientFundsProof,
          { from: insufficientFundsPayee }
        );

        assert.equal(
          payeeBalance.toNumber(),
          0,
          "the payee balance is correct"
        );
        assert.equal(
          poolBalance.toNumber(),
          paymentPoolBalance,
          "the pool balance is correct"
        );
        assert.equal(
          withdrawals.toNumber(),
          0,
          "the withdrawals amount is correct"
        );
        assert.equal(
          proofBalance.toNumber(),
          insufficientFundsPaymentAmount,
          "the proof balance is correct"
        );
      });
      /*  withdraw(uint256 amount, uint256 cumAmount, uint256 _paymentCycle,  bytes32[] memory proof)
          balanceForProofWithAddress(
                address _address,
                uint256 cumAmount,
                uint256 _paymentCycle,
                bytes32[] memory proof) 
      */
      it("payee withdraws their allotted amount from an older proof", async function() {
        // for some reason bleeds away paymentCycle from last test to here
        //paymentCycle = await paymentPool.numPaymentCycles();
        //paymentCycle = paymentCycle.toNumber();

        let updatedPayments = payments.slice();
        updatedPayments[payeeIndex].amount += 2;
        let updatedPaymentAmount = updatedPayments[payeeIndex].amount;
        let updatedMerkleTree = new CumulativePaymentTree({
          create: updatedPayments
        });
        let updatedRoot = updatedMerkleTree.getHexRoot();

        // do something that causes a block to be mined
        await token.mint(accounts[0], 1);
        let oldPaymentCycle = paymentCycle;
        paymentCycle = await paymentPool.numPaymentCycles();
        paymentCycle = paymentCycle.toNumber();
        let updatedProof = updatedMerkleTree.hexProofForPayee(
          updatedPayments[payeeIndex]
        );
        await paymentPool.submitPayeeMerkleRoot(updatedRoot);

        let withdrawalAmount = 8;
        await paymentPool.withdraw(
          withdrawalAmount,
          paymentAmount,
          oldPaymentCycle,
          proof,
          { from: payee }
        );
        let payeeBalance = await token.balanceOf(payee);
        let poolBalance = await token.balanceOf(paymentPool.address);
        let withdrawals = await paymentPool.withdrawals(payee);
        let proofBalance = await paymentPool.balanceForProof(
          paymentAmount,
          oldPaymentCycle,
          proof,
          {
            from: payee
          }
        );
        let updatedProofBalance = await paymentPool.balanceForProof(
          updatedPayments[payeeIndex].amount,
          paymentCycle,
          updatedProof,
          { from: payee }
        );
        assert.equal(
          payeeBalance.toNumber(),
          withdrawalAmount,
          "the payee balance is correct"
        );
        assert.equal(
          poolBalance.toNumber(),
          paymentPoolBalance - withdrawalAmount,
          "the pool balance is correct"
        );
        assert.equal(
          withdrawals.toNumber(),
          withdrawalAmount,
          "the withdrawals amount is correct"
        );
        assert.equal(
          proofBalance.toNumber(),
          paymentAmount - withdrawalAmount,
          "the proof balance is correct"
        );
        assert.equal(
          updatedProofBalance.toNumber(),
          updatedPaymentAmount - withdrawalAmount,
          "the updated proof balance is correct"
        );
      });

      it("payee withdraws their allotted amount from a newer proof", async function() {
        let updatedPayments = payments.slice();
        updatedPayments[payeeIndex].amount += 2;
        let updatedPaymentAmount = updatedPayments[payeeIndex].amount;
        let updatedMerkleTree = new CumulativePaymentTree({
          create: updatedPayments
        });
        let updatedRoot = updatedMerkleTree.getHexRoot();

        // do something that causes a block to be mined
        await token.mint(accounts[0], 1);
        let oldPaymentCycle = paymentCycle;
        paymentCycle = await paymentPool.numPaymentCycles();
        paymentCycle = paymentCycle.toNumber();
        let updatedProof = updatedMerkleTree.hexProofForPayee(
          updatedPayments[payeeIndex]
        );
        await paymentPool.submitPayeeMerkleRoot(updatedRoot);

        let withdrawalAmount = 8;
        await paymentPool.withdraw(
          withdrawalAmount,
          updatedPayments[payeeIndex].amount,
          paymentCycle,
          updatedProof,
          {
            from: payee
          }
        );

        let payeeBalance = await token.balanceOf(payee);
        let poolBalance = await token.balanceOf(paymentPool.address);
        let withdrawals = await paymentPool.withdrawals(payee);
        let proofBalance = await paymentPool.balanceForProof(
          paymentAmount,
          oldPaymentCycle,
          proof,
          {
            from: payee
          }
        );
        let updatedProofBalance = await paymentPool.balanceForProof(
          updatedPayments[payeeIndex].amount,
          paymentCycle,
          updatedProof,
          { from: payee }
        );

        assert.equal(
          payeeBalance.toNumber(),
          withdrawalAmount,
          "the payee balance is correct"
        );
        assert.equal(
          poolBalance.toNumber(),
          paymentPoolBalance - withdrawalAmount,
          "the pool balance is correct"
        );
        assert.equal(
          withdrawals.toNumber(),
          withdrawalAmount,
          "the withdrawals amount is correct"
        );
        assert.equal(
          proofBalance.toNumber(),
          paymentAmount - withdrawalAmount,
          "the proof balance is correct"
        );
        assert.equal(
          updatedProofBalance.toNumber(),
          updatedPaymentAmount - withdrawalAmount,
          "the updated proof balance is correct"
        );
      });

      it("payee withdraws their allotted amount from both an older and new proof", async function() {
        let updatedPayments = payments.slice();
        updatedPayments[payeeIndex].amount += 2;
        let updatedPaymentAmount = updatedPayments[payeeIndex].amount;
        let updatedMerkleTree = new CumulativePaymentTree({
          create: updatedPayments
        });
        let updatedRoot = updatedMerkleTree.getHexRoot();

        // do something that causes a block to be mined
        await token.mint(accounts[0], 1);
        let oldPaymentCycle = paymentCycle;
        paymentCycle = await paymentPool.numPaymentCycles();
        paymentCycle = paymentCycle.toNumber();
        let updatedProof = updatedMerkleTree.hexProofForPayee(
          updatedPayments[payeeIndex]
        );
        await paymentPool.submitPayeeMerkleRoot(updatedRoot);

        let withdrawalAmount = 8 + 4;
        await paymentPool.withdraw(8, paymentAmount, oldPaymentCycle, proof, {
          from: payee
        });
        await paymentPool.withdraw(
          4,
          updatedPayments[payeeIndex].amount,
          paymentCycle,
          updatedProof,
          { from: payee }
        );

        let payeeBalance = await token.balanceOf(payee);
        let poolBalance = await token.balanceOf(paymentPool.address);
        let withdrawals = await paymentPool.withdrawals(payee);
        let proofBalance = await paymentPool.balanceForProof(
          paymentAmount,
          oldPaymentCycle,
          proof,
          {
            from: payee
          }
        );
        let updatedProofBalance = await paymentPool.balanceForProof(
          updatedPayments[payeeIndex].amount,
          paymentCycle,
          updatedProof,
          { from: payee }
        );

        assert.equal(
          payeeBalance.toNumber(),
          withdrawalAmount,
          "the payee balance is correct"
        );
        assert.equal(
          poolBalance.toNumber(),
          paymentPoolBalance - withdrawalAmount,
          "the pool balance is correct"
        );
        assert.equal(
          withdrawals.toNumber(),
          withdrawalAmount,
          "the withdrawals amount is correct"
        );
        assert.equal(
          proofBalance.toNumber(),
          0,
          "the proof balance is correct"
        );
        assert.equal(
          updatedProofBalance.toNumber(),
          updatedPaymentAmount - withdrawalAmount,
          "the updated proof balance is correct"
        );
      });

      it("does not allow a payee to exceed their provided proof's allotted amount when withdrawing from an older proof and a newer proof", async function() {
        let updatedPayments = payments.slice();
        updatedPayments[payeeIndex].amount += 2;
        let updatedPaymentAmount = updatedPayments[payeeIndex].amount;
        let updatedMerkleTree = new CumulativePaymentTree({
          create: updatedPayments
        });
        let updatedRoot = updatedMerkleTree.getHexRoot();

        // do something that causes a block to be mined
        await token.mint(accounts[0], 1);
        let oldPaymentCycle = paymentCycle;
        paymentCycle = await paymentPool.numPaymentCycles();
        paymentCycle = paymentCycle.toNumber();
        let updatedProof = updatedMerkleTree.hexProofForPayee(
          updatedPayments[payeeIndex]
        );
        await paymentPool.submitPayeeMerkleRoot(updatedRoot);

        let withdrawalAmount = 8;
        await paymentPool.withdraw(
          8,
          updatedPayments[payeeIndex].amount,
          paymentCycle,
          updatedProof,
          { from: payee }
        );
        await assertRevert(async () =>
          paymentPool.withdraw(4, paymentAmount, oldPaymentCycle, proof, {
            from: payee
          })
        ); // this proof only permits 10 - 8 tokens to be withdrawn, even though the newer proof permits 12 - 8 tokens to be withdrawn
        let payeeBalance = await token.balanceOf(payee);
        let poolBalance = await token.balanceOf(paymentPool.address);
        let withdrawals = await paymentPool.withdrawals(payee);
        let proofBalance = await paymentPool.balanceForProof(
          paymentAmount,
          oldPaymentCycle,
          proof,
          {
            from: payee
          }
        );
        let updatedProofBalance = await paymentPool.balanceForProof(
          updatedPayments[payeeIndex].amount,
          paymentCycle,
          updatedProof,
          { from: payee }
        );

        assert.equal(
          payeeBalance.toNumber(),
          withdrawalAmount,
          "the payee balance is correct"
        );
        assert.equal(
          poolBalance.toNumber(),
          paymentPoolBalance - withdrawalAmount,
          "the pool balance is correct"
        );
        assert.equal(
          withdrawals.toNumber(),
          withdrawalAmount,
          "the withdrawals amount is correct"
        );
        assert.equal(
          proofBalance.toNumber(),
          paymentAmount - withdrawalAmount,
          "the proof balance is correct"
        );
        assert.equal(
          updatedProofBalance.toNumber(),
          updatedPaymentAmount - withdrawalAmount,
          "the updated proof balance is correct"
        );
      });
    });
  });
});
