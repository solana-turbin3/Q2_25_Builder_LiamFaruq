use anchor_lang::prelude::*;
use anchor_spl::token::{Mint,Token};


#[derive(Accounts)]
pub struct Stake<'info> {

    #[account(mut)]
    pub user: Signer<'info>,


    pub mint: Account<'info, Mint>,


    pub collection_mint: Account<'info, Mint>,


    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    pub mint_ata: Account<'info,TokenAccount>,

    

    #[account(init, 
        payer=admin, 
        seeds=[b"config".as_ref(), config.key().as_ref()], 
        bump, 
        space = 8 + StakeConfig::INIT_SPACE
    )]
    pub config: Account<'info,StakeConfig>,


    #[account(
        init, 
        payer=admin, 
        seeds=[b"rewards".as_ref(),config.key().as_ref()], 
        bump,
        mint::decimals = 6,
        mint:: authority = config,
    )]
    pub rewards_mint: Account<'info,Mint>,

    pub system_program: Program<'info,System>,
    pub token_program: Program<'info, Token>,
}

impl<'info> InitializeConfig<'info> {
    pub fn initialize_config(&mut self, points_per_stake: u8, max_stake: u8, freeze_period: u32, bumps: &InitializeBumps) {

        self.config.set_inner(StakeConfig {
            points_per_stake,
            max_stake,
            freeze_period,
            re
        })
        Ok(())
    }
}