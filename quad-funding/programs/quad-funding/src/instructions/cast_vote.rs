use anchor_lang::prelude::Signer;



pub struct CastVote<'info> {
    pub voter: Signer<'info>,

    pub dao: Account:<'info, Dao>,
    pub proposal: Account<'info, Proposal>,
    pub vote: Account<'info, Vote>,

    #[account(
        token::authority = voter,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
}