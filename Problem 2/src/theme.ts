import { createTheme } from '@mui/material/styles';
export const theme = createTheme({
  palette: {
    primary: { main: '#2563a6', dark: '#194b82', light: '#e5f1ff' },
    background: { default: '#f5f9fe', paper: '#ffffff' },
    text: { primary: '#203147', secondary: '#50657c' },
    divider: '#e3ebf5',
    error: { main: '#b53737' },
  },
  typography: {
    fontFamily: 'Inter, "Yu Gothic", Meiryo, "Hiragino Kaku Gothic ProN", sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
    h3: { fontWeight: 600, letterSpacing: '-1.6px' },
    h5: { fontWeight: 600, letterSpacing: '-0.6px' },
    body2: { lineHeight: 1.65 },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiDialogContent: { styleOverrides: { root: { overflowWrap: 'anywhere' } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 12 }, sizeLarge: { padding: '15px 24px' } },
    },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiTooltip: { defaultProps: { arrow: true } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 24 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
  },
});
