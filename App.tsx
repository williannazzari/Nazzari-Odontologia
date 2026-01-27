
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Image as ImageIcon, 
  LayoutDashboard,
  Menu,
  X,
  ChevronRight,
  LogOut,
  ArrowLeft,
  Stethoscope,
  Settings as SettingsIcon,
  Download
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import PatientList from './components/PatientList';
import Calendar from './components/Calendar';
import Finance from './components/Finance';
import PatientsGallery from './components/PatientsGallery';
import Atendimento from './components/Atendimento';
import Settings from './components/Settings';

type View = 'dashboard' | 'patients' | 'calendar' | 'finance' | 'gallery' | 'atendimento' | 'settings';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // Sincroniza o estado atual com a hash da URL para permitir navegação do navegador
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as View;
      const validViews: View[] = ['dashboard', 'patients', 'calendar', 'finance', 'gallery', 'atendimento', 'settings'];
      
      if (validViews.includes(hash)) {
        setCurrentView(hash);
      } else if (!hash) {
        window.location.hash = 'dashboard';
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Verificação inicial ao carregar o app

    // PWA Install Prompt Listener
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
          setShowInstallBtn(false);
        }
        setDeferredPrompt(null);
      });
    }
  };

  const NavItem = ({ view, icon: Icon, label }: { view: View, icon: any, label: string }) => (
    <button
      onClick={() => {
        window.location.hash = view;
        if (window.innerWidth < 768) setIsSidebarOpen(false);
      }}
      className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl transition-all duration-300 ${
        currentView === view 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 translate-x-1' 
          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span className="font-bold">{label}</span>
    </button>
  );

  // Utilizamos o padrão "Keep-Alive" para as views principais.
  const views = useMemo(() => [
    { id: 'dashboard', component: <Dashboard /> },
    { id: 'patients', component: <PatientList /> },
    { id: 'calendar', component: <Calendar /> },
    { id: 'finance', component: <Finance /> },
    { id: 'gallery', component: <PatientsGallery /> },
    { id: 'atendimento', component: <Atendimento /> },
    { id: 'settings', component: <Settings /> },
  ], []);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      {/* Menu Mobile Flutuante */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed bottom-8 right-8 z-50 p-5 bg-blue-600 text-white rounded-full shadow-2xl border-4 border-white active:scale-90 transition-transform"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Barra Lateral (Sidebar) */}
      <aside 
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-40 w-72 bg-gray-900 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shadow-2xl flex flex-col`}
      >
        <div className="p-8 border-b border-gray-800 flex items-center space-x-3">
          <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-600/20">
            N
          </div>
          <div>
            <h1 className="text-white text-lg font-black tracking-tighter leading-none">NAZZARI</h1>
            <p className="text-blue-400 text-[9px] uppercase tracking-[0.2em] font-black mt-1">Odontologia</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-2">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Painel Inicial" />
          <NavItem view="atendimento" icon={Stethoscope} label="Novo Atendimento" />
          <NavItem view="calendar" icon={CalendarIcon} label="Agenda" />
          <NavItem view="patients" icon={Users} label="Pacientes" />
          <NavItem view="finance" icon={DollarSign} label="Financeiro" />
          <NavItem view="gallery" icon={ImageIcon} label="Imagens & RX" />
          
          <div className="pt-6 mt-6 border-t border-gray-800">
            <NavItem view="settings" icon={SettingsIcon} label="Configurações" />
          </div>
        </div>

        <div className="p-8 border-t border-gray-800 space-y-2">
          {showInstallBtn && (
            <button 
              onClick={handleInstallClick}
              className="flex items-center space-x-3 w-full px-4 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-500 transition-all font-bold animate-pulse"
            >
              <Download size={20} />
              <span>Instalar App</span>
            </button>
          )}
          <button className="flex items-center space-x-3 w-full px-4 py-3 text-gray-500 hover:text-red-400 transition-all font-bold group">
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {/* Cabeçalho */}
        <header className="shrink-0 z-30 bg-white border-b border-gray-200 px-10 py-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-6">
            {currentView !== 'dashboard' && (
              <button 
                onClick={() => window.history.back()}
                className="flex items-center space-x-2 text-gray-400 hover:text-blue-600 px-4 py-2 rounded-2xl transition-all font-black text-xs uppercase tracking-widest border border-gray-100 hover:border-blue-100 hover:bg-blue-50 shadow-sm"
              >
                <ArrowLeft size={16} />
                <span>Voltar</span>
              </button>
            )}
            <div className="flex items-center space-x-3 text-sm">
              <span className={`font-black uppercase tracking-widest text-[10px] ${currentView === 'dashboard' ? 'text-blue-600' : 'text-gray-300'}`}>Início</span>
              {currentView !== 'dashboard' && (
                <>
                  <ChevronRight size={12} className="text-gray-300" />
                  <span className="text-blue-600 font-black uppercase tracking-widest text-[10px]">
                    {currentView}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-black text-gray-900 leading-none">Dr. Willian Nazzari</p>
              <div className="flex items-center justify-end space-x-1 mt-1.5">
                <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></span>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Ativo Agora</p>
              </div>
            </div>
            <div className="h-12 w-12 bg-gray-100 rounded-2xl flex items-center justify-center text-blue-600 font-black border-2 border-white shadow-xl shadow-gray-200 ring-1 ring-gray-100">
              WN
            </div>
          </div>
        </header>

        {/* Container de Visualização com Scroll Independente */}
        <div className="flex-1 overflow-y-auto bg-gray-50 relative p-10">
          <div className="max-w-7xl mx-auto h-full">
            {views.map(view => (
              <div 
                key={view.id} 
                className={`h-full ${currentView === view.id ? 'block animate-in fade-in slide-in-from-bottom-2 duration-300' : 'hidden'}`}
              >
                {view.component}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;