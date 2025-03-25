import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { IDL, Turbin3Prereq } from "./programs/Turbin3_prereq";
import wallet from "./Turbin3-wallet.json";

const connection = new Connection("https://api.devnet.solana.com");

const keypair = Keypair.fromSecretKey(new Uint8Array(wallet.privateKey));
const provider = new AnchorProvider(connection, new Wallet(keypair), {
    commitment: "confirmed"});
const program = new Program<Turbin3Prereq>(IDL, provider);


const github = Buffer.from("SwineCoder101", "utf8");

// Create the PDA for our enrollment account
const enrollment_seeds = [Buffer.from("pre"),
    keypair.publicKey.toBuffer()];
    const [enrollment_key, _bump] =
    PublicKey.findProgramAddressSync(enrollment_seeds, program.programId);


// Execute our enrollment transaction
(async () => {
    try {
    const txhash = await program.methods
    .submit(github)
    .accounts({
    signer: keypair.publicKey,
    })
    .signers([
    keypair
    ]).rpc();
    console.log(`Success! Check out your TX here:
    https://explorer.solana.com/tx/${txhash}?cluster=devnet`);
    } catch(e) {
    console.error(`Oops, something went wrong: ${e}`)
    }
    })();


