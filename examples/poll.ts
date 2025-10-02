import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { AuthArgs, RelayerTransactionState } from "../src/types";
import { RelayClient } from "../src/client";

dotenvConfig({ path: resolve(__dirname, "../.env") });


async function main() {

    console.log(`Starting...`);
    
    const relayerUrl = `${process.env.RELAYER_URL}`;
    const chainId = parseInt(`${process.env.CHAIN_ID}`);
    const args: AuthArgs = {
        authUrl: `${process.env.AUTH_URL}`,
        authToken: `${process.env.AUTH_TOKEN}`,
    };
    const client = new RelayClient(relayerUrl, chainId, undefined, args);

    // const states = [RelayerTransactionState.STATE_EXECUTED.valueOf(), RelayerTransactionState.STATE_CONFIRMED.valueOf()];
    const states = [RelayerTransactionState.STATE_CONFIRMED.valueOf()];
    const resp = await client.pollUntilState("0190e61a-bb93-7c3f-88e2-e29e1c569fb1", states);
    console.log(resp);

}

main();