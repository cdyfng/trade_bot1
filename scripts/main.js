const SDK = require("@uniswap/sdk");
const SOLIDITY = require("@ethersproject/solidity");
const ADDRESS = require("@ethersproject/address");
let Web3 = require("web3");
const Tx = require("ethereumjs-tx");
var abi = require("./UniswapV2Router02").abi;

const web3 = new Web3(
  new Web3.providers.WebsocketProvider(
    "ws://localhost:8545"
    //"wss://mainnet.infura.io/ws/v3/" + process.env.INFURA_API_KEY
  )
);

let token0 = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"; // weth change me!
//let token1 = '——0x7240112217a7246d0849f118639e4a9e3ceaa634' // YFLTD
//let token1 = '0xd2dda223b2617cb616c1580db421e4cfae6a8a85' // bondly
// let token1 = '0xd708f387a4a1cbbaf2ac1c59808bbc07747dc14b' //fake yld
let token1 = "0xa1d0E215a23d7030842FC67cE582a6aFa3CCaB83"; //yfii
//let token1 = '0x7240112217a7246d0849f118639e4a9e3ceaa634'

//sort tokens
let tokenA, tokenB;
if (token0 < token1) {
  tokenA = token0;
  tokenB = token1;
} else {
  //let tmp = token0
  tokenA = token1;
  tokenB = token0;
}
console.log(token0);
console.log(token1);

const pair = ADDRESS.getCreate2Address(
  SDK.FACTORY_ADDRESS,
  SOLIDITY.keccak256(
    ["bytes"],
    [SOLIDITY.pack(["address", "address"], [tokenA, tokenB])]
  ),
  SDK.INIT_CODE_HASH
);
console.log("pair:", pair);

let walletAddress = process.env.METAMASK_ETH2;
async function send_eth() {
  let accounts = await web3.eth.getAccounts();
  console.log(accounts);
  web3.eth.sendTransaction({
    from: accounts[0],
    to: walletAddress,
    value: 2000000000000000000,
    gasLimit: 21000,
    gasPrice: 20000000000,
  });
}

// The minimum ABI to get ERC20 Token balance
let minABI = [
  // balanceOf
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  // decimals
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
];

let tokenContract = new web3.eth.Contract(minABI, token1);
async function getBalance() {
  balance = await tokenContract.methods.balanceOf(walletAddress).call();
  return balance;
}

const addressFrom = process.env.METAMASK_ETH2;
const privKey = process.env.METAMASK_PRIV2;

const weth = token0; 
var router_addr = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
// Instantiate token contract object with JSON ABI and address
console.log("Address:", router_addr);
const contract = new web3.eth.Contract(
  abi,
  router_addr, //bondly_eth,
  (error, result) => {
    if (error) console.log(error);
    console.log("result:", result);
  }
);

// Signs the given transaction data and sends it.
function sendSigned(txData, cb) {
  const privateKey = new Buffer.from(privKey, "hex");
  const transaction = new Tx(txData);
  transaction.sign(privateKey);
  const serializedTx = transaction.serialize().toString("hex");
  web3.eth.sendSignedTransaction("0x" + serializedTx, cb);
}

async function trade_tx() {
  const amountOutMin = web3.utils.toHex(1000); //Should change this, with exact min amount
  const amountIn = "1000000000000000000"; // 1 WETH

  const path = [weth, token1];
  const to = addressFrom; //'' // should be a checksummed recipient address
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time
  const value = web3.utils.toHex(amountIn); // // needs to be converted to e.g. hex

  console.log("amountOutMin", amountOutMin);
  console.log("value", value);
  //console.log('original value: ', trade.inputAmount.raw)

  const tx = contract.methods.swapExactETHForTokens(
    amountOutMin,
    path,
    to,
    deadline
  );
  // (uint amountOutMin, address[] calldata path, address to, uint deadline)
  const encodedABI = tx.encodeABI();

  const txData = {
    nonce: web3.utils.toHex(g_txCount), //(txCount),
    gasLimit: web3.utils.toHex(600000),
    gasPrice: web3.utils.toHex(60000000000), // 60 Gwei
    to: router_addr,
    from: addressFrom,
    data: encodedABI,
    value: value,
  };

  console.log("txData:", txData);

  // fire away!
  sendSigned(txData, async function (err, result) {
    if (err) return console.log("error", err);
    console.log("sent", result);
    let balance = await getBalance();
    console.log("Balance After Buying:", balance / 1e18);
  });
}

web3.eth.getTransactionCount(addressFrom).then((txCount) => {
  console.log("txCount:", txCount);
});

g_txCount = 0;
async function main() {
  await send_eth();
  let balance = await getBalance();
  console.log("Balance Before Buying:", balance / 1e18);
  await trade_tx(); //wait for callback
}

main();
