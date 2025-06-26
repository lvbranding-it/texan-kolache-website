import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, onSnapshot, query, where, serverTimestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import { HexColorPicker } from 'react-colorful';
import { ArrowLeft, Plus, Trash2, Mail, BarChart2, Edit, Save, Sun, Moon, AlertTriangle, CheckCircle, Info, LogOut, Star, Copy, MoreVertical, Settings, Users, UtensilsCrossed, ExternalLink } from 'lucide-react';

// --- Made with love by LV Branding --- Developed by Luis Velasquez ---

// --- DEFINITIVE & CORRECT Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyB-iYtKG5SsH7ksXi8IGR1qSu6MFogaBcs",
  authDomain: "texan-kolache-planner.firebaseapp.com",
  projectId: "texan-kolache-planner",
  storageBucket: "texan-kolache-planner.firebasestorage.app",
  messagingSenderId: "416614183877",
  appId: "1:416614183877:web:1b923782bc58af553f91ac"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = 'texan-kolache-website-463600';

const Modal = ({ children, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            {children}
        </div>
    </div>
);

const ConfirmationModal = ({ message, onConfirm, onCancel, confirmText = "Confirm" }) => (
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

const Notification = ({ message, type, onDismiss }) => {
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
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-lg shadow-lg flex items-center ${bgColor} ${textColor} transition-all duration-300 ease-in-out transform animate-fade-in-up`}>
            <Icon className="h-5 w-5 mr-3" />
            <span>{message}</span>
        </div>
    );
};


const App = () => {
    const [page, setPage] = useState(null);
    const [eventId, setEventId] = useState('');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (loading) return;

        const urlParams = new URLSearchParams(window.location.search);
        const eventIdFromUrl = urlParams.get('event');

        if (eventIdFromUrl) {
            setEventId(eventIdFromUrl);
            setPage('guest');
            if (!auth.currentUser || !auth.currentUser.isAnonymous) {
                signInAnonymously(auth).catch(err => setError("Could not sign in guest."));
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
        const basePath = window.location.pathname.split('?')[0];

        if (pageName === 'adminDashboard') {
            localStorage.setItem('adminEventId', id);
        } else if (pageName === 'home' || pageName === 'login') {
            localStorage.removeItem('adminEventId');
        }
        
        try {
            if (pageName === 'guest' && id) {
                 window.history.pushState({ page: pageName, eventId: id }, '', `${basePath}?event=${id}`);
            } else {
                 window.history.pushState({ page: pageName }, '', basePath);
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
    
    // Add popstate listener to handle browser back/forward buttons
    useEffect(() => {
      const handlePopState = (event) => {
        const urlParams = new URLSearchParams(window.location.search);
        const eventIdFromUrl = urlParams.get('event');
        if (eventIdFromUrl) {
          setEventId(eventIdFromUrl);
          setPage('guest');
        } else if (auth.currentUser && !auth.currentUser.isAnonymous) {
          const adminEventId = localStorage.getItem('adminEventId');
          if (adminEventId) {
              setEventId(adminEventId);
              setPage('adminDashboard');
          } else {
              setPage('home');
          }
        } else {
          setPage('login');
        }
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }, []);


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
};

const LoginPage = ({ navigateTo }) => {
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
};

const AdminHomePage = ({ navigateTo, user, handleLogout }) => {
    const [eventName, setEventName] = useState('');
    const [creating, setCreating] = useState(false);
    const [events, setEvents] = useState([]);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        if (!user) return;
        const eventsRef = collection(db, `artifacts/${appId}/public/data/events`);
        const q = query(eventsRef, where("organizerId", "==", user.uid));
        const unsubscribeEvents = onSnapshot(q, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEvents(eventsData);
        }, (err) => setError("Could not fetch your events."));

        return () => unsubscribeEvents();
    }, [user]);

    const handleCreateEvent = async () => {
        if (!eventName.trim()) { setError('Please enter an event name.'); return; }
        setError('');
        setCreating(true);
        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/events`), {
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

    const handleDeleteEvent = async () => {
        if (!deletingId) return;
        const docRef = doc(db, `artifacts/${appId}/public/data/events`, deletingId);
        try {
            await deleteDoc(docRef);
        } catch (err) {
            setError("Failed to delete event.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="min-h-screen flex flex-col" style={{backgroundColor: '#f4ecbf', color: '#571c0f'}}>
             <header className="bg-white/80 backdrop-blur-sm p-4 shadow-md sticky top-0 z-20">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <a href="/" className="flex items-center gap-3">
                        <img src="https://static.wixstatic.com/media/ff471f_f72ef81e410c459aa9a790f65a035129~mv2.png/v1/fill/w_691,h_665,al_c,lg_1,q_90,enc_auto/LV_Branding-Texan-Kolache-Logo.png" alt="Logo" className="h-10"/>
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
                            <ul className="space-y-4">
                                {events.map(event => (
                                    <li key={event.id} className="bg-white p-5 rounded-lg shadow-md text-left flex justify-between items-center">
                                        <div className="flex-grow cursor-pointer" onClick={() => navigateTo('adminDashboard', event.id)}>
                                            <p className="font-bold text-xl" style={{color: '#571c0f'}}>{event.eventName}</p>
                                            <p className="text-sm text-gray-500">Created: {event.createdAt?.toDate().toLocaleDateString() || 'Recently'}</p>
                                        </div>
                                        <button onClick={() => setDeletingId(event.id)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors">
                                          <Trash2 size={20}/>
                                        </button>
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
            {deletingId && (
                <ConfirmationModal 
                    message="This will permanently delete the event and all its data. This action cannot be undone."
                    onConfirm={handleDeleteEvent}
                    onCancel={() => setDeletingId(null)}
                    confirmText="Delete Event"
                />
            )}
            <footer className="text-center py-4 text-sm w-full" style={{color: '#571c0f'}}>
                <p className="opacity-80">All Rights Reserved by Texan Kolache LLC</p>
                <p className="opacity-80">Made With Love By: <a href="https://www.lvbranding.com" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">LV Branding</a></p>
            </footer>
        </div>
    );
};

const AdminDashboard = ({ navigateTo, eventId, user, handleLogout }) => {
    const [eventData, setEventData] = useState(null);
    const [guests, setGuests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('guests');
    const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

    const eventDocRef = doc(db, `artifacts/${appId}/public/data/events`, eventId);

    useEffect(() => {
        const unsubscribeEvent = onSnapshot(eventDocRef, (doc) => {
            if (doc.exists()) {
                setEventData({ id: doc.id, ...doc.data() });
            } else {
                setError("Event not found.");
            }
            setLoading(false);
        }, (err) => {
            setError("Failed to load event data.");
            setLoading(false);
        });

        const guestsColRef = collection(db, `artifacts/${appId}/public/data/events/${eventId}/guests`);
        const unsubscribeGuests = onSnapshot(guestsColRef, (snapshot) => {
            const guestsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGuests(guestsData);
        }, (err) => {
            console.error("Failed to load guests:", err);
        });

        return () => {
            unsubscribeEvent();
            unsubscribeGuests();
        };
    }, [eventId]);
    
    const copyGuestLink = () => {
        const url = `${window.location.origin}${window.location.pathname}?event=${eventId}`;
        navigator.clipboard.writeText(url).then(() => {
            setNotification({ show: true, message: 'Link copied to clipboard!', type: 'success' });
        }).catch(err => {
            setNotification({ show: true, message: 'Failed to copy link.', type: 'error' });
        });
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen" style={{backgroundColor: eventData?.colors?.background || '#f4ecbf', color: eventData?.colors?.text || '#571c0f'}}>Loading Event...</div>;
    if (error) return <div className="flex items-center justify-center min-h-screen bg-red-50 text-red-700">{error}</div>;
    if (!eventData) return null;
    
    const { eventName, colors } = eventData;
    const textColor = colors?.text || '#571c0f';

    return (
        <div className="min-h-screen flex flex-col" style={{backgroundColor: colors?.background || '#f4ecbf', color: textColor}}>
            <header className="bg-white/80 backdrop-blur-sm p-4 shadow-md sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigateTo('home')} className="flex items-center gap-2 font-semibold hover:opacity-70 transition-opacity">
                            <ArrowLeft size={18} /> Back to Events
                        </button>
                        <h1 className="text-xl font-bold hidden sm:block">{eventName}</h1>
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={copyGuestLink} className="flex items-center gap-2 font-semibold text-sm p-2 rounded-lg hover:bg-gray-200 transition-colors">
                          <ExternalLink size={16} /> Share Link
                      </button>
                      <button onClick={handleLogout} className="flex items-center gap-2 font-semibold hover:text-red-500 transition-colors">
                          <LogOut size={18} /> Logout
                      </button>
                    </div>
                </div>
            </header>

            <main className="flex-grow p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-6">
                        <div className="sm:hidden mb-4">
                           <h1 className="text-2xl font-bold">{eventName}</h1>
                        </div>
                        <div className="border-b border-gray-300/50">
                            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                <button onClick={() => setActiveTab('guests')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'guests' ? `border-amber-500 text-amber-600` : `border-transparent hover:border-gray-300`}`}>
                                    <Users className="inline-block mr-2" size={16}/> Guest List ({guests.length})
                                </button>
                                <button onClick={() => setActiveTab('menu')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'menu' ? `border-amber-500 text-amber-600` : `border-transparent hover:border-gray-300`}`}>
                                    <UtensilsCrossed className="inline-block mr-2" size={16}/> Menu Editor
                                </button>
                            </nav>
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-8 rounded-2xl shadow-lg" style={{backgroundColor: colors.cardBg || '#FFFFFF'}}>
                        {activeTab === 'guests' && <GuestList guests={guests} eventId={eventId} />}
                        {activeTab === 'menu' && <MenuEditor eventId={eventId} initialMenu={eventData.menu} />}
                    </div>
                </div>
            </main>
            {notification.show && <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification({ ...notification, show: false })} />}
        </div>
    );
};

const GuestList = ({ guests, eventId }) => {
    const [deletingId, setDeletingId] = useState(null);

    const handleDeleteGuest = async () => {
        if (!deletingId) return;
        const guestDocRef = doc(db, `artifacts/${appId}/public/data/events/${eventId}/guests`, deletingId);
        try {
            await deleteDoc(guestDocRef);
        } catch (error) {
            console.error("Error deleting guest:", error);
        } finally {
            setDeletingId(null);
        }
    };
    
    if (guests.length === 0) {
        return <div className="text-center py-12"><p>No guests have RSVP'd yet.</p></div>
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selections</th>
                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Delete</span></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {guests.map(guest => (
                        <tr key={guest.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{guest.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{guest.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {guest.foodSelection?.map(item => item.name).join(', ') || 'None'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button onClick={() => setDeletingId(guest.id)} className="text-red-600 hover:text-red-900"><Trash2 size={16}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {deletingId && (
                <ConfirmationModal 
                    message="Are you sure you want to remove this guest from the list?"
                    onConfirm={handleDeleteGuest}
                    onCancel={() => setDeletingId(null)}
                    confirmText="Delete Guest"
                />
            )}
        </div>
    );
};

const MenuEditor = ({ eventId, initialMenu }) => {
    const [menu, setMenu] = useState(initialMenu || { categories: [] });
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
    
    const eventDocRef = doc(db, `artifacts/${appId}/public/data/events`, eventId);

    const handleSaveMenu = async () => {
        setSaving(true);
        try {
            await updateDoc(eventDocRef, { menu });
            setNotification({ show: true, message: 'Menu saved successfully!', type: 'success' });
        } catch (error) {
            setNotification({ show: true, message: 'Failed to save menu.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const addCategory = () => {
        const newCategory = { id: Date.now().toString(), name: 'New Category', items: [] };
        setMenu(prev => ({ ...prev, categories: [...prev.categories, newCategory] }));
    };

    const updateCategoryName = (catId, newName) => {
        setMenu(prev => ({
            ...prev,
            categories: prev.categories.map(cat => cat.id === catId ? { ...cat, name: newName } : cat)
        }));
    };

    const deleteCategory = (catId) => {
        setMenu(prev => ({
            ...prev,
            categories: prev.categories.filter(cat => cat.id !== catId)
        }));
    };

    const addItem = (catId) => {
        const newItem = { id: Date.now().toString(), name: 'New Item', description: '' };
        setMenu(prev => ({
            ...prev,
            categories: prev.categories.map(cat => 
                cat.id === catId ? { ...cat, items: [...cat.items, newItem] } : cat
            )
        }));
    };

    const updateItem = (catId, itemId, field, value) => {
        setMenu(prev => ({
            ...prev,
            categories: prev.categories.map(cat => 
                cat.id === catId 
                    ? { ...cat, items: cat.items.map(item => item.id === itemId ? { ...item, [field]: value } : item) } 
                    : cat
            )
        }));
    };

    const deleteItem = (catId, itemId) => {
        setMenu(prev => ({
            ...prev,
            categories: prev.categories.map(cat => 
                cat.id === catId 
                    ? { ...cat, items: cat.items.filter(item => item.id !== itemId) } 
                    : cat
            )
        }));
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Menu Structure</h3>
                <button onClick={handleSaveMenu} disabled={saving} style={{backgroundColor: '#faa31b'}} className="text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 transition flex items-center">
                    <Save size={16} className="mr-2"/> {saving ? 'Saving...' : 'Save Menu'}
                </button>
            </div>

            <div className="space-y-6">
                {menu.categories.map(category => (
                    <div key={category.id} className="p-4 border rounded-lg bg-gray-50/50">
                        <div className="flex justify-between items-center mb-4">
                             <input 
                                type="text" 
                                value={category.name}
                                onChange={e => updateCategoryName(category.id, e.target.value)}
                                className="font-bold text-lg bg-transparent border-b-2 border-transparent focus:border-amber-500 focus:outline-none"
                            />
                            <button onClick={() => deleteCategory(category.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-100"><Trash2 size={16}/></button>
                        </div>
                        <div className="space-y-2 pl-4">
                            {category.items.map(item => (
                                <div key={item.id} className="flex items-center gap-2">
                                    <input 
                                        type="text"
                                        placeholder="Item Name"
                                        value={item.name}
                                        onChange={e => updateItem(category.id, item.id, 'name', e.target.value)}
                                        className="flex-grow p-2 border rounded-md"
                                    />
                                    <button onClick={() => deleteItem(category.id, item.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => addItem(category.id)} className="mt-4 text-sm font-semibold text-amber-600 hover:text-amber-800 flex items-center gap-1">
                            <Plus size={16}/> Add Item
                        </button>
                    </div>
                ))}
            </div>

            <button onClick={addCategory} className="mt-6 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2" style={{backgroundColor: '#571c0f'}}>
                <Plus size={16}/> Add Category
            </button>

            {notification.show && <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification({ ...notification, show: false })} />}
        </div>
    );
};


const GuestPage = ({ eventId, userId }) => {
    const [eventData, setEventData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [selectedFood, setSelectedFood] = useState([]);
    
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

    useEffect(() => {
        if (!eventId) {
            setError("No event specified.");
            setLoading(false);
            return;
        }

        const eventDocRef = doc(db, `artifacts/${appId}/public/data/events`, eventId);
        const unsubscribe = onSnapshot(eventDocRef, (doc) => {
            if (doc.exists()) {
                setEventData({ id: doc.id, ...doc.data() });
            } else {
                setError("This event does not exist or may have been cancelled.");
            }
            setLoading(false);
        }, (err) => {
            setError("Could not load the event details. Please try again later.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [eventId]);

    // This is the fixed handler function
    const handleFoodSelection = (item, categoryName) => {
        setSelectedFood(prev => {
            const isSelected = prev.some(selectedItem => selectedItem.id === item.id);

            if (isSelected) {
                // Deselect the item
                return prev.filter(selectedItem => selectedItem.id !== item.id);
            } else {
                // Check if the selection limit is reached
                if (prev.length >= 2) {
                    setNotification({ show: true, message: 'You can only select up to two items.', type: 'info' });
                    return prev; // Return previous state without changes
                }
                // Add the new item
                return [...prev, { ...item, category: categoryName }];
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!guestName.trim() || !guestEmail.trim()) {
            setNotification({ show: true, message: 'Please enter your name and email.', type: 'error' });
            return;
        }
        if (selectedFood.length === 0) {
            setNotification({ show: true, message: 'Please make a food selection.', type: 'error' });
            return;
        }
        
        setIsSubmitting(true);
        try {
            const guestRef = collection(db, `artifacts/${appId}/public/data/events/${eventId}/guests`);
            await addDoc(guestRef, {
                name: guestName,
                email: guestEmail,
                foodSelection: selectedFood,
                submittedAt: serverTimestamp(),
                guestUserId: userId
            });
            setIsSubmitted(true);
        } catch (err) {
            setNotification({ show: true, message: 'There was an error submitting your RSVP.', type: 'error' });
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };


    if (loading) return <div className="flex items-center justify-center min-h-screen" style={{backgroundColor: '#f4ecbf', color: '#571c0f'}}>Loading Event...</div>;
    if (error) return <div className="flex flex-col gap-4 items-center justify-center min-h-screen p-4 text-center" style={{backgroundColor: '#f4ecbf', color: '#571c0f'}}>
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-bold">An Error Occurred</h2>
        <p>{error}</p>
    </div>;
    
    const { eventName, logoUrl, colors, menu } = eventData;
    const { primary, background, text, cardBg } = colors;

    if (isSubmitted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: background, color: text }}>
                <div className="w-full max-w-lg mx-auto text-center bg-white/80 p-10 rounded-2xl shadow-xl" style={{ backgroundColor: cardBg }}>
                    <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                    <h1 className="text-3xl font-bold mt-6 mb-2">Thank You, {guestName}!</h1>
                    <p className="text-lg mb-6">Your selection has been received.</p>
                    <div className="text-left bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-bold mb-2">Your Selections:</h3>
                        <ul className="list-disc list-inside">
                            {selectedFood.map(item => <li key={item.id}>{item.name}</li>)}
                        </ul>
                    </div>
                </div>
                <footer className="text-center mt-12 py-4 text-sm" style={{color: text}}>
                    <p className="opacity-80">All Rights Reserved by Texan Kolache LLC</p>
                </footer>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center p-4" style={{ backgroundColor: background, color: text }}>
            <div className="w-full max-w-lg mx-auto text-center">
                <img src={logoUrl} alt={`${eventName} Logo`} className="mx-auto h-24 w-auto mb-6"/>
                <h1 className="text-4xl font-extrabold mb-2">{eventName}</h1>
                <p className="text-lg mb-8">Welcome! Please make your selection below.</p>

                <form onSubmit={handleSubmit} className="bg-white/80 p-8 rounded-2xl shadow-xl text-left space-y-6" style={{ backgroundColor: cardBg }}>
                    <div>
                        <h2 className="text-xl font-bold mb-3" style={{color: text}}>Your Information</h2>
                        <div className="space-y-4">
                            <input type="text" placeholder="Your Name" value={guestName} onChange={e => setGuestName(e.target.value)} required className="w-full px-4 py-3 border rounded-lg bg-gray-100 focus:outline-none focus:ring-2 text-gray-800" style={{'--tw-ring-color': primary}}/>
                            <input type="email" placeholder="Your Email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} required className="w-full px-4 py-3 border rounded-lg bg-gray-100 focus:outline-none focus:ring-2 text-gray-800" style={{'--tw-ring-color': primary}}/>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold mb-1" style={{color: text}}>Food Selection</h2>
                        <p className="text-sm text-gray-500 mb-4">Please select up to two items.</p>
                        
                        <div className="space-y-4">
                           {(menu?.categories || []).map(category => (
                               <div key={category.id}>
                                   <h3 className="font-bold text-lg mb-2" style={{color: text}}>{category.name}</h3>
                                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                       {(category.items || []).map(item => {
                                           const isSelected = selectedFood.some(i => i.id === item.id);
                                           return (
                                               <button 
                                                   type="button" 
                                                   key={item.id}
                                                   onClick={() => handleFoodSelection(item, category.name)}
                                                   className={`p-4 rounded-lg text-left transition-all duration-200 border-2 ${isSelected ? 'border-transparent ring-2' : ''}`}
                                                   style={{
                                                        backgroundColor: isSelected ? primary : '#F3F4F6', 
                                                        color: isSelected ? 'white' : text,
                                                        '--tw-ring-color': primary,
                                                        borderColor: isSelected ? primary : 'transparent'
                                                    }}
                                               >
                                                   <span className="font-semibold block">{item.name}</span>
                                               </button>
                                           )
                                       })}
                                   </div>
                               </div>
                           ))}
                           {(!menu || !menu.categories || menu.categories.length === 0) && (
                              <p className="text-center text-gray-500 py-4">The menu is not available yet. Please check back later.</p>
                           )}
                        </div>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 transition" style={{backgroundColor: primary}}>
                        {isSubmitting ? 'Submitting...' : 'Submit My Selection'}
                    </button>
                </form>
            </div>
            {notification.show && <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification({ ...notification, show: false })} />}
             <footer className="text-center mt-12 py-4 text-sm" style={{color: text}}>
                <p className="opacity-80">All Rights Reserved by Texan Kolache LLC</p>
                <p className="opacity-80">Made With Love By: <a href="https://www.lvbranding.com" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">LV Branding</a></p>
            </footer>
        </div>
    );
};

export default App;
