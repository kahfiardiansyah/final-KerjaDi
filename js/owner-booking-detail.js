document.addEventListener('DOMContentLoaded', function () {
    console.log('🔧 owner-booking-detail.js loaded');
    console.log('💬 getOrCreateChat available:', typeof getOrCreateChat);
    console.log('💬 startChat available:', typeof startChat);

    const auth = firebase.auth();
    const db = firebase.firestore();
    const container = document.getElementById('owner-booking-detail-container');

    if (typeof getOrCreateChat === 'undefined') {
        console.error('❌ getOrCreateChat is UNDEFINED!');
        console.log('🔍 Checking window object:', window.getOrCreateChat);
    } else {
        console.log('✅ getOrCreateChat is available');
    }

    if (typeof getOrCreateChat === 'undefined') {
        console.warn('⚠️ getOrCreateChat not found, creating fallback');

        window.getOrCreateChat = function (otherUserId) {
            console.log('💬 Fallback getOrCreateChat called with:', otherUserId);

            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                alert('Anda harus login untuk mengirim pesan');
                window.location.href = 'register.html';
                return;
            }

            // Buat chat room ID
            const chatId = [currentUser.uid, otherUserId].sort().join('_');
            console.log('💬 Redirecting to chat:', chatId);

            // Redirect ke chat page
            window.location.href = `chat.html?chatId=${chatId}&otherUserId=${otherUserId}`;
        };

        window.startChat = function (userId) {
            getOrCreateChat(userId);
        };
    }

    // Cek jika container tidak ditemukan
    if (!container) {
        console.error('❌ Container not found');
        return;
    }

    auth.onAuthStateChanged(user => {
        console.log('👤 Auth state changed:', user ? 'User logged in' : 'No user');

        if (!user) {
            console.log('❌ No user, redirecting to login');
            window.location.href = 'register.html';
            return;
        }

        // Cek role owner
        db.collection('users').doc(user.uid).get().then(doc => {
            if (!doc.exists) {
                console.log('❌ User document not found');
                showError('Data pengguna tidak ditemukan.');
                return;
            }

            const userData = doc.data();
            console.log('📊 User role:', userData.role);

            if (userData.role !== 'owner') {
                console.log('❌ User is not owner, redirecting');
                window.location.href = 'main.html';
                return;
            }

            console.log('✅ User is owner, loading booking detail');
            loadBookingDetail(user.uid);

        }).catch(error => {
            console.error('❌ Error checking user role:', error);
            showError('Error memeriksa role pengguna: ' + error.message);
        });
    });

    function loadBookingDetail(ownerId) {
        console.log('🔄 Loading booking detail for owner:', ownerId);

        const urlParams = new URLSearchParams(window.location.search);
        const bookingId = urlParams.get('bookingId');

        console.log('📋 Booking ID from URL:', bookingId);

        if (!bookingId) {
            console.log('❌ No booking ID in URL');
            showError('ID Pesanan tidak ditemukan di URL.');
            return;
        }

        // Show loading state
        container.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Memuat detail pesanan...</p>
                <small class="text-muted">Booking ID: ${bookingId}</small>
            </div>
        `;

        db.collection('bookings').doc(bookingId).get().then(async (doc) => {
            console.log('📄 Booking document fetched:', doc.exists);

            if (!doc.exists) {
                console.log('❌ Booking document does not exist');
                showError('Data pesanan tidak ditemukan.');
                return;
            }

            const booking = doc.data();
            console.log('📊 Booking data:', booking);

            // Verifikasi bahwa pesanan milik owner ini
            if (booking.ownerId !== ownerId) {
                console.log('❌ Booking owner mismatch:', booking.ownerId, 'vs', ownerId);
                showError('Anda tidak memiliki akses ke pesanan ini.');
                return;
            }

            console.log('✅ Booking ownership verified');

            // Ambil data penyewa
            let renterData = { name: 'Tidak Ditemukan', email: 'Tidak Ditemukan' };
            try {
                console.log('👤 Fetching renter data:', booking.userId);
                const renterDoc = await db.collection('users').doc(booking.userId).get();
                if (renterDoc.exists) {
                    renterData = renterDoc.data();
                    console.log('✅ Renter data:', renterData);
                } else {
                    console.log('❌ Renter document not found');
                }
            } catch (error) {
                console.error("❌ Error fetching renter data:", error);
            }

            // Render the booking detail
            renderBookingDetail(booking, bookingId, renterData);

        }).catch(error => {
            console.error("❌ Error loading booking detail:", error);
            showError('Terjadi kesalahan saat memuat detail pesanan: ' + error.message);
        });
    }

    function renderBookingDetail(booking, bookingId, renterData) {
        console.log('🎨 Rendering booking detail');

        // Format tanggal
        const checkInDate = new Date(booking.checkIn).toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        const checkOutDate = new Date(booking.checkOut).toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        let bookingDate = 'Tanggal tidak tersedia';
        if (booking.bookingTimestamp && booking.bookingTimestamp.toDate) {
            bookingDate = new Date(booking.bookingTimestamp.toDate()).toLocaleDateString('id-ID', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        }

        const detailHTML = `
            <div class="row">
                <div class="col-12">
                    <div class="card mb-4">
                        <div class="card-header bg-primary text-white">
                            <h4 class="mb-0"><i class="bi bi-receipt me-2"></i>Detail Pesanan - ${booking.title || 'Tidak ada judul'}</h4>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3 text-center">
                                    <img src="${booking.image || ''}" class="img-fluid rounded" alt="${booking.title || ''}" style="max-height: 200px; object-fit: cover;">
                                </div>
                                <div class="col-md-9">
                                    <h5>${booking.title || 'Tidak ada judul'}</h5>
                                    <p class="text-muted"><i class="bi bi-geo-alt-fill me-1"></i> ${booking.location || booking.city || 'Lokasi tidak tersedia'}</p>
                                    <p class="mb-2"><strong>ID Pesanan:</strong> <code>${bookingId}</code></p>
                                    <p class="mb-2"><strong>Tanggal Pemesanan:</strong> ${bookingDate}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-8">
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-calendar-event me-2"></i>Detail Penyewaan</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong><i class="bi bi-calendar-check me-2"></i>Check-in:</strong><br>${checkInDate}</p>
                                    <p><strong><i class="bi bi-calendar-x me-2"></i>Check-out:</strong><br>${checkOutDate}</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong><i class="bi bi-clock me-2"></i>Durasi:</strong><br>${booking.duration || 0} hari</p>
                                    <p><strong><i class="bi bi-info-circle me-2"></i>Status:</strong><br><span class="badge bg-success fs-6">LUNAS</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-person me-2"></i>Informasi Penyewa</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>Nama Lengkap:</strong><br>${renterData.name}</p>
                                    <p><strong>Email:</strong><br>${renterData.email}</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>Telepon:</strong><br>${booking.renterPhone || 'Tidak tersedia'}</p>
                                    <button class="btn btn-primary mt-2" onclick="getOrCreateChat('${booking.userId}')">
                                         <i class="bi bi-chat-dots-fill me-1"></i>Chat dengan Penyewa
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header bg-success text-white">
                            <h5 class="mb-0"><i class="bi bi-credit-card me-2"></i>Rincian Pembayaran</h5>
                        </div>
                        <div class="card-body">
                            <div class="d-flex justify-content-between mb-2">
                                <span>Subtotal:</span>
                                <span>${booking.subtotal || booking.price || 'Rp0'}</span>
                            </div>
                            ${booking.hasDiscount ? `
                            <div class="d-flex justify-content-between mb-2 text-success">
                                <span>Diskon:</span>
                                <span>${booking.discount || 'Rp0'}</span>
                            </div>
                            ` : ''}
                            <div class="d-flex justify-content-between mb-2">
                                <span>Biaya Layanan (10%):</span>
                                <span>${booking.adminFee || 'Rp0'}</span>
                            </div>
                            <hr>
                            <div class="d-flex justify-content-between fw-bold fs-5">
                                <span>Total Pendapatan:</span>
                                <span class="text-success">${booking.totalPrice || 'Rp0'}</span>
                            </div>
                            <hr>
                            <div class="mt-3">
                                <p><strong>Metode Pembayaran:</strong><br>${booking.paymentMethod || 'Tidak tersedia'}</p>
                                ${booking.virtualAccount && booking.virtualAccount !== 'N/A' ?
                `<p><strong>Virtual Account:</strong><br><code>${booking.virtualAccount}</code></p>` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="card mt-3">
                        <div class="card-body text-center">
                            <h6>Ringkasan Pendapatan</h6>
                            <div class="mt-3">
                                <p class="mb-1 text-muted">Pendapatan Kotor</p>
                                <h4 class="text-primary">${booking.totalPrice || 'Rp0'}</h4>
                            </div>
                            <div class="mt-2">
                                <p class="mb-1 text-muted">Biaya Platform</p>
                                <h5 class="text-danger">${booking.adminFee || 'Rp0'}</h5>
                            </div>
                            <hr>
                            <div class="mt-2">
                                <p class="mb-1 text-muted">Pendapatan Bersih</p>
                                <h4 class="text-success">${booking.subtotal || booking.price || 'Rp0'}</h4>
                            </div>
                        </div>
                    </div>

                    <div class="mt-3">
                        <a href="owner.html" class="btn btn-outline-secondary w-100">
                            <i class="bi bi-arrow-left me-1"></i>Kembali ke Dashboard
                        </a>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = detailHTML;
        console.log('✅ Booking detail rendered successfully');
    }

    function showError(message) {
        console.error('🚨 Error:', message);
        container.innerHTML = `
            <div class="alert alert-danger">
                <h4><i class="bi bi-exclamation-triangle me-2"></i>Error</h4>
                <p>${message}</p>
                <div class="mt-3">
                    <a href="owner.html" class="btn btn-primary me-2">Kembali ke Dashboard</a>
                    <button onclick="location.reload()" class="btn btn-outline-secondary">Coba Lagi</button>
                </div>
            </div>
        `;
    }


    console.log('✅ owner-booking-detail.js initialization complete');
});


// =========================================================================
// CHAT FUNCTIONS - Tambahkan langsung di owner-booking-detail.js
// =========================================================================

// Fungsi getOrCreateChat yang sederhana dan langsung
window.getOrCreateChat = function (otherUserId) {
    console.log('💬 getOrCreateChat called with:', otherUserId);

    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
        alert('Anda harus login untuk mengirim pesan');
        window.location.href = 'register.html';
        return;
    }

    // Cek jika user adalah admin
    const db = firebase.firestore();
    db.collection('users').doc(currentUser.uid).get().then(doc => {
        if (doc.exists && doc.data().role === 'admin') {
            Swal.fire({
                icon: 'info',
                title: 'Fitur Tidak Tersedia',
                text: 'Admin tidak dapat mengirim pesan chat.',
                confirmButtonText: 'Mengerti'
            });
            return;
        }

        // Cek jika chat dengan diri sendiri
        if (currentUser.uid === otherUserId) {
            alert('Tidak dapat mengirim pesan ke diri sendiri');
            return;
        }

        // Buat chat room ID yang konsisten
        const chatId = [currentUser.uid, otherUserId].sort().join('_');
        console.log('💬 Chat room ID:', chatId);

        // Redirect ke chat.html
        window.location.href = `chat.html?chatId=${chatId}&otherUserId=${otherUserId}`;
    });
};

// Fungsi startChat sebagai alias
window.startChat = function (userId) {
    getOrCreateChat(userId);
};