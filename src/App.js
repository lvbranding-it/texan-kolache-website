import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, addDoc, onSnapshot, query, where, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { HexColorPicker } from 'react-colorful';
import { ArrowLeft, Plus, Trash2, Mail, BarChart2, Edit, Save, AlertTriangle, CheckCircle, Info, LogOut, Star, Copy, MoreVertical } from 'lucide-react';

// --- Made with love by LV Branding --- Developed by Luis Velasquez ---

// --- Firebase Initialization ---
let app, db, auth, appId;
let firebaseInitializationError = null;

try {
  const firebaseConfig = {
    apiKey: process.env.REACT_APP_API_KEY,
    authDomain: process.env.REACT_APP_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_PROJECT_ID,
    storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_APP_ID,
  };

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error("Firebase configuration is missing from environment variables. Please check your Vercel project settings.");
  }
  
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  appId = firebaseConfig.projectId;

} catch (e) {
  console.error("FATAL: Firebase initialization failed.", e);
  firebaseInitializationError = e.message;
}


function Modal({ children, onClose }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
}

function ConfirmationModal({ message, onConfirm, onCancel, confirmText = "Confirm" }) {
    return (
        <Modal onClose={onCancel}>
            <div className="text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
                <h3 className="text-lg font-medium text-gray-900 mt-2">Are you sure?</h3>
                <div className="mt-2">
                    <p className="text-sm text-gray-500">{message}</p>
                </div>
            </div>
            <div className="mt-5 sm:mt-6 flex justify-center gap-4">
                <button onClick={onCancel} type="button" className="inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm">
                    Cancel
                </button>
                <button onClick={onConfirm} type="button" className="inline-flex justify-center rounded-md border border-transparent px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm">
                    {confirmText}
                </button>
            </div>
        </Modal>
    );
}

function Notification({ message, type, onDismiss }) {
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(), 4000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    const typeStyles = {
        success: { bgColor: 'bg-green-100', textColor: 'text-green-800', Icon: CheckCircle },
        error: { bgColor: 'bg-red-100', textColor: 'text-red-800', Icon: AlertTriangle },
        info: { bgColor: 'bg-blue-100', textColor: 'text-blue-800', Icon: Info }
    };
    const { bgColor, textColor, Icon } = typeStyles[type] || typeStyles.info;
    return (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-lg shadow-lg flex items-center ${bgColor} ${textColor}`}>
            <Icon className="h-5 w-5 mr-3" />
            <span>{message}</span>
        </div>
    );
}

export default function App() {
    const [page, setPage] = useState(null);
    const [eventId, setEventId] = useState('');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (firebaseInitializationError) {
            setLoading(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (loading || firebaseInitializationError) return; 

        const urlParams = new URLSearchParams(window.location.search);
        const eventIdFromUrl = urlParams.get('event');

        if (eventIdFromUrl) {
            if (!user) {
                signInAnonymously(auth).catch(err => {
                    console.error("Anonymous sign-in failed", err);
                    setError("Could not connect to the event service.");
                });
            } else {
                setPage('guest');
                setEventId(eventIdFromUrl);
            }
        } else {
            if (user && !user.isAnonymous) {
                const adminEventId = localStorage.getItem('adminEventId');
                if (adminEventId) {
                    setPage('adminDashboard');
                    setEventId(adminEventId);
                } else {
                    setPage('home');
                }
            } else {
                setPage('login');
            }
        }
    }, [user, loading]);

    const navigateTo = (pageName, id = '') => {
        setEventId(id);
        if (pageName === 'adminDashboard') {
            localStorage.setItem('adminEventId', id);
        } else if (pageName === 'home' || pageName === 'login') {
            localStorage.removeItem('adminEventId');
        }
        
        const basePath = '/';
        try {
            if (pageName === 'guest' && id) {
                 window.history.pushState({}, '', `${basePath}?event=${id}`);
            } else if (pageName !== 'login') {
                 window.history.pushState({}, '', basePath);
            }
        } catch (e) {
            console.warn("Could not push state to history:", e);
        }
        setPage(pageName);
    };

    const handleLogout = async () => {
        await signOut(auth);
        navigateTo('login');
    };
    
    if (firebaseInitializationError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4">
                <div className="bg-white p-8 rounded-lg shadow-xl text-center">
                    <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
                    <h1 className="text-xl font-bold text-red-800 mt-4">Application Error</h1>
                    <p className="text-red-600 mt-2">Could not connect to the backend services.</p>
                    <p className="text-xs text-gray-500 mt-4 font-mono">{firebaseInitializationError}</p>
                </div>
            </div>
        );
    }

    if (loading || !page) {
        return <div className="flex items-center justify-center min-h-screen" style={{backgroundColor: '#f4ecbf', color: '#571c0f'}}>Loading Application...</div>;
    }

    return (
        <div className="font-sans antialiased">
            {error && <div className="bg-red-500 text-white p-4 text-center fixed top-0 left-0 w-full z-50">{error}</div>}
            
            {page === 'login' && <LoginPage navigateTo={navigateTo} />}
            {page === 'home' && <AdminHomePage navigateTo={navigateTo} user={user} handleLogout={handleLogout} />}
            {page === 'adminDashboard' && <AdminDashboard navigateTo={navigateTo} eventId={eventId} user={user} handleLogout={handleLogout} />}
            {page === 'guest' && <GuestPage eventId={eventId} userId={user?.uid} />}
        </div>
    );
}

function LoginPage({ navigateTo }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigateTo('home');
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{backgroundColor: '#f9f6e8', color: '#571c0f'}}>
            <div className="w-full max-w-md mx-auto text-center">
                <a href="/" className="mb-6 inline-block">
                    <img 
                        src="https://static.wixstatic.com/media/ff471f_f72ef81e410c459aa9a790f65a035129~mv2.png/v1/fill/w_691,h_665,al_c,lg_1,q_90,enc_auto/LV_Branding-Texan-Kolache-Logo.png" 
                        alt="Texan Kolache Logo" 
                        className="mx-auto h-24 w-auto"
                        onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/200x200/f9f6e8/571c0f?text=Logo'; }}
                    />
                </a>
                <h1 className="text-3xl font-bold mb-6">Event Planner Admin Login</h1>
                <div className="bg-white p-8 rounded-2xl shadow-xl text-left">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label htmlFor="email" className="block text-sm font-bold mb-2" style={{color: '#571c0f'}}>Email Address</label>
                            <input id="email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 border rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-800" required />
                        </div>
                        <div className="mb-6">
                            <label htmlFor="password" className="block text-sm font-bold mb-2" style={{color: '#571c0f'}}>Password</label>
                            <input id="password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 border rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-800" required />
                        </div>
                        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                        <button type="submit" disabled={loading} style={{backgroundColor: '#faa31b'}} className="w-full text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 transition">
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>
                    <p className="text-xs text-center mt-4" style={{color: '#571c0f', opacity: 0.8}}>New user accounts must be created by an administrator.</p>
                </div>
            </div>
             <footer className="text-center mt-12 py-4 text-sm" style={{color: '#571c0f'}}>
                <p className="opacity-80">All Rights Reserved by Texan Kolache LLC</p>
                <p className="opacity-80">Made With Love By: <a href="https://www.lvbranding.com" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">LV Branding</a></p>
            </footer>
        </div>
    );
}

function AdminHomePage({ navigateTo, user, handleLogout }) {
    const [eventName, setEventName] = useState('');
    const [creating, setCreating] = useState(false);
    const [events, setEvents] = useState([]);
    const [selections, setSelections] = useState({});
    const [error, setError] = useState('');
    const [showConfirm, setShowConfirm] = useState(null);
    const [showMenu, setShowMenu] = useState(null);

    useEffect(() => {
        if (!user || !db) return;
    
        const eventsRef = collection(db, 'artifacts', appId, 'public', 'data', 'events');
        const q = query(eventsRef, where("organizerId", "==", user.uid));
    
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEvents(eventsData);
            setError(''); 
        }, (err) => {
            console.error("Error with event listener:", err);
            setError("Could not connect to the event database. This is likely a Firestore Security Rules issue.");
        });
    
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!events.length || !db) {
            setSelections({});
            return;
        };

        const unsubscribers = events.map(event => {
            const selectionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'events', event.id, 'selections');
            return onSnapshot(selectionsRef, (snapshot) => {
                const selectionsData = snapshot.docs.map(doc => doc.data());
                setSelections(prev => ({ ...prev, [event.id]: selectionsData }));
            }, (err) => {
                console.error(`Error fetching selections for event ${event.id}:`, err);
            });
        });

        return () => unsubscribers.forEach(unsub => unsub());
    }, [events]);

    const handleDuplicateEvent = async (eventToCopy) => {
        const { id, createdAt, ...restOfEvent } = eventToCopy;
        const newEventName = `${restOfEvent.eventName} (Copy)`;
        try {
            const eventsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'events');
            await addDoc(eventsCollectionRef, {
                ...restOfEvent,
                eventName: newEventName,
                createdAt: serverTimestamp(),
            });
        } catch (e) { console.error("Error duplicating event: ", e); }
    };
    
    const handleDeleteEvent = async (eventIdToDelete) => {
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', eventIdToDelete));
        } catch (e) { console.error("Error deleting event: ", e); }
        setShowConfirm(null);
    };

    const handleCreateEvent = async () => {
        if (!eventName.trim()) { setError('Please enter an event name.'); return; }
        setError('');
        setCreating(true);
        try {
            const eventsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'events');
            await addDoc(eventsCollectionRef, {
                eventName,
                organizerId: user.uid,
                logoUrl: 'https://static.wixstatic.com/media/ff471f_f72ef81e410c459aa9a790f65a035129~mv2.png/v1/fill/w_691,h_665,al_c,lg_1,q_90,enc_auto/LV_Branding-Texan-Kolache-Logo.png',
                colors: { primary: '#faa31b', background: '#f4ecbf', text: '#571c0f', cardBg: '#FFFFFF' },
                menu: { categories: [] },
                createdAt: serverTimestamp(),
            });
            setEventName('');
        } catch (error) { setError('Failed to create event. Please try again.'); }
        finally { setCreating(false); }
    };

    const calculateTopItems = (eventSelections, eventMenu) => {
        if (!eventSelections || !eventMenu || !eventMenu.categories) return [];
        const counts = {};
        eventSelections.forEach(sel => {
            if (sel.selection) {
                Object.values(sel.selection).forEach(itemName => {
                    counts[itemName] = (counts[itemName] || 0) + 1;
                });
            }
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    };

    return (
        <div className="min-h-screen flex flex-col" style={{backgroundColor: '#f4ecbf', color: '#571c0f'}}>
             <header className="bg-white/80 backdrop-blur-sm p-4 shadow-md sticky top-0 z-20">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <a href="/" className="flex items-center gap-3">
                        <img src="https://static.wixstatic.com/media/ff471f_f72ef81e410c459aa9a790f65a035129~mv2.png/v1/fill/w_691,h_665,al_c,lg_1,q_90,enc_auto/LV_Branding-Texan-Kolache-Logo.png" alt="Logo" className="h-10" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/100x40/f9f6e8/571c0f?text=Logo'; }}/>
                        <span className="font-bold text-lg">Event Planner</span>
                    </a>
                    <button onClick={handleLogout} className="flex items-center gap-2 font-semibold hover:text-red-500 transition-colors">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </header>
            <main className="p-4 md:p-8 flex-grow flex flex-col items-center">
                <div className="w-full max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl font-extrabold mb-8">Event Dashboard</h1>
                    <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg text-left mb-12">
                        <h3 className="text-xl font-bold mb-4 text-center" style={{color: '#571c0f'}}>Create a New Event</h3>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Enter new event name" className="flex-grow w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-gray-800"/>
                            <button onClick={handleCreateEvent} disabled={creating} style={{ backgroundColor: '#faa31b' }} className="w-full sm:w-auto text-white font-bold py-3 px-6 rounded-lg hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center">
                                {creating ? 'Creating...' : <> <Plus className="mr-2" size={20} /> Create Event</>}
                            </button>
                        </div>
                        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
                    </div>
                    <div className="w-full">
                        <h3 className="text-2xl font-bold mb-4 text-center">Your Events</h3>
                        {events.length > 0 ? (
                            <ul className="space-y-6">
                                {events.map(event => (
                                    <li key={event.id} className="bg-white p-5 rounded-lg shadow-md text-left">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-grow cursor-pointer" onClick={() => navigateTo('adminDashboard', event.id)}>
                                                <p className="font-bold text-xl" style={{color: '#571c0f'}}>{event.eventName}</p>
                                                <p className="text-sm text-gray-500">Created: {event.createdAt?.toDate().toLocaleDateString() || 'Recently'}</p>
                                            </div>
                                            <div className="relative flex-shrink-0">
                                                 <button onClick={() => setShowMenu(showMenu === event.id ? null : event.id)} className="p-2 hover:bg-gray-100 rounded-full"><MoreVertical size={20}/></button>
                                                 {showMenu === event.id && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                                                        <button onClick={() => {navigateTo('adminDashboard', event.id); setShowMenu(null);}} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"><Edit size={14}/> Edit</button>
                                                        <button onClick={() => {handleDuplicateEvent(event); setShowMenu(null);}} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"><Copy size={14}/> Duplicate</button>
                                                        <button onClick={() => {setShowConfirm(event.id); setShowMenu(null);}} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14}/> Delete</button>
                                                    </div>
                                                 )}
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <h4 className="font-semibold text-sm mb-2" style={{color: '#571c0f'}}>Summary</h4>
                                            <p className="text-sm">Total Submissions: <span className="font-bold">{selections[event.id]?.length || 0}</span></p>
                                            <div className="text-sm">Top Items:
                                                {calculateTopItems(selections[event.id], event.menu).length > 0 ? (
                                                    <ol className="list-decimal list-inside text-gray-600">
                                                        {calculateTopItems(selections[event.id], event.menu).map(([name, count]) => <li key={name}>{name} ({count})</li>)}
                                                    </ol>
                                                ) : <span className="text-gray-500"> No selections yet.</span>}
                                            </div>
                                        </div>
                                         {showConfirm === event.id && <ConfirmationModal message="Are you sure you want to delete this event? This will permanently delete the event and all its selections." onConfirm={() => handleDeleteEvent(event.id)} onCancel={() => setShowConfirm(null)} confirmText="Yes, Delete Event"/>}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="bg-white/50 text-center p-8 rounded-lg">
                                <p style={{color: '#571c0f'}}>You haven't created any events yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <footer className="text-center py-4 text-sm w-full" style={{color: '#571c0f'}}>
                <p className="opacity-80">All Rights Reserved by Texan Kolache LLC</p>
                <p className="opacity-80">Made With Love By: <a href="https://www.lvbranding.com" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">LV Branding</a></p>
            </footer>
        </div>
    );
}


function AdminDashboard({ navigateTo, eventId, user, handleLogout }) {
    const [eventData, setEventData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selections, setSelections] = useState([]);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
    };

    useEffect(() => {
        if (!eventId || !user || !db) return;
        const eventDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'events', eventId);
        const unsubscribeEvent = onSnapshot(eventDocRef, (doc) => {
            if (doc.exists()) {
                setEventData({ id: doc.id, ...doc.data() });
            } else { console.error("Event not found!"); }
            setLoading(false);
        }, (err) => {
             console.error("Error fetching event dashboard data:", err);
             setLoading(false);
        });

        const selectionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'events', eventId, 'selections');
        const unsubscribeSelections = onSnapshot(selectionsRef, (snapshot) => {
            setSelections(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
        }, (err) => {
            console.error("Error fetching selections for dashboard:", err);
        });

        return () => {
            unsubscribeEvent();
            unsubscribeSelections();
        };
    }, [eventId, user]);

    const guestLink = `${window.location.origin}/?event=${eventId}`;


    if (loading) return <div className="flex items-center justify-center min-h-screen" style={{backgroundColor: '#f4ecbf'}}>Loading Event...</div>;
    if (!eventData) return <div className="text-center p-8">Event not found. <button onClick={() => navigateTo('home')} className="text-blue-500">Go Home</button></div>;

    return (
        <>
            {notification.show && <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification({ ...notification, show: false })} />}
            <div className="min-h-screen" style={{backgroundColor: '#f4ecbf'}}>
                <header className="bg-white/80 backdrop-blur-sm p-4 shadow-md">
                    <div className="max-w-6xl mx-auto flex justify-between items-center">
                        <button onClick={() => navigateTo('home')} className="flex items-center gap-2 font-semibold hover:opacity-80 transition-opacity" style={{color: '#571c0f'}}>
                            <ArrowLeft size={18} /> Back to Dashboard
                        </button>
                        <button onClick={handleLogout} className="flex items-center gap-2 font-semibold hover:text-red-500 transition-colors" style={{color: '#571c0f'}}>
                            <LogOut size={18} /> Logout
                        </button>
                    </div>
                </header>
                <main className="p-4 md:p-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
                            <h1 className="text-3xl font-bold mb-2" style={{color: '#571c0f'}}>{eventData.eventName}</h1>
                            <p className="text-gray-600">Event Admin Panel</p>
                            <div className="mt-4 p-4 rounded-lg" style={{backgroundColor: 'rgba(250, 163, 27, 0.1)'}}>
                                <label className="font-semibold block mb-2" style={{color: '#571c0f'}}>Guest Invitation Link:</label>
                                <div className="flex items-center gap-2">
                                <input type="text" readOnly value={guestLink} className="w-full p-2 border rounded bg-gray-100"/>
                                <button onClick={() => { 
                                    try {
                                        navigator.clipboard.writeText(guestLink); 
                                        showNotification('Link copied to clipboard!'); 
                                    } catch (err) {
                                        console.error('Failed to copy text: ', err);
                                        showNotification('Failed to copy link.', 'error');
                                    }
                                }} className="text-white px-4 py-2 rounded-lg hover:opacity-90" style={{backgroundColor: '#faa31b'}}>Copy</button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <MenuEditor eventData={eventData} eventId={eventId} showNotification={showNotification} />
                            </div>
                            <div>
                                <CustomizationPanel eventData={eventData} eventId={eventId} user={user} showNotification={showNotification} />
                                <SelectionsSummary selections={selections} />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}

function MenuEditor({ eventData, eventId, showNotification }) {
    const [menu, setMenu] = useState(eventData.menu);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newItem, setNewItem] = useState({ name: '', description: '' });
    const [confirmDelete, setConfirmDelete] = useState({ show: false, type: null, index: null, subIndex: null });

    useEffect(() => {
        setMenu(eventData.menu);
    }, [eventData]);

    const handleSaveMenu = async () => {
        const eventDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'events', eventId);
        try {
            await setDoc(eventDocRef, { menu: menu }, { merge: true });
            showNotification('Menu saved successfully!');
        } catch (error) {
            console.error("Error saving menu: ", error);
            showNotification('Failed to save menu.', 'error');
        }
    };
    
    const addCategory = () => {
        if (!newCategoryName.trim()) return;
        const updatedMenu = {
            ...menu,
            categories: [...(menu.categories || []), { name: newCategoryName, items: [] }]
        };
        setMenu(updatedMenu);
        setNewCategoryName("");
    };

    const confirmDeletion = () => {
        const { type, index, subIndex } = confirmDelete;
        if (type === 'category') {
            const updatedCategories = menu.categories.filter((_, i) => i !== index);
            setMenu({ ...menu, categories: updatedCategories });
        } else if (type === 'item') {
            const updatedCategories = [...menu.categories];
            updatedCategories[index].items = updatedCategories[index].items.filter((_, i) => i !== subIndex);
            setMenu({ ...menu, categories: updatedCategories });
        }
        setConfirmDelete({ show: false, type: null, index: null, subIndex: null });
    };

    const addItem = (catIndex) => {
        if (!newItem.name.trim()) return;
        const updatedCategories = [...menu.categories];
        updatedCategories[catIndex].items.push(newItem);
        setMenu({ ...menu, categories: updatedCategories });
        setNewItem({ name: '', description: '' });
    };

    return (
        <>
            {confirmDelete.show && (
                <ConfirmationModal 
                    message={`Are you sure you want to delete this ${confirmDelete.type}? This action cannot be undone.`}
                    onConfirm={confirmDeletion}
                    onCancel={() => setConfirmDelete({ show: false, type: null, index: null })}
                    confirmText="Delete"
                />
            )}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold flex items-center" style={{color: '#571c0f'}}><Edit className="mr-3" />Menu Editor</h2>
                    <button onClick={handleSaveMenu} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center gap-2"><Save size={18} /> Save Menu</button>
                </div>

                <div className="space-y-6">
                    {menu.categories && menu.categories.map((cat, catIndex) => (
                        <div key={catIndex} className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold" style={{color: '#571c0f'}}>{cat.name}</h3>
                                <button onClick={() => setConfirmDelete({ show: true, type: 'category', index: catIndex })} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                            </div>
                            
                            <div className="space-y-3">
                                {cat.items.map((item, itemIndex) => (
                                    <div key={itemIndex} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                        <div>
                                            <p className="font-semibold" style={{color: '#571c0f'}}>{item.name}</p>
                                            <p className="text-sm text-gray-500">{item.description}</p>
                                        </div>
                                        <button onClick={() => setConfirmDelete({ show: true, type: 'item', index: catIndex, subIndex: itemIndex })} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                                <input name={`newItemName${catIndex}`} type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="New item name" className="flex-grow p-2 border rounded bg-gray-100"/>
                                <input name={`newItemDesc${catIndex}`} type="text" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} placeholder="Description (optional)" className="flex-grow p-2 border rounded bg-gray-100"/>
                                <button onClick={() => addItem(catIndex)} style={{backgroundColor: '#faa31b'}} className="text-white px-3 py-2 rounded-lg hover:opacity-90"><Plus size={18} /></button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 flex gap-2">
                    <input
                        name="newCategory"
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="New category name (e.g., Appetizers)"
                        className="flex-grow p-2 border rounded bg-gray-100"
                    />
                    <button onClick={addCategory} style={{backgroundColor: '#571c0f'}} className="text-white px-4 py-2 rounded-lg hover:opacity-90 font-semibold">Add Category</button>
                </div>
            </div>
        </>
    );
}


function CustomizationPanel({ eventData, eventId, user, showNotification }) {
    const [eventName, setEventName] = useState(eventData.eventName);
    const [colors, setColors] = useState(eventData.colors);
    const [showColorPicker, setShowColorPicker] = useState(null);
    const colorPickerRef = useRef(null);
    
    useEffect(() => {
        function handleClickOutside(event) {
            if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
                setShowColorPicker(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [colorPickerRef]);

    const handleSaveCustomization = async () => {
        const eventDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'events', eventId);
        try {
            await setDoc(eventDocRef, { eventName, colors }, { merge: true });
            showNotification('Customizations saved!');
        } catch (error) {
            showNotification('Failed to save customizations.', 'error');
        }
    };

    const colorFields = [
        { key: 'primary', label: 'Primary' },
        { key: 'background', label: 'Background' },
        { key: 'text', label: 'Text' },
        { key: 'cardBg', label: 'Card' },
    ];
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
            <h2 className="text-2xl font-bold mb-6" style={{color: '#571c0f'}}>Customization</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                    <input name="eventName" type="text" value={eventName} onChange={e => setEventName(e.target.value)} className="w-full p-2 border rounded bg-gray-100"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Logo</label>
                    <img src={eventData.logoUrl} alt="Logo preview" className="h-16 w-16 object-contain border p-1 rounded bg-gray-50" onError={(e) => e.target.src='https://placehold.co/150x50/E2E8F0/4A5568?text=Error'} />
                </div>
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Color Palette</label>
                     <div className="grid grid-cols-2 gap-4">
                         {colorFields.map(({ key, label }) => (
                            <div key={key}>
                                <label className="block text-xs text-gray-500">{label}</label>
                                <div className="relative">
                                    <button onClick={() => setShowColorPicker(key)} className="w-full h-10 rounded border" style={{ backgroundColor: colors[key] }}></button>
                                     {showColorPicker === key && (
                                        <div className="absolute z-10" ref={colorPickerRef}>
                                            <HexColorPicker color={colors[key]} onChange={(newColor) => setColors(c => ({...c, [key]: newColor}))} />
                                        </div>
                                     )}
                                </div>
                            </div>
                         ))}
                     </div>
                </div>
            </div>
             <button onClick={handleSaveCustomization} className="w-full mt-6 bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"><Save size={18} />Save Customization</button>
        </div>
    );
}

function SelectionsSummary({ selections }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
             <h2 className="text-2xl font-bold mb-4 flex items-center" style={{color: '#571c0f'}}><BarChart2 className="mr-3" />Guest Selections</h2>
             {selections.length === 0 ? (
                <p className="text-gray-500">No selections have been made yet.</p>
             ) : (
                <div className="space-y-4">
                    {selections.map(sel => (
                        <div key={sel.id || sel.email} className="text-sm p-3 bg-gray-50 rounded-md border-l-4" style={{borderColor: '#faa31b'}}>
                           <div className="font-bold flex items-center gap-2" style={{color: '#571c0f'}}>
                               {sel.guestName} 
                               {sel.marketingOptIn && <Star size={14} className="text-amber-500 fill-current" title="Marketing Opt-In"/>}
                            </div>
                           <a href={`mailto:${sel.email}`} className="text-gray-600 hover:underline">{sel.email}</a><br/>
                           <a href={`tel:${sel.phone}`} className="text-gray-600 hover:underline">{sel.phone}</a>
                           <div className="mt-2 pt-2 border-t text-xs">
                                {Object.entries(sel.selection || {}).map(([cat, item]) => <div key={cat}><span className="font-semibold">{cat}:</span> {item}</div>)}
                           </div>
                        </div>
                    ))}
                </div>
             )}
        </div>
    );
}


function GuestPage({ eventId, userId }) {
    const [eventData, setEventData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selection, setSelection] = useState({});
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [optIn, setOptIn] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!eventId || !userId || !db) { 
            setLoading(false);
            if (!eventId) setError("No event specified.");
            return;
        };
        
        const eventDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'events', eventId);
        const unsubscribe = onSnapshot(eventDocRef, (doc) => {
            if (doc.exists()) {
                setEventData({ id: doc.id, ...doc.data() });
                setError('');
            } else { setError("Event not found."); }
            setLoading(false);
        }, (err) => {
            console.error("Error fetching guest page data:", err);
            setError("Could not load event data.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, [eventId, userId]);
    
    useEffect(() => {
        if (eventData && eventData.colors) {
            const root = document.documentElement;
            root.style.setProperty('--primary-color', eventData.colors.primary);
            root.style.setProperty('--background-color', eventData.colors.background);
            root.style.setProperty('--text-color', eventData.colors.text);
            root.style.setProperty('--card-bg-color', eventData.colors.cardBg);
        }
    }, [eventData]);

    const handleSelect = (categoryName, itemName) => {
        setSelection(prev => ({ ...prev, [categoryName]: itemName }));
    };

    const handleSubmit = async () => {
        setError('');
        if (!guestName.trim()) { setError('Please enter your full name.'); return; }
        if (!guestEmail.trim() || !/^\S+@\S+\.\S+$/.test(guestEmail)) { setError('Please enter a valid email address.'); return; }
        if (!guestPhone.trim()) { setError('Please enter your phone number.'); return; }

        if (eventData.menu.categories && eventData.menu.categories.length > 0) {
            const requiredCategories = eventData.menu.categories.map(c => c.name);
            for (const cat of requiredCategories) {
                if (!selection[cat]) { setError(`Please make a selection for ${cat}.`); return; }
            }
        }
        
        try {
            const selectionRef = doc(db, 'artifacts', appId, 'public', 'data', 'events', eventId, 'selections', userId);
            await setDoc(selectionRef, {
                guestName,
                email: guestEmail,
                phone: guestPhone,
                marketingOptIn: optIn,
                selection,
                submittedAt: serverTimestamp(),
            });
            setSubmitted(true);
        } catch (err) {
            console.error("Submission Error:", err);
            setError("There was an error submitting your selection. Please try again.");
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen">Loading Event...</div>;
    if (error || !eventData) return (
         <div className="flex flex-col items-center justify-center min-h-screen text-red-500 p-4">
            <p className="mb-4">{error || "This event does not exist or could not be loaded."}</p>
            <a href="/" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Go to Homepage</a>
        </div>
    );
    
    const { eventName, logoUrl, menu } = eventData;

    if (submitted) {
        return (
            <div style={{ backgroundColor: 'var(--background-color)', color: 'var(--text-color)' }} className="min-h-screen flex items-center justify-center p-4">
                <div style={{ backgroundColor: 'var(--card-bg-color)' }} className="max-w-lg w-full text-center p-8 md:p-12 rounded-xl shadow-2xl">
                    <Mail size={48} className="mx-auto mb-4" style={{color: 'var(--primary-color)'}}/>
                    <h1 className="text-3xl font-bold mb-4">Thank You, {guestName}!</h1>
                    <p className="text-lg mb-6">Your food selections have been received.</p>
                    {menu.categories && menu.categories.length > 0 && (
                        <div className="text-left bg-gray-100 p-6 rounded-lg">
                            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Your Selections:</h2>
                            <ul className="space-y-2">
                            {menu.categories.map(cat => (
                                <li key={cat.name}><span className="font-semibold">{cat.name}:</span> {selection[cat.name]}</li>
                            ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: 'var(--background-color)', color: 'var(--text-color)' }} className="min-h-screen p-4 sm:p-6 md:p-8 flex flex-col">
            <div className="max-w-2xl mx-auto w-full flex-grow">
                <header className="text-center mb-8">
                    <img src={logoUrl} alt="Event Logo" className="mx-auto h-20 object-contain mb-4" onError={(e) => e.target.style.display='none'}/>
                    <h1 className="text-4xl md:text-5xl font-extrabold" style={{color: eventData.colors.text}}>{eventName}</h1>
                    <p className="mt-2 text-lg" style={{color: eventData.colors.text, opacity: 0.8}}>Please make your menu selections below.</p>
                </header>

                <div className="mb-8">
                    <div className="p-6 rounded-lg shadow-xl space-y-4" style={{ backgroundColor: 'var(--card-bg-color)' }}>
                        <div>
                            <label htmlFor="guestName" className="text-lg font-semibold block mb-2">Your Full Name</label>
                            <input id="guestName" name="guestName" type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Enter your full name" className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2" style={{borderColor: 'var(--primary-color)', backgroundColor: 'rgba(255,255,255,0.7)', color: 'var(--text-color)' }} required />
                        </div>
                        <div>
                            <label htmlFor="guestEmail" className="text-lg font-semibold block mb-2">Your Email Address</label>
                            <input id="guestEmail" name="guestEmail" type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="Enter your email" className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2" style={{borderColor: 'var(--primary-color)', backgroundColor: 'rgba(255,255,255,0.7)', color: 'var(--text-color)' }} required />
                        </div>
                        <div>
                            <label htmlFor="guestPhone" className="text-lg font-semibold block mb-2">Your Phone Number</label>
                            <input id="guestPhone" name="guestPhone" type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="Enter your phone number" className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2" style={{borderColor: 'var(--primary-color)', backgroundColor: 'rgba(255,255,255,0.7)', color: 'var(--text-color)' }} required />
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {menu.categories && menu.categories.map(category => (
                        <div key={category.name} style={{ backgroundColor: 'var(--card-bg-color)' }} className="rounded-lg shadow-xl overflow-hidden">
                            <h2 className="text-2xl font-bold p-5 text-white" style={{ backgroundColor: 'var(--primary-color)' }}>{category.name}</h2>
                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {category.items.map((item, index) => (
                                    <div
                                        key={index}
                                        onClick={() => handleSelect(category.name, item.name)}
                                        className={`p-4 rounded-lg cursor-pointer border-2 transition-all duration-200 ${selection[category.name] === item.name ? 'border-transparent ring-2' : ''}`}
                                        style={{ 
                                            borderColor: selection[category.name] === item.name ? 'var(--primary-color)' : 'rgba(87, 28, 15, 0.2)',
                                            backgroundColor: selection[category.name] === item.name ? 'rgba(250, 163, 27, 0.1)' : 'transparent',
                                            ringColor: 'var(--primary-color)'
                                         }}
                                    >
                                        <p className="font-bold text-lg">{item.name}</p>
                                        <p className="text-sm opacity-70">{item.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 p-6 rounded-lg shadow-xl" style={{ backgroundColor: 'var(--card-bg-color)' }}>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={optIn} onChange={e => setOptIn(e.target.checked)} className="h-5 w-5 rounded" style={{accentColor: 'var(--primary-color)'}}/>
                        <span className="text-sm">Yes, I'd like to receive special promotions from Texan Kolache.</span>
                    </label>
                </div>

                 {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
                 <div className="mt-10 text-center">
                    <button
                        onClick={handleSubmit}
                        className="text-white font-bold py-4 px-10 rounded-lg text-lg transform hover:scale-105 transition-transform duration-300"
                        style={{backgroundColor: 'var(--primary-color)'}}
                    >
                        Submit My Selection
                    </button>
                </div>
            </div>
             <footer className="text-center mt-12 py-4 text-sm" style={{color: 'var(--text-color)'}}>
                 <p className="opacity-80">All Rights Reserved by Texan Kolache LLC</p>
                <p className="opacity-80">Made With Love By: <a href="https://www.lvbranding.com" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline" style={{color: eventData?.colors?.primary}}>LV Branding</a></p>
            </footer>
        </div>
    );
}
