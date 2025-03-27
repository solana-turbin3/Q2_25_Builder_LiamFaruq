import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import wallet from "./Turbin3-wallet.json"
import { IDL, Turbin3Prereq } from "./programs/Turbin3_prereq";

const pda_found = 'AurWgqMZjA16LLwP3j6rBvdV5FBd1Cfyn58qgseEuAS';
const connection = new Connection("https://api.devnet.solana.com");

const keypair = Keypair.fromSecretKey(new Uint8Array(wallet.privateKey));
const provider = new AnchorProvider(connection, new Wallet(keypair), {
    commitment: "confirmed"});
const program = new Program<Turbin3Prereq>(IDL, provider);
const enrollment_seeds = [Buffer.from("preQ225"),
    keypair.publicKey.toBuffer()];
    const [enrollment_key, _bump] =
    PublicKey.findProgramAddressSync(enrollment_seeds, program.programId);

console.log(`Enrollment Key: ${enrollment_key.toBase58()}`);
console.log(`PDA Found: ${pda_found}`);
