import fetch from 'node-fetch'; //For http requests
import bs58 from "bs58"; //For encoding and decoding base 58 text
import * as ed from '@noble/ed25519'; //cryptographic library used to create keypairs
const cluster = "https://api.devnet.solana.com";

class Publickey {
    key: Uint8Array;

    constructor(key: Uint8Array) {
        this.key = key;
    }

    static fromBase58(str: string): Publickey {
        return new Publickey(bs58.decode(str));
    }

    toBase58(): string {
        return bs58.encode(this.key);
    }

    toBuffer(): Buffer {
        return Buffer.from(this.key);
    }
}

class Keypair {
    secretKey: Uint8Array;
    publickey: Publickey;

    constructor(secretKey: Uint8Array, publickey: Publickey) {
        this.secretKey = secretKey;
        this.publickey = publickey;
    }

    static async generate(): Promise<Keypair> {
        const secretKey = ed.utils.randomPrivateKey();
        const publickey = new Publickey(await ed.getPublicKey(secretKey));

        return new Keypair(secretKey, publickey);
    }
}

//API for interacting with the blockchain
async function rpc(method:string,param:any) : Promise<any> {
    const res = await fetch(cluster, {
        method: "post",
        body: JSON.stringify ({jsonrpc: "2.0", id: 1, method, param, }),
        headers: {'Content-Type': 'application/json'}
    });
    const json = await res.json();
    return json;
}

//API for getting free native tokens
async function requireAirdrop(address: Publickey, amount: number) : Promise<any> {
    return await rpc("requestAirdrop",[address.toBase58(), amount]);
}

//Api for getting a recent blockhash
async function getLatestBlockhash() : Promise<Buffer> {
    const {result} = await rpc("getRecentBlockhash", [{"commitment":"processed"}]);
    return Buffer.from(bs58.decode(result.value.blockhash))
}