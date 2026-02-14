import { io } from 'socket.io-client';

const isDev = import.meta.env.DEV;
const URL = isDev ? 'http://localhost:3001' : window.location.origin;

export const socket = io(URL, {
    autoConnect: false
});
