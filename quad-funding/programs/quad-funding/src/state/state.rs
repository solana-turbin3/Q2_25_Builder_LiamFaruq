pub use anchor_lang::prelude::*;


pub struct Dao {
    #[max_len(30)]
    pub name: String,
    pub authority: Pubkey,
    pub bump: u8,

}

pub struct Proposal {
    pub authority: Pubkey,
    #[max_len(80)]
    pub metadata: String,
    pub yes_vote_count: u64,
    pub no_vote_count: u64,
    pub bump: u8,

}

pub struct Vote {
    pub author: Pubkey,
    //0 ==> Yes
    //1 ==> No
    pub vote_type: u8,
    pub vote_credits: u64,
    /// if quadratic funding is enabled
    pub bump: u8,
}