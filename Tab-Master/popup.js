document.addEventListener("DOMContentLoaded", function() {
    const openTabsButton = document.getElementById("openTabs");
    const textArea = document.getElementById("inputData");
    const charCount = document.getElementById("charCount");
    const inputLabel = document.getElementById("inputLabel");
    const statusMessage = document.getElementById("statusMessage");
    const radioButtons = document.querySelectorAll('input[name="inputType"]');

    function updateUI() {
        const selectedType = document.querySelector('input[name="inputType"]:checked').value;
        inputLabel.textContent = selectedType === "keywords" 
            ? "Enter search queries (one per line)" 
            : "Enter URLs (one per line)";
        
        textArea.placeholder = selectedType === "keywords" 
            ? "Example: chrome extensions\nweb development 2023\nbest productivity tools"
            : "Example: https://www.google.com/\nhttps://github.com/\nhttps://stackoverflow.com/";
        
        updateCharCounter();
    }

    function updateCharCounter() {
        const entries = textArea.value.split("\n").filter(entry => entry.trim().length > 0);
        charCount.textContent = entries.length;
    }

    function showStatus(message, isError = false) {
        // Only show error messages (no success messages)
        if (isError) {
            statusMessage.textContent = message;
            statusMessage.className = 'status-message error';
            setTimeout(() => {
                statusMessage.textContent = '';
                statusMessage.className = 'status-message';
            }, 3000);
        }
    }

    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    function normalizeUrl(url) {
        try {
            const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
            let normalized = urlObj.hostname.replace(/^www\./, '') + urlObj.pathname;
            normalized = normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
            return normalized.toLowerCase();
        } catch {
            return url.toLowerCase();
        }
    }

    // Initialize UI
    updateUI();
    
    // Event listeners
    textArea.addEventListener("input", updateCharCounter);
    
    radioButtons.forEach(radio => {
        radio.addEventListener("change", updateUI);
    });

    openTabsButton.addEventListener("click", async function() {
        const input = textArea.value.trim();
        const selectedType = document.querySelector('input[name="inputType"]:checked').value;
        const ignoreDuplicates = document.getElementById("ignoreDuplicates").checked;
        const createNewGroup = document.getElementById("newTabGroup").checked;
        
        let entries = input.split("\n")
            .map(entry => entry.trim())
            .filter(entry => entry.length > 0);
        
        if (entries.length === 0) {
            showStatus("Please enter at least one item.", true);
            return;
        }

        if (ignoreDuplicates) {
            const uniqueEntries = [];
            const seen = new Set();
            
            for (const entry of entries) {
                const normalizedEntry = selectedType === "urls" ? 
                    normalizeUrl(entry) : 
                    entry.toLowerCase().trim();
                
                if (!seen.has(normalizedEntry)) {
                    seen.add(normalizedEntry);
                    uniqueEntries.push(entry);
                }
            }
            
            entries = uniqueEntries;
        }

        if (selectedType === "urls") {
            const invalidEntries = entries.filter(entry => !isValidUrl(entry));
            if (invalidEntries.length > 0) {
                showStatus(`Invalid URLs detected:\n${invalidEntries.join("\n")}`, true);
                return;
            }
        } else {
            const urlPattern = /^(http|https):\/\//;
            const urlEntries = entries.filter(entry => urlPattern.test(entry));
            if (urlEntries.length > 0) {
                showStatus(`URLs detected in keywords mode:\n${urlEntries.join("\n")}\n\nSwitch to URL mode or remove URLs`, true);
                return;
            }
        }

        try {
            const tabIds = [];
            
            for (const entry of entries) {
                const url = selectedType === "keywords" 
                    ? `https://www.google.com/search?q=${encodeURIComponent(entry)}` 
                    : entry;
                
                const tab = await chrome.tabs.create({ 
                    url, 
                    active: false 
                });
                tabIds.push(tab.id);
            }

            if (createNewGroup && tabIds.length > 0) {
                try {
                    const groupId = await chrome.tabs.group({ tabIds });
                    await chrome.tabGroups.update(groupId, {
                        collapsed: false
                    });
                } catch (groupError) {
                    console.warn("Tab grouping failed:", groupError);
                }
            }

            // Close the extension popup immediately after opening tabs
            window.close();
            
        } catch (error) {
            console.error("Error opening tabs:", error);
            showStatus("An error occurred while opening tabs.", true);
        }
    });
});