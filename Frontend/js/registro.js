// register.js - Código com teste de confirmação de salvamento

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const emailInput = document.getElementById('emailRegistro');
    const senhaInput = document.getElementById('senhaRegistro');
    const mensagemSucesso = document.getElementById('mensagemSucesso');
    const mensagemErro = document.getElementById('mensagemErroRegistro');

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const senha = senhaInput.value.trim();

        if (!email || !senha) {
            mensagemErro.textContent = 'Preencha todos os campos obrigatórios.';
            mensagemErro.style.display = 'block';
            return;
        }

        // 1. Salva as credenciais no localStorage
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userPassword', senha); 
        
        // --- INÍCIO DO TESTE DE CONFIRMAÇÃO ---
        const senhaSalvaTeste = localStorage.getItem('userPassword');
        const emailSalvoTeste = localStorage.getItem('userEmail');
        
        console.log("--- TESTE DE REGISTRO LOCALSTORAGE ---");
        console.log(`E-mail Salvo: ${emailSalvoTeste}`);
        console.log(`Senha Salva: ${senhaSalvaTeste}`);
        console.log("--------------------------------------");
        
        if (senhaSalvaTeste === senha) {
            console.log("SUCESSO: As credenciais foram salvas corretamente no localStorage.");
        } else {
            console.error("FALHA: O localStorage NÃO salvou as credenciais corretamente.");
        }
        // --- FIM DO TESTE DE CONFIRMAÇÃO ---
        

        // 2. Limpa e exibe sucesso
        mensagemErro.style.display = 'none';
        mensagemSucesso.style.display = 'block';
        registerForm.reset();
        
        // 3. Redireciona para o login
        setTimeout(() => {
            mensagemSucesso.style.display = 'none';
            window.location.href = 'login.html'; 
        }, 1500);
    });
});