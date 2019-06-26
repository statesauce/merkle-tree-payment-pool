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
                                     hex"87a7fd40b4979193157aedd790a286cfa381e76866404207a6d0c816412f97c3");
    token.mint(address(this), 100);
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
    bytes memory _proof = hex"0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000a3d17fc903d1485a25e68400773d971e76c10b9bbb137e69a8814800a39f2fcaafa6e2e06009fcca9bac61e066ff0f30093dbd2e99a3e65dd1c0b1762bf7b19426a02e390b36463a6580c5e776514ce07e0f74add3bb42f0d5f27dc9938c5f982";
    uint256 _ret = paymentPool.balanceForProofWithAddress(0xEEc45e23F69b5267Be75f1db3fD8fdd7Ec961f46,_proof);
    assertEq(_ret, 10);
  }
  
}
