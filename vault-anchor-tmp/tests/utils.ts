import * as anchor from "@coral-xyz/anchor";


export async function deriveVaultState(
  wallet: anchor.web3.PublicKey,
  programId: anchor.web3.PublicKey
): Promise<[anchor.web3.PublicKey, number]> {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("state"), wallet.toBuffer()],
    programId
  );
}

export async function deriveVault(
  vaultState: anchor.web3.PublicKey,
  programId: anchor.web3.PublicKey
): Promise<[anchor.web3.PublicKey, number]> {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), vaultState.toBuffer()],
    programId
  );
}

export async function displayAccountInfo(provider, vaultPda,vaultStatePda) {
    const vaultAccountInfo = await provider.connection.getAccountInfo(vaultPda);
    const vaultStateAccountInfo = await provider.connection.getAccountInfo(vaultStatePda);

    console.log("vault account info", vaultAccountInfo);
    console.log("vault state account info", vaultStateAccountInfo);
}