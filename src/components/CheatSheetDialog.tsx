import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Paper,
    useTheme,
    IconButton,
    Box,
    Link
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const cheatsheetData = [
    { query: '.', description: 'Return unchanged input', json: '{ "foo": { "bar": { "baz": 123 } } }' },
    { query: '.foo', description: 'Extract value at key "foo"', json: '{ "foo": { "bar": "baz" } }' },
    { query: '.foo.bar', description: 'Extract nested value at key "foo.bar"', json: '{ "foo": { "bar": "baz" } }' },
    { query: '.[]', description: 'Iterate over array elements', json: '[1, 2, 3]' },
    { query: '{foo: .foo, bar: .bar}', description: 'Construct an object with keys "foo" and "bar"', json: '{ "foo": 1, "bar": 2 }' },
    { query: 'length', description: 'Get the length of an array or string', json: '[1, 2, 3]' },
    { query: 'keys', description: 'Get keys of an object as an array', json: '{ "foo": 1, "bar": 2 }' },
    { query: '.[] | select(.foo == "bar")', description: 'Filter array elements where "foo" equals "bar"', json: '[{ "foo": "bar" }, { "foo": "baz" }]' },
    { query: 'map(.foo)', description: 'Map over array and extract "foo" from each element', json: '[{ "foo": 1 }, { "foo": 2 }]' },
    { query: 'if .foo then .bar else .baz end', description: 'Conditional logic', json: '{ "foo": true, "bar": "yes", "baz": "no" }' },
    { query: '"\\(.foo)"', description: 'String interpolation with "foo"', json: '{ "foo": "bar" }' },
    { query: 'add', description: 'Sum all numbers in an array', json: '[1, 2, 3]' },
    { query: '.foo | contains(["bar"])', description: 'Check if "foo" contains "bar"', json: '{ "foo": ["bar", "baz"] }' }
];

interface CheatsheetDialogProps {
    open: boolean;
    onClose: () => void;
    onExampleClick: (json: string, query: string) => void;
}

const CheatsheetDialog: React.FC<CheatsheetDialogProps> = ({ open, onClose, onExampleClick }) => {
    const theme = useTheme();

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Cheatsheet
                <IconButton aria-label="close" onClick={onClose} sx={{ color: 'grey.500' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <TableContainer component={Paper} sx={{ bgcolor: 'background.default' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>
                                    <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                                        Example
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                                        Description
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {cheatsheetData.map((row, index) => (
                                <TableRow
                                    key={index}
                                    onClick={() => onExampleClick(row.json, row.query)}
                                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                >
                                    <TableCell>
                                        <Box
                                            component="code"
                                            sx={{
                                                display: 'inline-block',
                                                px: 0.5,
                                                py: 0.25,
                                                bgcolor: theme.palette.code.background,
                                                borderRadius: 1,
                                                fontFamily: 'Monaco, Menlo, "Courier New", monospace',
                                                fontSize: '0.875em',
                                                color: theme.palette.code.text,
                                            }}
                                        >
                                            {row.query}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                                            {row.description}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                        <Link href="https://jqlang.github.io/jq/manual/" target="_blank" style={{ textDecoration: 'none', color: 'inherit' }}>
                            More Examples and References
                        </Link>
                    </Typography>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default CheatsheetDialog;
