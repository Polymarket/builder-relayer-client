import { expect } from "chai";
import { createAbstractSigner, IAbstractSigner } from "@polymarket/builder-abstract-signer";

import { Wallet } from "ethers";
import { JsonRpcProvider } from "@ethersproject/providers";

import { createWalletClient, http, WalletClient, zeroAddress } from "viem";
import { polygon, polygonAmoy } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { encodeProxyTransactionData } from "../../src/encode";
import { RelayClient } from "../../src/client";
import {
    buildProxyTransactionRequest,
    buildSafeCreateTransactionRequest,
    buildSafeTransactionRequest,
    deriveBeaconDepositWallet,
    deriveDepositWallet,
} from "../../src/builder";
import {
    CallType,
    OperationType,
    ProxyTransaction,
    ProxyTransactionArgs,
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
    const depositWalletBeacon = "0x7A18EDfe055488A3128f01F563e5B479D92ffc3a";

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

    const proxyTransaction: ProxyTransaction = {
        to: usdc,
        typeCode: CallType.Call,
        value: "0",
        data: approveCalldata,
    };

    const safeTransaction: SafeTransaction= {
        to: usdc,
        operation: OperationType.Call,
        value: "0",
        data: approveCalldata
    }

    describe("build proxy transaction request", async () => {
        let req: TransactionRequest;
        const expectedProxyTxnSig = "0x4c18e2d2294a00d686714aff8e7936ab657cb4655dfccb2b556efadcb7e835f800dc2fecec69c501e29bb36ecb54b4da6b7c410c4dc740a33af2afde2b77297e1b";
        const args: ProxyTransactionArgs = {
            from: address,
            gasLimit: "85338",
            gasPrice: "0",
            nonce: "0",
            relay: "0xae700edfd9ab986395f3999fe11177b9903a52f1",
            data: encodeProxyTransactionData([proxyTransaction]),
        };

        it("ethers creates a valid proxy signature", async () => {
            signer = createAbstractSigner(chainId, ethersWallet);
            req = await buildProxyTransactionRequest(
                signer,
                args,
                contractConfig.ProxyContracts,
            );
            expect(req.signature).equal(expectedProxyTxnSig);
        });

        it("viem creates a valid proxy signature", async () => {
            signer = createAbstractSigner(chainId, viemWalletClient);
            req = await buildProxyTransactionRequest(
                signer,
                args,
                contractConfig.ProxyContracts,
            );
            expect(req.signature).equal(expectedProxyTxnSig);
        });
    });

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

    describe("derive deposit wallet address", () => {
        it("derives the legacy UUPS deposit wallet address", () => {
            const wallet = deriveDepositWallet(
                "0x0000000000000000000000000000000000000001",
                contractConfig.DepositWalletContracts.DepositWalletFactory,
                contractConfig.DepositWalletContracts.DepositWalletImplementation,
            );

            expect(wallet.toLowerCase()).equal("0x57ffbc34de23124faeb8387fcd689d314e57accd");
        });

        it("derives the beacon deposit wallet address", () => {
            const wallet = deriveBeaconDepositWallet(
                "0x0000000000000000000000000000000000000001",
                contractConfig.DepositWalletContracts.DepositWalletFactory,
                depositWalletBeacon,
            );

            expect(wallet.toLowerCase()).equal("0x94bf330955a0b957662feaf878de77bf25f76cd9");
        });

        it("uses factory beacon detection for the client expected address", async () => {
            const client = new RelayClient("http://localhost:8080", chainId, ethersWallet);
            (client as unknown as { publicClient: { call: () => Promise<{ data: string }> } }).publicClient = {
                call: async () => ({ data: `0x000000000000000000000000${depositWalletBeacon.slice(2)}` }),
            };

            const wallet = await client.deriveDepositWalletAddress();
            const expectedWallet = deriveBeaconDepositWallet(
                address,
                contractConfig.DepositWalletContracts.DepositWalletFactory,
                depositWalletBeacon,
            );

            expect(wallet).equal(expectedWallet);
        });

        it("falls back to the legacy UUPS address when the factory has no beacon", async () => {
            const client = new RelayClient("http://localhost:8080", chainId, ethersWallet);
            (client as unknown as { publicClient: { call: () => Promise<{ data: string }> } }).publicClient = {
                call: async () => ({ data: `0x000000000000000000000000${zeroAddress.slice(2)}` }),
            };

            const wallet = await client.deriveDepositWalletAddress();
            const expectedWallet = deriveDepositWallet(
                address,
                contractConfig.DepositWalletContracts.DepositWalletFactory,
                contractConfig.DepositWalletContracts.DepositWalletImplementation,
            );

            expect(wallet).equal(expectedWallet);
        });

        it("rejects an options chain that does not match the chain id", () => {
            expect(() => new RelayClient(
                "http://localhost:8080",
                chainId,
                ethersWallet,
                undefined,
                undefined,
                { chain: polygonAmoy },
            )).to.throw("chain id does not match chainId");
        });
    });
});
