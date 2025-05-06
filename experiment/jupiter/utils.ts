import { BN, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import path from "path";
import { fileURLToPath } from "url";

import fs from 'fs';



export const __filename = fileURLToPath(import.meta.url)
export const __dirname = path.dirname(__filename)
export const WALLET_PATH = path.join(__dirname, '..', 'dev-wallet.json')



export const MAINNET_RPC_URL = "https://api.mainnet-beta.solana.com";
export const DEVNET_RPC_URL = "https://api.devnet.solana.com";
export const LOCALNET_RPC_URL = "http://127.0.0.1:8899";

export const RPC_URL = LOCALNET_RPC_URL;



export const connection = new Connection(RPC_URL)

export const wallet = new Wallet(loadKeypair());

export const RPC = RPC_URL;


// Helper function to format `bn` values into the string USD representation
export function BNToUSDRepresentation(
  value: BN,
  exponent: number = 8,
  displayDecimals: number = 2,
): string {
  const quotient = value.divn(Math.pow(10, exponent - displayDecimals));
  const usd = Number(quotient) / Math.pow(10, displayDecimals);

  return usd.toLocaleString("en-US", {
    maximumFractionDigits: displayDecimals,
    minimumFractionDigits: displayDecimals,
    useGrouping: false,
  });
}

export const divCeil = (a: BN, b: BN) => {
  var dm = a.divmod(b);
  // Fast case - exact division
  if (dm.mod.isZero()) return dm.div;
  // Round up
  return dm.div.ltn(0) ? dm.div.isubn(1) : dm.div.iaddn(1);
};


export function generateNewKeypair() {
  const kp = Keypair.generate()
  const walletFile = {
      privateKey: Array.from(kp.secretKey),
      publicKey: kp.publicKey.toBase58()
  }
  
  fs.writeFileSync(WALLET_PATH, JSON.stringify(walletFile, null, 2))
  console.log(`\nNew Solana wallet generated!`)
  console.log(`Public Key: ${kp.publicKey.toBase58()}`)
  console.log(`Wallet saved to ${WALLET_PATH}`)
  return kp
}


export function loadKeypair() {
  if (!fs.existsSync(WALLET_PATH)) {
      console.log('No wallet found, generating a new one...')
      return generateNewKeypair()
  }
  console.log('Loading existing wallet from:', WALLET_PATH)
  const walletFile = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf8'))
  const kp = Keypair.fromSecretKey(Uint8Array.from(walletFile.privateKey))
  return kp
}