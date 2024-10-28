import { useCallback, useRef, useEffect } from 'react';
import ACTIONS from '../socket/actions';
import socket from '../socket';
import useStateWithCallback from './useStateWithCallback';
import freeice from 'freeice';

export const LOCAL_VIDEO = 'LOCAL_VIDEO';

export default function useWebRTC(roomID) {
    const [clients, updateClients] = useStateWithCallback([]);

    const addNewClient = useCallback((newClient, cb) => {
        if (!clients.includes(newClient)) {
            updateClients(list => [...list, newClient], cb);
        }
    }, [clients, updateClients]);

    const peerConnection = useRef({});
    const localMediaStream = useRef(null);
    const peerMediaElements = useRef({
        [LOCAL_VIDEO]: null
    });

    useEffect(() => {
        async function handleNewPeer({ peerID, createOffer }) {
            if (peerID in peerConnection.current) {
                return console.warn(`Already connected to peer ${peerID}`);
            }

            peerConnection.current[peerID] = new RTCPeerConnection({
                iceServers: freeice()
            });

            peerConnection.current[peerID].onicecandidate = event => {
                if (event.candidate) {
                    socket.emit(ACTIONS.RELAY_ICE, {
                        peerID,
                        iceCandidate: event.candidate
                    });
                }
            }

            let trackNumber = 0;
            peerConnection.current[peerID].ontrack = ({ streams: [remoteStream] }) => {
                trackNumber++;

                if (trackNumber === 2) { // video & audio tracks received
                    addNewClient(peerID, () => {
                        peerMediaElements.current[peerID].srcObject = remoteStream;
                    });
                }
            }

            localMediaStream.current.getTracks().forEach(track => {
                peerConnection.current[peerID].addTrack(track, localMediaStream.current);
            });

            if (createOffer) {
                const offer = await peerConnection.current[peerID].createOffer();

                await peerConnection.current[peerID].setLocalDescription(offer);

                socket.emit(ACTIONS.RELAY_SDP, {
                    peerID,
                    sessionDescription: offer
                });
            }
        }

        socket.on(ACTIONS.ADD_PEER, handleNewPeer);
    }, []);

    useEffect(() => {
        async function setRemoteMedia({ peerID, sessionDescription: remoteDescription }) {
            await peerConnection.current[peerID].setRemoteDescription(
                new RTCSessionDescription(remoteDescription)
            );

            if (remoteDescription.type === 'offer') {
                const answer = await peerConnection.current[peerID].createAnswer();

                await peerConnection.current[peerID].setLocalDescription(answer);

                socket.emit(ACTIONS.RELAY_SDP, {
                    peerID,
                    sessionDescription: answer
                });
            }
        }

        socket.on(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia);
    }, [])

    useEffect(() => {
        socket.on(ACTIONS.ICE_CANDIDATE, ({ peerID, iceCandidate }) => {
            peerConnection.current[peerID].addIceCandidate(
                new RTCIceCandidate(iceCandidate)
            )
        })
    }, [])

    useEffect(() => {
        socket.on(ACTIONS.REMOVE_PEER, ({ peerID }) => {
            if (peerConnection.current[peerID]) {
                peerConnection.current[peerID].close();
            }

            delete peerConnection.current[peerID];
            delete peerMediaElements.current[peerID];

            updateClients(list => list.filter(c => c !== peerID));
        });
    }, [])

    useEffect(() => {
        // The async keyword is used in front of the startCapture function to allow for the use of await within that function
        async function startCapture() {
            // We request access to the user's media devices, such as the microphone and camera.
            localMediaStream.current = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: {
                    width: 1280,
                    height: 720,
                }
            });

            addNewClient(LOCAL_VIDEO, () => {
                const localVideoElement = peerMediaElements.current[LOCAL_VIDEO];

                if (localVideoElement) {
                    localVideoElement.volume = 0;
                    localVideoElement.srcObject = localMediaStream.current;
                }
            });
        }
        startCapture()
            .then(() => {
                console.log('Emitting JOIN action for room:', roomID);
                socket.emit(ACTIONS.JOIN, { room: roomID });
            })
            .catch(e => console.error('Error getting user media', e));

        return () => {
            if (localMediaStream.current) {
                localMediaStream.current.getTracks().forEach(track => track.stop());
            }

            socket.emit(ACTIONS.LEAVE);
        }
    }, [roomID]);

    const provideMediaRef = useCallback((id, node) => {
        peerMediaElements.current[id] = node;
    }, []);

    return {
        clients,
        provideMediaRef
    };
}