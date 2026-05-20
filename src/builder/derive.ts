import {
    keccak256,
    getCreate2Address,
    encodePacked,
    Hex,
    encodeAbiParameters,
    Address,
    concat,
    pad,
    toHex,
    zeroAddress,
    getAddress,
    type PublicClient,
} from 'viem'
import { SAFE_INIT_CODE_HASH, PROXY_INIT_CODE_HASH } from "../constants";

/**
 * Standard ERC-1967 implementation slot:
 *   bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1)
 * Set on UUPS proxies; unused (zero) on Solady's beacon proxy template.
 */
export const ERC1967_IMPLEMENTATION_SLOT: Hex =
    "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

/**
 * Standard ERC-1967 beacon slot:
 *   bytes32(uint256(keccak256("eip1967.proxy.beacon")) - 1)
 * Set on beacon proxies; unused (zero) on UUPS proxies.
 */
export const ERC1967_BEACON_SLOT: Hex =
    "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";

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
 *
 * Thin wrapper around {@link determineUUPSAddress}; the signature is kept stable
 * because this is the README-facing entry point.
 */
export const deriveDepositWallet = (
    owner: string,
    factory: string,
    implementation: string,
): string => determineUUPSAddress(owner, factory, implementation);

/**
 * Byte constants from Solady v0.1.26 LibClone.initCodeHashERC1967BeaconProxy.
 * These encode the minimal ERC-1967 beacon proxy runtime bytecode.
 */
const ERC1967_BEACON_CONST1: Hex = "0xb3582b35133d50545afa5036515af43d6000803e604d573d6000fd5b3d6000f3";
const ERC1967_BEACON_CONST2: Hex = "0x1b60e01b36527fa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6c";
const ERC1967_BEACON_CONST3: Hex = "0x60195155f3363d3d373d3d363d602036600436635c60da";
const ERC1967_BEACON_PREFIX = 0x6100523d8160233d3973n;

/**
 * Replicates Solady LibClone.initCodeHashERC1967BeaconProxy(beacon, args).
 * Hash of: prefix(10) | beacon(20) | const3(23) | const2(32) | const1(32) | args(n)
 */
function initCodeHashERC1967BeaconProxy(beacon: Address, args: Hex): Hex {
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

/**
 * Low-level: predicts the deterministic address a deposit wallet would have
 * if deployed as a UUPS (ERC-1967) proxy pointing at `implementation` by `factory`.
 * Mirrors {@link deriveDepositWallet}'s derivation and is intended as a primitive
 * that callers can compose; the README-facing {@link deriveDepositWallet} entry
 * point is intentionally left unchanged.
 */
export const determineUUPSAddress = (
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

/**
 * Low-level: predicts the deterministic address a deposit wallet would have
 * if deployed as an ERC-1967 beacon proxy bound to `beacon` by `factory`.
 * Matches DepositWalletFactory._predictWalletAddress (Solady
 * LibClone.predictDeterministicAddressERC1967BeaconProxy) so the result
 * equals the onchain factory's prediction for the same owner/id.
 */
export const determineBeaconAddress = (
    owner: string,
    factory: string,
    beacon: string,
): string => {
    const walletId = pad(owner as Hex, { dir: "left", size: 32 });
    const args = encodeAbiParameters(
        [{ type: "address" }, { type: "bytes32" }],
        [factory as Address, walletId],
    );
    const salt = keccak256(args);
    const bytecodeHash = initCodeHashERC1967BeaconProxy(beacon as Address, args);

    return getCreate2Address({ from: factory as Hex, salt, bytecodeHash });
};

async function readSlotAddress(
    client: PublicClient,
    walletAddress: string,
    slot: Hex,
): Promise<Address> {
    const raw = await client.getStorageAt({ address: walletAddress as Address, slot });
    if (!raw || raw === "0x") return zeroAddress;
    const word = pad(raw as Hex, { size: 32, dir: "left" });
    return getAddress("0x" + word.slice(-40));
}

/**
 * Low-level: returns the address stored in the wallet's ERC-1967 implementation slot.
 * Returns the zero address when the slot is empty (e.g. the wallet is a beacon
 * proxy, or the address has no code).
 */
export const getImplementationSlotAddress = (
    client: PublicClient,
    walletAddress: string,
): Promise<Address> => readSlotAddress(client, walletAddress, ERC1967_IMPLEMENTATION_SLOT);

/**
 * Low-level: returns the address stored in the wallet's ERC-1967 beacon slot.
 * Returns the zero address when the slot is empty (e.g. the wallet is a UUPS
 * proxy, or the address has no code).
 */
export const getBeaconSlotAddress = (
    client: PublicClient,
    walletAddress: string,
): Promise<Address> => readSlotAddress(client, walletAddress, ERC1967_BEACON_SLOT);

/**
 * Low-level: true iff the wallet has a non-zero address in its ERC-1967 beacon slot.
 */
export const isBeaconProxy = async (
    client: PublicClient,
    walletAddress: string,
): Promise<boolean> => {
    const beacon = await getBeaconSlotAddress(client, walletAddress);
    return beacon !== zeroAddress;
};

/**
 * Low-level: true iff the wallet has a non-zero address in its ERC-1967
 * implementation slot. Note that legacy UUPS deposit wallets migrated via
 * BeaconForwarder still satisfy this check - they are structurally UUPS
 * proxies whose implementation happens to forward to the beacon.
 */
export const isUUPSProxy = async (
    client: PublicClient,
    walletAddress: string,
): Promise<boolean> => {
    const impl = await getImplementationSlotAddress(client, walletAddress);
    return impl !== zeroAddress;
};
