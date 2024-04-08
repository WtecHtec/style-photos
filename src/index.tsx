import ReactDOM from 'react-dom/client'
import './app.css';
import App from './app';
import LoadApp from './components/LoadApp';
// import './locales/i18n' // 支持国际化
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<LoadApp ><App /></LoadApp>)


