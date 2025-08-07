import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
// --- BARU: Impor fungsi Firestore dan file konfigurasi firebase kita ---
import { db } from './firebase';
import { collection, getDocs, addDoc, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore";


const App = () => {
  // --- STATE MANAGEMENT ---
  // Hapus initialUsers dan initialProducts, kita akan ambil dari Firestore
  const [users, setUsers] = useState([]); // Akan kita kembangkan nanti
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  const [loggedInUser, setLoggedInUser] = useState({ username: 'kasir1', role: 'cashier' }); // Login sementara
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);

  const receiptRef = useRef();

  // --- EFEK & KONEKSI FIREBASE ---

  // BARU: useEffect untuk mengambil data awal dari Firestore
  useEffect(() => {
    // 1. Ambil data produk
    const fetchProducts = async () => {
      const productCollection = collection(db, "products");
      const productSnapshot = await getDocs(productCollection);
      const productList = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productList);
    };

    // 2. Ambil data users (untuk pengembangan selanjutnya)
    const initialUsers = [
        { id: 1, username: 'owner', password: '123', role: 'owner' },
        { id: 2, username: 'kasir1', password: '123', role: 'cashier' },
    ];
    setUsers(initialUsers);


    // Panggil fungsi untuk mengambil data
    fetchProducts();
  }, []); // <-- Kurung siku kosong berarti efek ini hanya berjalan sekali saat komponen dimuat


  // BARU: useEffect untuk mendengarkan perubahan data pesanan secara real-time
  useEffect(() => {
    // Buat query untuk mengambil pesanan dan mengurutkannya berdasarkan tanggal
    const q = query(collection(db, "orders"), orderBy("orderDate", "desc"));

    // onSnapshot akan berjalan setiap kali ada data baru/perubahan di koleksi 'orders'
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);

      // (Logika notifikasi bisa ditaruh di sini)
    });

    // Cleanup listener saat komponen di-unmount
    return () => unsubscribe();
  }, []); // <-- Berjalan sekali untuk memasang listener

  // --- HANDLERS & LOGIC (SUDAH DIMODIFIKASI) ---

  // BARU: Fungsi handleAddOrder sekarang menyimpan data ke Firestore
  const handleAddOrder = async (order) => {
    try {
      // Kita tidak perlu lagi membuat ID manual, Firestore akan membuatnya otomatis
      const newOrderData = {
        ...order,
        status: 'Antrian Desain',
        paymentStatus: order.totalPrice - order.paidAmount > 0 ? 'Belum Lunas' : 'Lunas',
        createdBy: loggedInUser.username,
        paymentHistory: [{
            date: order.orderDate,
            amount: order.paidAmount,
            updatedBy: loggedInUser.username,
            type: 'DP'
        }]
      };

      // `addDoc` akan menyimpan dokumen baru ke koleksi 'orders'
      const docRef = await addDoc(collection(db, "orders"), newOrderData);
      console.log("Pesanan berhasil disimpan dengan ID: ", docRef.id);
      // Kita tidak perlu `setOrders` di sini, karena `onSnapshot` akan menanganinya secara otomatis!

    } catch (e) {
      console.error("Error adding document: ", e);
      alert("Gagal menyimpan pesanan. Cek console untuk error.");
    }
  };

  // BARU: Fungsi untuk update status pesanan di Firestore
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    const orderDoc = doc(db, "orders", orderId);
    await updateDoc(orderDoc, {
      status: newStatus
    });
  };

  // (Fungsi-fungsi lain seperti handleLogin, handleLogout, dll tetap sama untuk saat ini)
  // ... (Sisa kode komponen seperti LoginPage, DashboardPage, OrderPage, dll tetap sama)
  // ... Pastikan Anda menyalin sisa kode dari file sebelumnya ke sini ...
  // ... Perubahan utama hanya pada logika pengambilan dan penyimpanan data di atas ...


  // --- PASTE SISA KODE KOMPONEN (OrderPage, OrderListPage, dll) DARI FILE LAMA ANDA DI SINI ---
  // ...
  // --- KODE RENDER TETAP SAMA ---

  // Untuk sementara, kita lewati halaman login agar mudah diuji
   if (!loggedInUser) {
    // return <LoginPage />; // Sementara dimatikan
  }

  const handleLogout = () => {
    setLoggedInUser(null);
     // Untuk sementara, kita buat simpel
     window.location.reload();
  };

  // Kode di bawah ini adalah SAMA PERSIS dengan kode Anda sebelumnya.
  // Tidak ada yang perlu diubah di sini.
  // Cukup salin dari file lama Anda.

    const OrderPage = () => {
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [items, setItems] = useState([{ productId: products[0]?.id || '', qty: 1, width: '', height: '' }]);
    const [paidAmount, setPaidAmount] = useState(0);
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [discount, setDiscount] = useState(0);
    const [otherFee, setOtherFee] = useState(0);
    const [feeDescription, setFeeDescription] = useState('');


    const calculateTotal = () => {
      let total = items.reduce((sum, item) => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return sum;

        if (product.dimensions && product.dimensions.pricePerUnit) {
          const width = parseFloat(item.width) || 0;
          const height = parseFloat(item.height) || 0;
          const qty = parseInt(item.qty) || 1;
          const area = product.dimensions.unit === 'm²' ? width * height : width;
          return sum + (area * product.dimensions.pricePerUnit * qty);
        }
        return sum + (product.price * item.qty);
      }, 0);
      total -= parseFloat(discount) || 0;
      total += parseFloat(otherFee) || 0;
      return total;
    };

    const handleItemChange = (index, field, value) => {
      const newItems = [...items];
      newItems[index][field] = value;
      if(field === 'productId') {
          newItems[index].width = '';
          newItems[index].height = '';
      }
      setItems(newItems);
    };

    const handleAddItem = () => {
      setItems([...items, { productId: products[0]?.id || '', qty: 1, width: '', height: '' }]);
    };

    const handleRemoveItem = (index) => {
      setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      const total = calculateTotal();
      
      // Mengubah format item sebelum dikirim ke Firestore
      const itemsForFirestore = items.map(item => {
          const product = products.find(p => p.id === item.productId);
          return {
              ...item,
              productName: product?.name || 'Unknown Product' // Simpan nama produk untuk referensi
          }
      })

      await handleAddOrder({
        customerName,
        customerPhone,
        items: itemsForFirestore, // Kirim item yang sudah diformat
        totalPrice: total,
        paidAmount: parseFloat(paidAmount),
        orderDate,
        discount: parseFloat(discount) || 0,
        otherFee: parseFloat(otherFee) || 0,
        feeDescription,
      });

      setCustomerName('');
      setCustomerPhone('');
      setItems([{ productId: products[0]?.id || '', qty: 1, width: '', height: '' }]);
      setPaidAmount(0);
      setOrderDate(new Date().toISOString().split('T')[0]);
      setDiscount(0);
      setOtherFee(0);
      setFeeDescription('');
      alert('Pesanan berhasil disimpan di database!');
      setCurrentPage('order-list');
    };

    const totalPrice = calculateTotal();

    return (
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold mb-4">Buat Pesanan Baru</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
             <input type="text" placeholder="Nama Pelanggan" value={customerName} onChange={e => setCustomerName(e.target.value)} className="p-2 border rounded" required />
             <input type="tel" placeholder="No. Telepon" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="p-2 border rounded" required />
             <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="p-2 border rounded" required />
          </div>

          <h3 className="font-semibold mb-2">Item Pesanan</h3>
          {items.map((item, index) => {
            const product = products.find(p => p.id === item.productId);
            return (
              <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2 p-2 border rounded-md">
                <select value={item.productId} onChange={e => handleItemChange(index, 'productId', e.target.value)} className="p-2 border rounded col-span-2">
                  <option value="">-- Pilih Produk --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" placeholder="Qty" min="1" value={item.qty} onChange={e => handleItemChange(index, 'qty', e.target.value)} className="p-2 border rounded" />
                {product && product.dimensions ? (
                  <>
                    <input type="number" step="0.01" placeholder={product.dimensions.unit === 'm' ? 'Panjang (m)' : 'Lebar (m)'} value={item.width} onChange={e => handleItemChange(index, 'width', e.target.value)} className="p-2 border rounded" />
                    {product.dimensions.unit === 'm²' &&
                        <input type="number" step="0.01" placeholder="Tinggi (m)" value={item.height} onChange={e => handleItemChange(index, 'height', e.target.value)} className="p-2 border rounded" />
                    }
                  </>
                ) : <div className="md:col-span-2"></div>}
                 <button type="button" onClick={() => handleRemoveItem(index)} className="bg-red-500 text-white p-2 rounded hover:bg-red-600 md:col-start-5">Hapus</button>
              </div>
            );
          })}
          <button type="button" onClick={handleAddItem} className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mb-4">+ Tambah Item</button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t pt-4">
              <div>
                  <div className="flex items-center mb-2">
                      <label className="w-32">Diskon (Rp)</label>
                      <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="p-2 border rounded flex-grow" />
                  </div>
                  <div className="flex items-center mb-2">
                      <label className="w-32">Biaya Lain</label>
                      <input type="number" value={otherFee} onChange={e => setOtherFee(e.target.value)} className="p-2 border rounded flex-grow" />
                  </div>
                   <div className="flex items-center mb-2">
                      <label className="w-32">Ket. Biaya</label>
                      <input type="text" placeholder="e.g., Biaya Desain" value={feeDescription} onChange={e => setFeeDescription(e.target.value)} className="p-2 border rounded flex-grow" />
                  </div>
              </div>
              <div className="text-right">
                  <h3 className="text-xl font-bold">Total: Rp {totalPrice.toLocaleString()}</h3>
                  <div className="flex items-center justify-end mt-2">
                      <label className="mr-2">Bayar (DP):</label>
                      <input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} max={totalPrice} className="p-2 border rounded w-40" />
                  </div>
              </div>
          </div>


          <div className="text-right mt-6">
            <button type="submit" className="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition">Simpan Pesanan</button>
          </div>
        </form>
      </div>
    );
  };
    const OrderListPage = () => {
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [filter, setFilter] = useState('Semua');

    const filteredOrders = orders.filter(o => {
        if(filter === 'Semua') return true;
        return o.status === filter;
    });

    return (
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold mb-4">Daftar Pesanan</h2>
        <div className="mb-4">
            {['Semua', 'Antrian Desain', 'Proses Cetak', 'Siap Diambil', 'Selesai', 'Dibatalkan'].map(status => (
                <button key={status} onClick={() => setFilter(status)} className={`px-3 py-1 mr-2 rounded ${filter === status ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                    {status}
                </button>
            ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">ID</th>
                <th className="p-2">Pelanggan</th>
                <th className="p-2">Total</th>
                <th className="p-2">Status Bayar</th>
                <th className="p-2">Status Pesanan</th>
                <th className="p-2">Kasir</th>
                <th className="p-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id} className="border-b">
                  <td className="p-2 font-mono text-xs">{order.id}</td>
                  <td className="p-2">{order.customerName}</td>
                  <td className="p-2">Rp {order.totalPrice.toLocaleString()}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${order.paymentStatus === 'Lunas' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="p-2">
                    <select value={order.status} onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)} className="p-1 border rounded text-sm">
                        <option>Antrian Desain</option>
                        <option>Proses Cetak</option>
                        <option>Siap Diambil</option>
                        <option>Selesai</option>
                        <option>Dibatalkan</option>
                    </select>
                  </td>
                  <td className="p-2">{order.createdBy}</td>
                  <td className="p-2">
                    <button onClick={() => {setSelectedOrder(order);}} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Detail Modal or Print Component can be triggered from here */}
      </div>
    );
  };
  
  // Sisa komponen lainnya (DashboardPage, PaymentsPage, dll.) bisa Anda salin dari kode lama.
  // ...
  
    const renderPage = () => {
    switch (currentPage) {
      // case 'dashboard': return <DashboardPage />;
      case 'order': return <OrderPage />;
      case 'order-list': return <OrderListPage />;
      // case 'payments': return <PaymentsPage />;
      // case 'expenses': return <ExpensesPage />;
      // case 'reports': return <ReportsPage />;
      // case 'customers': return <CustomerPage />;
      // case 'accounts': return <AccountManagementPage />;
      default: return <OrderListPage />;
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-6 text-center border-b">
          <h1 className="text-xl font-bold text-blue-600">Aplikasi Kasir v2</h1>
        </div>
        <nav className="flex-grow mt-4">
          <a onClick={() => setCurrentPage('dashboard')} className={`block px-6 py-3 text-gray-700 hover:bg-gray-100 cursor-pointer ${currentPage === 'dashboard' && 'bg-blue-100 text-blue-600 font-semibold'}`}>Dashboard</a>
          <a onClick={() => setCurrentPage('order')} className={`block px-6 py-3 text-gray-700 hover:bg-gray-100 cursor-pointer ${currentPage === 'order' && 'bg-blue-100 text-blue-600 font-semibold'}`}>Buat Pesanan</a>
          <a onClick={() => setCurrentPage('order-list')} className={`block px-6 py-3 text-gray-700 hover:bg-gray-100 cursor-pointer ${currentPage === 'order-list' && 'bg-blue-100 text-blue-600 font-semibold'}`}>Daftar Pesanan</a>
        </nav>
        <div className="p-6 border-t">
          <div className="text-sm text-gray-600 mb-2">Login sebagai: <span className="font-bold">{loggedInUser.username}</span></div>
          <button onClick={handleLogout} className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition">
            Logout
          </button>
        </div>
      </div>

      <main className="flex-1 p-8">
        {renderPage()}
      </main>
    </div>
  );
};

export default App;
