import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, Ticket, Clock, ShieldCheck, Search, Plus, 
  Settings, CheckCircle, XCircle, CreditCard, ChevronLeft, 
  ChevronRight, Upload, X, LogIn, Users, BarChart3, AlertCircle
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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-rifas-app';

// Helper to get collection paths according to mandatory rules
const getColPath = (colName) => `artifacts/${appId}/public/data/${colName}`;

// Default Configuration
const DEFAULT_CONFIG = {
  businessName: 'Elite Watches',
  logoText: ' WATCH RAFFLES',
  contactPhone: '+52 123 456 7890',
  contactEmail: 'contacto@elitewatches.com',
  bankDetails: 'Banco: BBVA\nTitular: Juan Pérez\nCuenta: 1234567890\nCLABE: 012345678901234567',
  promoText: 'Compra 10 boletos y recibe 1 completamente GRATIS.',
  successMessage: 'Tu comprobante fue recibido correctamente. Nuestro equipo validará tu pago lo antes posible.'
};

// --- GLOBAL STATE MANAGEMENT ---
// In a real multi-file app, this would be a separate Context provider.
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
      // Basic admin check (in production, use Custom Claims or a specific admin document)
      // For this demo, if they have an email, we assume they logged in via the Admin portal
      setIsAdmin(!!u?.email); 
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen to Config
    const unsubConfig = onSnapshot(doc(db, getColPath('config'), 'main'), (docSnap) => {
      if (docSnap.exists()) setConfig(docSnap.data());
      else setDoc(doc(db, getColPath('config'), 'main'), DEFAULT_CONFIG);
    });

    // Listen to Raffles
    const unsubRaffles = onSnapshot(collection(db, getColPath('raffles')), (snapshot) => {
      const r = [];
      snapshot.forEach(doc => r.push({ id: doc.id, ...doc.data() }));
      // Sort by creation date or end date
      setRaffles(r.sort((a, b) => b.createdAt - a.createdAt));
    });

    // Listen to Purchases (Contains tickets & proofs)
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

// --- UI COMPONENTS ---
const Card = ({ children, className = '' }) => (
  <div className={`bg-white/80 backdrop-blur-xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }) => {
  const baseStyle = "font-medium rounded-full transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[#0071e3] text-white hover:bg-[#0077ed] px-6 py-3 shadow-md hover:shadow-lg",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 px-6 py-3",
    danger: "bg-red-500 text-white hover:bg-red-600 px-6 py-3 shadow-md",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3"
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
    {label && <label className="text-sm font-medium text-gray-500 ml-1">{label}</label>}
    {multiline ? (
      <textarea 
        value={value} onChange={onChange} placeholder={placeholder} required={required}
        className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition-all min-h-[100px] resize-y text-gray-800"
      />
    ) : (
      <input 
        type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition-all text-gray-800"
      />
    )}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-lg z-10">
          <Card className="p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><X size={20} className="text-gray-500" /></button>
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

  if (!images || images.length === 0) return <div className="w-full h-64 bg-gray-200 rounded-3xl animate-pulse" />;

  return (
    <div className="relative w-full h-[300px] md:h-[450px] rounded-3xl overflow-hidden group">
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
              <button key={i} onClick={() => setCurrent(i)} className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-white w-4' : 'bg-white/50'}`} />
            ))}
          </div>
          <button onClick={() => setCurrent(c => (c - 1 + images.length) % images.length)} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/20 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft size={24} /></button>
          <button onClick={() => setCurrent(c => (c + 1) % images.length)} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/20 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight size={24} /></button>
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
          <div className="bg-white shadow-sm border border-gray-100 rounded-xl w-14 h-14 flex items-center justify-center text-xl font-semibold text-gray-800">
            {padNumber(val)}
          </div>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider mt-1 font-medium">{label}</span>
        </div>
      ))}
    </div>
  );
};

// --- PUBLIC VIEWS ---

const Header = ({ config, navigate, currentRoute, isAdmin }) => {
  const navItems = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'past', label: 'Rifas Pasadas', icon: Clock },
    { id: 'mytickets', label: 'Mis Boletos', icon: Ticket },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 transition-all">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('home')}>
          <div className="w-10 h-10 bg-gray-900 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
            {config.logoText.charAt(0)}
          </div>
          <span className="font-semibold text-xl tracking-tight hidden sm:block">{config.businessName}</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          {navItems.map(item => (
            <button key={item.id} onClick={() => navigate(item.id)} className={`text-sm font-medium transition-colors ${currentRoute === item.id ? 'text-[#0071e3]' : 'text-gray-500 hover:text-gray-900'}`}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex gap-4">
           {isAdmin ? (
             <Button variant="secondary" className="!py-2 !px-4 text-sm" onClick={() => navigate('admin')}>Panel Admin</Button>
           ) : (
             <button onClick={() => navigate('adminLogin')} className="text-gray-400 hover:text-gray-900 transition-colors">
               <ShieldCheck size={20} />
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
    <div className="space-y-16 py-8">
      {mainRaffle ? (
        <section className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-block px-4 py-1.5 bg-blue-50 text-[#0071e3] rounded-full text-sm font-semibold tracking-wide">
              🔥 Rifa Principal Activa
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1]">
              {mainRaffle.title}
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed max-w-lg">
              {mainRaffle.description}
            </p>
            
            <div>
               <p className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Termina en</p>
               <CountdownTimer endDate={mainRaffle.endDate} />
            </div>

            <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex items-start gap-4 max-w-md">
               <div className="p-2 bg-white rounded-xl shadow-sm text-yellow-500"><AlertCircle size={24}/></div>
               <div>
                  <h4 className="font-semibold text-gray-900">Promoción Especial</h4>
                  <p className="text-sm text-gray-600">{config.promoText}</p>
               </div>
            </div>

            <div className="flex items-center gap-6 pt-4">
              <Button onClick={() => navigate('raffle', { id: mainRaffle.id })} className="text-lg px-8 py-4">
                Comprar Boletos — {formatCurrency(mainRaffle.price)}
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-gray-100 to-transparent rounded-full blur-3xl -z-10 transform scale-90 translate-y-10" />
            <Carousel images={mainRaffle.images} />
          </div>
        </section>
      ) : (
        <div className="max-w-7xl mx-auto px-6 text-center py-20">
          <h2 className="text-3xl font-bold text-gray-400">No hay rifas activas en este momento.</h2>
        </div>
      )}

      {activeRaffles.length > 1 && (
        <section className="max-w-7xl mx-auto px-6 pb-20">
          <h3 className="text-2xl font-bold mb-8 tracking-tight">Otras rifas disponibles</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {activeRaffles.slice(1).map(raffle => (
              <Card key={raffle.id} className="cursor-pointer group" >
                <div onClick={() => navigate('raffle', { id: raffle.id })}>
                  <div className="h-48 overflow-hidden">
                    <img src={raffle.images?.[0]} alt={raffle.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-6">
                    <h4 className="text-xl font-semibold mb-2">{raffle.title}</h4>
                    <p className="text-gray-500 text-sm line-clamp-2 mb-4">{raffle.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-[#0071e3]">{formatCurrency(raffle.price)}</span>
                      <Button variant="outline" className="!py-1.5 !px-4 text-sm">Ver más</Button>
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
  // Generates 100 tickets 00 to 99
  const grid = Array.from({ length: 100 }, (_, i) => padNumber(i));

  return (
    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 md:gap-3">
      {grid.map(num => {
        const status = ticketsStatus[num] || 'AVAILABLE'; // AVAILABLE, PENDING (orange), APPROVED (red)
        const isSelected = selectedTickets.includes(num);
        
        let bgColor = "bg-green-100 text-green-700 hover:bg-green-200 border-green-200"; // AVAILABLE
        if (status === 'PENDING') bgColor = "bg-orange-100 text-orange-700 border-orange-200 opacity-60 cursor-not-allowed";
        if (status === 'APPROVED') bgColor = "bg-red-100 text-red-700 border-red-200 opacity-60 cursor-not-allowed";
        if (isSelected) bgColor = "bg-[#0071e3] text-white border-[#0071e3] shadow-md transform scale-105";

        return (
          <button
            key={num}
            disabled={status !== 'AVAILABLE'}
            onClick={() => toggleTicket(num)}
            className={`w-full aspect-square rounded-xl flex items-center justify-center font-bold text-lg md:text-xl border transition-all duration-200 ${bgColor}`}
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
  
  // Calculate ticket statuses based on purchases
  const ticketsStatus = useMemo(() => {
    const statusMap = {};
    if (!raffle) return statusMap;
    const rafflePurchases = purchases.filter(p => p.raffleId === raffleId);
    rafflePurchases.forEach(p => {
      p.tickets.forEach(t => {
        // If multiple purchases claim same ticket somehow, APPROVED takes precedence
        if (statusMap[t] !== 'APPROVED') {
          statusMap[t] = p.status; // PENDING or APPROVED
        }
      });
    });
    return statusMap;
  }, [purchases, raffleId, raffle]);

  if (!raffle) return <div className="text-center py-20">Rifa no encontrada</div>;

  const toggleTicket = (num) => {
    if (selectedTickets.includes(num)) {
      setSelectedTickets(prev => prev.filter(t => t !== num));
    } else {
      setSelectedTickets(prev => [...prev, num].sort());
    }
  };

  // Promo Logic: Buy 10 get 1 free
  const applyPromo = () => {
    const availableTickets = Array.from({ length: 100 }, (_, i) => padNumber(i))
      .filter(t => !ticketsStatus[t] && !selectedTickets.includes(t));
    
    if (availableTickets.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableTickets.length);
      const freeTicket = availableTickets[randomIndex];
      setSelectedTickets(prev => [...prev, freeTicket].sort());
      // In a real app, track which one is free for pricing, but here price = (selected - freeCount) * price
    }
  };

  const freeTicketsEarned = Math.floor(selectedTickets.length / 11); // If they have 11, 1 is free. If 22, 2 free.
  const ticketsToPay = selectedTickets.length - freeTicketsEarned;
  const total = ticketsToPay * raffle.price;

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (selectedTickets.length === 0) return;
    setIsSubmitting(true);

    try {
      let proofUrl = '';
      if (proofFile) {
        // Simulate or do real upload
        try {
          const storageRef = ref(storage, `proofs/${Date.now()}_${proofFile.name}`);
          await uploadBytes(storageRef, proofFile);
          proofUrl = await getDownloadURL(storageRef);
        } catch (uploadError) {
          console.warn("Storage upload failed, falling back to dummy URL for Canvas demo", uploadError);
          // Canvas fallback if storage rules deny
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
      
      // Send Email simulation
      console.log(`[EMAIL] To Admin: New purchase from ${formData.name} for tickets ${selectedTickets.join(', ')}`);
      
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
          <Button variant="secondary" onClick={() => navigate('home')} className="!p-2 !w-12 !h-12 rounded-full mb-4">
            <ChevronLeft />
          </Button>
          <Carousel images={raffle.images} />
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">{raffle.title}</h1>
            <p className="text-gray-500 mb-4">{raffle.description}</p>
            <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
               <Clock className="text-gray-400" />
               <CountdownTimer endDate={raffle.endDate} />
            </div>
          </div>
          
          <Card className="p-6 bg-gradient-to-br from-[#0071e3]/5 to-[#0071e3]/10 border-blue-100">
            <h3 className="font-semibold text-[#0071e3] mb-2 flex items-center gap-2">
              <CheckCircle size={18}/> Promoción Especial
            </h3>
            <p className="text-sm text-gray-700">{config.promoText}</p>
            {selectedTickets.length >= 10 && selectedTickets.length % 11 === 10 && (
               <Button onClick={applyPromo} className="w-full mt-4 !py-2 text-sm shadow-blue-500/30">
                 ¡Reclamar 1 Boleto Gratis!
               </Button>
            )}
          </Card>

          <Card className="p-6">
             <div className="flex justify-between items-center mb-4">
                <span className="text-gray-500">Boletos seleccionados:</span>
                <span className="font-bold text-xl">{selectedTickets.length}</span>
             </div>
             <div className="flex flex-wrap gap-2 mb-4">
                {selectedTickets.map(t => <span key={t} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm font-bold">{t}</span>)}
             </div>
             <div className="pt-4 border-t border-gray-100 flex justify-between items-center mb-6">
                <span className="text-gray-500 font-medium">Total a pagar:</span>
                <span className="font-bold text-3xl text-[#0071e3]">{formatCurrency(total)}</span>
             </div>
             <Button 
               onClick={() => setShowPurchaseForm(true)} 
               disabled={selectedTickets.length === 0} 
               className="w-full"
             >
               Confirmar Selección
             </Button>
          </Card>
        </div>

        {/* Right: Grid */}
        <div className="md:w-2/3">
          <div className="flex justify-between items-end mb-6">
             <div>
               <h2 className="text-2xl font-bold tracking-tight">Selecciona tus boletos</h2>
               <p className="text-gray-500 mt-1">Elige los números con los que deseas participar.</p>
             </div>
             <div className="flex gap-4 text-xs font-medium text-gray-500">
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400"></span> Disponible</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400"></span> Apartado</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> Pagado</div>
             </div>
          </div>
          <Card className="p-6 md:p-8 bg-gray-50/50">
            <TicketGrid ticketsStatus={ticketsStatus} selectedTickets={selectedTickets} toggleTicket={toggleTicket} />
          </Card>
        </div>
      </div>

      {/* Purchase Modal */}
      <Modal isOpen={showPurchaseForm} onClose={() => setShowPurchaseForm(false)} title="Completar Compra">
        <form onSubmit={handlePurchase} className="space-y-6">
          <div className="space-y-4">
            <Input label="Nombre completo" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Juan Pérez" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Correo electrónico" type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="juan@email.com" />
              <Input label="Teléfono (WhatsApp)" type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="55 1234 5678" />
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-2">
            <h4 className="font-semibold text-blue-900 flex items-center gap-2"><CreditCard size={18}/> Datos para Transferencia</h4>
            <pre className="text-sm text-blue-800 whitespace-pre-wrap font-sans leading-relaxed">
              {config.bankDetails}
            </pre>
            <p className="text-xs text-blue-600 mt-2 font-medium">Monto exacto a transferir: {formatCurrency(total)}</p>
          </div>

          <div className="space-y-2">
             <label className="text-sm font-medium text-gray-500 ml-1">Sube tu comprobante de pago</label>
             <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
               <Upload className="text-gray-400 mb-2" />
               <span className="text-sm text-gray-600 font-medium">
                 {proofFile ? proofFile.name : 'Haz clic para seleccionar imagen o PDF'}
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

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando comprobante...' : 'Enviar y Finalizar'}
          </Button>
        </form>
      </Modal>
    </div>
  );
};

const SuccessView = ({ config, navigate }) => (
  <div className="max-w-2xl mx-auto px-6 py-20 text-center space-y-8">
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8">
      <CheckCircle size={48} />
    </motion.div>
    <h1 className="text-4xl font-bold tracking-tight text-gray-900">✅ Comprobante enviado con éxito</h1>
    <p className="text-xl text-gray-500 leading-relaxed">
      {config.successMessage}
    </p>
    <p className="text-gray-400">
      Recibirás un correo cuando sea aprobado. También podrás revisar el estado de tus boletos desde la sección Mis Boletos.
    </p>
    <div className="pt-8">
      <Button onClick={() => navigate('home')} className="mx-auto">Volver al Inicio</Button>
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
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Mis Boletos</h1>
      <Card className="p-6 md:p-8 mb-8">
        <form onSubmit={handleSearch} className="flex gap-4">
          <Input 
            className="flex-1" 
            placeholder="Escribe tu nombre completo..." 
            value={searchName} 
            onChange={e => setSearchName(e.target.value)} 
          />
          <Button type="submit"><Search size={20} /> Buscar</Button>
        </form>
      </Card>

      <div className="space-y-4">
        {results.length > 0 ? results.map(p => (
          <Card key={p.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div>
                <h3 className="font-semibold text-lg">{p.raffleTitle}</h3>
                <p className="text-gray-500 text-sm">Comprado el: {p.createdAt?.toDate().toLocaleDateString()}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.tickets.map(t => <span key={t} className="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-sm font-bold border border-gray-200">{t}</span>)}
                </div>
             </div>
             <div className="text-right flex flex-col items-end">
                <span className={`px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide ${
                  p.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                  p.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 
                  'bg-orange-100 text-orange-700'
                }`}>
                  {p.status === 'APPROVED' ? 'Validado' : p.status === 'REJECTED' ? 'Rechazado' : 'Pendiente'}
                </span>
                <span className="text-sm font-medium mt-2 text-gray-500">Total: {formatCurrency(p.total)}</span>
             </div>
          </Card>
        )) : searchName && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron boletos a nombre de "{searchName}".
          </div>
        )}
      </div>
    </div>
  );
};

const PastRafflesView = ({ raffles }) => {
  const past = raffles.filter(r => r.status === 'finished');

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight mb-12">Rifas Pasadas</h1>
      {past.length === 0 ? (
        <p className="text-gray-500 text-center py-12">Aún no hay rifas finalizadas.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          {past.map(raffle => (
            <Card key={raffle.id} className="group flex flex-col">
              <div className="h-48 overflow-hidden relative grayscale group-hover:grayscale-0 transition-all duration-500">
                <img src={raffle.images?.[0]} alt={raffle.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20" />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h4 className="text-xl font-semibold mb-2">{raffle.title}</h4>
                <p className="text-gray-500 text-sm mb-4">Finalizó el: {new Date(raffle.endDate).toLocaleDateString()}</p>
                <div className="mt-auto p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
                   <p className="text-xs text-yellow-800 uppercase tracking-wider font-semibold mb-1">Ganador</p>
                   <p className="font-bold text-lg text-yellow-900">{raffle.winnerName || 'Pendiente'}</p>
                   <p className="text-sm text-yellow-700">Boleto: <span className="font-bold">{raffle.winningNumber || '--'}</span></p>
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
      setError('Credenciales incorrectas o error de conexión.');
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-32">
      <Card className="p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gray-900 text-white rounded-3xl flex items-center justify-center mx-auto mb-4">
             <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Panel Administrativo</h2>
          <p className="text-gray-500 text-sm mt-1">Solo personal autorizado</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm text-center">{error}</div>}
          <Input label="Correo" type="email" required value={email} onChange={e=>setEmail(e.target.value)} />
          <Input label="Contraseña" type="password" required value={password} onChange={e=>setPassword(e.target.value)} />
          <Button type="submit" className="w-full mt-4">Iniciar Sesión</Button>
        </form>
      </Card>
    </div>
  );
};

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

    return {
      participants: new Set(purchases.map(p => p.user.email)).size,
      totalRevenue, pendingRevenue, totalTicketsSold, totalTicketsPending, totalPurchases
    };
  }, [purchases]);

  const StatCard = ({ title, value, sub, icon: Icon, colorClass }) => (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${colorClass}`}><Icon size={24} /></div>
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold tracking-tight text-gray-900">{value}</h3>
        {sub && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight mb-6">Vista General</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard title="Ingresos Validados" value={formatCurrency(stats.totalRevenue)} icon={BarChart3} colorClass="bg-green-100 text-green-600" />
        <StatCard title="Dinero Pendiente" value={formatCurrency(stats.pendingRevenue)} icon={Clock} colorClass="bg-orange-100 text-orange-600" />
        <StatCard title="Boletos Pagados" value={stats.totalTicketsSold} sub={`${stats.totalTicketsPending} apartados`} icon={Ticket} colorClass="bg-blue-100 text-blue-600" />
        <StatCard title="Participantes Únicos" value={stats.participants} icon={Users} colorClass="bg-purple-100 text-purple-600" />
      </div>

      <Card className="p-6 mt-8">
        <h3 className="text-lg font-semibold mb-4">Progreso de Rifa Principal</h3>
        {raffles.filter(r=>r.status==='active').map(r => {
          const rPurchases = purchases.filter(p => p.raffleId === r.id);
          const sold = rPurchases.filter(p => p.status === 'APPROVED').reduce((a, b) => a + b.tickets.length, 0);
          const pending = rPurchases.filter(p => p.status === 'PENDING').reduce((a, b) => a + b.tickets.length, 0);
          return (
            <div key={r.id} className="mb-6 last:mb-0">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">{r.title}</span>
                <span className="text-gray-500">{sold}/100 Boletos ({(sold/100)*100}%)</span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
                <div style={{ width: `${(sold/100)*100}%` }} className="bg-green-500 h-full transition-all" />
                <div style={{ width: `${(pending/100)*100}%` }} className="bg-orange-400 h-full transition-all opacity-50" />
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"/> Vendidos ({sold})</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400 opacity-50"/> Apartados ({pending})</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-200"/> Libres ({100 - sold - pending})</span>
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
  const [formData, setFormData] = useState({
    title: '', description: '', price: '', status: 'active', endDate: '', images: '', winnerName: '', winningNumber: ''
  });

  const openModal = (raffle = null) => {
    if (raffle) {
      setEditingId(raffle.id);
      // Format date for datetime-local input
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
    const dataToSave = {
      ...formData,
      price: Number(formData.price),
      images: formData.images.split('\n').map(u => u.trim()).filter(Boolean),
      endDate: new Date(formData.endDate).toISOString(),
      updatedAt: serverTimestamp()
    };

    if (editingId) {
      await updateDoc(doc(db, getColPath('raffles'), editingId), dataToSave);
    } else {
      dataToSave.createdAt = serverTimestamp();
      await addDoc(collection(db, getColPath('raffles')), dataToSave);
    }
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    if(confirm('¿Eliminar esta rifa?')) {
      await deleteDoc(doc(db, getColPath('raffles'), id));
    }
  };

  const handleDuplicate = async (raffle) => {
    const { id, createdAt, updatedAt, ...rest } = raffle;
    await addDoc(collection(db, getColPath('raffles')), {
      ...rest,
      title: `${rest.title} (Copia)`,
      status: 'active',
      createdAt: serverTimestamp()
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Gestión de Rifas</h2>
        <Button onClick={() => openModal()}><Plus size={20} /> Nueva Rifa</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {raffles.map(r => (
          <Card key={r.id} className="p-0 flex flex-col sm:flex-row overflow-hidden group">
            <div className="w-full sm:w-40 h-40 bg-gray-100 flex-shrink-0">
               {r.images?.[0] && <img src={r.images[0]} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
               <div>
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-lg line-clamp-1">{r.title}</h4>
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${r.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                      {r.status === 'active' ? 'Activa' : 'Finalizada'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">{formatCurrency(r.price)} / boleto</p>
               </div>
               <div className="flex gap-2 mt-4">
                  <Button variant="outline" className="!py-1.5 !px-3 text-xs flex-1" onClick={() => openModal(r)}>Editar</Button>
                  <Button variant="outline" className="!py-1.5 !px-3 text-xs flex-1" onClick={() => handleDuplicate(r)}>Duplicar</Button>
                  <Button variant="danger" className="!py-1.5 !px-3 text-xs" onClick={() => handleDelete(r.id)}><X size={16}/></Button>
               </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Editar Rifa' : 'Nueva Rifa'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Título" required value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} />
          <Input label="Descripción" multiline required value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
             <Input label="Precio (MXN)" type="number" required value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} />
             <Input label="Fecha de Fin" type="datetime-local" required value={formData.endDate} onChange={e=>setFormData({...formData, endDate: e.target.value})} />
          </div>
          <Input label="URLs de Imágenes (una por línea)" multiline required value={formData.images} onChange={e=>setFormData({...formData, images: e.target.value})} placeholder="https://..." />
          <div className="flex flex-col gap-1">
             <label className="text-sm font-medium text-gray-500 ml-1">Estado</label>
             <select className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none" value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})}>
                <option value="active">Activa</option>
                <option value="finished">Finalizada</option>
             </select>
          </div>
          {formData.status === 'finished' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
               <Input label="Nombre del Ganador" value={formData.winnerName} onChange={e=>setFormData({...formData, winnerName: e.target.value})} />
               <Input label="Boleto Ganador" value={formData.winningNumber} onChange={e=>setFormData({...formData, winningNumber: e.target.value})} />
            </div>
          )}
          <Button type="submit" className="w-full mt-4">Guardar Rifa</Button>
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
    return purchases.filter(p => 
      p.user.name.toLowerCase().includes(term) ||
      p.user.email.toLowerCase().includes(term) ||
      p.user.phone.includes(term) ||
      p.tickets.some(t => t.includes(term))
    );
  }, [purchases, searchTerm]);

  const updateStatus = async (id, status, userEmail) => {
    await updateDoc(doc(db, getColPath('purchases'), id), { status });
    // Simulate Email
    console.log(`[EMAIL] To ${userEmail}: Status updated to ${status}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Comprobantes y Pagos</h2>
      </div>

      <Card className="p-4 mb-6">
         <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2">
            <Search className="text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, correo, teléfono o boleto..." 
              className="bg-transparent border-none outline-none w-full text-gray-800"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
      </Card>

      <div className="space-y-4">
        {filtered.map(p => (
          <Card key={p.id} className="p-0 overflow-hidden flex flex-col md:flex-row">
             <div className="w-full md:w-48 h-48 bg-gray-100 flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-200 relative group cursor-pointer" onClick={() => window.open(p.proofUrl, '_blank')}>
                {p.proofUrl ? (
                  <img src={p.proofUrl} alt="Comprobante" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400">Sin comprobante</span>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-medium backdrop-blur-sm">
                  Ver Comprobante
                </div>
             </div>
             <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                   <div className="flex justify-between items-start mb-2">
                     <h3 className="font-semibold text-lg">{p.user.name}</h3>
                     <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                       p.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                       p.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                     }`}>
                       {p.status}
                     </span>
                   </div>
                   <div className="text-sm text-gray-600 space-y-1">
                      <p>📧 {p.user.email} &nbsp; | &nbsp; 📱 {p.user.phone}</p>
                      <p>🎟 Rifa: <span className="font-medium text-gray-900">{p.raffleTitle}</span></p>
                      <p>Boletos: {p.tickets.map(t => <span key={t} className="inline-block bg-gray-100 px-1.5 rounded mx-0.5 text-xs font-mono">{t}</span>)}</p>
                      <p className="font-semibold text-[#0071e3] mt-2 text-lg">Total: {formatCurrency(p.total)}</p>
                   </div>
                </div>
                {p.status === 'PENDING' && (
                  <div className="flex gap-3 mt-6">
                    <Button onClick={() => updateStatus(p.id, 'APPROVED', p.user.email)} className="bg-green-500 hover:bg-green-600 flex-1 !py-2 text-sm shadow-green-500/30">Aprobar Pago</Button>
                    <Button onClick={() => updateStatus(p.id, 'REJECTED', p.user.email)} variant="danger" className="flex-1 !py-2 text-sm shadow-red-500/30">Rechazar</Button>
                  </div>
                )}
                {p.status !== 'PENDING' && (
                  <div className="mt-6 flex justify-end">
                     <Button variant="outline" className="!py-1.5 text-xs" onClick={() => updateStatus(p.id, 'PENDING', p.user.email)}>Deshacer estado</Button>
                  </div>
                )}
             </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 font-medium">No se encontraron registros.</div>
        )}
      </div>
    </div>
  );
};

const AdminConfig = ({ config }) => {
  const [formData, setFormData] = useState(config);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await setDoc(doc(db, getColPath('config'), 'main'), formData);
    setSaving(false);
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold tracking-tight mb-6">Configuración Global</h2>
      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-5">
           <div className="grid grid-cols-2 gap-4">
             <Input label="Nombre del Negocio" value={formData.businessName} onChange={e=>setFormData({...formData, businessName: e.target.value})} />
             <Input label="Texto de Logo (1 Letra + Nombre)" value={formData.logoText} onChange={e=>setFormData({...formData, logoText: e.target.value})} />
           </div>
           <div className="grid grid-cols-2 gap-4">
             <Input label="Teléfono de Contacto" value={formData.contactPhone} onChange={e=>setFormData({...formData, contactPhone: e.target.value})} />
             <Input label="Correo de Contacto" value={formData.contactEmail} onChange={e=>setFormData({...formData, contactEmail: e.target.value})} />
           </div>
           <Input label="Datos Bancarios (Transferencias)" multiline value={formData.bankDetails} onChange={e=>setFormData({...formData, bankDetails: e.target.value})} />
           <Input label="Texto de Promoción" value={formData.promoText} onChange={e=>setFormData({...formData, promoText: e.target.value})} />
           <Input label="Mensaje de Éxito (Post-compra)" multiline value={formData.successMessage} onChange={e=>setFormData({...formData, successMessage: e.target.value})} />
           
           <Button type="submit" className="w-full mt-4" disabled={saving}>
             {saving ? 'Guardando...' : 'Guardar Cambios'}
           </Button>
        </form>
      </Card>
    </div>
  );
};

const AdminLayout = ({ children, navigate }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'raffles', label: 'Rifas', icon: Ticket },
    { id: 'purchases', label: 'Pagos', icon: CreditCard },
    { id: 'config', label: 'Configuración', icon: Settings },
  ];

  const handleLogout = () => {
    signOut(auth);
    navigate('home');
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex">
       {/* Sidebar */}
       <div className="w-64 bg-white border-r border-gray-100 flex flex-col fixed inset-y-0 z-10">
          <div className="h-20 flex items-center px-6 border-b border-gray-100">
             <span className="font-bold text-xl tracking-tight text-[#0071e3]">Admin Panel</span>
          </div>
          <div className="flex-1 py-6 px-4 space-y-2">
             {tabs.map(t => (
               <button 
                 key={t.id} 
                 onClick={() => setActiveTab(t.id)}
                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
                  ${activeTab === t.id ? 'bg-[#0071e3] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
               >
                 <t.icon size={18} /> {t.label}
               </button>
             ))}
          </div>
          <div className="p-4 border-t border-gray-100">
             <button onClick={() => navigate('home')} className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors">
               <Home size={18} /> Volver a la Web
             </button>
             <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors mt-2">
               <LogIn size={18} className="rotate-180" /> Cerrar Sesión
             </button>
          </div>
       </div>
       
       {/* Content */}
       <div className="flex-1 ml-64 p-8">
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

  const navigate = (path, params = {}) => setRoute({ path, params });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
         <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-10 h-10 border-4 border-[#0071e3]/20 border-t-[#0071e3] rounded-full" />
      </div>
    );
  }

  // --- ROUTER LOGIC ---
  let View;
  const isClientRoute = !['admin', 'adminLogin'].includes(route.path);

  switch (route.path) {
    case 'home':
      View = <HomeView raffles={raffles} navigate={navigate} config={config} />;
      break;
    case 'raffle':
      View = <RaffleDetailView raffleId={route.params.id} raffles={raffles} purchases={purchases} config={config} navigate={navigate} />;
      break;
    case 'success':
      View = <SuccessView config={config} navigate={navigate} />;
      break;
    case 'past':
      View = <PastRafflesView raffles={raffles} />;
      break;
    case 'mytickets':
      View = <MyTicketsView purchases={purchases} />;
      break;
    case 'adminLogin':
      View = <AdminLogin navigate={navigate} />;
      break;
    case 'admin':
      if (!isAdmin) {
        setRoute({ path: 'adminLogin', params: {} });
        return null;
      }
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
    default:
      View = <HomeView raffles={raffles} navigate={navigate} config={config} />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans selection:bg-blue-200">
      {isClientRoute && (
        <Header config={config} navigate={navigate} currentRoute={route.path} isAdmin={isAdmin} />
      )}
      
      <AnimatePresence mode="wait">
        <motion.main
          key={route.path + (route.params.id || '')}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className={isClientRoute ? "" : "h-full"}
        >
          {View}
        </motion.main>
      </AnimatePresence>

      {isClientRoute && (
        <footer className="bg-white border-t border-gray-100 py-8 text-center text-gray-500 text-sm mt-auto">
          <p>&copy; {new Date().getFullYear()} {config.businessName}. Todos los derechos reservados.</p>
        </footer>
      )}
    </div>
  );
}