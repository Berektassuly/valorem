pub mod contexts;
pub mod errors;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use contexts::*;
use state::{ComplianceStatus, InitializeAuctionArgs, SlashReason};

declare_id!("FG6nnyfyztJyn1Yzov6xHqfjRMJGTpHd6T5LwPJuruPS");

#[program]
pub mod valorem_auction {
    use super::*;

    pub fn initialize_auction(
        ctx: Context<InitializeAuction>,
        args: InitializeAuctionArgs,
    ) -> Result<()> {
        instructions::initialize_auction(ctx, args)
    }

    pub fn deposit_asset(ctx: Context<DepositAsset>) -> Result<()> {
        instructions::deposit_asset(ctx)
    }

    pub fn submit_commitment(
        ctx: Context<SubmitCommitment>,
        commitment: [u8; 32],
    ) -> Result<()> {
        instructions::submit_commitment(ctx, commitment)
    }

    pub fn advance_to_reveal(ctx: Context<AdvanceAuctionPhase>) -> Result<()> {
        instructions::advance_to_reveal(ctx)
    }

    pub fn reveal_bid(
        ctx: Context<RevealBid>,
        bid_amount: u64,
        salt: [u8; 32],
    ) -> Result<()> {
        instructions::reveal_bid(ctx, bid_amount, salt)
    }

    pub fn close_reveal(ctx: Context<CloseReveal>) -> Result<()> {
        instructions::close_reveal(ctx)
    }

    pub fn record_compliance(
        ctx: Context<RecordCompliance>,
        status: ComplianceStatus,
        attestation_digest: [u8; 32],
        expires_at: i64,
    ) -> Result<()> {
        instructions::record_compliance(ctx, status, attestation_digest, expires_at)
    }

    pub fn settle_candidate(ctx: Context<SettleCandidate>) -> Result<()> {
        instructions::settle_candidate(ctx)
    }

    pub fn slash_unrevealed(ctx: Context<SlashUnrevealed>) -> Result<()> {
        instructions::slash_unrevealed(ctx)
    }

    pub fn slash_candidate_and_advance(
        ctx: Context<SlashCandidateAndAdvance>,
        reason: SlashReason,
    ) -> Result<()> {
        instructions::slash_candidate_and_advance(ctx, reason)
    }

    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        instructions::claim_refund(ctx)
    }

    pub fn reclaim_unsold_asset(ctx: Context<ReclaimUnsoldAsset>) -> Result<()> {
        instructions::reclaim_unsold_asset(ctx)
    }

    pub fn withdraw_proceeds(ctx: Context<WithdrawProceeds>, amount: u64) -> Result<()> {
        instructions::withdraw_proceeds(ctx, amount)
    }
}

#[cfg(test)]
mod tests {
    use super::state::*;
    use anchor_lang::prelude::Pubkey;

    fn sample_auction() -> Auction {
        Auction {
            issuer: Pubkey::new_unique(),
            reviewer_authority: Pubkey::new_unique(),
            asset_mint: Pubkey::new_unique(),
            payment_mint: Pubkey::new_unique(),
            asset_vault: Pubkey::new_unique(),
            payment_vault: Pubkey::new_unique(),
            issuer_payment_destination: Pubkey::new_unique(),
            transfer_hook_config: Pubkey::new_unique(),
            transfer_hook_validation: Pubkey::new_unique(),
            auction_seed: [7; 32],
            phase: AuctionPhase::Bidding,
            bump: 255,
            asset_deposited: true,
            has_settled_bidder: false,
            settled_bidder: Pubkey::default(),
            deposit_amount: 10,
            reserve_price: 100,
            asset_amount: 1,
            total_deposits_held: 0,
            total_slashed: 0,
            total_proceeds: 0,
            total_withdrawn: 0,
            bidding_end_at: 0,
            reveal_end_at: 0,
            settlement_window: 100,
            active_settlement_started_at: 0,
            max_bidders: 10,
            registered_bidders: 0,
            current_settlement_index: 0,
            ranked_bidders: Vec::new(),
        }
    }

    #[test]
    fn commitment_is_domain_separated() {
        let auction = Pubkey::new_unique();
        let bidder = Pubkey::new_unique();
        let salt = [9u8; 32];
        let first = build_commitment(auction, bidder, 42, &salt);
        let second = build_commitment(auction, bidder, 43, &salt);
        assert_ne!(first, second);
    }

    #[test]
    fn ranking_prefers_higher_bid_then_earlier_reveal() {
        let bidder_a = Pubkey::new_unique();
        let bidder_b = Pubkey::new_unique();
        let bidder_c = Pubkey::new_unique();
        let mut auction = sample_auction();
        auction.insert_ranked_bid(RankedBid { bidder: bidder_a, amount: 120, reveal_timestamp: 5, disqualified: false, settled: false }).unwrap();
        auction.insert_ranked_bid(RankedBid { bidder: bidder_b, amount: 125, reveal_timestamp: 9, disqualified: false, settled: false }).unwrap();
        auction.insert_ranked_bid(RankedBid { bidder: bidder_c, amount: 120, reveal_timestamp: 2, disqualified: false, settled: false }).unwrap();
        assert_eq!(auction.ranked_bidders[0].bidder, bidder_b);
        assert_eq!(auction.ranked_bidders[1].bidder, bidder_c);
        assert_eq!(auction.ranked_bidders[2].bidder, bidder_a);
    }

    #[test]
    fn available_proceeds_accounts_for_withdrawals() {
        let mut auction = sample_auction();
        auction.total_proceeds = 100;
        auction.total_slashed = 15;
        auction.total_withdrawn = 25;
        assert_eq!(auction.available_proceeds(), Some(90));
    }
}
