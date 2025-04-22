use anchor_lang::prelude::*;

declare_id!("A1EdLCvWh3HutpnsVhYfUYmWR8Nmbg5jyhPqSFKkjrsg");

#[program]
pub mod staking {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
