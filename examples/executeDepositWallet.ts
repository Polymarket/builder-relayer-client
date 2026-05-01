import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { RelayClient, DepositWalletCall } from "../src";
import { BuilderApiKeyCreds, BuilderConfig } from "@polymarket/builder-signing-sdk";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, encodeFunctionData, Hex, http, maxUint256, prepareEncodeFunctionData } from "viem";
import { polygon } from "viem/chains";

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

function createApproveCall(
    token: string,
    spender: string,
): DepositWalletCall {
    const calldata = encodeFunctionData({...erc20, args: [spender, maxUint256]});
    return {
        target: token,
        value: "0",
        data: calldata,
    };
}

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

    const walletAddress = `${process.env.DEPOSIT_WALLET_ADDRESS}`;

    const usdc = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
    const ctf = "0x4d97dcd97ec945f40cf65f87097ace5ea0476045";

    // Build calls
    const approveCall = createApproveCall(usdc, ctf);

    // Deadline: 4 minutes from now
    const deadline = Math.floor(Date.now() / 1000 + 240).toString();

    // Execute batch on deposit wallet
    const resp = await client.executeDepositWalletBatch([approveCall], walletAddress, deadline);
    const res = await resp.wait();

    console.log(res);
    console.log(`Done!`);
}

main();
