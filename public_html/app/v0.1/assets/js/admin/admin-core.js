document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const showLoginModal = body.dataset.showLoginModal === 'true';

    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const errorMessageElement = document.getElementById('login-error-message');

    if (showLoginModal && loginModal) {
        loginModal.style.display = 'flex';
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = loginForm.username.value;
            const password = loginForm.password.value;
            const publicUrl = body.dataset.publicUrl;
            const clientId = body.dataset.clientId;
            const devId = body.dataset.devId;
            const clientUrl = body.dataset.clientUrl; 

            errorMessageElement.style.display = 'none';
            errorMessageElement.textContent = '';

            let apiUrl = `${publicUrl}/api/login.php?client=${clientId}&url=${encodeURIComponent(clientUrl)}`;
            if (devId) {
                apiUrl += `&dev=${devId}`;
            }

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const result = await response.json();

                if (result.success) {
                    window.location.href = clientUrl;
                } else {
                    errorMessageElement.textContent = result.message || 'Un error ha ocurrido.';
                    errorMessageElement.style.display = 'block';
                }
            } catch (error) {
                console.error('Error en el proceso de login:', error);
                errorMessageElement.textContent = 'No se pudo conectar con el servidor.';
                errorMessageElement.style.display = 'block';
            }
        });
    }
});