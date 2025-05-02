use anchor_lang::prelude::*;

use anchor_spl::{associated_token::AssociatedToken, token::{ mint_to, transfer, Mint, MintTo, Token, TokenAccount, Transfer}};

use constant_product_curve::ConstantProduct;


use crate::state::Config;
use crate::error::*;


/*

Maybe we can refactor these states and create traits for all instructions as the use the same account context pretty much.

*/

#[derive(Accounts)]
pub struct Payment<'info> {

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mint::token_program = token_program)]
    pub mint_x: Account<'info, Mint>,

    #[account(mint::token_program = token_program)]
    pub mint_y: Account<'info, Mint>,

    #[account(seeds = [b"config", config.seed.to_le_bytes().as_ref()], 
        bump = config.config_bump,
        has_one = mint_x, 
        has_one = mint_y)
        ]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"lp", config.key().as_ref()],
        mint::token_program = token_program,
        bump,
    )]
    pub mint_lp: Account<'info,Mint>,


    #[account(mut,
        associated_token::mint = mint_x,
        associated_token::authority = config,
    )]
    pub vault_x: Account<'info, TokenAccount>,
    
    #[account(mut,
        associated_token::mint = mint_y,
        associated_token::authority = config,
    )]
    pub vault_y: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::authority = user,
        associated_token::mint = mint_x,
        associated_token::token_program = token_program,
    )]
    pub user_x_ata: Account<'info, TokenAccount>,


    #[account(
        init_if_needed,
        payer = user,
        associated_token::authority = user,
        associated_token::mint = mint_lp,
        associated_token::token_program = token_program,
    )]
    pub user_lp_ata: Account<'info, TokenAccount>,

    #[account(
            mut,
            associated_token::authority = user,
            associated_token::mint = mint_y,
            associated_token::token_program = token_program,
        )]
        pub user_y_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info,Token>,
    pub associated_token_program: Program<'info,AssociatedToken>,
    pub system_program: Program<'info,System>,
}