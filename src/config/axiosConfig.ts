import axios from 'axios';

axios.defaults.baseURL = process.env.REACT_APP_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://full-stack-chat-app-node-based.onrender.com';

export default axios;