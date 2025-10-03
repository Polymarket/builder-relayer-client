import { config as dotenvConfig } from "dotenv";
import { ethers } from "ethers";
import { resolve } from "path";
import { RelayClient } from "../src/client";
import { BuilderApiKeyCreds, BuilderConfig } from "@polymarket/builder-signing-sdk";

dotenvConfig({ path: resolve(__dirname, "../.env") });

async function main() {

    console.log(`Starting...`);
    
    const relayerUrl = `${process.env.RELAYER_URL_STAGING}`;
    const chainId = parseInt(`${process.env.CHAIN_ID_STAGING}`);
    const provider = new ethers.providers.JsonRpcProvider(`${process.env.RPC_URL_STAGING}`);
    const pk = new ethers.Wallet(`${process.env.PK}`);
    const wallet = pk.connect(provider);

    console.log(`Address: ${await wallet.getAddress()}, chainId: ${chainId}`);

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