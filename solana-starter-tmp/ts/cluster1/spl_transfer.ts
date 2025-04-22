import { Commitment, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"
import wallet from "../wba-wallet.json"
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";
import dotenv from 'dotenv';

dotenv.config();
const RECIPIENT_ADDRESS= process.env.RECIPIENT_ADDRESS || '';
const MINT_ADDRESS= process.env.MINT_ADDRESS || '';

// We're going to import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet.privateKey));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

// Mint address
const mint = new PublicKey(MINT_ADDRESS);

// Recipient address
const to = new PublicKey(RECIPIENT_ADDRESS);
const from = keypair.publicKey;


(async () => {
    try {
        // Get the token account of the fromWallet address, and if it does not exist, create it
        const fromAta = await getOrCreateAssociatedTokenAccount(connection,keypair,mint,from);
        
        // Get the token account of the toWallet address, and if it does not exist, create it
        const toAta =  await getOrCreateAssociatedTokenAccount(connection, keypair, mint, to);
        
        // Transfer the new token to the "toTokenAccount" we just created
        const signature = await transfer(connection, keypair, fromAta.address, toAta.address, from, 1e6);

        console.log('Signature: ', signature)

    } catch(e) {
        console.error(`Oops, something went wrong: ${e}`)
    }
})();