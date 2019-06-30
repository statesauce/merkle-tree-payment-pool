"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _merkletreejs = require("merkletreejs");

var _web3Utils = require("web3-utils");

var _ethereumjsUtil = require("ethereumjs-util");

var _keccak = _interopRequireDefault(require("keccak256"));

var _lodash = _interopRequireDefault(require("lodash/lodash"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

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
  var zeros = "0x0000000000000000000000000000000000000000000000000000000000000000";
  var hexNum = (0, _web3Utils.toHex)(bigNum).slice(2);
  return zeros.slice(0, 66 - hexNum.length) + hexNum;
}

var CumulativePaymentTree =
/*#__PURE__*/
function (_MerkleTree) {
  _inherits(CumulativePaymentTree, _MerkleTree);

  function CumulativePaymentTree(paymentList) {
    _classCallCheck(this, CumulativePaymentTree);

    // const leaves = paymentList.map(v => {
    //   return soliditySha3(v.payee,v.amount)
    //   }
    // )
    var leaves = paymentList.map(function (v) {
      return v.payee + v.amount;
    });
    return _possibleConstructorReturn(this, _getPrototypeOf(CumulativePaymentTree).call(this, leaves, _keccak["default"], {
      sort: true,
      hashLeaves: true
    })); // const root = tree.getHexRoot()
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
  } // amountForPayee(payee) {
  //   let payment = _.find(this.paymentList, { payee });
  //   if (!payment) { return 0; }
  //   return payment.amount;
  // }


  _createClass(CumulativePaymentTree, [{
    key: "getLeafForPayee",
    value: function getLeafForPayee(payment) {
      return (0, _web3Utils.soliditySha3)(payment.payee, payment.amount);
    }
  }, {
    key: "getLeafForPayeeNoHash",
    value: function getLeafForPayeeNoHash(payment) {
      return (0, _web3Utils.soliditySha3)(payment.payee, payment.amount);
    }
  }, {
    key: "hexProofForPayee",
    value: function hexProofForPayee(payment) {
      var proof = this.getHexProof(this.getLeafForPayee(payment));

      if (!proof) {
        return (0, _ethereumjsUtil.bufferToHex)((0, _ethereumjsUtil.zeros)(32));
      }

      return proof;
    }
  }]);

  return CumulativePaymentTree;
}(_merkletreejs.MerkleTree);

exports["default"] = CumulativePaymentTree;