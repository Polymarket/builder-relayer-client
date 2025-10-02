import { config as dotenvConfig } from "dotenv";
import { ethers } from "ethers";
import { resolve } from "path";
import { RelayClient } from "../src/client";

dotenvConfig({ path: resolve(__dirname, "../.env") });

async function main() {

    console.log(`Starting...`);
    
    const relayerUrl = `${process.env.RELAYER_URL}`;
    const chainId = parseInt(`${process.env.CHAIN_ID}`);
    const provider = new ethers.providers.JsonRpcProvider(`${process.env.RPC_URL}`);
    const pk = new ethers.Wallet(`${process.env.SAFE_CREATE_PK}`);
    const wallet = pk.connect(provider);

    console.log(`Address: ${await wallet.getAddress()}, chainId: ${chainId}`);

    const client = new RelayClient(relayerUrl, chainId, wallet);

    const resp = await client.deploySafe();
    await resp.wait();
    console.log(resp);

    console.log(`Done!`);

}

main();