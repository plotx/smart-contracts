const abi = require("ethereumjs-abi");
const Web3 = require("web3");
const { toHex } = require("./ethTools.js");

function encode(...args) {
  if (args.length === 1) {
    return "0x";
  }

  const [fn, ...params] = args;
  const types = fn
    .slice(0, fn.length - 1)
    .split("(")[1]
    .split(",");

  for (let i = 0; i < types.length; i++) {
    if (types[i].includes("bytes") && !params[i].startsWith("0x")) {
      params[i] = toHex(params[i]);
    }
  }

  return encode1(types, params);
}

function encode1(...args) {
  const encoded = abi.rawEncode.apply(this, args);
  return "0x" + encoded.toString("hex");
}

function encode3(...args) {
  var encoded = abi.simpleEncode.apply(this, args);
  encoded = encoded.toString('hex');
  return '0x' + encoded;
}

module.exports = { encode, encode1, encode3};
