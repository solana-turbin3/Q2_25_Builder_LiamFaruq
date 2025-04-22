
use anchor_spl::{token_interface::{Mint,TokenInterface}, Metadata::{metadata_program}};
use anchor_lang::*;


pub struct List<'info> {
        
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(ut,
    associated_token::mint = maker_mint,
    associated_token:: authority = maker)]
    pub maker_ata : InterfaceAccount<'info,TokenAccount>,

    #[account(
        init,
        payer = maker, 
        associated_token::mint = maker_mint,
        associated_token::authority = maker,
    )]
    pub vault: InterfaceAcount<'info,TokenAccount>,
    



    #[account(
        init,
        payer = maker,
        seeds = [marketplace.key().as_ref(), maker_mint.key().as_ref()],
        bump,
        space = Listing::INIT_SPACE,
    )]
    pub listing: Account<'info, Listing>,

    #[account(
        init,
        payer = maker,
        seeds = [b"list", name.as_bytes()],
        bump,
        space = Listing::INIT_SPACE,
    )]
    pub listing: Account<'info,Listing>,

    pub collection_mint: InterfaceAccount<'info, Mint>,

    #[account(
        seeds = [
            b"metadata",
            metadata_program.key().as_ref(),
            maker_mint.key().as_ref(),
        ],
        seeds::program = metadata_program.key(),
        bump,
        constraint = metadata.collection.as_ref().unwrap().key.as_ref() == collection_mint.key().as_ref(),
        constraint = metadata.collection.as_ref().unwrap().verified,
    )]
    pub metadata: Account<'info, Metadata>,

    pub metadata_program: Program<'info,Metadata>,


    #[account(seeds = [b"treasury", marketplace.key().as_ref()], bump)]
    pub treasury: Account<'info, SystemAccount>,

    #[account(
        seeds = [
            b"metadata",
            metadata_program.key().as_ref(),
            maker_mint.key().as_ref
        ]
    )]
    pub master_edition: Account<'info,MasterEditionAccount>,
    pub metadata_progam: Program<'info,Metadata>,

    #[account(
        init,
        payer = maker,
        seeds = [b"listing", marketplace.key().as_ref(), maker_mint.key().as_ref()],
        bump,
        space = 8 + Listing::INIT_SPACE,
    )]
    pub listing: Account<'info,Listing>,

    #[account(init, payer = admin, seeds = [b"rewards", marketplace.key().as_ref(), bump, mint::decimals = 6, mint::authority = marketplace])]
    pub rewards_mint:  InterfaceAccount<'info,Mint>,

    pub token_program: Interface<'info,TokenInterface>,


    #[account()]
    pub system_program: Program<'info,System>
}

impl<'info> List<'info>  {
    pub fn create_listing(&mut self, price: u64, bumps: &ListBumps) -> Result<()> {
        self.listing.set_inner(Listing {
            maker: self.maker.key(),
            mint: self.maker_mint.key(),
            price,
            bump: bumps.listing,
        });
        Ok(())
    }

    pub fn deposit_nft(&mut self) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = TransferChecked {
            from: self.maker_ata.to_account_info(),
            mint: self.maker_mint.to_account_info(),
            to: self.maker_mint.to_account_info(),
            authority: self.maker.to_account_info(),
        };

        let cp_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
    }


}