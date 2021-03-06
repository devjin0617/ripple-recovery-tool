'use strict'; // eslint-disable-line strict

/* eslint-disable max-len */
// Enable core-js polyfills. This allows use of ES6/7 extensions listed here:
// https://github.com/zloirock/core-js/blob/fb0890f32dabe8d4d88a4350d1b268446127132e/shim.js#L1-L103
/* eslint-enable max-len */

// In node.js env, polyfill might be already loaded (from any npm package),
// that's why we do this check.

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

if (!global._babelPolyfill) {
  require('babel-polyfill');
}

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var common = require('./common');
var server = require('./server/server');
var connect = server.connect;
var disconnect = server.disconnect;
var getServerInfo = server.getServerInfo;
var getFee = server.getFee;
var isConnected = server.isConnected;
var getLedgerVersion = server.getLedgerVersion;
var getTransaction = require('./ledger/transaction');
var getTransactions = require('./ledger/transactions');
var getTrustlines = require('./ledger/trustlines');
var getBalances = require('./ledger/balances');
var getBalanceSheet = require('./ledger/balance-sheet');
var getPaths = require('./ledger/pathfind');
var getOrders = require('./ledger/orders');
var getOrderbook = require('./ledger/orderbook');
var getSettings = require('./ledger/settings');
var getAccountInfo = require('./ledger/accountinfo');
var getPaymentChannel = require('./ledger/payment-channel');
var preparePayment = require('./transaction/payment');
var prepareTrustline = require('./transaction/trustline');
var prepareOrder = require('./transaction/order');
var prepareOrderCancellation = require('./transaction/ordercancellation');
var prepareEscrowCreation = require('./transaction/escrow-creation');
var prepareEscrowExecution = require('./transaction/escrow-execution');
var prepareEscrowCancellation = require('./transaction/escrow-cancellation');
var preparePaymentChannelCreate = require('./transaction/payment-channel-create');
var preparePaymentChannelFund = require('./transaction/payment-channel-fund');
var preparePaymentChannelClaim = require('./transaction/payment-channel-claim');
var prepareSettings = require('./transaction/settings');
var sign = require('./transaction/sign');
var combine = require('./transaction/combine');
var submit = require('./transaction/submit');
var errors = require('./common').errors;
var generateAddress = require('./offline/generate-address').generateAddressAPI;
var computeLedgerHash = require('./offline/ledgerhash');
var signPaymentChannelClaim = require('./offline/sign-payment-channel-claim');
var verifyPaymentChannelClaim = require('./offline/verify-payment-channel-claim');
var getLedger = require('./ledger/ledger');

// prevent access to non-validated ledger versions
var RestrictedConnection = function (_common$Connection) {
  _inherits(RestrictedConnection, _common$Connection);

  function RestrictedConnection() {
    _classCallCheck(this, RestrictedConnection);

    return _possibleConstructorReturn(this, (RestrictedConnection.__proto__ || Object.getPrototypeOf(RestrictedConnection)).apply(this, arguments));
  }

  _createClass(RestrictedConnection, [{
    key: 'request',
    value: function request(_request, timeout) {
      var ledger_index = _request.ledger_index;
      if (ledger_index !== undefined && ledger_index !== 'validated') {
        if (!_.isNumber(ledger_index) || ledger_index > this._ledgerVersion) {
          return Promise.reject(new errors.LedgerVersionError('ledgerVersion ' + ledger_index + ' is greater than server\'s ' + ('most recent validated ledger: ' + this._ledgerVersion)));
        }
      }
      return _get(RestrictedConnection.prototype.__proto__ || Object.getPrototypeOf(RestrictedConnection.prototype), 'request', this).call(this, _request, timeout);
    }
  }]);

  return RestrictedConnection;
}(common.Connection);

var RippleAPI = function (_EventEmitter) {
  _inherits(RippleAPI, _EventEmitter);

  function RippleAPI() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, RippleAPI);

    common.validate.apiOptions(options);

    var _this2 = _possibleConstructorReturn(this, (RippleAPI.__proto__ || Object.getPrototypeOf(RippleAPI)).call(this));

    _this2._feeCushion = options.feeCushion || 1.2;
    var serverURL = options.server;
    if (serverURL !== undefined) {
      _this2.connection = new RestrictedConnection(serverURL, options);
      _this2.connection.on('ledgerClosed', function (message) {
        _this2.emit('ledger', server.formatLedgerClose(message));
      });
      _this2.connection.on('error', function (errorCode, errorMessage, data) {
        _this2.emit('error', errorCode, errorMessage, data);
      });
      _this2.connection.on('connected', function () {
        _this2.emit('connected');
      });
      _this2.connection.on('disconnected', function (code) {
        _this2.emit('disconnected', code);
      });
    } else {
      // use null object pattern to provide better error message if user
      // tries to call a method that requires a connection
      _this2.connection = new RestrictedConnection(null, options);
    }
    return _this2;
  }

  return RippleAPI;
}(EventEmitter);

_.assign(RippleAPI.prototype, {
  connect: connect,
  disconnect: disconnect,
  isConnected: isConnected,
  getServerInfo: getServerInfo,
  getFee: getFee,
  getLedgerVersion: getLedgerVersion,

  getTransaction: getTransaction,
  getTransactions: getTransactions,
  getTrustlines: getTrustlines,
  getBalances: getBalances,
  getBalanceSheet: getBalanceSheet,
  getPaths: getPaths,
  getOrders: getOrders,
  getOrderbook: getOrderbook,
  getSettings: getSettings,
  getAccountInfo: getAccountInfo,
  getPaymentChannel: getPaymentChannel,
  getLedger: getLedger,

  preparePayment: preparePayment,
  prepareTrustline: prepareTrustline,
  prepareOrder: prepareOrder,
  prepareOrderCancellation: prepareOrderCancellation,
  prepareEscrowCreation: prepareEscrowCreation,
  prepareEscrowExecution: prepareEscrowExecution,
  prepareEscrowCancellation: prepareEscrowCancellation,
  preparePaymentChannelCreate: preparePaymentChannelCreate,
  preparePaymentChannelFund: preparePaymentChannelFund,
  preparePaymentChannelClaim: preparePaymentChannelClaim,
  prepareSettings: prepareSettings,
  sign: sign,
  combine: combine,
  submit: submit,

  generateAddress: generateAddress,
  computeLedgerHash: computeLedgerHash,
  signPaymentChannelClaim: signPaymentChannelClaim,
  verifyPaymentChannelClaim: verifyPaymentChannelClaim,
  errors: errors
});

// these are exposed only for use by unit tests; they are not part of the API
RippleAPI._PRIVATE = {
  validate: common.validate,
  RangeSet: require('./common/rangeset').RangeSet,
  ledgerUtils: require('./ledger/utils'),
  schemaValidator: require('./common/schema-validator')
};

module.exports = {
  RippleAPI: RippleAPI
};