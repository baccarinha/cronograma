
import { auth } from "./firebase-config.js";
import {
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const form = document.getElementById("formLogin");
const email = document.getElementById("email");
const senha = document.getElementById("senha");
const mensagem = document.getElementById("mensagem");
const botao = document.getElementById("btnEntrar");

// Se já estiver autenticado, abre o cronograma.
onAuthStateChanged(auth, (usuario) => {
    if (usuario) {
        window.location.replace("./index.html");
    }
});

form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    mensagem.textContent = "";
    botao.disabled = true;
    botao.textContent = "Verificando acesso...";

    try {
        await signInWithEmailAndPassword(
            auth,
            email.value.trim(),
            senha.value
        );

        window.location.replace("./index.html");

    } catch (erro) {
        console.error("Erro no login:", erro.code);

        if (
            erro.code === "auth/invalid-credential" ||
            erro.code === "auth/wrong-password" ||
            erro.code === "auth/user-not-found"
        ) {
            mensagem.textContent =
                "E-mail ou senha incorretos.";
        } else if (erro.code === "auth/invalid-email") {
            mensagem.textContent =
                "Digite um endereço de e-mail válido.";
        } else if (erro.code === "auth/too-many-requests") {
            mensagem.textContent =
                "Muitas tentativas. Aguarde antes de tentar novamente.";
        } else {
            mensagem.textContent =
                "Não foi possível entrar. Verifique a configuração e tente novamente.";
        }

        botao.disabled = false;
        botao.textContent = "Entrar no sistema";
    }
});
