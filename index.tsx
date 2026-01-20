
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { db } from './db';

const Root: React.FC = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    db.init().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-blue-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl font-semibold">Carregando Clínica Nazzari...</p>
        </div>
      </div>
    );
  }

  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root not found");
const root = ReactDOM.createRoot(rootElement);
root.render(<Root />);
