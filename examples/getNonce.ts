import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { TransactionType } from "../src/types";
import { RelayClient } from "../src/client";

dotenvConfig({ path: resolve(__dirname, "../.env") });

async function main() {

    console.log(`Starting...`);
    const relayerUrl = `${process.env.RELAYER_URL}`;
    const client = new RelayClient(relayerUrl, 137);

    // Must be the signer address
    const address = "0x77837466dd64fb52ECD00C737F060d0ff5CCB575";

    const resp = await client.getNonce(address, TransactionType.SAFE);
    console.log(resp);


    console.log(`Done!`);

}

main();