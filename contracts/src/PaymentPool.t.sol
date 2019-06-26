pragma solidity ^0.5.6;

import "./PaymentPool.sol";
import "./Token.sol";
import "../lib/ds-test/src/test.sol";


contract PaymentPoolTest is DSTest {
  PaymentPool paymentPool;
  Token token;
  function setUp() public {
    token = new Token();
    paymentPool = new PaymentPool(token);
    paymentPool.submitPayeeMerkleRoot(
                                     hex"f14e7ccceae0b4419ae66a375b6087af2857b7ab3c50074ada72fa3d7e7b80a0");
    token.mint(address(this), 100);
  }
  function testNumPaymentCycle() public {
    assertEq(paymentPool.numPaymentCycles(),2);
  }

  function testUIntToString() public {
    assertEq(keccak256(abi.encodePacked(paymentPool.uintToString(uint256(9999999999999999)))),
             keccak256("9999999999999999"));
  }
  function testAddressToString() public {
    assertEq(keccak256(
      abi.encodePacked(
          paymentPool.addressToString(0xC257274276a4E539741Ca11b590B9447B26A8051))),
      keccak256("c257274276a4e539741ca11b590b9447b26a8051"));
  }
  function testBalanceForProofWithAddress() public {
      bytes32 _proof0 = hex"c261d3b644efd3ae89e46765a06fd901";
      bytes32 _proof1 = hex"b7f526ae208703e536f8769e8db6c096";
      bytes32 _proof2 = hex"642b7b4990ba5dd6f0ff4a21046e605f";
      bytes32 _proof3 = hex"07d5635df8a66738040be1fb4c486046";
      bytes32 _proof4 = hex"0a4c88bad76d53567d562ee1414f9272";
      bytes32 _proof5 = hex"a1daa1e7f887c03e0f9c890457ae934e";
      bytes32[] memory _proof = new bytes32[](6);
      _proof[0] = _proof0;
      _proof[1] = _proof1;
      _proof[2] = _proof2;
      _proof[3] = _proof3;
      _proof[4] = _proof4;
      _proof[5] = _proof5;
    uint256 _ret = paymentPool.balanceForProofWithAddress(0x71B4675491410a24cf0B0a64e9D5646bBE9cd933,uint256(1),uint256(10),bytes32[](_proof));
    assertEq(_ret, 10);
  }
  
}
