# builder-relayer-client

TypeScript client library for interacting with Polymarket relayer infrastructure

## Installation

```bash
pnpm install @polymarket/builder-relayer-client
```

## Quick Start

### Basic Setup

```typescript
import { ethers } from "ethers";
import { createWalletClient, Hex, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon } from "viem/chains";
import { RelayClient } from "@polymarket/builder-relayer-client";

const relayerUrl = process.env.POLYMARKET_RELAYER_URL;
const chainId = parseInt(process.env.CHAIN_ID);

// Using Ethers v5
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Using Viem
const account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);
const wallet = createWalletClient({
  account,
  chain: polygon,
  transport: http(process.env.RPC_URL)
});

// Initialize the client
const client = new RelayClient(relayerUrl, chainId, wallet);
```

### With Local Builder Authentication

```typescript
import { BuilderApiKeyCreds, BuilderConfig } from "@polymarket/builder-signing-sdk";

const builderCreds: BuilderApiKeyCreds = {
  key: process.env.BUILDER_API_KEY,
  secret: process.env.BUILDER_SECRET,
  passphrase: process.env.BUILDER_PASS_PHRASE,
};

const builderConfig = new BuilderConfig({
  localBuilderCreds: builderCreds
});

const client = new RelayClient(relayerUrl, chainId, wallet, builderConfig);
```

### With Remote Builder Authentication

```typescript
import { BuilderConfig } from "@polymarket/builder-signing-sdk";

const builderConfig = new BuilderConfig(
  {
    remoteBuilderConfig: {
      url: "http://localhost:3000/sign",
      token: `${process.env.MY_AUTH_TOKEN}`
    }
  },
);

const client = new RelayClient(relayerUrl, chainId, wallet, builderConfig);
```

## Examples

### Execute ERC20 Approval Transaction

```typescript
import { ethers } from "ethers";
import { Interface } from "ethers/lib/utils";
import { OperationType, SafeTransaction } from "@polymarket/builder-relayer-client";

const erc20Interface = new Interface([
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
]);

function createApprovalTransaction(
  tokenAddress: string,
  spenderAddress: string
): SafeTransaction {
  return {
    to: tokenAddress,
    operation: OperationType.Call,
    data: erc20Interface.encodeFunctionData("approve", [
      spenderAddress,
      ethers.constants.MaxUint256
    ]),
    value: "0"
  };
}

// Execute the approval
const approvalTx = createApprovalTransaction(
  "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC
  "0x4d97dcd97ec945f40cf65f87097ace5ea0476045"  // CTF
);

const response = await client.execute([approvalTx], "usdc approval on the CTF");
const result = await response.wait();
console.log("Approval completed:", result.transactionHash);
```

### Deploy Safe Contract

```typescript
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
import { ethers } from "ethers";
import { Interface } from "ethers/lib/utils";
import { OperationType, SafeTransaction } from "@polymarket/builder-relayer-client";

const ctfRedeemInterface = new Interface([
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
]);

function createCtfRedeemTransaction(
  ctfAddress: string,
  collateralToken: string,
  conditionId: string
): SafeTransaction {
  return {
    to: ctfAddress,
    operation: OperationType.Call,
    data: ctfRedeemInterface.encodeFunctionData("redeemPositions", [
      collateralToken,
      ethers.constants.HashZero, // parentCollectionId
      conditionId,
      [1, 2] // indexSets for yes/no outcomes
    ]),
    value: "0"
  };
}

// Execute the redeem
const ctfAddress = "0x4d97dcd97ec945f40cf65f87097ace5ea0476045";
const usdcAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const conditionId = "0x..."; // Your condition ID

const redeemTx = createCtfRedeemTransaction(ctfAddress, usdcAddress, conditionId);
const response = await client.execute([redeemTx], "redeem positions");
const result = await response.wait();
console.log("Redeem completed:", result.transactionHash);
```

#### NegRisk Adapter Redeem

```typescript
import { ethers } from "ethers";
import { Interface } from "ethers/lib/utils";
import { OperationType, SafeTransaction } from "@polymarket/builder-relayer-client";

const nrAdapterRedeemInterface = new Interface([
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
]);

function createNrAdapterRedeemTransaction(
  adapterAddress: string,
  conditionId: string,
  redeemAmounts: string[] // [yesAmount, noAmount]
): SafeTransaction {
  return {
    to: adapterAddress,
    operation: OperationType.Call,
    data: nrAdapterRedeemInterface.encodeFunctionData("redeemPositions", [
      conditionId,
      redeemAmounts.map(amount => ethers.BigNumber.from(amount))
    ]),
    value: "0"
  };
}

// Execute the redeem
const negRiskAdapter = "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296";
const conditionId = "0x..."; // Your condition ID
const redeemAmounts = ["111000000", "0"]; // [yes tokens, no tokens]

const redeemTx = createNrAdapterRedeemTransaction(negRiskAdapter, conditionId, redeemAmounts);
const response = await client.execute([redeemTx], "redeem positions");
const result = await response.wait();
console.log("Redeem completed:", result.transactionHash);
```
