import { Box, Typography } from '@mui/material';

interface SectionTitleProps {
    title: string;
}

const SectionTitle: React.FC<SectionTitleProps> = ({ title }) => {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'text.primary',
                padding: 1.5,
                borderBottom: 1,
                borderColor: 'divider',
            }}
        >
            <Typography variant="h6">
                {title}
            </Typography>
        </Box>
    );
}

export default SectionTitle;
