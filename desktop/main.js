"use strict";

const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
const { WebSocketServer } = require("ws");

const WS_PORT = 8787;
let mainWindow = null;
let wss = null;
const clients = new Set();
let lastSnapshot = [];

function createWindow() {
    const { workArea } = screen.getPrimaryDisplay();
    const width = 300;
    const height = 440;
    mainWindow = new BrowserWindow({
        width,
        height,
        x: workArea.x + workArea.width - width - 20,
        y: workArea.y + 20,
        frame: false,
        resizable: true,
        transparent: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        fullscreenable: false,
        minWidth: 240,
        minHeight: 200,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    // 置顶到可悬浮在全屏应用之上的层级，并在所有桌面/空间可见。
    mainWindow.setAlwaysOnTop(true, "screen-saver");
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

    mainWindow.webContents.on("did-finish-load", () => {
        mainWindow.webContents.send("nai:snapshot", lastSnapshot);
        mainWindow.webContents.send("nai:connection", { connected: clients.size > 0 });
    });

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

function startWsServer() {
    wss = new WebSocketServer({ host: "127.0.0.1", port: WS_PORT });

    wss.on("connection", (socket) => {
        clients.add(socket);
        sendConnectionStatus();

        socket.on("message", (data) => {
            let msg;
            try {
                msg = JSON.parse(data.toString());
            } catch (e) {
                return;
            }
            if (msg && msg.type === "snapshot") {
                lastSnapshot = Array.isArray(msg.conversations) ? msg.conversations : [];
                if (mainWindow) mainWindow.webContents.send("nai:snapshot", lastSnapshot);
            }
        });

        socket.on("close", () => {
            clients.delete(socket);
            sendConnectionStatus();
        });

        socket.on("error", () => {
            clients.delete(socket);
        });
    });

    wss.on("error", (err) => {
        const message = err && err.message ? err.message : String(err);
        if (mainWindow) mainWindow.webContents.send("nai:server-error", message);
    });
}

function sendConnectionStatus() {
    if (mainWindow) mainWindow.webContents.send("nai:connection", { connected: clients.size > 0 });
}

ipcMain.on("nai:focus", (_ev, payload) => {
    const data = JSON.stringify({
        type: "focus",
        tabId: payload && payload.tabId,
        windowId: payload && payload.windowId,
    });
    for (const c of clients) {
        try { c.send(data); } catch (e) {}
    }
});

ipcMain.on("nai:minimize", () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on("nai:quit", () => {
    app.quit();
});

app.whenReady().then(() => {
    createWindow();
    startWsServer();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
