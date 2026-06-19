// State Management
let appState = {
    updates: [],
    filteredUpdates: [],
    searchQuery: "",
    activeFilter: "all",
    sortOrder: "desc", // "desc" (latest first) or "asc" (oldest first)
    selectedUpdate: null
};

// DOM Elements
const elements = {
    refreshBtn: document.getElementById("refresh-btn"),
    refreshIcon: document.getElementById("refresh-icon"),
    cacheStatus: document.getElementById("cache-status"),
    
    // Stats
    statTotal: document.getElementById("stat-total"),
    statFeatures: document.getElementById("stat-features"),
    statAnnouncements: document.getElementById("stat-announcements"),
    statIssues: document.getElementById("stat-issues"),
    
    // Controls
    searchInput: document.getElementById("search-input"),
    clearSearch: document.getElementById("clear-search"),
    filterPills: document.getElementById("filter-pills"),
    sortOrderBtn: document.getElementById("sort-order-btn"),
    sortIcon: document.getElementById("sort-icon"),
    sortLabel: document.getElementById("sort-label"),
    exportCsvBtn: document.getElementById("export-csv-btn"),
    
    // Feed container & states
    feedContainer: document.getElementById("feed-container"),
    loadingState: document.getElementById("loading-state"),
    errorState: document.getElementById("error-state"),
    errorMessage: document.getElementById("error-message"),
    retryBtn: document.getElementById("retry-btn"),
    emptyState: document.getElementById("empty-state"),
    clearFiltersBtn: document.getElementById("clear-filters-btn"),
    
    // Modal
    tweetModal: document.getElementById("tweet-modal"),
    closeModalBtn: document.getElementById("close-modal-btn"),
    cancelTweetBtn: document.getElementById("cancel-tweet-btn"),
    shareTweetBtn: document.getElementById("share-tweet-btn"),
    tweetTextarea: document.getElementById("tweet-textarea"),
    charCounter: document.getElementById("char-counter"),
    charProgress: document.getElementById("char-progress"),
    modalUpdateType: document.getElementById("modal-update-type"),
    modalUpdateDate: document.getElementById("modal-update-date"),
    modalUpdateSnippet: document.getElementById("modal-update-snippet"),
    
    // Toast
    toast: document.getElementById("toast"),
    toastMessage: document.getElementById("toast-message")
};

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    // Render initial Lucide icons
    lucide.createIcons();
    
    // Fetch initial data
    fetchUpdates(false);
    
    // Bind Event Listeners
    bindEvents();
});

// Event Listeners Binding
function bindEvents() {
    // Refresh handlers
    elements.refreshBtn.addEventListener("click", () => fetchUpdates(true));
    elements.retryBtn.addEventListener("click", () => fetchUpdates(true));
    
    // Search handlers
    elements.searchInput.addEventListener("input", handleSearch);
    elements.clearSearch.addEventListener("click", resetSearch);
    
    // Filter pills handlers
    elements.filterPills.addEventListener("click", handleFilterClick);
    
    // Sort handler
    elements.sortOrderBtn.addEventListener("click", toggleSortOrder);
    
    // Export CSV handler
    elements.exportCsvBtn.addEventListener("click", exportToCSV);
    
    // Empty state clear handler
    elements.clearFiltersBtn.addEventListener("click", resetAllFilters);
    
    // Modal handlers
    elements.closeModalBtn.addEventListener("click", closeTweetModal);
    elements.cancelTweetBtn.addEventListener("click", closeTweetModal);
    elements.shareTweetBtn.addEventListener("click", submitTweet);
    elements.tweetTextarea.addEventListener("input", updateCharCounter);
    
    // Close modal on overlay click
    elements.tweetModal.addEventListener("click", (e) => {
        if (e.target === elements.tweetModal) {
            closeTweetModal();
        }
    });
    
    // Close modal on escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && elements.tweetModal.classList.contains("open")) {
            closeTweetModal();
        }
    });
}

// Fetch Updates from Flask API
async function fetchUpdates(forceRefresh = false) {
    showLoading();
    
    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === "error") {
            throw new Error(data.message || "Failed to fetch data.");
        }
        
        // Update App State
        appState.updates = data.updates || [];
        
        // Update Stats Counters
        updateStats();
        
        // Update Last Updated Timestamp text
        updateCacheStatusText(data.last_updated, data.source);
        
        // Render Feed
        applyFiltersAndRender();
        
        if (forceRefresh) {
            showToast("Feed successfully updated from Google Cloud!");
        }
        
    } catch (error) {
        console.error("Fetch error:", error);
        showError(error.message || "Could not retrieve release notes. Please check your connectivity.");
    }
}

// Update Stats Panel UI
function updateStats() {
    const total = appState.updates.length;
    
    // Count types
    let features = 0;
    let announcements = 0;
    let issues = 0; // Issues & Changes
    
    appState.updates.forEach(up => {
        const type = up.type.toLowerCase();
        if (type.includes("feature")) {
            features++;
        } else if (type.includes("announcement")) {
            announcements++;
        } else if (type.includes("issue") || type.includes("change") || type.includes("deprecated")) {
            issues++;
        }
    });
    
    // Animate stats change
    animateCount(elements.statTotal, total);
    animateCount(elements.statFeatures, features);
    animateCount(elements.statAnnouncements, announcements);
    animateCount(elements.statIssues, issues);
}

// Stat Counter Animation
function animateCount(element, target) {
    let current = parseInt(element.textContent) || 0;
    if (current === target) return;
    
    const duration = 800; // ms
    const stepTime = Math.max(Math.floor(duration / Math.abs(target - current)), 15);
    const stepVal = target > current ? 1 : -1;
    
    const timer = setInterval(() => {
        current += stepVal;
        element.textContent = current;
        if (current === target) {
            clearInterval(timer);
        }
    }, stepTime);
}

// Cache status timestamp formatter
function updateCacheStatusText(timestamp, source) {
    if (!timestamp) {
        elements.cacheStatus.textContent = "Synced";
        return;
    }
    
    const date = new Date(timestamp * 1000);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (source === "cache" || source === "cache_fallback") {
        elements.cacheStatus.textContent = `Cached (Synced at ${timeString})`;
    } else {
        elements.cacheStatus.textContent = `Live (Synced at ${timeString})`;
    }
}

// Handle Search input
function handleSearch(e) {
    appState.searchQuery = e.target.value.trim().toLowerCase();
    
    // Toggle clear search button visibility
    if (appState.searchQuery.length > 0) {
        elements.clearSearch.style.display = "flex";
    } else {
        elements.clearSearch.style.display = "none";
    }
    
    applyFiltersAndRender();
}

// Reset search input
function resetSearch() {
    elements.searchInput.value = "";
    appState.searchQuery = "";
    elements.clearSearch.style.display = "none";
    applyFiltersAndRender();
}

// Handle Filter click
function handleFilterClick(e) {
    const pill = e.target.closest(".filter-pill");
    if (!pill) return;
    
    // Remove active class from all
    document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
    
    // Add active class to clicked
    pill.classList.add("active");
    
    // Set active filter
    appState.activeFilter = pill.dataset.type;
    applyFiltersAndRender();
}

// Toggle Sort Order
function toggleSortOrder() {
    if (appState.sortOrder === "desc") {
        appState.sortOrder = "asc";
        elements.sortLabel.textContent = "Oldest First";
        elements.sortIcon.setAttribute("data-lucide", "arrow-up-narrow-wide");
    } else {
        appState.sortOrder = "desc";
        elements.sortLabel.textContent = "Latest First";
        elements.sortIcon.setAttribute("data-lucide", "arrow-down-narrow-wide");
    }
    
    lucide.createIcons(); // Refresh sort icon
    applyFiltersAndRender();
}

// Reset all filters and search
function resetAllFilters() {
    resetSearch();
    
    // Reset filters pills
    document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
    document.querySelector('[data-type="all"]').classList.add("active");
    appState.activeFilter = "all";
    
    // Reset sorting
    appState.sortOrder = "desc";
    elements.sortLabel.textContent = "Latest First";
    elements.sortIcon.setAttribute("data-lucide", "arrow-down-narrow-wide");
    
    lucide.createIcons();
    applyFiltersAndRender();
}

// Filter, Sort and Render release notes
function applyFiltersAndRender() {
    let result = [...appState.updates];
    
    // 1. Search Query Filter
    if (appState.searchQuery) {
        result = result.filter(up => {
            return (
                up.type.toLowerCase().includes(appState.searchQuery) ||
                up.date.toLowerCase().includes(appState.searchQuery) ||
                up.text_content.toLowerCase().includes(appState.searchQuery)
            );
        });
    }
    
    // 2. Category Type Filter
    if (appState.activeFilter !== "all") {
        result = result.filter(up => {
            // Match exactly or loosely
            return up.type.toLowerCase() === appState.activeFilter.toLowerCase();
        });
    }
    
    // 3. Sort Order
    result.sort((a, b) => {
        const dateA = new Date(a.updated_at);
        const dateB = new Date(b.updated_at);
        
        return appState.sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });
    
    appState.filteredUpdates = result;
    
    // Render
    renderFeed();
}

// Render dynamic Feed cards
function renderFeed() {
    // Hide states
    elements.loadingState.style.display = "none";
    elements.errorState.style.display = "none";
    
    if (appState.filteredUpdates.length === 0) {
        elements.feedContainer.style.display = "none";
        elements.emptyState.style.display = "flex";
        return;
    }
    
    elements.emptyState.style.display = "none";
    elements.feedContainer.style.display = "flex";
    
    elements.feedContainer.innerHTML = appState.filteredUpdates.map(up => {
        // Clean class string from type
        const typeClass = `type-${up.type.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        
        return `
            <article class="feed-card ${typeClass}" data-id="${up.id}">
                <div class="card-header">
                    <div class="card-meta">
                        <span class="type-badge">${up.type}</span>
                        <span class="date-text">
                            <i data-lucide="calendar"></i>
                            ${up.date}
                        </span>
                    </div>
                    <div class="card-action-top">
                        <button class="icon-btn-sm" onclick="copyCardText('${up.id}')" title="Copy Update Text">
                            <i data-lucide="copy"></i>
                        </button>
                        <button class="icon-btn-sm" onclick="copyLink('${up.link}')" title="Copy Direct Link">
                            <i data-lucide="link-2"></i>
                        </button>
                    </div>
                </div>
                
                <div class="card-body">
                    ${up.html_content}
                </div>
                
                <div class="card-actions">
                    <a href="${up.link}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
                        <i data-lucide="external-link"></i>
                        <span>View Docs</span>
                    </a>
                    <button class="btn btn-twitter btn-sm" onclick="openTweetComposer('${up.id}')">
                        <i data-lucide="twitter"></i>
                        <span>Tweet Update</span>
                    </button>
                </div>
            </article>
        `;
    }).join("");
    
    // Re-create icons for the new HTML cards
    lucide.createIcons();
}

// Open Tweet Composer modal
window.openTweetComposer = function(updateId) {
    const update = appState.updates.find(up => up.id === updateId);
    if (!update) return;
    
    appState.selectedUpdate = update;
    
    // Fill preview fields in modal
    elements.modalUpdateType.textContent = update.type;
    elements.modalUpdateType.className = `type-badge type-${update.type.toLowerCase()}`;
    elements.modalUpdateDate.textContent = update.date;
    elements.modalUpdateSnippet.textContent = update.text_content;
    
    // Compose Suggested Tweet
    // Twitter limit is 280. We need to leave room for:
    // "🚀 #BigQuery [Type]: [Text] \n\n🔗 [Link] \n\n#GoogleCloud"
    const prefix = `🚀 #BigQuery ${update.type}: `;
    const suffix = `\n\n🔗 ${update.link}\n#GoogleCloud #DataEngineering`;
    
    // Calculate remaining length for description
    const formatLen = prefix.length + suffix.length;
    const maxDescLen = 280 - formatLen - 5; // buffer for ellipsis
    
    let descriptionText = update.text_content;
    if (descriptionText.length > maxDescLen) {
        descriptionText = descriptionText.substring(0, maxDescLen).trim() + "...";
    }
    
    const tweetText = `${prefix}${descriptionText}${suffix}`;
    
    elements.tweetTextarea.value = tweetText;
    
    // Update counter
    updateCharCounter();
    
    // Show Modal
    elements.tweetModal.classList.add("open");
    elements.tweetTextarea.focus();
};

// Close Tweet Modal
function closeTweetModal() {
    elements.tweetModal.classList.remove("open");
    appState.selectedUpdate = null;
}

// Update Tweet Composer Character Counter
function updateCharCounter() {
    const len = elements.tweetTextarea.value.length;
    elements.charCounter.textContent = len;
    
    // Progress fill
    const percent = Math.min((len / 280) * 100, 100);
    elements.charProgress.style.width = `${percent}%`;
    
    // Set colors based on limit
    if (len >= 280) {
        elements.charProgress.className = "char-progress-fill danger";
        elements.charCounter.style.color = "var(--type-issue)";
        elements.shareTweetBtn.disabled = true;
    } else if (len >= 250) {
        elements.charProgress.className = "char-progress-fill warning";
        elements.charCounter.style.color = "var(--type-change)";
        elements.shareTweetBtn.disabled = false;
    } else {
        elements.charProgress.className = "char-progress-fill";
        elements.charCounter.style.color = "var(--text-secondary)";
        elements.shareTweetBtn.disabled = false;
    }
}

// Share Tweet on X/Twitter Intent
function submitTweet() {
    const text = elements.tweetTextarea.value;
    if (text.length > 280) {
        showToast("Tweet exceeds the 280 character limit!", "error");
        return;
    }
    
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterIntentUrl, "_blank");
    
    closeTweetModal();
    showToast("Opened Twitter sharing tab!");
}

// Copy Direct Link to Clipboard
window.copyLink = function(link) {
    navigator.clipboard.writeText(link).then(() => {
        showToast("Deep link copied to clipboard!");
    }).catch(err => {
        console.error("Clipboard error:", err);
        // Fallback for copying link
        const textArea = document.createElement("textarea");
        textArea.value = link;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showToast("Deep link copied to clipboard!");
        } catch (e) {
            showToast("Failed to copy link.", "error");
        }
        document.body.removeChild(textArea);
    });
};

// Copy Card Text Content to Clipboard
window.copyCardText = function(updateId) {
    const update = appState.updates.find(up => up.id === updateId);
    if (!update) return;
    
    navigator.clipboard.writeText(update.text_content).then(() => {
        showToast("Update text copied to clipboard!");
    }).catch(err => {
        console.error("Clipboard error:", err);
        const textArea = document.createElement("textarea");
        textArea.value = update.text_content;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showToast("Update text copied to clipboard!");
        } catch (e) {
            showToast("Failed to copy text.", "error");
        }
        document.body.removeChild(textArea);
    });
};

// Export current view of updates to CSV
function exportToCSV() {
    if (appState.filteredUpdates.length === 0) {
        showToast("No updates to export!", "error");
        return;
    }
    
    const headers = ["Date", "Type", "Link", "Content"];
    const rows = appState.filteredUpdates.map(up => [
        up.date,
        up.type,
        up.link,
        up.text_content
    ]);
    
    // Convert to CSV string, double quoting fields and escaping quotes
    const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_release_notes_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("Exported CSV successfully!");
}

// UI State Switchers
function showLoading() {
    elements.loadingState.style.display = "flex";
    elements.feedContainer.style.display = "none";
    elements.errorState.style.display = "none";
    elements.emptyState.style.display = "none";
    
    // Spin refresh icon
    elements.refreshIcon.classList.add("spin");
    elements.refreshBtn.disabled = true;
}

function showError(msg) {
    elements.loadingState.style.display = "none";
    elements.feedContainer.style.display = "none";
    elements.emptyState.style.display = "none";
    elements.errorState.style.display = "flex";
    
    elements.errorMessage.textContent = msg;
    
    // Stop spin
    elements.refreshIcon.classList.remove("spin");
    elements.refreshBtn.disabled = false;
}

function showToast(message, type = 'success') {
    elements.toastMessage.textContent = message;
    
    // Set icon class
    const toastIcon = document.getElementById("toast-icon");
    if (type === 'error') {
        toastIcon.setAttribute("data-lucide", "alert-circle");
        toastIcon.style.color = "var(--type-issue)";
    } else {
        toastIcon.setAttribute("data-lucide", "check");
        toastIcon.style.color = "var(--type-feature)";
    }
    lucide.createIcons();
    
    elements.toast.classList.add("show");
    
    setTimeout(() => {
        elements.toast.classList.remove("show");
    }, 3500);
}

// End loading state helper
function endLoading() {
    elements.refreshIcon.classList.remove("spin");
    elements.refreshBtn.disabled = false;
}

// Patch endLoading execution
const origApplyFiltersAndRender = applyFiltersAndRender;
applyFiltersAndRender = function() {
    origApplyFiltersAndRender();
    endLoading();
};
