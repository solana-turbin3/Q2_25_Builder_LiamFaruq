import { Wallet } from '@project-serum/anchor';
import {
    Liquidity,
    LiquidityPoolKeysV4,
    Token,
    TokenAmount,
    TxVersion,
    WSOL
} from "@raydium-io/raydium-sdk";
import {
    createAssociatedTokenAccountInstruction,
    createSyncNativeInstruction,
    getAccount,
    getAssociatedTokenAddress,
    NATIVE_MINT,
    TOKEN_PROGRAM_ID,
    Account as TokenAccount,
} from "@solana/spl-token";
import { AccountInfo, AddressLookupTableProgram, Commitment, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, VersionedTransaction } from "@solana/web3.js";
import BN from 'bn.js';
import fetch from 'cross-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const WALLET_PATH = path.join(__dirname, '..', 'dev-wallet.json')

const RPC_URL = "http://127.0.0.1:8899"
const connection = new Connection(RPC_URL)

const wallet = new Wallet(loadKeypair());

// Token mints
const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// Raydium program ID
const RAYDIUM_PROGRAM_ID = new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8");

// Known Raydium pool addresses for SOL/USDC
const RAYDIUM_POOLS = [
    new PublicKey("58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2"),
    new PublicKey("5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"),
    new PublicKey("HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy7tj5KdjK1MCF"),
];

interface PoolInfo {
    pubkey: PublicKey;
    account: AccountInfo<Buffer>;
}

function generateNewKeypair() {
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

async function createAddressLookupTable() {
    try {
        console.log('Creating address lookup table...');
        const slot = await connection.getSlot();
        console.log('Current slot:', slot);
        
        // Get the latest blockhash to ensure we have a recent slot
        const latestBlockhash = await connection.getLatestBlockhash();
        console.log('Latest blockhash:', latestBlockhash.blockhash);
        
        const [lookupTableInst, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
            authority: wallet.publicKey,
            payer: wallet.publicKey,
            recentSlot: latestBlockhash.lastValidBlockHeight,
        });

        console.log("Lookup table address:", lookupTableAddress.toBase58());

        // Create and send the transaction
        const transaction = new Transaction();
        transaction.recentBlockhash = latestBlockhash.blockhash;
        transaction.feePayer = wallet.publicKey;
        transaction.add(lookupTableInst);

        const signature = await connection.sendTransaction(transaction, [wallet.payer]);
        await connection.confirmTransaction({
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        });

        console.log("Lookup table created successfully!");
        console.log(`Transaction: https://solscan.io/tx/${signature}`);
        return lookupTableAddress;
    } catch (error) {
        console.error('Error creating lookup table:', error);
        throw error;
    }
}

async function swapSolForUsdc(amountInLamports: number = 100000000, slippageBps: number = 50) {
    try {
        console.log('Starting SOL to USDC swap...');
        console.log(`Amount: ${amountInLamports / LAMPORTS_PER_SOL} SOL`);
        console.log(`Slippage: ${slippageBps / 100}%`);

        // First try with Jupiter
        try {
            return await swapWithJupiter(amountInLamports, slippageBps);
        } catch (error) {
            console.log('Jupiter swap failed, trying Raydium...');
            return await swapWithRaydium(amountInLamports, slippageBps);
        }
    } catch (error) {
        console.error('Error during swap:', error);
        throw error;
    }
}

async function swapWithJupiter(amountInLamports: number, slippageBps: number) {
    try {
        // Get quote from Jupiter
        const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=${amountInLamports}&slippageBps=${slippageBps}`;
        console.log('Fetching quote from:', quoteUrl);
        
        const quoteResponse = await fetch(quoteUrl);
        console.log('Quote response status:', quoteResponse.status);
        
        if (!quoteResponse.ok) {
            const errorText = await quoteResponse.text();
            console.error('Quote API error:', errorText);
            throw new Error(`Failed to get quote: ${quoteResponse.status} ${errorText}`);
        }

        const quoteData = await quoteResponse.json();
        console.log('Quote data:', JSON.stringify(quoteData, null, 2));

        if (!quoteData.outAmount) {
            throw new Error('Failed to get quote from Jupiter');
        }

        console.log('Quote received:');
        console.log(`Input: ${amountInLamports / LAMPORTS_PER_SOL} SOL`);
        console.log(`Output: ${quoteData.outAmount / 1000000} USDC`);
        console.log(`Price Impact: ${quoteData.priceImpactPct}%`);

        // Get swap transaction
        const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quoteResponse: quoteData,
                userPublicKey: wallet.publicKey.toString(),
                wrapAndUnwrapSol: true,
            })
        });

        if (!swapResponse.ok) {
            const errorText = await swapResponse.text();
            console.error('Swap API error:', errorText);
            throw new Error(`Failed to get swap transaction: ${swapResponse.status} ${errorText}`);
        }

        const { swapTransaction } = await swapResponse.json();

        if (!swapTransaction) {
            throw new Error('Failed to get swap transaction from Jupiter');
        }

        // Deserialize the transaction
        const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
        const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

        // Sign the transaction
        transaction.sign([wallet.payer]);

        const latestBlockHash = await connection.getLatestBlockhash();

        // Execute the transaction
        console.log('Sending transaction...');
        const rawTransaction = transaction.serialize();
        const txid = await connection.sendRawTransaction(rawTransaction, {
            skipPreflight: true,
            maxRetries: 2
        });

        console.log('Transaction sent, waiting for confirmation...');
        await connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: txid
        });

        console.log('Swap completed successfully!');
        console.log(`Transaction: https://solscan.io/tx/${txid}`);
        return txid;
    } catch (error) {
        console.error('Error during swap:', error);
        throw error;
    }
}

async function wrapSol(amountInLamports: number) {
    try {
        console.log('Creating wrapped SOL account...');
        
        // Get the ATA for wrapped SOL
        const wsolAta = await getAssociatedTokenAddress(
            NATIVE_MINT,
            wallet.publicKey
        );

        console.log('Wrapped SOL ATA:', wsolAta.toString());

        // Create the transaction
        const transaction = new Transaction();

        try {
            // Check if the token account exists
            await connection.getAccountInfo(wsolAta);
            console.log('Wrapped SOL account already exists');
        } catch {
            console.log('Creating new wrapped SOL account');
            // Create ATA for wrapped SOL
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    wallet.publicKey,
                    wsolAta,
                    wallet.publicKey,
                    NATIVE_MINT
                )
            );
        }

        // Transfer SOL to create wrapped SOL
        transaction.add(
            SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: wsolAta,
                lamports: amountInLamports,
            })
        );

        // Sync wrapped SOL balance using the built-in instruction
        transaction.add(createSyncNativeInstruction(wsolAta));

        const latestBlockhash = await connection.getLatestBlockhash();
        transaction.recentBlockhash = latestBlockhash.blockhash;
        transaction.feePayer = wallet.publicKey;

        const signature = await connection.sendTransaction(transaction, [wallet.payer]);
        await connection.confirmTransaction({
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        });

        console.log('SOL wrapped successfully!');
        console.log(`Transaction: https://solscan.io/tx/${signature}`);
        
        return { signature, wsolAta };
    } catch (error) {
        console.error('Error wrapping SOL:', error);
        throw error;
    }
}

async function swapWithRaydium(amountInLamports: number, slippageBps: number) {
    try {
        console.log('Attempting swap with Raydium...');
        console.log(`Amount: ${amountInLamports / LAMPORTS_PER_SOL} SOL`);
        console.log(`Slippage: ${slippageBps / 100}%`);

        // Get all pool accounts
        console.log('Fetching Raydium pools...');
        const poolAccounts = await connection.getMultipleAccountsInfo(RAYDIUM_POOLS);
        
        // Find a working pool
        let workingPool: PoolInfo | null = null;
        for (let i = 0; i < poolAccounts.length; i++) {
            const account = poolAccounts[i];
            if (account && account.data.length > 0) {
                workingPool = {
                    pubkey: RAYDIUM_POOLS[i],
                    account
                };
                break;
            }
        }

        if (!workingPool) {
            throw new Error('No working SOL/USDC pool found');
        }

        console.log('Found working pool:', workingPool.pubkey.toString());

        const TOKEN_PROGRAM_ID_V2 = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
        const USDC_MINT_ADDRESS = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

        // Get associated token accounts for vaults
        const baseVault = await getAssociatedTokenAddress(
            WSOL_MINT,
            workingPool.pubkey,
            true,
            TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID_V2
        );

        const quoteVault = await getAssociatedTokenAddress(
            USDC_MINT_ADDRESS,
            workingPool.pubkey,
            true,
            TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID_V2
        );

        const marketBaseVault = await getAssociatedTokenAddress(
            WSOL_MINT,
            workingPool.pubkey,
            true,
            TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID_V2
        );

        const marketQuoteVault = await getAssociatedTokenAddress(
            USDC_MINT_ADDRESS,
            workingPool.pubkey,
            true,
            TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID_V2
        );

        // Get user's token accounts
        const userWsolAccount = await getAssociatedTokenAddress(
            WSOL_MINT,
            wallet.publicKey,
            false,
            TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID_V2
        );

        const userUsdcAccount = await getAssociatedTokenAddress(
            USDC_MINT_ADDRESS,
            wallet.publicKey,
            false,
            TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID_V2
        );

        // Create pool keys
        const poolKeys: LiquidityPoolKeysV4 = {
            id: workingPool.pubkey,
            baseMint: WSOL_MINT,
            quoteMint: USDC_MINT_ADDRESS,
            lpMint: workingPool.pubkey,
            baseDecimals: WSOL.decimals,
            quoteDecimals: 6,
            lpDecimals: 6,
            programId: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),
            authority: new PublicKey('5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1'),
            baseVault,
            quoteVault,
            lpVault: workingPool.pubkey,
            marketProgramId: new PublicKey('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'),
            marketId: new PublicKey('8BnEgHoWFysVcuFFX7QztDmzuH8r5ZFvyP3sYwn1XTh6'),
            marketBaseVault,
            marketQuoteVault,
            marketAuthority: new PublicKey('DZnkkTmCiFWfYTfT41X3Rd1kDgozqzxWaHqsw6W4x2oe'),
            marketVersion: 3,
            marketBids: workingPool.pubkey,
            marketAsks: workingPool.pubkey,
            marketEventQueue: workingPool.pubkey,
            withdrawQueue: workingPool.pubkey,
            targetOrders: workingPool.pubkey,
            openOrders: workingPool.pubkey,
            lookupTableAccount: workingPool.pubkey,
            version: 4,
        };

        // Get token account info
        let userWsolInfo: TokenAccount | null = null;
        let userUsdcInfo: TokenAccount | null = null;

        const commitment: Commitment = 'confirmed';

        try {
            userWsolInfo = await getAccount(connection, userWsolAccount, commitment, TOKEN_PROGRAM_ID);
        } catch (e) {
            console.log('WSOL account not found, will be created during swap');
        }

        try {
            userUsdcInfo = await getAccount(connection, userUsdcAccount, commitment, TOKEN_PROGRAM_ID);
        } catch (e) {
            console.log('USDC account not found, will be created during swap');
        }

        // Create default token account info
        const createTokenAccountInfo = (mint: PublicKey) => ({
            owner: wallet.publicKey,
            state: 1,
            mint,
            amount: new BN(0),
            delegateOption: 0,
            delegate: wallet.publicKey,
            isNativeOption: 0,
            isNative: new BN(0),
            delegatedAmount: new BN(0),
            closeAuthorityOption: 0,
            closeAuthority: wallet.publicKey,
            programId: TOKEN_PROGRAM_ID,
        });

        // Create the swap instruction
        const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
            connection,
            poolKeys,
            userKeys: {
                tokenAccounts: [
                    {
                        pubkey: userWsolAccount,
                        accountInfo: userWsolInfo ? {
                            ...createTokenAccountInfo(WSOL_MINT),
                            amount: new BN(userWsolInfo.amount.toString()),
                        } : createTokenAccountInfo(WSOL_MINT),
                        programId: TOKEN_PROGRAM_ID,
                    },
                    {
                        pubkey: userUsdcAccount,
                        accountInfo: userUsdcInfo ? {
                            ...createTokenAccountInfo(USDC_MINT_ADDRESS),
                            amount: new BN(userUsdcInfo.amount.toString()),
                        } : createTokenAccountInfo(USDC_MINT_ADDRESS),
                        programId: TOKEN_PROGRAM_ID,
                    }
                ],
                owner: wallet.publicKey,
            },
            amountIn: new TokenAmount(new Token(TOKEN_PROGRAM_ID, WSOL_MINT, WSOL.decimals, 'WSOL', 'Wrapped SOL'), amountInLamports, false),
            amountOut: new TokenAmount(new Token(TOKEN_PROGRAM_ID, USDC_MINT_ADDRESS, 6, 'USDC', 'USD Coin'), 0, false),
            fixedSide: 'in',
            makeTxVersion: TxVersion.V0,
            computeBudgetConfig: {
                units: 400000,
                microLamports: 50,
            },
        });

        // Execute the swap
        for (const innerTx of innerTransactions) {
            const transaction = new Transaction();
            
            for (const instruction of innerTx.instructions) {
                transaction.add(instruction);
            }

            const latestBlockhash = await connection.getLatestBlockhash();
            transaction.recentBlockhash = latestBlockhash.blockhash;
            transaction.feePayer = wallet.publicKey;

            const signature = await connection.sendTransaction(transaction, [wallet.payer]);
            await connection.confirmTransaction({
                signature,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            });

            console.log('Swap transaction confirmed:', signature);
            console.log(`Transaction: https://solscan.io/tx/${signature}`);
        }

        return 'Swap completed successfully';
    } catch (error) {
        console.error('Error in Raydium swap:', error);
        throw error;
    }
}

function loadKeypair() {
    if (!fs.existsSync(WALLET_PATH)) {
        console.log('No wallet found, generating a new one...')
        return generateNewKeypair()
    }
    console.log('Loading existing wallet from:', WALLET_PATH)
    const walletFile = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf8'))
    const kp = Keypair.fromSecretKey(Uint8Array.from(walletFile.privateKey))
    return kp
}

async function airdropSol(kp: Keypair) {
    const signature = await connection.requestAirdrop(kp.publicKey, LAMPORTS_PER_SOL * 5)
    await connection.confirmTransaction({ signature, ...(await connection.getLatestBlockhash()) })
}

async function checkConnection() {
    const blockhash = await connection.getLatestBlockhash()
    console.log('Blockhash:', blockhash)
}

async function main() {
    try {
        const kp = loadKeypair();
        console.log('Loaded wallet with public key:', kp.publicKey.toBase58());
        
        // Check connection
        await checkConnection();
        
        // Airdrop some SOL if needed
        const balance = await connection.getBalance(kp.publicKey);
        if (balance < LAMPORTS_PER_SOL) {
            console.log('Balance too low, requesting airdrop...');
            await airdropSol(kp);
        }
        
        // Perform the swap
        await swapSolForUsdc();
        
    } catch (error) {
        console.error('Error in main:', error);
    }
}

main()
