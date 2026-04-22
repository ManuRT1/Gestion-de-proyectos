const API_URL = 'http://localhost:3000/api/proyectos';
const RESP_URL = 'http://localhost:3000/api/responsables';
const listaProyectos = document.getElementById('listaProyectos');
const sinProyectos = document.getElementById('sinProyectos');
const formProyecto = document.getElementById('formProyecto');
const miRol = localStorage.getItem('rol'); 

window.onload = () => {
    cargarProyectos();
    cargarResponsables();
};

document.getElementById('fecha').min = new Date().toISOString().split('T')[0];

if (miRol === 'admin'){
    const btnNuevo = document.getElementById('contenedorNuevoProyecto');
    if (btnNuevo) btnNuevo.style.display = 'block';
}

formProyecto.addEventListener('submit', guardarProyecto);

async function cargarResponsables() {
    try {
        const res = await fetch(RESP_URL, { credentials: 'include' });
        const datos = await res.json();
        const select = document.getElementById('responsable');
        
        if (select) {
            select.innerHTML = '<option value="">Seleccionar responsable...</option>';
            datos.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.id;
                opt.textContent = `${r.nombre} (${r.puesto})`;
                select.appendChild(opt);
            });
        }
    } catch (error) {
        console.error(error);
    }
}

async function cargarProyectos() {
    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            credentials: 'include'
        });

        if (response.status === 401) {
            window.location.href = 'login.html';
            return;
        }

        const data = await response.json();
        mostrarProyectos(data);
    } catch (error) {
        console.error(error);
        sinProyectos.style.display = 'block';
        sinProyectos.textContent = 'Error al conectar con el servidor';
    }
}

function mostrarProyectos(proyectos) {
    listaProyectos.innerHTML = '';
    if (proyectos.length === 0) {
        sinProyectos.style.display = 'block';
        return;
    }
    sinProyectos.style.display = 'none';

    proyectos.forEach(proyecto => {
        const clasePrioridad = proyecto.prioridad === 'alta' ? 'border-danger' : 
                               proyecto.prioridad === 'media' ? 'border-warning' : 'border-success';
        
        const fechaFormateada = new Date(proyecto.fecha).toLocaleDateString('es-ES');
        const proyectoData = JSON.stringify(proyecto).replace(/'/g, "&apos;");

       
        let botonesAccion = '';
        if (miRol === 'admin'){
            botonesAccion = `
                <div>
                    <button class="btn btn-sm btn-outline-primary border-0 me-1" onclick='prepararEdicion(${proyectoData})'>
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger border-0" onclick="eliminarProyecto(${proyecto.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>`;
        }

        const proyectoHTML = `
            <div class="card ${clasePrioridad} mb-3 shadow-sm">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <h5 class="card-title">${proyecto.nombre}</h5>
                        ${botonesAccion}
                    </div>
                    <p class="card-text text-secondary">${proyecto.descripcion || 'Sin descripción'}</p>
                    <hr>
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <i class="bi bi-person-circle"></i> 
                            <small>Responsable: <strong>${proyecto.responsable_nombre || 'No asignado'}</strong></small>
                        </div>
                        <small class="text-muted"><i class="bi bi-calendar-event"></i> ${fechaFormateada}</small>
                    </div>
                </div>
            </div>
        `;
        listaProyectos.innerHTML += proyectoHTML;
    });
}

function prepararEdicion(proyecto) {
    document.querySelector('#modalProyecto .modal-title').textContent = 'Editar Proyecto';
    document.getElementById('proyectoId').value = proyecto.id;
    document.getElementById('nombre').value = proyecto.nombre;
    document.getElementById('descripcion').value = proyecto.descripcion;
    document.getElementById('fecha').value = proyecto.fecha.split('T')[0];
    document.getElementById('prioridad').value = proyecto.prioridad;
    document.getElementById('responsable').value = proyecto.responsable;

    const modalElement = document.getElementById('modalProyecto');
    const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modal.show();
}

async function eliminarProyecto(id) {
    if (!confirm('¿Estás seguro?')) return;
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (response.status === 403) {
            alert('No tienes permisos');
            return;
        }
        if (response.ok) cargarProyectos();
    } catch (error) {
        console.error(error);
    }
}

async function guardarProyecto(event) {
    event.preventDefault();
    const id = document.getElementById('proyectoId').value;
    
    const proyecto = {
        nombre: document.getElementById('nombre').value.trim(),
        descripcion: document.getElementById('descripcion').value.trim(),
        fecha: document.getElementById('fecha').value,
        prioridad: document.getElementById('prioridad').value,
        responsable: document.getElementById('responsable').value
    };

    const url = id ? `${API_URL}/${id}` : API_URL;
    const metodo = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(proyecto)
        });

        if (response.ok) {
            alert(id ? 'Actualizado' : 'Creado');
            const modalEl = document.getElementById('modalProyecto');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            
            formProyecto.reset();
            document.getElementById('proyectoId').value = '';
            document.querySelector('#modalProyecto .modal-title').textContent = 'Nuevo Proyecto';
            cargarProyectos();
        } else if (response.status === 403) {
            alert('No tienes permisos para esta acción');
        }
    } catch (error) {
        console.error(error);
    }
}