// ===== FIREBASE CONFIG (fournie) =====
const firebaseConfig = {
    apiKey: "AIzaSyA-GkOeOjouwEXQmmAdgRwlTC2OjFtYIwk",
    authDomain: "ch-app-2ede3.firebaseapp.com",
    projectId: "ch-app-2ede3",
    storageBucket: "ch-app-2ede3.firebasestorage.app",
    messagingSenderId: "525688162725",
    appId: "1:525688162725:web:747f52edb6e17b91cb404c",
    measurementId: "G-JXVHPYBRQX"
};

// Initialisation Firebase (compat)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storage = firebase.storage();

// ===== VARIABLES GLOBALES =====
let currentUser = null; // { uid, name, email, photoURL }
let currentChatId = null;
let currentChatType = null; // 'private' ou 'group'
let currentLanguage = 'fr'; // par défaut

// ===== TRADUCTIONS =====
const translations = {
    fr: {
        login: "Connexion",
        register: "Inscription",
        email: "Email",
        pseudo: "Pseudo",
        loginBtn: "Se connecter",
        registerBtn: "S'inscrire",
        chats: "Chats",
        groups: "Groupes",
        ia: "IA",
        settings: "Paramètres",
        newChat: "Nouvelle conversation",
        newGroup: "Nouveau groupe",
        start: "Démarrer",
        cancel: "Annuler",
        create: "Créer",
        send: "Envoyer",
        typeMessage: "Écrire un message...",
        askIA: "Pose ta question...",
        noConversation: "Aucune conversation",
        noGroup: "Aucun groupe",
        userNotFound: "Email non trouvé",
        emailExists: "Cet email est déjà utilisé",
        fillFields: "Veuillez remplir tous les champs",
        registerSuccess: "Inscription réussie ! Connectez-vous.",
        logout: "Déconnexion",
        theme: "Thème",
        language: "Langue",
        aiName: "Je m'appelle CHARLES",
        aiDefault: "Mon concepteur n'a pas fini avec les mises à jour"
    },
    en: {
        login: "Login",
        register: "Register",
        email: "Email",
        pseudo: "Username",
        loginBtn: "Login",
        registerBtn: "Register",
        chats: "Chats",
        groups: "Groups",
        ia: "AI",
        settings: "Settings",
        newChat: "New conversation",
        newGroup: "New group",
        start: "Start",
        cancel: "Cancel",
        create: "Create",
        send: "Send",
        typeMessage: "Type a message...",
        askIA: "Ask a question...",
        noConversation: "No conversation",
        noGroup: "No group",
        userNotFound: "Email not found",
        emailExists: "Email already used",
        fillFields: "Please fill all fields",
        registerSuccess: "Registration successful! Please log in.",
        logout: "Logout",
        theme: "Theme",
        language: "Language",
        aiName: "My name is CHARLES",
        aiDefault: "My developer hasn't finished updates"
    }
};

// ===== FONCTIONS D'AUTH =====
window.showAuthTab = function(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    if (tab === 'login') {
        document.querySelector('[data-tab="login"]').classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        document.querySelector('[data-tab="register"]').classList.add('active');
        document.getElementById('registerForm').classList.add('active');
    }
};

// Inscription
window.register = async function() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const photoFile = document.getElementById('registerPhoto').files[0];

    if (!name || !email) {
        alert(translations[currentLanguage].fillFields);
        return;
    }

    // Vérifier si l'email existe déjà
    const usersRef = db.ref('users');
    const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
    if (snapshot.exists()) {
        alert(translations[currentLanguage].emailExists);
        return;
    }

    // Créer un nouvel utilisateur dans la base (sans mot de passe)
    const newUserRef = usersRef.push();
    let photoURL = '';
    if (photoFile) {
        const storageRef = storage.ref('profile_pics/' + newUserRef.key);
        await storageRef.put(photoFile);
        photoURL = await storageRef.getDownloadURL();
    }
    await newUserRef.set({
        name: name,
        email: email,
        photoURL: photoURL || 'default-avatar.png'
    });

    alert(translations[currentLanguage].registerSuccess);
    showAuthTab('login');
};

// Connexion
window.login = async function() {
    const email = document.getElementById('loginEmail').value.trim();
    if (!email) {
        alert(translations[currentLanguage].fillFields);
        return;
    }

    // Chercher l'utilisateur par email
    const snapshot = await db.ref('users').orderByChild('email').equalTo(email).once('value');
    if (!snapshot.exists()) {
        alert(translations[currentLanguage].userNotFound);
        return;
    }

    // Récupérer le premier utilisateur trouvé (l'email est unique)
    const uid = Object.keys(snapshot.val())[0];
    const userData = snapshot.val()[uid];
    currentUser = {
        uid: uid,
        name: userData.name,
        email: userData.email,
        photoURL: userData.photoURL
    };

    // Afficher l'application
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').classList.remove('hidden');
    loadUserProfile();
    loadChats();
    loadGroups();
};

window.logout = function() {
    currentUser = null;
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('mainApp').classList.add('hidden');
};

function loadUserProfile() {
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profilePic').src = currentUser.photoURL || 'default-avatar.png';
}

// ===== GESTION DES SECTIONS =====
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const section = this.dataset.section;
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(section + 'Section').classList.add('active');
    });
});

// ===== CHATS PRIVÉS =====
async function loadChats() {
    const list = document.getElementById('chatsList');
    list.innerHTML = '';
    const chatsRef = db.ref('userChats/' + currentUser.uid);
    const snap = await chatsRef.once('value');
    if (snap.exists()) {
        snap.forEach(child => {
            const chat = child.val();
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.innerHTML = `<img src="${chat.otherPhoto || 'default-avatar.png'}"><span>${chat.otherName}</span>`;
            div.onclick = () => openChat('private', child.key, chat.otherName);
            list.appendChild(div);
        });
    } else {
        list.innerHTML = '<p>' + translations[currentLanguage].noConversation + '</p>';
    }
}

async function loadGroups() {
    const list = document.getElementById('groupsList');
    list.innerHTML = '';
    const groupsRef = db.ref('userGroups/' + currentUser.uid);
    const snap = await groupsRef.once('value');
    if (snap.exists()) {
        snap.forEach(async child => {
            const groupId = child.key;
            const groupSnap = await db.ref('groups/' + groupId).once('value');
            const group = groupSnap.val();
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.innerHTML = `<img src="group-icon.png"><span>${group.name}</span>`;
            div.onclick = () => openChat('group', groupId, group.name);
            list.appendChild(div);
        });
    } else {
        list.innerHTML = '<p>' + translations[currentLanguage].noGroup + '</p>';
    }
}

window.showNewChatModal = function() {
    document.getElementById('newChatModal').classList.remove('hidden');
};

window.showNewGroupModal = function() {
    document.getElementById('newGroupModal').classList.remove('hidden');
};

window.closeModal = function() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
};

window.startPrivateChat = async function() {
    const email = document.getElementById('newChatEmail').value.trim();
    if (!email) return;
    const userSnap = await db.ref('users').orderByChild('email').equalTo(email).once('value');
    if (!userSnap.exists()) {
        alert(translations[currentLanguage].userNotFound);
        return;
    }
    const otherUid = Object.keys(userSnap.val())[0];
    const otherData = userSnap.val()[otherUid];
    const chatId = [currentUser.uid, otherUid].sort().join('_');
    await db.ref('userChats/' + currentUser.uid + '/' + chatId).set({
        otherUid: otherUid,
        otherName: otherData.name,
        otherPhoto: otherData.photoURL
    });
    await db.ref('userChats/' + otherUid + '/' + chatId).set({
        otherUid: currentUser.uid,
        otherName: currentUser.name,
        otherPhoto: currentUser.photoURL
    });
    closeModal();
    loadChats();
};

window.createGroup = async function() {
    const name = document.getElementById('newGroupName').value.trim();
    const emails = document.getElementById('newGroupMembers').value.split(',').map(e => e.trim());
    if (!name || emails.length === 0) return;
    const members = [currentUser.uid];
    for (let email of emails) {
        const snap = await db.ref('users').orderByChild('email').equalTo(email).once('value');
        if (snap.exists()) {
            members.push(Object.keys(snap.val())[0]);
        }
    }
    const groupId = db.ref('groups').push().key;
    await db.ref('groups/' + groupId).set({
        name: name,
        members: members,
        createdBy: currentUser.uid,
        createdAt: Date.now()
    });
    for (let uid of members) {
        await db.ref('userGroups/' + uid + '/' + groupId).set(true);
    }
    closeModal();
    loadGroups();
};

function openChat(type, id, name) {
    currentChatId = id;
    currentChatType = type;
    document.getElementById('currentChatName').textContent = name;
    document.getElementById('chatArea').classList.remove('hidden');
    document.getElementById('messages').innerHTML = '';

    const refPath = type === 'private' ? 'privateMessages' : 'groupMessages';
    db.ref(refPath + '/' + id).off();
    db.ref(refPath + '/' + id).on('child_added', snap => {
        const msg = snap.val();
        displayMessage(msg);
    });
}

function displayMessage(msg) {
    const div = document.createElement('div');
    div.className = `message ${msg.senderUid === currentUser.uid ? 'sent' : 'received'}`;
    div.textContent = msg.text;
    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = new Date(msg.timestamp).toLocaleTimeString();
    div.appendChild(time);
    document.getElementById('messages').appendChild(div);
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

window.sendMessage = async function() {
    const text = document.getElementById('messageText').value.trim();
    if (!text || !currentChatId) return;
    const refPath = currentChatType === 'private' ? 'privateMessages' : 'groupMessages';
    await db.ref(refPath + '/' + currentChatId).push({
        senderUid: currentUser.uid,
        senderName: currentUser.name,
        text: text,
        timestamp: Date.now()
    });
    document.getElementById('messageText').value = '';
};

window.closeChat = function() {
    currentChatId = null;
    document.getElementById('chatArea').classList.add('hidden');
};

// ===== IA =====
function calculate(expr) {
    expr = expr.replace(/[^0-9+\-*/().]/g, '');
    try {
        const fn = new Function('return ' + expr);
        return fn();
    } catch (e) {
        return null;
    }
}

window.sendIAMessage = function() {
    const input = document.getElementById('iaInput');
    const question = input.value.trim();
    if (!question) return;

    // Afficher la question
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message sent';
    msgDiv.textContent = question;
    document.getElementById('iaMessages').appendChild(msgDiv);

    // Générer réponse
    let answer = '';
    const lowerQ = question.toLowerCase();
    if (/^[0-9+\-*/().\s]+$/.test(question) && /[0-9]/.test(question)) {
        const result = calculate(question);
        if (result !== null) {
            answer = result.toString();
        } else {
            answer = translations[currentLanguage].aiDefault;
        }
    } else if (lowerQ.includes('nom') || lowerQ.includes('name') || lowerQ.includes('appelles')) {
        answer = translations[currentLanguage].aiName;
    } else {
        answer = translations[currentLanguage].aiDefault;
    }

    const respDiv = document.createElement('div');
    respDiv.className = 'message received';
    respDiv.textContent = answer;
    document.getElementById('iaMessages').appendChild(respDiv);

    input.value = '';
    document.getElementById('iaMessages').scrollTop = document.getElementById('iaMessages').scrollHeight;
};

// ===== THÈMES =====
window.setTheme = function(theme) {
    document.body.className = 'theme-' + theme;
    localStorage.setItem('theme', theme);
};

// ===== LANGUE =====
window.setLanguage = function(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    alert('Langue changée en ' + (lang === 'fr' ? 'Français' : 'English'));
};

// Charger préférences
const savedTheme = localStorage.getItem('theme');
if (savedTheme) setTheme(savedTheme);
const savedLang = localStorage.getItem('language');
if (savedLang) setLanguage(savedLang);

// Initialisation des écouteurs d'onglets d'auth
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        showAuthTab(tab.dataset.tab);
    });
});
