import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, Ticket, Clock, ShieldCheck, Search, Plus, 
  Settings, CheckCircle, XCircle, CreditCard, ChevronLeft, 
  ChevronRight, Upload, X, LogIn, Users, BarChart3, AlertCircle, Trophy
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, updateDoc, addDoc, deleteDoc, query, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// --- FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyD0qeyrE-H_k1GBF1mZFuQbq7WWBrbFdFo",
  authDomain: "rifa-buena.firebaseapp.com",
  projectId: "rifa-buena",
  storageBucket: "rifa-buena.firebasestorage.app",
  messagingSenderId: "891021662021",
  appId: "1:891021662021:web:90e77331cef20e96ea502c",
  measurementId: "G-HNX7VNVD62"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const appId = 'default-rifas-app';

const getColPath = (colName) => `artifacts/${appId}/public/data/${colName}`;

// Default Configuration (Dark Theme)
const DEFAULT_CONFIG = {
  businessName: 'LUXTIME RIFAS',
  logoText: 'LR',
  contactPhone: '+52 123 456 7890',
  contactEmail: 'contacto@luxtimerifas.com',
  bankDetails: 'Banco: BBVA\nTitular: Juan Pérez\nCuenta: 1234567890\nCLABE: 012345678901234567',
  promoText: 'Compra 10 boletos y recibe 1 completamente GRATIS.',
  successMessage: 'Tu comprobante fue recibido correctamente. Nuestro equipo validará tu pago lo antes posible.'
};

// --- GLOBAL STATE MANAGEMENT ---
const useAppData = () => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [raffles, setRaffles] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAdmin(!!u?.email); 
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubConfig = onSnapshot(doc(db, getColPath('config'), 'main'), (docSnap) => {
      if (docSnap.exists()) setConfig(docSnap.data());
      else setDoc(doc(db, getColPath('config'), 'main'), DEFAULT_CONFIG);
    });

    const unsubRaffles = onSnapshot(collection(db, getColPath('raffles')), (snapshot) => {
      const r = [];
      snapshot.forEach(doc => r.push({ id: doc.id, ...doc.data() }));
      setRaffles(r.sort((a, b) => b.createdAt - a.createdAt));
    });

    const unsubPurchases = onSnapshot(collection(db, getColPath('purchases')), (snapshot) => {
      const p = [];
      snapshot.forEach(doc => p.push({ id: doc.id, ...doc.data() }));
      setPurchases(p.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });

    return () => { unsubConfig(); unsubRaffles(); unsubPurchases(); };
  }, [user]);

  return { user, isAdmin, config, raffles, purchases, loading };
};

// --- DARK THEME UI COMPONENTS ---
const Card = ({ children, className = '' }) => (
  <div className={`bg-[#151515] border border-gray-800 shadow-2xl rounded-2xl overflow-hidden ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }) => {
  const baseStyle = "font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-sm";
  const variants = {
    primary: "bg-[#f59e0b] text-black hover:bg-[#d97706] px-6 py-3 shadow-lg shadow-amber-900/20 font-bold",
    secondary: "bg-[#222] text-white hover:bg-[#333] border border-gray-700 px-6 py-3",
    danger: "bg-red-600 text-white hover:bg-red-700 px-6 py-3",
    outline: "border border-[#f59e0b] text-[#f59e0b] hover:bg-[#f59e0b]/10 px-6 py-3"
  };
  return (
    <motion.button 
      whileTap={{ scale: disabled ? 1 : 0.97 }} 
      type={type} onClick={onClick} disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
};

const Input = ({ label, type = 'text', value, onChange, placeholder, required, multiline = false, className = '' }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    {label && <label className="text-sm font-medium text-gray-400 ml-1">{label}</label>}
    {multiline ? (
      <textarea 
        value={value} onChange={onChange} placeholder={placeholder} required={required}
        className="bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-[#f59e0b] focus:border-[#f59e0b] transition-all min-h-[100px] resize-y text-white placeholder-gray-600"
      />
    ) : (
      <input 
        type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        className="bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-[#f59e0b] focus:border-[#f59e0b] transition-all text-white placeholder-gray-600"
      />
    )}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-lg z-10">
          <Card className="p-6 max-h-[90vh] overflow-y-auto border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-800 transition-colors"><X size={20} className="text-gray-400" /></button>
            </div>
            {children}
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// --- HELPER FUNCTIONS ---
const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
const padNumber = (num) => num.toString().padStart(2, '0');

const Carousel = ({ images }) => {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!images || images.length <= 1) return;
    const timer = setInterval(() => setCurrent(c => (c + 1) % images.length), 4000);
    return () => clearInterval(timer);
  }, [images]);

  if (!images || images.length === 0) return <div className="w-full h-64 bg-gray-800 rounded-2xl animate-pulse" />;

  return (
    <div className="relative w-full h-[300px] md:h-[450px] rounded-2xl overflow-hidden group border border-gray-800 shadow-xl">
      <AnimatePresence initial={false} mode="wait">
        <motion.img
          key={current}
          src={images[current]}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full object-cover"
          alt="Rifa"
        />
      </AnimatePresence>
      {images.length > 1 && (
        <>
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 z-10">
            {images.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-[#f59e0b] w-4' : 'bg-white/50'}`} />
            ))}
          </div>
          <button onClick={() => setCurrent(c => (c - 1 + images.length) % images.length)} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft size={24} /></button>
          <button onClick={() => setCurrent(c => (c + 1) % images.length)} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight size={24} /></button>
        </>
      )}
    </div>
  );
};

const CountdownTimer = ({ endDate, onEnd }) => {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, ended: false });

  useEffect(() => {
    const calc = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const diff = end - now;
      if (diff <= 0) {
        if (!timeLeft.ended && onEnd) onEnd();
        return { d: 0, h: 0, m: 0, s: 0, ended: true };
      }
      return {
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((diff % (1000 * 60)) / 1000),
        ended: false
      };
    };
    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [endDate, onEnd, timeLeft.ended]);

  if (timeLeft.ended) return <div className="text-red-500 font-semibold flex items-center gap-2"><AlertCircle size={18}/> Rifa Finalizada</div>;

  return (
    <div className="flex gap-4">
      {Object.entries({ Días: timeLeft.d, Horas: timeLeft.h, Min: timeLeft.m, Seg: timeLeft.s }).map(([label, val]) => (
        <div key={label} className="flex flex-col items-center">
          <div className="bg-[#1a1a1a] border border-gray-800 shadow-inner rounded-xl w-14 h-14 flex items-center justify-center text-xl font-bold text-white">
            {padNumber(val)}
          </div>
          <span className="text-[10px] text-[#f59e0b] uppercase tracking-widest mt-2 font-semibold">{label}</span>
        </div>
      ))}
    </div>
  );
};

// --- PUBLIC VIEWS ---

const Header = ({ config, navigate, currentRoute, isAdmin }) => {
  const navItems = [
    { id: 'home', label: 'RIFA ACTUAL' },
    { id: 'past', label: 'HISTORIAL' },
    { id: 'mytickets', label: 'MIS BOLETOS' },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-gray-900 transition-all">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('home')}>
          <Trophy className="text-[#f59e0b]" size={32} strokeWidth={2} />
          <span className="font-bold text-2xl tracking-widest text-white hidden sm:block">
            {config.businessName.split(' ')[0]} <span className="text-[#f59e0b] font-normal">{config.businessName.split(' ')[1] || 'RIFAS'}</span>
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          {navItems.map(item => (
            <button key={item.id} onClick={() => navigate(item.id)} className={`text-xs font-bold tracking-widest transition-colors ${currentRoute === item.id ? 'text-[#f59e0b]' : 'text-gray-400 hover:text-white'}`}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex gap-4 items-center">
           {isAdmin ? (
             <Button variant="secondary" className="!py-2 !px-4 text-xs tracking-widest" onClick={() => navigate('admin')}>Panel</Button>
           ) : (
             <button onClick={() => navigate('adminLogin')} className="text-gray-600 hover:text-gray-300 transition-colors text-xs tracking-widest font-bold flex items-center gap-1">
               Admin Login
             </button>
           )}
        </div>
      </div>
    </nav>
  );
};

const HomeView = ({ raffles, navigate, config }) => {
  const activeRaffles = raffles.filter(r => r.status === 'active');
  const mainRaffle = activeRaffles[0];

  return (
    <div className="space-y-16 py-12">
      {mainRaffle ? (
        <section className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] rounded-full text-xs font-bold tracking-widest uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f59e0b] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f59e0b]"></span>
              </span>
              Rifa Principal Activa
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
              {mainRaffle.title}
            </h1>
            <p className="text-lg text-gray-400 leading-relaxed max-w-lg font-light">
              {mainRaffle.description}
            </p>
            
            <div>
               <p className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-widest">Termina en</p>
               <CountdownTimer endDate={mainRaffle.endDate} />
            </div>

            <div className="p-5 bg-[#1a1a1a] border border-gray-800 rounded-2xl flex items-start gap-4 max-w-md shadow-lg">
               <div className="p-2 bg-yellow-900/30 rounded-lg text-yellow-500"><AlertCircle size={24}/></div>
               <div>
                  <h4 className="font-bold text-white tracking-wide">Promoción Especial</h4>
                  <p className="text-sm text-gray-400 mt-1">{config.promoText}</p>
               </div>
            </div>

            <div className="flex items-center gap-6 pt-4">
              <Button onClick={() => navigate('raffle', { id: mainRaffle.id })} className="text-base px-8 py-4 w-full md:w-auto">
                Participar — {formatCurrency(mainRaffle.price)}
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#f59e0b]/20 to-transparent rounded-full blur-3xl -z-10 transform scale-90 translate-y-10" />
            <Carousel images={mainRaffle.images} />
          </div>
        </section>
      ) : (
        <div className="max-w-7xl mx-auto px-6 text-center py-32">
          <Trophy className="mx-auto text-gray-700 mb-6" size={64} />
          <h2 className="text-3xl font-bold text-white tracking-widest uppercase">No hay rifas activas</h2>
          <p className="text-gray-500 mt-2">Mantente atento a nuestras próximas dinámicas.</p>
        </div>
      )}

      {activeRaffles.length > 1 && (
        <section className="max-w-7xl mx-auto px-6 pb-20">
          <h3 className="text-2xl font-bold mb-8 tracking-widest uppercase text-white">Otras dinámicas</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {activeRaffles.slice(1).map(raffle => (
              <Card key={raffle.id} className="cursor-pointer group hover:border-[#f59e0b]/50 transition-colors" >
                <div onClick={() => navigate('raffle', { id: raffle.id })}>
                  <div className="h-48 overflow-hidden">
                    <img src={raffle.images?.[0]} alt={raffle.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                  <div className="p-6">
                    <h4 className="text-xl font-bold mb-2 text-white">{raffle.title}</h4>
                    <p className="text-gray-400 text-sm line-clamp-2 mb-4 font-light">{raffle.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#f59e0b] text-lg">{formatCurrency(raffle.price)}</span>
                      <Button variant="outline" className="!py-1.5 !px-4 text-xs">Ver Detalles</Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const TicketGrid = ({ ticketsStatus, selectedTickets, toggleTicket }) => {
  const grid = Array.from({ length: 100 }, (_, i) => padNumber(i));

  return (
    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 md:gap-3">
      {grid.map(num => {
        const status = ticketsStatus[num] || 'AVAILABLE';
        const isSelected = selectedTickets.includes(num);
        
        // Dark Theme Colors for Tickets
        let styleClass = "bg-[#1a1a1a] text-gray-300 border-gray-700 hover:border-[#f59e0b] hover:text-white"; // AVAILABLE
        
        if (status === 'PENDING') styleClass = "bg-orange-950/40 text-orange-600 border-orange-900/50 cursor-not-allowed opacity-70";
        if (status === 'APPROVED') styleClass = "bg-red-950/40 text-red-600 border-red-900/50 cursor-not-allowed opacity-70";
        if (isSelected) styleClass = "bg-[#f59e0b] text-black border-[#f59e0b] shadow-lg shadow-amber-900/30 transform scale-105 font-extrabold";

        return (
          <button
            key={num}
            disabled={status !== 'AVAILABLE'}
            onClick={() => toggleTicket(num)}
            className={`w-full aspect-square rounded-xl flex items-center justify-center font-bold text-lg md:text-xl border transition-all duration-200 ${styleClass}`}
          >
            {num}
          </button>
        );
      })}
    </div>
  );
};

const RaffleDetailView = ({ raffleId, raffles, purchases, config, navigate }) => {
  const raffle = raffles.find(r => r.id === raffleId);
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [proofFile, setProofFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const ticketsStatus = useMemo(() => {
    const statusMap = {};
    if (!raffle) return statusMap;
    const rafflePurchases = purchases.filter(p => p.raffleId === raffleId);
    rafflePurchases.forEach(p => {
      p.tickets.forEach(t => {
        if (statusMap[t] !== 'APPROVED') {
          statusMap[t] = p.status;
        }
      });
    });
    return statusMap;
  }, [purchases, raffleId, raffle]);

  if (!raffle) return <div className="text-center py-20 text-white">Rifa no encontrada</div>;

  const toggleTicket = (num) => {
    if (selectedTickets.includes(num)) {
      setSelectedTickets(prev => prev.filter(t => t !== num));
    } else {
      setSelectedTickets(prev => [...prev, num].sort());
    }
  };

  const applyPromo = () => {
    const availableTickets = Array.from({ length: 100 }, (_, i) => padNumber(i))
      .filter(t => !ticketsStatus[t] && !selectedTickets.includes(t));
    
    if (availableTickets.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableTickets.length);
      const freeTicket = availableTickets[randomIndex];
      setSelectedTickets(prev => [...prev, freeTicket].sort());
    }
  };

  const freeTicketsEarned = Math.floor(selectedTickets.length / 11);
  const ticketsToPay = selectedTickets.length - freeTicketsEarned;
  const total = ticketsToPay * raffle.price;

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (selectedTickets.length === 0) return;
    setIsSubmitting(true);

    try {
      let proofUrl = '';
      if (proofFile) {
        try {
          const storageRef = ref(storage, `proofs/${Date.now()}_${proofFile.name}`);
          await uploadBytes(storageRef, proofFile);
          proofUrl = await getDownloadURL(storageRef);
        } catch (uploadError) {
          console.warn("Storage upload failed, fallback", uploadError);
          proofUrl = 'https://via.placeholder.com/400x600.png?text=Comprobante+Recibido';
        }
      }

      const purchaseData = {
        raffleId,
        raffleTitle: raffle.title,
        user: formData,
        tickets: selectedTickets,
        status: 'PENDING',
        proofUrl,
        total,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, getColPath('purchases')), purchaseData);
      console.log(`[EMAIL] To Admin: New purchase from ${formData.name}`);
      setIsSubmitting(false);
      navigate('success');
    } catch (error) {
      console.error("Purchase error", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pb-32">
      <div className="flex flex-col md:flex-row gap-12">
        {/* Left: Info */}
        <div className="md:w-1/3 space-y-6">
          <Button variant="secondary" onClick={() => navigate('home')} className="!p-2 !w-12 !h-12 rounded-full mb-4 border-none">
            <ChevronLeft />
          </Button>
          <Carousel images={raffle.images} />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-3 text-white">{raffle.title}</h1>
            <p className="text-gray-400 mb-6 font-light">{raffle.description}</p>
            <div className="flex items-center gap-3 bg-[#151515] p-5 rounded-2xl border border-gray-800">
               <Clock className="text-gray-500" />
               <CountdownTimer endDate={raffle.endDate} />
            </div>
          </div>
          
          <Card className="p-6 bg-gradient-to-br from-[#1a1a1a] to-[#222] border-[#f59e0b]/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-[#f59e0b]"><Trophy size={64}/></div>
            <h3 className="font-bold text-[#f59e0b] mb-2 flex items-center gap-2">
              <CheckCircle size={18}/> PROMOCIÓN
            </h3>
            <p className="text-sm text-gray-300 font-light">{config.promoText}</p>
            {selectedTickets.length >= 10 && selectedTickets.length % 11 === 10 && (
               <Button onClick={applyPromo} className="w-full mt-5 !py-3 text-xs shadow-[#f59e0b]/20 animate-pulse">
                 ¡Reclamar Boleto Gratis!
               </Button>
            )}
          </Card>

          <Card className="p-6 border-gray-800">
             <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400 text-sm uppercase tracking-widest font-bold">Boletos:</span>
                <span className="font-bold text-2xl text-white">{selectedTickets.length}</span>
             </div>
             <div className="flex flex-wrap gap-2 mb-6">
                {selectedTickets.map(t => <span key={t} className="bg-[#f59e0b] text-black px-2.5 py-1 rounded text-sm font-bold shadow-sm">{t}</span>)}
             </div>
             <div className="pt-5 border-t border-gray-800 flex justify-between items-center mb-8">
                <span className="text-gray-400 text-sm uppercase tracking-widest font-bold">Total:</span>
                <span className="font-extrabold text-3xl text-[#f59e0b]">{formatCurrency(total)}</span>
             </div>
             <Button 
               onClick={() => setShowPurchaseForm(true)} 
               disabled={selectedTickets.length === 0} 
               className="w-full py-4 text-base"
             >
               Confirmar Selección
             </Button>
          </Card>
        </div>

        {/* Right: Grid */}
        <div className="md:w-2/3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
             <div>
               <h2 className="text-2xl font-bold tracking-widest uppercase text-white">Selecciona tus números</h2>
               <p className="text-gray-400 mt-1 font-light">Haz clic en los números disponibles para participar.</p>
             </div>
             <div className="flex gap-4 text-xs font-bold tracking-wider text-gray-500 uppercase">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-600"></span> Libre</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-600"></span> Espera</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-600"></span> Pagado</div>
             </div>
          </div>
          <Card className="p-6 md:p-8 bg-[#111] border-gray-800">
            <TicketGrid ticketsStatus={ticketsStatus} selectedTickets={selectedTickets} toggleTicket={toggleTicket} />
          </Card>
        </div>
      </div>

      {/* Purchase Modal */}
      <Modal isOpen={showPurchaseForm} onClose={() => setShowPurchaseForm(false)} title="Finalizar Compra">
        <form onSubmit={handlePurchase} className="space-y-6">
          <div className="space-y-4">
            <Input label="NOMBRE COMPLETO" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej. Juan Pérez" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="CORREO" type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="juan@email.com" />
              <Input label="WHATSAPP" type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="55 1234 5678" />
            </div>
          </div>

          <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#f59e0b]/30 space-y-3">
            <h4 className="font-bold text-[#f59e0b] flex items-center gap-2 tracking-widest uppercase text-sm"><CreditCard size={18}/> Datos de Pago</h4>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
              {config.bankDetails}
            </pre>
            <p className="text-xs text-gray-400 mt-3 font-medium uppercase tracking-widest pt-3 border-t border-gray-800">Monto a transferir: <span className="text-[#f59e0b] font-bold text-base">{formatCurrency(total)}</span></p>
          </div>

          <div className="space-y-2">
             <label className="text-sm font-bold tracking-widest uppercase text-gray-400 ml-1">Comprobante</label>
             <div className="border-2 border-dashed border-gray-700 bg-[#151515] rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-[#f59e0b] hover:bg-[#1a1a1a] transition-all cursor-pointer relative group">
               <Upload className="text-gray-500 mb-3 group-hover:text-[#f59e0b] transition-colors" size={32} />
               <span className="text-sm text-gray-400 font-medium group-hover:text-white transition-colors">
                 {proofFile ? proofFile.name : 'Toca para subir imagen o PDF'}
               </span>
               <input 
                 type="file" 
                 accept="image/*,.pdf" 
                 required 
                 className="absolute inset-0 opacity-0 cursor-pointer"
                 onChange={e => setProofFile(e.target.files[0])}
               />
             </div>
          </div>

          <Button type="submit" className="w-full py-4" disabled={isSubmitting}>
            {isSubmitting ? 'ENVIANDO...' : 'ENVIAR COMPROBANTE'}
          </Button>
        </form>
      </Modal>
    </div>
  );
};

const SuccessView = ({ config, navigate }) => (
  <div className="max-w-2xl mx-auto px-6 py-32 text-center space-y-8">
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30 rounded-full flex items-center justify-center mx-auto mb-8">
      <CheckCircle size={48} />
    </motion.div>
    <h1 className="text-4xl font-extrabold tracking-tight text-white uppercase">Comprobante Enviado</h1>
    <p className="text-lg text-gray-400 leading-relaxed font-light">
      {config.successMessage}
    </p>
    <p className="text-gray-500 text-sm">
      Recibirás un correo cuando sea aprobado. Revisa el estado desde "MIS BOLETOS".
    </p>
    <div className="pt-8">
      <Button onClick={() => navigate('home')} className="mx-auto">VOLVER AL INICIO</Button>
    </div>
  </div>
);

const MyTicketsView = ({ purchases }) => {
  const [searchName, setSearchName] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchName.trim()) return;
    const lowerSearch = searchName.toLowerCase();
    const found = purchases.filter(p => p.user.name.toLowerCase().includes(lowerSearch));
    setResults(found);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-extrabold tracking-widest uppercase text-white mb-10 flex items-center gap-3">
        <Ticket className="text-[#f59e0b]" size={32}/> Mis Boletos
      </h1>
      <Card className="p-2 mb-10 border-gray-700 bg-[#111]">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input 
            className="flex-1 bg-transparent border-none text-white px-6 py-4 outline-none placeholder-gray-600" 
            placeholder="Ingresa tu nombre completo..." 
            value={searchName} 
            onChange={e => setSearchName(e.target.value)} 
          />
          <Button type="submit" className="!rounded-lg"><Search size={20} /> BUSCAR</Button>
        </form>
      </Card>

      <div className="space-y-4">
        {results.length > 0 ? results.map(p => (
          <Card key={p.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-gray-800">
             <div>
                <h3 className="font-bold text-lg text-white mb-1">{p.raffleTitle}</h3>
                <p className="text-gray-500 text-sm font-light">Fecha: {p.createdAt?.toDate().toLocaleDateString()}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.tickets.map(t => <span key={t} className="bg-[#222] text-white px-3 py-1.5 rounded text-sm font-bold border border-gray-700">{t}</span>)}
                </div>
             </div>
             <div className="text-right flex flex-col items-start md:items-end w-full md:w-auto border-t border-gray-800 md:border-0 pt-4 md:pt-0">
                <span className={`px-4 py-1.5 rounded uppercase text-xs font-bold tracking-widest ${
                  p.status === 'APPROVED' ? 'bg-green-900/50 text-green-500 border border-green-800' : 
                  p.status === 'REJECTED' ? 'bg-red-900/50 text-red-500 border border-red-800' : 
                  'bg-orange-900/50 text-orange-500 border border-orange-800'
                }`}>
                  {p.status === 'APPROVED' ? 'VALIDADO' : p.status === 'REJECTED' ? 'RECHAZADO' : 'EN REVISIÓN'}
                </span>
                <span className="text-sm font-bold mt-3 text-gray-400">Total: <span className="text-white">{formatCurrency(p.total)}</span></span>
             </div>
          </Card>
        )) : searchName && (
          <div className="text-center py-16 text-gray-500 font-light border border-dashed border-gray-800 rounded-2xl">
            No se encontraron boletos a nombre de "<span className="text-white font-bold">{searchName}</span>".
          </div>
        )}
      </div>
    </div>
  );
};

const PastRafflesView = ({ raffles }) => {
  const past = raffles.filter(r => r.status === 'finished');

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-extrabold tracking-widest uppercase text-white mb-12 flex items-center gap-3">
        <Clock className="text-[#f59e0b]" size={32}/> Historial
      </h1>
      {past.length === 0 ? (
        <p className="text-gray-500 text-center py-20 border border-dashed border-gray-800 rounded-2xl">Aún no hay dinámicas finalizadas.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          {past.map(raffle => (
            <Card key={raffle.id} className="group flex flex-col border-gray-800 bg-[#111]">
              <div className="h-56 overflow-hidden relative grayscale group-hover:grayscale-0 transition-all duration-700">
                <img src={raffle.images?.[0]} alt={raffle.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent" />
              </div>
              <div className="p-6 flex-1 flex flex-col -mt-10 relative z-10">
                <h4 className="text-xl font-bold mb-2 text-white">{raffle.title}</h4>
                <p className="text-gray-500 text-sm mb-6 font-light">Finalizó: {new Date(raffle.endDate).toLocaleDateString()}</p>
                <div className="mt-auto p-5 bg-[#1a1a1a] rounded-xl border border-[#f59e0b]/20">
                   <p className="text-[10px] text-[#f59e0b] uppercase tracking-widest font-bold mb-1">Ganador Oficial</p>
                   <p className="font-extrabold text-lg text-white mb-1">{raffle.winnerName || 'Por anunciar'}</p>
                   <p className="text-sm text-gray-400">Boleto: <span className="font-bold text-white bg-gray-800 px-2 py-0.5 rounded">{raffle.winningNumber || '--'}</span></p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// --- ADMIN VIEWS ---
const AdminLogin = ({ navigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('admin');
    } catch (err) {
      setError('Credenciales incorrectas.');
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-32">
      <Card className="p-8 border-gray-800 bg-[#111]">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#1a1a1a] border border-gray-700 text-[#f59e0b] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
             <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-extrabold tracking-widest text-white uppercase">Acceso Admin</h2>
          <p className="text-gray-500 text-xs mt-2 uppercase tracking-widest">Área restringida</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-5">
          {error && <div className="p-3 bg-red-900/30 border border-red-800 text-red-400 rounded-xl text-sm text-center font-bold">{error}</div>}
          <Input label="CORREO" type="email" required value={email} onChange={e=>setEmail(e.target.value)} />
          <Input label="CONTRASEÑA" type="password" required value={password} onChange={e=>setPassword(e.target.value)} />
          <Button type="submit" className="w-full mt-6 py-4">INGRESAR AL PANEL</Button>
        </form>
      </Card>
    </div>
  );
};

// ... AdminDashboard, AdminRaffles, AdminPurchases, AdminConfig remain identical in logic 
// but updated with dark theme classes for consistency.

const AdminDashboard = ({ raffles, purchases }) => {
  const stats = useMemo(() => {
    const totalPurchases = purchases.length;
    const totalRevenue = purchases.filter(p => p.status === 'APPROVED').reduce((acc, curr) => acc + curr.total, 0);
    const pendingRevenue = purchases.filter(p => p.status === 'PENDING').reduce((acc, curr) => acc + curr.total, 0);
    
    let totalTicketsSold = 0;
    let totalTicketsPending = 0;
    purchases.forEach(p => {
      if (p.status === 'APPROVED') totalTicketsSold += p.tickets.length;
      if (p.status === 'PENDING') totalTicketsPending += p.tickets.length;
    });

    return { participants: new Set(purchases.map(p => p.user.email)).size, totalRevenue, pendingRevenue, totalTicketsSold, totalTicketsPending, totalPurchases };
  }, [purchases]);

  const StatCard = ({ title, value, sub, icon: Icon, colorClass }) => (
    <Card className="p-6 border-gray-800 bg-[#111]">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${colorClass}`}><Icon size={24} /></div>
      </div>
      <div>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-extrabold text-white">{value}</h3>
        {sub && <p className="text-xs text-gray-400 mt-2 font-medium">{sub}</p>}
      </div>
    </Card>
  );

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold tracking-widest text-white uppercase">Dashboard</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard title="Ingresos" value={formatCurrency(stats.totalRevenue)} icon={BarChart3} colorClass="bg-green-900/30 text-green-500" />
        <StatCard title="Por Validar" value={formatCurrency(stats.pendingRevenue)} icon={Clock} colorClass="bg-orange-900/30 text-orange-500" />
        <StatCard title="Boletos" value={stats.totalTicketsSold} sub={`${stats.totalTicketsPending} apartados`} icon={Ticket} colorClass="bg-[#f59e0b]/20 text-[#f59e0b]" />
        <StatCard title="Clientes" value={stats.participants} icon={Users} colorClass="bg-blue-900/30 text-blue-500" />
      </div>

      <Card className="p-8 mt-8 border-gray-800 bg-[#111]">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">Estado de Rifas Activas</h3>
        {raffles.filter(r=>r.status==='active').map(r => {
          const rPurchases = purchases.filter(p => p.raffleId === r.id);
          const sold = rPurchases.filter(p => p.status === 'APPROVED').reduce((a, b) => a + b.tickets.length, 0);
          const pending = rPurchases.filter(p => p.status === 'PENDING').reduce((a, b) => a + b.tickets.length, 0);
          return (
            <div key={r.id} className="mb-8 last:mb-0">
              <div className="flex justify-between text-sm mb-3">
                <span className="font-bold text-white text-lg">{r.title}</span>
                <span className="text-gray-400 font-bold">{sold}% VENDIDO</span>
              </div>
              <div className="h-3 bg-[#222] rounded-full overflow-hidden flex border border-gray-800">
                <div style={{ width: `${(sold/100)*100}%` }} className="bg-[#f59e0b] h-full transition-all" />
                <div style={{ width: `${(pending/100)*100}%` }} className="bg-orange-800 h-full transition-all opacity-80" />
              </div>
              <div className="flex gap-6 mt-3 text-xs text-gray-500 font-bold tracking-widest uppercase">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#f59e0b]"/> Vendidos ({sold})</span>
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-800"/> Espera ({pending})</span>
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#333]"/> Libres ({100 - sold - pending})</span>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
};

const AdminRaffles = ({ raffles }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', price: '', status: 'active', endDate: '', images: '', winnerName: '', winningNumber: '' });

  const openModal = (raffle = null) => {
    if (raffle) {
      setEditingId(raffle.id);
      const dateStr = new Date(raffle.endDate).toISOString().slice(0, 16);
      setFormData({ ...raffle, images: raffle.images?.join('\n') || '', endDate: dateStr });
    } else {
      setEditingId(null);
      setFormData({ title: '', description: '', price: '', status: 'active', endDate: '', images: '', winnerName: '', winningNumber: '' });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const dataToSave = { ...formData, price: Number(formData.price), images: formData.images.split('\n').map(u => u.trim()).filter(Boolean), endDate: new Date(formData.endDate).toISOString(), updatedAt: serverTimestamp() };
    if (editingId) await updateDoc(doc(db, getColPath('raffles'), editingId), dataToSave);
    else { dataToSave.createdAt = serverTimestamp(); await addDoc(collection(db, getColPath('raffles')), dataToSave); }
    setShowModal(false);
  };

  const handleDelete = async (id) => { if(confirm('¿Eliminar esta rifa?')) await deleteDoc(doc(db, getColPath('raffles'), id)); };
  const handleDuplicate = async (raffle) => {
    const { id, createdAt, updatedAt, ...rest } = raffle;
    await addDoc(collection(db, getColPath('raffles')), { ...rest, title: `${rest.title} (Copia)`, status: 'active', createdAt: serverTimestamp() });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-widest text-white uppercase">Gestión de Rifas</h2>
        <Button onClick={() => openModal()}><Plus size={20} /> NUEVA</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {raffles.map(r => (
          <Card key={r.id} className="p-0 flex flex-col sm:flex-row overflow-hidden group border-gray-800 bg-[#111]">
            <div className="w-full sm:w-40 h-40 bg-[#222] flex-shrink-0 relative">
               {r.images?.[0] && <img src={r.images[0]} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />}
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
               <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg text-white line-clamp-1">{r.title}</h4>
                    <span className={`text-[9px] uppercase font-bold px-2 py-1 rounded tracking-widest ${r.status === 'active' ? 'bg-green-900/50 text-green-500' : 'bg-gray-800 text-gray-400'}`}>
                      {r.status === 'active' ? 'ACTIVA' : 'FIN'}
                    </span>
                  </div>
                  <p className="text-sm text-[#f59e0b] font-bold">{formatCurrency(r.price)} / BOLETO</p>
               </div>
               <div className="flex gap-2 mt-4">
                  <Button variant="secondary" className="!py-2 !px-3 text-[10px] flex-1" onClick={() => openModal(r)}>EDITAR</Button>
                  <Button variant="secondary" className="!py-2 !px-3 text-[10px] flex-1" onClick={() => handleDuplicate(r)}>DUPLICAR</Button>
                  <Button variant="danger" className="!py-2 !px-3 text-xs" onClick={() => handleDelete(r.id)}><X size={16}/></Button>
               </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'EDITAR RIFA' : 'NUEVA RIFA'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="TÍTULO" required value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} />
          <Input label="DESCRIPCIÓN" multiline required value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
             <Input label="PRECIO (MXN)" type="number" required value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} />
             <Input label="FECHA LÍMITE" type="datetime-local" required value={formData.endDate} onChange={e=>setFormData({...formData, endDate: e.target.value})} />
          </div>
          <Input label="URL DE IMÁGENES (UNA POR LÍNEA)" multiline required value={formData.images} onChange={e=>setFormData({...formData, images: e.target.value})} placeholder="https://..." />
          <div className="flex flex-col gap-1">
             <label className="text-sm font-medium text-gray-400 ml-1 uppercase tracking-widest">ESTADO</label>
             <select className="bg-[#1a1a1a] border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:border-[#f59e0b]" value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})}>
                <option value="active">Activa</option>
                <option value="finished">Finalizada</option>
             </select>
          </div>
          {formData.status === 'finished' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-[#222] rounded-xl border border-gray-700 mt-4">
               <Input label="NOMBRE GANADOR" value={formData.winnerName} onChange={e=>setFormData({...formData, winnerName: e.target.value})} />
               <Input label="BOLETO GANADOR" value={formData.winningNumber} onChange={e=>setFormData({...formData, winningNumber: e.target.value})} />
            </div>
          )}
          <Button type="submit" className="w-full mt-6 py-4">GUARDAR DATOS</Button>
        </form>
      </Modal>
    </div>
  );
};

const AdminPurchases = ({ purchases }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filtered = useMemo(() => {
    if (!searchTerm) return purchases;
    const term = searchTerm.toLowerCase();
    return purchases.filter(p => p.user.name.toLowerCase().includes(term) || p.user.email.toLowerCase().includes(term) || p.user.phone.includes(term) || p.tickets.some(t => t.includes(term)));
  }, [purchases, searchTerm]);

  const updateStatus = async (id, status, userEmail) => {
    await updateDoc(doc(db, getColPath('purchases'), id), { status });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-widest text-white uppercase">Validación de Pagos</h2>
      </div>

      <Card className="p-3 mb-6 bg-[#111] border-gray-800">
         <div className="flex items-center gap-3 bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3">
            <Search className="text-gray-500" size={20} />
            <input type="text" placeholder="Buscar por nombre, boleto o teléfono..." className="bg-transparent border-none outline-none w-full text-white placeholder-gray-600" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
         </div>
      </Card>

      <div className="space-y-6">
        {filtered.map(p => (
          <Card key={p.id} className="p-0 overflow-hidden flex flex-col md:flex-row border-gray-800 bg-[#111]">
             <div className="w-full md:w-56 h-56 bg-[#1a1a1a] flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-800 relative group cursor-pointer" onClick={() => window.open(p.proofUrl, '_blank')}>
                {p.proofUrl ? <img src={p.proofUrl} alt="Comprobante" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" /> : <span className="text-xs text-gray-600">SIN FOTO</span>}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-bold tracking-widest backdrop-blur-sm">VER COMPROBANTE</div>
             </div>
             <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                   <div className="flex justify-between items-start mb-3">
                     <h3 className="font-bold text-xl text-white uppercase">{p.user.name}</h3>
                     <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${p.status === 'APPROVED' ? 'bg-green-900/50 text-green-500' : p.status === 'REJECTED' ? 'bg-red-900/50 text-red-500' : 'bg-[#f59e0b]/20 text-[#f59e0b]'}`}>
                       {p.status}
                     </span>
                   </div>
                   <div className="text-sm text-gray-400 space-y-2 font-light">
                      <p className="flex items-center gap-2"><span className="w-4">📧</span> {p.user.email} &nbsp;|&nbsp; 📱 {p.user.phone}</p>
                      <p className="flex items-center gap-2"><span className="w-4">🎟</span> <span className="font-medium text-white">{p.raffleTitle}</span></p>
                      <div className="flex gap-2 items-center pt-2">
                        <span className="text-xs uppercase tracking-widest font-bold">Números:</span>
                        <div className="flex flex-wrap gap-1">
                          {p.tickets.map(t => <span key={t} className="bg-[#222] border border-gray-700 text-white px-2 py-0.5 rounded text-xs font-bold">{t}</span>)}
                        </div>
                      </div>
                      <p className="font-extrabold text-[#f59e0b] mt-4 text-2xl pt-2 border-t border-gray-800">{formatCurrency(p.total)}</p>
                   </div>
                </div>
                {p.status === 'PENDING' && (
                  <div className="flex gap-4 mt-6">
                    <Button onClick={() => updateStatus(p.id, 'APPROVED', p.user.email)} className="bg-green-600 text-white hover:bg-green-500 flex-1 py-3 text-xs">APROBAR</Button>
                    <Button onClick={() => updateStatus(p.id, 'REJECTED', p.user.email)} variant="danger" className="flex-1 py-3 text-xs">RECHAZAR</Button>
                  </div>
                )}
                {p.status !== 'PENDING' && (
                  <div className="mt-6 flex justify-end">
                     <Button variant="secondary" className="!py-2 text-[10px]" onClick={() => updateStatus(p.id, 'PENDING', p.user.email)}>DESHACER ACCIÓN</Button>
                  </div>
                )}
             </div>
          </Card>
        ))}
        {filtered.length === 0 && <div className="text-center py-20 text-gray-600 font-bold tracking-widest uppercase">No hay registros</div>}
      </div>
    </div>
  );
};

const AdminConfig = ({ config }) => {
  const [formData, setFormData] = useState(config);
  const [saving, setSaving] = useState(false);
  const handleSave = async (e) => { e.preventDefault(); setSaving(true); await setDoc(doc(db, getColPath('config'), 'main'), formData); setSaving(false); };

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold tracking-widest text-white uppercase mb-8">Configuración</h2>
      <Card className="p-8 bg-[#111] border-gray-800">
        <form onSubmit={handleSave} className="space-y-6">
           <div className="grid grid-cols-2 gap-6">
             <Input label="NOMBRE DEL NEGOCIO" value={formData.businessName} onChange={e=>setFormData({...formData, businessName: e.target.value})} />
             <Input label="INICIALES LOGO" value={formData.logoText} onChange={e=>setFormData({...formData, logoText: e.target.value})} />
           </div>
           <div className="grid grid-cols-2 gap-6">
             <Input label="TELÉFONO" value={formData.contactPhone} onChange={e=>setFormData({...formData, contactPhone: e.target.value})} />
             <Input label="CORREO" value={formData.contactEmail} onChange={e=>setFormData({...formData, contactEmail: e.target.value})} />
           </div>
           <Input label="DATOS PARA TRANSFERENCIA" multiline value={formData.bankDetails} onChange={e=>setFormData({...formData, bankDetails: e.target.value})} />
           <Input label="TEXTO PROMOCIÓN (EJ. COMPRA 10 LLEVA 1)" value={formData.promoText} onChange={e=>setFormData({...formData, promoText: e.target.value})} />
           <Input label="MENSAJE DE ÉXITO" multiline value={formData.successMessage} onChange={e=>setFormData({...formData, successMessage: e.target.value})} />
           <Button type="submit" className="w-full mt-8 py-4" disabled={saving}>{saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}</Button>
        </form>
      </Card>
    </div>
  );
};

const AdminLayout = ({ children, navigate }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const tabs = [
    { id: 'dashboard', label: 'DASHBOARD', icon: BarChart3 },
    { id: 'raffles', label: 'DINÁMICAS', icon: Ticket },
    { id: 'purchases', label: 'PAGOS', icon: CreditCard },
    { id: 'config', label: 'AJUSTES', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex text-white font-sans selection:bg-[#f59e0b]/30">
       <div className="w-72 bg-[#0a0a0a] border-r border-gray-900 flex flex-col fixed inset-y-0 z-10 shadow-2xl">
          <div className="h-24 flex items-center justify-center px-6 border-b border-gray-900">
             <span className="font-extrabold text-xl tracking-widest text-white flex items-center gap-2"><ShieldCheck className="text-[#f59e0b]"/> CONTROL</span>
          </div>
          <div className="flex-1 py-8 px-4 space-y-3">
             {tabs.map(t => (
               <button key={t.id} onClick={() => setActiveTab(t.id)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all font-bold tracking-widest text-xs uppercase ${activeTab === t.id ? 'bg-[#f59e0b] text-black shadow-lg shadow-amber-900/20' : 'text-gray-500 hover:bg-[#111] hover:text-white'}`}>
                 <t.icon size={18} /> {t.label}
               </button>
             ))}
          </div>
          <div className="p-6 border-t border-gray-900">
             <button onClick={() => navigate('home')} className="w-full flex items-center justify-center gap-3 px-4 py-3 text-gray-500 hover:text-white hover:bg-[#111] rounded-xl text-xs font-bold uppercase tracking-widest transition-colors mb-2">
               <Home size={16} /> VOLVER A LA WEB
             </button>
             <button onClick={() => { signOut(auth); navigate('home'); }} className="w-full flex items-center justify-center gap-3 px-4 py-3 text-red-500 hover:bg-red-950/30 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors">
               <LogIn size={16} className="rotate-180" /> SALIR
             </button>
          </div>
       </div>
       <div className="flex-1 ml-72 p-12 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
             {children({ activeTab })}
          </div>
       </div>
    </div>
  );
};

export default function App() {
  const { user, isAdmin, config, raffles, purchases, loading } = useAppData();
  const [route, setRoute] = useState({ path: 'home', params: {} });

  const navigate = (path, params = {}) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setRoute({ path, params });
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
       <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-12 h-12 border-4 border-[#222] border-t-[#f59e0b] rounded-full" />
    </div>
  );

  let View;
  const isClientRoute = !['admin', 'adminLogin'].includes(route.path);

  switch (route.path) {
    case 'home': View = <HomeView raffles={raffles} navigate={navigate} config={config} />; break;
    case 'raffle': View = <RaffleDetailView raffleId={route.params.id} raffles={raffles} purchases={purchases} config={config} navigate={navigate} />; break;
    case 'success': View = <SuccessView config={config} navigate={navigate} />; break;
    case 'past': View = <PastRafflesView raffles={raffles} />; break;
    case 'mytickets': View = <MyTicketsView purchases={purchases} />; break;
    case 'adminLogin': View = <AdminLogin navigate={navigate} />; break;
    case 'admin':
      if (!isAdmin) { setRoute({ path: 'adminLogin', params: {} }); return null; }
      View = (
        <AdminLayout navigate={navigate}>
          {({ activeTab }) => (
             <>
               {activeTab === 'dashboard' && <AdminDashboard raffles={raffles} purchases={purchases} />}
               {activeTab === 'raffles' && <AdminRaffles raffles={raffles} />}
               {activeTab === 'purchases' && <AdminPurchases purchases={purchases} />}
               {activeTab === 'config' && <AdminConfig config={config} />}
             </>
          )}
        </AdminLayout>
      );
      break;
    default: View = <HomeView raffles={raffles} navigate={navigate} config={config} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-sans selection:bg-[#f59e0b]/30">
      {isClientRoute && <Header config={config} navigate={navigate} currentRoute={route.path} isAdmin={isAdmin} />}
      <AnimatePresence mode="wait">
        <motion.main key={route.path + (route.params.id || '')} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.4 }} className={isClientRoute ? "" : "h-full"}>
          {View}
        </motion.main>
      </AnimatePresence>
      {isClientRoute && (
        <footer className="bg-[#111] border-t border-gray-900 py-10 text-center text-gray-600 text-xs font-bold tracking-widest uppercase mt-auto">
          <p>&copy; {new Date().getFullYear()} {config.businessName}. TODOS LOS DERECHOS RESERVADOS.</p>
        </footer>
      )}
    </div>
  );
}