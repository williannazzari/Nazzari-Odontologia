
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, User, Phone, FileText, Trash2, Edit2, X, 
  DollarSign, Clock, ClipboardCheck, AlertCircle, CheckCircle, 
  Stethoscope, Calendar as CalendarIcon, ArrowRight, ExternalLink,
  TrendingUp, TrendingDown, Save, Filter
} from 'lucide-react';
import { db } from '../db';
import { Patient, Transaction, Appointment, PaymentMethod } from '../types';

const PatientList: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para Filtro do Prontuário
  const [recordSearch, setRecordSearch] = useState('');
  const [recordMonth, setRecordMonth] = useState<number | 'all'>('all');
  const [recordYear, setRecordYear] = useState<number | 'all'>('all');
  
  const [editingTransaction, setEditingTransaction] = useState<Partial<Transaction> | null>(null);
  const [formData, setFormData] = useState<Partial<Patient>>({ 
    name: '', cpf: '', phone: '', email: '', birthDate: '', address: '', history: '' 
  });

  useEffect(() => { 
    loadData(); 
    const handleRefresh = () => loadData();
    window.addEventListener('hashchange', handleRefresh);
    return () => window.removeEventListener('hashchange', handleRefresh);
  }, []);

  const loadData = async () => {
    try {
      const ps = await db.getAll<Patient>('patients');
      const tr = await db.getAll<Transaction>('transactions');
      const ap = await db.getAll<Appointment>('appointments');
      setPatients(ps);
      setAllTransactions(tr);
      setAllAppointments(ap);
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    }
  };

  const startAttendance = (patientId: string) => {
    localStorage.setItem('atendimentoPatientId', patientId);
    window.location.hash = '#atendimento';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  const editAppointment = (appId: string) => {
    localStorage.setItem('editAppointmentId', appId);
    window.location.hash = '#atendimento';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  const openRecordModal = (patient: Patient) => {
    setSelectedPatient(patient);
    // Resetar filtros ao abrir
    setRecordSearch('');
    setRecordMonth('all');
    setRecordYear('all');
    setIsRecordModalOpen(true);
  };

  const getPatientFinancials = (patientId: string) => {
    const debits = allAppointments.filter(a => a.patientId === patientId).reduce((sum, a) => sum + (a.amount || 0), 0);
    const credits = allTransactions.filter(t => t.patientId === patientId && t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const transactions = allTransactions.filter(t => t.patientId === patientId).sort((a,b) => b.date.localeCompare(a.date));
    return { balance: credits - debits, debits, credits, transactions };
  };

  // Filtro avançado do prontuário
  const filteredRecords = useMemo(() => {
    if (!selectedPatient) return [];
    
    return allAppointments
      .filter(a => a.patientId === selectedPatient.id)
      .filter(a => {
        const d = new Date(a.date + 'T12:00:00');
        
        // Filtro de Mês
        const matchMonth = recordMonth === 'all' || d.getMonth() === Number(recordMonth);
        
        // Filtro de Ano
        const matchYear = recordYear === 'all' || d.getFullYear() === Number(recordYear);
        
        // Filtro de Texto (Procedimento ou Notas)
        const searchLower = recordSearch.toLowerCase();
        const matchText = !recordSearch || 
          a.procedure.toLowerCase().includes(searchLower) || 
          (a.notes || '').toLowerCase().includes(searchLower);

        return matchMonth && matchYear && matchText;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedPatient, allAppointments, recordMonth, recordYear, recordSearch]);

  const filteredPatients = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return patients.filter(p => p.name.toLowerCase().includes(search) || p.cpf.includes(search))
                   .sort((a, b) => a.name.localeCompare(b.name));
  }, [patients, searchTerm]);

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    await db.save('transactions', editingTransaction);
    setEditingTransaction(null);
    loadData();
  };

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i); // Últimos 5 anos

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Pacientes</h2>
          <p className="text-gray-500 font-medium">Gestão clínica e financeira individual</p>
        </div>
        <button 
          onClick={() => { setFormData({ name: '', cpf: '', phone: '', email: '', birthDate: '', address: '', history: '' }); setIsModalOpen(true); }} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl shadow-xl shadow-blue-900/20 font-black flex items-center gap-2 transition-all transform hover:-translate-y-1"
        >
          <Plus size={20}/> Novo Paciente
        </button>
      </div>

      <div className="relative group">
        <input 
          type="text" 
          placeholder="Buscar por nome ou CPF..." 
          className="w-full pl-14 pr-4 py-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none font-bold transition-all" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={24} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.map(patient => {
          const { balance } = getPatientFinancials(patient.id);
          const hasDebt = balance < -0.01;
          const hasCredit = balance > 0.01;
          return (
            <div key={patient.id} className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-2xl hover:shadow-blue-900/5 transition-all group flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">{patient.name.charAt(0)}</div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => { setFormData(patient); setIsModalOpen(true); }} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Editar Cadastro"><Edit2 size={18}/></button>
                  <button onClick={async () => { if(confirm('Excluir paciente e todo o histórico?')){ await db.delete('patients', patient.id); loadData(); }}} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Excluir"><Trash2 size={18}/></button>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-black text-gray-900 text-lg leading-tight group-hover:text-blue-600 transition-colors">{patient.name}</h3>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{patient.cpf}</p>
                <div className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${hasDebt ? 'bg-red-50 text-red-600' : hasCredit ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                  {hasDebt ? (
                    <><AlertCircle size={12} className="mr-1"/> Pendente: R$ {Math.abs(balance).toLocaleString('pt-BR')}</>
                  ) : hasCredit ? (
                    <><CheckCircle size={12} className="mr-1"/> Saldo Positivo: R$ {Math.abs(balance).toLocaleString('pt-BR')}</>
                  ) : (
                    <><CheckCircle size={12} className="mr-1"/> Em dia</>
                  )}
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-50 flex flex-col gap-2">
                <button onClick={() => startAttendance(patient.id)} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-900/10 transition-all">
                  <Stethoscope size={16}/> Atender Agora
                </button>
                <div className="grid grid-cols-2 gap-2">
                   <button onClick={() => openRecordModal(patient)} className="py-2.5 bg-gray-50 text-gray-600 rounded-xl font-black text-[10px] uppercase hover:bg-gray-100 flex items-center justify-center gap-2 transition-colors">
                      <ClipboardCheck size={14}/> Prontuário
                   </button>
                   <button onClick={() => { setSelectedPatient(patient); setIsFinanceModalOpen(true); }} className="py-2.5 bg-gray-50 text-gray-600 rounded-xl font-black text-[10px] uppercase hover:bg-gray-100 flex items-center justify-center gap-2 transition-colors">
                      <DollarSign size={14}/> Financeiro
                   </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Financeiro Individual */}
      {isFinanceModalOpen && selectedPatient && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[3rem] shadow-2xl flex flex-col animate-in zoom-in duration-300 overflow-hidden">
             <div className="p-8 border-b border-gray-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-5">
                   <div className="h-14 w-14 bg-green-500 text-white rounded-[1.2rem] flex items-center justify-center font-black text-2xl shadow-xl shadow-green-900/20"><DollarSign size={28}/></div>
                   <div>
                      <h3 className="text-2xl font-black text-gray-900 tracking-tight">Extrato: {selectedPatient.name}</h3>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">Situação Financeira do Paciente</p>
                   </div>
                </div>
                <button onClick={() => { setIsFinanceModalOpen(false); setEditingTransaction(null); }} className="p-3 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-full transition-all"><X size={24}/></button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
                {/* Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Procedimentos</p>
                      <h4 className="text-2xl font-black text-red-600">R$ {getPatientFinancials(selectedPatient.id).debits.toLocaleString('pt-BR')}</h4>
                   </div>
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Pago</p>
                      <h4 className="text-2xl font-black text-green-600">R$ {getPatientFinancials(selectedPatient.id).credits.toLocaleString('pt-BR')}</h4>
                   </div>
                   <div className={`p-6 rounded-[2rem] border shadow-sm ${getPatientFinancials(selectedPatient.id).balance < -0.01 ? 'bg-red-600 text-white border-red-600' : 'bg-green-600 text-white border-green-600'}`}>
                      <p className="text-[10px] font-black opacity-80 uppercase tracking-widest mb-1">
                        {getPatientFinancials(selectedPatient.id).balance < -0.01 ? 'Saldo Devedor' : getPatientFinancials(selectedPatient.id).balance > 0.01 ? 'Saldo Positivo' : 'Quitado'}
                      </p>
                      <h4 className="text-2xl font-black">R$ {Math.abs(getPatientFinancials(selectedPatient.id).balance).toLocaleString('pt-BR')}</h4>
                   </div>
                </div>

                {/* Lista de Transações */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                   <table className="w-full text-left">
                      <thead className="bg-gray-50/50 border-b border-gray-100">
                         <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor</th>
                            <th className="px-6 py-4 text-center">Ações</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                         {getPatientFinancials(selectedPatient.id).transactions.length === 0 ? (
                            <tr><td colSpan={4} className="p-10 text-center text-gray-400 italic">Nenhum pagamento registrado.</td></tr>
                         ) : getPatientFinancials(selectedPatient.id).transactions.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                               <td className="px-6 py-4 text-xs font-bold text-gray-500">{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                               <td className="px-6 py-4 text-sm font-black text-gray-900">{t.description}</td>
                               <td className="px-6 py-4 text-sm font-black text-green-600">R$ {t.amount.toLocaleString('pt-BR')}</td>
                               <td className="px-6 py-4">
                                  <div className="flex justify-center gap-2">
                                     <button onClick={() => setEditingTransaction(t)} className="p-2 text-gray-300 hover:text-blue-600 transition-colors"><Edit2 size={16}/></button>
                                     <button onClick={async () => { if(confirm('Excluir este pagamento?')){ await db.delete('transactions', t.id); loadData(); }}} className="p-2 text-gray-300 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                                  </div>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>

                {/* Formulário de Edição de Transação */}
                {editingTransaction && (
                  <div className="mt-8 p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 animate-in slide-in-from-bottom-4">
                     <div className="flex justify-between items-center mb-6">
                        <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest">Editar Pagamento</h4>
                        <button onClick={() => setEditingTransaction(null)} className="text-blue-400 hover:text-blue-900"><X size={20}/></button>
                     </div>
                     <form onSubmit={handleUpdateTransaction} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                           <label className="block text-[10px] font-black text-blue-400 uppercase mb-2 ml-1">Descrição</label>
                           <input value={editingTransaction.description || ''} onChange={e => setEditingTransaction({...editingTransaction, description: e.target.value})} className="w-full p-4 bg-white border border-blue-100 rounded-xl font-bold" />
                        </div>
                        <div>
                           <label className="block text-[10px] font-black text-blue-400 uppercase mb-2 ml-1">Valor (R$)</label>
                           <input type="number" step="0.01" value={editingTransaction.amount || ''} onChange={e => setEditingTransaction({...editingTransaction, amount: Number(e.target.value)})} className="w-full p-4 bg-white border border-blue-100 rounded-xl font-black" />
                        </div>
                        <button type="submit" className="bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                           <Save size={18}/> Salvar Alteração
                        </button>
                     </form>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* Modal de Prontuário Clínico (Com Filtros) */}
      {isRecordModalOpen && selectedPatient && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[3rem] shadow-2xl flex flex-col animate-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 bg-blue-600 text-white rounded-[1.2rem] flex items-center justify-center font-black text-2xl shadow-xl shadow-blue-900/20">{selectedPatient.name.charAt(0)}</div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">{selectedPatient.name}</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Linha do Tempo Clínica</p>
                </div>
              </div>
              <button onClick={() => setIsRecordModalOpen(false)} className="p-3 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-full transition-all"><X size={24}/></button>
            </div>
            
            {/* Barra de Filtros */}
            <div className="px-8 py-4 bg-gray-50/50 border-b border-gray-100 flex flex-col md:flex-row gap-4">
               <div className="flex-1 relative">
                 <input 
                   type="text" 
                   placeholder="Buscar no histórico..." 
                   value={recordSearch}
                   onChange={e => setRecordSearch(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition-colors"
                 />
                 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               </div>
               <div className="flex gap-2">
                 <select 
                   value={recordMonth} 
                   onChange={e => setRecordMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                   className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none cursor-pointer focus:border-blue-500"
                 >
                   <option value="all">Todo o ano</option>
                   {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                 </select>
                 <select 
                   value={recordYear} 
                   onChange={e => setRecordYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                   className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none cursor-pointer focus:border-blue-500"
                 >
                   <option value="all">Todo histórico</option>
                   {years.map((y) => <option key={y} value={y}>{y}</option>)}
                 </select>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 bg-gray-50/30">
              <div className="max-w-2xl mx-auto space-y-10">
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-24">
                    <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Clock size={40} className="text-gray-300" />
                    </div>
                    <p className="text-gray-400 font-black text-lg uppercase tracking-widest">
                       {allAppointments.some(a => a.patientId === selectedPatient.id) 
                         ? 'Nenhum registro encontrado com estes filtros' 
                         : 'Nenhum registro'
                       }
                    </p>
                    {allAppointments.filter(a => a.patientId === selectedPatient.id).length === 0 && (
                      <button onClick={() => startAttendance(selectedPatient.id)} className="mt-6 text-blue-600 font-black text-sm hover:underline">Iniciar primeiro atendimento</button>
                    )}
                  </div>
                ) : (
                  filteredRecords.map((app, idx) => (
                    <div key={app.id} className="relative pl-12 border-l-4 border-blue-100 pb-10 last:border-l-transparent last:pb-0 animate-in slide-in-from-bottom-2">
                      <div className="absolute left-[-14px] top-0 h-6 w-6 rounded-full bg-blue-600 border-4 border-white shadow-lg"></div>
                      
                      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group/card">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">{new Date(app.date).toLocaleDateString('pt-BR', { dateStyle: 'long' })}</span>
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">{app.time}</span>
                            </div>
                            <h4 className="text-xl font-black text-gray-900 group-hover/card:text-blue-600 transition-colors">{app.procedure}</h4>
                          </div>
                          <button 
                            onClick={() => editAppointment(app.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                          >
                            <Edit2 size={12} />
                            <span>Editar Prontuário</span>
                          </button>
                        </div>

                        {app.notes && (
                          <div className="relative">
                            <FileText size={40} className="absolute -right-2 -top-2 text-gray-50 opacity-50" />
                            <p className="text-sm text-gray-600 leading-relaxed font-medium bg-gray-50/50 p-6 rounded-2xl border border-gray-100 italic relative z-10">
                              "{app.notes}"
                            </p>
                          </div>
                        )}

                        <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between text-[10px] font-black uppercase text-gray-400 tracking-widest">
                           <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500"/> {app.status}</span>
                              {app.amount && <span className="flex items-center gap-1 text-gray-900"><DollarSign size={12} className="text-blue-500"/> R$ {app.amount.toLocaleString('pt-BR')}</span>}
                           </div>
                           <button onClick={() => startAttendance(selectedPatient.id)} className="text-blue-600 hover:underline flex items-center gap-1">
                             Novo deste <ArrowRight size={10}/>
                           </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro (Edit/New) */}
      {isModalOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
        <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-300">
          <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-[2.5rem]">
            <h3 className="text-xl font-black text-gray-900">{formData.id ? 'Editar Paciente' : 'Novo Paciente'}</h3>
            <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900"><X size={24}/></button>
          </div>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const p = { id: formData.id || Date.now().toString(), ...formData, createdAt: Date.now() };
            await db.save('patients', p);
            setIsModalOpen(false);
            loadData();
          }} className="p-8 space-y-5">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Nome Completo</label>
              <input required placeholder="Nome..." value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:bg-white focus:border-blue-500 transition-all outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">CPF</label>
                <input required placeholder="000.000.000-00" value={formData.cpf || ''} onChange={e => setFormData({...formData, cpf: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:bg-white focus:border-blue-500 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Celular / WhatsApp</label>
                <input placeholder="(00) 00000-0000" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:bg-white focus:border-blue-500 transition-all outline-none" />
              </div>
            </div>
            <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all transform hover:-translate-y-1">Salvar Cadastro</button>
          </form>
        </div>
      </div>}
    </div>
  );
};

export default PatientList;
