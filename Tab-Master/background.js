// Handle tab creation
async function createTabs(entries, type) {
    for (const entry of entries) {
        let url;
        
        if (type === "keywords") {
            // Ensure we're only processing keywords
            url = `https://www.google.com/search?q=${encodeURIComponent(entry)}`;
        } else {
            // Ensure we're only processing URLs
            url = entry.startsWith("http") ? entry : `https://${entry}`;
        }

        await chrome.tabs.create({ 
            url, 
            active: true
        });
    }
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.data && request.data.length > 0) {
        createTabs(
            request.data,
            request.type
        );
        sendResponse({ success: true });
    }
    return true;
});