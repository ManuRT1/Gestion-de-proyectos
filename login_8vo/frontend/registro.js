document.getElementById('formRegistro').addEventListener('submit', async (e) => {
    e.preventDefault();

    const msg = document.getElementById('msg');
    const usuario = document.getElementById('usuario').value.trim();
    const password = document.getElementById('password').value.trim();
    const rol = document.getElementById('rol').value;

    try {
        const response = await fetch('http://localhost:3000/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Vital para enviar la cookie de admin
            body: JSON.stringify({ usuario, password, rol })
        });

        const data = await response.json();

        if (response.ok) {
            msg.className = "mt-3 text-success";
            msg.textContent = "Usuario creado exitosamente";
            document.getElementById('formRegistro').reset();
        } else {
            msg.className = "mt-3 text-danger";
            msg.textContent = data.error || "Error al registrar";
        }
    } catch (error) {
        msg.className = "mt-3 text-danger";
        msg.textContent = "Error de conexión con el servidor";
    }
});