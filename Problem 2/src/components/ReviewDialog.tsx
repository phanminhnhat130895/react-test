import { useTranslation } from 'react-i18next';
import '../i18n';
import { useFormatters } from '../i18n/format';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import SwapVertRounded from '@mui/icons-material/SwapVertRounded';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import { TokenAvatar } from './TokenAvatar';
import type { ErrorCode } from '../errors';
import type { Token, SwapRequest } from '../types';
export interface Review {
  request: SwapRequest;
  from: Token;
  to: Token;
  fee: string;
}
export function ReviewDialog({
  review,
  submitting,
  seconds,
  swapError,
  onClose,
  onConfirm,
}: {
  review: Review | null;
  submitting: boolean;
  seconds: number;
  swapError: ErrorCode | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const format = useFormatters();
  return (
    <Dialog
      open={!!review}
      onClose={onClose}
      disableEscapeKeyDown={submitting}
      maxWidth="xs"
      fullWidth
      aria-labelledby="review-title"
    >
      <DialogTitle id="review-title">
        {t('review.title')}
        <IconButton
          disabled={submitting}
          aria-label={t('review.close')}
          onClick={onClose}
          sx={{ float: 'right' }}
        >
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      {review && (
        <>
          <DialogContent>
            <Chip label={t('review.simulated')} size="small" sx={{ mb: 2 }} />
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <TokenAvatar token={review.from} size={40} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('swap.pay')}
                  </Typography>
                  <Typography fontWeight={600}>
                    {t('common.tokenAmount', {
                      amount: format.amount(review.request.amount),
                      currency: review.from.currency,
                    })}
                  </Typography>
                </Box>
              </Stack>
              <SwapVertRounded color="disabled" />
              <Stack direction="row" spacing={1.5} alignItems="center">
                <TokenAvatar token={review.to} size={40} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('review.receiveAfterFee')}
                  </Typography>
                  <Typography fontWeight={600}>
                    {t('common.tokenAmount', {
                      amount: format.amount(review.request.expectedReceive),
                      currency: review.to.currency,
                    })}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
            <Divider sx={{ my: 2.5 }} />
            <Typography variant="body2" color="text.secondary">
              {t('review.fee', {
                amount: format.amount(review.fee),
                currency: review.from.currency,
                fee: format.percent(0.003),
              })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {review.from.source === 'sample' || review.to.source === 'sample'
                ? t('review.samplePrices')
                : t('review.historicalPrices', { date: format.date('monthLong') })}
            </Typography>
            <Typography
              role="timer"
              variant="caption"
              color={seconds === 0 ? 'error' : 'text.secondary'}
              sx={{ display: 'block', mt: 1 }}
            >
              {seconds > 0 ? t('review.validFor', { count: seconds }) : t('errors.quoteExpired')}
            </Typography>
            {swapError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {t(swapError)}
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button disabled={submitting} onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="contained"
              disabled={submitting || seconds === 0}
              onClick={onConfirm}
              startIcon={
                submitting ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <CheckCircleOutlineRounded />
                )
              }
            >
              {submitting ? t('review.submitting') : t('review.confirm')}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
