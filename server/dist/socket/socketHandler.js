"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSocketIO = exports.initSocketIO = void 0;
const socket_io_1 = require("socket.io");
let io = null;
const initSocketIO = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
        },
    });
    io.on('connection', (socket) => {
        console.log(`🔌 Client connected to Socket.IO: ${socket.id}`);
        socket.on('join:role', (role) => {
            if (role) {
                socket.join(`role:${role.toLowerCase()}`);
                console.log(`👤 Socket ${socket.id} joined room: role:${role.toLowerCase()}`);
            }
        });
        socket.on('disconnect', () => {
            console.log(`❌ Client disconnected: ${socket.id}`);
        });
    });
    return io;
};
exports.initSocketIO = initSocketIO;
const getSocketIO = () => {
    return io;
};
exports.getSocketIO = getSocketIO;
