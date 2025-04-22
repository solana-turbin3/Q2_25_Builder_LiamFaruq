import { Keypair, PublicKey, Connection, Commitment } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import wallet from "../wba-wallet.json"
import dotenv from "dotenv";

dotenv.config();

const MINT_ADDRESS = process.env.MINT_ADDRESS || '6bgdDfKmMLmkyHmSTaeJ2FDGudRqCsWdf58wJMGZsKxi';

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet.privateKey));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

const token_decimals = 6;

// Mint address
const mint = new PublicKey(MINT_ADDRESS);

(async () => {
    try {
        const ata = await getOrCreateAssociatedTokenAccount(
            connection, keypair, mint, keypair.publicKey
        );
        const mintTx = await mintTo(
            connection, keypair, mint, ata.address, keypair.publicKey, 1_000_000 * Math.pow(10, token_decimals)
        );
        console.log(`Mint transaction: ${mintTx}`);
    } catch(error) {
        console.log(`Oops, something went wrong: ${error}`)
    }
})()
