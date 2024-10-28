import {io} from 'socket.io-client'

const options = {
    "force new connection": true,
    reconnectionAttempts: "Infinity",
    timeout: 10000,
    transports: ["websocket", "polling"]
}

console.log(process.env.REACT_APP_SOCKET_URL)

const socket = io(process.env.REACT_APP_SOCKET_URL || 'wss://video-chat-s8mc.onrender.com', options);

export default socket;