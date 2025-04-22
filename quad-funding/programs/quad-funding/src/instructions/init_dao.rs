pub use anchor_lang::prelude::*;


pub struct init_dao {

    #[account(mut)]
    pub creator: Signer<'info>,

    pub dao_account: Account <'info, Dao>,

    pub system_program: Program <'info, System>,
}