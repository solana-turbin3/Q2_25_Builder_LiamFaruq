import { Transaction, SystemProgram, Connection, Keypair,
    LAMPORTS_PER_SOL, sendAndConfirmTransaction, PublicKey } from
    "@solana/web3.js";
import wallet from "./dev-wallet.json";
import * as prompt from 'prompt-sync';

const input = prompt.default();

// Import our dev wallet keypair from the wallet file
const from = Keypair.fromSecretKey(new Uint8Array(wallet.privateKey));
// Define our Turbin3 public key
const to = new PublicKey("Fp4m3VAiCJuSR88KG9QBurNg6iGs5QaXx484g6vJWTV8");

//Create a Solana devnet connection
const connection = new Connection("https://api.devnet.solana.com");

function displayMenu() {
    console.log("\nSolana Transfer Tool");
    console.log("1. Transfer 0.1 SOL to Turbin3");
    console.log("2. Empty wallet to Turbin3");
    console.log("3. Exit");
    return input("Select an option (1-3): ");
}

async function transfer01Sol() {
    try {
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: from.publicKey,
                toPubkey: to,
                lamports: LAMPORTS_PER_SOL/10,
            })
        );
        
        transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
        transaction.feePayer = from.publicKey;
        
        // Sign transaction, broadcast, and confirm
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [from]
        );
        console.log(`Success! Check out your TX here:
        https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    } catch(e) {
        console.error(`Oops, something went wrong: ${e}`)
    }
}

async function emptyDevWallet() {
    try {
        // Get balance of dev wallet
        const balance = await connection.getBalance(from.publicKey)
        
        // Create a test transaction to calculate fees
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: from.publicKey,
                toPubkey: to,
                lamports: balance,
            })
        );
        
        transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
        transaction.feePayer = from.publicKey;
        
        const fee = (await connection.getFeeForMessage(transaction.compileMessage(), 'confirmed')).value || 0;
        
        // Remove our transfer instruction to replace it
        transaction.instructions.pop();
        
        // Only proceed if we have enough balance to cover the fee
        if (balance <= fee) {
            console.log("Insufficient balance to cover transaction fee");
            return;
        }
        
        transaction.add(
            SystemProgram.transfer({
                fromPubkey: from.publicKey,
                toPubkey: to,
                lamports: balance - fee,
            })
        );
        
        // Sign transaction, broadcast, and confirm
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [from]
        );
        console.log(`Success! Check out your TX here:
        https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    } catch(e) {
        console.error(`Oops, something went wrong: ${e}`)
    }
}

async function main() {
    while (true) {
        const choice = displayMenu();
        
        switch (choice) {
            case '1':
                await transfer01Sol();
                break;
            case '2':
                await emptyDevWallet();
                break;
            case '3':
                console.log("\nGoodbye!");
                process.exit(0);
            default:
                console.log("\nInvalid option. Please try again.");
        }
    }
}

main();