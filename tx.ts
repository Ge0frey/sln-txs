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

(async function main () {
    //User keypair, this is the account that will pay for the transaction fee
    const keypair = await Keypair.generate();

    //Request some free sol, only works on devnet or testnet
    console.log(await requireAirdrop(keypair.publickey, 10000000)) //0.01 sol

    //Wait for the transaction to be processed by the blockchain so that our next transaction doesnt fail
    await new Promise(resolve => setTimeout(resolve, 1000));

    //The program we want to interact with, the memo program is a simple program that let's you store a string of data on the blockchain. It is a good example program to start with.
    const program = Publickey.fromBase58("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

    //A recent blockhash (Solana requires a recent blockhash for every transaction in order to prevent replay attacks and to limit it's cache size)
    const blockhash = await getLatestBlockhash();

    //A message that we are going to send to the blockchain. In this case, let's send a sha256 hash of a message I received to prove publicly that I have seen it
    const msg = Buffer.from('754d83e11643565264e7e8b564c503aac7c5fb5037e608bbf22bb701c5ff3d0f', "utf-8");

    // Lets build the transaction. (usually, you'd use `npm install
    // @solana/web3.js` for this)

    // Doing this by hand so you can see how simple transactions are.
    const addresses = [
        0x02, // Number of addresses

        ...keypair.publickey.toBuffer(),
        ...program.toBuffer(),
    ];

    const header = [
        // 3 byte header
        0x01, // Required signatures count
        0x00, // Read-only signed accounts count
        0x01, // Read-only unsigned accounts count
    ]

    const instructions = [
        0x01, // Number of instructions

        ...[ // Memo instruction
            0x01, // Program index

            0x00, // Empty array of addresses

            ...[ // Opaque Data
                msg.length,
                ...msg,
            ]
        ],

        // We can add more instructions here if we want, but we only need one.
        // We can call multiple programs in a single transaction.

        // Some programs require addresses to be passed to them. Here is an example
        // of how to do that. The memo program doesn't require any addresses, so
        // we don't need to do this for this example.

        /*
        ...[ // Memo instruction with addresses array... for some reason
            0x01, // Program index
            ...[  // List of addresses provided to the instruction
                0x02, // Number of addresses
                0x00, // Address
                0x00, // Address
            ],
            ...[ // Opaque Data
                msg.length,
                ...msg,
            ]
        ],
        */
    ]

    //Put it all together to a single message
    const message = [
        ...header,
        ...addresses,
        ...blockhash,
        ...instructions
    ];

    //Sign the message
    const sig1 = await ed.sign(Buffer.from(message), keypair.secretKey.subarray(0,32));

    const signatures = [
        0x01, //Number of signtures
        ...sig1,
    ]

})();

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

//Api for sending a transaction
async function sendTransaction(tx: Buffer) : Promise<any> {
    return await rpc("sendTransacion", [
        tx.toString("base64"),
        {"skipPrefilight": true, "encoding": "base64"}
    ]);
}