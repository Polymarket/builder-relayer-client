# Deposit-wallet address migration

This runbook is for integrations that used the standalone `deriveDepositWallet()` helper or stored a deposit address before beacon-wallet support. It concerns Deposit Wallets, not the Safe or Proxy `execute()` flow.

## Upgrade the address derivation

Beacon-aware derivation was added in [PR #34](https://github.com/Polymarket/builder-relayer-client/pull/34) and released in version `0.0.10`. Check the installed version and lockfile, then use `client.deriveDepositWalletAddress()` instead of the deprecated standalone helper. The latter remains UUPS-only; upgrading the package without changing that call does not make it beacon-aware.

The client reads the factory's `BEACON()` value and, when a beacon is present, checks the legacy UUPS address for deployed code. Its [implementation](../src/client.ts) selects an address as follows:

| Factory / RPC result | Legacy UUPS address has code | Selected address |
| --- | --- | --- |
| No beacon is detected | Not checked | Legacy UUPS address |
| Non-zero beacon | Yes | Existing UUPS address |
| Non-zero beacon | No (`undefined` or `0x`) | Beacon-derived address |
| RPC request fails with an error not recognised as a legacy contract revert | Unknown | Error propagates; stop the preflight |

The legacy factory path includes a zero beacon, missing or short return data, or a contract revert recognised by the client. Do not catch an ordinary connectivity error and substitute a cached address or the standalone helper.

An already-deployed legacy wallet is intentionally retained by this address-selection method. The method does not upgrade its implementation, move its balance, or establish that a previously stored address is still suitable for funding.

## Compare persisted addresses before funding

Use the same owner/signer and chain as the original integration. Re-derive the address before displaying a funding destination and compare it with the stored address. Treat a mismatch as a reconciliation task, not permission to overwrite the old record.

The following helper uses an already-configured `RelayClient` from the [basic setup](../README.md#basic-setup). Both SDK calls are read-only: derivation uses the client's public RPC, while `getDeployed()` queries the relayer.

```typescript
import { RelayClient } from "@polymarket/builder-relayer-client";

async function getDepositWalletPreflight(
  client: RelayClient,
  persistedAddress?: string,
): Promise<{ walletAddress: string; relayerDeployed: boolean }> {
  const walletAddress = await client.deriveDepositWalletAddress();

  if (
    persistedAddress !== undefined &&
    persistedAddress.toLowerCase() !== walletAddress.toLowerCase()
  ) {
    throw new Error("Deposit wallet address changed; reconcile before funding");
  }

  const relayerDeployed = await client.getDeployed(walletAddress, "WALLET");
  return { walletAddress, relayerDeployed };
}
```

Call `getDepositWalletPreflight(client, storedAddress)` from your application, supplying `undefined` only for a genuinely new record. Validate stored address formats at your application's boundary. A `false` deployment response is not an instruction to send funds: complete your supported deployment/onboarding flow and confirm its result first. A `true` response is not a token-balance, chain, or collateral-support check.

Keep the old and new addresses associated with the owner and chain until any earlier deposits have been reconciled. Do not assume that native USDC, USDC.e and pUSD are interchangeable merely because they are ERC-20 tokens on the same chain.

## Earlier deposits need separate investigation

Updating derivation only changes how subsequent addresses are selected. It does not recover funds sent to an obsolete, undeployed counterfactual address. Do not assume that `deployDepositWallet()` will deploy that old address, and do not present operator-only recovery calls as a user-controlled SDK workflow.

For an address mismatch or an unregistered-wallet error, collect:

- SDK name/version, chain ID, and relayer URL, with credentials redacted.
- Public owner address, persisted address, and newly derived address.
- Whether the legacy address has deployed code, plus the block number used for the RPC check.
- Funding transaction hash and exact token contract, if an earlier deposit is involved.
- Relayer error and transaction ID, if available, without authentication headers.

Ask the Polymarket team to confirm the supported recovery path. Never include private keys, seed phrases, builder secrets, or signed recovery payloads in a public report. The user reports in [TypeScript #39](https://github.com/Polymarket/builder-relayer-client/issues/39) and [Python #27](https://github.com/Polymarket/py-builder-relayer-client/issues/27) provide context; they are not a guarantee that the same recovery applies to another wallet.
