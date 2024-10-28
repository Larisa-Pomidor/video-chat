import { useParams } from "react-router";
import useWebRTC, { LOCAL_VIDEO } from "../../hooks/useWebRTC";

export default function Room() {
    const { id: roomID } = useParams();
    const { clients, provideMediaRef } = useWebRTC(roomID);

    return (
        <div>
            {clients.map((clientID) => {
                return (
                    <div key={clientID}>
                        <video
                            // The parameter instance represents the actual DOM element created for this <video> tag.
                            ref={instance => {
                                provideMediaRef(clientID, instance);
                            }}
                            autoPlay
                            playsInline
                            muted={clientID === LOCAL_VIDEO}
                        />
                    </div>
                )
            })}
        </div>
    );
}