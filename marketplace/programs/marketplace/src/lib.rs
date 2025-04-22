#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;
mod instructions;
mod state;

use crate::instructions::*;


declare_id!("AUavZMdqDrCBaqbJbEknEAobuTfKi2SA7KPfQXyRE2cd");

#[program]
pub mod marketplace {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn list(ctx: Context<List>, price: u64){
        ctx.accounts.create_listing(price,&ctx.bumps)?;
        ctx.accounts.deposit_nft()
    }


    pub fn purchase(ctx: Context<Purchase>) -> Result<()> {
        
    }


}

#[derive(Accounts)]
pub struct Initialize {}
