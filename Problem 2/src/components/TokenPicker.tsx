import { useTranslation } from 'react-i18next';
import '../i18n';
import { useFormatters } from '../i18n/format';
import { useState } from 'react';
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  TextField,
  Typography,
} from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import { TokenAvatar } from './TokenAvatar';
import type { Token } from '../types';
export function TokenPicker({
  tokens,
  selected,
  excluded,
  onSelect,
  onClose,
}: {
  tokens: Token[];
  selected: string;
  excluded: string;
  onSelect: (symbol: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = tokens.filter((t) =>
    `${t.currency} ${t.name}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const { t } = useTranslation();
  const format = useFormatters();
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="token-picker-title">
      <DialogTitle
        id="token-picker-title"
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        {t('tokens.title')}
        <IconButton aria-label={t('tokens.close')} onClick={onClose}>
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          placeholder={t('tokens.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            htmlInput: { 'aria-label': t('tokens.searchLabel') },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded />
                </InputAdornment>
              ),
            },
          }}
        />
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 2 }}>
          {t('tokens.notice')}
        </Typography>
        <List
          component="div"
          role="group"
          sx={{ height: 360, overflowY: 'auto', mx: -1 }}
          aria-label={t('tokens.available')}
        >
          {filtered.map((token) => (
            <ListItemButton
              key={token.currency}
              disabled={token.currency === excluded}
              selected={token.currency === selected}
              onClick={() => onSelect(token.currency)}
              aria-label={t('tokens.select', { currency: token.currency })}
              sx={{ borderRadius: 2, gap: 1.5, py: 1.3 }}
            >
              <TokenAvatar token={token} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={600} noWrap>
                  {token.currency}{' '}
                  {token.currency === selected && <CheckRounded sx={{ fontSize: 14 }} />}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap component="p">
                  {token.name}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2">{format.amount(token.balance)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {format.usd(token.price)}
                </Typography>{' '}
                {token.source === 'sample' && (
                  <Chip label={t('common.sample')} size="small" sx={{ height: 19, fontSize: 10 }} />
                )}
              </Box>
            </ListItemButton>
          ))}
          {!filtered.length && (
            <Box sx={{ py: 7, textAlign: 'center' }}>
              <SearchRounded color="disabled" />
              <Typography>{t('tokens.empty')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('tokens.emptyHint')}
              </Typography>
            </Box>
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
}
