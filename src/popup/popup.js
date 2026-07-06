(() => {
    "use strict";

    const STORE_KEY = "nai_conversations";
    const STATE_META = {
        idle: { label: "空闲", cls: "idle" },
        thinking: { label: "思考中", cls: "run" },
        responding: { label: "输出中", cls: "run" },
        done: { label: "完成", cls: "done" },
    };
    const RANK = { thinking: 0, responding: 0, done: 1, idle: 2 };

    const listEl = document.getElementById("nai-list");
    const emptyEl = document.getElementById("nai-empty");
    const countEl = document.getElementById("nai-count");

    function isRunning(state) {
        return state === "thinking" || state === "responding";
    }

    function hostOf(url) {
        try { return new URL(url).host; } catch (_) { return ""; }
    }

    function timeAgo(ts) {
        if (!ts) return "";
        const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
        if (s < 5) return "刚刚";
        if (s < 60) return s + " 秒前";
        const m = Math.floor(s / 60);
        if (m < 60) return m + " 分钟前";
        const h = Math.floor(m / 60);
        return h + " 小时前";
    }

    function focusTab(tabId, windowId) {
        try {
            if (windowId != null) {
                chrome.windows.update(windowId, { focused: true }, () => { void chrome.runtime.lastError; });
            }
            chrome.tabs.update(tabId, { active: true }, () => { void chrome.runtime.lastError; });
        } catch (_) {}
        window.close();
    }

    function render(list) {
        const items = Object.values(list || {});
        items.sort((a, b) => {
            const ra = RANK[a.state] != null ? RANK[a.state] : 3;
            const rb = RANK[b.state] != null ? RANK[b.state] : 3;
            if (ra !== rb) return ra - rb;
            return (b.updatedAt || 0) - (a.updatedAt || 0);
        });

        const running = items.filter((c) => isRunning(c.state)).length;
        countEl.textContent = running > 0
            ? running + " 个进行中"
            : (items.length ? items.length + " 个对话" : "");

        listEl.innerHTML = "";
        if (!items.length) {
            emptyEl.hidden = false;
            return;
        }
        emptyEl.hidden = true;

        for (const c of items) {
            const meta = STATE_META[c.state] || STATE_META.idle;
            const li = document.createElement("li");
            li.className = "nai-item " + meta.cls;
            li.tabIndex = 0;

            const ind = document.createElement("span");
            ind.className = "nai-ind " + meta.cls;
            if (isRunning(c.state)) {
                ind.classList.add("nai-spin");
            } else if (c.state === "done") {
                ind.textContent = "✓";
            }

            const main = document.createElement("div");
            main.className = "nai-main";
            const title = document.createElement("div");
            title.className = "nai-title";
            title.textContent = c.title || hostOf(c.url) || "Notion 对话";
            const sub = document.createElement("div");
            sub.className = "nai-sub";
            sub.textContent = meta.label + (c.updatedAt ? " · " + timeAgo(c.updatedAt) : "");
            main.appendChild(title);
            main.appendChild(sub);

            const go = document.createElement("span");
            go.className = "nai-go";
            go.textContent = "↗";

            li.appendChild(ind);
            li.appendChild(main);
            li.appendChild(go);

            const activate = () => focusTab(Number(c.tabId), c.windowId);
            li.addEventListener("click", activate);
            li.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }
            });
            listEl.appendChild(li);
        }
    }

    function load() {
        try {
            chrome.storage.session.get(STORE_KEY, (data) => {
                void chrome.runtime.lastError;
                render((data && data[STORE_KEY]) || {});
            });
        } catch (_) {
            render({});
        }
    }

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "session" && changes[STORE_KEY]) {
            render(changes[STORE_KEY].newValue || {});
        }
    });

    load();
})();
