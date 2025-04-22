import wallet from "../wba-wallet.json"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"
import { readFile } from "fs/promises"

// Create a devnet connection
const umi = createUmi('https://api.devnet.solana.com');

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet.privateKey));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader());
umi.use(signerIdentity(signer));

const filename = "generug.png";


(async () => {
    try {
        //1. Load image
        const file = await readFile("./images/" + filename)

        //2. Convert image to generic file.
        const genericFile = await createGenericFile(file,filename,{contentType: "image/jpg"});
        //3. Upload image

        const [myUri] = await umi.uploader.upload([genericFile]);


        const irysURI = myUri.replace(
            "https://arweave.net/",
            "https://devnet.irys.xyz/"
          );
        
        console.log("Your image URI: ", myUri);
        console.log(irysURI);
    }
    catch(error) {
        console.log("Oops.. Something went wrong", error);
    }
})();
