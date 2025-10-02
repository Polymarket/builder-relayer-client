import { 
    concatHex,
    encodeFunctionData, 
    encodePacked, 
    Hex, 
    prepareEncodeFunctionData, 
    size 
} from "viem";

import { multisendAbi } from "../abis";
import { OperationType, SafeTransaction } from "../types";

const multisend = prepareEncodeFunctionData({
    abi: multisendAbi,
    functionName: "multiSend",
});

export const createSafeMultisendTransaction = (txns: SafeTransaction[], safeMultisendAddress: string): SafeTransaction => {
    const args = [
        concatHex(
            txns.map(tx =>
                encodePacked(
                    ["uint8", "address", "uint256", "uint256", "bytes"], 
                    [tx.operation, tx.to as Hex, BigInt(tx.value), BigInt(size(tx.data as Hex)), tx.data as Hex]
                ),
            ),
        ),
    ];
    const data = encodeFunctionData({...multisend, args: args});
    return {
        to: safeMultisendAddress,
        value: "0",
        data: data,
        operation: OperationType.DelegateCall,
    }
}
