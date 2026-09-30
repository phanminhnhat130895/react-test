import { LanguageSelector } from './components/LanguageSelector';
import { errorCode } from './errors';
import type { ErrorCode } from './errors';
import { useTranslation } from 'react-i18next';
import './i18n';
import { useFormatters } from './i18n/format';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CssBaseline,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  ThemeProvider,
  Tooltip,
  Typography,
} from '@mui/material';
import SwapVertRounded from '@mui/icons-material/SwapVertRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import { theme } from './theme';
import { getTokens, submitSwap } from './api';
import { compact, fraction, quote, QUOTE_LIFETIME, validateAmount } from './domain';
import { AmountPanel } from './components/AmountPanel';
import { TokenPicker } from './components/TokenPicker';
import { MarketPanel } from './components/MarketPanel';
import { InfoDialog } from './components/InfoDialog';
import { ReviewDialog } from './components/ReviewDialog';
import type { Review } from './components/ReviewDialog';
import type { Token } from './types';

export default function App() {
  const { t } = useTranslation();
  const format = useFormatters();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ErrorCode | null>(null);
  const [fromSymbol, setFromSymbol] = useState('ETH');
  const [toSymbol, setToSymbol] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [swapError, setSwapError] = useState<ErrorCode | null>(null);
  const [success, setSuccess] = useState<{
    amount: string;
    from: string;
    received: string;
    to: string;
  } | null>(null);
  const [about, setAbout] = useState(false);
  const [now, setNow] = useState(Date.now());
  const inFlight = useRef(false);
  const generation = useRef(0);
  async function load() {
    const id = ++generation.current;
    setLoading(true);
    setLoadError(null);
    try {
      const result = await getTokens();
      if (id !== generation.current) return;
      setTokens(result);
      const nextFrom = result.some((t) => t.currency === fromSymbol)
        ? fromSymbol
        : result[0].currency;
      const nextTo = result.some((t) => t.currency === toSymbol && t.currency !== nextFrom)
        ? toSymbol
        : result.find((t) => t.currency !== nextFrom)!.currency;
      setFromSymbol(nextFrom);
      setToSymbol(nextTo);
    } catch (error) {
      if (id === generation.current) setLoadError(errorCode(error, 'errors.load'));
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, []);
  useEffect(() => {
    if (!review) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [review]);
  const from = tokens.find((t) => t.currency === fromSymbol);
  const to = tokens.find((t) => t.currency === toSymbol);
  const validation = from ? validateAmount(amount, from.balance) : null;
  const estimate = from && to && from !== to && !validation ? quote(amount, from, to) : null;
  const tooSmall = !!estimate && Number(estimate.receive) <= 0;
  const error = amount ? validation || (tooSmall ? 'errors.amountTooSmall' : null) : null;
  const canReview = !!estimate && !tooSmall && !loading && !loadError;
  function openReview() {
    if (!canReview || !from || !to || !estimate) return;
    setNow(Date.now());
    setSwapError(null);
    setSuccess(null);
    setReview({
      from,
      to,
      fee: estimate.fee,
      request: {
        from: from.currency,
        to: to.currency,
        amount,
        expectedReceive: estimate.receive,
        expiresAt: Date.now() + QUOTE_LIFETIME,
        requestId: crypto.randomUUID(),
      },
    });
  }
  async function confirm() {
    if (!review || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setSwapError(null);
    try {
      const result = await submitSwap(review.request);
      setTokens((current) =>
        current.map((token) => ({
          ...token,
          balance: result.balances[token.currency] ?? token.balance,
        })),
      );
      setSuccess({
        amount: review.request.amount,
        from: review.from.currency,
        received: result.received,
        to: review.to.currency,
      });
      setAmount('');
      setReview(null);
    } catch (error) {
      setSwapError(errorCode(error, 'errors.swap'));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }
  const seconds = review ? Math.max(0, Math.ceil((review.request.expiresAt - now) / 1000)) : 0;
  const closeReview = () => {
    if (!inFlight.current) setReview(null);
  };
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <header className="site-header">
        <Box className="header-inner">
          <a className="brand" href="/" aria-label={t('app.home')}>
            <img src="/favicon.svg" alt="" width="34" height="34" />
            Demo Swap
          </a>
          <Box component="nav" aria-label={t('app.navigation')} className="navigation">
            <span className="nav-active">{t('app.swap')}</span>
            <Button color="inherit" onClick={() => setAbout(true)}>
              {t('app.howItWorks')}
            </Button>
          </Box>
          <Box className="header-actions">
            <LanguageSelector />
            <Chip
              className="demo-wallet"
              icon={<AccountBalanceWalletOutlined />}
              label={t('app.wallet')}
              variant="outlined"
            />
          </Box>
        </Box>
      </header>
      <main className="main-container">
        <Box className="page-heading">
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <span className="eyebrow-dot" />
              <Typography className="eyebrow">{t('app.eyebrow')}</Typography>
            </Stack>
            <Typography component="h1" variant="h3" sx={{ fontSize: { xs: 30, sm: 40 } }}>
              {t('app.heading')}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1.4, fontSize: 14 }}>
              {t('app.subtitle')}
            </Typography>
          </Box>
          <Chip label={t('app.demoMode')} size="small" className="demo-badge" />
        </Box>
        <Box className="workspace">
          <Paper component="section" className="swap-card" aria-labelledby="swap-heading">
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography id="swap-heading" component="h2" variant="h5">
                  {t('swap.heading')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {t('swap.subtitle')}
                </Typography>
              </Box>
              <Tooltip title={t('swap.reload')}>
                <span>
                  <IconButton
                    aria-label={t('swap.refresh')}
                    onClick={() => void load()}
                    disabled={loading || submitting || !!review}
                  >
                    <RefreshRounded sx={{ fontSize: 21 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
            <Box className="demo-notice">
              <InfoOutlined sx={{ fontSize: 16 }} />
              <Typography variant="caption">{t('swap.notice')}</Typography>
            </Box>
            {loading ? (
              <Box aria-label={t('swap.loading')} sx={{ py: 1 }}>
                <LinearProgress sx={{ mb: 2 }} />
                <Skeleton variant="rounded" height={147} />
                <Skeleton variant="rounded" height={147} sx={{ mt: 2 }} />
                <Skeleton height={70} />
              </Box>
            ) : loadError ? (
              <Alert
                severity="error"
                action={
                  <Button color="inherit" onClick={() => void load()}>
                    {t('common.retry')}
                  </Button>
                }
              >
                {t(loadError)}
              </Alert>
            ) : (
              from &&
              to && (
                <>
                  {success && (
                    <Alert
                      closeText={t('common.close')}
                      severity="success"
                      onClose={() => setSuccess(null)}
                      sx={{ mb: 2 }}
                    >
                      {t('swap.success', {
                        ...success,
                        amount: format.amount(success.amount),
                        received: format.amount(success.received),
                      })}
                    </Alert>
                  )}
                  <Box
                    component="form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      openReview();
                    }}
                    noValidate
                  >
                    <AmountPanel
                      token={from}
                      value={amount}
                      dollarValue={
                        estimate
                          ? t('swap.approximateUsd', { value: format.usd(estimate.usd) })
                          : format.usd(0)
                      }
                      onChange={(value) => {
                        setAmount(value);
                        setSuccess(null);
                      }}
                      onSelect={() => setPicker('from')}
                      onFraction={(part) => {
                        setAmount(fraction(from.balance, part));
                        setSuccess(null);
                      }}
                      error={error}
                    />
                    <Box className="reverse-wrap">
                      <Tooltip title={t('swap.reverse')}>
                        <IconButton
                          className="reverse-button"
                          aria-label={t('swap.reverse')}
                          onClick={() => {
                            setFromSymbol(toSymbol);
                            setToSymbol(fromSymbol);
                            setAmount(estimate && !tooSmall ? compact(estimate.receive) : '');
                            setSuccess(null);
                          }}
                        >
                          <SwapVertRounded />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <AmountPanel
                      token={to}
                      receiving
                      value={estimate ? format.amount(estimate.receive) : ''}
                      dollarValue={
                        estimate
                          ? t('swap.approximateUsd', {
                              value: format.usd(Number(estimate.receive) * to.price),
                            })
                          : format.usd(0)
                      }
                      onSelect={() => setPicker('to')}
                    />
                    <Box className="quote-details">
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Typography variant="caption" color="text.secondary">
                          {t('swap.exchangeRate')}
                        </Typography>
                        <Typography variant="caption" fontWeight={500}>
                          {t('swap.rate', {
                            from: from.currency,
                            to: to.currency,
                            rate: format.rate(quote('1', from, to).rate),
                          })}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            {t('swap.serviceFee')}
                          </Typography>
                          <Tooltip title={t('swap.feeDescription', { fee: format.percent(0.003) })}>
                            <IconButton
                              aria-label={t('swap.aboutFee')}
                              size="small"
                              sx={{ p: 0.25 }}
                            >
                              <InfoOutlined sx={{ fontSize: 13, color: 'text.secondary' }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                        <Typography variant="caption">
                          {estimate
                            ? t('swap.feeAmount', {
                                fee: format.percent(0.003),
                                amount: format.amount(estimate.fee),
                                currency: from.currency,
                              })
                            : format.percent(0.003)}
                        </Typography>
                      </Stack>
                    </Box>
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={!canReview}
                      endIcon={<ArrowForwardRounded />}
                      sx={{ fontSize: 14 }}
                    >
                      {!amount ? t('swap.enterAmount') : t('swap.review')}
                    </Button>
                  </Box>
                  <Stack
                    direction="row"
                    justifyContent="center"
                    alignItems="center"
                    spacing={0.7}
                    sx={{ mt: 2 }}
                  >
                    <ShieldOutlined sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {t('swap.noFunds')}
                    </Typography>
                  </Stack>
                  <Divider sx={{ my: 2.5 }} />
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      {from.source === 'sample' || to.source === 'sample'
                        ? t('swap.samplePrices')
                        : t('swap.historicalPrices', { date: format.date() })}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setAbout(true)}
                      sx={{ fontSize: 11, minWidth: 0, p: 0 }}
                    >
                      {t('swap.aboutRates')}
                    </Button>
                  </Stack>
                </>
              )
            )}
          </Paper>
          {tokens.length > 0 ? (
            <MarketPanel tokens={tokens} />
          ) : (
            <Box className="market-column">
              <Skeleton variant="rounded" height={320} />
              <Skeleton variant="rounded" height={270} sx={{ mt: 2.5 }} />
            </Box>
          )}
        </Box>
        <footer className="page-footer">
          <span>{t('app.footer')}</span>
          <Stack direction="row" alignItems="center" spacing={0.8}>
            <span className="footer-dot" />
            <span>{t('app.footerDetail')}</span>
          </Stack>
        </footer>
      </main>
      {picker && (
        <TokenPicker
          tokens={tokens}
          selected={picker === 'from' ? fromSymbol : toSymbol}
          excluded={picker === 'from' ? toSymbol : fromSymbol}
          onClose={() => setPicker(null)}
          onSelect={(symbol) => {
            if (picker === 'from') setFromSymbol(symbol);
            else setToSymbol(symbol);
            setPicker(null);
            setSuccess(null);
          }}
        />
      )}
      <InfoDialog open={about} onClose={() => setAbout(false)} />
      <ReviewDialog
        review={review}
        submitting={submitting}
        seconds={seconds}
        swapError={swapError}
        onClose={closeReview}
        onConfirm={() => void confirm()}
      />
    </ThemeProvider>
  );
}
