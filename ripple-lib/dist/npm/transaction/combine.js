'use strict'; // eslint-disable-line strict

var _ = require('lodash');
var binary = require('ripple-binary-codec');
var utils = require('./utils');
var BigNumber = require('bignumber.js');

var _require = require('ripple-address-codec'),
    decodeAddress = _require.decodeAddress;

var validate = utils.common.validate;

var _require2 = require('ripple-hashes'),
    computeBinaryTransactionHash = _require2.computeBinaryTransactionHash;

function addressToBigNumber(address) {
  var hex = new Buffer(decodeAddress(address)).toString('hex');
  return new BigNumber(hex, 16);
}

function compareSigners(a, b) {
  return addressToBigNumber(a.Signer.Account).comparedTo(addressToBigNumber(b.Signer.Account));
}

function combine(signedTransactions) {
  validate.combine({ signedTransactions: signedTransactions });

  var txs = _.map(signedTransactions, binary.decode);
  var tx = _.omit(txs[0], 'Signers');
  if (!_.every(txs, function (_tx) {
    return _.isEqual(tx, _.omit(_tx, 'Signers'));
  })) {
    throw new utils.common.errors.ValidationError('txJSON is not the same for all signedTransactions');
  }
  var unsortedSigners = _.reduce(txs, function (accumulator, _tx) {
    return accumulator.concat(_tx.Signers || []);
  }, []);
  var signers = unsortedSigners.sort(compareSigners);
  var signedTx = _.assign({}, tx, { Signers: signers });
  var signedTransaction = binary.encode(signedTx);
  var id = computeBinaryTransactionHash(signedTransaction);
  return { signedTransaction: signedTransaction, id: id };
}

module.exports = combine;