import { STATES, MSG } from "../shared/protocol.js";

// tabId -> 最近一次上报的状态
const tabStates = new Map();
const tabUrls = new Map();
const recentDoneAt = new Map();
const tabBadgeTimers = new Map();
const notificationTabs = new Map();
const lastNotificationAt = new Map();

const BADGE_CLEAR_MS = 5000;
const RECENT_DONE_MS = 5000;
const DONE_NOTIFY_INTERVAL_MS = 3000;
const BADGE = {
    RUNNING_TEXT: "•",
    DONE_TEXT: "✓",
    RUNNING_COLOR: "#2f6fed",
    DONE_COLOR: "#16a34a",
};

let globalBadgeTimer = null;
let creating = null;

chrome.runtime.onMessage.addListener((msg, sender) => {
    if (!msg || msg.type !== MSG.STATE) return;
    const tabId = sender.tab && sender.tab.id;
    if (tabId == null) return;
    if (!isKnownState(msg.state)) return;

    const at = normalizeTime(msg.at);
    const prev = tabStates.get(tabId);
    tabStates.set(tabId, msg.state);
    if (msg.url) tabUrls.set(tabId, msg.url);

    updateTabBadge(tabId, msg.state, at);

    if (msg.state === STATES.DONE) {
        recentDoneAt.set(tabId, at);
        if (prev !== STATES.DONE && shouldNotifyDone(tabId, at)) {
            notifyDone(tabId, msg.url || tabUrls.get(tabId));
            playSound();
        }
    }

    updateGlobalBadge();
});

chrome.tabs.onRemoved.addListener((tabId) => {
    clearTabState(tabId, { clearNotificationThrottle: true });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url || changeInfo.status === "loading") {
        clearTabState(tabId);
    }
});

chrome.notifications.onClicked.addListener((notificationId) => {
    const tabId = notificationTabs.get(notificationId);
    if (tabId == null) return;
    chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
            notificationTabs.delete(notificationId);
            return;
        }
        if (tab.windowId != null) {
            chrome.windows.update(tab.windowId, { focused: true });
        }
        chrome.tabs.update(tabId, { active: true });
        chrome.notifications.clear(notificationId);
        notificationTabs.delete(notificationId);
    });
});

chrome.notifications.onClosed.addListener((notificationId) => {
    notificationTabs.delete(notificationId);
});

function isKnownState(state) {
    return state === STATES.IDLE ||
        state === STATES.THINKING ||
        state === STATES.RESPONDING ||
        state === STATES.DONE;
}

function normalizeTime(at) {
    return Number.isFinite(at) ? at : Date.now();
}

function isRunningState(state) {
    return state === STATES.THINKING || state === STATES.RESPONDING;
}

function updateTabBadge(tabId, state, at) {
    clearTabBadgeTimer(tabId);
    if (isRunningState(state)) {
        chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE.RUNNING_COLOR });
        chrome.action.setBadgeText({ tabId, text: BADGE.RUNNING_TEXT });
        return;
    }
    if (state === STATES.DONE) {
        chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE.DONE_COLOR });
        chrome.action.setBadgeText({ tabId, text: BADGE.DONE_TEXT });
        tabBadgeTimers.set(tabId, setTimeout(() => {
            if (tabStates.get(tabId) === STATES.DONE && recentDoneAt.get(tabId) === at) {
                chrome.action.setBadgeText({ tabId, text: "" });
            }
            tabBadgeTimers.delete(tabId);
        }, BADGE_CLEAR_MS));
        return;
    }
    chrome.action.setBadgeText({ tabId, text: "" });
}

function updateGlobalBadge() {
    clearGlobalBadgeTimer();
    purgeExpiredDone();

    const running = runningCount();
    if (running > 0) {
        chrome.action.setBadgeBackgroundColor({ color: BADGE.RUNNING_COLOR });
        chrome.action.setBadgeText({ text: running > 1 ? String(running) : BADGE.RUNNING_TEXT });
        return;
    }

    const nextDoneExpiry = earliestRecentDoneExpiry();
    if (nextDoneExpiry != null) {
        chrome.action.setBadgeBackgroundColor({ color: BADGE.DONE_COLOR });
        chrome.action.setBadgeText({ text: BADGE.DONE_TEXT });
        globalBadgeTimer = setTimeout(updateGlobalBadge, Math.max(0, nextDoneExpiry - Date.now()) + 50);
        return;
    }

    chrome.action.setBadgeText({ text: "" });
}

function runningCount() {
    let count = 0;
    for (const state of tabStates.values()) {
        if (isRunningState(state)) count++;
    }
    return count;
}

function purgeExpiredDone() {
    const now = Date.now();
    for (const [tabId, doneAt] of recentDoneAt) {
        if (now - doneAt > RECENT_DONE_MS) {
            recentDoneAt.delete(tabId);
        }
    }
}

function earliestRecentDoneExpiry() {
    const now = Date.now();
    let earliest = null;
    for (const doneAt of recentDoneAt.values()) {
        if (now - doneAt > RECENT_DONE_MS) continue;
        const expiresAt = doneAt + RECENT_DONE_MS;
        if (earliest == null || expiresAt < earliest) earliest = expiresAt;
    }
    return earliest;
}

function shouldNotifyDone(tabId, at) {
    const last = lastNotificationAt.get(tabId);
    if (last != null && at - last < DONE_NOTIFY_INTERVAL_MS) return false;
    lastNotificationAt.set(tabId, at);
    return true;
}

function clearTabState(tabId, options = {}) {
    tabStates.delete(tabId);
    tabUrls.delete(tabId);
    recentDoneAt.delete(tabId);
    clearTabBadgeTimer(tabId);
    if (options.clearNotificationThrottle) {
        lastNotificationAt.delete(tabId);
    }
    chrome.action.setBadgeText({ tabId, text: "" });
    updateGlobalBadge();
}

function clearTabBadgeTimer(tabId) {
    const timer = tabBadgeTimers.get(tabId);
    if (!timer) return;
    clearTimeout(timer);
    tabBadgeTimers.delete(tabId);
}

function clearGlobalBadgeTimer() {
    if (!globalBadgeTimer) return;
    clearTimeout(globalBadgeTimer);
    globalBadgeTimer = null;
}

function notifyDone(tabId, url) {
    const notificationId = `nai-done-${tabId}-${Date.now()}`;
    // 注意：basic 通知需要 iconUrl，请在 assets/ 放置 icon-128.png（见 assets/README.md）。
    // 缺图标时回调里的 lastError 会被吞掉，不影响其它功能。
    chrome.notifications.create(
        notificationId,
        {
            type: "basic",
            iconUrl: chrome.runtime.getURL("assets/icon-128.png"),
            title: "Notion AI 任务完成",
            message: url ? "Notion AI 已回复完成，点击返回对应页面。" : "Notion AI 已回复完成。",
            priority: 2,
        },
        (createdId) => {
            void chrome.runtime.lastError;
            notificationTabs.set(createdId || notificationId, tabId);
        },
    );
}

// ---- offscreen 播放提示音（MV3 service worker 不能直接播放音频）----
async function ensureOffscreen() {
    if (await chrome.offscreen.hasDocument()) return;
    if (!creating) {
        creating = chrome.offscreen.createDocument({
            url: "src/offscreen/offscreen.html",
            reasons: ["AUDIO_PLAYBACK"],
            justification: "播放 AI 任务完成提示音",
        });
    }
    await creating;
    creating = null;
}

async function playSound() {
    try {
        await ensureOffscreen();
        chrome.runtime.sendMessage({ type: MSG.PLAY_SOUND });
    } catch (e) {
        /* 提示音为可选增强，失败忽略 */
    }
}
