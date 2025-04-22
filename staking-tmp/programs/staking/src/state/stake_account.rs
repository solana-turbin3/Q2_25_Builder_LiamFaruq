use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct StakeAccount {
    pub ownder: Pubkey,
    pub mint: Pubkey,
    pub staked_at: i64,
    pub bumps:u8
}