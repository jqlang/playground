import { AppBar, Toolbar, IconButton, Box, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Api, ContentCopy, GitHub, Help, Share } from '@mui/icons-material';
import { useState } from 'react';
import Link from 'next/link';
import Logo from './Logo';
import CheatSheetDialog from './CheatSheetDialog';

interface HeaderProps {
    onShare: () => void;
    onExampleClick: (json: string, query: string) => void;
    onCopyClick: () => void;
    enableCopyButton: boolean;
}

const Header: React.FC<HeaderProps> = ({ onShare, onExampleClick, onCopyClick, enableCopyButton }) => {
    const [cheatsheetOpen, setCheatSheetOpen] = useState(false);

    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

    function handleCheatsheetOpen(): void {
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
                boxShadow: 'none',
                borderBottom: 'none',
                bgcolor: 'background.paper',
                color: 'text.primary',
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
                        <Logo />
                    </Link>
                    {!isSmallScreen && (
                        <Typography variant="subtitle1" sx={{ color: 'text.secondary' }} ml={1}>
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
                    <Tooltip title="API">
                        <IconButton color="inherit" aria-label="API">
                            <Link href="/api" passHref target="_blank" style={{ color: 'inherit', display: 'flex' }}>
                                <Api />
                            </Link>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Share">
                        <IconButton color="inherit" onClick={onShare} aria-label="Share">
                            <Share />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Source">
                        <IconButton color="inherit" aria-label="Source">
                            <Link href="https://github.com/jqlang/playground" passHref target='_blank' style={{ color: 'inherit', display: 'flex' }}>
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
