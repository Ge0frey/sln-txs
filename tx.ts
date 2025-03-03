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

