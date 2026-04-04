use anchor_lang::prelude::*;

#[error_code]
pub enum AuctionError {
    #[msg("Unauthorized action.")]
    Unauthorized,
    #[msg("Auction is in the wrong phase.")]
    InvalidPhase,
    #[msg("Bidding is closed.")]
    BiddingClosed,
    #[msg("Reveal is closed.")]
    RevealClosed,
    #[msg("Bidding is still open.")]
    BiddingStillOpen,
    #[msg("Reveal is still open.")]
    RevealStillOpen,
    #[msg("Settlement window elapsed.")]
    SettlementWindowElapsed,
    #[msg("Settlement window is still open.")]
    SettlementWindowStillOpen,
    #[msg("Bidder cap reached.")]
    BidderCapReached,
    #[msg("Reveal does not match commitment.")]
    RevealMismatch,
    #[msg("Bid already revealed.")]
    BidAlreadyRevealed,
    #[msg("Bid not revealed.")]
    BidNotRevealed,
    #[msg("Not the active settlement candidate.")]
    NotActiveSettlementCandidate,
    #[msg("Compliance approval required.")]
    ComplianceNotApproved,
    #[msg("Compliance approval expired.")]
    ComplianceExpired,
    #[msg("Compliance still pending.")]
    ComplianceStillPending,
    #[msg("Deposit not paid.")]
    DepositNotPaid,
    #[msg("Deposit already refunded or slashed.")]
    DepositAlreadyResolved,
    #[msg("Bidder is still eligible for fallback settlement.")]
    BidderStillEligibleForSettlement,
    #[msg("Asset already deposited.")]
    AssetAlreadyDeposited,
    #[msg("Asset not deposited.")]
    AssetNotDeposited,
    #[msg("Auction already settled.")]
    AuctionAlreadySettled,
    #[msg("Arithmetic overflow.")]
    ArithmeticOverflow,
    #[msg("Payment mint mismatch.")]
    PaymentMintMismatch,
    #[msg("Asset mint mismatch.")]
    AssetMintMismatch,
    #[msg("Payment token program mismatch.")]
    PaymentTokenProgramMismatch,
    #[msg("Asset token program mismatch.")]
    AssetTokenProgramMismatch,
    #[msg("Bid amount must exceed deposit.")]
    BidAmountBelowDeposit,
    #[msg("Current candidate account mismatch.")]
    CurrentCandidateAccountMismatch,
    #[msg("Next candidate account mismatch.")]
    NextCandidateAccountMismatch,
    #[msg("Hook config PDA mismatch.")]
    InvalidHookConfigAccount,
    #[msg("Hook validation PDA mismatch.")]
    InvalidHookValidationAccount,
    #[msg("Deposit amount must be positive.")]
    InvalidDepositAmount,
    #[msg("Asset amount must be positive.")]
    InvalidAssetAmount,
    #[msg("Auction windows are invalid.")]
    InvalidAuctionWindow,
    #[msg("Settlement window must be positive.")]
    InvalidSettlementWindow,
    #[msg("max_bidders is out of range.")]
    InvalidMaxBidders,
    #[msg("Bidder not found in ranked ladder.")]
    BidderNotRanked,
    #[msg("Bidder mismatch.")]
    BidderMismatch,
    #[msg("Insufficient withdrawable proceeds.")]
    InsufficientWithdrawableProceeds,
}
