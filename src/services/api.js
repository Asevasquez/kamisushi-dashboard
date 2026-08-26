import axios from 'axios';

//const API_URL = 'http://localhost:5000/api';
const API_URL = 'http://192.168.4.131:5000/api';
//const API_URL = 'http://192.168.68.54:5000/api';


const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@KamiSushi:token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;