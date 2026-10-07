<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCUASESPtxTMoHVr8XjysXA0sfSxQfdgr0",
    authDomain: "gerenciamento-escala-fort.firebaseapp.com",
    projectId: "gerenciamento-escala-fort",
    storageBucket: "gerenciamento-escala-fort.firebasestorage.app",
    messagingSenderId: "1080511592235",
    appId: "1:1080511592235:web:26673df9d79f292316f76e",
    measurementId: "G-LG3J9PVEJM"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>
