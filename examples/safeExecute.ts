import { config as dotenvConfig } from "dotenv";
import { ethers } from "ethers";
import { Interface } from "ethers/lib/utils";
import { resolve } from "path";
import { RelayClient } from "../src/client";
import { OperationType, SafeTransaction } from "../src/types";
import { createWalletClient, Hex, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygonAmoy } from "viem/chains";
import { BuilderApiKeyCreds, BuilderConfig } from "@polymarket/builder-signing-sdk";

dotenvConfig({ path: resolve(__dirname, "../.env") });

const erc20Interface = new Interface([{"constant": false,"inputs": [{"name": "_spender","type": "address"},{"name": "_value","type": "uint256"}],"name": "approve","outputs": [{"name": "","type": "bool"}],"payable": false,"stateMutability": "nonpayable","type": "function"}]);

function createUsdcApproveTxn(
    token: string,
    spender: string,
): SafeTransaction {
    return {
        to: token,
        operation: OperationType.Call,
        data: erc20Interface.encodeFunctionData("approve", [spender, ethers.constants.MaxUint256]),
        value: "0",
    }
}

async function main() {

    console.log(`Starting...`);
    
    const relayerUrl = `${process.env.RELAYER_URL}`;
    const chainId = parseInt(`${process.env.CHAIN_ID}`);


    //  ethers
    // console.log(`ethers`)
    // const provider = new ethers.providers.JsonRpcProvider(`${process.env.RPC_URL}`);
    // const pk = new ethers.Wallet(`${process.env.SAFE_PK}`);
    // const wallet = pk.connect(provider);

    // viem
    console.log(`Viem`);
    const pk = privateKeyToAccount(`${process.env.SAFE_PK}` as Hex);
    const wallet = createWalletClient({account: pk, chain: polygonAmoy, transport: http(`${process.env.RPC_URL}`)});

    const builderCreds: BuilderApiKeyCreds = {
        key: `${process.env.BUILDER_API_KEY}`,
        secret: `${process.env.BUILDER_SECRET}`,
        passphrase: `${process.env.BUILDER_PASS_PHRASE}`,
    };
    const builderConfig = new BuilderConfig({
        localBuilderCreds: builderCreds
    });
    const client = new RelayClient(relayerUrl, chainId, wallet, builderConfig);

    const usdc = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
    const ctf = "0x4d97dcd97ec945f40cf65f87097ace5ea0476045";
    const txn = createUsdcApproveTxn(usdc, ctf);

    const resp = await client.executeSafeTransactions([txn, txn], "approve USDC on CTF");
    const t = await resp.wait();
    console.log(t);

}

main();
