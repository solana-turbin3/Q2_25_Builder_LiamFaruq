pub fn add(left: u64, right: u64) -> u64 {
    left + right
}

pub mod programs;

#[cfg(test)]
mod tests {
    use super::*;
    use solana_sdk::{hash::hash, message::Message, signature::{Keypair, Signer}};
    use bs58;
    use std::io::{self, BufRead};
    use solana_client::rpc_client::RpcClient; 
    use solana_sdk::{
        signature::{read_keypair_file}, transaction::Transaction};    use solana_program::{pubkey::Pubkey,system_instruction::transfer};
    use std::str::FromStr;
    use crate::programs::Turbine_prereq::{ TurbinePrereqProgram, CompleteArgs};

    const RPC_URL: &str = "https://api.devnet.solana.com";




    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }

    #[test]
    fn keygen() {
        let kp = Keypair::new();

        println!("You've generated a new Solana wallet: {}", kp.pubkey().to_string()); println!("");
        println!("To save your wallet, copy and paste the following into a JSON file:");
        println!("{:?}", kp.to_bytes());

    }

    #[test]
    fn base58_to_wallet() {
        println!("Input your private key as base58:");
        let stdin = io::stdin();
        let base58 = stdin.lock().lines().next().unwrap().unwrap(); println!("Your wallet file is:");
        let wallet = bs58::decode(base58).into_vec().unwrap(); println!("{:?}", wallet);
    }

    #[test]
    fn wallet_to_base58() {

        println!("Input your private key as a wallet file byte array:");
        let stdin = io::stdin();
        let wallet =

        stdin.lock().lines().next().unwrap().unwrap().trim_start_matches('[').trim_end_matches(']').
        split(',') .map(|s| s.trim().parse::<u8>().unwrap()).collect::<Vec<u8>>();

        println!("Your private key is:");
        let base58 = bs58::encode(wallet).into_string(); println!("{:?}", base58);

    }
    
    #[test] 
    fn airdop() {
        const RPC_URL: &str = "https://api.devnet.solana.com";
        let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");
        let client = RpcClient::new(RPC_URL);

        print!("requesting airdrop for {}...", keypair.pubkey().to_string());

        match client.request_airdrop(&keypair.pubkey(), 2_000_000_000u64) {

            Ok(s) => {
            println!("Success! Check out your TX here:");
            
            println!("https://explorer.solana.com/tx/{}?cluster=devnet", s.to_string());
            
            },
            Err(_) => {
                println!("Error requesting airdrop");
            }
        }
    } 
    
    #[test] 
    fn transfer_sol() {

        // Import our keypair
        let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");
        // With the imported Keypair, we can sign a new message.
        let pubkey = keypair.pubkey();
        let message_bytes = b"I verify my solana Keypair!";
        let sig = keypair.sign_message(message_bytes);
        let sig_hashed = hash(sig.as_ref());
        // After that we can verify the singature, using the default implementation
        match sig.verify(&pubkey.to_bytes(), &sig_hashed.to_bytes()) {
        true => println!("Signature verified"),
        false => println!("Verification failed"),
        }

        // Define our Turbin3 public key
        let to_pubkey = Pubkey::from_str("Fp4m3VAiCJuSR88KG9QBurNg6iGs5QaXx484g6vJWTV8").unwrap();

        // Create a Solana devnet connection
        let rpc_client: RpcClient = RpcClient::new(RPC_URL);

        // Get recent blockhash
        let recent_blockhash = rpc_client .get_latest_blockhash() .expect("Failed to get recent
        blockhash");

        let transaction = Transaction::new_signed_with_payer( &[transfer(
            &keypair.pubkey(), &to_pubkey, 1_000_000
            )], Some(&keypair.pubkey()), &vec![&keypair], recent_blockhash
            );

        let signature = rpc_client
        .send_and_confirm_transaction(&transaction)
        .expect("Failed to send transaction");
            println!("Success! Check out your TX here: https://explorer.solana.com/tx/{}/?cluster=devnet",signature);
        }

        #[test]
        fn get_balance() {
            let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");
            let client = RpcClient::new(RPC_URL);

            let balance = client.get_balance(&keypair.pubkey()).expect("Failed to get balance");
            println!("Balance: {}", balance);
        }

        #[test]
        fn empty_dev_wallet() {
            let rpc_client: RpcClient = RpcClient::new(RPC_URL);
            let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");
            let to_pubkey = Pubkey::from_str("Fp4m3VAiCJuSR88KG9QBurNg6iGs5QaXx484g6vJWTV8").unwrap();

            // Get balance of dev wallet
            let balance = rpc_client
            .get_balance(&keypair.pubkey())
            .expect("Failed to get balance");


            let recent_blockhash = rpc_client .get_latest_blockhash() .expect("Failed to get recent
            blockhash");

            let message = Message::new_with_blockhash(
                &[transfer( &keypair.pubkey(), &to_pubkey, balance,
                )], Some(&keypair.pubkey()), &recent_blockhash
            );

            let fee= rpc_client.get_fee_for_message(&message) .expect("Failed to get fee calculator");

            let transaction = Transaction::new_signed_with_payer(
                &[transfer( &keypair.pubkey(), &to_pubkey, balance - fee,
                )], Some(&keypair.pubkey()), &vec![&keypair], recent_blockhash);

            let signature = rpc_client
            .send_and_confirm_transaction(&transaction)
            .expect("Failed to send transaction");

            println!("Success! Check out your TX here: https://explorer.solana.com/tx/{}/?cluster=devnet",signature);

        }

        #[test]
        fn enroll() {
            let rpc_client: RpcClient = RpcClient::new("https://api.devnet.solana.com");
        
            let signer: Keypair = read_keypair_file("Turbin3-wallet.json")
                .expect("Couldn't find wallet file");
            
            // args for the instruction
            let args = CompleteArgs { github: b"SwineCoder101".to_vec() };
        
            // Derive the PDA correctly
            // let prereq_pda = TurbinePrereqProgram::derive_program_address(&[
            //     b"prereq",
            //     signer.pubkey().as_ref(),
            // ]);

            let prereq_pda = TurbinePrereqProgram::derive_program_address(&[b"preQ225",
            signer.pubkey().to_bytes().as_ref()]);
        
            // System program account
            let system_program = Pubkey::from_str("11111111111111111111111111111111").unwrap();
        
            // Get recent blockhash
            let blockhash = rpc_client.get_latest_blockhash()
                .expect("Failed to get recent blockhash");
    

            // Correctly list accounts in order as per your instruction:
            // [signer, prereq PDA, system_program]
            let accounts = [
                &signer.pubkey(),
                &prereq_pda,
                &system_program,
            ];
        
            // Construct the instruction correctly:
            let transaction = TurbinePrereqProgram::complete(
                &accounts,
                &args,
                Some(&signer.pubkey()),
                &[&signer],
                blockhash,
            );
        
            // Create and sign the transaction correctly
            // let transaction = Transaction::new_signed_with_payer(
            //     &[instruction],
            //     Some(&signer.pubkey()),
            //     &[&signer],
            //     blockhash
            // );
        
            // Send the transaction
            let signature = rpc_client.send_and_confirm_transaction(&transaction)
                .expect("Failed to send transaction");
        
            println!("Success! Check out your TX here: https://explorer.solana.com/tx/{}/?cluster=devnet", signature);
        }
            

}
