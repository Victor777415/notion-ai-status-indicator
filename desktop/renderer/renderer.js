"use strict";

const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const countEl = document.getElementById("count");
const connEl = document.getElementById("conn");

const STATE_META = {
    idle: { label: "空闲", cls: "idle" },
    thinking: { label: "思考中", cls: "run" },
    responding: { label: "输出中", cls: "run" },
    done: { label: "完成", cls: "done" },
};
const RANK = { thinking: 0, responding: 0, done: 1, idle: 2 };

let current = [];

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
    return Math.floor(m / 60) + " 小时前";
}

function render(items) {
    const arr = (items || []).slice();
    arr.sort((a, b) => {
        const ra = RANK[a.state] != null ? RANK[a.state] : 3;
        const rb = RANK[b.state] != null ? RANK[b.state] : 3;
        if (ra !== rb) return ra - rb;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    const running = arr.filter((c) => isRunning(c.state)).length;
    countEl.textContent = running > 0
        ? running + " 个进行中"
        : (arr.length ? arr.length + " 个对话" : "");

    listEl.innerHTML = "";
    if (!arr.length) {
        emptyEl.hidden = false;
        return;
    }
    emptyEl.hidden = true;

    for (const c of arr) {
        const meta = STATE_META[c.state] || STATE_META.idle;
        const item = document.createElement("div");
        item.className = "item " + meta.cls;

        const ind = document.createElement("span");
        ind.className = "ind " + meta.cls;
        if (isRunning(c.state)) {
            ind.classList.add("spin");
        } else if (c.state === "done") {
            ind.textContent = "✓";
        }

        const main = document.createElement("div");
        main.className = "main";
        const title = document.createElement("div");
        title.className = "title";
        title.textContent = c.title || hostOf(c.url) || "Notion 对话";
        const sub = document.createElement("div");
        sub.className = "sub";
        sub.textContent = meta.label + (c.updatedAt ? " · " + timeAgo(c.updatedAt) : "");
        main.appendChild(title);
        main.appendChild(sub);

        const go = document.createElement("span");
        go.className = "go";
        go.textContent = "↗";

        item.appendChild(ind);
        item.appendChild(main);
        item.appendChild(go);
        item.addEventListener("click", () => {
            window.naiBridge.focus({ tabId: c.tabId, windowId: c.windowId });
        });
        listEl.appendChild(item);
    }
}

window.naiBridge.onSnapshot((data) => {
    current = Array.isArray(data) ? data : [];
    render(current);
});

window.naiBridge.onConnection(({ connected }) => {
    connEl.textContent = connected ? "● 已连接扩展" : "○ 等待扩展…";
    connEl.className = connected ? "conn on" : "conn off";
});

window.naiBridge.onServerError((message) => {
    connEl.textContent = "⚠ 端口占用";
    connEl.className = "conn off";
    connEl.title = message || "";
});

document.getElementById("min").addEventListener("click", () => window.naiBridge.minimize());
document.getElementById("quit").addEventListener("click", () => window.naiBridge.quit());

// 每秒刷新相对时间显示
setInterval(() => render(current), 1000);
