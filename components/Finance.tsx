
import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Plus, Calendar as CalendarIcon, 
  Trash2, X, CreditCard, Landmark, Wallet, User, Save, AlertCircle, 
  Phone, ArrowRight, FileText, CheckCircle, Clock, AlertTriangle, Filter
} from 'lucide-react';
import { db } from '../db';
import { Transaction, Patient, PaymentMethod, Appointment } from '../types';

const Finance: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [debtors, setDebtors] = useState<{patient: Patient, debt: number, lastVisit: string}[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filtros de Mês e Ano
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: 'income', 
    amount: 0, 
    description: '', 
    category: 'Procedimento', 
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'pix',
    installments: 1,
    status: 'paid'
  });

  useEffect(() => {
    loadData();

    const handleHashChange = () => {
      if (window.location.hash === '#finance') {
        loadData();
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const loadData = async () => {
    const allTrans = await db.getAll<Transaction>('transactions');
    const allPatients = await db.getAll<Patient>('patients');
    const allApps = await db.getAll<Appointment>('appointments');

    setTransactions(allTrans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setPatients(allPatients);

    const debtorsList = allPatients.map(p => {
      const debits = allApps
        .filter(a => a.patientId === p.id)
        .reduce((sum, a) => sum + (a.amount || 0), 0);
      
      const credits = allTrans
        .filter(t => t.patientId === p.id && t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const patientApps = allApps.filter(a => a.patientId === p.id).sort((a,b) => b.date.localeCompare(a.date));
      const lastVisit = patientApps.length > 0 ? patientApps[0].date : '';

      return {
        patient: p,
        debt: debits - credits,
        lastVisit
      };
    }).filter(item => item.debt > 0.01)
      .sort((a, b) => b.debt - a.debt);

    setDebtors(debtorsList);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = new Date(t.date + 'T12:00:00'); // Evita problemas de fuso horário
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });
  }, [transactions, selectedMonth, selectedYear]);

  const totals = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (t.type === 'income') acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [filteredTransactions]);

  // Função centralizada de salvamento que aceita um status opcional
  const saveTransaction = async (overrideStatus?: 'paid' | 'pending' | 'overdue') => {
    if (!formData.amount || !formData.description) {
      alert("Por favor, preencha o valor e a descrição.");
      return;
    }
    
    let patientName = '';
    if (formData.patientId) {
      const patient = patients.find(p => p.id === formData.patientId);
      if (patient) patientName = patient.name;
    }

    const t: Transaction = {
      id: Date.now().toString(),
      type: formData.type as 'income' | 'expense',
      amount: Number(formData.amount),
      description: formData.description || '',
      date: formData.date || '',
      category: formData.category || 'Geral',
      patientId: formData.patientId,
      patientName: patientName,
      paymentMethod: formData.paymentMethod as PaymentMethod,
      installments: formData.installments || 1,
      status: overrideStatus || (formData.status as 'paid' | 'pending' | 'overdue') || 'paid'
    };
    
    await db.save('transactions', t);
    setIsModalOpen(false);
    loadData();
    setFormData({
      type: 'income', amount: 0, description: '', category: 'Procedimento', 
      date: new Date().toISOString().split('T')[0], paymentMethod: 'pix', 
      installments: 1, status: 'paid'
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveTransaction();
  };

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Financeiro</h2>
          <p className="text-gray-500">Gestão de fechamento e inadimplência</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center bg-white rounded-2xl border border-gray-200 p-1 shadow-sm">
             <div className="px-3 text-gray-400"><Filter size={16} /></div>
             <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-transparent text-sm font-bold py-2 outline-none border-r border-gray-100 cursor-pointer pr-2">
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
             </select>
             <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-transparent text-sm font-bold py-2 pl-3 pr-2 outline-none cursor-pointer">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all w-full sm:w-auto">
            <Plus size={20} />
            <span className="whitespace-nowrap">Novo Lançamento</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard icon={<TrendingUp size={24} />} title={`Receitas (${months[selectedMonth]})`} value={totals.income} color="text-green-600" bgColor="bg-green-50" />
        <SummaryCard icon={<TrendingDown size={24} />} title={`Despesas (${months[selectedMonth]})`} value={totals.expense} color="text-red-600" bgColor="bg-red-50" />
        <div className="bg-blue-600 p-6 rounded-3xl shadow-xl text-white flex items-center space-x-4">
          <div className="p-4 bg-white/20 rounded-2xl"><DollarSign size={24} /></div>
          <div>
            <p className="text-sm font-bold opacity-80 uppercase">Saldo Mensal</p>
            <h3 className="text-2xl font-black">R$ {(totals.income - totals.expense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
           <h3 className="text-lg font-black text-red-600 flex items-center gap-2"><AlertCircle size={20}/> Devedores</h3>
           <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
             {debtors.length === 0 ? <p className="p-8 text-center text-gray-400 italic text-sm">Nenhuma pendência.</p> : debtors.map((item, idx) => (
               <div key={idx} className="p-5 hover:bg-red-50/30 transition-colors">
                 <div className="flex justify-between items-start">
                   <div>
                     <h4 className="font-bold text-gray-900">{item.patient.name}</h4>
                     <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Última visita: {item.lastVisit ? new Date(item.lastVisit).toLocaleDateString('pt-BR') : 'N/A'}</p>
                   </div>
                   <span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg text-xs font-black">R$ {item.debt.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                 </div>
                 <a href={`https://wa.me/55${item.patient.phone.replace(/\D/g, '')}`} target="_blank" className="mt-3 w-full py-2 bg-green-500 text-white rounded-xl flex items-center justify-center text-xs font-bold gap-2">
                   <Phone size={12}/> Cobrar WhatsApp
                 </a>
               </div>
             ))}
           </div>
        </div>

        <div className="lg:col-span-2">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-4"><FileText size={20} className="text-blue-600"/> Lançamentos do Período</h3>
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Data</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Descrição</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Valor</th>
                  <th className="px-6 py-4 text-center">...</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors text-xs font-bold">
                    <td className="px-6 py-4">{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{t.description}</p>
                      <span className="text-[10px] text-gray-400">{t.patientName || t.category}</span>
                    </td>
                    <td className={`px-6 py-4 font-black ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={async () => { if(confirm('Excluir?')){ await db.delete('transactions', t.id); loadData(); }}} className="text-gray-300 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
        <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in">
          <div className="p-8 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-900">Novo Lançamento</h3>
            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X size={24} /></button>
          </div>
          <form onSubmit={handleFormSubmit} className="p-8 space-y-6">
            <div className="flex bg-gray-100 p-1.5 rounded-2xl">
              <button type="button" onClick={() => setFormData({...formData, type: 'income'})} className={`flex-1 py-3 rounded-xl font-bold transition-all ${formData.type === 'income' ? 'bg-white text-green-600 shadow-md' : 'text-gray-500'}`}>Receita</button>
              <button type="button" onClick={() => setFormData({...formData, type: 'expense'})} className={`flex-1 py-3 rounded-xl font-bold transition-all ${formData.type === 'expense' ? 'bg-white text-red-600 shadow-md' : 'text-gray-500'}`}>Despesa</button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Paciente (Opcional)</label>
                <select value={formData.patientId || ''} onChange={e => setFormData({...formData, patientId: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold">
                  <option value="">Lançamento Avulso</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Valor</label>
                <input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-xl" />
                
                {/* BOTÃO DE CONFIRMAÇÃO RÁPIDA DE PAGAMENTO */}
                <button 
                   type="button" 
                   onClick={() => saveTransaction('paid')}
                   className="w-full mt-2 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-xl text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1 transition-colors"
                >
                   <CheckCircle size={14} /> Confirmar Pagamento
                </button>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Data</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Descrição</label>
                <input required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold" />
              </div>
            </div>
            <button type="submit" className={`w-full py-5 rounded-2xl font-black text-white shadow-xl ${formData.type === 'income' ? 'bg-green-600' : 'bg-blue-600'}`}>Salvar Lançamento</button>
          </form>
        </div>
      </div>}
    </div>
  );
};

const SummaryCard = ({ icon, title, value, color, bgColor }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center space-x-4">
    <div className={`p-4 ${bgColor} rounded-2xl ${color}`}>{icon}</div>
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</p>
      <h3 className={`text-2xl font-black ${color}`}>R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
    </div>
  </div>
);

export default Finance;
