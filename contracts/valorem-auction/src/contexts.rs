use crate::{
    errors::AuctionError,
    state::{
        Auction, BidderState, ComplianceRecord, InitializeAuctionArgs, AUCTION_SEED, BIDDER_SEED,
        COMPLIANCE_SEED, HOOK_CONFIG_SEED, HOOK_PERMIT_SEED,
    },
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};
use valorem_transfer_hook::{HookConfig, TransferPermit};

#[derive(Accounts)]
#[instruction(args: InitializeAuctionArgs)]
pub struct InitializeAuction<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,
    /// CHECK: Reviewer/admin authority recorded on the auction.
    pub reviewer: UncheckedAccount<'info>,
    pub asset_mint: InterfaceAccount<'info, Mint>,
    pub payment_mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = issuer,
        space = 8 + Auction::INIT_SPACE,
        seeds = [AUCTION_SEED, issuer.key().as_ref(), args.auction_seed.as_ref()],
        bump
    )]
    pub auction: Account<'info, Auction>,
    #[account(
        init,
        payer = issuer,
        associated_token::mint = asset_mint,
        associated_token::authority = auction,
        associated_token::token_program = token_program
    )]
    pub asset_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = issuer,
        associated_token::mint = payment_mint,
        associated_token::authority = auction,
        associated_token::token_program = token_program
    )]
    pub payment_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(constraint = issuer_payment_destination.mint == payment_mint.key() @ AuctionError::PaymentMintMismatch)]
    pub issuer_payment_destination: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: Created by the hook program during CPI.
    #[account(mut)]
    pub hook_config: UncheckedAccount<'info>,
    /// CHECK: Created by the hook program during CPI.
    #[account(mut)]
    pub extra_account_meta_list: UncheckedAccount<'info>,
    pub transfer_hook_program: Program<'info, valorem_transfer_hook::program::ValoremTransferHook>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositAsset<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,
    pub asset_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, has_one = issuer @ AuctionError::Unauthorized, has_one = asset_mint @ AuctionError::AssetMintMismatch)]
    pub auction: Account<'info, Auction>,
    #[account(mut, address = auction.asset_vault)]
    pub asset_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, constraint = issuer_asset_account.mint == asset_mint.key() @ AuctionError::AssetMintMismatch)]
    pub issuer_asset_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct SubmitCommitment<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    pub payment_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, has_one = payment_mint @ AuctionError::PaymentMintMismatch)]
    pub auction: Account<'info, Auction>,
    #[account(
        init,
        payer = bidder,
        space = 8 + BidderState::INIT_SPACE,
        seeds = [BIDDER_SEED, auction.key().as_ref(), bidder.key().as_ref()],
        bump
    )]
    pub bidder_state: Account<'info, BidderState>,
    #[account(mut, address = auction.payment_vault)]
    pub payment_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        constraint = bidder_payment_account.mint == payment_mint.key() @ AuctionError::PaymentMintMismatch,
        constraint = bidder_payment_account.owner == bidder.key() @ AuctionError::Unauthorized
    )]
    pub bidder_payment_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdvanceAuctionPhase<'info> {
    pub admin: Signer<'info>,
    #[account(mut)]
    pub auction: Account<'info, Auction>,
}

#[derive(Accounts)]
pub struct RevealBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(mut)]
    pub auction: Account<'info, Auction>,
    #[account(
        mut,
        seeds = [BIDDER_SEED, auction.key().as_ref(), bidder.key().as_ref()],
        bump = bidder_state.bump
    )]
    pub bidder_state: Account<'info, BidderState>,
}

#[derive(Accounts)]
pub struct CloseReveal<'info> {
    pub admin: Signer<'info>,
    #[account(mut)]
    pub auction: Account<'info, Auction>,
    /// CHECK: Only used if a settlement candidate exists.
    #[account(mut)]
    pub current_candidate_state: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct RecordCompliance<'info> {
    #[account(mut)]
    pub reviewer: Signer<'info>,
    /// CHECK: Bidder wallet keyed into the compliance record PDA.
    pub bidder: UncheckedAccount<'info>,
    #[account(mut)]
    pub auction: Account<'info, Auction>,
    #[account(
        mut,
        seeds = [BIDDER_SEED, auction.key().as_ref(), bidder.key().as_ref()],
        bump = bidder_state.bump
    )]
    pub bidder_state: Account<'info, BidderState>,
    #[account(
        init_if_needed,
        payer = reviewer,
        space = 8 + ComplianceRecord::INIT_SPACE,
        seeds = [COMPLIANCE_SEED, auction.key().as_ref(), bidder.key().as_ref()],
        bump
    )]
    pub compliance_record: Account<'info, ComplianceRecord>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleCandidate<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    pub asset_mint: InterfaceAccount<'info, Mint>,
    pub payment_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, has_one = asset_mint @ AuctionError::AssetMintMismatch, has_one = payment_mint @ AuctionError::PaymentMintMismatch)]
    pub auction: Account<'info, Auction>,
    #[account(
        mut,
        seeds = [BIDDER_SEED, auction.key().as_ref(), bidder.key().as_ref()],
        bump = bidder_state.bump
    )]
    pub bidder_state: Account<'info, BidderState>,
    #[account(
        seeds = [COMPLIANCE_SEED, auction.key().as_ref(), bidder.key().as_ref()],
        bump = compliance_record.bump
    )]
    pub compliance_record: Account<'info, ComplianceRecord>,
    #[account(mut, address = auction.payment_vault)]
    pub payment_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        constraint = bidder_payment_account.mint == payment_mint.key() @ AuctionError::PaymentMintMismatch,
        constraint = bidder_payment_account.owner == bidder.key() @ AuctionError::Unauthorized
    )]
    pub bidder_payment_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, address = auction.asset_vault)]
    pub asset_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, constraint = bidder_asset_account.mint == asset_mint.key() @ AuctionError::AssetMintMismatch)]
    pub bidder_asset_account: InterfaceAccount<'info, TokenAccount>,
    #[account(seeds = [HOOK_CONFIG_SEED, asset_mint.key().as_ref()], bump = hook_config.bump, seeds::program = valorem_transfer_hook::ID)]
    pub hook_config: Account<'info, HookConfig>,
    /// CHECK: Hook validation PDA verified in the handler.
    #[account(mut)]
    pub extra_account_meta_list: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [HOOK_PERMIT_SEED, asset_mint.key().as_ref(), asset_vault.key().as_ref(), bidder_asset_account.key().as_ref()],
        bump = transfer_permit.bump,
        seeds::program = valorem_transfer_hook::ID
    )]
    pub transfer_permit: Account<'info, TransferPermit>,
    pub transfer_hook_program: Program<'info, valorem_transfer_hook::program::ValoremTransferHook>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SlashUnrevealed<'info> {
    pub admin: Signer<'info>,
    #[account(mut)]
    pub auction: Account<'info, Auction>,
    #[account(mut)]
    pub bidder_state: Account<'info, BidderState>,
}

#[derive(Accounts)]
pub struct SlashCandidateAndAdvance<'info> {
    pub admin: Signer<'info>,
    #[account(mut)]
    pub auction: Account<'info, Auction>,
    #[account(mut)]
    pub current_bidder_state: Account<'info, BidderState>,
    #[account(
        seeds = [COMPLIANCE_SEED, auction.key().as_ref(), current_bidder_state.bidder.as_ref()],
        bump = compliance_record.bump
    )]
    pub compliance_record: Account<'info, ComplianceRecord>,
    /// CHECK: Only used if a fallback candidate exists.
    #[account(mut)]
    pub next_candidate_state: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    pub payment_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, has_one = payment_mint @ AuctionError::PaymentMintMismatch)]
    pub auction: Account<'info, Auction>,
    #[account(
        mut,
        seeds = [BIDDER_SEED, auction.key().as_ref(), bidder.key().as_ref()],
        bump = bidder_state.bump
    )]
    pub bidder_state: Account<'info, BidderState>,
    #[account(mut, address = auction.payment_vault)]
    pub payment_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        constraint = bidder_payment_account.owner == bidder.key() @ AuctionError::Unauthorized,
        constraint = bidder_payment_account.mint == payment_mint.key() @ AuctionError::PaymentMintMismatch
    )]
    pub bidder_payment_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct ReclaimUnsoldAsset<'info> {
    pub admin: Signer<'info>,
    pub asset_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, has_one = asset_mint @ AuctionError::AssetMintMismatch)]
    pub auction: Account<'info, Auction>,
    #[account(mut, address = auction.asset_vault)]
    pub asset_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, constraint = issuer_asset_account.mint == asset_mint.key() @ AuctionError::AssetMintMismatch)]
    pub issuer_asset_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct WithdrawProceeds<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,
    pub payment_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, has_one = issuer @ AuctionError::Unauthorized, has_one = payment_mint @ AuctionError::PaymentMintMismatch)]
    pub auction: Account<'info, Auction>,
    #[account(mut, address = auction.payment_vault)]
    pub payment_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        address = auction.issuer_payment_destination,
        constraint = issuer_payment_destination.mint == payment_mint.key() @ AuctionError::PaymentMintMismatch
    )]
    pub issuer_payment_destination: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}
