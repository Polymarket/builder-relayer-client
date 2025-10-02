import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { RelayClient } from "../src/client";

dotenvConfig({ path: resolve(__dirname, "../.env") });


async function main() {

    console.log(`Starting...`);
    
    const relayerUrl = `${process.env.RELAYER_URL}`;
    const chainId = parseInt(`${process.env.CHAIN_ID}`);

    const client = new RelayClient(relayerUrl, chainId);

    const resp = await client.getTransactions();
    console.log(resp);

}

main();