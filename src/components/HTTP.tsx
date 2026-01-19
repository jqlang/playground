import { Box, Grid, MenuItem, TextField, useTheme } from "@mui/material";
import { useEffect, useState, useCallback } from "react";
import Editor from "./Editor";
import TabList from "./TabList";
import { HttpMethodSchema, HttpMethodType, HttpType } from "@/schemas";

interface HTTPProps {
    value?: HttpType;
    handleHttp: (method: HttpMethodType, url?: string, headers?: string, body?: string) => void;
}

const HTTP: React.FC<HTTPProps> = ({ value, handleHttp }) => {
    const theme = useTheme();

    const [method, setMethod] = useState<HttpMethodType>(value?.method || 'GET');
    const [url, setUrl] = useState<string | undefined>(value?.url);
    const [headers, setHeaders] = useState<string | undefined>(value?.headers);
    const [body, setBody] = useState<string | undefined>(value?.body);

    useEffect(() => {
        handleHttp(method, url, headers, body);
    }, [method, url, headers, body, handleHttp]);

    return (
        <Box component="form" sx={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: theme.palette.background.default }}>
            <Grid container spacing={2} alignItems="center" sx={{ paddingLeft: 1, paddingRight: 1 }}>
                <Grid item xs={3}>
                    <TextField
                        select
                        label="Method"
                        value={method}
                        onChange={(e) => setMethod(e.target.value as HttpMethodType)}
                        fullWidth
                        margin="normal"
                    >
                        {HttpMethodSchema.options.map((option) => (
                            <MenuItem key={option} value={option}>
                                {option}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>
                <Grid item xs={9}>
                    <TextField
                        label="URL"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        fullWidth
                        margin="normal"
                        required
                    />
                </Grid>
            </Grid>
            <Grid container spacing={1} sx={{ flexGrow: 1, flexDirection: 'column', paddingLeft: 1, paddingRight: 1 }}>
                <Grid item xs={12} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <TabList
                        tabs={[
                            {
                                label: "Body",
                                value: "body",
                                content: (
                                    <Editor
                                        value={body}
                                        language="json"
                                        readOnly={method === 'HEAD' || method === 'GET'}
                                        handleChange={setBody}
                                    />
                                )
                            },
                            {
                                label: "Headers",
                                value: "headers",
                                content: (
                                    <Editor
                                        value={headers}
                                        language="json"
                                        readOnly={false}
                                        handleChange={setHeaders}
                                    />
                                )
                            }
                        ]}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};

export default HTTP;
