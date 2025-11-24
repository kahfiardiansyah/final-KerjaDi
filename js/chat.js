// chat.js - Sistem Chat yang Diperbaiki

// Global variables
let currentChatId = null;
let unsubscribeMessages = null;

// Initialize chat system
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Chat system initialized');

    const path = window.location.pathname;

    if (path.includes('inbox.html')) {
        initInboxPage();
    } else if (path.includes('chat.html')) {
        initChatPage();
    }
});

// =========================================================================
// INBOX PAGE FUNCTIONS
// =========================================================================

function initInboxPage() {
    console.log('📨 Initializing inbox page...');


    setTimeout(() => {
        auth.onAuthStateChanged(user => {
            if (!user) {
                window.location.href = 'register.html';
                return;
            }

            console.log('✅ User authenticated:', user.uid);
            loadUserInbox(user.uid);
        });
    }, 100);
}

function loadUserInbox(userId) {
    console.log('👤 Loading inbox for user:', userId);
    const db = firebase.firestore();

    db.collection('users').doc(userId).get().then(doc => {
        if (doc.exists) {
            const userData = doc.data();
            const userRole = userData.role || 'user';
            console.log('🎭 User role:', userRole);
            loadAllChats(userId, userRole);
        } else {
            console.error('❌ User document not found');
            showInboxError('Data pengguna tidak ditemukan');
        }
    }).catch(error => {
        console.error('❌ Error loading user data:', error);
        showInboxError('Gagal memuat data pengguna');
    });
}

function loadAllChats(userId, userRole) {
    console.log('📥 Loading all chats for user...');
    const db = firebase.firestore();

    const renterContainer = document.getElementById('inbox-list-as-renter');
    const ownerContainer = document.getElementById('inbox-list-as-owner');
    const ownerSection = document.getElementById('owner-chats-section');

    console.log('🔍 DOM Elements found:', {
        renterContainer: !!renterContainer,
        ownerContainer: !!ownerContainer,
        ownerSection: !!ownerSection
    });

    if (!renterContainer) {
        console.error('❌ Renter container not found');
        showCriticalError('Elemen inbox tidak ditemukan');
        return;
    }

    renterContainer.innerHTML = `<div class="text-center p-4"><div class="spinner-border text-primary"></div><p class="mt-2">Memuat percakapan...</p></div>`;

    if (userRole === 'owner') {
        if (ownerContainer) {
            ownerContainer.innerHTML = `<div class="text-center p-4"><div class="spinner-border text-success"></div><p class="mt-2">Memuat percakapan...</p></div>`;
        }
        if (ownerSection) {
            ownerSection.style.display = 'block';
        }
    } else {
        if (ownerSection) {
            ownerSection.style.display = 'none';
        }
        if (ownerContainer) {
            ownerContainer.innerHTML = '';
        }
    }

    db.collection('chats')
        .where('participants', 'array-contains', userId)
        .orderBy('lastMessageTimestamp', 'desc')
        .get()
        .then(querySnapshot => {
            console.log('📨 Chats query successful, size:', querySnapshot.size);

            if (querySnapshot.empty) {
                console.log('ℹ️ No chats found for user');
                showNoChats(renterContainer, ownerContainer, userRole);
                return;
            }

            console.log('🎯 Starting to render', querySnapshot.size, 'chats');
            renderChats(querySnapshot, userId, userRole, renterContainer, ownerContainer);
        })
        .catch(error => {
            console.error('❌ Error loading chats:', error);
            showChatsError(renterContainer, ownerContainer, userRole);
        });
}

function renderChats(snapshot, userId, userRole, renterContainer, ownerContainer) {
    console.log('🎨 Rendering chats...');

    let renterHtml = '';
    let ownerHtml = '';
    const promises = [];
    let processedCount = 0;

    const maxChats = 50;

    snapshot.forEach(doc => {
        if (processedCount >= maxChats) {
            console.warn('⚠️ Reached maximum chat limit:', maxChats);
            return;
        }

        const chat = doc.data();
        const chatId = doc.id;
        const otherUserId = chat.participants.find(id => id !== userId);

        if (!otherUserId) {
            console.log('⚠️ No other user found in chat:', chatId);
            return;
        }

        console.log('💬 Processing chat:', chatId, 'with user:', otherUserId);
        processedCount++;

        const userPromise = firebase.firestore().collection('users').doc(otherUserId).get().then(userDoc => {
            if (!userDoc.exists) {
                console.log('⚠️ User document not found:', otherUserId);
                return null;
            }

            const userData = userDoc.data();
            const otherUserName = userData.name || 'Pengguna';
            const otherUserPhoto = userData.photoURL ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUserName)}&background=random&color=fff`;
            const otherUserRole = userData.role || 'user';

            const unreadCount = chat.unreadCount?.[userId] || 0;
            const lastMessageTime = chat.lastMessageTimestamp ?
                formatTime(chat.lastMessageTimestamp.toDate()) : '';

            const lastMessage = chat.lastMessage || "Belum ada pesan";
            const isMyMessage = chat.lastMessageSenderId === userId;

            const chatItem = `
                <a href="chat.html?chatId=${chatId}" 
                   class="list-group-item chat-item-compact d-flex align-items-center ${unreadCount > 0 ? 'bg-light fw-bold' : ''}">
                    <img src="${otherUserPhoto}" class="rounded-circle chat-avatar me-3" 
                         alt="${otherUserName}"
                         onerror="this.src='https://ui-avatars.com/api/?name=User&background=random&color=fff'">
                    <div class="flex-grow-1">
                        <div class="d-flex w-100 justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1 d-inline">${otherUserName}</h6>
                                <span class="badge ${otherUserRole === 'owner' ? 'bg-success' : 'bg-secondary'} ms-2">
                                    ${otherUserRole === 'owner' ? 'Pemilik' : 'Penyewa'}
                                </span>
                            </div>
                            <div class="d-flex align-items-center">
                                <small class="text-muted me-2">${lastMessageTime}</small>
                                ${unreadCount > 0 ?
                    `<span class="badge bg-danger rounded-pill unread-badge d-flex align-items-center justify-content-center">${unreadCount}</span>` : ''}
                            </div>
                        </div>
                        <p class="mb-0 text-muted text-truncate chat-preview">
                            ${isMyMessage ? 'Anda: ' : ''}${lastMessage}
                        </p>
                    </div>
                </a>
            `;

            if (userRole === 'owner') {
                if (otherUserRole === 'owner') {
                    renterHtml += chatItem;
                    console.log('➡️ Added to renter (owner-owner chat)');
                } else {
                    ownerHtml += chatItem;
                    console.log('➡️ Added to owner (owner-renter chat)');
                }
            } else {
                renterHtml += chatItem;
                console.log('➡️ Added to renter (renter-owner chat)');
            }

            return { otherUserName, otherUserRole };

        }).catch(error => {
            console.error('❌ Error loading user data for', otherUserId, error);
            return null;
        });

        promises.push(userPromise);
    });

    console.log('⏳ Waiting for', promises.length, 'promises to resolve...');

    Promise.all(promises).then(results => {
        console.log('✅ All promises resolved, results:', results);

        const validResults = results.filter(r => r !== null);
        console.log(`📊 Processed ${validResults.length} valid chats`);

        if (renterContainer && typeof renterContainer.innerHTML !== 'undefined') {
            if (renterHtml) {
                console.log('🎨 Rendering renter chats:', renterHtml.split('</a>').length - 1, 'items');
                renterContainer.innerHTML = renterHtml;
            } else {
                console.log('ℹ️ No renter chats to display');
                renterContainer.innerHTML = `
                    <div class="text-center p-5 text-muted">
                        <i class="bi bi-chat-left" style="font-size: 3rem; opacity: 0.5;"></i>
                        <p class="mt-3">Belum ada percakapan sebagai penyewa</p>
                        <small>Mulai percakapan dengan pemilik properti</small>
                    </div>
                `;
            }
        }

        if (userRole === 'owner' && ownerContainer && typeof ownerContainer.innerHTML !== 'undefined') {
            if (ownerHtml) {
                console.log('🎨 Rendering owner chats:', ownerHtml.split('</a>').length - 1, 'items');
                ownerContainer.innerHTML = ownerHtml;
            } else {
                console.log('ℹ️ No owner chats to display');
                ownerContainer.innerHTML = `
                    <div class="text-center p-5 text-muted">
                        <i class="bi bi-buildings" style="font-size: 3rem; opacity: 0.5;"></i>
                        <p class="mt-3">Belum ada chat sebagai pemilik</p>
                        <small>Percakapan dengan penyewa properti Anda</small>
                    </div>
                `;
            }
        }

        console.log('✅ Chat rendering completed successfully');

    }).catch(error => {
        console.error('❌ Error in Promise.all:', error);
        showChatsError(renterContainer, ownerContainer, userRole);
    });
}

function showNoChats(renterContainer, ownerContainer, userRole) {
    if (renterContainer && typeof renterContainer.innerHTML !== 'undefined') {
        renterContainer.innerHTML = `
            <div class="text-center p-5 text-muted">
                <i class="bi bi-chat-left" style="font-size: 3rem; opacity: 0.5;"></i>
                <p class="mt-3">Belum ada percakapan</p>
                <small>Mulai percakapan baru dengan pemilik properti</small>
            </div>
        `;
    }

    if (userRole === 'owner' && ownerContainer && typeof ownerContainer.innerHTML !== 'undefined') {
        ownerContainer.innerHTML = `
            <div class="text-center p-5 text-muted">
                <i class="bi bi-buildings" style="font-size: 3rem; opacity: 0.5;"></i>
                <p class="mt-3">Belum ada chat sebagai pemilik</p>
            </div>
        `;
    }
}

function showChatsError(renterContainer, ownerContainer, userRole) {
    if (renterContainer && typeof renterContainer.innerHTML !== 'undefined') {
        renterContainer.innerHTML = `
            <div class="text-center p-5 text-danger">
                <i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i>
                <p class="mt-3">Gagal memuat percakapan</p>
                <button class="btn btn-primary mt-3" onclick="window.location.reload()">
                    <i class="bi bi-arrow-clockwise me-2"></i>Coba Lagi
                </button>
            </div>
        `;
    }

    if (userRole === 'owner' && ownerContainer && typeof ownerContainer.innerHTML !== 'undefined') {
        ownerContainer.innerHTML = `
            <div class="text-center p-5 text-danger">
                <i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i>
                <p class="mt-3">Gagal memuat percakapan</p>
                <button class="btn btn-success mt-3" onclick="window.location.reload()">
                    <i class="bi bi-arrow-clockwise me-2"></i>Coba Lagi
                </button>
            </div>
        `;
    }
}

function showInboxError(message) {
    const containers = [
        document.getElementById('inbox-list-as-renter'),
        document.getElementById('inbox-list-as-owner')
    ];

    containers.forEach(container => {
        if (container && typeof container.innerHTML !== 'undefined') {
            container.innerHTML = `
                <div class="text-center p-5 text-danger">
                    <i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i>
                    <p class="mt-3">${message}</p>
                    <button class="btn btn-primary mt-2" onclick="window.location.reload()">
                        <i class="bi bi-arrow-clockwise me-2"></i>Coba Lagi
                    </button>
                </div>
            `;
        }
    });
}

function showCriticalError(message) {
    const container = document.querySelector('.container');
    if (container) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger mt-4';
        errorDiv.innerHTML = `
            <h4>Terjadi Kesalahan</h4>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="window.location.reload()">
                <i class="bi bi-arrow-clockwise me-2"></i>Muat Ulang Halaman
            </button>
        `;
        container.appendChild(errorDiv);
    }
}

// =========================================================================
// CHAT PAGE FUNCTIONS - FIXED STRUCTURE
// =========================================================================

function initChatPage() {
    console.log('💬 Initializing chat page...');
    console.log('🔍 Current URL:', window.location.href);

    const urlParams = new URLSearchParams(window.location.search);
    currentChatId = urlParams.get('chatId');

    console.log('📱 Chat ID from URL:', currentChatId);
    console.log('🔍 All URL parameters:', Object.fromEntries(urlParams.entries()));

    if (!currentChatId) {
        console.error('❌ No chatId found in URL');
        showChatError('Percakapan tidak ditemukan (ID tidak ada)');
        return;
    }

    console.log('✅ Chat ID found:', currentChatId);



    auth.onAuthStateChanged(user => {
        if (!user) {
            console.log('❌ No user, redirecting to register');
            window.location.href = 'register.html';
            return;
        }

        console.log('✅ User authenticated:', user.uid);
        loadChat(user.uid);
    }, error => {
        console.error('❌ Auth state change error:', error);
    });
}

function loadChat(userId) {
    console.log('🔍 Loading chat for user:', userId);
    console.log('📝 Chat ID:', currentChatId);

    const db = firebase.firestore();
    const chatRef = db.collection('chats').doc(currentChatId);

    console.log('🎯 Chat reference:', chatRef);

    showChatLoading();

    chatRef.get().then(doc => {
        console.log('📄 Chat document fetched:', doc.exists);

        if (!doc.exists) {
            console.error('❌ Chat document does not exist');
            throw new Error('Percakapan tidak ditemukan di database');
        }

        const chatData = doc.data();
        console.log('💬 Chat data:', chatData);

        if (!chatData.participants || !chatData.participants.includes(userId)) {
            console.error('❌ User not in participants:', chatData.participants);
            throw new Error('Anda tidak memiliki akses ke percakapan ini');
        }

        const otherUserId = chatData.participants.find(id => id !== userId);
        console.log('👤 Other user ID:', otherUserId);

        if (!otherUserId) {
            throw new Error('Data peserta tidak valid');
        }

        console.log('✅ Chat validation passed');
        updateChatHeader(otherUserId);
        setupMessageSystem(chatRef, userId, chatData);
        loadChatMessages(chatRef, userId);
        markChatAsRead(chatRef, userId);

    }).catch(error => {
        console.error('❌ Error loading chat:', error);
        showChatError(error.message);
    });
}

function updateChatHeader(otherUserId) {
    console.log('👤 Updating chat header for user:', otherUserId);
    const db = firebase.firestore();
    
    db.collection('users').doc(otherUserId).get().then(userDoc => {
        if (userDoc.exists) {
            const otherUserData = userDoc.data();
            const otherUserName = otherUserData.name || 'Pengguna';
            const otherUserPhoto = otherUserData.photoURL ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUserName)}&background=random&color=fff`;

            const otherUserRole = otherUserData.role || 'user';

            console.log('👤 Other user:', otherUserName, 'Role:', otherUserRole);

            const partnerNameElement = document.getElementById('chat-partner-name');
            const partnerPhotoElement = document.getElementById('chat-partner-photo');
            const badgeElement = document.getElementById('chat-partner-badge');

            if (partnerNameElement) {
                partnerNameElement.textContent = otherUserName;
                console.log('✅ Updated partner name:', otherUserName);
            }
            if (partnerPhotoElement) {
                partnerPhotoElement.src = otherUserPhoto;
                console.log('✅ Updated partner photo');
            }
            if (badgeElement) {
                badgeElement.textContent = otherUserRole === 'owner' ? 'Pemilik' : 'Penyewa';
                badgeElement.className = `badge ${otherUserRole === 'owner' ? 'bg-success' : 'bg-secondary'} ms-2`;
                badgeElement.style.display = 'inline-block';
                console.log('✅ Updated partner badge');
            }
        } else {
            console.error('❌ Other user document not found');
        }
    }).catch(error => {
        console.error('❌ Error getting user data:', error);
    });
}

function markChatAsRead(chatRef, userId) {
    chatRef.update({
        [`unreadCount.${userId}`]: 0
    }).catch(error => {
        console.error('Error marking chat as read:', error);
    });
}

function loadChatMessages(chatRef, currentUserId) {
    console.log('📨 Loading chat messages...');

    const messagesContainer = document.getElementById('chat-messages');
    console.log('📦 Messages container:', messagesContainer);

    if (!messagesContainer) {
        console.error('❌ Messages container not found');
        const altContainer = document.querySelector('#chat-messages, .chat-messages, [id*="message"]');
        console.log('🔍 Alternative container:', altContainer);
        return;
    }

    if (unsubscribeMessages) {
        console.log('🔄 Clearing previous message listener');
        unsubscribeMessages();
    }

    messagesContainer.innerHTML = `
        <div class="text-center p-4">
            <div class="spinner-border spinner-border-sm text-primary"></div>
            <p class="mt-2 text-muted">Memuat pesan...</p>
        </div>
    `;

    console.log('🎯 Setting up messages listener...');

    unsubscribeMessages = chatRef.collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(
            snapshot => {
                console.log('📨 Messages snapshot received, size:', snapshot.size);
                console.log('📊 Messages data:', snapshot.docs.map(doc => ({
                    id: doc.id,
                    data: doc.data()
                })));

                if (snapshot.empty) {
                    console.log('ℹ️ No messages found');
                    showEmptyMessages();
                    return;
                }

                renderMessages(snapshot, currentUserId, messagesContainer);
            },
            error => {
                console.error('❌ Error loading messages:', error);
                console.error('Error details:', error.message, error.stack);
                showMessagesError('Gagal memuat pesan: ' + error.message);
            }
        );

    console.log('✅ Messages listener setup complete');
}

function renderMessages(snapshot, currentUserId, container) {
    console.log('🎨 Rendering messages...');
    console.log('📦 Container:', container);
    console.log('👤 Current user:', currentUserId);
    console.log('📄 Number of messages:', snapshot.size);

    if (!container) {
        console.error('❌ Container not provided for rendering messages');
        return;
    }

    container.innerHTML = '';

    let hasMessages = false;

    snapshot.forEach(doc => {
        const message = doc.data();
        console.log('💬 Message data:', message);

        const messageElement = createMessageElement(message, currentUserId);
        if (messageElement) {
            container.appendChild(messageElement);
            hasMessages = true;
        }
    });

    if (!hasMessages) {
        console.log('ℹ️ No messages to display');
        showEmptyMessages();
        return;
    }

    setTimeout(() => {
        console.log('⬇️ Scrolling to bottom');
        container.scrollTop = container.scrollHeight;
    }, 100);

    console.log('✅ Messages rendered successfully');
}

function createMessageElement(message, currentUserId) {
    console.log('🔨 Creating message element:', message);

    const isCurrentUser = message.senderId === currentUserId;
    console.log('👤 Is current user:', isCurrentUser);

    const messageDiv = document.createElement('div');
    messageDiv.className = `d-flex mb-3 ${isCurrentUser ? 'justify-content-end' : 'justify-content-start'}`;

    const messageTime = message.timestamp?.toDate ?
        formatTime(message.timestamp.toDate()) : 'Baru saja';

    const messageClass = isCurrentUser ? 'my-message' : 'their-message';

    messageDiv.innerHTML = `
        <div class="${messageClass} p-3 message-bubble">
            <div class="message-text">${message.text || ''}</div>
            <small class="${isCurrentUser ? 'text-white-50' : 'text-muted'} d-block mt-1" style="font-size: 0.75em;">
                ${messageTime}
            </small>
        </div>
    `;

    console.log('✅ Message element created');
    return messageDiv;
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

    // Cek role user untuk menentukan tombol chat
    const currentUser = firebase.auth().currentUser;
    let chatButtonHTML = '';

    if (currentUser) {
        const db = firebase.firestore();
        db.collection('users').doc(currentUser.uid).get().then(userDoc => {
            if (userDoc.exists) {
                const userRole = userDoc.data().role;
                
                if (userRole === 'admin') {
                    chatButtonHTML = `
                        <button class="btn btn-outline-secondary mt-2" disabled>
                            <i class="bi bi-eye me-1"></i>View Only (Admin)
                        </button>
                    `;
                } else {
                    chatButtonHTML = `
                        <button class="btn btn-primary mt-2" onclick="getOrCreateChat('${booking.userId}')">
                            <i class="bi bi-chat-dots-fill me-1"></i>Chat dengan Penyewa
                        </button>
                    `;
                }

                // Update tombol chat setelah menentukan role
                const chatButtonContainer = document.querySelector('.chat-button-container');
                if (chatButtonContainer) {
                    chatButtonContainer.innerHTML = chatButtonHTML;
                }
            }
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
                                <div class="chat-button-container">
                                    <!-- Tombol chat akan diisi secara dinamis -->
                                    ${chatButtonHTML}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ... sisa kode tetap sama ... -->
        </div>
    `;

    container.innerHTML = detailHTML;
    console.log('✅ Booking detail rendered successfully');
}

function showChatLoading() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div class="text-center p-5">
                <div class="spinner-border text-primary mb-3"></div>
                <p class="text-muted">Memuat percakapan...</p>
            </div>
        `;
    }
}

function showChatError(message) {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div class="text-center p-5">
                <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
                <p class="mt-3 text-danger">Gagal memuat percakapan</p>
                <p class="text-muted">${message}</p>
                <button class="btn btn-primary mt-2" onclick="window.location.reload()">
                    <i class="bi bi-arrow-clockwise me-2"></i>Coba Lagi
                </button>
                <button class="btn btn-outline-secondary mt-2 ms-2" onclick="window.location.href='inbox.html'">
                    <i class="bi bi-arrow-left me-2"></i>Kembali ke Inbox
                </button>
            </div>
        `;
    }
}

function showEmptyMessages() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div class="text-center p-5">
                <i class="bi bi-chat-left-text text-muted" style="font-size: 3rem;"></i>
                <p class="mt-3 text-muted">Belum ada pesan</p>
                <small>Mulai percakapan dengan mengirim pesan pertama!</small>
            </div>
        `;
    }
}

function showMessagesError(message) {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div class="text-center p-4 text-danger">
                <i class="bi bi-exclamation-circle"></i>
                <p class="mt-2">${message}</p>
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="window.location.reload()">
                    Coba Lagi
                </button>
            </div>
        `;
    }
}

// =========================================================================
// UTILITY FUNCTIONS
// =========================================================================

function formatTime(date) {
    return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, icon = 'info') {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
    });

    Toast.fire({
        icon: icon,
        title: message
    });
}

// =========================================================================
// GLOBAL CHAT FUNCTIONS
// =========================================================================

async function getOrCreateChat(otherUserId, officeId = null) {
    console.log('🎯 Starting chat with:', otherUserId);


    const currentUser = auth.currentUser;

    if (!currentUser) {
        Swal.fire('Login Dibutuhkan', 'Anda harus login untuk memulai chat.', 'warning');
        window.location.href = 'register.html';
        return;
    }

    if (currentUser.uid === otherUserId) {
        Swal.fire('Tidak Bisa Chat', 'Anda tidak dapat memulai chat dengan diri sendiri.', 'info');
        return;
    }

    const currentUserId = currentUser.uid;
    const chatId = [currentUserId, otherUserId].sort().join('_');
    const chatRef = db.collection('chats').doc(chatId);

    try {
        const doc = await chatRef.get();

        if (!doc.exists) {
            console.log('🆕 Creating new chat');

            const [currentUserDoc, otherUserDoc] = await Promise.all([
                db.collection('users').doc(currentUserId).get(),
                db.collection('users').doc(otherUserId).get()
            ]);

            const currentUserData = currentUserDoc.exists ? currentUserDoc.data() : {
                name: 'User',
                photoURL: '',
                role: 'user'
            };

            const otherUserData = otherUserDoc.exists ? otherUserDoc.data() : {
                name: 'User',
                photoURL: '',
                role: 'user'
            };

            const chatData = {
                participants: [currentUserId, otherUserId],
                participantInfo: {
                    [currentUserId]: {
                        name: currentUserData.name || 'User',
                        photoURL: currentUserData.photoURL || '',
                        role: currentUserData.role || 'user'
                    },
                    [otherUserId]: {
                        name: otherUserData.name || 'User',
                        photoURL: otherUserData.photoURL || '',
                        role: otherUserData.role || 'user'
                    }
                },
                officeId: officeId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessage: "Percakapan dimulai",
                lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessageSenderId: currentUserId,
                unreadCount: {
                    [currentUserId]: 0,
                    [otherUserId]: 1
                }
            };

            await chatRef.set(chatData);

            await chatRef.collection('messages').add({
                text: "Halo! Saya tertarik dengan properti Anda.",
                senderId: currentUserId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('✅ New chat created successfully');
        } else {
            console.log('✅ Existing chat found');
        }

        window.location.href = `chat.html?chatId=${chatId}`;

    } catch (error) {
        console.error("❌ Error creating chat:", error);
        Swal.fire('Terjadi Kesalahan', 'Tidak dapat memulai chat: ' + error.message, 'error');
    }
}

// Pastikan fungsi tersedia secara global
window.getOrCreateChat = getOrCreateChat;
window.contactOwnerFromReceipt = getOrCreateChat;