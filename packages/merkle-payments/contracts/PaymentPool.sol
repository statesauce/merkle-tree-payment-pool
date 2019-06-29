pragma solidity ^0.5.6;

import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol';
import 'openzeppelin-solidity/contracts/cryptography/MerkleProof.sol';
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

contract PaymentPool is Ownable{
  using SafeMath for uint256;
  using SafeERC20 for ERC20;
  using MerkleProof for bytes32[];

  ERC20 public token;
  uint256 public numPaymentCycles = 1;
  mapping(address => uint256) public withdrawals;

  mapping(uint256 => bytes32) payeeRoots;
  uint256 currentPaymentCycleStartBlock;

  event PaymentCycleEnded(uint256 paymentCycle, uint256 startBlock, uint256 endBlock);
  event PayeeWithdraw(address indexed payee, uint256 amount);

  constructor (ERC20 _token) public {
    token = _token;
    currentPaymentCycleStartBlock = block.number;
  }

  function startNewPaymentCycle() internal onlyOwner returns(bool) {

    // disabled for hevm debugging
    require(block.number > currentPaymentCycleStartBlock);

    emit PaymentCycleEnded(numPaymentCycles, currentPaymentCycleStartBlock, block.number);

    numPaymentCycles = numPaymentCycles.add(1);
    currentPaymentCycleStartBlock = block.number.add(1);

    return true;
  }

  function submitPayeeMerkleRoot(bytes32 payeeRoot) public onlyOwner returns(bool) {
    payeeRoots[numPaymentCycles] = payeeRoot;

    startNewPaymentCycle();

    return true;
  }
  function balanceForProofWithAddress(
      address _address,
      uint256 cumAmount,
      uint256 _paymentCycle,
      bytes32[] memory proof)
  public view returns (uint256)
  {
    if (payeeRoots[_paymentCycle] == 0x0) { return 0; }

    bytes32 leaf = keccak256(abi.encodePacked(_address, cumAmount));

    if (withdrawals[_address] < cumAmount &&
        proof.verify(payeeRoots[_paymentCycle], leaf)) {
      return cumAmount.sub(withdrawals[_address]);
    } else {
      return 0;
    }
  }
  function balanceForProof(uint256 cumAmount, uint256 _paymentCycle,  bytes32[] memory proof) public view returns(uint256) {
    return balanceForProofWithAddress(msg.sender, cumAmount, _paymentCycle, proof);
  }
  function withdraw(uint256 _paymentCycle, uint256 amount, uint256 cumAmount, bytes32[] memory proof) public returns(bool) {
    require(amount > 0);
    require(token.balanceOf(address(this)) >= amount);

    uint256 balance = balanceForProof(_paymentCycle, cumAmount, proof);
    require(balance >= amount);

    withdrawals[msg.sender] = withdrawals[msg.sender].add(amount);
    token.safeTransfer(msg.sender, amount);

    emit PayeeWithdraw(msg.sender, amount);
  }
}




