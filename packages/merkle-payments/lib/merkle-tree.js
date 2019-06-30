"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _ethereumjsUtil = require("ethereumjs-util");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var MerkleTree =
/*#__PURE__*/
function () {
  function MerkleTree(elements) {
    _classCallCheck(this, MerkleTree);

    // Filter empty strings and hash elements
    this.elements = elements.filter(function (el) {
      return el;
    }).map(function (el) {
      return (0, _ethereumjsUtil.sha3)(el);
    }); // Deduplicate elements

    this.elements = this.bufDedup(this.elements); // Sort elements

    this.elements.sort(Buffer.compare); // Create layers

    this.layers = this.getLayers(this.elements);
  }

  _createClass(MerkleTree, [{
    key: "getLayers",
    value: function getLayers(elements) {
      if (elements.length === 0) {
        return [[""]];
      }

      var layers = [];
      layers.push(elements); // Get next layer until we reach the root

      while (layers[layers.length - 1].length > 1) {
        layers.push(this.getNextLayer(layers[layers.length - 1]));
      }

      return layers;
    }
  }, {
    key: "getNextLayer",
    value: function getNextLayer(elements) {
      var _this = this;

      return elements.reduce(function (layer, el, idx, arr) {
        if (idx % 2 === 0) {
          // Hash the current element with its pair element
          layer.push(_this.combinedHash(el, arr[idx + 1]));
        }

        return layer;
      }, []);
    }
  }, {
    key: "combinedHash",
    value: function combinedHash(first, second) {
      if (!first) {
        return second;
      }

      if (!second) {
        return first;
      }

      return (0, _ethereumjsUtil.sha3)(this.sortAndConcat(first, second));
    }
  }, {
    key: "getRoot",
    value: function getRoot() {
      return this.layers[this.layers.length - 1][0];
    }
  }, {
    key: "getHexRoot",
    value: function getHexRoot() {
      return (0, _ethereumjsUtil.bufferToHex)(this.getRoot());
    }
  }, {
    key: "getProof",
    value: function getProof(el, prefix) {
      var _this2 = this;

      var idx = this.bufIndexOf(el, this.elements);

      if (idx === -1) {
        throw new Error("Element does not exist in Merkle tree");
      }

      var proof = this.layers.reduce(function (proof, layer) {
        var pairElement = _this2.getPairElement(idx, layer);

        if (pairElement) {
          proof.push(pairElement);
        }

        idx = Math.floor(idx / 2);
        return proof;
      }, []);

      if (prefix) {
        if (!Array.isArray(prefix)) {
          prefix = [prefix];
        }

        prefix = prefix.map(function (item) {
          return (0, _ethereumjsUtil.setLength)((0, _ethereumjsUtil.toBuffer)(item), 32);
        });
        proof = prefix.concat(proof);
      }

      return proof;
    }
  }, {
    key: "getHexProof",
    value: function getHexProof(el, prefix) {
      var proof = this.getProof(el, prefix);
      return this.bufArrToHex(proof);
    }
  }, {
    key: "getPairElement",
    value: function getPairElement(idx, layer) {
      var pairIdx = idx % 2 === 0 ? idx + 1 : idx - 1;

      if (pairIdx < layer.length) {
        return layer[pairIdx];
      } else {
        return null;
      }
    }
  }, {
    key: "bufIndexOf",
    value: function bufIndexOf(el, arr) {
      var hash; // Convert element to 32 byte hash if it is not one already

      if (el.length !== 32 || !Buffer.isBuffer(el)) {
        hash = (0, _ethereumjsUtil.sha3)(el);
      } else {
        hash = el;
      }

      for (var i = 0; i < arr.length; i++) {
        if (hash.equals(arr[i])) {
          return i;
        }
      }

      return -1;
    }
  }, {
    key: "bufDedup",
    value: function bufDedup(elements) {
      var _this3 = this;

      return elements.filter(function (el, idx) {
        return _this3.bufIndexOf(el, elements) === idx;
      });
    }
  }, {
    key: "bufArrToHex",
    value: function bufArrToHex(arr) {
      if (arr.some(function (el) {
        return !Buffer.isBuffer(el);
      })) {
        throw new Error("Array is not an array of buffers");
      }

      return "0x" + arr.map(function (el) {
        return el.toString("hex");
      }).join("");
    }
  }, {
    key: "sortAndConcat",
    value: function sortAndConcat() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return Buffer.concat([].concat(args).sort(Buffer.compare));
    }
  }]);

  return MerkleTree;
}();

exports["default"] = MerkleTree;