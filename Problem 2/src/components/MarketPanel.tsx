import { useTranslation } from 'react-i18next';
import '../i18n';
import { useFormatters } from '../i18n/format';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import { TokenAvatar } from './TokenAvatar';
import type { Token } from '../types';
export function MarketPanel({ tokens }: { tokens: Token[] }) {
  const { t } = useTranslation();
  const format = useFormatters();
  return (
    <Box component="aside" className="market-column">
      <Paper className="market-card">
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography fontWeight={600}>{t('market.title')}</Typography>
          <ArrowOutwardRounded sx={{ fontSize: 18, color: 'text.secondary' }} />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {t('market.subtitle')}
        </Typography>
        {['BTC', 'ETH', 'SOL'].map((symbol) => {
          const token = tokens.find((t) => t.currency === symbol);
          return (
            token && (
              <Stack
                key={symbol}
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ pt: 2.8 }}
              >
                <TokenAvatar token={token} size={37} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {token.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {symbol}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" fontWeight={500}>
                    {format.usd(token.price)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {token.source === 'sample'
                      ? t('market.samplePrice')
                      : t('market.historicalPrice')}
                  </Typography>
                </Box>
              </Stack>
            )
          );
        })}
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 3, pt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {t('market.source', { date: format.date('month') })}
          </Typography>
        </Box>
      </Paper>
      <Paper className="explore-card">
        <Chip
          label={t('market.eyebrow')}
          size="small"
          sx={{ bgcolor: '#d1e6fc', color: '#345e89', fontSize: 9, letterSpacing: 1.1, height: 23 }}
        />
        <Typography
          sx={{
            fontSize: 25,
            fontWeight: 500,
            lineHeight: 1.25,
            letterSpacing: '-0.7px',
            mt: 2,
            whiteSpace: 'pre-line',
          }}
        >
          {t('market.heading')}
        </Typography>
        <Typography variant="body2" sx={{ color: '#456686', mt: 1.4, maxWidth: 210 }}>
          {t('market.description', { count: tokens.length })}
        </Typography>
        <Box className="orbit-art" aria-hidden="true">
          <span className="orbit-ring ring-one" />
          <span className="orbit-ring ring-two" />
          <span className="orbit-dot dot-one">↗</span>
          <span className="orbit-dot dot-two">✦</span>
          <span className="orbit-center">o</span>
        </Box>
      </Paper>
    </Box>
  );
}
