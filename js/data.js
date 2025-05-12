// data.js - Data operations module

// Firebase imports
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, deleteDoc, updateDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";

// Initialize Firebase services
const db = getFirestore();
const auth = getAuth();

export const data = {
    // Note operations
    notes: {
        // Add a new note
        async add(note) {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                const noteData = {
                    ...note,
                    userId: user.uid,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                
                const docRef = await addDoc(collection(db, 'notes'), noteData);
                return { id: docRef.id, ...noteData };
            } catch (error) {
                console.error('Error adding note:', error);
                throw error;
            }
        },
        
        // Get all notes for current user
        async getAll() {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                const q = query(
                    collection(db, 'notes'),
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'desc')
                );
                
                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('Error getting notes:', error);
                throw error;
            }
        },
        
        // Get a single note by ID
        async get(id) {
            try {
                const docRef = doc(db, 'notes', id);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    return { id: docSnap.id, ...docSnap.data() };
                } else {
                    throw new Error('Note not found');
                }
            } catch (error) {
                console.error('Error getting note:', error);
                throw error;
            }
        },
        
        // Update a note
        async update(id, updates) {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                // Get the note first to verify ownership
                const noteRef = doc(db, 'notes', id);
                const noteSnap = await getDoc(noteRef);
                
                if (!noteSnap.exists()) {
                    throw new Error('Note not found');
                }
                
                const noteData = noteSnap.data();
                if (noteData.userId !== user.uid) {
                    throw new Error('You do not have permission to update this note');
                }
                
                // Update the note
                await updateDoc(noteRef, {
                    ...updates,
                    updatedAt: new Date()
                });
                
                return { id, ...noteData, ...updates, updatedAt: new Date() };
            } catch (error) {
                console.error('Error updating note:', error);
                throw error;
            }
        },
        
        // Delete a note
        async delete(id) {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                // Get the note first to verify ownership
                const noteRef = doc(db, 'notes', id);
                const noteSnap = await getDoc(noteRef);
                
                if (!noteSnap.exists()) {
                    throw new Error('Note not found');
                }
                
                const noteData = noteSnap.data();
                if (noteData.userId !== user.uid) {
                    throw new Error('You do not have permission to delete this note');
                }
                
                // Delete the note
                await deleteDoc(noteRef);
                return true;
            } catch (error) {
                console.error('Error deleting note:', error);
                throw error;
            }
        },
        
        // Search notes
        async search(term) {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                const q = query(
                    collection(db, 'notes'),
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'desc')
                );
                
                const snapshot = await getDocs(q);
                const notes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Filter notes by search term
                // Note: This is a client-side search. For production,
                // consider using a server-side search solution.
                const searchTerm = term.toLowerCase();
                return notes.filter(note => {
                    const title = (note.title || '').toLowerCase();
                    const content = (note.content || '').toLowerCase();
                    return title.includes(searchTerm) || content.includes(searchTerm);
                });
            } catch (error) {
                console.error('Error searching notes:', error);
                throw error;
            }
        }
    },
    
    // Todo operations
    todos: {
        // Add a new todo
        async add(todo) {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                const todoData = {
                    ...todo,
                    userId: user.uid,
                    completed: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                
                const docRef = await addDoc(collection(db, 'todos'), todoData);
                return { id: docRef.id, ...todoData };
            } catch (error) {
                console.error('Error adding todo:', error);
                throw error;
            }
        },
        
        // Get all todos for current user
        async getAll() {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                const q = query(
                    collection(db, 'todos'),
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'desc')
                );
                
                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('Error getting todos:', error);
                throw error;
            }
        },
        
        // Get a single todo by ID
        async get(id) {
            try {
                const docRef = doc(db, 'todos', id);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    return { id: docSnap.id, ...docSnap.data() };
                } else {
                    throw new Error('Todo not found');
                }
            } catch (error) {
                console.error('Error getting todo:', error);
                throw error;
            }
        },
        
        // Update a todo
        async update(id, updates) {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                // Get the todo first to verify ownership
                const todoRef = doc(db, 'todos', id);
                const todoSnap = await getDoc(todoRef);
                
                if (!todoSnap.exists()) {
                    throw new Error('Todo not found');
                }
                
                const todoData = todoSnap.data();
                if (todoData.userId !== user.uid) {
                    throw new Error('You do not have permission to update this todo');
                }
                
                // Update the todo
                await updateDoc(todoRef, {
                    ...updates,
                    updatedAt: new Date()
                });
                
                return { id, ...todoData, ...updates, updatedAt: new Date() };
            } catch (error) {
                console.error('Error updating todo:', error);
                throw error;
            }
        },
        
        // Toggle todo completion status
        async toggleComplete(id) {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                // Get the todo first to verify ownership
                const todoRef = doc(db, 'todos', id);
                const todoSnap = await getDoc(todoRef);
                
                if (!todoSnap.exists()) {
                    throw new Error('Todo not found');
                }
                
                const todoData = todoSnap.data();
                if (todoData.userId !== user.uid) {
                    throw new Error('You do not have permission to update this todo');
                }
                
                // Toggle the completed status
                const newStatus = !todoData.completed;
                
                // Update the todo
                await updateDoc(todoRef, {
                    completed: newStatus,
                    updatedAt: new Date()
                });
                
                return { 
                    id, 
                    ...todoData, 
                    completed: newStatus, 
                    updatedAt: new Date() 
                };
            } catch (error) {
                console.error('Error toggling todo completion:', error);
                throw error;
            }
        },
        
        // Delete a todo
        async delete(id) {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                // Get the todo first to verify ownership
                const todoRef = doc(db, 'todos', id);
                const todoSnap = await getDoc(todoRef);
                
                if (!todoSnap.exists()) {
                    throw new Error('Todo not found');
                }
                
                const todoData = todoSnap.data();
                if (todoData.userId !== user.uid) {
                    throw new Error('You do not have permission to delete this todo');
                }
                
                // Delete the todo
                await deleteDoc(todoRef);
                return true;
            } catch (error) {
                console.error('Error deleting todo:', error);
                throw error;
            }
        },
        
        // Search todos
        async search(term) {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                const q = query(
                    collection(db, 'todos'),
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'desc')
                );
                
                const snapshot = await getDocs(q);
                const todos = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Filter todos by search term
                const searchTerm = term.toLowerCase();
                return todos.filter(todo => {
                    const title = (todo.title || '').toLowerCase();
                    const description = (todo.description || '').toLowerCase();
                    return title.includes(searchTerm) || description.includes(searchTerm);
                });
            } catch (error) {
                console.error('Error searching todos:', error);
                throw error;
            }
        }
    },
    
    // Password operations
    passwords: {
        // Add a new password
        async add(password) {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                const passwordData = {
                    ...password,
                    userId: user.uid,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                
                const docRef = await addDoc(collection(db, 'passwords'), passwordData);
                return { id: docRef.id, ...passwordData };
            } catch (error) {
                console.error('Error adding password:', error);
                throw error;
            }
        },
        
        // Get all passwords for current user
        async getAll() {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                const q = query(
                    collection(db, 'passwords'),
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'desc')
                );
                
                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('Error getting passwords:', error);
                throw error;
            }
        },
        
        // Get a single password by ID
        async get(id) {
            try {
                const docRef = doc(db, 'passwords', id);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    return { id: docSnap.id, ...docSnap.data() };
                } else {
                    throw new Error('Password not found');
                }
            } catch (error) {
                console.error('Error getting password:', error);
                throw error;
            }
        },
        
        // Update a password
        async update(id, updates) {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                // Get the password first to verify ownership
                const passwordRef = doc(db, 'passwords', id);
                const passwordSnap = await getDoc(passwordRef);
                
                if (!passwordSnap.exists()) {
                    throw new Error('Password not found');
                }
                
                const passwordData = passwordSnap.data();
                if (passwordData.userId !== user.uid) {
                    throw new Error('You do not have permission to update this password');
                }
                
                // Update the password
                await updateDoc(passwordRef, {
                    ...updates,
                    updatedAt: new Date()
                });
                
                return { id, ...passwordData, ...updates, updatedAt: new Date() };
            } catch (error) {
                console.error('Error updating password:', error);
                throw error;
            }
        },
        
        // Delete a password
        async delete(id) {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                // Get the password first to verify ownership
                const passwordRef = doc(db, 'passwords', id);
                const passwordSnap = await getDoc(passwordRef);
                
                if (!passwordSnap.exists()) {
                    throw new Error('Password not found');
                }
                
                const passwordData = passwordSnap.data();
                if (passwordData.userId !== user.uid) {
                    throw new Error('You do not have permission to delete this password');
                }
                
                // Delete the password
                await deleteDoc(passwordRef);
                return true;
            } catch (error) {
                console.error('Error deleting password:', error);
                throw error;
            }
        },
        
        // Search passwords
        async search(term) {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                const q = query(
                    collection(db, 'passwords'),
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'desc')
                );
                
                const snapshot = await getDocs(q);
                const passwords = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Filter passwords by search term
                const searchTerm = term.toLowerCase();
                return passwords.filter(password => {
                    const website = (password.website || '').toLowerCase();
                    const username = (password.username || '').toLowerCase();
                    const note = (password.note || '').toLowerCase();
                    return website.includes(searchTerm) || 
                           username.includes(searchTerm) || 
                           note.includes(searchTerm);
                });
            } catch (error) {
                console.error('Error searching passwords:', error);
                throw error;
            }
        }
    },
    
    // Contact operations
    contacts: {
        // Add a new contact
        async add(contact) {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                const contactData = {
                    ...contact,
                    userId: user.uid,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                
                const docRef = await addDoc(collection(db, 'contacts'), contactData);
                return { id: docRef.id, ...contactData };
            } catch (error) {
                console.error('Error adding contact:', error);
                throw error;
            }
        },
        
        // Get all contacts for current user
        async getAll() {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                const q = query(
                    collection(db, 'contacts'),
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'desc')
                );
                
                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('Error getting contacts:', error);
                throw error;
            }
        },
        
        // Get a single contact by ID
        async get(id) {
            try {
                const docRef = doc(db, 'contacts', id);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    return { id: docSnap.id, ...docSnap.data() };
                } else {
                    throw new Error('Contact not found');
                }
            } catch (error) {
                console.error('Error getting contact:', error);
                throw error;
            }
        },
        
        // Update a contact
        async update(id, updates) {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                // Get the contact first to verify ownership
                const contactRef = doc(db, 'contacts', id);
                const contactSnap = await getDoc(contactRef);
                
                if (!contactSnap.exists()) {
                    throw new Error('Contact not found');
                }
                
                const contactData = contactSnap.data();
                if (contactData.userId !== user.uid) {
                    throw new Error('You do not have permission to update this contact');
                }
                
                // Update the contact
                await updateDoc(contactRef, {
                    ...updates,
                    updatedAt: new Date()
                });
                
                return { id, ...contactData, ...updates, updatedAt: new Date() };
            } catch (error) {
                console.error('Error updating contact:', error);
                throw error;
            }
        },
        
        // Delete a contact
        async delete(id) {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                // Get the contact first to verify ownership
                const contactRef = doc(db, 'contacts', id);
                const contactSnap = await getDoc(contactRef);
                
                if (!contactSnap.exists()) {
                    throw new Error('Contact not found');
                }
                
                const contactData = contactSnap.data();
                if (contactData.userId !== user.uid) {
                    throw new Error('You do not have permission to delete this contact');
                }
                
                // Delete the contact
                await deleteDoc(contactRef);
                return true;
            } catch (error) {
                console.error('Error deleting contact:', error);
                throw error;
            }
        },
        
        // Search contacts
        async search(term) {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                const q = query(
                    collection(db, 'contacts'),
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'desc')
                );
                
                const snapshot = await getDocs(q);
                const contacts = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Filter contacts by search term
                const searchTerm = term.toLowerCase();
                return contacts.filter(contact => {
                    const name = (contact.name || '').toLowerCase();
                    const number = (contact.number || '').toLowerCase();
                    const notes = (contact.notes || '').toLowerCase();
                    return name.includes(searchTerm) || number.includes(searchTerm) || notes.includes(searchTerm);
                });
            } catch (error) {
                console.error('Error searching contacts:', error);
                throw error;
            }
        }
    },
    
    // User profile operations
    profile: {
        // Get the current user profile
        getUser() {
            const user = auth.currentUser;
            if (!user) return null;
            
            return {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL
            };
        },
        
        // Sign out the current user
        async signOut() {
            try {
                await auth.signOut();
                return true;
            } catch (error) {
                console.error('Error signing out:', error);
                throw error;
            }
        }
    },
    
    // Settings operations
    settings: {
        // Get user settings from localStorage
        getSettings() {
            try {
                const settingsStr = localStorage.getItem('xonote_settings');
                if (!settingsStr) {
                    return {
                        isDarkTheme: true
                    };
                }
                
                return JSON.parse(settingsStr);
            } catch (error) {
                console.error('Error getting settings:', error);
                return {
                    isDarkTheme: true
                };
            }
        },
        
        // Save user settings to localStorage
        saveSettings(settings) {
            try {
                localStorage.setItem('xonote_settings', JSON.stringify(settings));
                return true;
            } catch (error) {
                console.error('Error saving settings:', error);
                return false;
            }
        }
    }
};