use anchor_lang::prelude::*;

declare_id!("6Qs5hWd41Fz3js2sdnHfQ6h2R7AMJ9GAfPaqC8UYbDwm");

pub mod instructions;
pub mod state;
pub use instructions::*;

#[program]
pub mod escrow {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn make(ctx: Context<Make>, seed: u64, deposit: u64, recieve: u64, bumps_in: u8 ) -> Result<()>{
        let bumps: MakeBumps = MakeBumps {
            escrow: bumps_in
        };

        let _ = ctx.accounts.init_escrow(seed, recieve, &bumps);
        ctx.accounts.deposit(deposit)
    }

    pub fn take (ctx: Context<Take>, amount: u64) -> Result<()>{
        let _ = ctx.accounts.deposit(amount);
        let _ = ctx.accounts.withdraw();
        ctx.accounts.close_vault()
    }

    pub fn refund (ctx: Context<Refund>) -> Result<()> {
        ctx.accounts.refund_and_close_vault()
    }


}

#[derive(Accounts)]
pub struct Initialize {}
