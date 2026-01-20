
import React, { useEffect, useState, useMemo } from 'react';
import { 
  Users, Calendar, TrendingUp, Stethoscope, PlusCircle, 
  DollarSign, AlertCircle, Clock, ChevronRight, MessageSquare,
  StickyNote, CheckSquare, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { db } from '../db';
import { Patient, Appointment, Transaction } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    patients: 0,
    appointmentsToday: 0,
    todayIncome: 0,
    totalDebt: 0,
    monthlyIncome: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [recentNotes, setRecentNotes] = useState<Appointment[]>([]);
  const [nextPatient, setNextPatient] = useState<Appointment | null>(null);
  const [clinicNote, setClinicNote] = useState(localStorage.getItem('clinicNote') || '');

  useEffect(() => {
    const loadData = async () => {
      const ps = await db.getAll<Patient>('patients');
      const apps = await db.getAll<Appointment>('appointments');
      const trans = await db.getAll<Transaction>('transactions');
      
      const today = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      const todayApps = apps.filter(a => a.date === today);
      const todayIncome = trans
        .filter(t => t.date === today && t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      const monthlyIncome = trans
        .filter(t => {
          const d = new Date(t.date + 'T12:00:00');
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear && t.type === 'income';
        })
        .reduce((sum, t) => sum + t.amount, 0);

      // Cálculo de Inadimplência Total
      const debits = apps.reduce((sum, a) => sum + (a.amount || 0), 0);
      const credits = trans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const totalDebt = debits - credits;

      setStats({
        patients: ps.length,
        appointmentsToday: todayApps.length,
        todayIncome,
        totalDebt: totalDebt > 0 ? totalDebt : 0,
        monthlyIncome,
      });

      // Próximo paciente (hoje, horário futuro mais próximo)
      const upcoming = todayApps
        .filter(a => a.status === 'scheduled' || a.status === 'confirmed')
        .sort((a, b) => a.time.localeCompare(b.time))
        .find(a => a.time >= nowTime);
      
      setNextPatient(upcoming || null);

      // Evoluções recentes (últimos atendimentos com notas)
      setRecentNotes(apps.filter(a => a.notes).slice(-4).reverse());
      setRecentAppointments(apps.slice(-6).reverse());
    };
    loadData();
    
    // Refresh a cada minuto para atualizar "Próximo Paciente"
    const timer = setInterval(loadData, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleNoteChange = (val: string) => {
    setClinicNote(val);
    localStorage.setItem('clinicNote', val);
  };

  const chartData = useMemo(() => [
    { name: 'Meta', valor: 15000 },
    { name: 'Realizado', valor: stats.monthlyIncome },
  ], [stats.monthlyIncome]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Bem-vindo, Dr. Nazzari</h2>
          <div className="flex items-center gap-2 text-gray-500 font-medium mt-1">
            <Calendar size={16} className="text-blue-500"/>
            <span>{new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => window.location.hash = '#calendar'}
             className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-blue-600 hover:shadow-md transition-all"
           >
             <Calendar size={20}/>
           </button>
           <button 
             onClick={() => { 
                localStorage.setItem('resetAtendimento', 'true');
                window.location.hash = '#atendimento'; 
             }}
             className="bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-black shadow-xl shadow-blue-900/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
           >
             <PlusCircle size={20}/> Atendimento Rápido
           </button>
        </div>
      </div>

      {/* Grid de Métricas de Destaque */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          icon={<DollarSign size={20}/>} 
          label="Receita Hoje" 
          value={`R$ ${stats.todayIncome.toLocaleString('pt-BR')}`} 
          color="bg-green-500" 
          detail={`${stats.appointmentsToday} consultas hoje`}
        />
        <MetricCard 
          icon={<AlertCircle size={20}/>} 
          label="Inadimplência" 
          value={`R$ ${stats.totalDebt.toLocaleString('pt-BR')}`} 
          color="bg-red-500" 
          detail="Total a receber"
        />
        <MetricCard 
          icon={<TrendingUp size={20}/>} 
          label="Faturamento Mês" 
          value={`R$ ${stats.monthlyIncome.toLocaleString('pt-BR')}`} 
          color="bg-blue-600" 
          detail="Acumulado mensal"
        />
        <MetricCard 
          icon={<Users size={20}/>} 
          label="Base Pacientes" 
          value={stats.patients.toString()} 
          color="bg-purple-600" 
          detail="Cadastros ativos"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna 1: Próximo Paciente e Lembretes */}
        <div className="space-y-8">
          {/* Card Próximo Paciente */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
              <Clock size={120} />
            </div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Clock size={14} className="text-blue-500"/> Próximo Paciente
            </h3>
            {nextPatient ? (
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">
                    {nextPatient.patientName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-gray-900 leading-tight">{nextPatient.patientName}</h4>
                    <p className="text-sm font-bold text-blue-500 mt-0.5">{nextPatient.time} • {nextPatient.procedure}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    localStorage.setItem('atendimentoPatientId', nextPatient.patientId);
                    window.location.hash = '#atendimento';
                  }}
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all"
                >
                  Iniciar Agora <ChevronRight size={16}/>
                </button>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-gray-400 font-bold italic">Sem mais agendamentos para hoje.</p>
              </div>
            )}
          </div>

          {/* Card Bloco de Notas */}
          <div className="bg-yellow-50 p-8 rounded-[2.5rem] border border-yellow-100 shadow-sm">
            <h3 className="text-xs font-black text-yellow-700 uppercase tracking-widest mb-4 flex items-center gap-2">
              <StickyNote size={14}/> Notas da Clínica
            </h3>
            <textarea 
              value={clinicNote}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="Digite lembretes importantes aqui..."
              className="w-full h-40 bg-transparent border-none resize-none font-medium text-yellow-900 placeholder-yellow-300 focus:ring-0 text-sm leading-relaxed"
            />
            <p className="text-[10px] text-yellow-400 font-bold uppercase mt-2">Salvo automaticamente</p>
          </div>
        </div>

        {/* Coluna 2: Evoluções Recentes e Desempenho */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Gráfico de Meta */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Meta vs Realizado (Mês)</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: -20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" hide />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)'}} />
                    <Bar dataKey="valor" radius={[0, 12, 12, 0]} barSize={32}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#f1f5f9' : '#2563eb'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between items-end mt-4">
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Progresso</p>
                    <p className="text-xl font-black text-gray-900">{Math.round((stats.monthlyIncome / 15000) * 100)}%</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Meta Sugerida</p>
                    <p className="text-sm font-bold text-gray-400">R$ 15.000,00</p>
                 </div>
              </div>
            </div>

            {/* Ações Rápidas de Fluxo */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Atalhos de Fluxo</h3>
              <div className="space-y-3">
                <QuickAction icon={<Users className="text-blue-500"/>} label="Cadastrar Paciente" onClick={() => window.location.hash = '#patients'} />
                <QuickAction icon={<Calendar className="text-purple-500"/>} label="Ver Agenda Completa" onClick={() => window.location.hash = '#calendar'} />
                <QuickAction icon={<DollarSign className="text-green-500"/>} label="Lançar Despesa" onClick={() => window.location.hash = '#finance'} />
              </div>
            </div>
          </div>

          {/* Feed de Evoluções Clínicas */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center justify-between">
              <span>Evoluções Recentes</span>
              <button onClick={() => window.location.hash = '#patients'} className="text-blue-600 hover:underline">Ver todos</button>
            </h3>
            <div className="space-y-6">
              {recentNotes.length === 0 ? (
                <p className="text-center py-10 text-gray-400 italic">Nenhuma evolução registrada recentemente.</p>
              ) : recentNotes.map(app => (
                <div key={app.id} className="flex gap-4 group cursor-pointer" onClick={() => {
                   localStorage.setItem('editAppointmentId', app.id);
                   window.location.hash = '#atendimento';
                }}>
                  <div className="shrink-0 h-10 w-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center font-bold text-sm group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                    {app.patientName.charAt(0)}
                  </div>
                  <div className="flex-1 border-b border-gray-50 pb-4 last:border-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-black text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{app.patientName}</h4>
                      <span className="text-[10px] font-black text-gray-300 uppercase">{new Date(app.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 italic leading-relaxed">
                      "{app.notes}"
                    </p>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-2">{app.procedure}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value, color, detail }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-lg transition-all transform hover:-translate-y-1">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2.5 ${color} text-white rounded-xl shadow-lg`}>{icon}</div>
      <div className="h-1.5 w-1.5 bg-gray-200 rounded-full"></div>
    </div>
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <h4 className="text-xl font-black text-gray-900 mb-1">{value}</h4>
      <p className="text-[10px] font-bold text-gray-300 uppercase">{detail}</p>
    </div>
  </div>
);

const QuickAction = ({ icon, label, onClick }: any) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100 rounded-2xl transition-all group"
  >
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-sm font-black text-gray-700">{label}</span>
    </div>
    <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
  </button>
);

export default Dashboard;
