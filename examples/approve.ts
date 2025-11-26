import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { RelayClient, OperationType, SafeTransaction } from "../src";
import { encodeFunctionData, prepareEncodeFunctionData, createWalletClient, Hex, http, maxUint256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon } from "viem/chains";
import { BuilderApiKeyCreds, BuilderConfig } from "@polymarket/builder-signing-sdk";

dotenvConfig({ path: resolve(__dirname, "../.env") });

const erc20Abi = [
    {
        "constant": false,"inputs": 
        [{"name": "_spender","type": "address"},{"name": "_value","type": "uint256"}],
        "name": "approve",
        "outputs": [{"name": "","type": "bool"}],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const erc20 = prepareEncodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
});

function createUsdcApproveTxn(
    token: string,
    spender: string,
): SafeTransaction {
    const calldata = encodeFunctionData({...erc20, args: [spender, maxUint256]});
    return {
        to: token,
        operation: OperationType.Call,
        data: calldata,
        value: "0",
    }
}

async function main() {
    console.log(`Starting...`);
    
    const relayerUrl = `${process.env.RELAYER_URL}`;
    const chainId = parseInt(`${process.env.CHAIN_ID}`);

    const pk = privateKeyToAccount(`${process.env.PK}` as Hex);
    const wallet = createWalletClient({account: pk, chain: polygon, transport: http(`${process.env.RPC_URL}`)});

    const builderCreds: BuilderApiKeyCreds = {
        key: `${process.env.BUILDER_API_KEY_PROD}`,
        secret: `${process.env.BUILDER_SECRET_PROD}`,
        passphrase: `${process.env.BUILDER_PASS_PHRASE_PROD}`,
    };
    const builderConfig = new BuilderConfig({
        localBuilderCreds: builderCreds
    });
    const client = new RelayClient(relayerUrl, chainId, wallet, builderConfig);

    const usdc = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
    const ctf = "0x4d97dcd97ec945f40cf65f87097ace5ea0476045";
    const txn = createUsdcApproveTxn(usdc, ctf);

    const resp = await client.execute([txn, txn], "approve USDC on CTF");
    const t = await resp.wait();
    console.log(t);

}

main();
