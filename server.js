const path = require('path');
const express = require('express');
const ACTIONS = require('./src/socket/actions');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server)
const { version, validate } = require('uuid')

const PORT = process.env.PORT || 3001;

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

function getClientRooms() {
    const { rooms } = io.sockets.adapter;
    return Array.from(rooms.keys()).filter(roomID => validate(roomID) && version(roomID) === 4);
}

function shareRoomInfo() {
    io.emit(ACTIONS.SHARE_ROOMS, {
        rooms: getClientRooms()
    })
}

// When a client connects, a new socket instance is created to handle communication with that specific client.
io.on('connection', socket => {
    console.log(`Client connected: ${socket.id}`);
    shareRoomInfo();

    socket.on(ACTIONS.JOIN, config => {
        // Code inside here is executed when the current client sends a "JOIN" action
        const { room: roomID } = config;

        // The rooms property on a socket is a set that contains all the rooms that the socket is currently a member of, 
        // including the automatically-created room with the socket ID itself.
        const { rooms: joinedRooms } = socket;

        if (Array.from(joinedRooms).includes(roomID)) {
            return console.warn(`Already joined to ${roomID}`)
        }

        const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);

        clients.forEach(clientID => {
            io.to(clientID).emit(ACTIONS.ADD_PEER, {
                peerID: socket.id,
                createOffer: false
            });

            socket.emit(ACTIONS.ADD_PEER, {
                peerID: clientID,
                createOffer: true
            });
        });

        // The actual joining is made
        socket.join(roomID);
        shareRoomInfo();
    });

    function leaveRoom() {
        const { rooms } = socket;

        Array.from(rooms)
            .filter(roomID => validate(roomID) && version(roomID) === 4)
            .forEach(roomID => {
                const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);

                clients
                    .forEach(clientID => {
                        io.to(clientID).emit(ACTIONS.REMOVE_PEER, {
                            peerID: socket.id,
                        });

                        socket.emit(ACTIONS.REMOVE_PEER, {
                            peerID: clientID,
                        });
                    });

                socket.leave(roomID);
            });

        shareRoomInfo();
    }

    socket.on(ACTIONS.LEAVE, leaveRoom);
    socket.on('disconnecting', leaveRoom);

    socket.on(ACTIONS.RELAY_SDP, ({ peerID, sessionDescription }) => {
        io.to(peerID).emit(ACTIONS.SESSION_DESCRIPTION, {
            peerID: socket.id,
            sessionDescription
        });
    });

    socket.on(ACTIONS.RELAY_ICE, ({ peerID, iceCandidate }) => {
        io.to(peerID).emit(ACTIONS.ICE_CANDIDATE, {
            peerID: socket.id,
            iceCandidate
        })
    })

    socket.on(ACTIONS.MESSAGE, (msg) => {

        const { rooms } = socket;

        Array.from(rooms)
            .filter(roomID => validate(roomID) && version(roomID) === 4)
            .forEach(roomID => {
                const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);

                clients
                    .forEach(clientID => {
                        io.to(clientID).emit(ACTIONS.MESSAGE, msg);
                    });
            });
    });
})

server.listen(PORT, () => {
    console.log('Server is listening on port ' + PORT)
})