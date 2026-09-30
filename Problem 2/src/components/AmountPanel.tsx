import { useTranslation } from 'react-i18next';
import '../i18n';
import { useFormatters } from '../i18n/format';
import { Box, Button, InputBase, Stack, Typography } from '@mui/material';
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded';
import { TokenAvatar } from './TokenAvatar';
import type { ErrorCode } from '../errors';
import type { Token } from '../types';
export function AmountPanel({
  token,
  receiving = false,
  value,
  dollarValue,
  onChange,
  onSelect,
  onFraction,
  error,
}: {
  token: Token;
  receiving?: boolean;
  value: string;
  dollarValue: string;
  onChange?: (value: string) => void;
  onSelect: () => void;
  onFraction?: (part: number) => void;
  error?: ErrorCode | null;
}) {
  const { t } = useTranslation();
  const format = useFormatters();
  return (
    <Box
      className={`amount-panel ${receiving ? 'receiving' : 'paying'}`}
      sx={{ borderColor: error ? 'error.main' : undefined }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography
          component="label"
          htmlFor={receiving ? 'receive-amount' : 'pay-amount'}
          variant="body2"
          fontWeight={600}
          color={receiving ? 'text.primary' : 'primary.main'}
        >
          {receiving ? t('swap.receive') : t('swap.pay')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t('swap.balance', { amount: format.amount(token.balance) })}
        </Typography>
      </Stack>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.7, mb: 0.6 }}>
        <InputBase
          id={receiving ? 'receive-amount' : 'pay-amount'}
          className={receiving ? 'receive-amount-input' : 'pay-amount-input'}
          error={!!error}
          value={receiving ? value : format.input(value)}
          placeholder={format.input('0.00')}
          onChange={(e) => onChange?.(format.normalizeInput(e.target.value))}
          readOnly={receiving}
          inputProps={{
            'aria-label': receiving ? t('swap.receiveLabel') : t('swap.payLabel'),
            inputMode: 'decimal',
            maxLength: 40,
            'aria-invalid': !!error,
            'aria-describedby': receiving
              ? undefined
              : error
                ? 'pay-amount-hint amount-error'
                : 'pay-amount-hint',
          }}
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: { xs: 27, sm: 34 },
            fontWeight: 500,
            letterSpacing: '-1px',
            '& input': { p: 0, textOverflow: 'ellipsis' },
          }}
        />
        <Button
          onClick={onSelect}
          aria-label={t(receiving ? 'swap.selectReceive' : 'swap.selectPay', {
            currency: token.currency,
          })}
          color="inherit"
          className="token-select"
          endIcon={<KeyboardArrowDownRounded />}
          startIcon={<TokenAvatar token={token} size={28} />}
          sx={{ whiteSpace: 'nowrap', fontSize: 16 }}
        >
          <Box
            component="span"
            sx={{ maxWidth: { xs: 74, sm: 115 }, overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {token.currency}
          </Box>
        </Button>
      </Stack>
      {!receiving && (
        <Typography
          id="pay-amount-hint"
          variant="caption"
          color="primary.main"
          sx={{ display: 'block', mt: 0.8, mb: 1, fontWeight: 500 }}
        >
          {t('swap.hint')}
        </Typography>
      )}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ minHeight: 27 }}
      >
        <Typography variant="caption" color="text.secondary">
          {dollarValue}
        </Typography>
        {!receiving && (
          <Stack direction="row" spacing={0.5}>
            {[0.5, 1].map((part) => (
              <Button
                key={part}
                size="small"
                onClick={() => onFraction?.(part)}
                sx={{ minWidth: 35, p: '2px 8px', fontSize: 11, bgcolor: '#dceafb' }}
              >
                {part === 1 ? t('swap.max') : format.percent(part)}
              </Button>
            ))}
          </Stack>
        )}{' '}
        {receiving && (
          <Typography variant="caption" color="text.secondary">
            {t('swap.afterFee', { fee: format.percent(0.003) })}
          </Typography>
        )}
      </Stack>
      {error && (
        <Typography
          id="amount-error"
          role="alert"
          variant="caption"
          color="error"
          sx={{ display: 'block', mt: 1 }}
        >
          {t(error)}
        </Typography>
      )}
    </Box>
  );
}
