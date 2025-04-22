import wallet from "../wba-wallet.json";
// import authorityWallet from "../wba-wallet.json";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
    createMetadataAccountV3,
    CreateMetadataAccountV3InstructionAccounts,
    CreateMetadataAccountV3InstructionArgs,
    DataV2Args
} from "@metaplex-foundation/mpl-token-metadata";
import { createSignerFromKeypair, publicKey, signerIdentity } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import dotenv from 'dotenv';

dotenv.config();

const MINT_ADDRESS = process.env.MINT_ADDRESS || '';

// Define our Mint address
const mint = new PublicKey(MINT_ADDRESS);
const mintUmi = publicKey(MINT_ADDRESS);

// Create a UMI connection
const umi = createUmi('https://api.devnet.solana.com');
const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet.privateKey));
const signer = createSignerFromKeypair(umi, keypair);
umi.use(signerIdentity(createSignerFromKeypair(umi, keypair)));

const [mintPDA, bump] = PublicKey.findProgramAddressSync([Buffer.from('metadata'), mint.toBuffer()], TOKEN_PROGRAM_ID);
const mintUmiPDA = publicKey(mintPDA.toBase58());

(async () => {
    try {
        // Start here
        let accounts: CreateMetadataAccountV3InstructionAccounts = {
            mint: mintUmi,
            // metadata: mintUmiPDA,
            mintAuthority: signer,
        }

        let data: DataV2Args = {
            name: "Swine Coder",
            symbol: "SWINE",
            uri: "https://some-uri.com",
            sellerFeeBasisPoints: 6,
            creators: null,
            collection: null,
            uses: null,
        }

        let args: CreateMetadataAccountV3InstructionArgs = {
            data,
            isMutable: true,
            collectionDetails: null,
        }

        let tx = createMetadataAccountV3(
            umi,
            {
                ...accounts,
                ...args
            }
        )
        let result = await tx.sendAndConfirm(umi);
        console.log(bs58.encode(result.signature));
    } catch(e) {
        console.error(`Oops, something went wrong: ${e}`)
    }
})();
