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

const response = await client.executeSafeTransactions([approvalTx], "usdc approval on the CTF");
const result = await response.wait();
console.log("Approval completed:", result.transactionHash);
```

### Deploy Safe Contract

```typescript
const response = await client.deploySafe();
const result = await response.wait();

if (result) {
  console.log("Safe deployed successfully!");
  console.log("Transaction Hash:", result.transactionHash);
  console.log("Safe Address:", result.proxyAddress);
} else {
  console.log("Safe deployment failed");
}
```
