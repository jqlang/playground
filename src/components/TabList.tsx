import { Box, Paper, useTheme } from '@mui/material';
import React, { useEffect, useState, useCallback } from 'react';
import Tab from '@mui/material/Tab';
import { TabContext, TabList as MTabList, TabPanel } from '@mui/lab';

interface TabItem {
    label: string;
    value: string;
    active?: boolean;
    content: React.ReactNode;
}

interface TabListProps {
    tabs: TabItem[];
    handleTabChange?: (newValue: string) => void;
}

const TabList: React.FC<TabListProps> = ({ tabs, handleTabChange }) => {
    const theme = useTheme();

    const getInitialActiveTab = () => tabs.find(tab => tab.active)?.value || tabs[0]?.value;

    const [tab, setTab] = useState(getInitialActiveTab);

    useEffect(() => {
        // Update the tab only if there's an explicitly active tab in the updated tabs prop
        const activeTab = tabs.find(tab => tab.active)?.value;
        if (activeTab) {
            setTab(activeTab);
        }
    }, [tabs]);

    const onTabChange = useCallback((_: React.SyntheticEvent, newValue: string) => {
        setTab(newValue);
        if (handleTabChange) {
            handleTabChange(newValue);
        }
    }, [handleTabChange]);

    if (!tabs.length) return null; // Return null if no tabs are provided

    return (
        <Paper elevation={1} variant="outlined" sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, borderRadius: 0, marginBottom: 2, backgroundColor: theme.palette.background.default }}>
            <TabContext value={tab}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <MTabList
                        aria-label={tabs.find(({ value }) => value === tab)?.label}
                        textColor="inherit"
                        indicatorColor="secondary"
                        onChange={onTabChange}
                        sx={{
                            backgroundColor: theme.palette.background.default,
                            paddingBottom: 1,
                            paddingLeft: 1,
                        }}
                    >
                        {tabs.map(({ label, value }) => (
                            <Tab key={value} label={label} value={value} sx={{ padding: 0, fontSize: theme.typography.h6 }} />
                        ))}
                    </MTabList>
                </Box>
                {tabs.map(({ value, content }) => (
                    <TabPanel key={value} value={value} sx={{ height: "100%", width: "100%", padding: 0 }}>
                        {content}
                    </TabPanel>
                ))}
            </TabContext>
        </Paper>
    );
};

export default TabList;
