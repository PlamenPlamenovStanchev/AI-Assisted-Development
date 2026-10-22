import type { ReactNode } from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: { main: '#A64732' }, secondary: { main: '#416453' },
    background: { default: '#FBF5EC', paper: '#FFFCF7' },
    text: { primary: '#342C28', secondary: '#72645C' }, divider: '#E8DDD0',
  },
  typography: {
    fontFamily: '"Segoe UI", Arial, sans-serif',
    h1: { fontFamily: 'Georgia, serif', fontWeight: 400 },
    h2: { fontFamily: 'Georgia, serif', fontWeight: 400 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 20 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 999, padding: '10px 24px' } } },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiCssBaseline: { styleOverrides: { body: { margin: 0 }, '::selection': { background: '#F2CFB7' }, 'a:focus-visible, button:focus-visible': { outline: '3px solid #416453', outlineOffset: 4 } } },
  },
});

export default function AppTheme({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider>;
}
