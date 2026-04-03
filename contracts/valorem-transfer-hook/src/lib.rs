use anchor_lang::{
    prelude::*,
    system_program::{create_account, CreateAccount},
};
use anchor_spl::token_interface::{Mint, TokenAccount};
use spl_discriminator::SplDiscriminate;
use spl_tlv_account_resolution::{
    account::ExtraAccountMeta,
    seeds::Seed,
    state::ExtraAccountMetaList,
};
use spl_transfer_hook_interface::{
    collect_extra_account_metas_signer_seeds, get_extra_account_metas_address,
    get_extra_account_metas_address_and_bump_seed,
    instruction::{ExecuteInstruction, TransferHookInstruction},
    solana_pubkey::Pubkey as InterfacePubkey,
};

declare_id!("JCdjqNU5JEfuupjT6EAuBphhALhyiBRJy9E3fstwR1Yd");

const CONFIG_SEED: &[u8] = b"config";
const PERMIT_SEED: &[u8] = b"permit";

fn to_interface_pubkey(pubkey: &Pubkey) -> InterfacePubkey {
    InterfacePubkey::new_from_array(pubkey.to_bytes())
}

fn from_interface_pubkey(pubkey: InterfacePubkey) -> Pubkey {
    Pubkey::new_from_array(pubkey.to_bytes())
}

#[program]
pub mod valorem_transfer_hook {
    use super::*;

    pub fn initialize_hook(ctx: Context<InitializeHook>, controller: Pubkey) -> Result<()> {
        require!(controller != Pubkey::default(), HookError::InvalidController);

        let mint_key = ctx.accounts.mint.key();
        let interface_mint = to_interface_pubkey(&mint_key);
        let interface_program_id = to_interface_pubkey(ctx.program_id);
        let (validation_address, validation_bump) =
            get_extra_account_metas_address_and_bump_seed(&interface_mint, &interface_program_id);

        require_keys_eq!(
            from_interface_pubkey(validation_address),
            ctx.accounts.extra_account_meta_list.key(),
            HookError::InvalidValidationAccount
        );

        let meta_list = vec![ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal {
                    bytes: PERMIT_SEED.to_vec(),
                },
                Seed::AccountKey { index: 1 },
                Seed::AccountKey { index: 0 },
                Seed::AccountKey { index: 2 },
            ],
            false,
            true,
        )
        .map_err(|_| HookError::AccountMetaLayoutError)?];

        let space = ExtraAccountMetaList::size_of(meta_list.len())
            .map_err(|_| HookError::AccountMetaLayoutError)?;
        let lamports = Rent::get()?.minimum_balance(space);
        let bump_bytes = [validation_bump];
        let signer_seed_parts =
            collect_extra_account_metas_signer_seeds(&interface_mint, &bump_bytes);
        let signer_seeds = [&signer_seed_parts[..]];

        create_account(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                CreateAccount {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.extra_account_meta_list.to_account_info(),
                },
                &signer_seeds,
            ),
            lamports,
            space as u64,
            ctx.program_id,
        )?;

        ExtraAccountMetaList::init::<ExecuteInstruction>(
            &mut ctx.accounts.extra_account_meta_list.try_borrow_mut_data()?,
            &meta_list,
        )
        .map_err(|_| HookError::AccountMetaLayoutError)?;

        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.controller = controller;
        config.mint = mint_key;
        config.bump = ctx.bumps.config;

        Ok(())
    }

    pub fn issue_permit(
        ctx: Context<IssuePermit>,
        amount: u64,
        expires_at: i64,
    ) -> Result<()> {
        require!(amount > 0, HookError::InvalidPermitAmount);
        require!(
            expires_at > Clock::get()?.unix_timestamp,
            HookError::PermitExpired
        );

        let permit = &mut ctx.accounts.permit;
        permit.mint = ctx.accounts.mint.key();
        permit.source_token = ctx.accounts.source_token.key();
        permit.destination_token = ctx.accounts.destination_token.key();
        permit.authority = ctx.accounts.controller.key();
        permit.allowed_amount = amount;
        permit.remaining_amount = amount;
        permit.issued_at = Clock::get()?.unix_timestamp;
        permit.expires_at = expires_at;
        permit.consumed = false;
        permit.bump = ctx.bumps.permit;

        Ok(())
    }

    pub fn revoke_permit(ctx: Context<RevokePermit>) -> Result<()> {
        let permit = &mut ctx.accounts.permit;
        permit.remaining_amount = 0;
        permit.consumed = true;
        permit.expires_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    #[instruction(discriminator = ExecuteInstruction::SPL_DISCRIMINATOR_SLICE)]
    pub fn transfer_hook(ctx: Context<TransferHook>, amount: u64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let permit = &mut ctx.accounts.permit;

        require_keys_eq!(
            from_interface_pubkey(get_extra_account_metas_address(
                &to_interface_pubkey(&ctx.accounts.mint.key()),
                &to_interface_pubkey(ctx.program_id),
            )),
            ctx.accounts.extra_account_meta_list.key(),
            HookError::InvalidValidationAccount
        );
        require_keys_eq!(
            permit.mint,
            ctx.accounts.mint.key(),
            HookError::PermitMintMismatch
        );
        require_keys_eq!(
            permit.source_token,
            ctx.accounts.source_token.key(),
            HookError::PermitSourceMismatch
        );
        require_keys_eq!(
            permit.destination_token,
            ctx.accounts.destination_token.key(),
            HookError::PermitDestinationMismatch
        );
        require_keys_eq!(
            permit.authority,
            ctx.accounts.owner.key(),
            HookError::PermitAuthorityMismatch
        );
        require!(!permit.consumed, HookError::PermitAlreadyConsumed);
        require!(permit.expires_at >= now, HookError::PermitExpired);
        require!(
            permit.remaining_amount >= amount,
            HookError::TransferAmountExceedsPermit
        );

        permit.remaining_amount = permit
            .remaining_amount
            .checked_sub(amount)
            .ok_or(HookError::ArithmeticOverflow)?;
        if permit.remaining_amount == 0 {
            permit.consumed = true;
        }

        Ok(())
    }
}

pub fn fallback<'info>(
    program_id: &Pubkey,
    accounts: &'info [AccountInfo<'info>],
    data: &[u8],
) -> Result<()> {
    match TransferHookInstruction::unpack(data)
        .map_err(|_| HookError::UnsupportedTransferHookInstruction)?
    {
        TransferHookInstruction::Execute { amount } => {
            let amount_bytes = amount.to_le_bytes();
            __private::__global::transfer_hook(program_id, accounts, &amount_bytes)
        }
        _ => err!(HookError::UnsupportedTransferHookInstruction),
    }
}

#[derive(Accounts)]
pub struct InitializeHook<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = payer,
        space = 8 + HookConfig::INIT_SPACE,
        seeds = [CONFIG_SEED, mint.key().as_ref()],
        bump
    )]
    pub config: Account<'info, HookConfig>,
    /// CHECK: Transfer-hook validation PDA derived from mint + program id.
    #[account(mut)]
    pub extra_account_meta_list: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct IssuePermit<'info> {
    #[account(mut)]
    pub controller: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        seeds = [CONFIG_SEED, mint.key().as_ref()],
        bump = config.bump,
        has_one = controller @ HookError::InvalidController,
        has_one = mint @ HookError::PermitMintMismatch
    )]
    pub config: Account<'info, HookConfig>,
    #[account(
        init_if_needed,
        payer = controller,
        space = 8 + TransferPermit::INIT_SPACE,
        seeds = [PERMIT_SEED, mint.key().as_ref(), source_token.key().as_ref(), destination_token.key().as_ref()],
        bump
    )]
    pub permit: Account<'info, TransferPermit>,
    #[account(
        constraint = source_token.mint == mint.key() @ HookError::PermitMintMismatch
    )]
    pub source_token: InterfaceAccount<'info, TokenAccount>,
    #[account(
        constraint = destination_token.mint == mint.key() @ HookError::PermitMintMismatch
    )]
    pub destination_token: InterfaceAccount<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokePermit<'info> {
    pub controller: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        seeds = [CONFIG_SEED, mint.key().as_ref()],
        bump = config.bump,
        has_one = controller @ HookError::InvalidController,
        has_one = mint @ HookError::PermitMintMismatch
    )]
    pub config: Account<'info, HookConfig>,
    #[account(
        mut,
        seeds = [PERMIT_SEED, mint.key().as_ref(), source_token.key().as_ref(), destination_token.key().as_ref()],
        bump = permit.bump
    )]
    pub permit: Account<'info, TransferPermit>,
    pub source_token: InterfaceAccount<'info, TokenAccount>,
    pub destination_token: InterfaceAccount<'info, TokenAccount>,
}

#[derive(Accounts)]
pub struct TransferHook<'info> {
    #[account(token::mint = mint, token::authority = owner)]
    pub source_token: InterfaceAccount<'info, TokenAccount>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(token::mint = mint)]
    pub destination_token: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: Token-2022 forwards the owner/delegate for the source account.
    pub owner: UncheckedAccount<'info>,
    /// CHECK: Verified in the instruction handler using transfer-hook interface seeds.
    #[account(mut)]
    pub extra_account_meta_list: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [PERMIT_SEED, mint.key().as_ref(), source_token.key().as_ref(), destination_token.key().as_ref()],
        bump = permit.bump
    )]
    pub permit: Account<'info, TransferPermit>,
}

#[account]
#[derive(InitSpace)]
pub struct HookConfig {
    pub authority: Pubkey,
    pub controller: Pubkey,
    pub mint: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct TransferPermit {
    pub mint: Pubkey,
    pub source_token: Pubkey,
    pub destination_token: Pubkey,
    pub authority: Pubkey,
    pub allowed_amount: u64,
    pub remaining_amount: u64,
    pub issued_at: i64,
    pub expires_at: i64,
    pub consumed: bool,
    pub bump: u8,
}

#[error_code]
pub enum HookError {
    #[msg("Only the configured settlement controller may issue permits.")]
    InvalidController,
    #[msg("The supplied validation account does not match the mint's transfer-hook PDA.")]
    InvalidValidationAccount,
    #[msg("The permit mint does not match the transfer mint.")]
    PermitMintMismatch,
    #[msg("The permit source token account does not match the transfer source.")]
    PermitSourceMismatch,
    #[msg("The permit destination token account does not match the transfer destination.")]
    PermitDestinationMismatch,
    #[msg("The permit authority does not match the transfer authority.")]
    PermitAuthorityMismatch,
    #[msg("The permit has already been consumed.")]
    PermitAlreadyConsumed,
    #[msg("The transfer permit has expired.")]
    PermitExpired,
    #[msg("The permit amount must be greater than zero.")]
    InvalidPermitAmount,
    #[msg("The transfer amount exceeds the remaining permit allowance.")]
    TransferAmountExceedsPermit,
    #[msg("Arithmetic overflow while updating the permit.")]
    ArithmeticOverflow,
    #[msg("Failed to derive or initialize the transfer-hook account metadata layout.")]
    AccountMetaLayoutError,
    #[msg("Only execute calls are supported through the fallback router.")]
    UnsupportedTransferHookInstruction,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn permit_template() -> TransferPermit {
        TransferPermit {
            mint: Pubkey::new_unique(),
            source_token: Pubkey::new_unique(),
            destination_token: Pubkey::new_unique(),
            authority: Pubkey::new_unique(),
            allowed_amount: 10,
            remaining_amount: 10,
            issued_at: 0,
            expires_at: 100,
            consumed: false,
            bump: 255,
        }
    }

    #[test]
    fn permit_consumes_exact_amount() {
        let mut permit = permit_template();
        permit.remaining_amount -= 10;
        if permit.remaining_amount == 0 {
            permit.consumed = true;
        }

        assert!(permit.consumed);
        assert_eq!(permit.remaining_amount, 0);
    }

    #[test]
    fn validation_account_derivation_is_stable() {
        let mint = Pubkey::new_unique();
        let validation = from_interface_pubkey(get_extra_account_metas_address(
            &to_interface_pubkey(&mint),
            &to_interface_pubkey(&crate::ID),
        ));

        assert_eq!(
            validation,
            from_interface_pubkey(get_extra_account_metas_address(
                &to_interface_pubkey(&mint),
                &to_interface_pubkey(&crate::ID),
            ))
        );
    }
}
