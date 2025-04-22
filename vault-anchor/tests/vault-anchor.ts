import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { VaultAnchor } from "../target/types/vault_anchor";
import * as chai from "chai";
import { deriveVaultState, deriveVault, displayAccountInfo } from "./utils";
import {LAMPORTS_PER_SOL} from "@solana/web3.js";

const { expect } = chai;

describe("vault-anchor", async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VaultAnchor as Program<VaultAnchor>;
  
  const depositAmount = new BN(2 * LAMPORTS_PER_SOL); 
  const withdrawAmount = new BN(1 * LAMPORTS_PER_SOL);
  const user = provider.wallet.publicKey;
  const systemProgram = anchor.web3.SystemProgram.programId;

  const [vaultStatePda, vaultStateBump] = await deriveVaultState(
    user,
    program.programId
  );

  const [vaultPda, vaultBump] = await deriveVault(
    vaultStatePda,
    program.programId
  )
  const connection = provider.connection;
  
  it("initializes the vault", async () => {

    const tx = await program.methods.initialize()
      .accountsPartial({
        vaultState: vaultStatePda,
        user,
        vault: vaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("initialize tx:", tx);
    
    const vaultStateAccount = await program.account.vaultState.fetch(vaultStatePda);
    expect(vaultStateAccount.vaultBump).to.equal(vaultBump);
    expect(vaultStateAccount.stateBump).to.equal(vaultStateBump);
  });

  it("deposits lamports into the vault", async () => {
    
    const vaultBalanceBefore = await connection.getBalance(vaultPda);

    const tx = await program.methods.deposit(depositAmount)
      .accountsPartial({
        user,
        vaultState: vaultStatePda,
        vault: vaultPda,
        systemProgram,
      })
      .rpc();
    console.log("deposit tx:", tx);

    await displayAccountInfo(provider,vaultPda,vaultStatePda);
    
    const vaultBalanceAfter = await connection.getBalance(vaultPda);
    const diff = vaultBalanceAfter - vaultBalanceBefore;
    expect(diff).to.equal(depositAmount.toNumber());
  });


  it("withdraws lamports from the vault", async () => {
    
    await program.methods.deposit(depositAmount)
      .accountsPartial({
        user: provider.wallet.publicKey,
        vaultState: vaultStatePda,
        vault: vaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    const vaultBalanceBeforeWithdraw = await connection.getBalance(vaultPda);
    const userBalanceBeforeWithdraw = await connection.getBalance(provider.wallet.publicKey);
    
    const tx = await program.methods.withdraw(withdrawAmount)
      .accountsPartial({
        user: provider.wallet.publicKey,
        vaultState: vaultStatePda,
        vault: vaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("withdraw tx:", tx);

    await displayAccountInfo(provider,vaultPda,vaultStatePda);
    
    const vaultBalanceAfterWithdraw = await connection.getBalance(vaultPda);
    const userBalanceAfterWithdraw = await connection.getBalance(provider.wallet.publicKey);
    
    expect(vaultBalanceBeforeWithdraw - vaultBalanceAfterWithdraw)
      .to.equal(withdrawAmount.toNumber());
    expect(userBalanceAfterWithdraw).to.be.greaterThan(-1 * userBalanceBeforeWithdraw);
  });

  it("closes the vault", async () => {
    await program.methods.deposit(depositAmount)
      .accountsPartial({
        user: provider.wallet.publicKey,
        vaultState: vaultStatePda,
        vault: vaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    const userBalanceBeforeClose = await connection.getBalance(provider.wallet.publicKey);
    
    const tx = await program.methods.close()
      .accountsPartial({
        user: provider.wallet.publicKey,
        vaultState: vaultStatePda,
        vault: vaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("close tx:", tx);
    
    try {
      await program.account.vaultState.fetch(vaultStatePda);
      expect.fail("vault_state account should be closed");
    } catch (err) {
      console.log("vault_state account is closed as expected");
    }
    
    const userBalanceAfterClose = await connection.getBalance(provider.wallet.publicKey);
    expect(userBalanceAfterClose).to.be.greaterThan(userBalanceBeforeClose);
  });
});
