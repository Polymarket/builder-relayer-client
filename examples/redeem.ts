import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { RelayClient, OperationType, SafeTransaction } from "../src";
import { encodeFunctionData, prepareEncodeFunctionData, createWalletClient, Hex, http, zeroHash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon } from "viem/chains";
import { BuilderApiKeyCreds, BuilderConfig } from "@polymarket/builder-signing-sdk";

dotenvConfig({ path: resolve(__dirname, "../.env") });


const ctfRedeemAbi = [
    {
        "constant":false,
        "inputs":
        [
            {"name":"collateralToken","type":"address"},
            {"name":"parentCollectionId","type":"bytes32"},
            {"name":"conditionId","type":"bytes32"},
            {"name":"indexSets","type":"uint256[]"}
        ],
        "name":"redeemPositions",
        "outputs":[],
        "payable":false,
        "stateMutability":"nonpayable",
        "type":"function"
    }
];

const nrAdapterRedeemAbi = [
    {
        "inputs":
        [
            {"internalType":"bytes32","name":"_conditionId","type":"bytes32"},
            {"internalType":"uint256[]","name":"_amounts","type":"uint256[]"}
        ],
        "name":"redeemPositions",
        "outputs":[],
        "stateMutability":"nonpayable",
        "type":"function"
    }
];

const ctf = prepareEncodeFunctionData({
    abi: ctfRedeemAbi,
    functionName: "redeemPositions",
});

const nrAdapter = prepareEncodeFunctionData({
    abi: nrAdapterRedeemAbi,
    functionName: "redeemPositions",
});


function createCtfRedeemTxn(
    contract: string,
    conditionId: string,
    collateral: string,
): SafeTransaction {
    const calldata = encodeFunctionData({...ctf, args: [collateral, zeroHash, conditionId, [1, 2]]});
    return {
            to: contract,
            operation: OperationType.Call,
            data: calldata,
            value: "0",
    }
}

function createNrAdapterRedeemTxn(
    contract: string,
    conditionId: string,
    redeemAmounts: bigint[],
): SafeTransaction {
    const calldata = encodeFunctionData({...nrAdapter, args: [conditionId, redeemAmounts]});
    return {
            to: contract,
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
        key: `${process.env.BUILDER_API_KEY}`,
        secret: `${process.env.BUILDER_SECRET}`,
        passphrase: `${process.env.BUILDER_PASS_PHRASE}`,
    };
    const builderConfig = new BuilderConfig({
        localBuilderCreds: builderCreds
    });
    const client = new RelayClient(relayerUrl, chainId, wallet, builderConfig);

    // Set your values here
    const negRisk = false;
    const conditionId = "0x...."; // conditionId to redeem
    
    // amounts to redeem per outcome, only necessary for neg risk
    // Must be an array of length 2 with:
    // the first element being the amount of yes tokens to redeem and
    // the second element being the amount of no tokens to redeem
    const redeemAmounts = [BigInt(111000000), BigInt(0)];

    const usdc = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
    const ctf = "0x4d97dcd97ec945f40cf65f87097ace5ea0476045";
    const negRiskAdapter = "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296";

    const txn = negRisk ? createNrAdapterRedeemTxn(negRiskAdapter, conditionId, redeemAmounts) :
        createCtfRedeemTxn(ctf, conditionId, usdc);
    
    const resp = await client.execute([txn], "redeem");
    const t = await resp.wait();
    console.log(t);

}

main();
