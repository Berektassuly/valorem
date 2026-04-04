use crate::errors::AuctionError;
use anchor_lang::prelude::*;
use sha2::{Digest, Sha256};

pub const AUCTION_SEED: &[u8] = b"auction";
pub const BIDDER_SEED: &[u8] = b"bidder";
pub const COMPLIANCE_SEED: &[u8] = b"compliance";
pub const HOOK_CONFIG_SEED: &[u8] = b"config";
pub const HOOK_PERMIT_SEED: &[u8] = b"permit";
pub const MAX_RANKED_BIDDERS: usize = 64;
pub const COMMITMENT_DOMAIN: &[u8] = b"valorem-commitment:v1";

#[account]
#[derive(InitSpace)]
pub struct Auction {
    pub issuer: Pubkey,
    pub reviewer_authority: Pubkey,
    pub asset_mint: Pubkey,
    pub payment_mint: Pubkey,
    pub asset_vault: Pubkey,
    pub payment_vault: Pubkey,
    pub issuer_payment_destination: Pubkey,
    pub transfer_hook_config: Pubkey,
    pub transfer_hook_validation: Pubkey,
    pub auction_seed: [u8; 32],
    pub phase: AuctionPhase,
    pub bump: u8,
    pub asset_deposited: bool,
    pub has_settled_bidder: bool,
    pub settled_bidder: Pubkey,
    pub deposit_amount: u64,
    pub reserve_price: u64,
    pub asset_amount: u64,
    pub total_deposits_held: u64,
    pub total_slashed: u64,
    pub total_proceeds: u64,
    pub total_withdrawn: u64,
    pub bidding_end_at: i64,
    pub reveal_end_at: i64,
    pub settlement_window: i64,
    pub active_settlement_started_at: i64,
    pub max_bidders: u16,
    pub registered_bidders: u16,
    pub current_settlement_index: u16,
    #[max_len(MAX_RANKED_BIDDERS)]
    pub ranked_bidders: Vec<RankedBid>,
}

#[account]
#[derive(InitSpace)]
pub struct BidderState {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub commitment: [u8; 32],
    pub commitment_submitted_at: i64,
    pub bid_amount: u64,
    pub reveal_timestamp: i64,
    pub deposit_amount: u64,
    pub rank: u16,
    pub bump: u8,
    pub deposit_paid: bool,
    pub revealed: bool,
    pub settlement_eligible: bool,
    pub compliance_approved: bool,
    pub settled: bool,
    pub deposit_refunded: bool,
    pub deposit_slashed: bool,
}

#[account]
#[derive(InitSpace)]
pub struct ComplianceRecord {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub reviewer: Pubkey,
    pub status: ComplianceStatus,
    pub attestation_digest: [u8; 32],
    pub reviewed_at: i64,
    pub expires_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum AuctionPhase {
    Bidding,
    Reveal,
    Settlement,
    Completed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum ComplianceStatus {
    Pending,
    Approved,
    Rejected,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum SlashReason {
    MissedSettlementWindow,
    RejectedCompliance,
    ExpiredCompliance,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub struct RankedBid {
    pub bidder: Pubkey,
    pub amount: u64,
    pub reveal_timestamp: i64,
    pub disqualified: bool,
    pub settled: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub struct InitializeAuctionArgs {
    pub auction_seed: [u8; 32],
    pub deposit_amount: u64,
    pub reserve_price: u64,
    pub asset_amount: u64,
    pub bidding_end_at: i64,
    pub reveal_end_at: i64,
    pub settlement_window: i64,
    pub max_bidders: u16,
}

impl Auction {
    pub fn insert_ranked_bid(&mut self, new_bid: RankedBid) -> Result<()> {
        require!(
            self.ranked_bidders.len() < self.max_bidders as usize,
            AuctionError::BidderCapReached
        );
        self.ranked_bidders.push(new_bid);
        self.ranked_bidders.sort_by(compare_ranked_bids);
        Ok(())
    }

    pub fn rank_of(&self, bidder: &Pubkey) -> usize {
        self.ranked_bidders
            .iter()
            .position(|entry| &entry.bidder == bidder)
            .unwrap_or_default()
    }

    pub fn first_eligible_candidate_index(&self) -> Option<usize> {
        self.ranked_bidders
            .iter()
            .enumerate()
            .find(|(_, bid)| !bid.disqualified && !bid.settled && bid.amount >= self.reserve_price)
            .map(|(index, _)| index)
    }

    pub fn next_eligible_candidate_index(&self) -> Option<usize> {
        self.ranked_bidders
            .iter()
            .enumerate()
            .skip(self.current_settlement_index as usize + 1)
            .find(|(_, bid)| !bid.disqualified && !bid.settled && bid.amount >= self.reserve_price)
            .map(|(index, _)| index)
    }

    pub fn has_active_candidate(&self, bidder: &Pubkey) -> bool {
        self.ranked_bidders
            .get(self.current_settlement_index as usize)
            .map(|bid| !bid.disqualified && !bid.settled && &bid.bidder == bidder)
            .unwrap_or(false)
    }

    pub fn bidder_is_still_eligible(&self, bidder: &Pubkey) -> bool {
        if self.phase != AuctionPhase::Settlement {
            return false;
        }
        self.ranked_bidders
            .iter()
            .enumerate()
            .skip(self.current_settlement_index as usize)
            .any(|(_, bid)| !bid.disqualified && !bid.settled && &bid.bidder == bidder)
    }

    pub fn disqualify_bidder(&mut self, bidder: &Pubkey) -> Result<()> {
        let entry = self
            .ranked_bidders
            .iter_mut()
            .find(|entry| &entry.bidder == bidder)
            .ok_or(AuctionError::BidderNotRanked)?;
        entry.disqualified = true;
        Ok(())
    }

    pub fn mark_bidder_settled(&mut self, bidder: &Pubkey) -> Result<()> {
        let entry = self
            .ranked_bidders
            .iter_mut()
            .find(|entry| &entry.bidder == bidder)
            .ok_or(AuctionError::BidderNotRanked)?;
        entry.settled = true;
        Ok(())
    }

    pub fn available_proceeds(&self) -> Option<u64> {
        self.total_proceeds
            .checked_add(self.total_slashed)?
            .checked_sub(self.total_withdrawn)
    }
}

impl BidderState {
    pub fn pda(auction: &Pubkey, bidder: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[BIDDER_SEED, auction.as_ref(), bidder.as_ref()],
            &crate::ID,
        )
    }
}

pub fn require_admin(auction: &Auction, signer: Pubkey) -> Result<()> {
    require!(
        signer == auction.issuer || signer == auction.reviewer_authority,
        AuctionError::Unauthorized
    );
    Ok(())
}

pub fn build_commitment(
    auction: Pubkey,
    bidder: Pubkey,
    bid_amount: u64,
    salt: &[u8; 32],
) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(COMMITMENT_DOMAIN);
    hasher.update(auction.as_ref());
    hasher.update(bidder.as_ref());
    hasher.update(bid_amount.to_le_bytes());
    hasher.update(salt);
    hasher.finalize().into()
}

pub fn compare_ranked_bids(left: &RankedBid, right: &RankedBid) -> std::cmp::Ordering {
    right
        .amount
        .cmp(&left.amount)
        .then_with(|| left.reveal_timestamp.cmp(&right.reveal_timestamp))
        .then_with(|| left.bidder.to_bytes().cmp(&right.bidder.to_bytes()))
}
