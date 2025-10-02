## builder-relayer-client

### Install

```bash
pnpm install @polymarket/builder-relayer-client
```

### Usage

```ts
import { ethers } from "ethers";
import { createWalletClient, Hex, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { RelayClient } from "@polymarket/builder-relayer-client";

const relayerUrl = `${process.env.POLYMARKET_RELAYER_URL}`;
const chainId = parseInt(`${process.env.CHAIN_ID}`);

// Ethers
const provider = new ethers.providers.JsonRpcProvider(`${process.env.RPC_URL}`);
const pk = new ethers.Wallet(`${process.env.PK}`);
const wallet = pk.connect(provider);

// Viem
const pk = privateKeyToAccount(`${process.env.PK}` as Hex);
const wallet = createWalletClient({account: pk, chain: polygon, transport: http(`${process.env.RPC_URL}`)});

// Initialize Relay Client
const client = new RelayClient(relayerUrl, chainId, wallet);
```