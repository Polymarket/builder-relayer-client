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
const ERC1967_BEACON_CONST1: Hex = "0xb3582b35133d50545afa5036515af43d6000803e604d573d6000fd5b3d6000f3";
const ERC1967_BEACON_CONST2: Hex = "0x1b60e01b36527fa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6c";
const ERC1967_BEACON_CONST3: Hex = "0x60195155f3363d3d373d3d363d602036600436635c60da";
const ERC1967_BEACON_PREFIX = 0x6100523d8160233d3973n;

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
 * Replicates Solady LibClone.initCodeHashERC1967Beacon(beacon, args).
 */
function initCodeHashERC1967Beacon(beacon: Address, args: Hex): Hex {
    const n = BigInt((args.length - 2) / 2);
    const combined = ERC1967_BEACON_PREFIX + (n << 56n);

    return keccak256(
        concat([
            toHex(combined, { size: 10 }),
            beacon as Hex,
            ERC1967_BEACON_CONST3,
            ERC1967_BEACON_CONST2,
            ERC1967_BEACON_CONST1,
            args,
        ]),
    );
}

function depositWalletArgs(owner: string, factory: string): Hex {
    const walletId = pad(owner as Hex, { dir: "left", size: 32 });
    return encodeAbiParameters(
        [{ type: "address" }, { type: "bytes32" }],
        [factory as Address, walletId],
    );
}

/**
 * Computes the deterministic deposit wallet address for a given owner.
 * walletId is derived as bytes32(owner) - the 20-byte address left-padded to 32 bytes.
 * @deprecated Use RelayClient.deriveDepositWalletAddress(). This helper only derives legacy UUPS deposit wallet addresses.
 */
export const deriveDepositWallet = (
    owner: string,
    factory: string,
    implementation: string,
): string => {
    const args = depositWalletArgs(owner, factory);
    const salt = keccak256(args);
    const bytecodeHash = initCodeHashERC1967(implementation as Address, args);

    return getCreate2Address({ from: factory as Hex, salt, bytecodeHash });
};

/**
 * Computes the deterministic beacon deposit wallet address for a given owner.
 */
export const deriveBeaconDepositWallet = (
    owner: string,
    factory: string,
    beacon: string,
): string => {
    const args = depositWalletArgs(owner, factory);
    const salt = keccak256(args);
    const bytecodeHash = initCodeHashERC1967Beacon(beacon as Address, args);

    return getCreate2Address({ from: factory as Hex, salt, bytecodeHash });
};
