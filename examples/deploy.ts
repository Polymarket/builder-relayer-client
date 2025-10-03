import { config as dotenvConfig } from "dotenv";
import { ethers } from "ethers";
import { resolve } from "path";
import { RelayClient } from "../src/client";
import { BuilderApiKeyCreds, BuilderConfig } from "@polymarket/builder-signing-sdk";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, Hex, http } from "viem";
import { polygon } from "viem/chains";

dotenvConfig({ path: resolve(__dirname, "../.env") });

async function main() {
    console.log(`Starting...`);
    
    const relayerUrl = `${process.env.RELAYER_URL}`;
    const chainId = parseInt(`${process.env.CHAIN_ID}`);
    const pk = privateKeyToAccount(`${process.env.PK}` as Hex);
    const wallet = createWalletClient({account: pk, chain: polygon, transport: http(`${process.env.RPC_URL}`)});

    const builderCreds: BuilderApiKeyCreds = {
        key: `${process.env.BUILDER_API_KEY}`,
        secret: `${process.env.BUILDER_SECRET}`,
        passphrase: `${process.env.BUILDER_PASS_PHRASE}`,
    };
    
    const builderConfig = new BuilderConfig({
        localBuilderCreds: builderCreds
    });

    const client = new RelayClient(relayerUrl, chainId, wallet, builderConfig);

    const resp = await client.deploy();
    const res = await resp.wait();
    
    console.log(res);

    console.log(`Done!`);

}

main();