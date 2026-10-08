
import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from
    "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

onAuthStateChanged(auth, (usuario) => {
    if (!usuario) {
        window.location.replace("./login.html");
    }
});
