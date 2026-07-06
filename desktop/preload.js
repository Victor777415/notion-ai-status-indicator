"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("naiBridge", {
    onSnapshot: (cb) => ipcRenderer.on("nai:snapshot", (_e, data) => cb(data)),
    onConnection: (cb) => ipcRenderer.on("nai:connection", (_e, data) => cb(data)),
    onServerError: (cb) => ipcRenderer.on("nai:server-error", (_e, data) => cb(data)),
    focus: (payload) => ipcRenderer.send("nai:focus", payload),
    minimize: () => ipcRenderer.send("nai:minimize"),
    quit: () => ipcRenderer.send("nai:quit"),
});
