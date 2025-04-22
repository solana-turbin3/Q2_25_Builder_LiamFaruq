use anchor_lang::prelude::*;

use anchor_spl::token_interface::{Mint,TokenInterface};

use crate::state::marketplace::*;

#[derive(Accounts)]
#[instruction(name: String)]
pub struct Initialize<'info> {
    
    #[account(mut)]
    pub admin: Signer<'info>,


    #[account(
        init,
        payer = admin,
        seeds = [b"marketplace", name.as_bytes()],
        bump,
        space = Marketplace::INIT_SPACE,
    )]
    pub marketplace: Account<'info,Marketplace>,

    #[account(seeds = [b"treasury", marketplace.key().as_ref()], bump)]
    pub treasury: Account<'info, SystemAccount>,

    #[account(init, payer = admin, seeds = [b"rewards", marketplace.key().as_ref(), bump, mint::decimals = 6, mint::authority = marketplace])]
    pub rewards_mint:  InterfaceAccount<'info,Mint>,

    pub token_program: Interface<'info,TokenInterface>,


    #[account()]
    pub system_program: Program<'info,System>
}



impl<'info> Initialize<'info> {
    pub fn init(&mut self , name: String, fee: u16, bumps: InitializeBumps) -> Result<()> {
        assert!(name.len() < 32);
        
        self.marketplace.set_innet(Marketplace {
            admin: self.admin.keu,
            fee,
            bumps: bumps.marketplace,
            treasury_bump: bumps.treasury,
            rewards_bump: bumps.rewards_mint,
            name
        })
        
        Ok(())
    }
}
