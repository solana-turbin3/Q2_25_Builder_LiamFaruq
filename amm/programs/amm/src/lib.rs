pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("AUtvBk8LgFGcJuC61ScEv1Hdtcy5EuJDyPgDo4Yi2z4X");

#[program]
pub mod amm {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, seed: u64, fee: u16, authority: Pubkey, bump: u8) -> Result<()> {
        ctx.accounts.initialise(seed, fee, authority, bump);
    }
}
