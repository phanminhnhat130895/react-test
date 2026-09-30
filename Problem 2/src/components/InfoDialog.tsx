import { useTranslation } from 'react-i18next';
import '../i18n';
import { useFormatters } from '../i18n/format';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
export function InfoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const format = useFormatters();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="about-title">
      <DialogTitle id="about-title">
        {t('info.title')}
        <IconButton aria-label={t('info.close')} onClick={onClose} sx={{ float: 'right' }}>
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" paragraph>
          {t('info.step1')}
        </Typography>
        <Typography variant="body2" paragraph>
          {t('info.step2', { fee: format.percent(0.003) })}
        </Typography>
        <Typography variant="body2" paragraph>
          {t('info.step3', { seconds: 60 })}
        </Typography>
        <Alert severity="info">{t('info.prices', { date: format.date('long') })}</Alert>
        <Typography variant="caption" component="p" sx={{ mt: 2 }}>
          {t('info.network')}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('info.dismiss')}</Button>
      </DialogActions>
    </Dialog>
  );
}
