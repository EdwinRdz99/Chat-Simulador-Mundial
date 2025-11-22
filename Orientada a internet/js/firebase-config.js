
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-analytics.js";


  const firebaseConfig = {
    apiKey: "AIzaSyCv0WPTJww3T96JXrgyOhyD1yaCLXV9f7Q",
    authDomain: "mundial2026-chat-poi.firebaseapp.com",
    projectId: "mundial2026-chat-poi",
    storageBucket: "mundial2026-chat-poi.firebasestorage.app",
    messagingSenderId: "210621502055",
    appId: "1:210621502055:web:40f7f7c70da2624c317ac2",
    measurementId: "G-YM7W5LDWYZ"
  };

 
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);