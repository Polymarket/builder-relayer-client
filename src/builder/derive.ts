import { keccak256, getCreate2Address, encodePacked, Hex, encodeAbiParameters, Address, concat, pad, toHex } from 'viem'
import { SAFE_INIT_CODE_HASH, PROXY_INIT_CODE_HASH } from "../constants";

export const deriveProxyWallet = (address: string, proxyFactory: string): string => {
    return getCreate2Address({
        bytecodeHash: PROXY_INIT_CODE_HASH as Hex,
        from: proxyFactory as Hex,
        salt: keccak256(encodePacked(["address"], [address as Hex]))}
    );
}

export const deriveSafe = (address: string, safeFactory: string) : string => {
    return getCreate2Address({
        bytecodeHash: SAFE_INIT_CODE_HASH as Hex,
        from: safeFactory as Hex,
        salt: keccak256(encodeAbiParameters([{ name: 'address', type: 'address' }], [address as Hex]))}
    );
}

/**
 * Byte constants from Solady v0.1.26 LibClone.initCodeHashERC1967.
 * These encode the minimal ERC-1967 proxy runtime bytecode.
 */
const ERC1967_CONST1: Hex = "0xcc3735a920a3ca505d382bbc545af43d6000803e6038573d6000fd5b3d6000f3";
const ERC1967_CONST2: Hex = "0x5155f3363d3d373d3d363d7f360894a13ba1a3210667c828492db98dca3e2076";
const ERC1967_PREFIX = 0x61003d3d8160233d3973n;

/**
 * Replicates Solady LibClone.initCodeHashERC1967(implementation, args).
 * Hash of: prefix(10) | implementation(20) | 0x6009(2) | const2(32) | const1(32) | args(n)
 */
function initCodeHashERC1967(implementation: Address, args: Hex): Hex {
    const n = BigInt((args.length - 2) / 2);
    const combined = ERC1967_PREFIX + (n << 56n);

    return keccak256(
        concat([
            toHex(combined, { size: 10 }),
            implementation as Hex,
            "0x6009",
            ERC1967_CONST2,
            ERC1967_CONST1,
            args,
        ]),
    );
}

/**
 * Computes the deterministic deposit wallet address for a given owner.
 * walletId is derived as bytes32(owner) - the 20-byte address left-padded to 32 bytes.
 */
export const deriveDepositWallet = (
    owner: string,
    factory: string,
    implementation: string,
): string => {
    const walletId = pad(owner as Hex, { dir: "left", size: 32 });
    const args = encodeAbiParameters(
        [{ type: "address" }, { type: "bytes32" }],
        [factory as Address, walletId],
    );
    const salt = keccak256(args);
    const bytecodeHash = initCodeHashERC1967(implementation as Address, args);

    return getCreate2Address({ from: factory as Hex, salt, bytecodeHash });
};
