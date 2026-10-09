
import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from
    "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

onAuthStateChanged(auth, (usuario) => {
    if (!usuario) {
        window.location.replace("./login.html");
    }
});
