import wallet from "../wba-wallet.json"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"
import dotenv from "dotenv";


dotenv.config();

const IMAGE_URI = process.env.IMAGE_URI || "https://devnet.irys.xyz/";
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

// Create a devnet connection
const umi = createUmi(RPC_URL);

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet.privateKey));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader());
umi.use(signerIdentity(signer));

const filename = "generug.png";

(async () => {
    try {

        umi.use(irysUploader({address: IMAGE_URI,}));
        // Follow this JSON structure
        // https://docs.metaplex.com/programs/token-metadata/changelog/v1.0#json-structure

        const image = "https://devnet.irys.xyz/EFiduCuCZjeZYfnwT1LagEhf99perUFoZadrCHB3xtu8";

        const metadata = {
            name: "Swine Rug",
            symbol: "SRUG",
            description: "This is swinecoder's generated rug :-) from turbin3 Q2 2025 cohort",
            image,
            attributes: [
                {trait_type: 'Perfection', value: '100000%'},
                {trait_type: 'Emotion', value: 'Happiness'}
            ],
            properties: {
                files: [
                    {
                        type: "image/png",
                        uri: "?"
                    },
                ]
            },
            creators: []
        };
        const myUri = await umi.uploader.uploadJson(metadata);

        const irysURI = myUri.replace(
            "https://arweave.net/",
            "https://devnet.irys.xyz/"
          );
        console.log("Your metadata URI: ", irysURI);
    }
    catch(error) {
        console.log("Oops.. Something went wrong", error);
    }
})();
