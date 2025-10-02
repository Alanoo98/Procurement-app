import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import emailjs from '@emailjs/browser'

emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY!) // 👈 add this line

createRoot(document.getElementById("root")!).render(<App />);
