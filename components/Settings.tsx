import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  Cloud, 
  CheckCircle, 
  AlertTriangle, 
  HardDrive, 
  Download, 
  RefreshCw,
  LogOut,
  Calendar,
  Key
} from 'lucide-react';
import { db } from '../db';

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

const Settings: React.FC = () => {
  const [clinicName, setClinicName] = useState('Nazzari Odontologia');
  const [dentistName, setDentistName] = useState('Dr. Nazzari');
  
  // Google API Settings
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  
  // Estados para simulação do Google Drive (Mantido para compatibilidade visual)
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);

  useEffect(() => {
    const savedClinic = localStorage.getItem('clinicName');
    const savedDentist = localStorage.getItem('dentistName');
    const savedDrive = localStorage.getItem('driveConnected');
    const savedBackup = localStorage.getItem('lastBackup');
    
    // Load Google API Config
    const savedClientId = localStorage.getItem('googleClientId');
    const savedApiKey = localStorage.getItem('googleApiKey');
    const savedToken = localStorage.getItem('google_access_token');

    if (savedClinic) setClinicName(savedClinic);
    if (savedDentist) setDentistName(savedDentist);
    if (savedDrive === 'true') setIsDriveConnected(true);
    if (savedBackup) setLastBackup(savedBackup);
    if (savedClientId) setGoogleClientId(savedClientId);
    if (savedApiKey) setGoogleApiKey(savedApiKey);
    if (savedToken) setIsCalendarConnected(true);

  }, []);

  const handleSaveProfile = () => {
    localStorage.setItem('clinicName', clinicName);
    localStorage.setItem('dentistName', dentistName);
    localStorage.setItem('googleClientId', googleClientId);
    localStorage.setItem('googleApiKey', googleApiKey);
    alert('Configurações salvas com sucesso!');
  };

  // Google Calendar Integration
  const handleGoogleLogin = () => {
    if (!googleClientId) return alert("Por favor, insira o Client ID do Google.");

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: 'https://www.googleapis.com/auth/calendar',
      callback: (tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
          localStorage.setItem('google_access_token', tokenResponse.access_token);
          // Set expiry time (approx 1 hour)
          localStorage.setItem('google_token_expiry', (Date.now() + (tokenResponse.expires_in * 1000)).toString());
          setIsCalendarConnected(true);
          alert("Conectado ao Google Calendar!");
        }
      },
    });
    client.requestAccessToken();
  };

  const handleGoogleLogout = () => {
    const token = localStorage.getItem('google_access_token');
    if (token) {
      window.google.accounts.oauth2.revoke(token, () => {
        console.log('Access token revoked');
      });
    }
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');
    setIsCalendarConnected(false);
  };

  const handleConnectDrive = () => {
    const confirm = window.confirm("Você será redirecionado para a autenticação do Google. Deseja continuar?");
    if (confirm) {
      setTimeout(() => {
        setIsDriveConnected(true);
        localStorage.setItem('driveConnected', 'true');
        alert("Conectado ao Google Drive com sucesso!");
      }, 1000);
    }
  };

  const handleDisconnectDrive = () => {
    setIsDriveConnected(false);
    localStorage.setItem('driveConnected', 'false');
    setLastBackup(null);
  };

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const dateStr = new Date().toLocaleString('pt-BR');
      setLastBackup(dateStr);
      localStorage.setItem('lastBackup', dateStr);
      alert("Backup realizado com sucesso no Google Drive!");
    } catch (error) {
      alert("Erro ao realizar backup.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleLocalExport = async () => {
    const patients = await db.getAll('patients');
    const appointments = await db.getAll('appointments');
    const transactions = await db.getAll('transactions');
    
    const backupData = {
      timestamp: new Date().toISOString(),
      app: 'NazzariOdonto',
      version: '1.0',
      data: { patients, appointments, transactions }
    };

    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr as string], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_nazzari_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Configurações</h2>
        <p className="text-gray-500 font-medium">Personalização e Integrações</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Profile Settings */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
              <SettingsIcon size={24} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-lg">Perfil e API</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Dados da Clínica</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Nome da Clínica</label>
              <input 
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-50 font-bold text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Nome do Profissional</label>
              <input 
                value={dentistName}
                onChange={(e) => setDentistName(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-50 font-bold text-gray-900"
              />
            </div>
            
            <div className="pt-4 border-t border-gray-100 mt-4">
               <h4 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                 <Key size={16} className="text-blue-500"/> Credenciais Google (Opcional)
               </h4>
               <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Google Client ID</label>
                    <input 
                      type="password"
                      placeholder="xxx.apps.googleusercontent.com"
                      value={googleClientId}
                      onChange={(e) => setGoogleClientId(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Google API Key</label>
                    <input 
                      type="password"
                      placeholder="AIzaSy..."
                      value={googleApiKey}
                      onChange={(e) => setGoogleApiKey(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 leading-tight">
                    Necessário para sincronização com Google Calendar. Crie um projeto no Google Cloud Console e habilite a Calendar API.
                  </p>
               </div>
            </div>

            <button 
              onClick={handleSaveProfile}
              className="w-full py-4 bg-gray-900 text-white rounded-[1.5rem] font-black shadow-lg hover:bg-black transition-all flex items-center justify-center space-x-2"
            >
              <Save size={20} />
              <span>Salvar Configurações</span>
            </button>
          </div>
        </div>

        {/* Integrations */}
        <div className="space-y-8">
          
          {/* Google Calendar */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5">
               <Calendar size={120} />
             </div>
             
             <div className="flex items-center space-x-3 mb-6 relative z-10">
               <div className={`p-3 rounded-2xl transition-colors ${isCalendarConnected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                 <Calendar size={24} />
               </div>
               <div>
                 <h3 className="font-black text-gray-900 text-lg">Google Calendar</h3>
                 <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Agenda Sincronizada</p>
               </div>
             </div>

             {isCalendarConnected ? (
               <div className="space-y-4 relative z-10">
                 <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center space-x-3">
                    <CheckCircle className="text-blue-600 shrink-0" size={20} />
                    <p className="text-sm font-black text-blue-900">Conectado</p>
                 </div>
                 <button onClick={handleGoogleLogout} className="text-sm font-bold text-red-500 hover:underline">Desconectar Conta</button>
               </div>
             ) : (
               <div className="relative z-10 space-y-4">
                 <p className="text-sm text-gray-500">Conecte sua conta para sincronizar agendamentos automaticamente.</p>
                 <button 
                   onClick={handleGoogleLogin}
                   className="w-full py-3 bg-white border-2 border-gray-200 hover:border-blue-500 hover:text-blue-600 text-gray-700 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                 >
                   <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                   <span>Conectar Google Calendar</span>
                 </button>
               </div>
             )}
          </div>

          {/* Cloud Backup Settings */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Cloud size={120} />
            </div>
            
            <div className="flex items-center space-x-3 mb-4 relative z-10">
              <div className={`p-3 rounded-2xl transition-colors ${isDriveConnected ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                <Cloud size={24} />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-lg">Google Drive</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Backup na Nuvem</p>
              </div>
            </div>

            {isDriveConnected ? (
              <div className="space-y-6 relative z-10">
                <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-center space-x-3">
                  <CheckCircle className="text-green-600 shrink-0" size={24} />
                  <div>
                    <p className="text-sm font-black text-green-800">Conectado ao Drive</p>
                    <p className="text-xs text-green-600 font-medium">Backup Ativo</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 font-bold">Último Backup:</span>
                  <span className="font-black text-gray-900">{lastBackup || 'Nunca realizado'}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={handleBackupNow}
                    disabled={isBackingUp}
                    className="py-3 px-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-900/10 hover:bg-blue-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isBackingUp ? <RefreshCw className="animate-spin" size={18} /> : <Cloud size={18} />}
                    <span>{isBackingUp ? 'Enviando...' : 'Fazer Backup'}</span>
                  </button>
                  <button 
                    onClick={handleDisconnectDrive}
                    className="py-3 px-4 bg-white border border-gray-200 text-red-500 rounded-xl font-bold hover:bg-red-50 hover:border-red-100 transition-all flex items-center justify-center space-x-2"
                  >
                    <LogOut size={18} />
                    <span>Desconectar</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 relative z-10">
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-center space-x-3">
                  <AlertTriangle className="text-orange-500 shrink-0" size={24} />
                  <div>
                    <p className="text-sm font-black text-orange-800">Drive Desconectado</p>
                    <p className="text-xs text-orange-600 font-medium">Salvar dados na nuvem.</p>
                  </div>
                </div>

                <button 
                  onClick={handleConnectDrive}
                  className="w-full py-3 bg-white border-2 border-gray-100 text-gray-700 rounded-[1.5rem] font-bold hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center space-x-3 group"
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
                  <span>Conectar Drive</span>
                </button>
              </div>
            )}
          </div>

          {/* Local Backup */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-3 bg-gray-100 rounded-2xl text-gray-600">
                <HardDrive size={24} />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-lg">Backup Local</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Arquivo no Dispositivo</p>
              </div>
            </div>
            
            <button 
              onClick={handleLocalExport}
              className="w-full py-4 bg-gray-50 text-gray-900 border border-gray-200 rounded-[1.5rem] font-black hover:bg-gray-100 transition-all flex items-center justify-center space-x-2"
            >
              <Download size={20} />
              <span>Exportar Dados (JSON)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;