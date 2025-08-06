import React, { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, getDocs } from 'firebase/firestore';

// --- Ikon (SVG) ---
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const DocumentTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const UserGroupIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;


// Konfigurasi Firebase dari Environment Variables
const firebaseConfig = process.env.REACT_APP_FIREBASE_CONFIG ? JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG) : {};
const appId = process.env.REACT_APP_APP_ID || 'default-app-id';

// Konteks untuk mengelola status pengguna dan aplikasi secara global
const AppContext = createContext();

// Komponen Modal yang dapat digunakan kembali untuk konfirmasi
const Modal = ({ show, title, message, onConfirm, onCancel }) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
                <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
                    >
                        Konfirmasi
                    </button>
                </div>
            </div>
        </div>
    );
};

const AppProvider = ({ children }) => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [username, setUsername] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [users, setUsers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [storeSettings, setStoreSettings] = useState({});
    const [currentPage, setCurrentPage] = useState('dashboard'); // Default ke dashboard
    const [notifications, setNotifications] = useState([]);
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (Object.keys(firebaseConfig).length > 0 && !hasInitialized.current) {
            hasInitialized.current = true;
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const firebaseAuth = getAuth(app);
            setDb(firestore);
            setAuth(firebaseAuth);

            const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    signInAnonymously(firebaseAuth).catch(err => console.error("Anonymous sign-in failed:", err));
                }
                setIsAuthReady(true);
            });

            return () => unsubscribe();
        }
    }, []);

    useEffect(() => {
        if (!db || !isAuthReady) return;

        const setupListeners = async () => {
            const usersRef = collection(db, `artifacts/${appId}/public/data/users`);
            try {
                const querySnapshot = await getDocs(usersRef);
                if (querySnapshot.empty) {
                    await addDoc(usersRef, {
                        username: 'owner',
                        password: '123',
                        role: 'owner',
                        createdAt: new Date().toISOString(),
                        userId: null,
                    });
                }
            } catch (error) {
                console.error("Error checking or creating default user:", error);
            }
            const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
                const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setUsers(allUsers);
                const currentUserData = allUsers.find(u => u.userId === userId);
                if (currentUserData) {
                    setUserRole(currentUserData.role);
                    setUsername(currentUserData.username);
                }
            });

            const ordersRef = collection(db, `artifacts/${appId}/public/data/orders`);
            const productsRef = collection(db, `artifacts/${appId}/public/data/products`);
            const expensesRef = collection(db, `artifacts/${appId}/public/data/expenses`);
            const customersRef = collection(db, `artifacts/${appId}/public/data/customers`);
            const storeSettingsRef = doc(db, `artifacts/${appId}/public/data/storeSettings`, 'main');
            
            const unsubscribeOrders = onSnapshot(ordersRef, (snapshot) => {
                const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setOrders(fetchedOrders);
                // Update notifications
                setNotifications(fetchedOrders.filter(o => o.productionStatus === 'Antrian Desain'));
            });
            const unsubscribeProducts = onSnapshot(productsRef, (snapshot) => setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
            const unsubscribeExpenses = onSnapshot(expensesRef, (snapshot) => setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
            const unsubscribeCustomers = onSnapshot(customersRef, (snapshot) => setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
            
            const unsubscribeStoreSettings = onSnapshot(storeSettingsRef, (doc) => {
                if (doc.exists()) {
                    setStoreSettings(doc.data());
                } else {
                    const defaultSettings = { storeName: 'Toko Printing Anda', address: 'Jl. Contoh No. 123', phone: '081234567890', receiptNotes: 'Terima kasih atas kunjungan Anda!', logoUrl: 'https://placehold.co/200x100/000000/FFFFFF?text=Logo' };
                    setDoc(storeSettingsRef, defaultSettings).catch(err => console.error("Error creating default store settings:", err));
                    setStoreSettings(defaultSettings);
                }
            });

            return () => {
                unsubscribeOrders();
                unsubscribeProducts();
                unsubscribeExpenses();
                unsubscribeUsers();
                unsubscribeCustomers();
                unsubscribeStoreSettings();
            };
        };

        setupListeners();
    }, [db, isAuthReady, userId]);

    const handleLogout = async () => {
        if (!auth || !db || !userId) return;
        try {
            const currentUserDoc = users.find(u => u.userId === userId);
            if (currentUserDoc) {
                const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, currentUserDoc.id);
                await updateDoc(userDocRef, { userId: null });
            }
            await signOut(auth);
            setUserRole(null);
            setUsername(null);
            setCurrentPage('dashboard');
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const value = { db, auth, userId, userRole, username, isAuthReady, orders, products, expenses, users, customers, storeSettings, currentPage, setCurrentPage, notifications, appId, handleLogout };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default function App() {
    return (
        <AppProvider>
            <div className="min-h-screen bg-gray-100 p-4 font-sans">
                <AppContent />
            </div>
        </AppProvider>
    );
}

const AppContent = () => {
    const { isAuthReady, userRole } = useContext(AppContext);
    if (!isAuthReady) return <div className="flex items-center justify-center h-screen text-xl font-semibold text-gray-700">Memuat aplikasi...</div>;
    if (!userRole) return <Login />;
    return (
        <div className="container mx-auto">
            <h1 className="text-4xl font-bold text-center text-gray-800 my-6">Aplikasi Printing</h1>
            <Navbar />
            <div className="mt-8"><MainContent /></div>
        </div>
    );
};

const MainContent = () => {
    const { currentPage } = useContext(AppContext);
    switch (currentPage) {
        case 'dashboard': return <DashboardPage />;
        case 'orders': return <OrdersPage />;
        case 'payments': return <PaymentsPage />;
        case 'customers': return <CustomerPage />;
        case 'expenses': return <ExpensesPage />;
        case 'reports': return <ReportsPage />;
        case 'account-management': return <AccountManagementPage />;
        case 'product-management': return <ProductManagementPage />;
        case 'store-management': return <StoreManagementPage />;
        default: return <DashboardPage />;
    }
};

const Navbar = () => {
    const { userRole, currentPage, setCurrentPage, notifications, handleLogout } = useContext(AppContext);
    const menuItems = [
        { name: 'Dashboard', page: 'dashboard', roles: ['kasir', 'desainer', 'superviser', 'owner'] },
        { name: 'Pesanan', page: 'orders', roles: ['kasir', 'desainer', 'superviser', 'owner'] },
        { name: 'Pembayaran', page: 'payments', roles: ['kasir', 'owner'] },
        { name: 'Pelanggan', page: 'customers', roles: ['kasir', 'superviser', 'owner'] },
        { name: 'Pengeluaran', page: 'expenses', roles: ['kasir', 'superviser', 'owner'] },
        { name: 'Laporan', page: 'reports', roles: ['superviser', 'owner'] },
        { name: 'Manajemen Akun', page: 'account-management', roles: ['owner'] },
        { name: 'Manajemen Produk', page: 'product-management', roles: ['desainer', 'superviser', 'owner'] },
        { name: 'Manajemen Toko', page: 'store-management', roles: ['owner'] },
    ];
    return (
        <nav className="bg-white shadow-lg rounded-lg p-4">
            <ul className="flex flex-wrap justify-center items-center gap-4">
                {menuItems.map((item) => (
                    item.roles.includes(userRole) && (<li key={item.page}><button onClick={() => setCurrentPage(item.page)} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${currentPage === item.page ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>{item.name}</button></li>)
                ))}
                <li className="relative">
                    <button onClick={() => setCurrentPage('orders')} className="p-2 rounded-full hover:bg-gray-200">
                        <BellIcon />
                        {notifications.length > 0 && <span className="absolute top-0 right-0 block h-4 w-4 transform -translate-y-1/2 translate-x-1/2 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{notifications.length}</span>}
                    </button>
                </li>
                <li><button onClick={handleLogout} className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors">Logout</button></li>
            </ul>
        </nav>
    );
};

const Login = () => {
    const { db, appId, userId, isAuthReady, users } = useContext(AppContext);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!db || !isAuthReady) { setError('Aplikasi belum siap. Silakan coba lagi.'); return; }
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            try {
                const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, user.id);
                await setDoc(userDocRef, { ...user, userId }, { merge: true });
            } catch (err) {
                console.error("Failed to update user document on login:", err);
                setError("Login gagal. Silakan coba lagi.");
            }
        } else { setError('Username atau password salah.'); }
    };
    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Login</h2>
                <form onSubmit={handleLogin}>
                    <div className="mb-4"><label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">Username</label><input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" /></div>
                    <div className="mb-6"><label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Password</label><input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" /></div>
                    {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
                    <div className="flex items-center justify-between"><button type="submit" className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors">Masuk</button></div>
                    <div className="mt-4 text-center text-sm text-gray-500"><p>Credentials: </p><p>Username: owner, Password: 123</p></div>
                </form>
            </div>
        </div>
    );
};

const DashboardPage = () => {
    const { orders, products } = useContext(AppContext);

    const today = new Date().setHours(0, 0, 0, 0);
    const salesToday = orders
        .filter(o => new Date(o.createdAt).setHours(0, 0, 0, 0) === today)
        .reduce((sum, o) => sum + o.totalCost, 0);

    const unpaidOrders = orders.filter(o => o.paymentStatus !== 'Lunas').length;

    const itemSales = orders.reduce((acc, order) => {
        try {
            const items = JSON.parse(order.items);
            items.forEach(item => {
                acc[item.productId] = (acc[item.productId] || 0) + (item.quantity || 1);
            });
        } catch (e) { /* ignore parse error */ }
        return acc;
    }, {});

    const bestSellingItems = Object.entries(itemSales)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([productId, quantity]) => {
            const product = products.find(p => p.id === productId);
            return { name: product ? product.name : 'Produk Dihapus', quantity };
        });

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-100 p-6 rounded-lg flex items-center">
                    <ChartBarIcon />
                    <div className="ml-4">
                        <p className="text-gray-600">Penjualan Hari Ini</p>
                        <p className="text-2xl font-bold">Rp {salesToday.toLocaleString('id-ID')}</p>
                    </div>
                </div>
                <div className="bg-green-100 p-6 rounded-lg flex items-center">
                    <DocumentTextIcon />
                    <div className="ml-4">
                        <p className="text-gray-600">Pesanan Belum Lunas</p>
                        <p className="text-2xl font-bold">{unpaidOrders}</p>
                    </div>
                </div>
                <div className="bg-yellow-100 p-6 rounded-lg flex items-center">
                    <UserGroupIcon />
                     <div className="ml-4">
                        <p className="text-gray-600">Total Pesanan Hari Ini</p>
                        <p className="text-2xl font-bold">{orders.filter(o => new Date(o.createdAt).setHours(0, 0, 0, 0) === today).length}</p>
                    </div>
                </div>
            </div>
            <div className="mt-8">
                <h3 className="text-xl font-bold mb-4">Produk Terlaris</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <ul className="space-y-2">
                        {bestSellingItems.map(item => (
                            <li key={item.name} className="flex justify-between">
                                <span>{item.name}</span>
                                <span className="font-semibold">{item.quantity} terjual</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};


const OrdersPage = () => {
    const { db, appId, orders, products, userRole, userId, username, storeSettings, customers } = useContext(AppContext);
    
    const initialOrderState = { customerName: '', customerPhone: '', items: [], totalCost: 0, subtotal: 0, discount: 0, discountDescription: '', otherFees: 0, otherFeesDescription: '' };
    
    const [isEditing, setIsEditing] = useState(false);
    const [currentOrder, setCurrentOrder] = useState(initialOrderState);
    const [message, setMessage] = useState('');
    const [modal, setModal] = useState({ show: false, action: null, itemId: null });

    const generateOrderId = () => `${Math.floor(100000 + Math.random() * 900000)}`;
    const handleAddOrderItem = () => setCurrentOrder(prev => ({ ...prev, items: [...prev.items, { productId: '', quantity: 1, width: 0, height: 0, description: '' }] }));
    const handleUpdateOrderItem = (index, key, value) => setCurrentOrder(prev => ({ ...prev, items: prev.items.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
    const handleRemoveOrderItem = (index) => setCurrentOrder(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    
    const calculateItemPrice = useCallback((item) => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return 0;
        const quantity = item.quantity || 1;
        switch (product.calculationMethod) {
            case 'dimensi': return (item.width || 0) * (item.height || 0) * product.price * quantity;
            case 'paket':
            case 'satuan': return quantity * product.price;
            default: return 0;
        }
    }, [products]);

    useEffect(() => {
        const subtotal = currentOrder.items.reduce((acc, item) => acc + calculateItemPrice(item), 0);
        const totalCost = subtotal - (currentOrder.discount || 0) + (currentOrder.otherFees || 0);
        setCurrentOrder(prev => ({ ...prev, subtotal, totalCost }));
    }, [currentOrder.items, currentOrder.discount, currentOrder.otherFees, calculateItemPrice]);

    const handleCustomerSelect = (customerName) => {
        const customer = customers.find(c => c.name === customerName);
        if (customer) {
            setCurrentOrder(prev => ({...prev, customerName: customer.name, customerPhone: customer.phone}));
        }
    };

    const handleSubmitOrder = async (e) => {
        e.preventDefault();
        if (!db) return;

        // Auto-create or update customer
        if (currentOrder.customerPhone) {
            const customerRef = doc(db, `artifacts/${appId}/public/data/customers`, currentOrder.customerPhone);
            await setDoc(customerRef, { name: currentOrder.customerName, phone: currentOrder.customerPhone }, { merge: true });
        }

        const orderData = {
            ...currentOrder,
            items: JSON.stringify(currentOrder.items),
            paidAmount: 0,
            paymentStatus: 'Belum Lunas',
            paymentMethod: '',
            productionStatus: 'Antrian Desain',
            createdBy: { userId, username }
        };

        try {
            if (isEditing) {
                const { id, ...dataToUpdate } = orderData;
                await updateDoc(doc(db, `artifacts/${appId}/public/data/orders`, id), { ...dataToUpdate, updatedAt: new Date().toISOString() });
                setMessage('Pesanan berhasil diperbarui!');
            } else {
                const orderId = generateOrderId();
                await setDoc(doc(db, `artifacts/${appId}/public/data/orders`, orderId), { ...orderData, id: orderId, createdAt: new Date().toISOString() });
                setMessage('Pesanan berhasil ditambahkan!');
            }
            setCurrentOrder(initialOrderState);
            setIsEditing(false);
            setTimeout(() => setMessage(''), 3000);
        } catch (error) { console.error("Error saving order:", error); setMessage('Gagal menyimpan pesanan.'); }
    };

    const handleEditOrder = (order) => {
        const canEdit = userRole === 'owner' || userRole === 'superviser' || order.paymentStatus !== 'Lunas';
        if (!canEdit) {
            setMessage('Pesanan yang sudah lunas tidak dapat diubah oleh kasir.');
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        
        const { paidAmount, paymentStatus, paymentMethod, createdBy, productionStatus, ...rest } = order;
        setCurrentOrder({ 
            ...initialOrderState,
            ...rest, 
            items: JSON.parse(order.items),
        });
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteOrder = async (id) => {
        if (!db) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/orders`, id));
            setMessage('Pesanan berhasil dihapus.');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) { console.error("Error deleting order:", error); setMessage('Gagal menghapus pesanan.'); }
        setModal({ show: false, action: null, itemId: null });
    };
    
    const handleUpdateStatus = async (orderId, newStatus) => {
        const orderRef = doc(db, `artifacts/${appId}/public/data/orders`, orderId);
        await updateDoc(orderRef, { productionStatus: newStatus });
    };

    const handlePrintReceipt = (order) => {
        try {
            const parsedItems = JSON.parse(order.items);
            const change = (order.paidAmount || 0) > order.totalCost ? (order.paidAmount || 0) - order.totalCost : 0;
            const remaining = order.totalCost - (order.paidAmount || 0) > 0 ? order.totalCost - (order.paidAmount || 0) : 0;
            let receiptContent = `
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 16px; width: 300px; padding: 10px;">
                    <div style="text-align: center; margin-bottom: 10px;">
                        <h2 style="margin: 0; font-size: 18px;">${storeSettings.storeName || 'SKETSA STICKER'}</h2>
                        <p style="margin: 0;">${storeSettings.address || 'JL. KH. Syafii No.100 Kav.8 Suci'}</p>
                    </div>
                    <p>${new Date(order.createdAt).toLocaleTimeString('id-ID')} | ${new Date(order.createdAt).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p>Kasir : ${order.createdBy?.username || 'Admin'}</p>
                    <hr style="border-top: 1px dashed black; margin: 5px 0;">
                    <p style="font-weight: bold;">${order.customerName.toUpperCase()}</p>
                    <hr style="border-top: 1px dashed black; margin: 5px 0;">
                    ${parsedItems.map((item, index) => {
                        const product = products.find(p => p.id === item.productId);
                        const itemPrice = calculateItemPrice(item);
                        return `
                            <div>
                                <p style="margin: 0;">${index + 1}. ${product ? product.name : 'N/A'} <span style="float: right;">Rp ${itemPrice.toLocaleString('id-ID')}</span></p>
                                ${product?.calculationMethod === 'dimensi' ? `<p style="margin: 0 0 0 15px; font-size: 11px;">Dimensi : ${item.width}x${item.height}</p>` : ''}
                                <p style="margin: 0 0 0 15px; font-size: 11px;">Jumlah : ${item.quantity}X</p>
                                ${item.description ? `<p style="margin: 0 0 0 15px; font-size: 11px;">Note : ${item.description}</p>` : ''}
                            </div>
                        `;
                    }).join('')}
                    <hr style="border-top: 1px dashed black; margin: 5px 0;">
                    <p>Catatan : ${(order.otherFeesDescription || '')}</p>
                    <hr style="border-top: 1px dashed black; margin: 5px 0;">
                    <p>Subtotal <span style="float: right;">Rp ${(order.subtotal || 0).toLocaleString('id-ID')}</span></p>
                    ${(order.discount || 0) > 0 ? `<p>Diskon (${order.discountDescription || ''}) <span style="float: right;">- Rp ${order.discount.toLocaleString('id-ID')}</span></p>` : ''}
                    ${(order.otherFees || 0) > 0 ? `<p>Biaya Lain (${order.otherFeesDescription || ''}) <span style="float: right;">Rp ${order.otherFees.toLocaleString('id-ID')}</span></p>` : ''}
                    <p style="font-weight: bold;">Total <span style="float: right;">Rp ${order.totalCost.toLocaleString('id-ID')}</span></p>
                    <p>Bayar <span style="float: right;">Rp ${(order.paidAmount || 0).toLocaleString('id-ID')}</span></p>
                    <p>${remaining > 0 ? 'Sisa' : 'Kembali'} <span style="float: right;">Rp ${remaining > 0 ? remaining.toLocaleString('id-ID') : change.toLocaleString('id-ID')}</span></p>
                    <hr style="border-top: 1px dashed black; margin: 5px 0;">
                    <div style="text-align: center; margin-top: 10px;">
                        <p style="margin: 0;">Pesanan diproses setelah pembayaran</p>
                        <p style="margin: 0;">${storeSettings.receiptNotes || 'Terima Kasih Atas Kunjungan Anda'}</p>
                    </div>
                </div>
            `;
            const printWindow = window.open('', '', 'width=320,height=600');
            printWindow.document.write(receiptContent);
            printWindow.document.close();
            printWindow.print();
        } catch (error) {
            console.error("Gagal mencetak struk:", error);
            alert("Gagal mencetak struk. Data pesanan mungkin tidak lengkap.");
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">{isEditing ? 'Edit Pesanan' : 'Tambah Pesanan'}</h2>
            {message && <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4">{message}</div>}
            <form onSubmit={handleSubmitOrder} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-700">Nama Pemesan</label>
                        <input list="customer-list" type="text" value={currentOrder.customerName} onChange={(e) => { setCurrentOrder({ ...currentOrder, customerName: e.target.value }); handleCustomerSelect(e.target.value); }} className="w-full p-2 border border-gray-300 rounded-lg" required />
                        <datalist id="customer-list">
                            {customers.map(c => <option key={c.id} value={c.name} />)}
                        </datalist>
                    </div>
                    <div><label className="block text-gray-700">No. Telepon</label><input type="tel" value={currentOrder.customerPhone} onChange={(e) => setCurrentOrder({ ...currentOrder, customerPhone: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg" required /></div>
                </div>

                <div><h3 className="text-xl font-semibold mt-4 mb-2">Item Pesanan</h3>{currentOrder.items.map((item, index) => (<div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-2 p-2 bg-gray-50 rounded-lg border">
                    <select value={item.productId} onChange={(e) => handleUpdateOrderItem(index, 'productId', e.target.value)} className="md:col-span-2 flex-grow p-2 border rounded-lg" required><option value="">Pilih Produk</option>{products.map(product => (<option key={product.id} value={product.id}>{product.name} ({product.calculationMethod})</option>))}</select>
                    {products.find(p => p.id === item.productId)?.calculationMethod === 'dimensi' ? (<><input type="number" step="0.01" placeholder="Lebar (cm)" value={item.width || ''} onChange={(e) => handleUpdateOrderItem(index, 'width', parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded-lg" required /><input type="number" step="0.01" placeholder="Tinggi (cm)" value={item.height || ''} onChange={(e) => handleUpdateOrderItem(index, 'height', parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded-lg" required /></>) : null}
                    <input type="number" placeholder="Jumlah" value={item.quantity || ''} onChange={(e) => handleUpdateOrderItem(index, 'quantity', parseInt(e.target.value, 10) || 1)} className="w-full p-2 border rounded-lg" required />
                    <input type="text" placeholder="Keterangan" value={item.description || ''} onChange={(e) => handleUpdateOrderItem(index, 'description', e.target.value)} className="md:col-span-2 w-full p-2 border rounded-lg" />
                    <div className="flex items-center justify-between"><span className="text-sm font-semibold text-gray-700">Rp {calculateItemPrice(item).toLocaleString('id-ID')}</span><button type="button" onClick={() => handleRemoveOrderItem(index)} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600">Hapus</button></div>
                </div>))}<button type="button" onClick={handleAddOrderItem} className="mt-2 w-full bg-green-500 text-white p-2 rounded-lg hover:bg-green-600">Tambah Item</button></div>
                
                <div className="border-t pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-gray-700">Diskon</label><input type="number" value={currentOrder.discount} onChange={(e) => setCurrentOrder({ ...currentOrder, discount: parseFloat(e.target.value) || 0 })} className="w-full p-2 border rounded-lg" /><input type="text" placeholder="Ket. Diskon" value={currentOrder.discountDescription} onChange={(e) => setCurrentOrder({...currentOrder, discountDescription: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/></div>
                        <div><label className="block text-gray-700">Biaya Lain</label><input type="number" value={currentOrder.otherFees} onChange={(e) => setCurrentOrder({ ...currentOrder, otherFees: parseFloat(e.target.value) || 0 })} className="w-full p-2 border rounded-lg" /><input type="text" placeholder="Ket. Biaya Lain" value={currentOrder.otherFeesDescription} onChange={(e) => setCurrentOrder({...currentOrder, otherFeesDescription: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/></div>
                    </div>
                    <p className="text-xl font-bold text-right">Subtotal: Rp {currentOrder.subtotal.toLocaleString('id-ID')}</p>
                    <p className="text-2xl font-bold text-right">Total Biaya: Rp {currentOrder.totalCost.toLocaleString('id-ID')}</p>
                </div>

                <div><button type="submit" className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg hover:bg-blue-600 text-lg">{isEditing ? 'Simpan Perubahan' : 'Simpan Pesanan'}</button></div>
            </form>

            <div className="mt-8"><h2 className="text-2xl font-bold mb-4">Daftar Pesanan</h2><div className="overflow-x-auto"><table className="min-w-full bg-white rounded-lg shadow"><thead><tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal"><th className="py-3 px-6 text-left">ID</th><th className="py-3 px-6 text-left">Nama</th><th className="py-3 px-6 text-left">Total</th><th className="py-3 px-6 text-left">Status Bayar</th><th className="py-3 px-6 text-left">Status Produksi</th><th className="py-3 px-6 text-left">Kasir</th><th className="py-3 px-6 text-left">Aksi</th></tr></thead><tbody className="text-gray-600 text-sm font-light">{orders.map(order => { const canEdit = userRole === 'owner' || userRole === 'superviser' || order.paymentStatus !== 'Lunas'; return (<tr key={order.id} className="border-b border-gray-200 hover:bg-gray-100"><td className="py-3 px-6 text-left whitespace-nowrap">{order.id}</td><td className="py-3 px-6 text-left whitespace-nowrap">{order.customerName}</td><td className="py-3 px-6 text-left">Rp {order.totalCost.toLocaleString('id-ID')}</td><td className="py-3 px-6 text-left"><span className={`py-1 px-3 text-xs font-bold rounded-full ${order.paymentStatus === 'Belum Lunas' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>{order.paymentStatus}</span></td><td><select value={order.productionStatus} onChange={(e) => handleUpdateStatus(order.id, e.target.value)} className="p-1 border rounded-lg"><option>Antrian Desain</option><option>Proses Cetak</option><option>Siap Diambil</option><option>Selesai</option></select></td><td className="py-3 px-6 text-left">{order.createdBy?.username || 'N/A'}</td><td className="py-3 px-6 text-left"><button onClick={() => handleEditOrder(order)} disabled={!canEdit} className={`text-blue-500 hover:text-blue-700 mr-2 ${!canEdit && 'opacity-50 cursor-not-allowed'}`}>Edit</button><button onClick={() => handlePrintReceipt(order)} className="text-green-500 hover:text-green-700 mr-2">Cetak</button>{(userRole === 'superviser' || userRole === 'owner') && (<button onClick={() => setModal({ show: true, action: () => handleDeleteOrder(order.id), itemId: order.id })} className="text-red-500 hover:text-red-700">Hapus</button>)}</td></tr>);})}</tbody></table></div></div>
            <Modal show={modal.show} title="Konfirmasi Hapus" message="Yakin ingin menghapus pesanan ini?" onConfirm={modal.action} onCancel={() => setModal({ show: false, action: null, itemId: null })} />
        </div>
    );
};

const PaymentsPage = () => {
    const { db, appId, orders, username, userId } = useContext(AppContext);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [paymentDetails, setPaymentDetails] = useState({ amount: 0, method: 'Cash', type: 'dp' });
    const [message, setMessage] = useState('');
    const [recentUnpaid, setRecentUnpaid] = useState([]);

    useEffect(() => {
        const unpaid = orders
            .filter(o => o.paymentStatus !== 'Lunas')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 20);
        setRecentUnpaid(unpaid);
    }, [orders]);

    const handleSearch = (e) => {
        e.preventDefault();
        const queryLower = searchQuery.toLowerCase();
        const results = orders.filter(o => o.id.toLowerCase().includes(queryLower) || o.customerName.toLowerCase().includes(queryLower));
        setSearchResults(results);
        setSelectedOrder(null);
        setMessage(results.length === 0 ? 'Tidak ada pesanan yang ditemukan.' : '');
    };

    const handleSelectOrder = (order) => {
        if (order.paymentStatus === 'Lunas') {
            setMessage('Pesanan ini sudah lunas.');
            setSelectedOrder(null);
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        setSelectedOrder(order);
        setPaymentDetails({ amount: 0, method: 'Cash', type: 'dp' });
    };

    const handleSettlePayment = async () => {
        if (!db || !selectedOrder) return;
        if (selectedOrder.paymentStatus === 'Lunas') {
            setMessage('Pesanan sudah lunas dan tidak bisa diubah.');
            return;
        }

        const currentPaid = selectedOrder.paidAmount || 0;
        let paymentAmount = paymentDetails.amount;
        if (paymentDetails.type === 'lunas') {
            paymentAmount = selectedOrder.totalCost - currentPaid;
        }
        
        const newPaidAmount = currentPaid + paymentAmount;
        const newPaymentStatus = newPaidAmount >= selectedOrder.totalCost ? 'Lunas' : 'Belum Lunas';
        const paymentHistory = selectedOrder.paymentHistory || [];
        paymentHistory.push({
            amount: paymentAmount,
            method: paymentDetails.method,
            date: new Date().toISOString(),
            user: { userId, username }
        });

        try {
            const orderDocRef = doc(db, `artifacts/${appId}/public/data/orders`, selectedOrder.id);
            await updateDoc(orderDocRef, {
                paymentStatus: newPaymentStatus,
                paidAmount: newPaidAmount,
                paymentMethod: paymentDetails.method,
                paymentHistory: paymentHistory,
                lastUpdatedBy: { userId, username },
                updatedAt: new Date().toISOString(),
            });
            setMessage('Pembayaran berhasil diperbarui!');
            setSelectedOrder(null);
            setSearchResults([]);
            setSearchQuery('');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Error updating payment:", error);
            setMessage('Gagal memperbarui status pembayaran.');
        }
    };
    
    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Pembayaran Pesanan</h2>
            {message && <div className={`p-3 rounded-lg mb-4 ${message.includes('Gagal') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message}</div>}
            <form onSubmit={handleSearch} className="flex space-x-2 mb-6">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari ID Pesanan atau Nama Pelanggan" className="flex-grow p-2 border border-gray-300 rounded-lg" required />
                <button type="submit" className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">Cari</button>
            </form>
            
            {searchResults.length > 0 && !selectedOrder && (
                <div className="mb-4"><h3 className="text-lg font-semibold mb-2">Hasil Pencarian:</h3><div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">{searchResults.map(order => (<button key={order.id} onClick={() => handleSelectOrder(order)} className="w-full text-left p-3 hover:bg-gray-100 border-b last:border-b-0"><p className="font-bold">ID: {order.id}</p><p>Nama: {order.customerName}</p></button>))}</div></div>
            )}

            {selectedOrder && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
                    <h3 className="text-xl font-bold mb-2">Detail Pesanan: {selectedOrder.id}</h3>
                    <p><strong>Nama Pemesan:</strong> {selectedOrder.customerName}</p>
                    <p><strong>Total Biaya:</strong> Rp {selectedOrder.totalCost.toLocaleString('id-ID')}</p>
                    <p><strong>Sudah Dibayar:</strong> Rp {(selectedOrder.paidAmount || 0).toLocaleString('id-ID')}</p>
                    <p className="font-bold text-red-600"><strong>Kekurangan:</strong> Rp {(selectedOrder.totalCost - (selectedOrder.paidAmount || 0)).toLocaleString('id-ID')}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label className="block text-gray-700">Jenis Pembayaran</label><select value={paymentDetails.type} onChange={(e) => setPaymentDetails({...paymentDetails, type: e.target.value})} className="w-full p-2 border rounded-lg"><option value="dp">DP</option><option value="lunas">Pelunasan</option></select></div>
                        {paymentDetails.type === 'dp' && <div><label className="block text-gray-700">Jumlah Bayar</label><input type="number" value={paymentDetails.amount} onChange={(e) => setPaymentDetails({...paymentDetails, amount: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded-lg" /></div>}
                        <div><label className="block text-gray-700">Metode</label><select value={paymentDetails.method} onChange={(e) => setPaymentDetails({...paymentDetails, method: e.target.value})} className="w-full p-2 border rounded-lg"><option value="Cash">Cash</option><option value="Transfer">Transfer Bank</option></select></div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3"><button onClick={() => setSelectedOrder(null)} className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600">Batal</button><button onClick={handleSettlePayment} className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600">Simpan Pembayaran</button></div>
                </div>
            )}

            {!selectedOrder && recentUnpaid.length > 0 && (
                 <div className="mt-8">
                    <h3 className="text-xl font-bold mb-2">20 Pesanan Terbaru Belum Lunas</h3>
                    <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                        {recentUnpaid.map(order => (
                             <button key={order.id} onClick={() => handleSelectOrder(order)} className="w-full text-left p-3 hover:bg-gray-100 border-b last:border-b-0">
                                <p className="font-bold">ID: {order.id}</p>
                                <p>Nama: {order.customerName}</p>
                                <p className="text-red-600">Kekurangan: Rp {(order.totalCost - (order.paidAmount || 0)).toLocaleString('id-ID')}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const CustomerPage = () => {
    const { customers, orders } = useContext(AppContext);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const customerOrders = selectedCustomer ? orders.filter(o => o.customerPhone === selectedCustomer.phone) : [];

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Manajemen Pelanggan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <h3 className="text-lg font-semibold mb-2">Daftar Pelanggan</h3>
                    <div className="max-h-96 overflow-y-auto border rounded-lg">
                        {customers.map(c => (
                            <div key={c.id} onClick={() => setSelectedCustomer(c)} className={`p-3 cursor-pointer hover:bg-blue-50 ${selectedCustomer?.id === c.id ? 'bg-blue-100' : ''}`}>
                                <p className="font-bold">{c.name}</p>
                                <p className="text-sm text-gray-600">{c.phone}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="md:col-span-2">
                    {selectedCustomer ? (
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Riwayat Pesanan: {selectedCustomer.name}</h3>
                            <div className="max-h-96 overflow-y-auto border rounded-lg">
                                {customerOrders.length > 0 ? customerOrders.map(o => (
                                    <div key={o.id} className="p-3 border-b">
                                        <p><strong>ID:</strong> {o.id} - <strong>Status:</strong> {o.paymentStatus}</p>
                                        <p><strong>Total:</strong> Rp {o.totalCost.toLocaleString('id-ID')}</p>
                                        <p className="text-sm text-gray-500">{new Date(o.createdAt).toLocaleDateString('id-ID')}</p>
                                    </div>
                                )) : <p className="p-3">Tidak ada riwayat pesanan.</p>}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
                            <p className="text-gray-500">Pilih pelanggan untuk melihat riwayat</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const ExpensesPage = () => {
    const { db, appId, expenses, userRole, username, userId } = useContext(AppContext);
    const [description, setDescription] = useState('');
    const [cost, setCost] = useState(0);
    const [message, setMessage] = useState('');
    const [modal, setModal] = useState({ show: false, action: null, itemId: null });

    const handleSubmitExpense = async (e) => {
        e.preventDefault();
        if (!db) return;
        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/expenses`), { description, cost, createdAt: new Date().toISOString(), createdBy: { userId, username } });
            setMessage('Pengeluaran berhasil ditambahkan!');
            setDescription(''); setCost(0);
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Error adding expense:", error);
            setMessage('Gagal menyimpan pengeluaran.');
        }
    };

    const handleDeleteExpense = async (id) => {
        if (!db) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/expenses`, id));
            setMessage('Pengeluaran berhasil dihapus.');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Error deleting expense:", error);
            setMessage('Gagal menghapus pengeluaran.');
        }
        setModal({ show: false, action: null, itemId: null });
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Transaksi Pengeluaran</h2>
            {message && <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4">{message}</div>}
            <form onSubmit={handleSubmitExpense} className="space-y-4">
                <div><label className="block text-gray-700">Deskripsi</label><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" required /></div>
                <div><label className="block text-gray-700">Biaya</label><input type="number" value={cost} onChange={(e) => setCost(parseFloat(e.target.value) || 0)} className="w-full p-2 border border-gray-300 rounded-lg" required /></div>
                <button type="submit" className="w-full bg-blue-500 text-white font-bold py-2 rounded-lg hover:bg-blue-600">Tambah Pengeluaran</button>
            </form>
            <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Daftar Pengeluaran</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg shadow">
                        <thead><tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal"><th className="py-3 px-6 text-left">Deskripsi</th><th className="py-3 px-6 text-left">Biaya</th><th className="py-3 px-6 text-left">Tanggal</th><th className="py-3 px-6 text-left">Dibuat Oleh</th>{(userRole === 'superviser' || userRole === 'owner') && <th className="py-3 px-6 text-left">Aksi</th>}</tr></thead>
                        <tbody className="text-gray-600 text-sm font-light">
                            {expenses.map(expense => (
                                <tr key={expense.id} className="border-b border-gray-200 hover:bg-gray-100">
                                    <td className="py-3 px-6 text-left">{expense.description}</td>
                                    <td className="py-3 px-6 text-left">Rp {expense.cost.toLocaleString('id-ID')}</td>
                                    <td className="py-3 px-6 text-left">{new Date(expense.createdAt).toLocaleDateString()}</td>
                                    <td className="py-3 px-6 text-left">{expense.createdBy?.username || 'N/A'}</td>
                                    {(userRole === 'superviser' || userRole === 'owner') && (<td className="py-3 px-6 text-left"><button onClick={() => setModal({ show: true, action: () => handleDeleteExpense(expense.id), itemId: expense.id })} className="text-red-500 hover:text-red-700">Hapus</button></td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <Modal show={modal.show} title="Konfirmasi Hapus" message="Apakah Anda yakin ingin menghapus pengeluaran ini?" onConfirm={modal.action} onCancel={() => setModal({ show: false, action: null, itemId: null })} />
        </div>
    );
};

const ReportsPage = () => {
    const { orders, expenses, products } = useContext(AppContext);
    const [reportType, setReportType] = useState('daily');
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [filteredExpenses, setFilteredExpenses] = useState([]);
    const [itemSalesReport, setItemSalesReport] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const now = new Date();
        let start, end;
        if (reportType === 'daily') {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        } else if (reportType === 'monthly') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        } else { // yearly
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear() + 1, 0, 1);
        }
        
        const currentOrders = orders.filter(o => {
            const orderDate = new Date(o.createdAt);
            return orderDate >= start && orderDate < end;
        });
        
        setFilteredOrders(currentOrders);
        setFilteredExpenses(expenses.filter(e => new Date(e.createdAt) >= start && new Date(e.createdAt) < end));

        // Generate Item Sales Report
        const sales = {};
        currentOrders.forEach(order => {
            try {
                const items = JSON.parse(order.items);
                items.forEach(item => {
                    const product = products.find(p => p.id === item.productId);
                    if (product) {
                        if (!sales[item.productId]) {
                            sales[item.productId] = { name: product.name, quantity: 0, total: 0 };
                        }
                        const quantity = item.quantity || 1;
                        sales[item.productId].quantity += quantity;
                        const price = (product.calculationMethod === 'dimensi') 
                            ? (item.width || 0) * (item.height || 0) * product.price * quantity
                            : quantity * product.price;
                        sales[item.productId].total += price;
                    }
                });
            } catch(e) { console.error("Could not parse items for order:", order.id, e); }
        });
        setItemSalesReport(Object.values(sales));
        setCurrentPage(1);

    }, [orders, expenses, products, reportType]);

    const cashIn = filteredOrders.reduce((acc, o) => acc + (o.paidAmount || 0), 0);
    const totalSales = filteredOrders.reduce((acc, o) => acc + o.totalCost, 0);
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.cost, 0);
    const profit = totalSales - totalExpenses;
    const cashFlow = cashIn - totalExpenses;

    const downloadCSV = (data, filename) => {
        if (data.length === 0) return;
        const headers = Object.keys(data[0]);
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(";") + "\n";
        data.forEach(row => {
            const values = headers.map(header => `"${row[header]}"`);
            csvContent += values.join(";") + "\n";
        });
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `${filename}_${reportType}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadFinancialReport = () => {
        const data = [
            ...filteredOrders.map(o => ({ Tipe: "Penjualan", Tanggal: new Date(o.createdAt).toLocaleDateString('id-ID'), Deskripsi: `Pesanan ${o.customerName}`, Jumlah: o.totalCost })),
            ...filteredExpenses.map(e => ({ Tipe: "Pengeluaran", Tanggal: new Date(e.createdAt).toLocaleDateString('id-ID'), Deskripsi: e.description, Jumlah: -e.cost }))
        ];
        downloadCSV(data, 'laporan_keuangan');
    };

    const downloadItemSalesReport = () => {
        const dataForCSV = itemSalesReport.map(item => ({
            "Nama Item": item.name,
            "Jumlah Terjual": item.quantity,
            "Total Penjualan": item.total
        }));
        downloadCSV(dataForCSV, 'laporan_penjualan_item');
    };
    
    const paginatedItems = itemSalesReport.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(itemSalesReport.length / itemsPerPage);

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-8">
            <div>
                <h2 className="text-2xl font-bold mb-4">Laporan Keuangan</h2>
                <div className="flex space-x-4 mb-4">
                    <button onClick={() => setReportType('daily')} className={`px-4 py-2 rounded-lg ${reportType === 'daily' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>Harian</button>
                    <button onClick={() => setReportType('monthly')} className={`px-4 py-2 rounded-lg ${reportType === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>Bulanan</button>
                    <button onClick={() => setReportType('yearly')} className={`px-4 py-2 rounded-lg ${reportType === 'yearly' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>Tahunan</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 text-center">
                    <div className="bg-blue-100 p-4 rounded-lg"><h3 className="text-xl font-semibold">Total Penjualan</h3><p className="text-2xl font-bold">Rp {totalSales.toLocaleString('id-ID')}</p></div>
                    <div className="bg-red-100 p-4 rounded-lg"><h3 className="text-xl font-semibold">Total Pengeluaran</h3><p className="text-2xl font-bold">Rp {totalExpenses.toLocaleString('id-ID')}</p></div>
                    <div className="bg-green-100 p-4 rounded-lg"><h3 className="text-xl font-semibold">Keuntungan (P&L)</h3><p className="text-2xl font-bold">Rp {profit.toLocaleString('id-ID')}</p></div>
                    <div className="bg-purple-100 p-4 rounded-lg"><h3 className="text-xl font-semibold">Arus Kas Bersih</h3><p className="text-2xl font-bold">Rp {cashFlow.toLocaleString('id-ID')}</p></div>
                </div>
                <button onClick={downloadFinancialReport} className="mb-4 bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600">Unduh Laporan Keuangan</button>
            </div>

            <div className="border-t pt-8">
                <h2 className="text-2xl font-bold mb-4">Laporan Penjualan per Item</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg shadow">
                        <thead><tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal"><th className="py-3 px-6 text-left">Nama Item</th><th className="py-3 px-6 text-left">Jumlah Terjual</th><th className="py-3 px-6 text-left">Total Penjualan</th></tr></thead>
                        <tbody className="text-gray-600 text-sm font-light">
                            {paginatedItems.map(item => (
                                <tr key={item.name} className="border-b border-gray-200 hover:bg-gray-100">
                                    <td className="py-3 px-6 text-left">{item.name}</td>
                                    <td className="py-3 px-6 text-left">{item.quantity}</td>
                                    <td className="py-3 px-6 text-left">Rp {item.total.toLocaleString('id-ID')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-between items-center mt-4">
                    <button onClick={downloadItemSalesReport} className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600">Unduh Laporan Item</button>
                    {totalPages > 1 && <div className="flex items-center space-x-2"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded-lg disabled:opacity-50">Prev</button><span>Halaman {currentPage} dari {totalPages}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded-lg disabled:opacity-50">Next</button></div>}
                </div>
            </div>
        </div>
    );
};

const AccountManagementPage = () => {
    const { db, appId, users, userId } = useContext(AppContext);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState({id: '', username: '', password: '', role: 'kasir'});
    const [message, setMessage] = useState('');
    const [modal, setModal] = useState({ show: false, action: null, itemId: null });

    const handleResetForm = () => {
        setIsEditing(false);
        setCurrentUser({id: '', username: '', password: '', role: 'kasir'});
    };

    const handleSelectUserForEdit = (user) => {
        setIsEditing(true);
        setCurrentUser({ ...user, password: '' }); // Kosongkan password untuk keamanan
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!db) return;
        try {
            if (isEditing) {
                const { id, ...userData } = currentUser;
                const userRef = doc(db, `artifacts/${appId}/public/data/users`, id);
                // Hanya update password jika diisi
                const dataToUpdate = { username: userData.username, role: userData.role };
                if (userData.password) {
                    dataToUpdate.password = userData.password;
                }
                await updateDoc(userRef, dataToUpdate);
                setMessage('Akun berhasil diperbarui!');
            } else {
                await addDoc(collection(db, `artifacts/${appId}/public/data/users`), { username: currentUser.username, password: currentUser.password, role: currentUser.role, createdAt: new Date().toISOString(), userId: null });
                setMessage('Akun berhasil ditambahkan!');
            }
            handleResetForm();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Error saving user:", error);
            setMessage('Gagal menyimpan akun.');
        }
    };

    const handleDeleteUser = async (id) => {
        if (!db) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/users`, id));
            setMessage('Akun berhasil dihapus.');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Error deleting user:", error);
            setMessage('Gagal menghapus akun.');
        }
        setModal({ show: false, action: null, itemId: null });
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">{isEditing ? 'Edit Akun' : 'Tambah Akun Baru'}</h2>
            {message && <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4">{message}</div>}
            <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div><label className="block text-gray-700">Username</label><input type="text" value={currentUser.username} onChange={(e) => setCurrentUser({...currentUser, username: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg" required /></div>
                <div><label className="block text-gray-700">Password</label><input type="password" placeholder={isEditing ? "Kosongkan jika tidak diubah" : ""} value={currentUser.password} onChange={(e) => setCurrentUser({...currentUser, password: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg" required={!isEditing} /></div>
                <div><label className="block text-gray-700">Role</label><select value={currentUser.role} onChange={(e) => setCurrentUser({...currentUser, role: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg"><option value="kasir">Kasir</option><option value="desainer">Desainer</option><option value="superviser">Superviser</option><option value="owner">Owner</option></select></div>
                <div className="md:col-span-3 flex space-x-2"><button type="submit" className="w-full bg-blue-500 text-white font-bold py-2 rounded-lg hover:bg-blue-600">{isEditing ? 'Simpan Perubahan' : 'Tambah Akun'}</button>{isEditing && <button type="button" onClick={handleResetForm} className="w-full bg-gray-500 text-white font-bold py-2 rounded-lg hover:bg-gray-600">Batal</button>}</div>
            </form>
            <h3 className="text-xl font-bold mb-2">Daftar Akun</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg shadow">
                    <thead><tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal"><th className="py-3 px-6 text-left">Username</th><th className="py-3 px-6 text-left">Role</th><th className="py-3 px-6 text-left">User ID</th><th className="py-3 px-6 text-left">Aksi</th></tr></thead>
                    <tbody className="text-gray-600 text-sm font-light">
                        {users.map(user => (<tr key={user.id} className="border-b border-gray-200 hover:bg-gray-100"><td className="py-3 px-6 text-left">{user.username}</td><td className="py-3 px-6 text-left">{user.role}</td><td className="py-3 px-6 text-left">{user.userId || 'N/A'}</td><td className="py-3 px-6 text-left"><button onClick={() => handleSelectUserForEdit(user)} className="text-blue-500 hover:text-blue-700 mr-2">Edit</button>{user.userId !== userId && (<button onClick={() => setModal({ show: true, action: () => handleDeleteUser(user.id), itemId: user.id })} className="text-red-500 hover:text-red-700">Hapus</button>)}</td></tr>))}
                    </tbody>
                </table>
            </div>
            <Modal show={modal.show} title="Konfirmasi Hapus" message="Apakah Anda yakin ingin menghapus akun ini?" onConfirm={modal.action} onCancel={() => setModal({ show: false, action: null, itemId: null })} />
        </div>
    );
};

const ProductManagementPage = () => {
    const { db, appId, products } = useContext(AppContext);
    const [isEditing, setIsEditing] = useState(false);
    const [currentProduct, setCurrentProduct] = useState({ id: '', name: '', price: 0, calculationMethod: 'satuan' });
    const [message, setMessage] = useState('');
    const [modal, setModal] = useState({ show: false, action: null, itemId: null });

    const handleAddOrUpdateProduct = async (e) => {
        e.preventDefault();
        if (!db) return;
        try {
            if (isEditing) {
                const { id, ...productData } = currentProduct;
                const productDocRef = doc(db, `artifacts/${appId}/public/data/products`, id);
                await updateDoc(productDocRef, { ...productData, updatedAt: new Date().toISOString() });
                setMessage('Produk berhasil diperbarui!');
            } else {
                const { id, ...newProductData } = currentProduct;
                await addDoc(collection(db, `artifacts/${appId}/public/data/products`), { ...newProductData, createdAt: new Date().toISOString() });
                setMessage('Produk berhasil ditambahkan!');
            }
            handleResetForm();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Error saving product:", error);
            setMessage('Gagal menyimpan produk.');
        }
    };

    const handleEditProduct = (product) => {
        setCurrentProduct(product);
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteProduct = async (id) => {
        if (!db) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/products`, id));
            setMessage('Produk berhasil dihapus.');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Error deleting product:", error);
            setMessage('Gagal menghapus produk.');
        }
        setModal({ show: false, action: null, itemId: null });
    };
    
    const handleResetForm = () => {
        setCurrentProduct({ id: '', name: '', price: 0, calculationMethod: 'satuan' });
        setIsEditing(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">{isEditing ? 'Edit Produk' : 'Tambah Produk'}</h2>
            {message && <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4">{message}</div>}
            <form onSubmit={handleAddOrUpdateProduct} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div><label className="block text-gray-700">Nama Produk</label><input type="text" value={currentProduct.name} onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })} className="w-full p-2 border rounded-lg" required /></div>
                <div><label className="block text-gray-700">Harga per Unit</label><input type="number" step="0.01" value={currentProduct.price} onChange={(e) => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) || 0 })} className="w-full p-2 border rounded-lg" required /></div>
                <div><label className="block text-gray-700">Metode Hitung</label><select value={currentProduct.calculationMethod} onChange={(e) => setCurrentProduct({ ...currentProduct, calculationMethod: e.target.value })} className="w-full p-2 border rounded-lg"><option value="dimensi">Dimensi</option><option value="paket">Paket</option><option value="satuan">Satuan</option></select></div>
                <div className="flex items-end space-x-2"><button type="submit" className="w-full bg-blue-500 text-white font-bold py-2 rounded-lg hover:bg-blue-600">{isEditing ? 'Simpan' : 'Tambah'}</button>{isEditing && (<button type="button" onClick={handleResetForm} className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600">Batal</button>)}</div>
            </form>
            <h3 className="text-xl font-bold mb-2">Daftar Produk</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg shadow">
                    <thead><tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal"><th className="py-3 px-6 text-left">Nama</th><th className="py-3 px-6 text-left">Harga</th><th className="py-3 px-6 text-left">Metode</th><th className="py-3 px-6 text-left">Aksi</th></tr></thead>
                    <tbody className="text-gray-600 text-sm font-light">
                        {products.map(p => (<tr key={p.id} className="border-b border-gray-200 hover:bg-gray-100"><td className="py-3 px-6 text-left">{p.name}</td><td className="py-3 px-6 text-left">Rp {p.price.toLocaleString('id-ID')}</td><td className="py-3 px-6 text-left">{p.calculationMethod}</td><td className="py-3 px-6 text-left"><button onClick={() => handleEditProduct(p)} className="text-blue-500 mr-2">Edit</button><button onClick={() => setModal({ show: true, action: () => handleDeleteProduct(p.id), itemId: p.id })} className="text-red-500">Hapus</button></td></tr>))}
                    </tbody>
                </table>
            </div>
            <Modal show={modal.show} title="Konfirmasi Hapus" message="Yakin ingin menghapus produk ini?" onConfirm={modal.action} onCancel={() => setModal({ show: false, action: null, itemId: null })} />
        </div>
    );
};

const StoreManagementPage = () => {
    const { db, appId, storeSettings } = useContext(AppContext);
    const [formData, setFormData] = useState({});
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (storeSettings) {
            setFormData(storeSettings);
        }
    }, [storeSettings]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, logoUrl: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!db) return;
        try {
            const storeSettingsRef = doc(db, `artifacts/${appId}/public/data/storeSettings`, 'main');
            await setDoc(storeSettingsRef, formData, { merge: true });
            setMessage('Pengaturan toko berhasil disimpan!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Error saving store settings:", error);
            setMessage('Gagal menyimpan pengaturan toko.');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Manajemen Toko</h2>
            {message && <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4">{message}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-gray-700">Nama Toko</label>
                    <input type="text" name="storeName" value={formData.storeName || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                    <label className="block text-gray-700">Alamat</label>
                    <input type="text" name="address" value={formData.address || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                    <label className="block text-gray-700">Nomor Telepon</label>
                    <input type="text" name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                    <label className="block text-gray-700">Catatan Struk</label>
                    <textarea name="receiptNotes" value={formData.receiptNotes || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg" rows="3"></textarea>
                </div>
                <div>
                    <label className="block text-gray-700">Logo Toko</label>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full p-2 border border-gray-300 rounded-lg" />
                    {formData.logoUrl && <img src={formData.logoUrl} alt="Logo Preview" className="mt-4 max-h-24" />}
                </div>
                <button type="submit" className="w-full bg-blue-500 text-white font-bold py-2 rounded-lg hover:bg-blue-600 transition-colors">Simpan Pengaturan</button>
            </form>
        </div>
    );
};
