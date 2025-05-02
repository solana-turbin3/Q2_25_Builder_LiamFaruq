use anchor_lang::prelude::*;

use anchor_spl::{associated_token::*, token::Token, token_interface::{Mint, TokenAccount}};


use crate::state::Config;


#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct Initialize<'info> {
    
    #[account(mut)]
    pub admin: Signer<'info>,

    pub mint_x: Account<'info,Mint>,
    pub mint_y: Account<'info,Mint>,

    #[account(
        init, 
        payer = admin,
        seeds = [b"lp", config.key().as_ref()],
        mint::token_program = token_program,
        bump,
        mint::decimals = 6,
        mint::authority = config
    )]
    pub mint_lp: Account<'info,Mint>,

    #[account(
        init,
        payer = admin,
        associated_token::mint = mint_x,
        associated_token::authority = config,
    )]
    pub vault_x: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = admin,
        associated_token::mint = mint_y,
        associated_token::authority = config,
    )]
    pub vault_y: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = admin,
        seeds = [b"config", seed.to_le_bytes().as_ref()],
        bump,
        space = 8 + Config::INIT_SPACE
    )]
    pub config: Account<'info,Config>,


    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info,AssociatedToken>,
    pub system_program: Program<'info,System>,
}

impl<'info> Initialize<'info> {

    pub fn initialise(&mut self, seed: u64, fee: u16, authority: Option<Pubkey>, bump: &InitializeBumps) -> Result<()> {
        self.config.set_inner(Config {
            seed,
            authority,
            mint_x: self.mint_x.to_account_info().key(),
            mint_y: self.mint_y.to_account_info().key(),
            fee,
            locked: false,
            config_bump: bump.config,
            lp_bump: bump.mint_lp,
        });

        Ok(())
    }

}
