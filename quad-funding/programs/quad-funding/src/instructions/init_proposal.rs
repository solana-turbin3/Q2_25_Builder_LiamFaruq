use crate::state::{Proposal,Dao};

use anchor_lang::prelude::*;


#[derive(Accounts)]
pub struct InitProposal<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    pub dao_account: Account<'info,Dao>,

    #[account(
        init,
        payer = creator,
        space = 8 + std::mem::size_of::<Proposal>(),
        seeds = [b"proposal", dao_account.key().as_ref(), dao_account.proposal_count.to_le_bytes().as_ref()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,

    
    pub creator_token_account: Account<'info, TokenAccount>,


    pub system_program: Program<'info, System>,

}
