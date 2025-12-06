# builder-relayer-client

TypeScript client library for interacting with Polymarket relayer infrastructure

## Installation

```bash
pnpm install @polymarket/builder-relayer-client
```

## Quick Start

### Basic Setup

```typescript
import { createWalletClient, Hex, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon } from "viem/chains";
import { RelayClient, RelayerTxType } from "@polymarket/builder-relayer-client";

const relayerUrl = process.env.POLYMARKET_RELAYER_URL;
const chainId = parseInt(process.env.CHAIN_ID);

const account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);
const wallet = createWalletClient({
  account,
  chain: polygon,
  transport: http(process.env.RPC_URL)
});

// Initialize the client with SAFE transaction type (default)
const client = new RelayClient(relayerUrl, chainId, wallet);

// Or initialize with PROXY transaction type
const proxyClient = new RelayClient(relayerUrl, chainId, wallet, undefined, RelayerTxType.PROXY);
```

### Transaction Types

The client supports two transaction types via the `RelayerTxType` enum:

- **`RelayerTxType.SAFE`** (default): Executes transactions through for a Gnosis Safe
- **`RelayerTxType.PROXY`**: Executes transactions for a Polymarket Proxy wallet

The transaction type is specified as the last parameter when creating a `RelayClient` instance. All examples use the `Transaction` type - the client automatically converts transactions to the appropriate format (`SafeTransaction` or `ProxyTransaction`) based on the `RelayerTxType` you've configured.

### With Local Builder Authentication

```typescript
import { BuilderApiKeyCreds, BuilderConfig } from "@polymarket/builder-signing-sdk";
import { RelayerTxType } from "@polymarket/builder-relayer-client";

const builderCreds: BuilderApiKeyCreds = {
  key: process.env.BUILDER_API_KEY,
  secret: process.env.BUILDER_SECRET,
  passphrase: process.env.BUILDER_PASS_PHRASE,
};

const builderConfig = new BuilderConfig({
  localBuilderCreds: builderCreds
});

// Initialize with SAFE transaction type (default)
const client = new RelayClient(relayerUrl, chainId, wallet, builderConfig);

// Or initialize with PROXY transaction type
const proxyClient = new RelayClient(relayerUrl, chainId, wallet, builderConfig, RelayerTxType.PROXY);
```

### With Remote Builder Authentication

```typescript
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { RelayerTxType } from "@polymarket/builder-relayer-client";

const builderConfig = new BuilderConfig(
  {
    remoteBuilderConfig: {
      url: "http://localhost:3000/sign",
      token: `${process.env.MY_AUTH_TOKEN}`
    }
  },
);

// Initialize with SAFE transaction type (default)
const client = new RelayClient(relayerUrl, chainId, wallet, builderConfig);

// Or initialize with PROXY transaction type
const proxyClient = new RelayClient(relayerUrl, chainId, wallet, builderConfig, RelayerTxType.PROXY);
```

## Examples

### Execute ERC20 Approval Transaction

```typescript
import { encodeFunctionData, prepareEncodeFunctionData, maxUint256 } from "viem";
import { Transaction, RelayerTxType } from "@polymarket/builder-relayer-client";

const erc20Abi = [
  {
    "constant": false,
    "inputs": [
      {"name": "_spender", "type": "address"},
      {"name": "_value", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const erc20 = prepareEncodeFunctionData({
  abi: erc20Abi,
  functionName: "approve",
});

function createApprovalTransaction(
  tokenAddress: string,
  spenderAddress: string
): Transaction {
  const calldata = encodeFunctionData({
    ...erc20,
    args: [spenderAddress, maxUint256]
  });
  return {
    to: tokenAddress,
    data: calldata,
    value: "0"
  };
}

// Initialize client with SAFE transaction type (default)
const safeClient = new RelayClient(relayerUrl, chainId, wallet, builderConfig);

// Or initialize with PROXY transaction type
const proxyClient = new RelayClient(relayerUrl, chainId, wallet, builderConfig, RelayerTxType.PROXY);

// Execute the approval - works with both SAFE and PROXY
const approvalTx = createApprovalTransaction(
  "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC
  "0x4d97dcd97ec945f40cf65f87097ace5ea0476045"  // CTF
);

// Using SAFE client
const safeResponse = await safeClient.execute([approvalTx], "usdc approval on the CTF");
const safeResult = await safeResponse.wait();
console.log("Safe approval completed:", safeResult.transactionHash);

// Using PROXY client
const proxyResponse = await proxyClient.execute([approvalTx], "usdc approval on the CTF");
const proxyResult = await proxyResponse.wait();
console.log("Proxy approval completed:", proxyResult.transactionHash);
```

### Deploy Safe Contract

> **Note:** Safe deployment is only available for `RelayerTxType.SAFE`. Proxy wallets are deployed automatically on its first transaction.

```typescript
// Initialize client with SAFE transaction type (default)
const client = new RelayClient(relayerUrl, chainId, wallet, builderConfig);

const response = await client.deploy();
const result = await response.wait();

if (result) {
  console.log("Safe deployed successfully!");
  console.log("Transaction Hash:", result.transactionHash);
  console.log("Safe Address:", result.proxyAddress);
} else {
  console.log("Safe deployment failed");
}
```

### Redeem Positions

#### CTF (ConditionalTokensFramework) Redeem

```typescript
import { encodeFunctionData, prepareEncodeFunctionData, zeroHash } from "viem";
import { Transaction, RelayerTxType } from "@polymarket/builder-relayer-client";

const ctfRedeemAbi = [
  {
    "constant": false,
    "inputs": [
      {"name": "collateralToken", "type": "address"},
      {"name": "parentCollectionId", "type": "bytes32"},
      {"name": "conditionId", "type": "bytes32"},
      {"name": "indexSets", "type": "uint256[]"}
    ],
    "name": "redeemPositions",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const ctf = prepareEncodeFunctionData({
  abi: ctfRedeemAbi,
  functionName: "redeemPositions",
});

function createCtfRedeemTransaction(
  ctfAddress: string,
  collateralToken: string,
  conditionId: string
): Transaction {
  const calldata = encodeFunctionData({
    ...ctf,
    args: [collateralToken, zeroHash, conditionId, [1, 2]]
  });
  return {
    to: ctfAddress,
    data: calldata,
    value: "0"
  };
}

// Initialize client with SAFE transaction type (default)
const safeClient = new RelayClient(relayerUrl, chainId, wallet, builderConfig);

// Or initialize with PROXY transaction type
const proxyClient = new RelayClient(relayerUrl, chainId, wallet, builderConfig, RelayerTxType.PROXY);

// Execute the redeem - works with both SAFE and PROXY
const ctfAddress = "0x4d97dcd97ec945f40cf65f87097ace5ea0476045";
const usdcAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const conditionId = "0x..."; // Your condition ID

const redeemTx = createCtfRedeemTransaction(ctfAddress, usdcAddress, conditionId);

// Using SAFE client
const safeResponse = await safeClient.execute([redeemTx], "redeem positions");
const safeResult = await safeResponse.wait();
console.log("Safe redeem completed:", safeResult.transactionHash);

// Using PROXY client
const proxyResponse = await proxyClient.execute([redeemTx], "redeem positions");
const proxyResult = await proxyResponse.wait();
console.log("Proxy redeem completed:", proxyResult.transactionHash);
```

#### NegRisk Adapter Redeem

```typescript
import { encodeFunctionData, prepareEncodeFunctionData } from "viem";
import { Transaction, RelayerTxType } from "@polymarket/builder-relayer-client";

const nrAdapterRedeemAbi = [
  {
    "inputs": [
      {"internalType": "bytes32", "name": "_conditionId", "type": "bytes32"},
      {"internalType": "uint256[]", "name": "_amounts", "type": "uint256[]"}
    ],
    "name": "redeemPositions",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const nrAdapter = prepareEncodeFunctionData({
  abi: nrAdapterRedeemAbi,
  functionName: "redeemPositions",
});

function createNrAdapterRedeemTransaction(
  adapterAddress: string,
  conditionId: string,
  redeemAmounts: bigint[] // [yesAmount, noAmount]
): Transaction {
  const calldata = encodeFunctionData({
    ...nrAdapter,
    args: [conditionId, redeemAmounts]
  });
  return {
    to: adapterAddress,
    data: calldata,
    value: "0"
  };
}

// Initialize client with SAFE transaction type (default)
const safeClient = new RelayClient(relayerUrl, chainId, wallet, builderConfig);

// Or initialize with PROXY transaction type
const proxyClient = new RelayClient(relayerUrl, chainId, wallet, builderConfig, RelayerTxType.PROXY);

// Execute the redeem - works with both SAFE and PROXY
const negRiskAdapter = "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296";
const conditionId = "0x..."; // Your condition ID
const redeemAmounts = [BigInt(111000000), BigInt(0)]; // [yes tokens, no tokens]

const redeemTx = createNrAdapterRedeemTransaction(negRiskAdapter, conditionId, redeemAmounts);

// Using SAFE client
const safeResponse = await safeClient.execute([redeemTx], "redeem positions");
const safeResult = await safeResponse.wait();
console.log("Safe redeem completed:", safeResult.transactionHash);

// Using PROXY client
const proxyResponse = await proxyClient.execute([redeemTx], "redeem positions");
const proxyResult = await proxyResponse.wait();
console.log("Proxy redeem completed:", proxyResult.transactionHash);
```
