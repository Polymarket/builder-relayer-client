import { 
    SafeCreateTransactionArgs, 
    SignatureParams, 
    TransactionRequest, 
    TransactionType 
} from "../types";
import { SAFE_FACTORY_NAME } from "../constants";
import { deriveSafe } from "./derive";
import { IAbstractSigner } from "@polymarket/builder-abstract-signer";
import { SafeContractConfig } from "../config";
import { type Hex, getAddress, isAddress } from "viem";

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------

/**
 * EIP-712 Type definition for the Proxy Creation.
 * Defined outside the function to prevent reallocation on every call.
 */
const CREATE_PROXY_TYPES = {
    CreateProxy: [
        { name: "paymentToken", type: "address" },
        { name: "payment", type: "uint256" },
        { name: "paymentReceiver", type: "address" },
    ],
} as const;

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/**
 * Generates an EIP-712 signature for creating a Safe proxy.
 * * @param signer - The abstract signer instance.
 * @param safeFactory - The address of the Safe Factory contract.
 * @param chainId - The network Chain ID.
 * @param paymentToken - Address of the token used for payment (or 0x0).
 * @param payment - Amount of payment in uint256 string format.
 * @param paymentReceiver - Address receiving the payment.
 * @returns The hex-encoded signature string.
 */
async function createSafeCreateSignature(
    signer: IAbstractSigner,
    safeFactory: string,
    chainId: number,
    paymentToken: string,
    payment: string,
    paymentReceiver: string
): Promise<string> {
    // Validation: Ensure factory address is a valid checksum address
    if (!isAddress(safeFactory)) {
        throw new Error(`Invalid Safe Factory address: ${safeFactory}`);
    }

    const domain = {
        name: SAFE_FACTORY_NAME,
        chainId: BigInt(chainId),
        verifyingContract: getAddress(safeFactory), // Checksummed address
    };

    const values = {
        paymentToken,
        payment: BigInt(payment),
        paymentReceiver,
    };

    // Sign the typed data using the signer's interface.
    // Ensure 'CreateProxy' matches the primary type key in CREATE_PROXY_TYPES.
    return signer.signTypedData(
        domain, 
        CREATE_PROXY_TYPES, 
        values, 
        "CreateProxy"
    );
}

// --------------------------------------------------------------------------
// Main Functions
// --------------------------------------------------------------------------

/**
 * Builds a transaction request object for deploying a new Safe via the Factory.
 * * @param signer - The signer needed to generate the authorization signature.
 * @param safeContractConfig - Configuration object containing contract addresses.
 * @param args - Arguments required for the Safe creation logic.
 * @returns A structured TransactionRequest object ready for relaying or execution.
 */
export async function buildSafeCreateTransactionRequest(
    signer: IAbstractSigner,
    safeContractConfig: SafeContractConfig,
    args: SafeCreateTransactionArgs,
): Promise<TransactionRequest> {
    const safeFactory = safeContractConfig.SafeFactory;

    // Generate the EIP-712 signature required by the factory
    const sig = await createSafeCreateSignature(
        signer,
        safeFactory,
        args.chainId,
        args.paymentToken,
        args.payment,
        args.paymentReceiver
    );

    const sigParams: SignatureParams = {
        paymentToken: args.paymentToken,
        payment: args.payment,
        paymentReceiver: args.paymentReceiver,
    };

    // Calculate the counterfactual address of the Safe (CREATE2)
    // This allows us to know the address before it is deployed.
    const safeAddress = deriveSafe(args.from, safeFactory);

    // Construct the request object.
    // NOTE: 'data' is set to "0x". Ensure the execution layer handles 
    // the calldata construction based on 'TransactionType.SAFE_CREATE'.
    const request: TransactionRequest = {
        from: args.from,
        to: safeFactory,
        proxyWallet: safeAddress, 
        data: "0x", 
        signature: sig,
        signatureParams: sigParams,
        type: TransactionType.SAFE_CREATE,
    };

    return request;
}
