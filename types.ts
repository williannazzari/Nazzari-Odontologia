
export interface Patient {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  birthDate: string;
  address: string;
  history: string;
  createdAt: number;
}

export interface Tooth {
  id: number;
  status: 'healthy' | 'cavity' | 'missing' | 'restored' | 'implant';
  notes?: string;
}

export interface BotoxMuscle {
  name: string;
  units: number;
}

export interface BotoxPoint {
  id: string;
  x: number; // Porcentagem horizontal (0-100)
  y: number; // Porcentagem vertical (0-100)
  units: number;
}

export interface BotoxMap {
  imageUrl: string;
  points: BotoxPoint[];
}

export interface BotoxComparison {
  beforePhoto?: string;
  afterPhoto?: string;
  notes?: string;
}

export interface BotoxRecord {
  muscles: BotoxMuscle[];
  productName: string;
  batchNumber: string;
  dilution: string;
  expiryDate: string;
  totalUnits: number;
  returnDate?: string;
  faceMap?: BotoxMap; // Novo campo para o mapeamento visual
  comparison?: BotoxComparison; // Novo campo para antes e depois
}

export interface Budget {
  items: {
    procedure: string;
    value: number;
  }[];
  total: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string; 
  time: string;
  procedure: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'missed';
  notes?: string;
  amount?: number;
  type: 'odontologia' | 'harmonizacao';
  odontograma?: Tooth[];
  botox?: BotoxRecord;
  budget?: Budget;
  photos?: string[];
  googleEventId?: string;
}

export type PaymentMethod = 'pix' | 'card' | 'check' | 'cash';

export interface Transaction {
  id: string;
  patientId?: string;
  patientName?: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  category: string;
  paymentMethod?: PaymentMethod;
  installments?: number;
  status?: 'paid' | 'pending' | 'overdue';
}

export interface PatientFile {
  id: string;
  patientId: string;
  type: 'photo' | 'rx';
  url: string;
  name: string;
  date: string;
}

export interface ProcedureCatalogItem {
  id: string;
  name: string;
  defaultValue: number;
}

export interface AppSettings {
  clinicName: string;
  dentistName: string;
  driveConnected: boolean;
  lastBackupDate: string | null;
}
