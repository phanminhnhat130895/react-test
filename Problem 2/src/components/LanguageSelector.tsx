import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import LanguageRounded from '@mui/icons-material/LanguageRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import { languages, resolveLanguage } from '../i18n/preferences';

export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const selected = resolveLanguage(i18n.resolvedLanguage);
  return (
    <>
      <Button
        id="language-button"
        className="language-button"
        color="inherit"
        variant="outlined"
        aria-label={`${t('language.label')}: ${languages[selected].label} (${languages[selected].short})`}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        aria-controls={anchor ? 'language-menu' : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
        startIcon={<LanguageRounded />}
        endIcon={<ExpandMoreRounded />}
      >
        <span className="language-full" lang={selected}>
          {languages[selected].label}
        </span>
        <span className="language-short" aria-hidden="true">
          {languages[selected].short}
        </span>
      </Button>
      <Menu
        id="language-menu"
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        slotProps={{ list: { 'aria-label': t('language.menu') } }}
      >
        {Object.entries(languages).map(([code, language]) => (
          <MenuItem
            key={code}
            role="menuitemradio"
            aria-checked={selected === code}
            selected={selected === code}
            lang={code}
            onClick={() => {
              void i18n.changeLanguage(code);
              setAnchor(null);
            }}
          >
            <ListItemIcon>{selected === code && <CheckRounded fontSize="small" />}</ListItemIcon>
            <ListItemText>{language.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
