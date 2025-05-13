import * as anchor from "@coral-xyz/anchor";
import { Program, } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import * as spl from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import { assert } from "chai";

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Escrow as Program<Escrow>;

  // Test constants
  const SEED = new anchor.BN(1234);
  const DEPOSIT_AMOUNT = new anchor.BN(1000);
  const RECEIVE_AMOUNT = new anchor.BN(500);
  const DECIMALS = 9;

  // Test accounts
  let maker: Keypair;
  let taker: Keypair;
  let mintA: PublicKey;
  let mintB: PublicKey;
  let makerAtaA: PublicKey;
  let makerAtaB: PublicKey;
  let takerAtaA: PublicKey;
  let takerAtaB: PublicKey;

  const anchorWallet = provider.wallet as anchor.Wallet;

  before(async () => {
    // Create and fund keypairs
    maker = Keypair.generate();
    taker = Keypair.generate();

    await fundAccount(maker.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await fundAccount(taker.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);

    // Create mints
    mintA = await createMint(DECIMALS);
    mintB = await createMint(DECIMALS);

    // Create ATAs
    makerAtaA = await createATA(mintA, maker);
    makerAtaB = await createATA(mintB, maker);
    takerAtaA = await createATA(mintA, taker);
    takerAtaB = await createATA(mintB, taker);

    // Mint tokens
    const mintAmount = new anchor.BN(10 ** DECIMALS);

    console.log(`Maker address: ${maker.publicKey.toBase58()}`);
    console.log(`Taker address: ${taker.publicKey.toBase58()}`);
    console.log(`Mint A address: ${mintA.toBase58()}`);
    console.log(`Mint B address: ${mintB.toBase58()}`);
    console.log(`Maker ATA A address: ${makerAtaA.toBase58()}`);
    console.log(`Maker ATA B address: ${makerAtaB.toBase58()}`);
    console.log(`Taker ATA A address: ${takerAtaA.toBase58()}`);
    console.log(`Taker ATA B address: ${takerAtaB.toBase58()}`);

    console.log(`anchor wallet: ${provider.wallet.publicKey.toBase58()}`);

    await mintTo(mintA, makerAtaA, mintAmount);
    await mintTo(mintB, takerAtaB, mintAmount);
  });

  async function fundAccount(pubkey: anchor.web3.PublicKey, amount: number) {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(pubkey, amount),
      "confirmed"
    );
  }

  async function createMint(decimals: number): Promise<PublicKey> {
    return await spl.createMint(
      provider.connection,
      maker,
      provider.wallet.publicKey,
      null,
      decimals
    );
  }

  async function createATA(mint: anchor.web3.PublicKey, owner: Keypair) {
    const ata = await spl.getAssociatedTokenAddress(
      mint,
      owner.publicKey,
      false,
      spl.TOKEN_PROGRAM_ID
    );
    await spl.createAssociatedTokenAccount(
      provider.connection,
      owner,
      mint,
      owner.publicKey
    );
    return ata;
  }

  async function mintTo(mint: anchor.web3.PublicKey, ata: anchor.web3.PublicKey,  amount: anchor.BN) {
    await spl.mintTo(
      provider.connection,
      anchorWallet.payer,
      mint,
      ata,
      anchorWallet.publicKey,
      amount.toNumber()
    );
  }

  it("should execute full escrow flow exchange between maker and taker", async () => {
    // Derive escrow PDA
    const [escrowPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("escrow"),
        maker.publicKey.toBuffer(),
        SEED.toBuffer("le", 8)
      ],
      program.programId
    );

    // Get vault address
    const vault = await spl.getAssociatedTokenAddress(
      mintA,
      escrowPDA,
      true,
      spl.TOKEN_PROGRAM_ID
    );

    // Execute make instruction
    await program.methods
      .make(SEED, DEPOSIT_AMOUNT, RECEIVE_AMOUNT, bump)
      .accountsPartial({
        maker: maker.publicKey,
        mintA,
        mintB,
        makerAtaA: makerAtaA,
        escrow: escrowPDA,
        vault: vault,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([maker])
      .rpc();

    // Verify escrow creation
    const escrowAccount = await program.account.escrow.fetch(escrowPDA);
    assert.isTrue(escrowAccount.maker.equals(maker.publicKey));
    assert.equal(escrowAccount.receiveAmount.toNumber(), RECEIVE_AMOUNT.toNumber());

    // Verify vault deposit
    const vaultBalance = await spl.getAccount(provider.connection, vault);
    assert.equal(vaultBalance.amount.toString(), DEPOSIT_AMOUNT.toNumber().toString());

    // Execute take instruction
    await program.methods
      .take(RECEIVE_AMOUNT)
      .accountsStrict({
        taker: taker.publicKey,
        maker: maker.publicKey,
        mintA,
        mintB,
        takerAtaA: takerAtaA,
        takerAtaB: takerAtaB,
        makerAtaB: makerAtaB,
        escrow: escrowPDA,
        vault: vault,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([taker, maker])
      .rpc();

    // Verify balances after take
    const takerAtaBBalance = await spl.getAccount(provider.connection, takerAtaB);
    assert.equal(takerAtaBBalance.amount.toString(), (10 ** DECIMALS - RECEIVE_AMOUNT.toNumber()).toString());

    const makerAtaBBalance = await spl.getAccount(provider.connection, makerAtaB);
    assert.equal(makerAtaBBalance.amount.toString(), RECEIVE_AMOUNT.toNumber().toString());

    const takerAtaABalance = await spl.getAccount(provider.connection, takerAtaA);
    assert.equal(takerAtaABalance.amount.toString(), DEPOSIT_AMOUNT.toNumber().toString());

    // Verify vault closure
    try {
      await spl.getAccount(provider.connection, vault);
      assert.fail("Vault should be closed");
    } catch (err) {
      assert.include(err.message, "Account does not exist");
    }
  });

  it("should allow refund", async () => {
    // Derive escrow PDA
    const [escrowPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("escrow"),
        maker.publicKey.toBuffer(),
        SEED.toBuffer("le", 8)
      ],
      program.programId
    );

    // Create and fund escrow first
    const vault = await spl.getAssociatedTokenAddress(
      mintA,
      escrowPDA,
      true,
      spl.TOKEN_PROGRAM_ID
    );

    await program.methods
      .make(SEED, DEPOSIT_AMOUNT, RECEIVE_AMOUNT, bump)
      .accountsStrict({
        maker: maker.publicKey,
        mintA,
        mintB,
        makerAtaA,
        escrow: escrowPDA,
        vault: vault,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([maker])
      .rpc();

    // Execute refund
    await program.methods
      .refund()
      .accountsStrict({
        maker: maker.publicKey,
        mintA,
        makerAtaA,
        escrow: escrowPDA,
        vault: vault,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([maker])
      .rpc();

    // Verify refund
    const makerBalance = await spl.getAccount(provider.connection, makerAtaA);
    assert.equal(makerBalance.amount.toString(), (10 ** DECIMALS).toString());

    // Verify account closure
    try {
      await program.account.escrow.fetch(escrowPDA);
      assert.fail("Escrow should be closed");
    } catch (err) {
      assert.include(err.message, "Account does not exist");
    }
  });
});