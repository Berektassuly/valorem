use crate::{
    contexts::*,
    errors::AuctionError,
    state::{
        build_commitment, require_admin, AuctionPhase, BidderState, ComplianceStatus,
        InitializeAuctionArgs, RankedBid, SlashReason, AUCTION_SEED,
    },
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, TransferChecked};
use spl_transfer_hook_interface::{
    get_extra_account_metas_address, solana_pubkey::Pubkey as InterfacePubkey,
};
use valorem_transfer_hook;

fn to_interface_pubkey(pubkey: &Pubkey) -> InterfacePubkey {
    InterfacePubkey::new_from_array(pubkey.to_bytes())
}

pub fn initialize_auction(
    ctx: Context<InitializeAuction>,
    args: InitializeAuctionArgs,
) -> Result<()> {
    require!(args.deposit_amount > 0, AuctionError::InvalidDepositAmount);
    require!(args.asset_amount > 0, AuctionError::InvalidAssetAmount);
    require!(
        args.bidding_end_at < args.reveal_end_at,
        AuctionError::InvalidAuctionWindow
    );
    require!(
        args.settlement_window > 0,
        AuctionError::InvalidSettlementWindow
    );
    require!(
        args.max_bidders > 0 && args.max_bidders as usize <= crate::state::MAX_RANKED_BIDDERS,
        AuctionError::InvalidMaxBidders
    );

    let hook_config_address = Pubkey::find_program_address(
        &[
            crate::state::HOOK_CONFIG_SEED,
            ctx.accounts.asset_mint.key().as_ref(),
        ],
        &valorem_transfer_hook::ID,
    )
    .0;
    require_keys_eq!(
        hook_config_address,
        ctx.accounts.hook_config.key(),
        AuctionError::InvalidHookConfigAccount
    );
    require_keys_eq!(
        Pubkey::new_from_array(
            get_extra_account_metas_address(
                &to_interface_pubkey(&ctx.accounts.asset_mint.key()),
                &to_interface_pubkey(&valorem_transfer_hook::ID),
            )
            .to_bytes(),
        ),
        ctx.accounts.extra_account_meta_list.key(),
        AuctionError::InvalidHookValidationAccount
    );

    let auction = &mut ctx.accounts.auction;
    auction.issuer = ctx.accounts.issuer.key();
    auction.reviewer_authority = ctx.accounts.reviewer.key();
    auction.asset_mint = ctx.accounts.asset_mint.key();
    auction.payment_mint = ctx.accounts.payment_mint.key();
    auction.asset_vault = ctx.accounts.asset_vault.key();
    auction.payment_vault = ctx.accounts.payment_vault.key();
    auction.issuer_payment_destination = ctx.accounts.issuer_payment_destination.key();
    auction.transfer_hook_config = ctx.accounts.hook_config.key();
    auction.transfer_hook_validation = ctx.accounts.extra_account_meta_list.key();
    auction.auction_seed = args.auction_seed;
    auction.phase = AuctionPhase::Bidding;
    auction.bump = ctx.bumps.auction;
    auction.asset_deposited = false;
    auction.has_settled_bidder = false;
    auction.settled_bidder = Pubkey::default();
    auction.deposit_amount = args.deposit_amount;
    auction.reserve_price = args.reserve_price;
    auction.asset_amount = args.asset_amount;
    auction.total_deposits_held = 0;
    auction.total_slashed = 0;
    auction.total_proceeds = 0;
    auction.total_withdrawn = 0;
    auction.bidding_end_at = args.bidding_end_at;
    auction.reveal_end_at = args.reveal_end_at;
    auction.settlement_window = args.settlement_window;
    auction.active_settlement_started_at = 0;
    auction.max_bidders = args.max_bidders;
    auction.registered_bidders = 0;
    auction.current_settlement_index = 0;
    auction.ranked_bidders = Vec::new();

    let cpi_accounts = valorem_transfer_hook::cpi::accounts::InitializeHook {
        payer: ctx.accounts.issuer.to_account_info(),
        authority: ctx.accounts.issuer.to_account_info(),
        mint: ctx.accounts.asset_mint.to_account_info(),
        config: ctx.accounts.hook_config.to_account_info(),
        extra_account_meta_list: ctx.accounts.extra_account_meta_list.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };
    valorem_transfer_hook::cpi::initialize_hook(
        CpiContext::new(
            ctx.accounts.transfer_hook_program.to_account_info(),
            cpi_accounts,
        ),
        ctx.accounts.auction.key(),
    )?;
    Ok(())
}

pub fn deposit_asset(ctx: Context<DepositAsset>) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    require_keys_eq!(
        auction.issuer,
        ctx.accounts.issuer.key(),
        AuctionError::Unauthorized
    );
    require!(
        auction.phase == AuctionPhase::Bidding,
        AuctionError::InvalidPhase
    );
    require!(
        !auction.asset_deposited,
        AuctionError::AssetAlreadyDeposited
    );

    token_interface::transfer_checked(
        CpiContext::new(
            ctx.accounts.asset_token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.issuer_asset_account.to_account_info(),
                mint: ctx.accounts.asset_mint.to_account_info(),
                to: ctx.accounts.asset_vault.to_account_info(),
                authority: ctx.accounts.issuer.to_account_info(),
            },
        ),
        auction.asset_amount,
        ctx.accounts.asset_mint.decimals,
    )?;
    auction.asset_deposited = true;
    Ok(())
}

pub fn submit_commitment(ctx: Context<SubmitCommitment>, commitment: [u8; 32]) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    let now = Clock::get()?.unix_timestamp;
    require!(
        auction.phase == AuctionPhase::Bidding,
        AuctionError::InvalidPhase
    );
    require!(now <= auction.bidding_end_at, AuctionError::BiddingClosed);
    require!(
        auction.registered_bidders < auction.max_bidders,
        AuctionError::BidderCapReached
    );

    token_interface::transfer_checked(
        CpiContext::new(
            ctx.accounts.payment_token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.bidder_payment_account.to_account_info(),
                mint: ctx.accounts.payment_mint.to_account_info(),
                to: ctx.accounts.payment_vault.to_account_info(),
                authority: ctx.accounts.bidder.to_account_info(),
            },
        ),
        auction.deposit_amount,
        ctx.accounts.payment_mint.decimals,
    )?;

    let bidder_state = &mut ctx.accounts.bidder_state;
    bidder_state.auction = auction.key();
    bidder_state.bidder = ctx.accounts.bidder.key();
    bidder_state.commitment = commitment;
    bidder_state.commitment_submitted_at = now;
    bidder_state.bid_amount = 0;
    bidder_state.reveal_timestamp = 0;
    bidder_state.deposit_amount = auction.deposit_amount;
    bidder_state.rank = 0;
    bidder_state.bump = ctx.bumps.bidder_state;
    bidder_state.deposit_paid = true;
    bidder_state.revealed = false;
    bidder_state.settlement_eligible = false;
    bidder_state.compliance_approved = false;
    bidder_state.settled = false;
    bidder_state.deposit_refunded = false;
    bidder_state.deposit_slashed = false;

    auction.registered_bidders = auction
        .registered_bidders
        .checked_add(1)
        .ok_or(AuctionError::ArithmeticOverflow)?;
    auction.total_deposits_held = auction
        .total_deposits_held
        .checked_add(auction.deposit_amount)
        .ok_or(AuctionError::ArithmeticOverflow)?;
    Ok(())
}

pub fn advance_to_reveal(ctx: Context<AdvanceAuctionPhase>) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    require_admin(auction, ctx.accounts.admin.key())?;
    require!(
        auction.phase == AuctionPhase::Bidding,
        AuctionError::InvalidPhase
    );
    require!(
        Clock::get()?.unix_timestamp >= auction.bidding_end_at,
        AuctionError::BiddingStillOpen
    );
    auction.phase = AuctionPhase::Reveal;
    Ok(())
}

pub fn reveal_bid(ctx: Context<RevealBid>, bid_amount: u64, salt: [u8; 32]) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    let bidder_state = &mut ctx.accounts.bidder_state;
    let now = Clock::get()?.unix_timestamp;
    require!(
        auction.phase == AuctionPhase::Reveal,
        AuctionError::InvalidPhase
    );
    require!(now <= auction.reveal_end_at, AuctionError::RevealClosed);
    require!(!bidder_state.revealed, AuctionError::BidAlreadyRevealed);
    require!(
        bid_amount >= auction.deposit_amount,
        AuctionError::BidAmountBelowDeposit
    );

    let expected = build_commitment(auction.key(), ctx.accounts.bidder.key(), bid_amount, &salt);
    require!(
        expected == bidder_state.commitment,
        AuctionError::RevealMismatch
    );

    bidder_state.bid_amount = bid_amount;
    bidder_state.reveal_timestamp = now;
    bidder_state.revealed = true;
    auction.insert_ranked_bid(RankedBid {
        bidder: ctx.accounts.bidder.key(),
        amount: bid_amount,
        reveal_timestamp: now,
        disqualified: false,
        settled: false,
    })?;
    bidder_state.rank = auction.rank_of(&ctx.accounts.bidder.key()) as u16 + 1;
    Ok(())
}

pub fn close_reveal(ctx: Context<CloseReveal>) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    require_admin(auction, ctx.accounts.admin.key())?;
    require!(
        auction.phase == AuctionPhase::Reveal,
        AuctionError::InvalidPhase
    );
    require!(
        Clock::get()?.unix_timestamp >= auction.reveal_end_at,
        AuctionError::RevealStillOpen
    );

    if let Some(index) = auction.first_eligible_candidate_index() {
        auction.phase = AuctionPhase::Settlement;
        auction.current_settlement_index = index as u16;
        auction.active_settlement_started_at = Clock::get()?.unix_timestamp;

        let current = auction.ranked_bidders[index];
        let current_state_key = BidderState::pda(&auction.key(), &current.bidder).0;
        require_keys_eq!(
            current_state_key,
            ctx.accounts.current_candidate_state.key(),
            AuctionError::CurrentCandidateAccountMismatch
        );
        set_bidder_state_eligibility(
            &ctx.accounts.current_candidate_state,
            true,
            index as u16 + 1,
        )?;
    } else {
        auction.phase = AuctionPhase::Completed;
    }
    Ok(())
}

pub fn record_compliance(
    ctx: Context<RecordCompliance>,
    status: ComplianceStatus,
    attestation_digest: [u8; 32],
    expires_at: i64,
) -> Result<()> {
    require_admin(&ctx.accounts.auction, ctx.accounts.reviewer.key())?;
    let compliance = &mut ctx.accounts.compliance_record;
    compliance.auction = ctx.accounts.auction.key();
    compliance.bidder = ctx.accounts.bidder.key();
    compliance.reviewer = ctx.accounts.reviewer.key();
    compliance.status = status;
    compliance.attestation_digest = attestation_digest;
    compliance.reviewed_at = Clock::get()?.unix_timestamp;
    compliance.expires_at = expires_at;
    compliance.bump = ctx.bumps.compliance_record;

    let bidder_state = &mut ctx.accounts.bidder_state;
    require_keys_eq!(
        bidder_state.bidder,
        ctx.accounts.bidder.key(),
        AuctionError::BidderMismatch
    );
    bidder_state.compliance_approved =
        status == ComplianceStatus::Approved && expires_at >= Clock::get()?.unix_timestamp;
    Ok(())
}

pub fn settle_candidate(ctx: Context<SettleCandidate>) -> Result<()> {
    let auction_info = ctx.accounts.auction.to_account_info();
    let transfer_hook_program_info = ctx.accounts.transfer_hook_program.to_account_info();
    let asset_token_program_info = ctx.accounts.asset_token_program.to_account_info();
    let payment_token_program_info = ctx.accounts.payment_token_program.to_account_info();
    let system_program_info = ctx.accounts.system_program.to_account_info();
    let asset_vault_info = ctx.accounts.asset_vault.to_account_info();
    let asset_mint_info = ctx.accounts.asset_mint.to_account_info();
    let bidder_asset_info = ctx.accounts.bidder_asset_account.to_account_info();
    let hook_config_info = ctx.accounts.hook_config.to_account_info();
    let transfer_permit_info = ctx.accounts.transfer_permit.to_account_info();
    let extra_meta_info = ctx.accounts.extra_account_meta_list.to_account_info();
    let bidder_payment_info = ctx.accounts.bidder_payment_account.to_account_info();
    let payment_mint_info = ctx.accounts.payment_mint.to_account_info();
    let payment_vault_info = ctx.accounts.payment_vault.to_account_info();

    let auction = &mut ctx.accounts.auction;
    let bidder_state = &mut ctx.accounts.bidder_state;
    let now = Clock::get()?.unix_timestamp;
    require!(
        auction.phase == AuctionPhase::Settlement,
        AuctionError::InvalidPhase
    );
    require!(
        auction.has_active_candidate(&ctx.accounts.bidder.key()),
        AuctionError::NotActiveSettlementCandidate
    );
    require!(
        now <= auction.active_settlement_started_at + auction.settlement_window,
        AuctionError::SettlementWindowElapsed
    );
    require!(bidder_state.revealed, AuctionError::BidNotRevealed);
    require!(
        bidder_state.compliance_approved,
        AuctionError::ComplianceNotApproved
    );
    require!(
        ctx.accounts.compliance_record.status == ComplianceStatus::Approved,
        AuctionError::ComplianceNotApproved
    );
    require!(
        ctx.accounts.compliance_record.expires_at >= now,
        AuctionError::ComplianceExpired
    );
    require_keys_eq!(
        auction.transfer_hook_config,
        ctx.accounts.hook_config.key(),
        AuctionError::InvalidHookConfigAccount
    );
    require_keys_eq!(
        auction.transfer_hook_validation,
        ctx.accounts.extra_account_meta_list.key(),
        AuctionError::InvalidHookValidationAccount
    );

    let remaining_payment = bidder_state
        .bid_amount
        .checked_sub(auction.deposit_amount)
        .ok_or(AuctionError::ArithmeticOverflow)?;
    if remaining_payment > 0 {
        token_interface::transfer_checked(
            CpiContext::new(
                payment_token_program_info.clone(),
                TransferChecked {
                    from: bidder_payment_info,
                    mint: payment_mint_info,
                    to: payment_vault_info,
                    authority: ctx.accounts.bidder.to_account_info(),
                },
            ),
            remaining_payment,
            ctx.accounts.payment_mint.decimals,
        )?;
    }

    let bump = [auction.bump];
    let signer_seeds: &[&[u8]] = &[
        AUCTION_SEED,
        auction.issuer.as_ref(),
        auction.auction_seed.as_ref(),
        &bump,
    ];
    let permit_expiry = now
        .checked_add(300)
        .ok_or(AuctionError::ArithmeticOverflow)?;
    let issue_permit_accounts = valorem_transfer_hook::cpi::accounts::IssuePermit {
        controller: auction_info.clone(),
        mint: asset_mint_info.clone(),
        config: hook_config_info,
        permit: transfer_permit_info.clone(),
        source_token: asset_vault_info.clone(),
        destination_token: bidder_asset_info.clone(),
        system_program: system_program_info,
    };
    valorem_transfer_hook::cpi::issue_permit(
        CpiContext::new_with_signer(
            transfer_hook_program_info,
            issue_permit_accounts,
            &[signer_seeds],
        ),
        auction.asset_amount,
        permit_expiry,
    )?;

    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            asset_token_program_info,
            TransferChecked {
                from: asset_vault_info,
                mint: asset_mint_info,
                to: bidder_asset_info,
                authority: auction_info,
            },
            &[signer_seeds],
        )
        .with_remaining_accounts(vec![extra_meta_info, transfer_permit_info]),
        auction.asset_amount,
        ctx.accounts.asset_mint.decimals,
    )?;

    bidder_state.settlement_eligible = false;
    bidder_state.settled = true;
    bidder_state.rank = auction.rank_of(&ctx.accounts.bidder.key()) as u16 + 1;
    auction.mark_bidder_settled(&ctx.accounts.bidder.key())?;
    auction.phase = AuctionPhase::Completed;
    auction.has_settled_bidder = true;
    auction.settled_bidder = ctx.accounts.bidder.key();
    auction.active_settlement_started_at = 0;
    auction.asset_deposited = false;
    auction.total_deposits_held = auction
        .total_deposits_held
        .checked_sub(auction.deposit_amount)
        .ok_or(AuctionError::ArithmeticOverflow)?;
    auction.total_proceeds = auction
        .total_proceeds
        .checked_add(bidder_state.bid_amount)
        .ok_or(AuctionError::ArithmeticOverflow)?;
    Ok(())
}

pub fn slash_unrevealed(ctx: Context<SlashUnrevealed>) -> Result<()> {
    require_admin(&ctx.accounts.auction, ctx.accounts.admin.key())?;
    require!(
        Clock::get()?.unix_timestamp >= ctx.accounts.auction.reveal_end_at,
        AuctionError::RevealStillOpen
    );
    require!(
        !ctx.accounts.bidder_state.revealed,
        AuctionError::BidAlreadyRevealed
    );
    require!(
        ctx.accounts.bidder_state.deposit_paid,
        AuctionError::DepositNotPaid
    );
    require!(
        !ctx.accounts.bidder_state.deposit_slashed && !ctx.accounts.bidder_state.deposit_refunded,
        AuctionError::DepositAlreadyResolved
    );

    let auction = &mut ctx.accounts.auction;
    let bidder_state = &mut ctx.accounts.bidder_state;
    bidder_state.deposit_slashed = true;
    auction.total_deposits_held = auction
        .total_deposits_held
        .checked_sub(auction.deposit_amount)
        .ok_or(AuctionError::ArithmeticOverflow)?;
    auction.total_slashed = auction
        .total_slashed
        .checked_add(auction.deposit_amount)
        .ok_or(AuctionError::ArithmeticOverflow)?;
    Ok(())
}

pub fn slash_candidate_and_advance(
    ctx: Context<SlashCandidateAndAdvance>,
    reason: SlashReason,
) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    let bidder_state = &mut ctx.accounts.current_bidder_state;
    let now = Clock::get()?.unix_timestamp;
    require_admin(auction, ctx.accounts.admin.key())?;
    require!(
        auction.phase == AuctionPhase::Settlement,
        AuctionError::InvalidPhase
    );
    require!(
        auction.has_active_candidate(&bidder_state.bidder),
        AuctionError::NotActiveSettlementCandidate
    );

    match reason {
        SlashReason::MissedSettlementWindow => {
            require!(
                now > auction.active_settlement_started_at + auction.settlement_window,
                AuctionError::SettlementWindowStillOpen
            );
        }
        SlashReason::RejectedCompliance => {
            require!(
                ctx.accounts.compliance_record.status == ComplianceStatus::Rejected,
                AuctionError::ComplianceStillPending
            );
        }
        SlashReason::ExpiredCompliance => {
            require!(
                ctx.accounts.compliance_record.status == ComplianceStatus::Approved
                    && ctx.accounts.compliance_record.expires_at < now,
                AuctionError::ComplianceStillPending
            );
        }
    }

    bidder_state.deposit_slashed = true;
    bidder_state.settlement_eligible = false;
    auction.total_deposits_held = auction
        .total_deposits_held
        .checked_sub(auction.deposit_amount)
        .ok_or(AuctionError::ArithmeticOverflow)?;
    auction.total_slashed = auction
        .total_slashed
        .checked_add(auction.deposit_amount)
        .ok_or(AuctionError::ArithmeticOverflow)?;
    auction.disqualify_bidder(&bidder_state.bidder)?;

    if let Some(next_index) = auction.next_eligible_candidate_index() {
        auction.current_settlement_index = next_index as u16;
        auction.active_settlement_started_at = now;
        let next_candidate = auction.ranked_bidders[next_index];
        let next_state_key = BidderState::pda(&auction.key(), &next_candidate.bidder).0;
        require_keys_eq!(
            next_state_key,
            ctx.accounts.next_candidate_state.key(),
            AuctionError::NextCandidateAccountMismatch
        );
        set_bidder_state_eligibility(
            &ctx.accounts.next_candidate_state,
            true,
            next_index as u16 + 1,
        )?;
    } else {
        auction.phase = AuctionPhase::Completed;
        auction.active_settlement_started_at = 0;
    }
    Ok(())
}

pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
    let auction_info = ctx.accounts.auction.to_account_info();
    let token_program_info = ctx.accounts.payment_token_program.to_account_info();
    let payment_vault_info = ctx.accounts.payment_vault.to_account_info();
    let payment_mint_info = ctx.accounts.payment_mint.to_account_info();
    let bidder_payment_info = ctx.accounts.bidder_payment_account.to_account_info();
    let auction = &mut ctx.accounts.auction;
    let bidder_state = &mut ctx.accounts.bidder_state;
    require!(bidder_state.revealed, AuctionError::BidNotRevealed);
    require!(
        !bidder_state.deposit_refunded && !bidder_state.deposit_slashed,
        AuctionError::DepositAlreadyResolved
    );
    require!(
        auction.phase == AuctionPhase::Completed
            || !auction.bidder_is_still_eligible(&bidder_state.bidder),
        AuctionError::BidderStillEligibleForSettlement
    );

    let bump = [auction.bump];
    let signer_seeds: &[&[u8]] = &[
        AUCTION_SEED,
        auction.issuer.as_ref(),
        auction.auction_seed.as_ref(),
        &bump,
    ];
    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            token_program_info,
            TransferChecked {
                from: payment_vault_info,
                mint: payment_mint_info,
                to: bidder_payment_info,
                authority: auction_info,
            },
            &[signer_seeds],
        ),
        bidder_state.deposit_amount,
        ctx.accounts.payment_mint.decimals,
    )?;

    bidder_state.deposit_refunded = true;
    auction.total_deposits_held = auction
        .total_deposits_held
        .checked_sub(bidder_state.deposit_amount)
        .ok_or(AuctionError::ArithmeticOverflow)?;
    Ok(())
}

pub fn reclaim_unsold_asset(ctx: Context<ReclaimUnsoldAsset>) -> Result<()> {
    let auction_info = ctx.accounts.auction.to_account_info();
    let token_program_info = ctx.accounts.asset_token_program.to_account_info();
    let asset_vault_info = ctx.accounts.asset_vault.to_account_info();
    let asset_mint_info = ctx.accounts.asset_mint.to_account_info();
    let issuer_asset_info = ctx.accounts.issuer_asset_account.to_account_info();
    let auction = &mut ctx.accounts.auction;
    require_admin(auction, ctx.accounts.admin.key())?;
    require!(
        auction.phase == AuctionPhase::Completed,
        AuctionError::InvalidPhase
    );
    require!(
        !auction.has_settled_bidder,
        AuctionError::AuctionAlreadySettled
    );
    require!(auction.asset_deposited, AuctionError::AssetNotDeposited);

    let bump = [auction.bump];
    let signer_seeds: &[&[u8]] = &[
        AUCTION_SEED,
        auction.issuer.as_ref(),
        auction.auction_seed.as_ref(),
        &bump,
    ];
    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            token_program_info,
            TransferChecked {
                from: asset_vault_info,
                mint: asset_mint_info,
                to: issuer_asset_info,
                authority: auction_info,
            },
            &[signer_seeds],
        ),
        auction.asset_amount,
        ctx.accounts.asset_mint.decimals,
    )?;
    auction.asset_deposited = false;
    Ok(())
}

pub fn withdraw_proceeds(ctx: Context<WithdrawProceeds>, amount: u64) -> Result<()> {
    let auction_info = ctx.accounts.auction.to_account_info();
    let token_program_info = ctx.accounts.payment_token_program.to_account_info();
    let payment_vault_info = ctx.accounts.payment_vault.to_account_info();
    let payment_mint_info = ctx.accounts.payment_mint.to_account_info();
    let issuer_destination_info = ctx.accounts.issuer_payment_destination.to_account_info();
    let auction = &mut ctx.accounts.auction;
    require_keys_eq!(
        auction.issuer,
        ctx.accounts.issuer.key(),
        AuctionError::Unauthorized
    );
    require!(
        auction.phase == AuctionPhase::Completed,
        AuctionError::InvalidPhase
    );

    let available = auction
        .available_proceeds()
        .ok_or(AuctionError::ArithmeticOverflow)?;
    let withdrawal_amount = if amount == 0 { available } else { amount };
    require!(
        withdrawal_amount <= available,
        AuctionError::InsufficientWithdrawableProceeds
    );

    let bump = [auction.bump];
    let signer_seeds: &[&[u8]] = &[
        AUCTION_SEED,
        auction.issuer.as_ref(),
        auction.auction_seed.as_ref(),
        &bump,
    ];
    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            token_program_info,
            TransferChecked {
                from: payment_vault_info,
                mint: payment_mint_info,
                to: issuer_destination_info,
                authority: auction_info,
            },
            &[signer_seeds],
        ),
        withdrawal_amount,
        ctx.accounts.payment_mint.decimals,
    )?;

    auction.total_withdrawn = auction
        .total_withdrawn
        .checked_add(withdrawal_amount)
        .ok_or(AuctionError::ArithmeticOverflow)?;
    Ok(())
}

fn set_bidder_state_eligibility(
    account: &UncheckedAccount,
    settlement_eligible: bool,
    rank: u16,
) -> Result<()> {
    require_keys_eq!(*account.owner, crate::ID, AuctionError::Unauthorized);
    let mut reader: &[u8] = &account.try_borrow_data()?;
    let mut bidder_state = BidderState::try_deserialize(&mut reader)?;
    bidder_state.settlement_eligible = settlement_eligible;
    bidder_state.rank = rank;
    let mut writer = account.try_borrow_mut_data()?;
    bidder_state.try_serialize(&mut &mut writer[..])?;
    Ok(())
}
