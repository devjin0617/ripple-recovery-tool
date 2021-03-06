'use strict'; // eslint-disable-line strict

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _ = require('lodash');
var RippleAPI = require('./api').RippleAPI;

var RippleAPIBroadcast = function (_RippleAPI) {
  _inherits(RippleAPIBroadcast, _RippleAPI);

  function RippleAPIBroadcast(servers, options) {
    _classCallCheck(this, RippleAPIBroadcast);

    var _this = _possibleConstructorReturn(this, (RippleAPIBroadcast.__proto__ || Object.getPrototypeOf(RippleAPIBroadcast)).call(this, options));

    _this.ledgerVersion = 0;

    var apis = servers.map(function (server) {
      return new RippleAPI(_.assign({}, options, { server: server }));
    });

    // exposed for testing
    _this._apis = apis;

    _this.getMethodNames().forEach(function (name) {
      _this[name] = function () {
        var _arguments = arguments;
        // eslint-disable-line no-loop-func
        return Promise.race(apis.map(function (api) {
          return api[name].apply(api, _arguments);
        }));
      };
    });

    // connection methods must be overridden to apply to all api instances
    _this.connect = function () {
      return Promise.all(apis.map(function (api) {
        return api.connect();
      }));
    };
    _this.disconnect = function () {
      return Promise.all(apis.map(function (api) {
        return api.disconnect();
      }));
    };
    _this.isConnected = function () {
      return _.every(apis.map(function (api) {
        return api.isConnected();
      }));
    };

    // synchronous methods are all passed directly to the first api instance
    var defaultAPI = apis[0];
    var syncMethods = ['sign', 'generateAddress', 'computeLedgerHash'];
    syncMethods.forEach(function (name) {
      _this[name] = defaultAPI[name].bind(defaultAPI);
    });

    apis.forEach(function (api) {
      api.on('ledger', _this.onLedgerEvent.bind(_this));
      api.on('error', function (errorCode, errorMessage, data) {
        return _this.emit('error', errorCode, errorMessage, data);
      });
    });
    return _this;
  }

  _createClass(RippleAPIBroadcast, [{
    key: 'onLedgerEvent',
    value: function onLedgerEvent(ledger) {
      if (ledger.ledgerVersion > this.ledgerVersion) {
        this.ledgerVersion = ledger.ledgerVersion;
        this.emit('ledger', ledger);
      }
    }
  }, {
    key: 'getMethodNames',
    value: function getMethodNames() {
      var methodNames = [];
      for (var name in RippleAPI.prototype) {
        if (RippleAPI.prototype.hasOwnProperty(name)) {
          if (typeof RippleAPI.prototype[name] === 'function') {
            methodNames.push(name);
          }
        }
      }
      return methodNames;
    }
  }]);

  return RippleAPIBroadcast;
}(RippleAPI);

module.exports = {
  RippleAPIBroadcast: RippleAPIBroadcast
};