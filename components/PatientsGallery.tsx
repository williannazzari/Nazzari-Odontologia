
import React, { useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, Upload, Trash2, Search, User } from 'lucide-react';
import { db } from '../db';
import { Patient, PatientFile } from '../types';

const PatientsGallery: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'photo' | 'rx'>('all');

  useEffect(() => {
    loadPatients();

    const handleHashChange = () => {
      if (window.location.hash === '#gallery') {
        loadPatients();
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      loadFiles();
    } else {
      setFiles([]);
    }
  }, [selectedPatientId]);

  const loadPatients = async () => {
    const all = await db.getAll<Patient>('patients');
    const sorted = all.sort((a, b) => a.name.localeCompare(b.name));
    setPatients(sorted);
    if (sorted.length > 0 && !selectedPatientId) setSelectedPatientId(sorted[0].id);
  };

  const loadFiles = async () => {
    const allFiles = await db.getAll<PatientFile>('files');
    setFiles(allFiles.filter(f => f.patientId === selectedPatientId));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'rx') => {
    const file = e.target.files?.[0];
    if (!file || !selectedPatientId) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const newFile: PatientFile = {
        id: Date.now().toString(),
        patientId: selectedPatientId,
        type: type,
        url: base64String,
        name: file.name,
        date: new Date().toISOString().split('T')[0]
      };
      await db.save('files', newFile);
      loadFiles();
    };
    reader.readAsDataURL(file);
  };

  const filteredFiles = files.filter(f => filterType === 'all' || f.type === filterType);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Galeria de Imagens & RX</h2>
          <p className="text-gray-500">Prontuário visual do paciente</p>
        </div>
        <div className="w-full md:w-80">
          <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Selecionar Paciente</label>
          <select 
            value={selectedPatientId} 
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-900"
          >
            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex space-x-4 border-b border-gray-200">
        <button 
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 font-bold text-sm transition-all border-b-2 ${filterType === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >Todos</button>
        <button 
          onClick={() => setFilterType('photo')}
          className={`px-4 py-2 font-bold text-sm transition-all border-b-2 ${filterType === 'photo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >Fotos Clínicas</button>
        <button 
          onClick={() => setFilterType('rx')}
          className={`px-4 py-2 font-bold text-sm transition-all border-b-2 ${filterType === 'rx' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >Radiografias (RX)</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Upload Buttons */}
        <div className="aspect-square rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center p-6 text-center space-y-4 hover:border-blue-400 hover:bg-blue-50 transition-all group relative overflow-hidden">
          <Upload className="text-gray-400 group-hover:text-blue-500 transition-colors" size={32} />
          <div>
            <p className="font-bold text-gray-700">Nova Imagem</p>
            <p className="text-xs text-gray-400">Arraste ou clique aqui</p>
          </div>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => handleFileUpload(e, filterType === 'rx' ? 'rx' : 'photo')}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>

        {filteredFiles.map(file => (
          <div key={file.id} className="group relative aspect-square rounded-3xl overflow-hidden bg-white shadow-sm border border-gray-100 hover:shadow-xl transition-all">
            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
              <p className="text-white font-bold text-sm truncate">{file.name}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-gray-300 font-bold uppercase">{file.date}</span>
                <button 
                  onClick={async () => { if(confirm('Excluir imagem?')) { await db.delete('files', file.id); loadFiles(); }}}
                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {file.type === 'rx' && (
              <div className="absolute top-3 left-3 px-2 py-1 bg-blue-600 text-white text-[10px] font-black rounded uppercase">RX</div>
            )}
          </div>
        ))}
      </div>

      {filteredFiles.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border border-gray-100">
          <ImageIcon size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 font-medium">Nenhuma imagem encontrada para este filtro.</p>
        </div>
      )}
    </div>
  );
};

export default PatientsGallery;
