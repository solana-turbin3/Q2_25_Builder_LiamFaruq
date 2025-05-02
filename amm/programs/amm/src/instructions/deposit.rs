use anchor_lang::prelude::*;

use anchor_spl::{associated_token::AssociatedToken, token::{ mint_to, transfer, Mint, MintTo, Token, TokenAccount, Transfer}};

use constant_product_curve::ConstantProduct;


use crate::state::Config;
use crate::error::*;

#[derive(Accounts)]
pub struct Deposit<'info> {

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

impl<'info> Deposit<'info> {


    pub fn deposit_tokens(&mut self, amount: u64, is_x : bool) -> Result<()> {
        let (from, to) = match is_x {
            true => (
                self.user_x_ata.to_account_info(),
                self.vault_x.to_account_info()
            ),
            false => (
                self.user_y_ata.to_account_info(),
                self.vault_y.to_account_info()
            ),
        };

        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = Transfer {
            from,
            to,
            authority: self.user.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program,cpi_accounts);

        transfer(cpi_ctx,amount)
    }

    pub fn mint_lp_tokens(&mut self, amount: u64) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = MintTo {
            mint: self.mint_lp.to_account_info(),
            to: self.user_lp_ata.to_account_info(),
            authority: self.config.to_account_info(),
        };

        let seeds = &[ 
            &b"config"[..], 
            &self.config.seed.to_le_bytes(), 
            &[self.config.config_bump],
        ];

        let signer_seeds = &[&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        mint_to(cpi_ctx, amount)
    }



    pub fn deposit(&mut self, amount: u64, max_x: u64, max_y: u64) -> Result<()> {

        require!(self.config.locked == false, AmmError::PoolLocked );
        require!(amount != 0, AmmError::InvalidAmount);

        let (x,y) = match self.mint_lp.supply == 0 && self.vault_x.amount == 0  && self.vault_y.amount == 0 {
            true => (max_x, max_y),
            false => {
                let amounts = ConstantProduct::xy_deposit_amounts_from_l(self.vault_x.amount, self.vault_y.amount, self.mint_lp.supply, amount, 6).unwrap();
                (amounts.x,amounts.y)
            }
        };

        require!(x <= max_x && y <= max_y, AmmError::SlippageLimitExceeded);

        self.deposit_tokens(x, true)?;
        self.deposit_tokens(y, false)?;


        self.mint_lp_tokens(amount)


    }

}