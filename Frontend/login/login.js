// login.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const senhaInput = document.getElementById('senha');
    const mensagemErro = document.getElementById('mensagemErro');

    // Garante que a mensagem de erro esteja oculta no início
    if (mensagemErro) {
        mensagemErro.style.display = 'none';
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const emailDigitado = emailInput.value.trim();
        const senhaDigitada = senhaInput.value.trim();

        // Pega as credenciais salvas
        const emailSalvo = localStorage.getItem('userEmail');
        const senhaSalva = localStorage.getItem('userPassword');

        // Verifica se há alguma conta registrada
        if (!emailSalvo || !senhaSalva) {
            mensagemErro.textContent = 'Nenhuma conta registrada. Por favor, registre-se.';
            mensagemErro.style.display = 'block';
            return;
        }

        // Lógica de Autenticação
        if (emailDigitado === emailSalvo && senhaDigitada === senhaSalva) {
            // Sucesso
            localStorage.setItem('isAuthenticated', 'true');
            window.location.href = '/daily-study-v2.html';
        } else {
            // Falha
            mensagemErro.textContent = 'E-mail ou senha incorretos.';
            mensagemErro.style.display = 'block';
        }
    });
});