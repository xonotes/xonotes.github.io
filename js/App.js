// App.js - Main application script
import { data } from "./data.js";

// Firebase imports
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

// Initialize Firebase instances
// Use the instances exported from the HTML file if available
const auth = window.firebaseAuth || getAuth();
const db = window.firebaseDb || getFirestore();

// DOM Elements
const app = document.getElementById("app");
const loadingScreen = document.getElementById("loading-screen");
const loadingProgress = document.getElementById("loading-progress");
const loggedOutView = document.getElementById("logged-out-view");
const loggedInView = document.getElementById("logged-in-view");
const notesContent = document.getElementById("notes-content");
const todoContent = document.getElementById("todo-content");
const passwordContent = document.getElementById("password-content");
const contactContent = document.getElementById("contact-content");
const tabButtons = document.querySelectorAll(".tab-btn");
const addButton = document.getElementById("add-btn");
const searchButton = document.getElementById("search-btn");
const settingsButton = document.getElementById("settings-btn");
const modalsContainer = document.getElementById("modals-container");
const tabsContainer = document.getElementById("tabs-container");
const tabContentContainer = document.getElementById("tab-content-container");

// App State
const state = {
  currentTab: "notes",
    currentUser: null,
    notes: [],
    todos: [],
    passwords: [],
  contacts: [],
    isDarkTheme: true,
    isPremium: false,
    premiumData: null,
    premiumExpiry: null,
    membershipType: null,
    // Pagination state
    pagination: {
        notes: {
            limit: 10,
      currentPage: 1,
        },
        todos: {
            limit: 10,
      currentPage: 1,
        },
        passwords: {
            limit: 10,
      currentPage: 1,
    },
    contacts: {
      limit: 10,
      currentPage: 1,
    },
    },
    limits: {
        free: {
            notes: 5,
            todos: 3,
            passwords: 1,
      contacts: 3,
      noteCharLimit: 1000,
        },
        premium: {
            notes: Infinity,
            todos: Infinity,
            passwords: Infinity,
      contacts: Infinity,
      noteCharLimit: 10000,
    },
    },
    // Order of tabs for swipe navigation
  tabOrder: ["notes", "todo", "password", "contact"],
};

// Initialize App
function initApp() {
    // Start loading animation
    animateLoading();
    
    // Show loading screen
  loadingScreen.classList.remove("hidden");
  app.classList.add("hidden");
    
    // Load theme settings
    loadThemeSettings();

  // Check if should show PWA install prompt (mobile only)
  checkAndShowPWAInstallPrompt();
    
    // Check authentication state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("User signed in:", user.uid);
            // User is signed in
            state.currentUser = user;
            checkPremiumStatus(user.email).then(() => {
                showLoggedInView();
                loadUserData();
                handleAdsDisplay();
            });
        } else {
            console.log("User signed out");
            // User is signed out
            state.currentUser = null;
            state.isPremium = false;
            state.premiumData = null;
            state.premiumExpiry = null;
            state.membershipType = null;
            showLoggedOutView();
            handleAdsDisplay();
        }
        
        // Hide loading screen after 2 seconds minimum with smooth animation
        setTimeout(() => {
      if (loadingProgress) loadingProgress.style.width = "100%";
            setTimeout(() => {
        loadingScreen.classList.add("fade-out");
                setTimeout(() => {
          loadingScreen.classList.add("hidden");
          app.classList.remove("hidden");
          app.classList.add("fade-in");
                }, 300);
            }, 400);
        }, 1500);
    });
    
    // Set up event listeners
    setupEventListeners();
}

// Check if device is mobile and show PWA install prompt
function checkAndShowPWAInstallPrompt() {
  // Only run on mobile devices
  if (!isMobileDevice()) return;

  // Check if already installed as PWA
  if (isPWAInstalled()) return;

  // Check if user has dismissed or installed before
  const hasUserDismissedPrompt = localStorage.getItem("pwa_prompt_dismissed");
  const hasUserInstalledPWA = localStorage.getItem("pwa_installed");

  if (hasUserInstalledPWA === "true") return;

  // If user dismissed prompt but didn't install, still show after 5 seconds
  setTimeout(() => {
    showPWAInstallPrompt();
  }, 5000);
}

// Check if current device is mobile
function isMobileDevice() {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768
  );
}

// Check if app is already installed as PWA
function isPWAInstalled() {
  // Check if app is in standalone mode or display-mode is standalone
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

// Show the PWA installation prompt
function showPWAInstallPrompt() {
  // Don't show if already installed
  if (isPWAInstalled()) {
    localStorage.setItem("pwa_installed", "true");
    return;
  }

  // Create the PWA install prompt element
  const promptElement = document.createElement("div");
  promptElement.className =
    "pwa-install-prompt fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 shadow-lg z-50 transform transition-transform";
  promptElement.innerHTML = `
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <img src="assets/favicon-96x96.png" alt="XoNote Logo" class="w-10 h-10 mr-3 rounded-[10px]">

        <div>
          <h3 class="font-bold">Install XoNote</h3>
          <p class="text-sm text-gray-300">Notes, Todo & Password Manager</p>
        </div>
      </div>
      <div class="flex items-center">
        <button class="pwa-install-btn bg-yellow-400 text-black rounded-md px-3 py-1 mr-2 font-medium">
          Install
        </button>
        <button class="pwa-close-btn text-gray-400 hover:text-white">
          <i class="bx bx-x text-2xl"></i>
        </button>
      </div>
    </div>
  `;

  // Add to DOM
  document.body.appendChild(promptElement);

  // Apply slide-up animation after a small delay
  setTimeout(() => {
    promptElement.classList.add("slide-in-bottom");
  }, 10);

  // Add event listeners
  const installButton = promptElement.querySelector(".pwa-install-btn");
  const closeButton = promptElement.querySelector(".pwa-close-btn");

  // Handle the install button click
  installButton.addEventListener("click", () => {
    // Try to show the install prompt if available
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      window.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the A2HS prompt");
          localStorage.setItem("pwa_installed", "true");
        }
        window.deferredPrompt = null;
      });
    } else {
      // If no prompt available, show manual installation instructions
      showManualInstallInstructions();
    }
    // Close the prompt
    closeInstallPrompt(promptElement);
  });

  // Handle the close button click
  closeButton.addEventListener("click", () => {
    closeInstallPrompt(promptElement);
    // Mark as dismissed but don't prevent future prompts
    localStorage.setItem("pwa_prompt_dismissed", Date.now().toString());
  });
}

// Close the install prompt with animation
function closeInstallPrompt(promptElement) {
  promptElement.classList.add("slide-out-bottom");
  setTimeout(() => {
    promptElement.remove();
  }, 300);
}

// Show manual installation instructions
function showManualInstallInstructions() {
  const userAgent = navigator.userAgent.toLowerCase();
  let message = "";

  if (userAgent.includes("chrome")) {
    message = 'Tap the menu button (⋮) and select "Add to Home screen"';
  } else if (userAgent.includes("firefox")) {
    message = 'Tap the menu button (⋮) and select "Install"';
  } else if (userAgent.includes("safari")) {
    message = 'Tap the share button (📤) and select "Add to Home Screen"';
  } else {
    message = "Use your browser's menu to add this app to your home screen";
  }

  showToast(message, "info", 6000);
}

// Listen for the beforeinstallprompt event
window.addEventListener("beforeinstallprompt", (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Store the event so it can be triggered later
  window.deferredPrompt = e;
});

// Listen for app installed event
window.addEventListener("appinstalled", () => {
  console.log("PWA was installed");
  localStorage.setItem("pwa_installed", "true");

  // If the install prompt is still showing, close it
  const promptElement = document.querySelector(".pwa-install-prompt");
  if (promptElement) {
    closeInstallPrompt(promptElement);
  }
});

// Animate the loading progress bar
function animateLoading() {
    if (!loadingProgress) return;
    
    let width = 0;
    const interval = setInterval(() => {
        width += 1;
        loadingProgress.style.width = `${Math.min(width, 90)}%`;
        
        if (width >= 90) {
            clearInterval(interval);
        }
    }, 20);
}

// Show logged out view (landing page)
function showLoggedOutView() {
  loggedInView.classList.add("hidden");
  loggedOutView.classList.remove("hidden");
}

// Show logged in view (app interface)
function showLoggedInView() {
  loggedOutView.classList.add("hidden");
  loggedInView.classList.remove("hidden");
    
    // Set active tab
    setActiveTab(state.currentTab);
    
    // Show pricing popup for first time users
    checkFirstTimeUser();
}

// Check if user is logging in for the first time and show pricing
function checkFirstTimeUser() {
    try {
        const firstTimeKey = `xonote_first_login_${state.currentUser.uid}`;
        const hasVisitedBefore = localStorage.getItem(firstTimeKey);
        
        if (!hasVisitedBefore && !state.isPremium) {
            // Set the flag to prevent showing on every login
      localStorage.setItem(firstTimeKey, "true");
            
            // Small delay to ensure UI is ready
            setTimeout(() => {
                showWelcomePricingPopup();
            }, 800);
        }
    } catch (error) {
    console.error("Error checking first time user:", error);
    }
}

// Show welcome pricing popup
function showWelcomePricingPopup() {
  const modal = document.createElement("div");
  modal.className =
    "modal pricing-modal fixed inset-0 bg-black/80 flex items-start justify-center z-50 overflow-y-auto p-2 sm:p-4 fade-in";
    modal.innerHTML = `
        <div class="modal-content bg-gray-900 w-full max-w-3xl mx-auto my-4 sm:my-8 rounded-lg shadow-xl p-0 overflow-hidden slide-up">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-800 bg-gray-950">
                <div>
                    <h3 class="text-xl sm:text-2xl font-bold text-white">Welcome to XoNote!</h3>
                    <p class="text-gray-400 text-sm mt-1">Choose a plan that works for you</p>
                </div>
                <button class="close-pricing-btn text-gray-400 hover:text-white">
                    <i class="bx bx-x text-2xl"></i>
                </button>
            </div>
            
            <div class="p-3 sm:p-4 md:p-6">
                <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 sm:p-4 mb-6 text-blue-300 text-sm sm:text-base">
                    <div class="flex items-start">
                        <i class="bx bx-info-circle text-blue-400 text-lg sm:text-xl mt-0.5 mr-2 flex-shrink-0"></i>
                        <div>
                            <h4 class="font-semibold mb-1">Get Started with XoNote</h4>
                            <p>You're currently on the free plan. Upgrade to premium for unlimited notes, todos, and passwords!</p>
                        </div>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Free Plan -->
                    <div class="border border-gray-800 rounded-lg overflow-hidden">
                        <div class="bg-gray-800 p-3 sm:p-4">
                            <h4 class="text-lg sm:text-xl font-bold mb-1 sm:mb-2">Free Plan</h4>
                            <p class="text-gray-400 mb-2 sm:mb-3 text-sm sm:text-base">Basic features for personal use</p>
                            <div class="text-xl sm:text-2xl font-bold text-white">₹0<span class="text-base sm:text-lg font-normal text-gray-400">/forever</span></div>
                        </div>
                        <div class="p-3 sm:p-4">
                            <ul class="space-y-1.5 sm:space-y-2 text-sm sm:text-base mb-3 sm:mb-4">
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Up to ${state.limits.free.notes} notes</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Up to ${state.limits.free.todos} todos</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Up to ${state.limits.free.passwords} saved password</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Up to ${state.limits.free.noteCharLimit} characters per note</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-x text-red-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Contains ads</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-x text-red-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>No editing after creation</span>
                                </li>
                            </ul>
                            <div>
                                <button class="continue-free-btn w-full py-2 sm:py-3 px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md font-medium border border-gray-600 transition text-sm sm:text-base">
                                    Continue with Free
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Premium Plan -->
                    <div class="border border-yellow-500/50 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(250,204,21,0.15)]">
                        <div class="bg-gradient-to-r from-yellow-600/90 to-yellow-500/90 p-3 sm:p-4 relative">
                            <div class="absolute top-0 right-0 bg-yellow-500 text-xs font-bold uppercase py-1 px-2 sm:px-3 text-black transform translate-y-0 rounded-bl-lg">RECOMMENDED</div>
                            <h4 class="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-white">Premium Plan</h4>
                            <p class="text-yellow-100/80 mb-2 sm:mb-3 text-sm sm:text-base">All features for power users</p>
                            <div class="tabs inline-flex bg-black/20 p-1 rounded-md mb-2 text-xs sm:text-sm">
                                <button class="tab-monthly tab-active px-2 sm:px-3 py-0.5 sm:py-1 rounded-md">Monthly</button>
                                <button class="tab-yearly px-2 sm:px-3 py-0.5 sm:py-1 rounded-md">Yearly <span class="text-xs bg-yellow-400/90 text-black rounded px-1 ml-1">-20%</span></button>
                            </div>
                            <div class="text-xl sm:text-2xl font-bold text-white monthly-price">₹19<span class="text-base sm:text-lg font-normal text-yellow-100/70">/month</span></div>
                            <div class="text-xl sm:text-2xl font-bold text-white yearly-price hidden">₹182<span class="text-base sm:text-lg font-normal text-yellow-100/70">/year</span></div>
                        </div>
                        <div class="p-3 sm:p-4">
                            <ul class="space-y-1.5 sm:space-y-2 text-sm sm:text-base mb-3 sm:mb-4">
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Unlimited notes</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Unlimited todos</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Unlimited passwords</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Up to 10,000 characters per note</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>No ads</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Edit anytime</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Premium badge</span>
                                </li>
                            </ul>
                            <div>
                                <button class="buy-premium-btn w-full py-2 sm:py-3 px-4 bg-yellow-500 hover:bg-yellow-600 text-black rounded-md font-medium transition text-sm sm:text-base">
                                    Get Premium
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add to DOM
    modalsContainer.appendChild(modal);
  document.body.classList.add("overflow-hidden");
    
    // Toggle between monthly and yearly pricing
  const monthlyTab = modal.querySelector(".tab-monthly");
  const yearlyTab = modal.querySelector(".tab-yearly");
  const monthlyPrice = modal.querySelector(".monthly-price");
  const yearlyPrice = modal.querySelector(".yearly-price");

  monthlyTab.addEventListener("click", () => {
    monthlyTab.classList.add("tab-active");
    yearlyTab.classList.remove("tab-active");
    monthlyPrice.classList.remove("hidden");
    yearlyPrice.classList.add("hidden");
  });

  yearlyTab.addEventListener("click", () => {
    yearlyTab.classList.add("tab-active");
    monthlyTab.classList.remove("tab-active");
    yearlyPrice.classList.remove("hidden");
    monthlyPrice.classList.add("hidden");
    });
    
    // Continue with free button
  modal.querySelector(".continue-free-btn").addEventListener("click", () => {
        closeModal(modal);
    });
    
    // Buy premium button click
  modal.querySelector(".buy-premium-btn").addEventListener("click", () => {
    const selectedPlan = yearlyTab.classList.contains("tab-active")
      ? "yearly"
      : "monthly";
        showMembershipInputPopup(selectedPlan);
        closeModal(modal);
    });
    
    // Close button click
  modal.querySelector(".close-pricing-btn").addEventListener("click", () => {
        closeModal(modal);
    });
    
    // Close on outside click
  modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
}

// Set up event listeners
function setupEventListeners() {
    // Tab navigation
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabName = button.getAttribute("data-tab");
            setActiveTab(tabName);
        });
    });
    
    // Add swipe navigation for tabs
    setupSwipeNavigation();
    
    // Add button
  addButton.addEventListener("click", () => {
        switch (state.currentTab) {
      case "notes":
        if (canAddItem("notes")) {
                    showNoteEditor();
                } else {
          showPricingPopup("notes");
                }
                break;
      case "todo":
        if (canAddItem("todos")) {
                    showTodoEditor();
                } else {
          showPricingPopup("todos");
                }
                break;
      case "password":
        if (canAddItem("passwords")) {
                    showPasswordEditor();
                } else {
          showPricingPopup("passwords");
        }
        break;
      case "contact":
        if (canAddItem("contacts")) {
          showContactEditor();
        } else {
          showPricingPopup("contacts");
                }
                break;
        }
    });
    
    // Search button
  searchButton.addEventListener("click", () => {
        showSearchScreen();
    });
    
    // Settings button
  settingsButton.addEventListener("click", () => {
        showSettingsScreen();
    });
}

// Setup swipe navigation
function setupSwipeNavigation() {
    // Only setup if the tab content container exists
    if (!tabContentContainer) return;
    
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 50; // Minimum distance for a swipe to register
    
    // Add touch event listeners
  tabContentContainer.addEventListener(
    "touchstart",
    (e) => {
        touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true }
  );
    
  tabContentContainer.addEventListener(
    "touchend",
    (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    },
    { passive: true }
  );
    
    // Handle swipe direction and change tabs
    function handleSwipe() {
        const swipeDistance = touchEndX - touchStartX;
        
        // If the swipe is too short, don't do anything
        if (Math.abs(swipeDistance) < minSwipeDistance) return;
        
        // Get the current tab index
        const currentTabIndex = state.tabOrder.indexOf(state.currentTab);
        
        if (swipeDistance > 0) {
            // Swipe right - go to previous tab
            if (currentTabIndex > 0) {
                const prevTab = state.tabOrder[currentTabIndex - 1];
                setActiveTab(prevTab);
            }
        } else {
            // Swipe left - go to next tab
            if (currentTabIndex < state.tabOrder.length - 1) {
                const nextTab = state.tabOrder[currentTabIndex + 1];
                setActiveTab(nextTab);
            }
        }
    }
    
    // Add animation for smoother tab transitions
  const style = document.createElement("style");
    style.textContent = `
        .tab-content {
            transition: opacity 0.3s ease-in-out;
        }
        .tab-slide-left {
            animation: slideLeft 0.3s forwards;
        }
        .tab-slide-right {
            animation: slideRight 0.3s forwards;
        }
        @keyframes slideLeft {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(-20px); opacity: 0; }
        }
        @keyframes slideRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(20px); opacity: 0; }
        }
        @keyframes slideInLeft {
            from { transform: translateX(-20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInRight {
            from { transform: translateX(20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

// Load user data from Firestore
async function loadUserData() {
    try {
        console.log("Loading user data for:", state.currentUser.uid);
        
        await Promise.all([
            loadNotes(),
            loadTodos(),
      loadPasswords(),
      loadContacts(),
        ]);
        
        console.log("Data loaded successfully");
    } catch (error) {
    console.error("Error loading user data:", error);
    showToast("Error loading data: " + error.message, "error");
    }
}

// Reset pagination for a specific tab or all tabs
function resetPagination(tabName = null) {
    if (tabName) {
        // Reset pagination for a specific tab
        if (state.pagination[tabName]) {
            state.pagination[tabName].currentPage = 1;
        }
    } else {
        // Reset pagination for all tabs
    Object.keys(state.pagination).forEach((tab) => {
            state.pagination[tab].currentPage = 1;
        });
    }
}

// Set active tab
function setActiveTab(tabName) {
    // Don't do anything if it's already the active tab
    if (state.currentTab === tabName) return;
    
    // Get old tab information for animation direction
    const oldTabIndex = state.tabOrder.indexOf(state.currentTab);
    const newTabIndex = state.tabOrder.indexOf(tabName);
  const direction = newTabIndex > oldTabIndex ? "left" : "right";
    
    // Get the current tab content
  const currentTabContent = document.getElementById(
    `${state.currentTab}-content`
  );
    const newTabContent = document.getElementById(`${tabName}-content`);
    
    if (currentTabContent && newTabContent) {
        // Add slide-out animation
        currentTabContent.classList.add(`tab-slide-${direction}`);
        
        // After animation completes, hide old tab and show new one
        setTimeout(() => {
            // Update state
            state.currentTab = tabName;
            
            // Reset pagination for the active tab
            resetPagination(tabName);
            
            // Update UI for all tabs buttons
      tabButtons.forEach((button) => {
        const buttonTab = button.getAttribute("data-tab");
                if (buttonTab === tabName) {
          button.classList.add("active", "text-yellow-400");
          button.classList.remove("text-gray-400");
                } else {
          button.classList.remove("active", "text-yellow-400");
          button.classList.add("text-gray-400");
                }
            });
            
            // Hide/show tab content
      const tabContents = document.querySelectorAll(".tab-content");
      tabContents.forEach((content) => {
        content.classList.add("hidden");
        content.classList.remove("tab-slide-left", "tab-slide-right");
            });
            
            // Show new tab
      newTabContent.classList.remove("hidden");
            
            // Apply slide-in animation for the new tab
      newTabContent.style.animation = `slideIn${
        direction === "left" ? "Right" : "Left"
      } 0.3s forwards`;
            
            // Remove animation after it completes
            setTimeout(() => {
        newTabContent.style.animation = "";
            }, 300);
        }, 280); // Slightly less than animation duration
    } else {
        // Fallback for when tab content is not found
        state.currentTab = tabName;
        resetPagination(tabName);
        
        // Update UI
    tabButtons.forEach((button) => {
      const buttonTab = button.getAttribute("data-tab");
            if (buttonTab === tabName) {
        button.classList.add("active", "text-yellow-400");
        button.classList.remove("text-gray-400");
            } else {
        button.classList.remove("active", "text-yellow-400");
        button.classList.add("text-gray-400");
            }
        });
        
        // Show/hide tab content
    const tabContents = document.querySelectorAll(".tab-content");
    tabContents.forEach((content) => {
      content.classList.add("hidden");
    });

    document.getElementById(`${tabName}-content`)?.classList.remove("hidden");
    }
}

// Load notes from Firestore
async function loadNotes() {
    if (!state.currentUser) return;
    
    try {
        console.log("Loading notes...");
        const notesQuery = query(
      collection(db, "notes"),
      where("userId", "==", state.currentUser.uid),
      orderBy("createdAt", "desc")
        );
        
        const snapshot = await getDocs(notesQuery);
        console.log(`Found ${snapshot.docs.length} notes`);
        
    state.notes = snapshot.docs.map((doc) => {
            const data = doc.data();
            // Ensure dates are properly converted
            return {
            id: doc.id,
                ...data,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate()
          : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate
          ? data.updatedAt.toDate()
          : new Date(data.updatedAt),
            };
        });
        
        renderNotes();
    } catch (error) {
    console.error("Error loading notes:", error);
    showToast("Failed to load notes: " + error.message, "error");
    }
}

// Load todos from Firestore
async function loadTodos() {
    if (!state.currentUser) return;
    
    try {
        console.log("Loading todos...");
        const todosQuery = query(
      collection(db, "todos"),
      where("userId", "==", state.currentUser.uid),
      orderBy("createdAt", "desc")
        );
        
        const snapshot = await getDocs(todosQuery);
        console.log(`Found ${snapshot.docs.length} todos`);
        
    state.todos = snapshot.docs.map((doc) => {
            const data = doc.data();
            // Ensure dates are properly converted
            return {
            id: doc.id,
                ...data,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate()
          : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate
          ? data.updatedAt.toDate()
          : new Date(data.updatedAt),
            };
        });
        
        renderTodos();
    } catch (error) {
    console.error("Error loading todos:", error);
    showToast("Failed to load todos: " + error.message, "error");
    }
}

// Load passwords from Firestore
async function loadPasswords() {
    if (!state.currentUser) return;
    
    try {
        console.log("Loading passwords...");
        const passwordsQuery = query(
      collection(db, "passwords"),
      where("userId", "==", state.currentUser.uid),
      orderBy("createdAt", "desc")
        );
        
        const snapshot = await getDocs(passwordsQuery);
        console.log(`Found ${snapshot.docs.length} passwords`);
        
    state.passwords = snapshot.docs.map((doc) => {
            const data = doc.data();
            // Ensure dates are properly converted
            return {
            id: doc.id,
                ...data,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate()
          : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate
          ? data.updatedAt.toDate()
          : new Date(data.updatedAt),
            };
        });
        
        renderPasswords();
    } catch (error) {
    console.error("Error loading passwords:", error);
    showToast("Failed to load passwords: " + error.message, "error");
  }
}

// Load contacts from Firestore
async function loadContacts() {
  if (!state.currentUser) return;

  try {
    console.log("Loading contacts...");
    const contactsQuery = query(
      collection(db, "contacts"),
      where("userId", "==", state.currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(contactsQuery);
    console.log(`Found ${snapshot.docs.length} contacts`);

    state.contacts = snapshot.docs.map((doc) => {
      const data = doc.data();
      // Ensure dates are properly converted
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate()
          : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate
          ? data.updatedAt.toDate()
          : new Date(data.updatedAt),
      };
    });

    renderContacts();
  } catch (error) {
    console.error("Error loading contacts:", error);
    showToast("Failed to load contacts: " + error.message, "error");
    }
}

// Render notes
function renderNotes() {
    if (!notesContent) return;
    
    if (state.notes.length === 0) {
        notesContent.innerHTML = `
            <div class="text-center py-10">
                <i class="bx bx-note text-gray-600 text-6xl mb-4"></i>
                <h3 class="text-xl font-semibold mb-2">No Notes Yet</h3>
                <p class="text-gray-400 mb-6">Create your first note by clicking the + button</p>
            </div>
        `;
        return;
    }
    
    // Calculate pagination
    const { limit, currentPage } = state.pagination.notes;
    const startIndex = 0;
    const endIndex = currentPage * limit;
    const hasMore = endIndex < state.notes.length;
    
    // Get only the notes for the current page
    const visibleNotes = state.notes.slice(startIndex, endIndex);
    
    // Clear existing content
  notesContent.innerHTML = "";
    
    // Add note cards
  visibleNotes.forEach((note) => {
    const noteCard = document.createElement("div");
    noteCard.className =
      "note-card bg-gray-800 rounded-lg p-4 mb-4 cursor-pointer";
    noteCard.setAttribute("data-id", note.id);
        noteCard.innerHTML = `
            <h3 class="text-xl font-semibold mb-2">${
              note.title || "Untitled Note"
            }</h3>
            <p class="text-gray-400 line-clamp-2">${note.content || ""}</p>
            <div class="text-gray-500 text-xs mt-3">
                ${formatDate(note.createdAt)}
            </div>
        `;
        
        // Add click event to view note
    noteCard.addEventListener("click", () => {
      const noteId = noteCard.getAttribute("data-id");
      const note = state.notes.find((n) => n.id === noteId);
            if (note) {
                showNoteViewer(note);
            }
        });
        
        notesContent.appendChild(noteCard);
    });
    
    // Add 'Load More' button if there are more notes
    if (hasMore) {
    const loadMoreButton = document.createElement("button");
    loadMoreButton.className =
      "load-more-btn w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg mb-4 flex items-center justify-center transition-all";
        loadMoreButton.innerHTML = `
            <span>Load More</span>
            <i class="bx bx-chevron-down ml-2"></i>
        `;
        
    loadMoreButton.addEventListener("click", () => {
            state.pagination.notes.currentPage += 1;
            renderNotes();
        });
        
        notesContent.appendChild(loadMoreButton);
    }
}

// Render todos
function renderTodos() {
    if (!todoContent) return;
    
    if (state.todos.length === 0) {
        todoContent.innerHTML = `
            <div class="text-center py-10">
                <i class="bx bx-task text-gray-600 text-6xl mb-4"></i>
                <h3 class="text-xl font-semibold mb-2">No Todos Yet</h3>
                <p class="text-gray-400 mb-6">Create your first todo by clicking the + button</p>
            </div>
        `;
        return;
    }
    
    // Calculate pagination
    const { limit, currentPage } = state.pagination.todos;
    const startIndex = 0;
    const endIndex = currentPage * limit;
    const hasMore = endIndex < state.todos.length;
    
    // Get only the todos for the current page
    const visibleTodos = state.todos.slice(startIndex, endIndex);
    
    // Clear existing content
  todoContent.innerHTML = "";
    
    // Add todo items
  visibleTodos.forEach((todo) => {
    const todoItem = document.createElement("div");
    todoItem.className = `todo-item bg-gray-800 rounded-lg p-4 mb-4 cursor-pointer ${
      todo.completed ? "completed" : ""
    }`;
    todoItem.setAttribute("data-id", todo.id);
        todoItem.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0 pt-1">
                    <div class="w-6 h-6 border-2 rounded-md ${
                      todo.completed
                        ? "bg-yellow-400 border-yellow-400"
                        : "border-gray-600"
                    } flex items-center justify-center">
                        ${
                          todo.completed
                            ? '<i class="bx bx-check text-black"></i>'
                            : ""
                        }
                    </div>
                </div>
                <div class="ml-3 flex-grow">
                    <h3 class="text-lg font-semibold ${
                      todo.completed ? "line-through text-gray-500" : ""
                    }">${todo.title || "Untitled Todo"}</h3>
                    ${
                      todo.description
                        ? `<p class="text-gray-400 mt-1 ${
                            todo.completed ? "line-through opacity-70" : ""
                          }">${todo.description}</p>`
                        : ""
                    }
                    <div class="text-gray-500 text-xs mt-2">
                        ${formatDate(todo.createdAt)}
                    </div>
                </div>
            </div>
        `;
        
        // Add click event to view todo
    todoItem.addEventListener("click", () => {
      const todoId = todoItem.getAttribute("data-id");
      const todo = state.todos.find((t) => t.id === todoId);
            if (todo) {
                showTodoViewer(todo);
            }
        });
        
        todoContent.appendChild(todoItem);
    });
    
    // Add 'Load More' button if there are more todos
    if (hasMore) {
    const loadMoreButton = document.createElement("button");
    loadMoreButton.className =
      "load-more-btn w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg mb-4 flex items-center justify-center transition-all";
        loadMoreButton.innerHTML = `
            <span>Load More</span>
            <i class="bx bx-chevron-down ml-2"></i>
        `;
        
    loadMoreButton.addEventListener("click", () => {
            state.pagination.todos.currentPage += 1;
            renderTodos();
        });
        
        todoContent.appendChild(loadMoreButton);
    }
}

// Render passwords
function renderPasswords() {
    if (!passwordContent) return;
    
    if (state.passwords.length === 0) {
        passwordContent.innerHTML = `
            <div class="text-center py-10">
                <i class="bx bx-lock-alt text-gray-600 text-6xl mb-4"></i>
                <h3 class="text-xl font-semibold mb-2">No Passwords Yet</h3>
                <p class="text-gray-400 mb-6">Save your first password by clicking the + button</p>
            </div>
        `;
        return;
    }
    
    // Calculate pagination
    const { limit, currentPage } = state.pagination.passwords;
    const startIndex = 0;
    const endIndex = currentPage * limit;
    const hasMore = endIndex < state.passwords.length;
    
    // Get only the passwords for the current page
    const visiblePasswords = state.passwords.slice(startIndex, endIndex);
    
    // Clear existing content
  passwordContent.innerHTML = "";
    
    // Add password cards
  visiblePasswords.forEach((password) => {
        const domain = extractDomain(password.website);
        const faviconUrl = getFaviconUrl(domain);
        
    const passwordCard = document.createElement("div");
    passwordCard.className =
      "password-card bg-gray-800 rounded-lg p-4 mb-4 cursor-pointer";
    passwordCard.setAttribute("data-id", password.id);
        passwordCard.innerHTML = `
            <div class="flex items-center mb-2">
                ${
                  faviconUrl
                    ? `<img src="${faviconUrl}" alt="${password.website}" class="w-6 h-6 mr-2" onerror="this.onerror=null; this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
                    <i class="bx bx-globe text-blue-400 mr-2 hidden"></i>` 
                    : `<i class="bx bx-globe text-blue-400 mr-2"></i>`
                }
                <h3 class="text-xl font-semibold">${
                  password.website || "Unnamed Site"
                }</h3>
            </div>
            <p class="text-gray-400">${password.username || "No username"}</p>
            <p class="password-field text-gray-500 mt-1">••••••••••••</p>
            <div class="text-gray-500 text-xs mt-3">
                ${formatDate(password.createdAt)}
            </div>
        `;
        
        // Add click event to view password
    passwordCard.addEventListener("click", () => {
      const passwordId = passwordCard.getAttribute("data-id");
      const password = state.passwords.find((p) => p.id === passwordId);
            if (password) {
                showPasswordViewer(password);
            }
        });
        
        passwordContent.appendChild(passwordCard);
    });
    
    // Add 'Load More' button if there are more passwords
    if (hasMore) {
    const loadMoreButton = document.createElement("button");
    loadMoreButton.className =
      "load-more-btn w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg mb-4 flex items-center justify-center transition-all";
        loadMoreButton.innerHTML = `
            <span>Load More</span>
            <i class="bx bx-chevron-down ml-2"></i>
        `;
        
    loadMoreButton.addEventListener("click", () => {
            state.pagination.passwords.currentPage += 1;
            renderPasswords();
        });
        
        passwordContent.appendChild(loadMoreButton);
    }
}

// Render contacts
function renderContacts() {
  if (!contactContent) return;

  if (state.contacts.length === 0) {
    contactContent.innerHTML = `
            <div class="text-center py-10">
                <i class="bx bx-phone text-gray-600 text-6xl mb-4"></i>
                <h3 class="text-xl font-semibold mb-2">No Contacts Yet</h3>
                <p class="text-gray-400 mb-6">Create your first contact by clicking the + button</p>
            </div>
        `;
    return;
  }

  // Calculate pagination
  const { limit, currentPage } = state.pagination.contacts;
  const startIndex = 0;
  const endIndex = currentPage * limit;
  const hasMore = endIndex < state.contacts.length;

  // Get only the contacts for the current page
  const visibleContacts = state.contacts.slice(startIndex, endIndex);

  // Clear existing content
  contactContent.innerHTML = "";

  // Add contact cards
  visibleContacts.forEach((contact) => {
    const contactCard = document.createElement("div");
    contactCard.className =
      "contact-card bg-gray-800 rounded-lg p-4 mb-4 cursor-pointer";
    contactCard.setAttribute("data-id", contact.id);
    contactCard.innerHTML = `
            <div class="flex items-center mb-2">
                <i class="bx bx-user-circle text-blue-400 text-2xl mr-3"></i>
                <h3 class="text-xl font-semibold">${
                  contact.name || "Unnamed Contact"
                }</h3>
            </div>
            <p class="text-gray-400">${contact.countryCode || "+91"} ${
      contact.number || ""
    }</p>
            <div class="text-gray-500 text-xs mt-3">
                ${formatDate(contact.createdAt)}
            </div>
        `;

    // Add click event to view contact
    contactCard.addEventListener("click", () => {
      const contactId = contactCard.getAttribute("data-id");
      const contact = state.contacts.find((c) => c.id === contactId);
      if (contact) {
        showContactViewer(contact);
      }
    });

    contactContent.appendChild(contactCard);
  });

  // Add 'Load More' button if there are more contacts
  if (hasMore) {
    const loadMoreButton = document.createElement("button");
    loadMoreButton.className =
      "load-more-btn w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg mb-4 flex items-center justify-center transition-all";
    loadMoreButton.innerHTML = `
            <span>Load More</span>
            <i class="bx bx-chevron-down ml-2"></i>
        `;

    loadMoreButton.addEventListener("click", () => {
      state.pagination.contacts.currentPage += 1;
      renderContacts();
    });

    contactContent.appendChild(loadMoreButton);
    }
}

// Show note editor modal
function showNoteEditor(note = null) {
    const isEditing = note !== null;
    
    // Check premium status for editing
    if (isEditing && !state.isPremium) {
    showPricingPopup("notes");
    showToast("Editing is a premium feature", "error");
        return;
    }
    
  const modal = document.createElement("div");
  modal.className =
    "modal fixed inset-0 bg-black/80 flex items-start justify-center z-50 overflow-y-auto";
    modal.innerHTML = `
        <div class="modal-content bg-gray-900 w-full max-w-2xl mx-4 my-8 rounded-lg shadow-xl">
            <div class="flex justify-between items-center p-4 border-b border-gray-800">
                <h3 class="text-xl font-semibold">${
                  isEditing ? "Edit Note" : "New Note"
                }</h3>
                <div>
                    <button class="save-note-btn bg-yellow-400 text-black px-4 py-2 rounded-md font-medium hover:bg-yellow-500 transition mr-2">Save</button>
                    <button class="cancel-note-btn text-gray-400 hover:text-white">
                        <i class="bx bx-x text-2xl"></i>
                    </button>
                </div>
            </div>
            <div class="p-4">
                <div class="mb-4">
                    <input type="text" class="note-title-input w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Title (optional)" value="${
                      isEditing && note.title ? note.title : ""
                    }">
                </div>
                <div>
                    <textarea class="note-content-input w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 min-h-[250px]" placeholder="Start writing...">${
                      isEditing && note.content ? note.content : ""
                    }</textarea>
                    ${
                      !state.isPremium
                        ? `
                        <div class="flex justify-between items-center mt-2 text-xs">
                            <div class="text-gray-400">
                                <span class="char-count">0</span>/${state.limits.free.noteCharLimit} characters
                            </div>
                            <div class="text-gray-500">
                                <i class="bx bx-lock-alt mr-1"></i> Upgrade for 10,000 characters
                            </div>
                        </div>
                    `
                        : ""
                    }
                </div>
            </div>
        </div>
    `;
    
    // Add to DOM
    modalsContainer.appendChild(modal);
  document.body.classList.add("overflow-hidden");
    
    // Focus on title if new note, or content if no title
    setTimeout(() => {
    const titleInput = modal.querySelector(".note-title-input");
    const contentInput = modal.querySelector(".note-content-input");
        
        if (isEditing && !note.title) {
            contentInput.focus();
        } else {
            titleInput.focus();
        }
    }, 100);
    
    // Update character count for free users
    if (!state.isPremium) {
    const contentInput = modal.querySelector(".note-content-input");
    const charCount = modal.querySelector(".char-count");
        
        // Initial count
        charCount.textContent = contentInput.value.length;
        
        // Update on input
    contentInput.addEventListener("input", () => {
            const length = contentInput.value.length;
            charCount.textContent = length;
            
            // Visual warning when close to limit
            if (length > state.limits.free.noteCharLimit * 0.8) {
        charCount.classList.add("text-yellow-500");
            } else {
        charCount.classList.remove("text-yellow-500");
            }
            
            // Hard limit for free users
            if (length > state.limits.free.noteCharLimit) {
        charCount.classList.add("text-red-500");
        contentInput.value = contentInput.value.substring(
          0,
          state.limits.free.noteCharLimit
        );
                charCount.textContent = state.limits.free.noteCharLimit;
        showToast(
          `Free limit is ${state.limits.free.noteCharLimit} characters. Upgrade to premium for more!`,
          "error"
        );
            }
        });
    }
    
    // Save button click
  modal.querySelector(".save-note-btn").addEventListener("click", async () => {
    const title = modal.querySelector(".note-title-input").value.trim();
    const content = modal.querySelector(".note-content-input").value.trim();
        
        if (!content && !title) {
      showToast("Please add some content to your note", "error");
            return;
        }
        
        // Check character limit for free users
        if (!state.isPremium && content.length > state.limits.free.noteCharLimit) {
      showToast(
        `Free limit is ${state.limits.free.noteCharLimit} characters. Upgrade to premium for more!`,
        "error"
      );
            return;
        }
        
        try {
            if (isEditing) {
                // Update existing note
        await updateDoc(doc(db, "notes", note.id), {
                    title,
                    content,
          updatedAt: new Date(),
                });
                
                // Update local state
        const index = state.notes.findIndex((n) => n.id === note.id);
                if (index !== -1) {
                    state.notes[index] = {
                        ...state.notes[index],
                        title,
                        content,
            updatedAt: new Date(),
                    };
                }
                
        showToast("Note updated successfully", "success");
            } else {
                // Create new note
                const newNote = {
                    title,
                    content,
                    userId: state.currentUser.uid,
                    createdAt: new Date(),
          updatedAt: new Date(),
                };
                
        const docRef = await addDoc(collection(db, "notes"), newNote);
                
                // Add to local state
                state.notes.unshift({
                    id: docRef.id,
          ...newNote,
                });
                
                // Reset pagination to show the new note
        resetPagination("notes");
                
        showToast("Note created successfully", "success");
            }
            
            // Re-render notes
            renderNotes();
            
            // Close modal
            closeModal(modal);
        } catch (error) {
      console.error("Error saving note:", error);
      showToast("Failed to save note", "error");
        }
    });
    
    // Cancel button click
  modal.querySelector(".cancel-note-btn").addEventListener("click", () => {
        closeModal(modal);
    });
    
    // Close on outside click
  modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
}

// Show note viewer
function showNoteViewer(note) {
  const modal = document.createElement("div");
  modal.className =
    "modal fixed inset-0 bg-black/80 flex items-start justify-center z-50 overflow-y-auto";
    modal.innerHTML = `
        <div class="modal-content bg-gray-900 w-full max-w-2xl mx-4 my-8 rounded-lg shadow-xl">
            <div class="flex justify-between items-center p-4 border-b border-gray-800">
                <h3 class="text-xl font-semibold">${
                  note.title || "Untitled Note"
                }</h3>
                <div class="flex space-x-3">
                    <button class="edit-note-btn text-yellow-400 w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-800" title="Edit">
                        <i class="bx bx-edit text-xl"></i>
                    </button>
                    <button class="delete-note-btn text-red-400 w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-800" title="Delete">
                        <i class="bx bx-trash text-xl"></i>
                    </button>
                    <button class="copy-note-btn text-blue-400 w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-800" title="Copy">
                        <i class="bx bx-copy text-xl"></i>
                    </button>
                    <button class="close-note-btn text-gray-400 w-9 h-9 flex items-center justify-center hover:text-white" title="Close">
                        <i class="bx bx-x text-2xl"></i>
                    </button>
                </div>
            </div>
            <div class="p-6 whitespace-pre-wrap">
                ${
                  note.content ||
                  '<p class="text-gray-500 italic">No content</p>'
                }
            </div>
            <div class="px-6 pb-6 text-gray-500 text-sm">
                Created: ${formatDate(note.createdAt)}
                ${
                  note.updatedAt && note.updatedAt !== note.createdAt
                    ? `<br>Last Updated: ${formatDate(note.updatedAt)}`
                    : ""
                }
            </div>
        </div>
    `;
    
    // Add to DOM
    modalsContainer.appendChild(modal);
  document.body.classList.add("overflow-hidden");
    
    // Edit button click
  modal.querySelector(".edit-note-btn").addEventListener("click", () => {
        closeModal(modal);
        showNoteEditor(note);
    });
    
    // Delete button click
  modal
    .querySelector(".delete-note-btn")
    .addEventListener("click", async () => {
      showConfirmDialog(
        "Are you sure you want to delete this note?",
        async () => {
            try {
                // Delete from Firestore
            await deleteDoc(doc(db, "notes", note.id));
                
                // Delete from local state
            state.notes = state.notes.filter((n) => n.id !== note.id);
                
                // Re-render notes
                renderNotes();
                
                // Close modal
                closeModal(modal);
                
            showToast("Note deleted successfully", "success");
            } catch (error) {
            console.error("Error deleting note:", error);
            showToast("Failed to delete note", "error");
            }
        },
        "note"
      );
    });
    
    // Copy button click
  modal.querySelector(".copy-note-btn").addEventListener("click", () => {
    const textToCopy = `${note.title || "Untitled Note"}\n\n${
      note.content || ""
    }`;
    navigator.clipboard
      .writeText(textToCopy)
            .then(() => {
        showToast("Note copied to clipboard", "success");
      })
      .catch((err) => {
        console.error("Could not copy text: ", err);
        showToast("Failed to copy to clipboard", "error");
            });
    });
    
    // Close button click
  modal.querySelector(".close-note-btn").addEventListener("click", () => {
        closeModal(modal);
    });
    
    // Close on outside click
  modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
}

// Show todo editor modal
function showTodoEditor(todo = null) {
    const isEditing = todo !== null;
    
    // Check premium status for editing
    if (isEditing && !state.isPremium) {
    showPricingPopup("todos");
    showToast("Editing is a premium feature", "error");
        return;
    }
    
  const modal = document.createElement("div");
  modal.className =
    "modal fixed inset-0 bg-black/80 flex items-start justify-center z-50 overflow-y-auto";
    modal.innerHTML = `
        <div class="modal-content bg-gray-900 w-full max-w-2xl mx-4 my-8 rounded-lg shadow-xl">
            <div class="flex justify-between items-center p-4 border-b border-gray-800">
                <h3 class="text-xl font-semibold">${
                  isEditing ? "Edit Todo" : "New Todo"
                }</h3>
                <div>
                    <button class="save-todo-btn bg-yellow-400 text-black px-4 py-2 rounded-md font-medium hover:bg-yellow-500 transition mr-2">Save</button>
                    <button class="cancel-todo-btn text-gray-400 hover:text-white">
                        <i class="bx bx-x text-2xl"></i>
                    </button>
                </div>
            </div>
            <div class="p-4">
                <div class="mb-4">
                    <input type="text" class="todo-title-input w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Todo Title" value="${
                      isEditing && todo.title ? todo.title : ""
                    }">
                </div>
                <div class="mb-4">
                    <textarea class="todo-description-input w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 min-h-[100px]" placeholder="Description (optional)">${
                      isEditing && todo.description ? todo.description : ""
                    }</textarea>
                </div>
                <div class="flex items-center mb-2">
                    <input type="checkbox" id="todo-completed" class="todo-completed-input w-5 h-5 bg-gray-800 border border-gray-600 rounded mr-2" ${
                      isEditing && todo.completed ? "checked" : ""
                    }>
                    <label for="todo-completed" class="text-gray-300">Mark as completed</label>
                </div>
            </div>
        </div>
    `;
    
    // Add to DOM
    modalsContainer.appendChild(modal);
  document.body.classList.add("overflow-hidden");
    
    // Focus on title
    setTimeout(() => {
    const titleInput = modal.querySelector(".todo-title-input");
        titleInput.focus();
    }, 100);
    
    // Save button click
  modal.querySelector(".save-todo-btn").addEventListener("click", async () => {
    const title = modal.querySelector(".todo-title-input").value.trim();
    const description = modal
      .querySelector(".todo-description-input")
      .value.trim();
    const completed = modal.querySelector(".todo-completed-input").checked;
        
        if (!title) {
      showToast("Please enter a title for your todo", "error");
            return;
        }
        
        try {
            if (isEditing) {
                // Update existing todo
        await updateDoc(doc(db, "todos", todo.id), {
                    title,
                    description,
                    completed,
          updatedAt: new Date(),
                });
                
                // Update local state
        const index = state.todos.findIndex((t) => t.id === todo.id);
                if (index !== -1) {
                    state.todos[index] = {
                        ...state.todos[index],
                        title,
                        description,
                        completed,
            updatedAt: new Date(),
                    };
                }
                
        showToast("Todo updated successfully", "success");
            } else {
                // Create new todo
                const newTodo = {
                    title,
                    description,
                    completed,
                    userId: state.currentUser.uid,
                    createdAt: new Date(),
          updatedAt: new Date(),
                };
                
        const docRef = await addDoc(collection(db, "todos"), newTodo);
                
                // Add to local state
                state.todos.unshift({
                    id: docRef.id,
          ...newTodo,
                });
                
                // Reset pagination to show the new todo
        resetPagination("todos");
                
        showToast("Todo created successfully", "success");
            }
            
            // Re-render todos
            renderTodos();
            
            // Close modal
            closeModal(modal);
        } catch (error) {
      console.error("Error saving todo:", error);
      showToast("Failed to save todo", "error");
        }
    });
    
    // Cancel button click
  modal.querySelector(".cancel-todo-btn").addEventListener("click", () => {
        closeModal(modal);
    });
    
    // Close on outside click
  modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
}

// Show todo viewer
function showTodoViewer(todo) {
  const modal = document.createElement("div");
  modal.className =
    "modal fixed inset-0 bg-black/80 flex items-start justify-center z-50 overflow-y-auto";
    modal.innerHTML = `
        <div class="modal-content bg-gray-900 w-full max-w-2xl mx-4 my-8 rounded-lg shadow-xl">
            <div class="flex justify-between items-center p-4 border-b border-gray-800">
                <h3 class="text-xl font-semibold ${
                  todo.completed ? "line-through text-gray-400" : ""
                }">${todo.title || "Untitled Todo"}</h3>
                <div class="flex space-x-3">
                    <button class="toggle-todo-btn ${
                      todo.completed
                        ? "bg-gray-700 text-white"
                        : "bg-yellow-400 text-black"
                    } w-9 h-9 flex items-center justify-center rounded-md" title="${
    todo.completed ? "Mark Undone" : "Mark Done"
  }">
                        <i class="bx ${
                          todo.completed ? "bx-undo" : "bx-check"
                        } text-xl"></i>
                    </button>
                    ${
                      state.isPremium
                        ? `
                        <button class="edit-todo-btn text-yellow-400 w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-800" title="Edit">
                            <i class="bx bx-edit text-xl"></i>
                        </button>
                    `
                        : `
                        <button class="premium-edit-btn text-gray-600 w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-800 cursor-not-allowed" title="Premium Feature">
                            <i class="bx bx-lock text-xl"></i>
                        </button>
                    `
                    }
                    <button class="delete-todo-btn text-red-400 w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-800" title="Delete">
                        <i class="bx bx-trash text-xl"></i>
                    </button>
                    <button class="close-todo-btn text-gray-400 w-9 h-9 flex items-center justify-center hover:text-white" title="Close">
                        <i class="bx bx-x text-2xl"></i>
                    </button>
                </div>
            </div>
            <div class="p-6">
                ${
                  todo.description
                    ? `<p class="text-gray-300 whitespace-pre-wrap ${
                        todo.completed ? "line-through text-gray-500" : ""
                      }">${todo.description}</p>`
                    : '<p class="text-gray-500 italic">No description</p>'
                }
            </div>
            <div class="px-6 pb-6 text-gray-500 text-sm">
                Created: ${formatDate(todo.createdAt)}
                ${
                  todo.updatedAt && todo.updatedAt !== todo.createdAt
                    ? `<br>Last Updated: ${formatDate(todo.updatedAt)}`
                    : ""
                }
            </div>
        </div>
    `;
    
    // Add to DOM
    modalsContainer.appendChild(modal);
  document.body.classList.add("overflow-hidden");
    
    // Toggle completion status
  modal
    .querySelector(".toggle-todo-btn")
    .addEventListener("click", async () => {
        try {
            // Toggle completion status in Firestore
        await updateDoc(doc(db, "todos", todo.id), {
                completed: !todo.completed,
          updatedAt: new Date(),
            });
            
            // Update local state
        const index = state.todos.findIndex((t) => t.id === todo.id);
            if (index !== -1) {
                state.todos[index] = {
                    ...state.todos[index],
                    completed: !todo.completed,
            updatedAt: new Date(),
                };
            }
            
            // Re-render todos
            renderTodos();
            
            // Close modal
            closeModal(modal);
            
        showToast(
          `Todo marked as ${!todo.completed ? "completed" : "active"}`,
          "success"
        );
        } catch (error) {
        console.error("Error toggling todo completion:", error);
        showToast("Failed to update todo status", "error");
        }
    });
    
    // Edit button click
  const editBtn = modal.querySelector(".edit-todo-btn");
    if (editBtn) {
    editBtn.addEventListener("click", () => {
            closeModal(modal);
            showTodoEditor(todo);
        });
    }
    
    // Premium edit button (locked)
  const premiumEditBtn = modal.querySelector(".premium-edit-btn");
    if (premiumEditBtn) {
    premiumEditBtn.addEventListener("click", () => {
      showPricingPopup("todos");
        });
    }
    
    // Delete button click
  modal
    .querySelector(".delete-todo-btn")
    .addEventListener("click", async () => {
      showConfirmDialog(
        "Are you sure you want to delete this todo?",
        async () => {
            try {
                // Delete from Firestore
            await deleteDoc(doc(db, "todos", todo.id));
                
                // Delete from local state
            state.todos = state.todos.filter((t) => t.id !== todo.id);
                
                // Re-render todos
                renderTodos();
                
                // Close modal
                closeModal(modal);
                
            showToast("Todo deleted successfully", "success");
            } catch (error) {
            console.error("Error deleting todo:", error);
            showToast("Failed to delete todo", "error");
            }
        },
        "todo"
      );
    });
    
    // Close button click
  modal.querySelector(".close-todo-btn").addEventListener("click", () => {
        closeModal(modal);
    });
    
    // Close on outside click
  modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
}

// Show toast notification
function showToast(message, type = "info", duration = 3000) {
  const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
    toast.style.opacity = "0";
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

// Close modal
function closeModal(modal) {
  modal.classList.add("opacity-0");
    setTimeout(() => {
        modal.remove();
    if (document.querySelectorAll(".modal").length === 0) {
      document.body.classList.remove("overflow-hidden");
        }
    }, 200);
}

// Format date
function formatDate(timestamp) {
  if (!timestamp) return "Unknown date";
    
  const date =
    timestamp instanceof Date
        ? timestamp 
      : timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);
    
    return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    });
}

// Extract domain from URL or website name
function extractDomain(input) {
  if (!input) return "";
    
    // Remove protocol and www if present
    let domain = input.trim().toLowerCase();
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, "");
    
    // Get the domain part (before first slash or query params)
  domain = domain.split("/")[0];
  domain = domain.split("?")[0];
    
    return domain;
}

// Get favicon URL for a domain
function getFaviconUrl(domain) {
    if (!domain) return null;
    
    // Check if it looks like a domain with at least one dot
  const isDomain = domain.includes(".");
    
    if (isDomain) {
        // Use Google's favicon service for actual domains
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    }
    
    // Return null for non-domain entries (like "google" without .com)
    return null;
}

// Show password editor modal
function showPasswordEditor(password = null) {
    const isEditing = password !== null;
    
    // Check premium status for editing
    if (isEditing && !state.isPremium) {
    showPricingPopup("passwords");
    showToast("Editing is a premium feature", "error");
        return;
    }
    
  const modal = document.createElement("div");
  modal.className =
    "modal fixed inset-0 bg-black/80 flex items-start justify-center z-50 overflow-y-auto";
    modal.innerHTML = `
        <div class="modal-content bg-gray-900 w-full max-w-2xl mx-4 my-8 rounded-lg shadow-xl">
            <div class="flex justify-between items-center p-4 border-b border-gray-800">
                <h3 class="text-xl font-semibold">${
                  isEditing ? "Edit Password" : "New Password"
                }</h3>
                <div>
                    <button class="save-password-btn bg-yellow-400 text-black px-4 py-2 rounded-md font-medium hover:bg-yellow-500 transition mr-2">Save</button>
                    <button class="cancel-password-btn text-gray-400 hover:text-white">
                        <i class="bx bx-x text-2xl"></i>
                    </button>
                </div>
            </div>
            <div class="p-4">
                <div class="mb-4">
                    <label for="website" class="block text-sm font-medium text-gray-300 mb-1">Website or App</label>
                    <input type="text" id="website" class="website-input w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="e.g. facebook.com" value="${
                      isEditing && password.website ? password.website : ""
                    }">
                </div>
                <div class="mb-4">
                    <label for="username" class="block text-sm font-medium text-gray-300 mb-1">Username or Email</label>
                    <input type="text" id="username" class="username-input w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="e.g. john@example.com" value="${
                      isEditing && password.username ? password.username : ""
                    }">
                </div>
                <div class="mb-4">
                    <label for="password" class="block text-sm font-medium text-gray-300 mb-1">Password</label>
                    <div class="relative">
                        <input type="password" id="password" class="password-input w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Enter password" value="${
                          isEditing && password.password
                            ? password.password
                            : ""
                        }">
                        <button type="button" class="toggle-password-visibility absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white">
                            <i class="bx bx-hide text-xl"></i>
                        </button>
                    </div>
                </div>
                <div class="mb-6">
                    <label for="notes" class="block text-sm font-medium text-gray-300 mb-1">Notes (Optional)</label>
                    <textarea id="notes" class="notes-input w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 min-h-[80px]" placeholder="Additional information">${
                      isEditing && password.notes ? password.notes : ""
                    }</textarea>
                </div>
                <div>
                    <button class="generate-password-btn w-full py-3 bg-gray-700 text-gray-300 rounded-md font-medium flex items-center justify-center hover:bg-gray-600 transition">
                        <i class="bx bx-shuffle mr-2 text-xl"></i>
                        Generate Strong Password
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add to DOM
    modalsContainer.appendChild(modal);
  document.body.classList.add("overflow-hidden");
    
    // Focus on first field
    setTimeout(() => {
    modal.querySelector(".website-input").focus();
    }, 100);
    
    // Password visibility toggle
  const togglePasswordVisibility = modal.querySelector(
    ".toggle-password-visibility"
  );
  const passwordInput = modal.querySelector(".password-input");

  togglePasswordVisibility.addEventListener("click", () => {
    const type =
      passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);

    const icon = togglePasswordVisibility.querySelector("i");
    icon.classList.toggle("bx-hide");
    icon.classList.toggle("bx-show");
    });
    
    // Generate password
  modal
    .querySelector(".generate-password-btn")
    .addEventListener("click", () => {
        const length = 16;
      const charset =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+";
      let generatedPassword = "";
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            generatedPassword += charset[randomIndex];
        }
        
        passwordInput.value = generatedPassword;
        
        // Show password after generating
      passwordInput.setAttribute("type", "text");
      const icon = togglePasswordVisibility.querySelector("i");
      icon.classList.remove("bx-hide");
      icon.classList.add("bx-show");
    });
    
    // Save button click
  modal
    .querySelector(".save-password-btn")
    .addEventListener("click", async () => {
      const websiteValue = modal.querySelector(".website-input").value.trim();
      const usernameValue = modal.querySelector(".username-input").value.trim();
      const passwordValue = modal.querySelector(".password-input").value.trim();
      const notesValue = modal.querySelector(".notes-input").value.trim();
        
        if (!websiteValue || !usernameValue || !passwordValue) {
        showToast("Please fill in all required fields", "error");
            return;
        }
        
        try {
            // Get favicon for the website
            let domain = extractDomain(websiteValue);
            let faviconUrl = getFaviconUrl(domain);
            
            if (isEditing) {
                // Update existing password
          await updateDoc(doc(db, "passwords", password.id), {
                    website: websiteValue,
                    username: usernameValue,
                    password: passwordValue,
                    notes: notesValue,
            updatedAt: new Date(),
                });
                
                // Update local state
          const index = state.passwords.findIndex((p) => p.id === password.id);
                if (index !== -1) {
                    state.passwords[index] = {
                        ...state.passwords[index],
                        website: websiteValue,
                        username: usernameValue,
                        password: passwordValue,
                        notes: notesValue,
              updatedAt: new Date(),
                    };
                }
                
          showToast("Password updated successfully", "success");
            } else {
                // Create new password
                const newPassword = {
                    website: websiteValue,
                    username: usernameValue,
                    password: passwordValue,
                    notes: notesValue,
                    userId: state.currentUser.uid,
                    createdAt: new Date(),
                    updatedAt: new Date(),
            favicon: faviconUrl,
                };
                
          const docRef = await addDoc(collection(db, "passwords"), newPassword);
                
                // Add to local state
                state.passwords.unshift({
                    id: docRef.id,
            ...newPassword,
                });
                
                // Reset pagination to show the new password
          resetPagination("passwords");
                
          showToast("Password saved successfully", "success");
            }
            
            // Re-render passwords
            renderPasswords();
            
            // Close modal
            closeModal(modal);
        } catch (error) {
        console.error("Error saving password:", error);
        showToast("Failed to save password", "error");
        }
    });
    
    // Cancel button click
  modal.querySelector(".cancel-password-btn").addEventListener("click", () => {
        closeModal(modal);
    });
    
    // Close on outside click
  modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
}

// Show password viewer
function showPasswordViewer(password) {
  const modal = document.createElement("div");
  modal.className =
    "modal fixed inset-0 bg-black/80 flex items-start justify-center z-50 overflow-y-auto";
    modal.innerHTML = `
        <div class="modal-content bg-gray-900 w-full max-w-2xl mx-4 my-8 rounded-lg shadow-xl">
            <div class="flex justify-between items-center p-4 border-b border-gray-800">
                <div class="flex items-center">
                    <div class="website-favicon w-8 h-8 mr-3 flex-shrink-0 overflow-hidden rounded bg-gray-800 flex items-center justify-center">
                        ${
                          password.favicon
                            ? `
                            <img src="${password.favicon}" alt="${password.website}" onerror="this.onerror=null; this.src=''; this.parentElement.innerHTML='<i class=\'bx bx-globe text-gray-600 text-xl\'></i>';">
                        `
                            : `
                            <i class='bx bx-globe text-gray-600 text-xl'></i>
                        `
                        }
                    </div>
                    <h3 class="text-xl font-semibold">${password.website}</h3>
                </div>
                <div class="flex space-x-3">
                    ${
                      state.isPremium
                        ? `
                        <button class="edit-password-btn text-yellow-400 w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-800" title="Edit">
                            <i class="bx bx-edit text-xl"></i>
                        </button>
                    `
                        : `
                        <button class="premium-edit-btn text-gray-600 w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-800 cursor-not-allowed" title="Premium Feature">
                            <i class="bx bx-lock text-xl"></i>
                        </button>
                    `
                    }
                    <button class="delete-password-btn text-red-400 w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-800" title="Delete">
                        <i class="bx bx-trash text-xl"></i>
                    </button>
                    <button class="close-password-btn text-gray-400 w-9 h-9 flex items-center justify-center hover:text-white" title="Close">
                        <i class="bx bx-x text-2xl"></i>
                    </button>
                </div>
            </div>
            <div class="p-6 space-y-4">
                <div>
                    <p class="text-sm text-gray-400 mb-1">Username / Email</p>
                    <div class="flex items-center justify-between bg-gray-800 p-3 rounded-md">
                        <p class="text-gray-200">${password.username}</p>
                        <button class="copy-username-btn text-gray-400 hover:text-white">
                            <i class="bx bx-copy text-xl"></i>
                        </button>
                    </div>
                </div>
                <div>
                    <p class="text-sm text-gray-400 mb-1">Password</p>
                    <div class="flex items-center justify-between bg-gray-800 p-3 rounded-md">
                        <p class="password-display text-gray-200">••••••••••••</p>
                        <div class="flex space-x-2">
                            <button class="toggle-password-visibility text-gray-400 hover:text-white">
                                <i class="bx bx-show text-xl"></i>
                            </button>
                            <button class="copy-password-btn text-gray-400 hover:text-white">
                                <i class="bx bx-copy text-xl"></i>
                            </button>
                        </div>
                    </div>
                </div>
                ${
                  password.notes
                    ? `
                    <div>
                        <p class="text-sm text-gray-400 mb-1">Notes</p>
                        <div class="bg-gray-800 p-3 rounded-md">
                            <p class="text-gray-300 whitespace-pre-wrap">${password.notes}</p>
                        </div>
                    </div>
                `
                    : ""
                }
            </div>
            <div class="px-6 pb-6 text-gray-500 text-sm">
                Created: ${formatDate(password.createdAt)}
                ${
                  password.updatedAt &&
                  password.updatedAt !== password.createdAt
                    ? `<br>Last Updated: ${formatDate(password.updatedAt)}`
                    : ""
                }
            </div>
        </div>
    `;
    
    // Add to DOM
    modalsContainer.appendChild(modal);
  document.body.classList.add("overflow-hidden");
    
    // Edit button click
  const editBtn = modal.querySelector(".edit-password-btn");
    if (editBtn) {
    editBtn.addEventListener("click", () => {
            closeModal(modal);
            showPasswordEditor(password);
        });
    }
    
    // Premium edit button (locked)
  const premiumEditBtn = modal.querySelector(".premium-edit-btn");
    if (premiumEditBtn) {
    premiumEditBtn.addEventListener("click", () => {
      showPricingPopup("passwords");
        });
    }
    
    // Delete button click
  modal
    .querySelector(".delete-password-btn")
    .addEventListener("click", async () => {
      showConfirmDialog(
        "Are you sure you want to delete this password?",
        async () => {
            try {
                // Delete from Firestore
            await deleteDoc(doc(db, "passwords", password.id));
                
                // Delete from local state
            state.passwords = state.passwords.filter(
              (p) => p.id !== password.id
            );
                
                // Re-render passwords
                renderPasswords();
                
                // Close modal
                closeModal(modal);
                
            showToast("Password deleted successfully", "success");
            } catch (error) {
            console.error("Error deleting password:", error);
            showToast("Failed to delete password", "error");
            }
        },
        "password"
      );
    });
    
    // Toggle password visibility
  const togglePasswordVisibility = modal.querySelector(
    ".toggle-password-visibility"
  );
  const passwordDisplay = modal.querySelector(".password-display");
    let isPasswordVisible = false;
    
  togglePasswordVisibility.addEventListener("click", () => {
        isPasswordVisible = !isPasswordVisible;
    passwordDisplay.textContent = isPasswordVisible
      ? password.password
      : "••••••••••••";

    const icon = togglePasswordVisibility.querySelector("i");
    icon.classList.toggle("bx-show");
    icon.classList.toggle("bx-hide");
    });
    
    // Copy username
  modal.querySelector(".copy-username-btn").addEventListener("click", () => {
    navigator.clipboard
      .writeText(password.username)
            .then(() => {
        showToast("Username copied to clipboard", "success");
      })
      .catch((err) => {
        console.error("Could not copy text: ", err);
        showToast("Failed to copy to clipboard", "error");
            });
    });
    
    // Copy password
  modal.querySelector(".copy-password-btn").addEventListener("click", () => {
    navigator.clipboard
      .writeText(password.password)
            .then(() => {
        showToast("Password copied to clipboard", "success");
      })
      .catch((err) => {
        console.error("Could not copy text: ", err);
        showToast("Failed to copy to clipboard", "error");
            });
    });
    
    // Close button click
  modal.querySelector(".close-password-btn").addEventListener("click", () => {
        closeModal(modal);
    });
    
    // Close on outside click
  modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
}

// Show search screen
function showSearchScreen() {
  const modal = document.createElement("div");
  modal.className =
    "modal fixed inset-0 bg-black/80 flex items-start justify-center z-50 overflow-y-auto";
    modal.innerHTML = `
        <div class="modal-content bg-gray-900 w-full max-w-3xl mx-4 my-8 rounded-lg shadow-xl">
            <div class="flex justify-between items-center p-4 border-b border-gray-800">
                <h3 class="text-xl font-semibold">Search</h3>
                <button class="close-search-btn text-gray-400 hover:text-white">
                    <i class="bx bx-x text-2xl"></i>
                </button>
            </div>
            <div class="p-4">
                <div class="mb-6">
                    <div class="relative">
                        <input type="text" class="search-input w-full px-4 py-3 pl-10 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Search for notes, todos, passwords, or contacts...">
                        <i class="bx bx-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl"></i>
                    </div>
                </div>
                <div class="search-results">
                    <div class="text-center py-6 text-gray-500">
                        Type something to search...
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add to DOM
    modalsContainer.appendChild(modal);
  document.body.classList.add("overflow-hidden");
    
    // Focus on search input
    setTimeout(() => {
    const searchInput = modal.querySelector(".search-input");
        searchInput.focus();
    }, 100);
    
    // Search functionality
  const searchInput = modal.querySelector(".search-input");
  const searchResults = modal.querySelector(".search-results");
    let searchTimeout;
    
  searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        
        const searchTerm = searchInput.value.trim();
        if (searchTerm.length < 2) {
            searchResults.innerHTML = `
                <div class="text-center py-6 text-gray-500">
                    Type at least 2 characters to search...
                </div>
            `;
            return;
        }
        
        // Show loading state
        searchResults.innerHTML = `
            <div class="text-center py-6 text-gray-500">
                <i class="bx bx-loader-alt animate-spin text-2xl"></i>
                <p class="mt-2">Searching...</p>
            </div>
        `;
        
        // Debounce search
        searchTimeout = setTimeout(async () => {
            try {
                // Search results from each collection
        const [notes, todos, passwords, contacts] = await Promise.all([
                    searchNotes(searchTerm),
                    searchTodos(searchTerm),
          searchPasswords(searchTerm),
          searchContacts(searchTerm),
        ]);

        const hasResults =
          notes.length > 0 ||
          todos.length > 0 ||
          passwords.length > 0 ||
          contacts.length > 0;
                
                if (!hasResults) {
                    searchResults.innerHTML = `
                        <div class="text-center py-6 text-gray-500">
                            No results found for "${searchTerm}"
                        </div>
                    `;
                    return;
                }
                
                // Render results
                searchResults.innerHTML = `
                    <div class="space-y-6">
                        ${
                          notes.length > 0
                            ? `
                            <div>
                                <h4 class="text-lg font-semibold mb-3 text-yellow-400">Notes (${notes.length})</h4>
                                <div class="space-y-2 search-notes-results"></div>
                            </div>
                        `
                            : ""
                        }
                        
                        ${
                          todos.length > 0
                            ? `
                            <div>
                                <h4 class="text-lg font-semibold mb-3 text-yellow-400">Todos (${todos.length})</h4>
                                <div class="space-y-2 search-todos-results"></div>
                            </div>
                        `
                            : ""
                        }
                        
                        ${
                          passwords.length > 0
                            ? `
                            <div>
                                <h4 class="text-lg font-semibold mb-3 text-yellow-400">Passwords (${passwords.length})</h4>
                                <div class="space-y-2 search-passwords-results"></div>
                            </div>
                        `
                            : ""
                        }
                        
                        ${
                          contacts.length > 0
                            ? `
                            <div>
                                <h4 class="text-lg font-semibold mb-3 text-yellow-400">Contacts (${contacts.length})</h4>
                                <div class="space-y-2 search-contacts-results"></div>
                            </div>
                        `
                            : ""
                        }
                    </div>
                `;
                
                // Add notes results
        const notesResultsContainer = searchResults.querySelector(
          ".search-notes-results"
        );
                if (notesResultsContainer) {
          notesResultsContainer.innerHTML = notes
            .map(
              (note) => `
                        <div class="search-result-item bg-gray-800 p-3 rounded-lg cursor-pointer hover:bg-gray-700" data-type="note" data-id="${
                          note.id
                        }">
                            <h5 class="font-medium">${
                              note.title || "Untitled Note"
                            }</h5>
                            <p class="text-sm text-gray-400 line-clamp-1">${
                              note.content || ""
                            }</p>
                        </div>
                    `
            )
            .join("");
                }
                
                // Add todos results
        const todosResultsContainer = searchResults.querySelector(
          ".search-todos-results"
        );
                if (todosResultsContainer) {
          todosResultsContainer.innerHTML = todos
            .map(
              (todo) => `
                        <div class="search-result-item bg-gray-800 p-3 rounded-lg cursor-pointer hover:bg-gray-700" data-type="todo" data-id="${
                          todo.id
                        }">
                            <h5 class="font-medium ${
                              todo.completed ? "line-through text-gray-500" : ""
                            }">${todo.title || "Untitled Todo"}</h5>
                            ${
                              todo.description
                                ? `<p class="text-sm text-gray-400 line-clamp-1 ${
                                    todo.completed ? "line-through" : ""
                                  }">${todo.description}</p>`
                                : ""
                            }
                        </div>
                    `
            )
            .join("");
                }
                
                // Add passwords results
        const passwordsResultsContainer = searchResults.querySelector(
          ".search-passwords-results"
        );
                if (passwordsResultsContainer) {
          passwordsResultsContainer.innerHTML = passwords
            .map(
              (password) => `
                        <div class="search-result-item bg-gray-800 p-3 rounded-lg cursor-pointer hover:bg-gray-700" data-type="password" data-id="${
                          password.id
                        }">
                            <h5 class="font-medium">${
                              password.website || "Unnamed Site"
                            }</h5>
                            <p class="text-sm text-gray-400">${
                              password.username || "No username"
                            }</p>
                        </div>
                    `
            )
            .join("");
        }

        // Add contacts results
        const contactsResultsContainer = searchResults.querySelector(
          ".search-contacts-results"
        );
        if (contactsResultsContainer) {
          contactsResultsContainer.innerHTML = contacts
            .map(
              (contact) => `
                        <div class="search-result-item bg-gray-800 p-3 rounded-lg cursor-pointer hover:bg-gray-700" data-type="contact" data-id="${
                          contact.id
                        }">
                            <h5 class="font-medium">${
                              contact.name || "Unnamed Contact"
                            }</h5>
                            <p class="text-sm text-gray-400">${
                              contact.countryCode || "+91"
                            } ${contact.number || ""}</p>
                        </div>
                    `
            )
            .join("");
                }
                
                // Add click event for results
        const resultItems = searchResults.querySelectorAll(
          ".search-result-item"
        );
        resultItems.forEach((item) => {
          item.addEventListener("click", () => {
            const type = item.getAttribute("data-type");
            const id = item.getAttribute("data-id");
                        
                        openSearchResult(type, id);
                        closeModal(modal);
                    });
                });
            } catch (error) {
        console.error("Error searching:", error);
                searchResults.innerHTML = `
                    <div class="text-center py-6 text-red-400">
                        An error occurred while searching. Please try again.
                    </div>
                `;
            }
        }, 500);
    });
    
    // Close button click
  modal.querySelector(".close-search-btn").addEventListener("click", () => {
        closeModal(modal);
    });
    
    // Close on outside click
  modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
}

// Search notes
async function searchNotes(term) {
    try {
        // Use the data module to search
        return await data.notes.search(term);
    } catch (error) {
    console.error("Error searching notes:", error);
        return [];
    }
}

// Search todos
async function searchTodos(term) {
    try {
        // Use the data module to search
        return await data.todos.search(term);
    } catch (error) {
    console.error("Error searching todos:", error);
        return [];
    }
}

// Search passwords
async function searchPasswords(term) {
    try {
        // Use the data module to search
        return await data.passwords.search(term);
    } catch (error) {
    console.error("Error searching passwords:", error);
    return [];
  }
}

// Search contacts
async function searchContacts(term) {
  try {
    // Use the data module to search
    return await data.contacts.search(term);
  } catch (error) {
    console.error("Error searching contacts:", error);
        return [];
    }
}

// Open search result
function openSearchResult(type, id) {
    switch (type) {
    case "note":
      const note = state.notes.find((n) => n.id === id);
            if (note) {
                showNoteViewer(note);
            } else {
                // If not in state, get from database
        data.notes
          .get(id)
          .then((note) => {
                        if (note) {
                            showNoteViewer(note);
                        } else {
              showToast("Note not found", "error");
            }
          })
          .catch((error) => {
            console.error("Error getting note:", error);
            showToast("Error loading note", "error");
                    });
            }
            break;
            
    case "todo":
      const todo = state.todos.find((t) => t.id === id);
            if (todo) {
                showTodoViewer(todo);
            } else {
                // If not in state, get from database
        data.todos
          .get(id)
          .then((todo) => {
                        if (todo) {
                            showTodoViewer(todo);
                        } else {
              showToast("Todo not found", "error");
            }
          })
          .catch((error) => {
            console.error("Error getting todo:", error);
            showToast("Error loading todo", "error");
                    });
            }
            break;
            
    case "password":
      const password = state.passwords.find((p) => p.id === id);
            if (password) {
                showPasswordViewer(password);
            } else {
                // If not in state, get from database
        data.passwords
          .get(id)
          .then((password) => {
                        if (password) {
                            showPasswordViewer(password);
                        } else {
              showToast("Password not found", "error");
            }
          })
          .catch((error) => {
            console.error("Error getting password:", error);
            showToast("Error loading password", "error");
                    });
            }
            break;

    case "contact":
      const contact = state.contacts.find((c) => c.id === id);
      if (contact) {
        showContactViewer(contact);
      } else {
        data.contacts
          .get(id)
          .then((contact) => {
            if (contact) {
              showContactViewer(contact);
            } else {
              showToast("Contact not found", "error");
            }
          })
          .catch((error) => {
            console.error("Error getting contact:", error);
            showToast("Error loading contact", "error");
          });
      }
      break;
    }
}

// Show settings screen
function showSettingsScreen() {
  const modal = document.createElement("div");
  modal.className =
    "modal fixed inset-0 bg-black/80 flex items-start justify-center z-50 overflow-y-auto";
    modal.innerHTML = `
        <div class="modal-content bg-gray-900 w-full max-w-2xl mx-4 my-8 rounded-lg shadow-xl">
            <div class="flex justify-between items-center p-4 border-b border-gray-800">
                <h3 class="text-xl font-semibold">Settings</h3>
                <button class="close-settings-btn text-gray-400 hover:text-white">
                    <i class="bx bx-x text-2xl"></i>
                </button>
            </div>
            <div class="p-6 space-y-6">
                <div>
                    <h4 class="text-lg font-semibold mb-3">Account</h4>
                    <div class="bg-gray-800 p-4 rounded-lg">
                        <div class="flex items-center justify-between mb-4">
                            <div class="min-w-0 flex-1 pr-3">
                                <p class="text-sm text-gray-300 mb-1">Signed in as:</p>
                                <div class="flex items-center">
                                    <p class="font-medium truncate">${
                                      state.currentUser?.email || "Unknown"
                                    }</p>
                                    ${
                                      state.isPremium
                                        ? `
                                        <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500 text-black flex-shrink-0">
                                            <i class="bx bx-crown mr-1"></i> Premium
                                        </span>
                                    `
                                        : ""
                                    }
                                </div>
                            </div>
                            <button id="sign-out-btn" class="flex-shrink-0 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition text-sm">Sign Out</button>
                        </div>
                        
                        <!-- Premium Status -->
                        <div class="border-t border-gray-700 pt-4 mt-4">
                            <div class="flex items-center justify-between mb-2">
                                <h5 class="font-medium">Membership Status</h5>
                                ${
                                  !state.isPremium
                                    ? `
                                    <button id="upgrade-btn" class="text-xs bg-yellow-500 text-black px-3 py-1 rounded font-medium hover:bg-yellow-600 transition">Upgrade</button>
                                `
                                    : ""
                                }
                            </div>
                            ${
                              state.isPremium
                                ? `
                                <div class="bg-gray-850 rounded-lg p-3 border border-yellow-500/20">
                                    <div class="flex items-center text-yellow-500 mb-1">
                                        <i class="bx bx-check-circle mr-2"></i>
                                        <p class="font-medium">Premium ${
                                          state.membershipType === "yearly"
                                            ? "Yearly"
                                            : "Monthly"
                                        } Plan</p>
                                    </div>
                                    <p class="text-sm text-gray-400">
                                        Your premium membership is active until ${
                                          formatDate(state.premiumExpiry).split(
                                            ","
                                          )[0]
                                        }
                                    </p>
                                </div>
                            `
                                : `
                                <div class="bg-gray-850 rounded-lg p-3 border border-gray-700">
                                    <div class="flex items-center mb-1">
                                        <i class="bx bx-info-circle text-gray-400 mr-2"></i>
                                        <p class="font-medium text-gray-300">Free Plan</p>
                                    </div>
                                    <p class="text-sm text-gray-400 mb-2">
                                        You're currently on the free plan with limited features.
                                    </p>
                                    <ul class="text-xs text-gray-500 space-y-1 mb-3">
                                        <li class="flex items-center">
                                            <i class="bx bx-chevron-right text-gray-500 mr-1"></i>
                                            <span>${state.limits.free.notes} notes, ${state.limits.free.todos} todos, ${state.limits.free.passwords} password</span>
                                        </li>
                                        <li class="flex items-center">
                                            <i class="bx bx-chevron-right text-gray-500 mr-1"></i>
                                            <span>${state.limits.free.noteCharLimit} chars per note, contains ads</span>
                                        </li>
                                    </ul>
                                </div>
                            `
                            }
                        </div>
                    </div>
                </div>
                
                <div>
                    <h4 class="text-lg font-semibold mb-3">Appearance</h4>
                    <div class="bg-gray-800 p-4 rounded-lg">
                        <div class="flex items-center justify-between">
                            <span class="text-gray-300">Theme</span>
                            <div class="theme-toggle-wrapper relative flex items-center">
                                <label for="theme-toggle" class="text-sm text-gray-400 mr-2">
                                    <i class="bx bx-moon text-lg"></i>
                                </label>
                                <div class="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                                    <input type="checkbox" name="theme-toggle" id="theme-toggle" class="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer ${
                                      state.isDarkTheme
                                        ? ""
                                        : "right-0 border-yellow-400"
                                    }" ${state.isDarkTheme ? "" : "checked"}>
                                    <label for="theme-toggle" class="toggle-label block overflow-hidden h-5 rounded-full bg-gray-700 cursor-pointer ${
                                      state.isDarkTheme ? "" : "bg-yellow-400"
                                    }"></label>
                                </div>
                                <label for="theme-toggle" class="text-sm text-gray-400 ml-2">
                                    <i class="bx bx-sun text-lg"></i>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h4 class="text-lg font-semibold mb-3">About</h4>
                    <div class="bg-gray-800 p-4 rounded-lg">
                        <p class="mb-2"><strong>XoNote</strong> v1.0</p>
                        <p class="text-sm text-gray-300">A secure, private notes, todo, and password manager.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add to DOM
    modalsContainer.appendChild(modal);
  document.body.classList.add("overflow-hidden");
    
    // Theme toggle functionality
  const themeToggle = modal.querySelector("#theme-toggle");
  themeToggle.addEventListener("change", () => {
        // Toggle theme state
        state.isDarkTheme = !themeToggle.checked;
        
        // Apply theme change
        applyTheme(state.isDarkTheme);
        
        // Save theme preference
        data.settings.saveSettings({ isDarkTheme: state.isDarkTheme });
    });
    
    // Upgrade button click (if present)
  const upgradeBtn = modal.querySelector("#upgrade-btn");
    if (upgradeBtn) {
    upgradeBtn.addEventListener("click", () => {
            closeModal(modal);
      showPricingPopup("notes");
        });
    }
    
    // Sign out button click
  modal.querySelector("#sign-out-btn").addEventListener("click", async () => {
        try {
            await signOut(auth);
            closeModal(modal);
      showToast("Signed out successfully", "success");
        } catch (error) {
      console.error("Error signing out:", error);
      showToast("Failed to sign out", "error");
        }
    });
    
    // Close button click
  modal.querySelector(".close-settings-btn").addEventListener("click", () => {
        closeModal(modal);
    });
    
    // Close on outside click
  modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
}

// Apply theme to the application
function applyTheme(isDarkTheme) {
    const root = document.documentElement;
    
    if (isDarkTheme) {
        // Dark theme colors
    root.classList.add("dark-theme");
    root.classList.remove("light-theme");
        
        // Set dark theme CSS variables
    root.style.setProperty("--bg-primary", "#000000");
    root.style.setProperty("--bg-secondary", "#111111");
    root.style.setProperty("--bg-tertiary", "#1f1f1f");
    root.style.setProperty("--text-primary", "#ffffff");
    root.style.setProperty("--text-secondary", "#bbbbbb");
    root.style.setProperty("--border-color", "#333333");
    } else {
        // Light theme colors
    root.classList.add("light-theme");
    root.classList.remove("dark-theme");
        
        // Set light theme CSS variables
    root.style.setProperty("--bg-primary", "#ffffff");
    root.style.setProperty("--bg-secondary", "#f8f8f8");
    root.style.setProperty("--bg-tertiary", "#eeeeee");
    root.style.setProperty("--text-primary", "#000000");
    root.style.setProperty("--text-secondary", "#555555");
    root.style.setProperty("--border-color", "#dddddd");
    }
}

// Load user theme settings
function loadThemeSettings() {
    const settings = data.settings.getSettings();
  state.isDarkTheme =
    settings.isDarkTheme !== undefined ? settings.isDarkTheme : true;
    applyTheme(state.isDarkTheme);
}

// Helper function to show professional confirm dialog
function showConfirmDialog(message, confirmCallback, type = "default") {
    // Set icon and color based on type
  let icon = "bx-error-circle";
  let iconColor = "var(--accent-color)";
  let title = "Confirm Action";

  if (type === "note") {
    icon = "bx-note";
    title = "Delete Note";
  } else if (type === "todo") {
    icon = "bx-task";
    title = "Delete Todo";
  } else if (type === "password") {
    icon = "bx-lock-alt";
    title = "Delete Password";
  }

  const dialog = document.createElement("div");
  dialog.className = "confirm-dialog";
    dialog.innerHTML = `
        <div class="confirm-dialog-content">
            <div class="confirm-dialog-header">
                <i class="bx ${icon}" style="color: ${iconColor}"></i>
                <h3>${title}</h3>
            </div>
            <div class="confirm-dialog-body">
                ${message}
            </div>
            <div class="confirm-dialog-footer">
                <button class="confirm-dialog-cancel">Cancel</button>
                <button class="confirm-dialog-confirm">Delete</button>
            </div>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(dialog);
    
    // Animation effect
    setTimeout(() => {
    dialog.querySelector(".confirm-dialog-content").style.animation =
      "slideIn 0.2s ease forwards";
    }, 10);
    
    // Set up event listeners
  dialog
    .querySelector(".confirm-dialog-cancel")
    .addEventListener("click", () => {
        closeConfirmDialog(dialog);
    });
    
  dialog
    .querySelector(".confirm-dialog-confirm")
    .addEventListener("click", () => {
        closeConfirmDialog(dialog);
        confirmCallback();
    });
    
    // Close on background click
  dialog.addEventListener("click", (e) => {
        if (e.target === dialog) {
            closeConfirmDialog(dialog);
        }
    });
}

// Close confirm dialog
function closeConfirmDialog(dialog) {
  dialog.classList.add("fade-out");
    setTimeout(() => {
        dialog.remove();
    }, 200);
}

// Check premium status from GitHub JSON file
async function checkPremiumStatus(email) {
    try {
    const response = await fetch(
      "https://raw.githubusercontent.com/urlinq/xomusic/refs/heads/main/premium.json"
    );
        if (!response.ok) {
      throw new Error("Failed to fetch premium data");
        }
        
        const premiumUsers = await response.json();
    const premiumUser = premiumUsers.find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
        
        if (premiumUser) {
            // Check if membership is expired
            const expiryDate = parseExpiryDate(premiumUser.expiry);
            const now = new Date();
            
            if (expiryDate > now) {
                state.isPremium = true;
                state.premiumData = premiumUser;
                state.premiumExpiry = expiryDate;
                state.membershipType = premiumUser.membershipType;
        console.log("Premium status active until:", expiryDate);
            } else {
                state.isPremium = false;
                state.premiumExpiry = expiryDate;
        console.log("Premium membership expired on:", expiryDate);
            }
        } else {
            state.isPremium = false;
      console.log("No premium membership found");
        }
    } catch (error) {
    console.error("Error checking premium status:", error);
        state.isPremium = false;
    }
}

// Parse expiry date from format "DD:MM:YYYY"
function parseExpiryDate(dateStr) {
  const [day, month, year] = dateStr.split(":").map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed in JS Date
}

// Check if user can add a new item
function canAddItem(itemType) {
    if (state.isPremium) return true;
    
    const currentCount = state[itemType].length;
    const limit = state.limits.free[itemType];
    
    return currentCount < limit;
}

// Show pricing popup
function showPricingPopup(itemType) {
    const itemLabels = {
    notes: "notes",
    todos: "todos",
    passwords: "passwords",
    };
    
    const limits = state.limits.free;
    
  const modal = document.createElement("div");
  modal.className =
    "modal pricing-modal fixed inset-0 bg-black/80 flex items-start justify-center z-50 overflow-y-auto p-2 sm:p-4";
    modal.innerHTML = `
        <div class="modal-content bg-gray-900 w-full max-w-3xl mx-auto my-4 sm:my-8 rounded-lg shadow-xl p-0 overflow-hidden">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-800 bg-gray-950">
                <h3 class="text-xl sm:text-2xl font-bold text-white">Upgrade to Premium</h3>
                <button class="close-pricing-btn text-gray-400 hover:text-white">
                    <i class="bx bx-x text-2xl"></i>
                </button>
            </div>
            
            <div class="p-3 sm:p-4 md:p-6">
                <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3 sm:p-4 mb-4 text-red-300 text-sm sm:text-base">
                    <div class="flex items-start">
                        <i class="bx bx-error-circle text-red-400 text-lg sm:text-xl mt-0.5 mr-2 flex-shrink-0"></i>
                        <div>
                            <h4 class="font-semibold mb-1">Free Plan Limit Reached</h4>
                            <p>You've reached the maximum of ${limits[itemType]} ${itemLabels[itemType]} on the free plan. Upgrade to premium for unlimited ${itemLabels[itemType]} and more features!</p>
                        </div>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Free Plan -->
                    <div class="border border-gray-800 rounded-lg overflow-hidden">
                        <div class="bg-gray-800 p-3 sm:p-4">
                            <h4 class="text-lg sm:text-xl font-bold mb-1 sm:mb-2">Free Plan</h4>
                            <p class="text-gray-400 mb-2 sm:mb-3 text-sm sm:text-base">Basic features for personal use</p>
                            <div class="text-xl sm:text-2xl font-bold text-white">$0<span class="text-base sm:text-lg font-normal text-gray-400">/forever</span></div>
                        </div>
                        <div class="p-3 sm:p-4">
                            <ul class="space-y-1.5 sm:space-y-2 text-sm sm:text-base mb-3 sm:mb-4">
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Up to ${limits.notes} notes</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Up to ${limits.todos} todos</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Up to ${limits.passwords} saved password</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Up to ${limits.noteCharLimit} characters per note</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-x text-red-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Contains ads</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-x text-red-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>No editing after creation</span>
                                </li>
                            </ul>
                            <div>
                                <button class="current-plan-btn w-full py-2 sm:py-3 px-4 bg-gray-700 text-gray-300 rounded-md font-medium border border-gray-600 cursor-not-allowed text-sm sm:text-base">
                                    Current Plan
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Premium Plan -->
                    <div class="border border-yellow-500/50 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(250,204,21,0.15)]">
                        <div class="bg-gradient-to-r from-yellow-600/90 to-yellow-500/90 p-3 sm:p-4 relative">
                            <div class="absolute top-0 right-0 bg-yellow-500 text-xs font-bold uppercase py-1 px-2 sm:px-3 text-black transform translate-y-0 rounded-bl-lg">RECOMMENDED</div>
                            <h4 class="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-white">Premium Plan</h4>
                            <p class="text-yellow-100/80 mb-2 sm:mb-3 text-sm sm:text-base">All features for power users</p>
                            <div class="tabs inline-flex bg-black/20 p-1 rounded-md mb-2 text-xs sm:text-sm">
                                <button class="tab-monthly tab-active px-2 sm:px-3 py-0.5 sm:py-1 rounded-md">Monthly</button>
                                <button class="tab-yearly px-2 sm:px-3 py-0.5 sm:py-1 rounded-md">Yearly <span class="text-xs bg-yellow-400/90 text-black rounded px-1 ml-1">-20%</span></button>
                            </div>
                            <div class="text-xl sm:text-2xl font-bold text-white monthly-price">₹19<span class="text-base sm:text-lg font-normal text-yellow-100/70">/month</span></div>
                            <div class="text-xl sm:text-2xl font-bold text-white yearly-price hidden">₹182<span class="text-base sm:text-lg font-normal text-yellow-100/70">/year</span></div>
                        </div>
                        <div class="p-3 sm:p-4">
                            <ul class="space-y-1.5 sm:space-y-2 text-sm sm:text-base mb-3 sm:mb-4">
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Unlimited notes</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Unlimited todos</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Unlimited passwords</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Up to 10,000 characters per note</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>No ads</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Edit anytime</span>
                                </li>
                                <li class="flex items-start">
                                    <i class="bx bx-check text-green-500 text-lg sm:text-xl mr-2 mt-0.5 flex-shrink-0"></i>
                                    <span>Premium badge</span>
                                </li>
                            </ul>
                            <div>
                                <button class="buy-premium-btn w-full py-2 sm:py-3 px-4 bg-yellow-500 hover:bg-yellow-600 text-black rounded-md font-medium transition text-sm sm:text-base">
                                    Get Premium
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add to DOM
    modalsContainer.appendChild(modal);
  document.body.classList.add("overflow-hidden");
    
    // Toggle between monthly and yearly pricing
  const monthlyTab = modal.querySelector(".tab-monthly");
  const yearlyTab = modal.querySelector(".tab-yearly");
  const monthlyPrice = modal.querySelector(".monthly-price");
  const yearlyPrice = modal.querySelector(".yearly-price");

  monthlyTab.addEventListener("click", () => {
    monthlyTab.classList.add("tab-active");
    yearlyTab.classList.remove("tab-active");
    monthlyPrice.classList.remove("hidden");
    yearlyPrice.classList.add("hidden");
  });

  yearlyTab.addEventListener("click", () => {
    yearlyTab.classList.add("tab-active");
    monthlyTab.classList.remove("tab-active");
    yearlyPrice.classList.remove("hidden");
    monthlyPrice.classList.add("hidden");
    });
    
    // Buy premium button click
  modal.querySelector(".buy-premium-btn").addEventListener("click", () => {
    const selectedPlan = yearlyTab.classList.contains("tab-active")
      ? "yearly"
      : "monthly";
        showMembershipInputPopup(selectedPlan);
        closeModal(modal);
    });
    
    // Close button click
  modal.querySelector(".close-pricing-btn").addEventListener("click", () => {
        closeModal(modal);
    });
    
    // Close on outside click
  modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
}

// Show membership ID input popup
function showMembershipInputPopup(planType) {
  const modal = document.createElement("div");
  modal.className =
    "modal membership-modal fixed inset-0 bg-black/80 flex items-center justify-center z-50 overflow-y-auto";
    modal.innerHTML = `
        <div class="modal-content bg-gray-900 w-full max-w-md mx-4 my-8 rounded-lg shadow-xl p-0 overflow-hidden">
            <div class="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-950">
                <h3 class="text-xl font-bold text-white">Enter Membership ID</h3>
                <button class="close-membership-btn text-gray-400 hover:text-white">
                    <i class="bx bx-x text-2xl"></i>
                </button>
            </div>
            
            <div class="p-6 space-y-6">
                <div class="bg-gray-800/70 rounded-lg p-4">
                    <p class="text-sm text-gray-300 mb-4">Enter your membership ID to activate premium features. If you don't have one, you can get one by contacting us directly.</p>
                    
                    <div class="mb-6">
                        <label for="membership-id" class="block mb-2 text-sm font-medium text-gray-300">Membership ID</label>
                        <input type="text" id="membership-id" class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-white" placeholder="e.g. AGS543">
                        <div id="membership-error" class="hidden mt-2 text-red-400 text-sm"></div>
                    </div>
                    
                    <div class="flex justify-between">
                        <button id="contact-btn" class="flex items-center px-4 py-2 bg-transparent hover:bg-gray-700 text-gray-300 rounded-md font-medium transition border border-gray-700">
                            <i class="bx bxl-whatsapp text-green-500 text-xl mr-2"></i>
                            Don't have an ID?
                        </button>
                        <button id="activate-btn" class="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-md font-medium transition">
                            Activate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add to DOM
    modalsContainer.appendChild(modal);
  document.body.classList.add("overflow-hidden");
    
    // Contact button click - open WhatsApp
  modal.querySelector("#contact-btn").addEventListener("click", () => {
    window.open(
      "https://wa.me/+8801722444801?text=I%20want%20to%20purchase%20XoNote%20Premium%20Membership",
      "_blank"
    );
    });
    
    // Activate button click
  modal.querySelector("#activate-btn").addEventListener("click", async () => {
    const membershipId = modal.querySelector("#membership-id").value.trim();
    const errorElement = modal.querySelector("#membership-error");
        
        if (!membershipId) {
      errorElement.textContent = "Please enter a membership ID";
      errorElement.classList.remove("hidden");
            return;
        }
        
        try {
      const response = await fetch(
        "https://raw.githubusercontent.com/urlinq/xomusic/refs/heads/main/premium.json"
      );
            if (!response.ok) {
        throw new Error("Failed to fetch premium data");
            }
            
            const premiumUsers = await response.json();
            const userEmail = state.currentUser.email.toLowerCase();
      const premiumUser = premiumUsers.find(
        (user) =>
                user.membershipId === membershipId && 
                user.email.toLowerCase() === userEmail
            );
            
            if (premiumUser) {
                // Check if membership is expired
                const expiryDate = parseExpiryDate(premiumUser.expiry);
                const now = new Date();
                
                if (expiryDate > now) {
                    // Valid premium membership
                    state.isPremium = true;
                    state.premiumData = premiumUser;
                    state.premiumExpiry = expiryDate;
                    state.membershipType = premiumUser.membershipType;
                    
                    closeModal(modal);
          showToast("Premium membership activated!", "success");
                    
                    // Handle ads for premium user
                    handleAdsDisplay();
                    
                    // Update settings if open
                    updateSettingsView();
                } else {
          errorElement.textContent = "This membership ID has expired";
          errorElement.classList.remove("hidden");
                }
            } else {
        errorElement.textContent = "Invalid membership ID for this account";
        errorElement.classList.remove("hidden");
            }
        } catch (error) {
      console.error("Error validating membership:", error);
      errorElement.textContent =
        "Error validating membership. Please try again.";
      errorElement.classList.remove("hidden");
        }
    });
    
    // Close button click
  modal.querySelector(".close-membership-btn").addEventListener("click", () => {
        closeModal(modal);
    });
    
    // Close on outside click
  modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
}

// Update settings view if open
function updateSettingsView() {
  const settingsModal = document.querySelector(
    ".modal:not(.pricing-modal):not(.membership-modal)"
  );
    if (settingsModal) {
        closeModal(settingsModal);
        showSettingsScreen();
    }
}

// Handle ads display based on premium status
function handleAdsDisplay() {
    // If premium user, remove all ads
    if (state.isPremium) {
        // Remove popunder ad script if it exists
    const adScripts = document.querySelectorAll(
      'script[src*="profitableratecpm"]'
    );
    adScripts.forEach((script) => script.remove());
        
        // Remove any ad containers
    const adContainers = document.querySelectorAll(".ad-container");
    adContainers.forEach((container) => container.remove());
        
        // Remove specific Adsterra native banner
    const nativeBanner = document.getElementById(
      "container-50b0737bbd43ffd93aa58164d1c06c20"
    );
        if (nativeBanner) {
      nativeBanner.style.display = "none";
        }
        
    console.log("Premium user: Ads removed");
    } else {
        // Free user - ensure ads are loaded
    console.log("Free user: Ads enabled");
        
        // Make sure native banner is visible for free users
    const nativeBanner = document.getElementById(
      "container-50b0737bbd43ffd93aa58164d1c06c20"
    );
        if (nativeBanner) {
      nativeBanner.style.display = "block";
        }
        
        // Add popunder script if not already present
        if (!document.querySelector('script[src*="profitableratecpm"]')) {
      const adScript = document.createElement("script");
      adScript.type = "text/javascript";
      adScript.src =
        "//pl26575948.profitableratecpm.com/ce/c8/11/cec8115866e63c86eb85509224bde85a.js";
      adScript.className = "popunder-ad-script";
            document.head.appendChild(adScript);
      console.log("Popunder ad script added for free user");
    }
  }
}

// Show contact editor modal
function showContactEditor(contact = null) {
  const isEditing = contact !== null;

  // Check premium status for editing
  if (isEditing && !state.isPremium) {
    showPricingPopup("contacts");
    showToast("Editing is a premium feature", "error");
    return;
  }

  const modal = document.createElement("div");
  modal.className =
    "modal fixed inset-0 bg-black/80 flex items-start justify-center z-50 overflow-y-auto";
  modal.innerHTML = `
        <div class="modal-content bg-gray-900 w-full max-w-2xl mx-4 my-8 rounded-lg shadow-xl">
            <div class="flex justify-between items-center p-4 border-b border-gray-800">
                <h3 class="text-xl font-semibold">${
                  isEditing ? "Edit Contact" : "New Contact"
                }</h3>
                <div>
                    <button class="save-contact-btn bg-yellow-400 text-black px-4 py-2 rounded-md font-medium hover:bg-yellow-500 transition mr-2">Save</button>
                    <button class="cancel-contact-btn text-gray-400 hover:text-white">
                        <i class="bx bx-x text-2xl"></i>
                    </button>
                </div>
            </div>
            <div class="p-4">
                <div class="mb-4">
                    <label for="contact-name" class="block text-sm font-medium text-gray-300 mb-1">Name (Optional)</label>
                    <input type="text" id="contact-name" class="contact-name-input w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="e.g. John Doe" value="${
                      isEditing && contact.name ? contact.name : ""
                    }">
                </div>
                <div class="mb-4">
                    <label for="contact-number" class="block text-sm font-medium text-gray-300 mb-1">Phone Number</label>
                    <div class="flex flex-col sm:flex-row">
                        <div class="relative mb-2 sm:mb-0">
                            <select id="country-code" class="country-code-select w-full sm:w-auto px-4 py-3 bg-gray-800 border border-gray-700 rounded-md sm:rounded-r-none focus:outline-none focus:ring-2 focus:ring-yellow-400">
                                <option value="+91" ${
                                  !isEditing ||
                                  (isEditing && contact.countryCode === "+91")
                                    ? "selected"
                                    : ""
                                }>+91 (India)</option>
<option value="+1" ${
    isEditing && contact.countryCode === "+1" ? "selected" : ""
  }>+1 (USA/Canada)</option>
<option value="+44" ${
    isEditing && contact.countryCode === "+44" ? "selected" : ""
  }>+44 (UK)</option>
<option value="+61" ${
    isEditing && contact.countryCode === "+61" ? "selected" : ""
  }>+61 (Australia)</option>
<option value="+49" ${
    isEditing && contact.countryCode === "+49" ? "selected" : ""
  }>+49 (Germany)</option>
<option value="+33" ${
    isEditing && contact.countryCode === "+33" ? "selected" : ""
  }>+33 (France)</option>
<option value="+81" ${
    isEditing && contact.countryCode === "+81" ? "selected" : ""
  }>+81 (Japan)</option>
<option value="+86" ${
    isEditing && contact.countryCode === "+86" ? "selected" : ""
  }>+86 (China)</option>
<option value="+7" ${
    isEditing && contact.countryCode === "+7" ? "selected" : ""
  }>+7 (Russia)</option>
<option value="+55" ${
    isEditing && contact.countryCode === "+55" ? "selected" : ""
  }>+55 (Brazil)</option>
<option value="+27" ${
    isEditing && contact.countryCode === "+27" ? "selected" : ""
  }>+27 (South Africa)</option>
<option value="+52" ${
    isEditing && contact.countryCode === "+52" ? "selected" : ""
  }>+52 (Mexico)</option>
<option value="+39" ${
    isEditing && contact.countryCode === "+39" ? "selected" : ""
  }>+39 (Italy)</option>
<option value="+34" ${
    isEditing && contact.countryCode === "+34" ? "selected" : ""
  }>+34 (Spain)</option>
<option value="+90" ${
    isEditing && contact.countryCode === "+90" ? "selected" : ""
  }>+90 (Turkey)</option>
<option value="+62" ${
    isEditing && contact.countryCode === "+62" ? "selected" : ""
  }>+62 (Indonesia)</option>
<option value="+82" ${
    isEditing && contact.countryCode === "+82" ? "selected" : ""
  }>+82 (South Korea)</option>
<option value="+65" ${
    isEditing && contact.countryCode === "+65" ? "selected" : ""
  }>+65 (Singapore)</option>
<option value="+966" ${
    isEditing && contact.countryCode === "+966" ? "selected" : ""
  }>+966 (Saudi Arabia)</option>
<option value="+971" ${
    isEditing && contact.countryCode === "+971" ? "selected" : ""
  }>+971 (UAE)</option>
<option value="+92" ${
    isEditing && contact.countryCode === "+92" ? "selected" : ""
  }>+92 (Pakistan)</option>
<option value="+880" ${
    isEditing && contact.countryCode === "+880" ? "selected" : ""
  }>+880 (Bangladesh)</option>
<option value="+60" ${
    isEditing && contact.countryCode === "+60" ? "selected" : ""
  }>+60 (Malaysia)</option>
<option value="+234" ${
    isEditing && contact.countryCode === "+234" ? "selected" : ""
  }>+234 (Nigeria)</option>
<option value="+20" ${
    isEditing && contact.countryCode === "+20" ? "selected" : ""
  }>+20 (Egypt)</option>
<option value="+31" ${
    isEditing && contact.countryCode === "+31" ? "selected" : ""
  }>+31 (Netherlands)</option>
<option value="+41" ${
    isEditing && contact.countryCode === "+41" ? "selected" : ""
  }>+41 (Switzerland)</option>
<option value="+46" ${
    isEditing && contact.countryCode === "+46" ? "selected" : ""
  }>+46 (Sweden)</option>
<option value="+47" ${
    isEditing && contact.countryCode === "+47" ? "selected" : ""
  }>+47 (Norway)</option>
<option value="+45" ${
    isEditing && contact.countryCode === "+45" ? "selected" : ""
  }>+45 (Denmark)</option>
<option value="+358" ${
    isEditing && contact.countryCode === "+358" ? "selected" : ""
  }>+358 (Finland)</option>
<option value="+43" ${
    isEditing && contact.countryCode === "+43" ? "selected" : ""
  }>+43 (Austria)</option>
<option value="+32" ${
    isEditing && contact.countryCode === "+32" ? "selected" : ""
  }>+32 (Belgium)</option>
<option value="+64" ${
    isEditing && contact.countryCode === "+64" ? "selected" : ""
  }>+64 (New Zealand)</option>
<option value="+54" ${
    isEditing && contact.countryCode === "+54" ? "selected" : ""
  }>+54 (Argentina)</option>
<option value="+56" ${
    isEditing && contact.countryCode === "+56" ? "selected" : ""
  }>+56 (Chile)</option>
<option value="+57" ${
    isEditing && contact.countryCode === "+57" ? "selected" : ""
  }>+57 (Colombia)</option>
<option value="+63" ${
    isEditing && contact.countryCode === "+63" ? "selected" : ""
  }>+63 (Philippines)</option>
<option value="+93" ${
    isEditing && contact.countryCode === "+93" ? "selected" : ""
  }>+93 (Afghanistan)</option>
<option value="+355" ${
    isEditing && contact.countryCode === "+355" ? "selected" : ""
  }>+355 (Albania)</option>
<option value="+213" ${
    isEditing && contact.countryCode === "+213" ? "selected" : ""
  }>+213 (Algeria)</option>
<option value="+376" ${
    isEditing && contact.countryCode === "+376" ? "selected" : ""
  }>+376 (Andorra)</option>
<option value="+244" ${
    isEditing && contact.countryCode === "+244" ? "selected" : ""
  }>+244 (Angola)</option>
<option value="+374" ${
    isEditing && contact.countryCode === "+374" ? "selected" : ""
  }>+374 (Armenia)</option>
<option value="+994" ${
    isEditing && contact.countryCode === "+994" ? "selected" : ""
  }>+994 (Azerbaijan)</option>
<option value="+1242" ${
    isEditing && contact.countryCode === "+1242" ? "selected" : ""
  }>+1242 (Bahamas)</option>
<option value="+973" ${
    isEditing && contact.countryCode === "+973" ? "selected" : ""
  }>+973 (Bahrain)</option>
<option value="+1246" ${
    isEditing && contact.countryCode === "+1246" ? "selected" : ""
  }>+1246 (Barbados)</option>
<option value="+375" ${
    isEditing && contact.countryCode === "+375" ? "selected" : ""
  }>+375 (Belarus)</option>
<option value="+501" ${
    isEditing && contact.countryCode === "+501" ? "selected" : ""
  }>+501 (Belize)</option>
<option value="+229" ${
    isEditing && contact.countryCode === "+229" ? "selected" : ""
  }>+229 (Benin)</option>
<option value="+975" ${
    isEditing && contact.countryCode === "+975" ? "selected" : ""
  }>+975 (Bhutan)</option>
<option value="+591" ${
    isEditing && contact.countryCode === "+591" ? "selected" : ""
  }>+591 (Bolivia)</option>
<option value="+387" ${
    isEditing && contact.countryCode === "+387" ? "selected" : ""
  }>+387 (Bosnia & Herzegovina)</option>
<option value="+267" ${
    isEditing && contact.countryCode === "+267" ? "selected" : ""
  }>+267 (Botswana)</option>
<option value="+673" ${
    isEditing && contact.countryCode === "+673" ? "selected" : ""
  }>+673 (Brunei)</option>
<option value="+359" ${
    isEditing && contact.countryCode === "+359" ? "selected" : ""
  }>+359 (Bulgaria)</option>
<option value="+226" ${
    isEditing && contact.countryCode === "+226" ? "selected" : ""
  }>+226 (Burkina Faso)</option>
<option value="+257" ${
    isEditing && contact.countryCode === "+257" ? "selected" : ""
  }>+257 (Burundi)</option>
<option value="+855" ${
    isEditing && contact.countryCode === "+855" ? "selected" : ""
  }>+855 (Cambodia)</option>
<option value="+237" ${
    isEditing && contact.countryCode === "+237" ? "selected" : ""
  }>+237 (Cameroon)</option>
<option value="+238" ${
    isEditing && contact.countryCode === "+238" ? "selected" : ""
  }>+238 (Cape Verde)</option>
<option value="+236" ${
    isEditing && contact.countryCode === "+236" ? "selected" : ""
  }>+236 (Central African Republic)</option>
<option value="+235" ${
    isEditing && contact.countryCode === "+235" ? "selected" : ""
  }>+235 (Chad)</option>
<option value="+269" ${
    isEditing && contact.countryCode === "+269" ? "selected" : ""
  }>+269 (Comoros)</option>
<option value="+506" ${
    isEditing && contact.countryCode === "+506" ? "selected" : ""
  }>+506 (Costa Rica)</option>
<option value="+385" ${
    isEditing && contact.countryCode === "+385" ? "selected" : ""
  }>+385 (Croatia)</option>
<option value="+53" ${
    isEditing && contact.countryCode === "+53" ? "selected" : ""
  }>+53 (Cuba)</option>
<option value="+357" ${
    isEditing && contact.countryCode === "+357" ? "selected" : ""
  }>+357 (Cyprus)</option>
<option value="+420" ${
    isEditing && contact.countryCode === "+420" ? "selected" : ""
  }>+420 (Czech Republic)</option>
<option value="+243" ${
    isEditing && contact.countryCode === "+243" ? "selected" : ""
  }>+243 (DR Congo)</option>
<option value="+253" ${
    isEditing && contact.countryCode === "+253" ? "selected" : ""
  }>+253 (Djibouti)</option>
<option value="+1767" ${
    isEditing && contact.countryCode === "+1767" ? "selected" : ""
  }>+1767 (Dominica)</option>
<option value="+1809" ${
    isEditing && contact.countryCode === "+1809" ? "selected" : ""
  }>+1809 (Dominican Republic)</option>
<option value="+593" ${
    isEditing && contact.countryCode === "+593" ? "selected" : ""
  }>+593 (Ecuador)</option>
<option value="+503" ${
    isEditing && contact.countryCode === "+503" ? "selected" : ""
  }>+503 (El Salvador)</option>
<option value="+240" ${
    isEditing && contact.countryCode === "+240" ? "selected" : ""
  }>+240 (Equatorial Guinea)</option>
<option value="+291" ${
    isEditing && contact.countryCode === "+291" ? "selected" : ""
  }>+291 (Eritrea)</option>
<option value="+372" ${
    isEditing && contact.countryCode === "+372" ? "selected" : ""
  }>+372 (Estonia)</option>
<option value="+268" ${
    isEditing && contact.countryCode === "+268" ? "selected" : ""
  }>+268 (Eswatini)</option>
<option value="+251" ${
    isEditing && contact.countryCode === "+251" ? "selected" : ""
  }>+251 (Ethiopia)</option>
<option value="+679" ${
    isEditing && contact.countryCode === "+679" ? "selected" : ""
  }>+679 (Fiji)</option>
<option value="+241" ${
    isEditing && contact.countryCode === "+241" ? "selected" : ""
  }>+241 (Gabon)</option>
<option value="+220" ${
    isEditing && contact.countryCode === "+220" ? "selected" : ""
  }>+220 (Gambia)</option>
<option value="+995" ${
    isEditing && contact.countryCode === "+995" ? "selected" : ""
  }>+995 (Georgia)</option>
<option value="+233" ${
    isEditing && contact.countryCode === "+233" ? "selected" : ""
  }>+233 (Ghana)</option>
<option value="+350" ${
    isEditing && contact.countryCode === "+350" ? "selected" : ""
  }>+350 (Gibraltar)</option>
<option value="+30" ${
    isEditing && contact.countryCode === "+30" ? "selected" : ""
  }>+30 (Greece)</option>
<option value="+1473" ${
    isEditing && contact.countryCode === "+1473" ? "selected" : ""
  }>+1473 (Grenada)</option>

                            </select>
                        </div>
                        <input type="tel" id="contact-number" class="contact-number-input w-full px-4 py-3 bg-gray-800 border border-gray-700 sm:border-l-0 rounded-md sm:rounded-l-none focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Phone number" pattern="[0-9]*" minlength="3" maxlength="12" inputmode="numeric" value="${
                          isEditing && contact.number ? contact.number : ""
                        }">
                    </div>
                    <p class="text-xs text-gray-500 mt-1">Enter 3-12 digits only</p>
                </div>
                <div class="mb-4">
                    <label for="contact-notes" class="block text-sm font-medium text-gray-300 mb-1">Notes (Optional)</label>
                    <textarea id="contact-notes" class="contact-notes-input w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 min-h-[80px]" placeholder="Additional information">${
                      isEditing && contact.notes ? contact.notes : ""
                    }</textarea>
                </div>
            </div>
        </div>
    `;

  // Add to DOM
  modalsContainer.appendChild(modal);
  document.body.classList.add("overflow-hidden");

  // Focus on first field
  setTimeout(() => {
    modal.querySelector(".contact-name-input").focus();
  }, 100);

  // Add input validation for phone number - numbers only
  const phoneInput = modal.querySelector(".contact-number-input");
  phoneInput.addEventListener("input", (e) => {
    // Remove any non-numeric characters
    e.target.value = e.target.value.replace(/\D/g, "");

    // Enforce length limits
    if (e.target.value.length > 12) {
      e.target.value = e.target.value.slice(0, 12);
    }
  });

  // Save button click
  modal
    .querySelector(".save-contact-btn")
    .addEventListener("click", async () => {
      const nameValue = modal.querySelector(".contact-name-input").value.trim();
      const countryCodeValue = modal.querySelector(
        ".country-code-select"
      ).value;
      const numberValue = modal
        .querySelector(".contact-number-input")
        .value.trim();
      const notesValue = modal
        .querySelector(".contact-notes-input")
        .value.trim();

      if (!numberValue) {
        showToast("Please enter a phone number", "error");
        return;
      }

      if (numberValue.length < 3) {
        showToast("Phone number must be at least 3 digits", "error");
        return;
      }

      if (numberValue.length > 12) {
        showToast("Phone number cannot exceed 12 digits", "error");
        return;
      }

      try {
        if (isEditing) {
          // Update existing contact
          await updateDoc(doc(db, "contacts", contact.id), {
            name: nameValue,
            countryCode: countryCodeValue,
            number: numberValue,
            notes: notesValue,
            updatedAt: new Date(),
          });

          // Update local state
          const index = state.contacts.findIndex((c) => c.id === contact.id);
          if (index !== -1) {
            state.contacts[index] = {
              ...state.contacts[index],
              name: nameValue,
              countryCode: countryCodeValue,
              number: numberValue,
              notes: notesValue,
              updatedAt: new Date(),
            };
          }

          showToast("Contact updated successfully", "success");
        } else {
          // Create new contact
          const newContact = {
            name: nameValue,
            countryCode: countryCodeValue,
            number: numberValue,
            notes: notesValue,
            userId: state.currentUser.uid,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const docRef = await addDoc(collection(db, "contacts"), newContact);

          // Add to local state
          state.contacts.unshift({
            id: docRef.id,
            ...newContact,
          });

          // Reset pagination to show the new contact
          resetPagination("contacts");

          showToast("Contact saved successfully", "success");
        }

        // Re-render contacts
        renderContacts();

        // Close modal
        closeModal(modal);
      } catch (error) {
        console.error("Error saving contact:", error);
        showToast("Failed to save contact", "error");
      }
    });

  // Cancel button click
  modal.querySelector(".cancel-contact-btn").addEventListener("click", () => {
    closeModal(modal);
  });

  // Close on outside click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal(modal);
    }
  });
}

// Show contact viewer
function showContactViewer(contact) {
  const modal = document.createElement("div");
  modal.className =
    "modal fixed inset-0 bg-black/80 flex items-start justify-center z-50 overflow-y-auto";
  modal.innerHTML = `
        <div class="modal-content bg-gray-900 w-full max-w-2xl mx-4 my-8 rounded-lg shadow-xl">
            <div class="flex justify-between items-center p-4 border-b border-gray-800">
                <div class="flex items-center">
                    <i class="bx bx-user-circle text-blue-400 text-3xl mr-3"></i>
                    <h3 class="text-xl font-semibold">${
                      contact.name || "Unnamed Contact"
                    }</h3>
                </div>
                <div class="flex space-x-3">
                    ${
                      state.isPremium
                        ? `
                        <button class="edit-contact-btn text-yellow-400 w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-800" title="Edit">
                            <i class="bx bx-edit text-xl"></i>
                        </button>
                    `
                        : `
                        <button class="premium-edit-btn text-gray-600 w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-800 cursor-not-allowed" title="Premium Feature">
                            <i class="bx bx-lock text-xl"></i>
                        </button>
                    `
                    }
                    <button class="delete-contact-btn text-red-400 w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-800" title="Delete">
                        <i class="bx bx-trash text-xl"></i>
                    </button>
                    <button class="close-contact-btn text-gray-400 w-9 h-9 flex items-center justify-center hover:text-white" title="Close">
                        <i class="bx bx-x text-2xl"></i>
                    </button>
                </div>
            </div>
            <div class="p-6 space-y-4">
                <div>
                    <p class="text-sm text-gray-400 mb-1">Phone Number</p>
                    <div class="flex items-center justify-between bg-gray-800 p-3 rounded-md">
                        <p class="text-gray-200">${
                          contact.countryCode || "+91"
                        } ${contact.number}</p>
                        <div class="flex space-x-2">
                            <a href="tel:${contact.countryCode || "+91"}${
    contact.number
  }" class="call-btn text-gray-400 hover:text-white w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-700">
                                <i class="bx bx-phone text-xl"></i>
                            </a>
                            <button class="copy-number-btn text-gray-400 hover:text-white w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-700">
                                <i class="bx bx-copy text-xl"></i>
                            </button>
                        </div>
                    </div>
                </div>
                ${
                  contact.notes
                    ? `
                    <div>
                        <p class="text-sm text-gray-400 mb-1">Notes</p>
                        <div class="bg-gray-800 p-3 rounded-md">
                            <p class="text-gray-300 whitespace-pre-wrap">${contact.notes}</p>
                        </div>
                    </div>
                `
                    : ""
                }
            </div>
            <div class="px-6 pb-6 text-gray-500 text-sm">
                Created: ${formatDate(contact.createdAt)}
                ${
                  contact.updatedAt && contact.updatedAt !== contact.createdAt
                    ? `<br>Last Updated: ${formatDate(contact.updatedAt)}`
                    : ""
                }
            </div>
        </div>
    `;

  // Add to DOM
  modalsContainer.appendChild(modal);
  document.body.classList.add("overflow-hidden");

  // Edit button click
  const editBtn = modal.querySelector(".edit-contact-btn");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      closeModal(modal);
      showContactEditor(contact);
    });
  }

  // Premium edit button (locked)
  const premiumEditBtn = modal.querySelector(".premium-edit-btn");
  if (premiumEditBtn) {
    premiumEditBtn.addEventListener("click", () => {
      showPricingPopup("contacts");
    });
  }

  // Delete button click
  modal
    .querySelector(".delete-contact-btn")
    .addEventListener("click", async () => {
      showConfirmDialog(
        "Are you sure you want to delete this contact?",
        async () => {
          try {
            // Delete from Firestore
            await deleteDoc(doc(db, "contacts", contact.id));

            // Delete from local state
            state.contacts = state.contacts.filter((c) => c.id !== contact.id);

            // Re-render contacts
            renderContacts();

            // Close modal
            closeModal(modal);

            showToast("Contact deleted successfully", "success");
          } catch (error) {
            console.error("Error deleting contact:", error);
            showToast("Failed to delete contact", "error");
          }
        },
        "contact"
      );
    });

  // Copy number
  modal.querySelector(".copy-number-btn").addEventListener("click", () => {
    const fullNumber = `${contact.countryCode || "+91"}${contact.number}`;
    navigator.clipboard
      .writeText(fullNumber)
      .then(() => {
        showToast("Phone number copied to clipboard", "success");
      })
      .catch((err) => {
        console.error("Could not copy text: ", err);
        showToast("Failed to copy to clipboard", "error");
      });
  });

  // Close button click
  modal.querySelector(".close-contact-btn").addEventListener("click", () => {
    closeModal(modal);
  });

  // Close on outside click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal(modal);
    }
  });
}

// Initialize app
initApp();
