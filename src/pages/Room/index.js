import { useParams } from "react-router";
import useWebRTC, { LOCAL_VIDEO } from "../../hooks/useWebRTC";

export default function Room() {
    const { id: roomID } = useParams();
    const { clients, provideMediaRef, messages, sendMessage, newMessage, setNewMessage } = useWebRTC(roomID);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (newMessage.trim()) {
            sendMessage(newMessage); 
        }
    };

    return (
        <div>
            {clients.map((clientID) => (
                <div key={clientID}>
                    <video
                        ref={instance => {
                            provideMediaRef(clientID, instance);
                        }}
                        autoPlay
                        playsInline
                        muted={clientID === LOCAL_VIDEO}
                    />
                </div>
            ))}

            <div>
                <h3>Chat</h3>
                <ul>
                    {messages.map((msg, index) => (
                        <li key={index}>{msg.id}: {msg.msg}</li>
                    ))}
                </ul>
                <form onSubmit={handleSendMessage}>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)} // Use the hook's state function
                        placeholder="Type your message..."
                    />
                    <button type="submit">Send</button>
                </form>
            </div>
        </div>
    );
}