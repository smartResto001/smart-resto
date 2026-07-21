"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const socketHandler_1 = require("./socket/socketHandler");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const PORT = process.env.PORT || 5000;
const server = http_1.default.createServer(app_1.default);
// Initialize Socket.IO
(0, socketHandler_1.initSocketIO)(server);
server.listen(PORT, () => {
    console.log(`🚀 SmartResto Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready for real-time events`);
});
