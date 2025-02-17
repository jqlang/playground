import { AppBar, Toolbar, IconButton, Box, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Brightness4, Brightness7, ContentCopy, GitHub, Help, Share, VolunteerActivism } from '@mui/icons-material';
import { MouseEvent, useState } from 'react';
import Link from 'next/link';
import { useDarkMode } from './ThemeProvider';
import Logo from './Logo';
import CheatSheetDialog from './CheatSheetDialog';

interface HeaderProps {
    onShare: () => void;
    onExampleClick: (json: string, query: string) => void;
    onCopyClick: () => void;
    enableCopyButton: boolean;
}

const Header: React.FC<HeaderProps> = ({ onShare, onExampleClick, onCopyClick, enableCopyButton }) => {
    const { darkMode } = useDarkMode();
    const [cheatsheetOpen, setCheatSheetOpen] = useState(false);

    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const bgColor = darkMode ? '#2c3033' : '#f8f9fa';
    const fgColor = darkMode ? '#ffffff' : '#333333';

    const subtitleStyle = {
        color: darkMode ? '#cccccc' : '#666666',
    };

    function handleCheatsheetOpen(event: MouseEvent<HTMLButtonElement>): void {
        setCheatSheetOpen(true);
    }

    function handleCheatsheetClose(): void {
        setCheatSheetOpen(false);
    }

    function handleExampleClick(json: string, query: string): void {
        setCheatSheetOpen(false);
        onExampleClick(json, query);
    }

    return (
        <AppBar
            component="nav"
            position="static"
            elevation={0} // Removes MUI's default shadow
            sx={{
                boxShadow: 'none',    // No shadow
                borderBottom: 'none', // No bottom border
                backgroundColor: bgColor,
                color: fgColor
            }}
        >
            <Toolbar
                sx={{
                    minHeight: { xs: 40, md: 56 },
                    display: 'flex',
                    justifyContent: 'space-between',
                    px: 2,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Link href="https://jqlang.org" passHref style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                        <Logo darkMode={darkMode} />
                    </Link>
                    {!isSmallScreen && (
                        <Typography variant="subtitle1" sx={subtitleStyle} ml={1}>
                            The JQ Playground
                        </Typography>
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Tooltip title="Copy command to clipboard">
                        <div>
                            <IconButton color="inherit" onClick={onCopyClick} aria-label="Copy command to clipboard" disabled={!enableCopyButton}>
                                <ContentCopy />
                            </IconButton>
                        </div>
                    </Tooltip>
                    <Tooltip title="Cheatsheet">
                        <IconButton color="inherit" onClick={handleCheatsheetOpen} aria-label="Cheatsheet">
                            <Help />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Share">
                        <IconButton color="inherit" onClick={onShare} aria-label="Share">
                            <Share />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Source">
                        <IconButton color="inherit" aria-label="Source">
                            <Link href="https://github.com/jqlang/playground" passHref target='_blank'>
                                <GitHub />
                            </Link>
                        </IconButton>
                    </Tooltip>
                    <CheatSheetDialog onExampleClick={handleExampleClick} open={cheatsheetOpen} onClose={handleCheatsheetClose} />
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Header;
