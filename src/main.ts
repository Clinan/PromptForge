import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

const storedTheme = typeof window !== 'undefined' ? (localStorage.getItem('truestprompt-theme') as 'light' | 'dark' | null) : null;
const initialTheme = storedTheme === 'dark' ? 'dark' : 'light';
document.documentElement.setAttribute('data-theme', initialTheme);

createApp(App).mount('#app');
