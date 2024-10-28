import { useState, useEffect, useRef } from 'react';
import socket from '../../socket';
import ACTIONS from '../../socket/actions';
import { useNavigate } from 'react-router';
import { v4 } from 'uuid';

export default function Main() {
    const navigate = useNavigate();
    const [rooms, updateRooms] = useState([]);
    const rootNode = useRef();

    useEffect(() => {
        // This part uses destructuring to extract the rooms property from the data received in the event.
        // If no data is passed, or if the rooms property doesn’t exist, it defaults to an empty array.
        socket.on(ACTIONS.SHARE_ROOMS, ({ rooms = [] } = {}) => {
            if (rootNode.current) {
                updateRooms(rooms);
            }
        });
    }, []);

    return (
        <div ref={rootNode}>
            Main
            <ul>
                {rooms.map(roomID => (
                    <li key={roomID}>
                        {roomID}
                        <button onClick={() => {
                            navigate(`/rooms/${roomID}`)
                        }} >JOIN ROOM</button>
                    </li>
                ))}
            </ul>
            <button onClick={() => {
                navigate(`/rooms/${v4()}`)
            }} >CREATE NEW ROOM</button>
        </div>
    );
}