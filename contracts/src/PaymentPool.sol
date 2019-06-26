pragma solidity ^0.5.6;

import 'node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'node_modules/openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol';
import 'node_modules/openzeppelin-solidity/contracts/cryptography/MerkleProof.sol';
import 'node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol';

contract PaymentPool is Ownable {

  using SafeMath for uint256;
  using SafeERC20 for ERC20;
  using MerkleProof for bytes;

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
    // require(block.number > currentPaymentCycleStartBlock);

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

  function balanceForProofWithAddress(address _address, uint256 paymentCycleNumber, uint256 cumulativeAmount, bytes32[] memory proof) public view returns(uint256) {
    if (payeeRoots[paymentCycleNumber] == 0x0) { return 0; }

    bytes32 leaf = keccak256(abi.encodePacked('0x',
                             addressToString(_address),
                             ',',
                                              uintToString(cumulativeAmount)));
    if (withdrawals[_address] < cumulativeAmount &&
        MerkleProof.verify(proof,payeeRoots[paymentCycleNumber], leaf)) {
      return cumulativeAmount.sub(withdrawals[_address]);
    } else {
      return 0;
    }
  }

  function balanceForProof(uint256 paymentCycle, uint256 amount, bytes32[] memory proof) public view returns(uint256) {
    return balanceForProofWithAddress(msg.sender, paymentCycle, amount, proof);
  }

  function withdraw(uint256 paymentCycle, uint256 amount, bytes32[] memory proof) public returns(bool) {
    require(amount > 0);
    require(token.balanceOf(address(this)) >= amount);

    uint256 balance = balanceForProof(paymentCycle, amount, proof);
    require(balance >= amount);

    withdrawals[msg.sender] = withdrawals[msg.sender].add(amount);
    token.safeTransfer(msg.sender, amount);

    emit PayeeWithdraw(msg.sender, amount);
  }

  //TODO move to lib
  function splitIntoBytes32(bytes memory byteArray, uint256 numBytes32) pure internal returns (bytes32[] memory bytes32Array,
                                                                                        bytes32[] memory remainder) {
    //if (
    require(!(byteArray.length % 32 != 0 ||
         byteArray.length < numBytes32.mul(32) ||
              byteArray.length.div(32) > 50)); //) { // Arbitrarily limiting this function to an array of 50 bytes32's to conserve gas

    /*   bytes32Array = new bytes32[](0); */
    /*   remainder = new bytes(0); */
    /*   return; */
    /* } */

    bytes32Array = new bytes32[](numBytes32);    
    bytes32 _bytes32;
    for (uint256 k = 32; k <= numBytes32 * 32; k = k.add(32)) {
      assembly {
        _bytes32 := mload(add(byteArray, k))
      }
      bytes32Array[k.sub(32).div(32)] = _bytes32;
    }

    uint256 newArraySize = byteArray.length.div(32).sub(numBytes32).mul(32);
    remainder = new bytes32[](newArraySize);

    bytes1 _bytes1;
    uint256 offset = numBytes32.sub(1).mul(32).add(64);
    for (uint256 i = offset; i < newArraySize.add(offset); i = i.add(1)) {
      assembly {
        _bytes1 := mload(add(byteArray, i))
      }
      remainder[i.sub(offset)] = _bytes1;
    }
  }

  //  TODO use SafeMath and move to lib
  function addressToString(address x) public pure returns (string memory) {
    bytes memory s = new bytes(40);
    for (uint256 i = 0; i < 20; i++) {
      byte b = byte(uint8(uint256(x) / (2**(8*(19 - i)))));
      byte hi = byte(uint8(b) / 16);
      byte lo = byte(uint8(b) - 16 * uint8(hi));
      s[2*i] = char(hi);
      s[2*i+1] = char(lo);
    }
    return string(s);
  }
  
  //TODO use SafeMath and move to lib
  function char(byte b) internal pure returns (byte c) {
    if (uint8(b) < 10) return byte(uint8(b) + 0x30);
    else return byte(uint8(b) + 0x57);
  }

  //TODO use SafeMath and move to lib
    function uintToString(uint256 _i) public pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len - 1;
        while (_i != 0) {
            bstr[k--] = byte(uint8(48 + _i % 10));
            _i /= 10;
        }
        return string(bstr);
    }
}
