use anchor_lang::prelude::*;
use constant_product_curve::CurveError;

#[error_code]
pub enum AmmError {
    #[msg("DefaultError")]
    DefaultError,
    #[msg("Offer expired.")]
    OfferExpired,
    #[msg("This pool is locked")]
    PoolLocked,
    #[msg("insufficient balance")]
    InsufficientBalance,
    #[msg("invalid fee amount")]
    InvalidFeeAmount,
    #[msg("invalid precision")]
    InvalidPrecision,
    #[msg("overflow on calculation")]
    Overflow,
    #[msg("underflow on calculation")]
    Underflow,
    #[msg("zero balance")]
    ZeroBalance,
    #[msg("slippage limit exceeded")]
    SlippageLimitExceeded,
    #[msg("amount must be greater than zero")]
    InvalidAmount
}


impl From<CurveError> for AmmError {
    fn from( error: CurveError) -> AmmError {
        match error {
            CurveError::InsufficientBalance => AmmError::InsufficientBalance,
            CurveError::InvalidFeeAmount => AmmError::InvalidFeeAmount,
            CurveError::InvalidPrecision => AmmError::InvalidPrecision,
            CurveError::Overflow => AmmError::Overflow,
            CurveError::Underflow => AmmError::Underflow,
            CurveError::ZeroBalance => AmmError::ZeroBalance,
            CurveError::SlippageLimitExceeded => AmmError::SlippageLimitExceeded,
        }
    }
}