import { expect } from "chai";
import { createAbstractSigner, IAbstractSigner } from "@polymarket/builder-abstract-signer";

import { Wallet } from "ethers";
import { JsonRpcProvider } from "@ethersproject/providers";

import { createWalletClient, http, WalletClient, zeroAddress } from "viem";
import { polygon } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

import { buildSafeCreateTransactionRequest, buildSafeTransactionRequest } from "../../src/builder";
import {
    OperationType,
    SafeCreateTransactionArgs, 
    SafeTransaction, 
    SafeTransactionArgs, 
    TransactionRequest 
} from "../../src/types";
import { getContractConfig } from "../../src/config";



describe("setup", () => {
    const chainId = 137;
    const contractConfig = getContractConfig(chainId);
    let signer: IAbstractSigner;
    // publicly known private key
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

    // publicly known RPC url
    const rpcUrl = "https://polygon-rpc.com";

    // Calldata to approve CTF as spender on USDC
    const usdc = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
    const approveCalldata = "0x095ea7b30000000000000000000000004d97dcd97ec945f40cf65f87097ace5ea0476045ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

    // ethers signer
    const w = new Wallet(privateKey);
    const ethersWallet: Wallet = w.connect(new JsonRpcProvider(rpcUrl));

    // viem signer
    const viemAccount = privateKeyToAccount(privateKey);
    const viemWalletClient: WalletClient = createWalletClient({
        account: viemAccount,
        chain: polygon,
        transport: http(rpcUrl),
    });

    const safeTransaction: SafeTransaction= {
        to: usdc,
        operation: OperationType.Call,
        value: "0",
        data: approveCalldata
    }

    describe("build safe transaction request", async () => {
        let req: TransactionRequest;
        const expectedSafeTxnSig = "0xf368488355b0566e99eff3bccc35e98b77d8f3a6e6866176188488c34f0305b07e4a4c600c7a1592e4ac1e96b5887ebff2cb26987a3ad501006b39944df098c21f";
        const args: SafeTransactionArgs = {
            from: address,
            nonce: "0",
            chainId,
            transactions: [safeTransaction],
        };

        it("ethers creates a valid safe signature", async () => {
            signer = createAbstractSigner(chainId, ethersWallet);
            req = await buildSafeTransactionRequest(
                signer,
                args,
                contractConfig.SafeContracts,
            );
            expect(req.signature).equal(expectedSafeTxnSig);
        });

        it("viem creates a valid safe signature", async () => {
            signer = createAbstractSigner(chainId, viemWalletClient);
            req = await buildSafeTransactionRequest(
                signer,
                args,
                contractConfig.SafeContracts,
            );
            expect(req.signature).equal(expectedSafeTxnSig);
        });
    });

    describe("build safe create transaction request", async () => {
        let req: TransactionRequest;
        const expectedSafeCreateTxnSig = "0xe3e791c24134b7bebe93b4771bd07c7fe7bbe115eeb0bf629ac3b7a435e7ac8d05f979729d873f7d0e16205becf48ee450aa382bc28c65eedcd6454e81d81f921b";
        const args: SafeCreateTransactionArgs = {
            from: address,
            chainId,
            paymentToken: zeroAddress,
            payment: "0",
            paymentReceiver: zeroAddress,
        };

        it("ethers creates a valid safe-create signature", async () => {
            signer = createAbstractSigner(chainId, ethersWallet);
            req = await buildSafeCreateTransactionRequest(
                signer,
                contractConfig.SafeContracts,
                args,
            );
            expect(req.signature).equal(expectedSafeCreateTxnSig);
        });

        it("viem creates a valid safe-create signature", async () => {
            signer = createAbstractSigner(chainId, viemWalletClient);
            req = await buildSafeCreateTransactionRequest(
                signer,
                contractConfig.SafeContracts,
                args,
            );
            expect(req.signature).equal(expectedSafeCreateTxnSig);

        });
    });
});