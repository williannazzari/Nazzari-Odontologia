
import React, { useState, useEffect } from 'react';
import { 
  Plus, Calendar as CalendarIcon, X, PlusCircle, Search, UserPlus, 
  Trash2, CheckCircle, XCircle, Clock, ThumbsUp, Stethoscope, User, RefreshCw
} from 'lucide-react';
import { db } from '../db';
import { Appointment, Patient } from '../types';

declare global {
  interface Window {
    gapi: any;
  }
}

const Calendar: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickAdd, setIsQuickAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Appointment>>({
    date: selectedDate, time: '08:00', procedure: '', status: 'scheduled'
  });
  
  const [quickPatient, setQuickPatient] = useState({ name: '', phone: '', cpf: '' });

  const timeSlots = Array.from({ length: 25 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const min = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  }).filter(t => parseInt(t.split(':')[0]) < 21);

  useEffect(() => {
    loadData();
    const handleHashChange = () => { if (window.location.hash === '#calendar') loadData(); };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [selectedDate]);

  const loadData = async () => {
    const apps = await db.getAll<Appointment>('appointments');
    const ps = await db.getAll<Patient>('patients');
    setAppointments(apps.filter(a => a.date === selectedDate));
    setPatients(ps.sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleSyncWithGoogle = async () => {
    const token = localStorage.getItem('google_access_token');
    const apiKey = localStorage.getItem('googleApiKey');
    
    if (!token || !apiKey) {
      return alert("Google Calendar não configurado. Vá em Configurações > Perfil.");
    }

    setIsSyncing(true);
    try {
      // 1. Initialize GAPI
      await new Promise<void>((resolve) => window.gapi.load('client', resolve));
      await window.gapi.client.init({
        apiKey: apiKey,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
      });
      window.gapi.client.setToken({ access_token: token });

      // 2. Export Local Appointments to Google (One-way sync for MVP simplicity)
      const allApps = await db.getAll<Appointment>('appointments');
      const appsToSync = allApps.filter(a => !a.googleEventId && new Date(a.date) >= new Date());

      let syncedCount = 0;
      for (const app of appsToSync) {
         try {
           const startDateTime = new Date(`${app.date}T${app.time}:00`).toISOString();
           const endDateTime = new Date(new Date(`${app.date}T${app.time}:00`).getTime() + 30*60000).toISOString(); // 30 min duration default

           const event = {
             summary: `${app.patientName} - ${app.procedure}`,
             description: app.notes || 'Agendado via Nazzari App',
             start: { dateTime: startDateTime },
             end: { dateTime: endDateTime }
           };

           const response = await window.gapi.client.calendar.events.insert({
             'calendarId': 'primary',
             'resource': event
           });
           
           if (response.result.id) {
             app.googleEventId = response.result.id;
             await db.save('appointments', app);
             syncedCount++;
           }
         } catch (err) {
           console.error("Erro ao sincronizar evento", app, err);
         }
      }

      // 3. Import from Google (Simplified: Create Appointment if not exists locally)
      const startOfMonth = new Date(selectedDate);
      startOfMonth.setDate(1);
      const endOfMonth = new Date(selectedDate);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);

      const response = await window.gapi.client.calendar.events.list({
        'calendarId': 'primary',
        'timeMin': startOfMonth.toISOString(),
        'timeMax': endOfMonth.toISOString(),
        'showDeleted': false,
        'singleEvents': true,
      });

      const googleEvents = response.result.items;
      let importedCount = 0;

      if (googleEvents) {
        for (const ev of googleEvents) {
           // Skip if already exists
           const exists = allApps.find(a => a.googleEventId === ev.id);
           if (!exists && ev.start.dateTime) {
              const evDate = ev.start.dateTime.split('T')[0];
              const evTime = ev.start.dateTime.split('T')[1].substring(0, 5);
              
              // Simple logic: If description matches patient name format or similar, use it.
              // For now, create placeholder appointment.
              // We need a patientId. We'll search for patient by name in summary.
              
              const summaryParts = ev.summary.split('-');
              const patientName = summaryParts[0].trim();
              const procedure = summaryParts.length > 1 ? summaryParts[1].trim() : 'Consulta Google Agenda';

              let patient = patients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
              
              // If patient not found, skip or create placeholder? 
              // Better to skip to avoid polluting DB with non-clinical events
              if (patient) {
                 const newApp: Appointment = {
                   id: Date.now().toString() + Math.random().toString().slice(2,5),
                   patientId: patient.id,
                   patientName: patient.name,
                   date: evDate,
                   time: evTime,
                   procedure: procedure,
                   status: 'scheduled',
                   type: 'odontologia',
                   googleEventId: ev.id,
                   notes: ev.description
                 };
                 await db.save('appointments', newApp);
                 importedCount++;
              }
           }
        }
      }

      alert(`Sincronização concluída!\nEnviados: ${syncedCount}\nImportados: ${importedCount}`);
      loadData();
    } catch (e: any) {
      console.error(e);
      if (e.status === 401) alert("Sessão expirada. Reconecte na aba Configurações.");
      else alert("Erro na sincronização. Verifique a API Key e conexão.");
    } finally {
      setIsSyncing(false);
    }
  };

  const startAttendance = (patientId: string) => {
    localStorage.setItem('atendimentoPatientId', patientId);
    window.location.hash = '#atendimento';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let targetPatientId = formData.patientId;
    let targetPatientName = patients.find(p => p.id === formData.patientId)?.name || '';

    // Se for um novo cadastro rápido
    if (isQuickAdd) {
      if (!quickPatient.name) return alert('Nome do paciente é obrigatório');
      const newPId = Date.now().toString();
      const newP: Patient = {
        id: newPId,
        name: quickPatient.name,
        phone: quickPatient.phone,
        cpf: quickPatient.cpf || 'Não Informado',
        email: '', birthDate: '', address: '', history: '',
        createdAt: Date.now()
      };
      await db.save('patients', newP);
      targetPatientId = newPId;
      targetPatientName = newP.name;
    }

    if (!targetPatientId) return alert('Selecione ou cadastre um paciente');

    const app: Appointment = {
      id: Date.now().toString(),
      patientId: targetPatientId,
      patientName: targetPatientName,
      date: formData.date || selectedDate,
      time: formData.time || '08:00',
      procedure: formData.procedure || '',
      status: 'scheduled',
      notes: formData.notes,
      type: 'odontologia'
    };

    await db.save('appointments', app);
    setIsModalOpen(false);
    setIsQuickAdd(false);
    loadData();
    setFormData({ date: selectedDate, time: '08:00', procedure: '', status: 'scheduled' });
    setPatientSearch('');
    setQuickPatient({ name: '', phone: '', cpf: '' });
  };

  const updateStatus = async (app: Appointment, status: Appointment['status']) => {
    await db.save('appointments', { ...app, status });
    loadData();
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) || 
    p.cpf.includes(patientSearch)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Agenda</h2>
          <p className="text-gray-500 font-medium">Controle de horários e produtividade</p>
        </div>
        <div className="flex items-center space-x-4">
           <button 
            onClick={handleSyncWithGoogle}
            disabled={isSyncing}
            className="p-3 bg-white border border-gray-100 rounded-2xl text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
            title="Sincronizar com Google Calendar"
           >
             <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
           </button>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-5 py-3 bg-white border border-gray-100 rounded-2xl font-bold shadow-sm outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" />
          <button onClick={() => { setIsModalOpen(true); setIsQuickAdd(false); }} className="flex items-center space-x-2 bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all transform hover:-translate-y-0.5">
            <Plus size={20} /><span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
        {timeSlots.map(slot => {
          const appointment = appointments.find(a => a.time === slot);
          return (
            <div key={slot} className={`flex flex-col md:flex-row md:items-center p-6 transition-all ${appointment ? 'bg-blue-50/20' : 'hover:bg-gray-50/30'}`}>
              <div className="w-24 shrink-0 text-2xl font-black text-gray-200">{slot}</div>
              <div className="flex-1">
                {appointment ? (
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center space-x-5">
                      <div className="h-12 w-12 bg-white text-blue-600 border-2 border-blue-50 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm">{appointment.patientName.charAt(0)}</div>
                      <div>
                        <h4 className="font-black text-gray-900 text-lg leading-tight">{appointment.patientName}</h4>
                        <p className="text-xs text-blue-500 font-black uppercase tracking-widest">{appointment.procedure} {appointment.googleEventId && '• Synced'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 p-1.5 shadow-sm">
                        <StatusBtn active={appointment.status === 'confirmed'} onClick={() => updateStatus(appointment, 'confirmed')} icon={<ThumbsUp size={16}/>} />
                        <StatusBtn active={appointment.status === 'completed'} onClick={() => updateStatus(appointment, 'completed')} icon={<CheckCircle size={16}/>} />
                        <StatusBtn active={appointment.status === 'missed'} onClick={() => updateStatus(appointment, 'missed')} icon={<XCircle size={16}/>} />
                      </div>
                      <button onClick={() => startAttendance(appointment.patientId)} className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-md hover:bg-blue-700 transition-all">
                        <Stethoscope size={16}/> <span>Atender</span>
                      </button>
                      <button onClick={async () => { if(confirm('Excluir horário?')){ await db.delete('appointments', appointment.id); loadData(); }}} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setFormData({...formData, time: slot}); setIsModalOpen(true); }} className="text-gray-300 hover:text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 transition-colors group">
                    <PlusCircle size={22} className="group-hover:scale-110 transition-transform"/> Reservar Horário
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in">
        <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl animate-in zoom-in duration-300">
          <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-[3rem]">
            <h3 className="text-xl font-black text-gray-900">Agendar Consulta</h3>
            <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900"><X size={24}/></button>
          </div>
          <form onSubmit={handleSave} className="p-8 space-y-6">
            {!isQuickAdd ? (
              <div className="relative">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Buscar Paciente</label>
                <div className="relative">
                  <input type="text" placeholder="Nome ou CPF..." value={patientSearch} onFocus={() => setShowPatientResults(true)} onChange={(e) => { setPatientSearch(e.target.value); setShowPatientResults(true); }} className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold focus:bg-white transition-all outline-none" />
                  <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300" size={20}/>
                </div>
                {showPatientResults && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-52 overflow-y-auto animate-in slide-in-from-top-2">
                    {filteredPatients.map(p => (
                      <button key={p.id} type="button" onClick={() => { setFormData({...formData, patientId: p.id}); setPatientSearch(p.name); setShowPatientResults(false); }} className="w-full text-left p-4 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors flex justify-between items-center">
                        <div>
                          <p className="font-bold text-gray-900">{p.name}</p>
                          <p className="text-[10px] text-gray-400 font-black uppercase">{p.cpf}</p>
                        </div>
                        <User size={16} className="text-blue-400" />
                      </button>
                    ))}
                    {filteredPatients.length === 0 && patientSearch.length > 2 && (
                      <button type="button" onClick={() => { setIsQuickAdd(true); setQuickPatient({...quickPatient, name: patientSearch}); }} className="w-full p-6 text-center text-blue-600 font-black text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                        <UserPlus size={20}/> Paciente não encontrado. Cadastrar "{patientSearch}"?
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 animate-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest">Cadastro Rápido</h4>
                  <button type="button" onClick={() => setIsQuickAdd(false)} className="text-blue-400 hover:text-blue-700 text-[10px] font-black uppercase">Voltar à busca</button>
                </div>
                <div className="space-y-4">
                   <input required placeholder="Nome Completo*" value={quickPatient.name} onChange={e => setQuickPatient({...quickPatient, name: e.target.value})} className="w-full p-4 bg-white border border-blue-100 rounded-xl font-bold outline-none" />
                   <div className="grid grid-cols-2 gap-4">
                     <input placeholder="Telefone" value={quickPatient.phone} onChange={e => setQuickPatient({...quickPatient, phone: e.target.value})} className="w-full p-4 bg-white border border-blue-100 rounded-xl font-bold outline-none" />
                     <input placeholder="CPF" value={quickPatient.cpf} onChange={e => setQuickPatient({...quickPatient, cpf: e.target.value})} className="w-full p-4 bg-white border border-blue-100 rounded-xl font-bold outline-none" />
                   </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Data</label>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none focus:bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Horário</label>
                <select value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none focus:bg-white">
                  {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Procedimento</label>
              <input required placeholder="Ex: Avaliação, Limpeza, Extração..." value={formData.procedure} onChange={e => setFormData({...formData, procedure: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none focus:bg-white" />
            </div>

            <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all transform hover:-translate-y-1">
              Confirmar Agendamento
            </button>
          </form>
        </div>
      </div>}
    </div>
  );
};

const StatusBtn = ({ active, onClick, icon }: any) => (
  <button onClick={onClick} className={`p-2.5 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-300 hover:bg-gray-100 hover:text-gray-600'}`}>{icon}</button>
);

export default Calendar;
