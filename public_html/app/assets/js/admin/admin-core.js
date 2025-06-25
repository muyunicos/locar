document.addEventListener('DOMContentLoaded', () => {
    const config = window.appConfig || {}; 
    const publicUrl = config.publicUrl;
    const clientUrl = config.clientUrl;
    const version = config.version; 
    const clientId = config.clientId;
    const showLoginModalFromConfig = config.showLoginModal;

    const handleAuthFormSubmit = (formElement, apiEndpoint, onSuccess) => {
        if (!formElement) return;

        formElement.addEventListener('submit', (event) => {
            event.preventDefault();

            const messageDiv = formElement.querySelector('.form-message');
            const submitButton = formElement.querySelector('button[type="submit"]');
            const formData = new FormData(formElement);
            
            let finalApiEndpoint = `${publicUrl}${apiEndpoint}`;
            const params = new URLSearchParams();

            if (clientUrl) {
                params.append('url', clientUrl); 
            }
            if (clientId) {
                params.append('client_id', clientId); 
            }
            if (version) {
                params.append('version', version);
            }

            const queryString = params.toString();

            if (queryString) {
                finalApiEndpoint += `?${queryString}`;
            }

            if (!submitButton.dataset.originalText) {
                submitButton.dataset.originalText = submitButton.textContent;
            }

            submitButton.disabled = true;
            submitButton.textContent = 'Procesando...';
            if(messageDiv) {
                messageDiv.textContent = '';
                messageDiv.className = 'form-message';
            }

            fetch(finalApiEndpoint, {
                method: 'POST',
                credentials: 'include',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errorData => {
                        throw new Error(`API Error ${response.status}: ${errorData.message || JSON.stringify(errorData)}`);
                    }).catch(() => {
                        throw new Error(`API Error ${response.status}: ${response.statusText}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.server_logs && Array.isArray(data.server_logs)) {
                    console.groupCollapsed("PHP Server-Side Logs (Admin API)");
                    data.server_logs.forEach(log => console.log(log));
                    console.groupEnd();
                }

                if (messageDiv) {
                    messageDiv.textContent = data.message;
                    if (data.success) {
                        messageDiv.classList.add('success');
                        if (onSuccess) {
                            onSuccess(data);
                        }
                    } else {
                        messageDiv.classList.add('error');
                    }
                } else if (data.success && onSuccess) {
                    onSuccess(data);
                }
            })
            .catch(error => {
                console.error('Error en la petición:', error);
                if (messageDiv) {
                    messageDiv.textContent = error.message || 'Ocurrió un error de conexión.';
                    messageDiv.classList.add('error');
                }
            })
            .finally(() => {
                submitButton.disabled = false;
                submitButton.textContent = submitButton.dataset.originalText;
            });
        });
    };
    
    const createAdminForm = document.getElementById('create-admin-form');
    const resetPasswordForm = document.getElementById('reset-password-form');
    const loginForm = document.getElementById('login-form');
    const requestResetForm = document.getElementById('request-reset-form');

    handleAuthFormSubmit(createAdminForm, '/api/create_initial_admin.php', () => {
        setTimeout(() => { window.location.href = clientUrl + '/admin'; }, 2000);
    });

    handleAuthFormSubmit(resetPasswordForm, '/api/perform_password_reset.php', () => {
        setTimeout(() => { window.location.href = clientUrl + '/admin'; }, 2000);
    });

    handleAuthFormSubmit(loginForm, '/api/login.php', () => {
        window.location.href = clientUrl + '/admin';
    });

    handleAuthFormSubmit(requestResetForm, '/api/request_password_reset.php', () => {
    });

    const loginModalBackdrop = document.getElementById('login-modal-backdrop');
    if (loginModalBackdrop) {
        // Activa el modal de login basado en la configuración.
        if (showLoginModalFromConfig === true) {
            loginModalBackdrop.style.display = 'flex';
        }
        
        // El typo `loginModalBackrop` ya fue corregido a `loginModalBackdrop`.
        loginModalBackdrop.addEventListener('click', (e) => {
            if (e.target.id === 'login-modal-backdrop' || e.target.classList.contains('close-button')) {
                loginModalBackdrop.style.display = 'none';
            }
        });

        const forgotPasswordLink = document.getElementById('forgot-password-link');
        const backToLoginLink = document.getElementById('back-to-login-link');
        
        if(forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                loginForm.style.display = 'none';
                requestResetForm.style.display = 'block';
            });
        }
        
        if(backToLoginLink) {
            backToLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                requestResetForm.style.display = 'none';
                loginForm.style.display = 'block';
            });
        }
    }
});