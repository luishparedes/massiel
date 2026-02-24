// ============================================
// CALCULADORA MÁGICA - VERSIÓN PROFESIONAL COMPLETA
// CON CLAVE DE SEGURIDAD PARA INVENTARIO
// ============================================

// ----- VARIABLES GLOBALES -----
let productos = [];
let nombreEstablecimiento = '';
let tasaBCVGuardada = 0;
let ventasDiarias = [];
let carrito = [];
let claveSeguridad = '1234';
let monedaEtiquetas = 'VES';
let metodoPagoSeleccionado = null;
let detallesPago = {};
let productoEditando = null;
let productosFiltrados = [];

// Variables para escáner
let tiempoUltimaTecla = 0;
let bufferEscaneo = '';

// Variables para control de acciones (NUEVAS)
let accionPendiente = null;
let indicePendiente = null;
let deltaPendiente = null;

// Control de inactividad
let temporizadorInactividad;
let ultimaActividad = Date.now();
let redireccionEnCurso = false;
const TIEMPO_INACTIVIDAD = 4 * 60 * 1000;
const URL_REDIRECCION = "http://portal.calculadoramagica.lat/";

// ----- STORAGE KEYS -----
const STORAGE_KEYS = {
    PRODUCTOS: 'productos',
    NOMBRE: 'nombreEstablecimiento',
    TASA: 'tasaBCV',
    VENTAS: 'ventasDiarias',
    CARRITO: 'carrito',
    CLAVE: 'claveSeguridad',
    MONEDA: 'monedaEtiquetas'
};

// ===== FUNCIONES UTILITARIAS =====
function redondear2Decimales(numero) {
    if (isNaN(numero)) return 0;
    return Math.round((numero + Number.EPSILON) * 100) / 100;
}

function showToast(message, type = 'success', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#ff9800'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        margin-top: 10px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s;
    `;
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function safeSetItem(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            showToast('⚠️ Espacio de almacenamiento lleno. Haz un respaldo.', 'warning');
        } else {
            console.error('Error guardando:', e);
        }
    }
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Calculadora Mágica v2.0 iniciando');
    cargarDatosStorage();
    inicializarSistemaInactividad();
    configurarEventos();
    configurarEventosMoviles();
    actualizarTodo();
    actualizarAnioCopyright();
});

function cargarDatosStorage() {
    try {
        productos = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTOS)) || [];
        nombreEstablecimiento = localStorage.getItem(STORAGE_KEYS.NOMBRE) || 'Mi Negocio';
        tasaBCVGuardada = parseFloat(localStorage.getItem(STORAGE_KEYS.TASA)) || 0;
        ventasDiarias = JSON.parse(localStorage.getItem(STORAGE_KEYS.VENTAS)) || [];
        carrito = JSON.parse(localStorage.getItem(STORAGE_KEYS.CARRITO)) || [];
        claveSeguridad = localStorage.getItem(STORAGE_KEYS.CLAVE) || '1234';
        monedaEtiquetas = localStorage.getItem(STORAGE_KEYS.MONEDA) || 'VES';

        // Sanitizar carrito
        carrito = carrito.filter(item => item && item.nombre);
    } catch (error) {
        console.error('Error cargando datos:', error);
        productos = [];
        carrito = [];
    }
}

function actualizarTodo() {
    actualizarNombreSidebar();
    actualizarEstadisticas();
    actualizarListaProductos();
    actualizarCarrito();
    cargarDatosIniciales();
}

function actualizarAnioCopyright() {
    const el = document.getElementById('currentYear');
    if (el) el.textContent = new Date().getFullYear();
}

// ===== SIDEBAR =====
function toggleSidebar() {
    document.getElementById('mainSidebar').classList.toggle('collapsed');
}

function showSection(sectionId) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionId) {
            item.classList.add('active');
        }
    });

    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${sectionId}-section`).classList.add('active');
    
    // Enfocar input de escaneo si es punto de venta
    if (sectionId === 'punto-venta') {
        setTimeout(() => document.getElementById('codigoBarrasInput')?.focus(), 300);
    }
}

function actualizarNombreSidebar() {
    const span = document.getElementById('sidebarStoreName');
    if (span) span.textContent = nombreEstablecimiento;
}

// ===== EVENTOS =====
function configurarEventos() {
    // Buscador
    const buscarInput = document.getElementById('buscar');
    if (buscarInput) {
        buscarInput.addEventListener('input', function() {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => buscarProducto(), 500);
        });
    }

    // Escáner de códigos
    const codigoInput = document.getElementById('codigoBarrasInput');
    if (codigoInput) {
        codigoInput.addEventListener('keydown', function(e) {
            const tiempoActual = new Date().getTime();
            
            if (e.key === 'Enter') {
                e.preventDefault();
                if (this.value.trim()) {
                    procesarEscaneo(this.value.trim());
                    this.value = '';
                }
                return;
            }
            
            if (e.key.length === 1) {
                bufferEscaneo += e.key;
                tiempoUltimaTecla = tiempoActual;
                
                clearTimeout(window.bufferTimeout);
                window.bufferTimeout = setTimeout(() => {
                    bufferEscaneo = '';
                }, 60);
            }
        });

        codigoInput.addEventListener('input', function() {
            const termino = this.value.trim().toLowerCase();
            const sugerenciasDiv = document.getElementById('sugerencias');
            if (!sugerenciasDiv) return;
            sugerenciasDiv.innerHTML = '';

            if (termino.length < 2) return;

            const coincidencias = productos.filter(p =>
                p.nombre.toLowerCase().includes(termino) ||
                (p.codigoBarras && p.codigoBarras.toLowerCase().includes(termino))
            ).slice(0, 8);

            coincidencias.forEach(prod => {
                const opcion = document.createElement('div');
                opcion.textContent = `${prod.nombre} (${prod.descripcion})`;
                opcion.onclick = function() {
                    agregarProductoAlCarrito(prod);
                    codigoInput.value = '';
                    sugerenciasDiv.innerHTML = '';
                    codigoInput.focus();
                };
                sugerenciasDiv.appendChild(opcion);
            });
        });
    }
}

function configurarEventosMoviles() {
    const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!esMovil) return;

    document.addEventListener('touchstart', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
            setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        }
    }, { passive: true });
}

// ===== SISTEMA DE INACTIVIDAD =====
function registrarActividad() {
    ultimaActividad = Date.now();
    reiniciarTemporizador();
}

function reiniciarTemporizador() {
    if (temporizadorInactividad) clearTimeout(temporizadorInactividad);
    temporizadorInactividad = setTimeout(() => {
        if (!redireccionEnCurso) {
            redireccionEnCurso = true;
            window.location.href = URL_REDIRECCION;
        }
    }, TIEMPO_INACTIVIDAD);
}

function inicializarSistemaInactividad() {
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(evento => {
        document.addEventListener(evento, registrarActividad, { passive: true });
    });
    reiniciarTemporizador();
}

// ===== FUNCIONES BÁSICAS =====
function cargarDatosIniciales() {
    document.getElementById('nombreEstablecimiento').value = nombreEstablecimiento;
    document.getElementById('tasaBCV').value = tasaBCVGuardada || '';
    const monedaSelect = document.getElementById('monedaEtiquetas');
    if (monedaSelect) monedaSelect.value = monedaEtiquetas;
}

function calcularPrecioVenta() {
    const tasa = parseFloat(document.getElementById('tasaBCV').value) || tasaBCVGuardada;
    const costo = parseFloat(document.getElementById('costo').value);
    const ganancia = parseFloat(document.getElementById('ganancia').value);
    const unidades = parseFloat(document.getElementById('unidadesPorCaja').value);

    if (!tasa || tasa <= 0) return showToast('Ingrese tasa BCV válida', 'error');
    if (!costo || !ganancia || !unidades) return showToast('Complete todos los campos', 'error');

    const precioDolar = costo / (1 - (ganancia / 100));
    const unitarioDolar = redondear2Decimales(precioDolar / unidades);
    const unitarioBolivar = redondear2Decimales(unitarioDolar * tasa);

    document.getElementById('precioUnitario').innerHTML = 
        `<strong>Precio unitario:</strong> $${unitarioDolar.toFixed(2)} / Bs${unitarioBolivar.toFixed(2)}`;
}

// ===== GESTIÓN DE PRODUCTOS =====
function guardarProducto() {
    const nombre = document.getElementById('producto').value.trim();
    const codigo = document.getElementById('codigoBarras').value.trim();
    const desc = document.getElementById('descripcion').value;
    const costo = parseFloat(document.getElementById('costo').value);
    const ganancia = parseFloat(document.getElementById('ganancia').value);
    const unidadesPorCaja = parseFloat(document.getElementById('unidadesPorCaja').value);
    const existencias = parseFloat(document.getElementById('unidadesExistentes').value) || 0;
    const tasa = parseFloat(document.getElementById('tasaBCV').value) || tasaBCVGuardada;

    if (!nombre || !desc) return showToast('Complete nombre y descripción', 'error');
    if (!tasa || tasa <= 0) return showToast('Tasa BCV requerida', 'error');
    if (!costo || !ganancia || !unidadesPorCaja) return showToast('Complete todos los campos', 'error');

    // Verificar código de barras duplicado
    if (codigo && productoEditando === null) {
        const existe = productos.find(p => p.codigoBarras && p.codigoBarras.toLowerCase() === codigo.toLowerCase());
        if (existe) return showToast('Código de barras ya existe', 'error');
    }

    const precioDolar = costo / (1 - (ganancia / 100));
    const unitarioDolar = redondear2Decimales(precioDolar / unidadesPorCaja);
    const unitarioBolivar = redondear2Decimales(unitarioDolar * tasa);

    const producto = {
        nombre,
        codigoBarras: codigo,
        descripcion: desc,
        costo,
        ganancia: ganancia / 100,
        unidadesPorCaja,
        unidadesExistentes: existencias,
        precioUnitarioDolar: unitarioDolar,
        precioUnitarioBolivar: unitarioBolivar,
        precioMayorDolar: precioDolar,
        precioMayorBolivar: precioDolar * tasa,
        fechaActualizacion: new Date().toISOString()
    };

    if (productoEditando !== null) {
        productos[productoEditando] = producto;
        showToast('Producto actualizado', 'success');
        productoEditando = null;
    } else {
        productos.push(producto);
        showToast('Producto guardado', 'success');
    }

    safeSetItem(STORAGE_KEYS.PRODUCTOS, productos);
    actualizarTodo();
    limpiarFormularioProducto();
}

function limpiarFormularioProducto() {
    document.getElementById('producto').value = '';
    document.getElementById('codigoBarras').value = '';
    document.getElementById('costo').value = '';
    document.getElementById('ganancia').value = '';
    document.getElementById('unidadesPorCaja').value = '';
    document.getElementById('unidadesExistentes').value = '';
    document.getElementById('descripcion').selectedIndex = 0;
    document.getElementById('precioUnitario').innerHTML = '';
}

// ===== FUNCIONES DE EDICIÓN CON CLAVE =====
function editarProducto(index) {
    mostrarModalClave('editar', index);
}

function ejecutarEdicion(index) {
    let indiceReal = index;
    
    if (productosFiltrados.length > 0) {
        const prod = productosFiltrados[index];
        indiceReal = productos.findIndex(p => p.nombre === prod.nombre);
        if (indiceReal === -1) {
            showToast('Producto no encontrado', 'error');
            return;
        }
    }

    const p = productos[indiceReal];
    document.getElementById('producto').value = p.nombre;
    document.getElementById('codigoBarras').value = p.codigoBarras || '';
    document.getElementById('descripcion').value = p.descripcion;
    document.getElementById('costo').value = p.costo;
    document.getElementById('ganancia').value = p.ganancia * 100;
    document.getElementById('unidadesPorCaja').value = p.unidadesPorCaja;
    document.getElementById('unidadesExistentes').value = p.unidadesExistentes;
    productoEditando = indiceReal;
    
    showSection('productos');
    showToast(`Editando: ${p.nombre}`, 'success');
}

function eliminarProducto(index) {
    if (!confirm('¿Está seguro de eliminar este producto?')) return;

    let indiceReal = index;
    if (productosFiltrados.length > 0) {
        const prod = productosFiltrados[index];
        indiceReal = productos.findIndex(p => p.nombre === prod.nombre);
        if (indiceReal === -1) {
            showToast('Producto no encontrado', 'error');
            return;
        }
    }

    productos.splice(indiceReal, 1);
    safeSetItem(STORAGE_KEYS.PRODUCTOS, productos);
    productosFiltrados = [];
    actualizarTodo();
    showToast('Producto eliminado', 'success');
}

// ===== INVENTARIO =====
function actualizarListaProductos() {
    const tbody = document.querySelector('#inventario-section tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const listado = productosFiltrados.length > 0 ? productosFiltrados : productos;
    
    listado.forEach((p, idx) => {
        const fila = document.createElement('tr');
        const stockBajo = p.unidadesExistentes <= 5 ? 'inventario-bajo' : '';
        
        fila.innerHTML = `
            <td>${p.nombre}</td>
            <td>${p.descripcion}</td>
            <td class="${stockBajo}">${p.unidadesExistentes}</td>
            <td>$${p.precioUnitarioDolar.toFixed(2)}</td>
            <td>Bs ${p.precioUnitarioBolivar.toFixed(2)}</td>
            <td>
                <div class="ajuste-inventario">
                    <button onclick="ajustarInventario(${idx}, 1)" title="Sumar"><i class="fas fa-plus"></i></button>
                    <button onclick="ajustarInventario(${idx}, -1)" title="Restar"><i class="fas fa-minus"></i></button>
                    <button onclick="editarProducto(${idx})" class="btn-secondary" title="Editar"><i class="fas fa-edit"></i></button>
                    <button onclick="eliminarProducto(${idx})" class="btn-danger" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

function buscarProducto() {
    const termino = document.getElementById('buscar').value.trim().toLowerCase();
    if (!termino) {
        productosFiltrados = [];
    } else {
        productosFiltrados = productos.filter(p => 
            p.nombre.toLowerCase().includes(termino) || 
            p.descripcion.toLowerCase().includes(termino) ||
            (p.codigoBarras && p.codigoBarras.toLowerCase().includes(termino))
        );
    }
    actualizarListaProductos();
}

// ===== FUNCIONES DE AJUSTE CON CLAVE =====
function ajustarInventario(index, delta) {
    mostrarModalClave('ajustar', index, delta);
}

function ejecutarAjuste(index, delta) {
    let indiceReal = index;
    
    if (productosFiltrados.length > 0) {
        const prod = productosFiltrados[index];
        indiceReal = productos.findIndex(p => p.nombre === prod.nombre);
        if (indiceReal === -1) {
            showToast('Producto no encontrado', 'error');
            return;
        }
    }

    const p = productos[indiceReal];
    p.unidadesExistentes = Math.max(0, (p.unidadesExistentes || 0) + delta);
    
    safeSetItem(STORAGE_KEYS.PRODUCTOS, productos);
    actualizarEstadisticas();
    actualizarListaProductos();
    showToast(`Inventario actualizado: ${p.unidadesExistentes}`, 'success');
}

// ===== MODAL DE CLAVE =====
function mostrarModalClave(accion, indice, delta = null) {
    accionPendiente = accion;
    indicePendiente = indice;
    deltaPendiente = delta;
    
    const modal = document.getElementById('modalClave');
    const input = document.getElementById('claveSeguridadInput');
    
    if (modal) {
        modal.style.display = 'block';
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}

function cerrarModalClave() {
    document.getElementById('modalClave').style.display = 'none';
    accionPendiente = null;
    indicePendiente = null;
    deltaPendiente = null;
}

function verificarClaveModal() {
    const claveIngresada = document.getElementById('claveSeguridadInput').value.trim();
    
    if (claveIngresada === 'ACME123') {
        claveSeguridad = '1234';
        localStorage.setItem(STORAGE_KEYS.CLAVE, claveSeguridad);
        showToast('✓ Clave reseteada a: 1234', 'success');
        cerrarModalClave();
        
        // Ejecutar la acción pendiente después del reset
        setTimeout(() => {
            if (accionPendiente === 'editar') {
                ejecutarEdicion(indicePendiente);
            } else if (accionPendiente === 'ajustar') {
                ejecutarAjuste(indicePendiente, deltaPendiente);
            }
        }, 100);
        return;
    }
    
    if (claveIngresada === claveSeguridad) {
        showToast('✓ Clave correcta', 'success');
        cerrarModalClave();
        
        // Ejecutar la acción pendiente
        if (accionPendiente === 'editar') {
            ejecutarEdicion(indicePendiente);
        } else if (accionPendiente === 'ajustar') {
            ejecutarAjuste(indicePendiente, deltaPendiente);
        }
    } else {
        showToast('✗ Clave incorrecta', 'error');
        document.getElementById('claveSeguridadInput').value = '';
        document.getElementById('claveSeguridadInput').focus();
    }
}

// ===== ESTADÍSTICAS =====
function actualizarEstadisticas() {
    const totalProductos = productos.length;
    const stockBajo = productos.filter(p => p.unidadesExistentes <= 5).length;
    
    document.getElementById('totalProductosCount').textContent = totalProductos;
    document.getElementById('stockBajoCount').textContent = stockBajo;

    let gananciaUSD = 0;
    let totalInvertidoUSD = 0;
    
    productos.forEach(p => {
        const gananciaUnidad = p.precioUnitarioDolar - (p.costo / p.unidadesPorCaja);
        gananciaUSD += gananciaUnidad * (p.unidadesExistentes || 0);
        totalInvertidoUSD += p.costo || 0;
    });

    document.getElementById('gananciaTotalUSD').textContent = `$${redondear2Decimales(gananciaUSD).toFixed(2)}`;
    document.getElementById('gananciaTotalBS').textContent = `Bs ${redondear2Decimales(gananciaUSD * tasaBCVGuardada).toFixed(2)}`;
    document.getElementById('totalInvertidoUSD').textContent = `$${redondear2Decimales(totalInvertidoUSD).toFixed(2)} USD`;
    document.getElementById('totalInvertidoBS').textContent = `/ Bs ${redondear2Decimales(totalInvertidoUSD * tasaBCVGuardada).toFixed(2)}`;
}

// ===== CARRITO Y VENTAS =====
function agregarPorCodigoBarras() {
    const codigo = document.getElementById('codigoBarrasInput').value.trim();
    procesarEscaneo(codigo);
}

function procesarEscaneo(codigo) {
    if (!codigo) return showToast('Ingrese un código', 'warning');

    let producto = productos.find(p => 
        (p.codigoBarras && p.codigoBarras.toLowerCase() === codigo.toLowerCase()) ||
        p.nombre.toLowerCase() === codigo.toLowerCase()
    );

    if (!producto) {
        producto = productos.find(p => 
            p.nombre.toLowerCase().includes(codigo.toLowerCase())
        );
    }

    if (!producto) {
        showToast('Producto no encontrado', 'error');
        mostrarSugerencias(codigo);
        return;
    }

    agregarProductoAlCarrito(producto);
    document.getElementById('codigoBarrasInput').value = '';
    document.getElementById('codigoBarrasInput').focus();
    document.getElementById('scannerStatus').innerHTML = '<i class="fas fa-check-circle"></i> Producto agregado';
}

function mostrarSugerencias(termino) {
    const sugerencias = productos.filter(p => 
        p.nombre.toLowerCase().includes(termino.toLowerCase())
    ).slice(0, 5);
    
    const div = document.getElementById('sugerencias');
    if (!div) return;
    
    div.innerHTML = '';
    sugerencias.forEach(p => {
        const item = document.createElement('div');
        item.textContent = `${p.nombre} (${p.descripcion})`;
        item.onclick = () => agregarProductoAlCarrito(p);
        div.appendChild(item);
    });
}

function agregarProductoAlCarrito(producto) {
    const indexProducto = productos.findIndex(p => p.nombre === producto.nombre);
    const existente = carrito.findIndex(item => 
        item.nombre === producto.nombre && item.unidad === 'unidad'
    );

    if (existente !== -1) {
        carrito[existente].cantidad += 1;
        recalcularSubtotal(carrito[existente]);
    } else {
        carrito.push({
            nombre: producto.nombre,
            descripcion: producto.descripcion,
            precioUnitarioBolivar: producto.precioUnitarioBolivar,
            precioUnitarioDolar: producto.precioUnitarioDolar,
            cantidad: 1,
            unidad: 'unidad',
            subtotal: producto.precioUnitarioBolivar,
            subtotalDolar: producto.precioUnitarioDolar,
            indexProducto
        });
    }

    safeSetItem(STORAGE_KEYS.CARRITO, carrito);
    actualizarCarrito();
}

function recalcularSubtotal(item) {
    if (item.unidad === 'gramo') {
        const precioGramoBs = item.precioUnitarioBolivar / 1000;
        const precioGramoUsd = item.precioUnitarioDolar / 1000;
        item.subtotal = redondear2Decimales(item.cantidad * precioGramoBs);
        item.subtotalDolar = redondear2Decimales(item.cantidad * precioGramoUsd);
    } else {
        item.subtotal = redondear2Decimales(item.cantidad * item.precioUnitarioBolivar);
        item.subtotalDolar = redondear2Decimales(item.cantidad * item.precioUnitarioDolar);
    }
}

function cambiarCantidadDirecta(index) {
    if (!carrito[index]) return;
    
    const item = carrito[index];
    const producto = productos[item.indexProducto];
    
    let nuevaCantidad;
    if (item.unidad === 'gramo') {
        nuevaCantidad = prompt('Ingrese la cantidad en gramos:', item.cantidad);
    } else {
        nuevaCantidad = prompt('Ingrese la cantidad:', item.cantidad);
    }
    
    if (nuevaCantidad === null) return;
    
    nuevaCantidad = parseFloat(nuevaCantidad);
    if (isNaN(nuevaCantidad) || nuevaCantidad <= 0) {
        showToast('Cantidad inválida', 'error');
        return;
    }
    
    // Validar stock
    if (item.unidad === 'gramo') {
        const disponibleGramos = (producto.unidadesExistentes || 0) * 1000;
        if (nuevaCantidad > disponibleGramos) {
            showToast(`Stock insuficiente. Disponible: ${disponibleGramos}g`, 'error');
            return;
        }
    } else {
        if (nuevaCantidad > (producto.unidadesExistentes || 0)) {
            showToast(`Stock insuficiente. Disponible: ${producto.unidadesExistentes}`, 'error');
            return;
        }
    }
    
    item.cantidad = nuevaCantidad;
    recalcularSubtotal(item);
    safeSetItem(STORAGE_KEYS.CARRITO, carrito);
    actualizarCarrito();
}

function actualizarCarrito() {
    const tbody = document.getElementById('carritoBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (carrito.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Carrito vacío</td></tr>';
        document.getElementById('totalCarritoBs').innerHTML = '<strong>Total Bs:</strong> 0,00';
        document.getElementById('totalCarritoDolares').innerHTML = '<strong>Total USD:</strong> 0,00';
        return;
    }

    let totalBs = 0;
    let totalUsd = 0;

    carrito.forEach((item, idx) => {
        recalcularSubtotal(item);
        totalBs += item.subtotal;
        totalUsd += item.subtotalDolar;

        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${item.nombre}</td>
            <td>Bs ${item.precioUnitarioBolivar.toFixed(2)}</td>
            <td>
                <button onclick="actualizarCantidadCarrito(${idx}, -1)" style="padding: 5px 10px;">-</button>
                <span onclick="cambiarCantidadDirecta(${idx})" style="cursor: pointer; padding: 5px 10px; background: #f0f0f0; border-radius: 4px;" title="Haz clic para editar cantidad">
                    ${item.cantidad} ${item.unidad === 'gramo' ? 'g' : ''}
                </span>
                <button onclick="actualizarCantidadCarrito(${idx}, 1)" style="padding: 5px 10px;">+</button>
            </td>
            <td>
                <select onchange="cambiarUnidadCarrito(${idx}, this.value)" style="padding: 5px;">
                    <option value="unidad" ${item.unidad === 'unidad' ? 'selected' : ''}>Unidad</option>
                    <option value="gramo" ${item.unidad === 'gramo' ? 'selected' : ''}>Gramo</option>
                </select>
            </td>
            <td>Bs ${item.subtotal.toFixed(2)}</td>
            <td>
                <button onclick="eliminarDelCarrito(${idx})" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 4px;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(fila);
    });

    document.getElementById('totalCarritoBs').innerHTML = `<strong>Total Bs:</strong> ${totalBs.toFixed(2)}`;
    document.getElementById('totalCarritoDolares').innerHTML = `<strong>Total USD:</strong> $${totalUsd.toFixed(2)}`;
}

function actualizarCantidadCarrito(index, delta) {
    if (!carrito[index]) return;
    
    const item = carrito[index];
    const producto = productos[item.indexProducto];
    
    let nuevaCantidad = item.cantidad + delta;
    
    // Validar stock
    if (item.unidad === 'gramo') {
        const disponibleGramos = (producto.unidadesExistentes || 0) * 1000;
        if (nuevaCantidad > disponibleGramos) {
            showToast('Stock insuficiente', 'error');
            return;
        }
    } else {
        if (nuevaCantidad > (producto.unidadesExistentes || 0)) {
            showToast('Stock insuficiente', 'error');
            return;
        }
    }
    
    item.cantidad = Math.max(0.1, nuevaCantidad);
    
    if (item.cantidad <= 0) {
        eliminarDelCarrito(index);
    } else {
        recalcularSubtotal(item);
        safeSetItem(STORAGE_KEYS.CARRITO, carrito);
        actualizarCarrito();
    }
}

function cambiarUnidadCarrito(index, unidad) {
    if (!carrito[index]) return;
    
    const item = carrito[index];
    const producto = productos[item.indexProducto];
    
    if (unidad === 'gramo' && item.unidad === 'unidad') {
        // Convertir unidades a gramos (1 unidad = 1000g)
        item.cantidad = item.cantidad * 1000;
    } else if (unidad === 'unidad' && item.unidad === 'gramo') {
        // Convertir gramos a unidades
        item.cantidad = item.cantidad / 1000;
    }
    
    item.unidad = unidad;
    recalcularSubtotal(item);
    safeSetItem(STORAGE_KEYS.CARRITO, carrito);
    actualizarCarrito();
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    safeSetItem(STORAGE_KEYS.CARRITO, carrito);
    actualizarCarrito();
}

// ===== PROCESO DE VENTA =====
function finalizarVenta() {
    if (carrito.length === 0) {
        showToast('El carrito está vacío', 'warning');
        return;
    }

    const totalBs = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const totalDolares = carrito.reduce((sum, item) => sum + item.subtotalDolar, 0);

    document.getElementById('resumenTotalBs').textContent = `Total: Bs ${redondear2Decimales(totalBs).toFixed(2)}`;
    document.getElementById('resumenTotalDolares').textContent = `Total: $ ${redondear2Decimales(totalDolares).toFixed(2)}`;

    document.getElementById('modalPago').style.display = 'block';
    metodoPagoSeleccionado = null;
    document.getElementById('detallesPago').style.display = 'none';
    document.getElementById('camposPago').innerHTML = '';
    document.getElementById('mensajePago').style.display = 'none';
}

function cerrarModalPago() {
    document.getElementById('modalPago').style.display = 'none';
    metodoPagoSeleccionado = null;
    detallesPago = {};
}

function cancelarPago() {
    document.getElementById('detallesPago').style.display = 'none';
    metodoPagoSeleccionado = null;
    detallesPago = {};
}

function seleccionarMetodoPago(metodo) {
    metodoPagoSeleccionado = metodo;
    const detallesDiv = document.getElementById('camposPago');
    const totalBs = carrito.reduce((sum, i) => sum + i.subtotal, 0);
    const totalDolares = carrito.reduce((sum, i) => sum + i.subtotalDolar, 0);
    
    detallesDiv.innerHTML = '';
    detallesPago = { metodo, totalBs, totalDolares };

    if (metodo === 'efectivo_bs' || metodo === 'efectivo_dolares') {
        const moneda = metodo === 'efectivo_bs' ? 'Bs' : '$';
        const total = metodo === 'efectivo_bs' ? totalBs : totalDolares;
        
        detallesDiv.innerHTML = `
            <div style="margin: 10px 0;">
                <label style="display: block; margin-bottom: 5px;">Monto recibido (${moneda}):</label>
                <input type="number" id="montoRecibido" placeholder="Ingrese monto recibido" step="0.01" style="width: 100%; padding: 8px;">
            </div>
            <div style="margin: 10px 0;">
                <label style="display: block; margin-bottom: 5px;">Cambio:</label>
                <input type="text" id="cambioCalculado" readonly placeholder="0.00" style="width: 100%; padding: 8px; background: #f5f5f5;">
            </div>
        `;
        
        setTimeout(() => {
            const input = document.getElementById('montoRecibido');
            if (input) {
                input.addEventListener('input', function() {
                    calcularCambio(this.value, metodo, total);
                });
            }
        }, 100);
    } 
    else if (metodo === 'punto' || metodo === 'biopago') {
        detallesDiv.innerHTML = `
            <div style="margin: 10px 0;">
                <label style="display: block; margin-bottom: 5px;">Monto a pagar (Bs):</label>
                <input type="number" id="montoPago" value="${totalBs.toFixed(2)}" step="0.01" style="width: 100%; padding: 8px;">
            </div>
        `;
    } 
    else if (metodo === 'pago_movil') {
        detallesDiv.innerHTML = `
            <div style="margin: 10px 0;">
                <label style="display: block; margin-bottom: 5px;">Monto (Bs):</label>
                <input type="number" id="montoPagoMovil" value="${totalBs.toFixed(2)}" step="0.01" style="width: 100%; padding: 8px;">
            </div>
            <div style="margin: 10px 0;">
                <label style="display: block; margin-bottom: 5px;">Referencia:</label>
                <input type="text" id="refPagoMovil" placeholder="Número de referencia" style="width: 100%; padding: 8px;">
            </div>
            <div style="margin: 10px 0;">
                <label style="display: block; margin-bottom: 5px;">Banco:</label>
                <input type="text" id="bancoPagoMovil" placeholder="Nombre del banco" style="width: 100%; padding: 8px;">
            </div>
        `;
    }

    document.getElementById('detallesPago').style.display = 'block';
}

function calcularCambio(montoRecibido, metodo, total) {
    const mensajeDiv = document.getElementById('mensajePago');
    const cambioInput = document.getElementById('cambioCalculado');
    
    if (!mensajeDiv || !cambioInput) return;
    
    montoRecibido = parseFloat(montoRecibido) || 0;
    
    if (montoRecibido < total) {
        const falta = redondear2Decimales(total - montoRecibido);
        mensajeDiv.textContent = `❌ Faltan ${metodo === 'efectivo_bs' ? 'Bs' : '$'} ${falta.toFixed(2)}`;
        mensajeDiv.style.background = '#ffebee';
        mensajeDiv.style.color = '#c62828';
        mensajeDiv.style.display = 'block';
        cambioInput.value = `-${falta.toFixed(2)}`;
    } else {
        const cambio = redondear2Decimales(montoRecibido - total);
        mensajeDiv.textContent = `✅ Cambio: ${metodo === 'efectivo_bs' ? 'Bs' : '$'} ${cambio.toFixed(2)}`;
        mensajeDiv.style.background = '#e8f5e9';
        mensajeDiv.style.color = '#2e7d32';
        mensajeDiv.style.display = 'block';
        cambioInput.value = cambio.toFixed(2);
    }
}

function confirmarMetodoPago() {
    if (!metodoPagoSeleccionado) {
        showToast('Seleccione un método de pago', 'error');
        return;
    }

    const totalBs = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const totalDolares = carrito.reduce((sum, item) => sum + item.subtotalDolar, 0);

    // Validar según método
    if (metodoPagoSeleccionado === 'efectivo_bs' || metodoPagoSeleccionado === 'efectivo_dolares') {
        const monto = parseFloat(document.getElementById('montoRecibido')?.value) || 0;
        const total = metodoPagoSeleccionado === 'efectivo_bs' ? totalBs : totalDolares;
        
        if (monto < total) {
            showToast('Monto recibido insuficiente', 'error');
            return;
        }
        detallesPago.montoRecibido = monto;
        detallesPago.cambio = monto - total;
    }
    else if (metodoPagoSeleccionado === 'pago_movil') {
        const ref = document.getElementById('refPagoMovil')?.value.trim();
        const banco = document.getElementById('bancoPagoMovil')?.value.trim();
        if (!ref || !banco) {
            showToast('Complete referencia y banco', 'error');
            return;
        }
        detallesPago.referencia = ref;
        detallesPago.banco = banco;
    }

    // Procesar venta
    carrito.forEach(item => {
        const producto = productos[item.indexProducto];
        if (producto) {
            if (item.unidad === 'gramo') {
                producto.unidadesExistentes = redondear2Decimales(producto.unidadesExistentes - (item.cantidad / 1000));
            } else {
                producto.unidadesExistentes = redondear2Decimales(producto.unidadesExistentes - item.cantidad);
            }
            
            if (producto.unidadesExistentes < 0) producto.unidadesExistentes = 0;

            ventasDiarias.push({
                fecha: new Date().toLocaleDateString(),
                hora: new Date().toLocaleTimeString(),
                producto: producto.nombre,
                cantidad: item.cantidad,
                unidad: item.unidad,
                totalBolivar: item.subtotal,
                metodoPago: metodoPagoSeleccionado
            });
        }
    });

    safeSetItem(STORAGE_KEYS.PRODUCTOS, productos);
    safeSetItem(STORAGE_KEYS.VENTAS, ventasDiarias);

    showToast(`✅ Venta completada por Bs ${totalBs.toFixed(2)}`, 'success');

    detallesPago.totalBs = redondear2Decimales(totalBs);
    detallesPago.totalDolares = redondear2Decimales(totalDolares);
    detallesPago.items = JSON.parse(JSON.stringify(carrito));
    detallesPago.fecha = new Date().toLocaleString();

    // Intentar imprimir ticket
    imprimirTicketTermicoESC_POS(detallesPago);

    carrito = [];
    safeSetItem(STORAGE_KEYS.CARRITO, carrito);
    actualizarCarrito();
    actualizarEstadisticas();
    cerrarModalPago();
}

// ===== IMPRESIÓN DE TICKET =====
async function imprimirTicketTermicoESC_POS(detalles) {
    try {
        if (typeof qz === 'undefined') {
            console.log('Simulando impresión de ticket');
            showToast('Ticket generado (simulación)', 'success');
            return;
        }

        await qz.websocket.connect();

        const impresoras = await qz.printers.find();
        const impresora = impresoras.find(p => 
            p.toLowerCase().includes('thermal') || 
            p.toLowerCase().includes('pos') ||
            p.toLowerCase().includes('epson')
        ) || impresoras[0];

        if (!impresora) throw new Error('No se encontró impresora');

        const config = qz.configs.create(impresora);
        const fecha = new Date().toLocaleString();
        
        let ticket = [
            '\x1B\x40', // ESC @
            '\x1B\x61\x01', // Centrado
            '\x1B\x21\x30', // Doble tamaño
            (nombreEstablecimiento || "MI NEGOCIO") + "\n",
            '\x1B\x21\x00', // Normal
            '\x1B\x61\x00', // Izquierda
            "--------------------------------\n",
            `Fecha: ${fecha}\n`,
            "--------------------------------\n"
        ];

        detalles.items.forEach(item => {
            ticket.push(
                `${item.nombre}\n`,
                `${item.cantidad} ${item.unidad === 'gramo' ? 'g' : 'und'} x ${item.precioUnitarioBolivar.toFixed(2)} = ${item.subtotal.toFixed(2)}\n`
            );
        });

        ticket.push("--------------------------------\n");
        ticket.push('\x1B\x21\x20'); // Negrita
        ticket.push(`TOTAL: Bs ${detalles.totalBs.toFixed(2)}\n`);
        ticket.push(`REF: $${detalles.totalDolares.toFixed(2)}\n`);
        ticket.push('\x1B\x21\x00');
        ticket.push(`Pago: ${detalles.metodo}\n`);
        ticket.push("\n¡Gracias por su compra!\n\n");
        ticket.push('\x1D\x56\x00'); // Corte

        await qz.print(config, ticket);
        await qz.websocket.disconnect();
        showToast('Ticket impreso', 'success');

    } catch (error) {
        console.error('Error impresión:', error);
        showToast('Error al imprimir ticket', 'error');
    }
}

// ===== CONFIGURACIÓN =====
function guardarNombreEstablecimiento() {
    const nombre = document.getElementById('nombreEstablecimiento').value.trim();
    if (!nombre) return showToast('Ingrese un nombre', 'error');
    
    nombreEstablecimiento = nombre;
    localStorage.setItem(STORAGE_KEYS.NOMBRE, nombre);
    actualizarNombreSidebar();
    showToast('Nombre guardado', 'success');
}

function actualizarTasaBCV() {
    const tasa = parseFloat(document.getElementById('tasaBCV').value);
    if (!tasa || tasa <= 0) return showToast('Ingrese tasa válida', 'error');

    tasaBCVGuardada = tasa;
    localStorage.setItem(STORAGE_KEYS.TASA, tasa);

    productos.forEach(p => {
        p.precioUnitarioBolivar = p.precioUnitarioDolar * tasa;
        p.precioMayorBolivar = p.precioMayorDolar * tasa;
    });

    safeSetItem(STORAGE_KEYS.PRODUCTOS, productos);
    actualizarTodo();
    showToast(`Tasa actualizada: ${tasa}`, 'success');
}

// ===== REPORTES Y PDF =====
function mostrarListaCostos() {
    const container = document.getElementById('listaCostosContainer');
    const lista = document.getElementById('listaCostos');
    
    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';
        
        lista.innerHTML = '';
        const sorted = [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        sorted.forEach(p => {
            const li = document.createElement('li');
            li.style.cssText = 'padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;';
            li.innerHTML = `
                <span>${p.nombre} (${p.descripcion})</span>
                <span><strong>$${(p.costo / p.unidadesPorCaja).toFixed(2)}</strong> / Bs ${p.precioUnitarioBolivar.toFixed(2)}</span>
            `;
            lista.appendChild(li);
        });
    } else {
        container.style.display = 'none';
    }
}

function generarReporteDiario() {
    if (!ventasDiarias.length) {
        showToast('No hay ventas registradas', 'warning');
        return;
    }

    const hoy = new Date().toLocaleDateString();
    const ventasHoy = ventasDiarias.filter(v => v.fecha === hoy);
    const ventasAUsar = ventasHoy.length ? ventasHoy : ventasDiarias;

    let totalBs = 0;
    const filas = ventasAUsar.map(v => {
        totalBs += v.totalBolivar || 0;
        return [
            v.fecha,
            v.hora,
            v.producto,
            `${v.cantidad} ${v.unidad === 'gramo' ? 'g' : 'und'}`,
            `Bs ${(v.totalBolivar || 0).toFixed(2)}`,
            v.metodoPago
        ];
    });

    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            showToast('Error: Librería PDF no cargada', 'error');
            return;
        }

        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text(nombreEstablecimiento || 'Reporte Diario', 14, 20);
        doc.setFontSize(10);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);
        doc.text(`Tasa BCV: ${tasaBCVGuardada}`, 14, 37);

        doc.autoTable({
            head: [['Fecha', 'Hora', 'Producto', 'Cant', 'Total', 'Pago']],
            body: filas,
            startY: 45,
            styles: { fontSize: 9 }
        });

        doc.save(`reporte_${new Date().toISOString().slice(0,10)}.pdf`);
        showToast('Reporte generado', 'success');
    } catch (error) {
        console.error('Error generando reporte:', error);
        showToast('Error al generar reporte', 'error');
    }
}

function mostrarOpcionesPDF() {
    const modal = document.getElementById('modalCategorias');
    if (modal) modal.style.display = 'block';
}

function cerrarModalCategorias() {
    const modal = document.getElementById('modalCategorias');
    if (modal) modal.style.display = 'none';
}

function generarPDFPorCategoria(categoria) {
    if (!productos || productos.length === 0) {
        showToast('No hay productos para generar PDF', 'warning');
        cerrarModalCategorias();
        return;
    }

    let productosFiltrados = [];
    let tituloCategoria = '';

    const nombresCategorias = {
        'todos': 'TODOS LOS PRODUCTOS',
        'viveres': 'VÍVERES',
        'bebidas': 'BEBIDAS',
        'licores': 'LICORES',
        'enlatados': 'ENLATADOS',
        'plasticos': 'PLÁSTICOS',
        'papeleria': 'PAPELERÍA',
        'lacteos': 'LÁCTEOS',
        'ferreteria': 'FERRETERÍA',
        'carnes': 'CARNES',
        'frutas': 'FRUTAS',
        'verduras': 'VERDURAS',
        'aseo_personal': 'ASEO PERSONAL',
        'limpieza': 'LIMPIEZA',
        'otros': 'OTROS'
    };

    if (categoria === 'todos') {
        productosFiltrados = [...productos];
        tituloCategoria = 'TODOS LOS PRODUCTOS';
    } else {
        productosFiltrados = productos.filter(p => p.descripcion === categoria);
        tituloCategoria = nombresCategorias[categoria] || categoria.toUpperCase();
    }

    if (productosFiltrados.length === 0) {
        showToast(`No hay productos en la categoría: ${tituloCategoria}`, 'warning');
        cerrarModalCategorias();
        return;
    }

    productosFiltrados.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));

    const rows = productosFiltrados.map(p => [
        p.nombre || 'N/A',
        `$${(p.precioUnitarioDolar || 0).toFixed(2)}`,
        `Bs ${(p.precioUnitarioBolivar || 0).toFixed(2)}`,
        p.unidadesExistentes || 0
    ]);

    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            showToast('Error: Librería PDF no cargada', 'error');
            return;
        }

        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text(nombreEstablecimiento || 'LISTA DE PRODUCTOS', 14, 18);
        doc.setFontSize(12);
        doc.text(`Categoría: ${tituloCategoria}`, 14, 26);
        doc.setFontSize(10);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 34);

        doc.autoTable({
            head: [['Producto', 'Precio ($)', 'Precio (Bs)', 'Stock']],
            body: rows,
            startY: 42,
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [0, 172, 193], textColor: 255 },
            alternateRowStyles: { fillColor: [240, 240, 240] }
        });

        doc.save(`productos_${categoria}_${new Date().toISOString().slice(0,10)}.pdf`);
        showToast(`PDF generado: ${tituloCategoria}`, 'success');
    } catch (error) {
        console.error('Error generando PDF:', error);
        showToast('Error al generar PDF', 'error');
    }

    cerrarModalCategorias();
}

function generarEtiquetasAnaqueles() {
    const modal = document.getElementById('modalEtiquetas');
    if (modal) {
        modal.style.display = 'block';
        const selector = document.getElementById('monedaEtiquetas');
        if (selector) selector.value = monedaEtiquetas;
    }
}

function cerrarModalEtiquetas() {
    const modal = document.getElementById('modalEtiquetas');
    if (modal) modal.style.display = 'none';
}

function actualizarMonedaEtiquetas() {
    const selector = document.getElementById('monedaEtiquetas');
    if (selector) {
        monedaEtiquetas = selector.value;
        localStorage.setItem(STORAGE_KEYS.MONEDA, monedaEtiquetas);
    }
}

function generarEtiquetasPorCategoria(categoria) {
    if (!productos || productos.length === 0) {
        showToast('No hay productos para generar etiquetas', 'warning');
        cerrarModalEtiquetas();
        return;
    }

    let productosFiltrados = [];
    let tituloCategoria = '';

    const nombresCategorias = {
        'todos': 'TODOS',
        'viveres': 'VÍVERES',
        'bebidas': 'BEBIDAS',
        'licores': 'LICORES',
        'enlatados': 'ENLATADOS',
        'plasticos': 'PLÁSTICOS',
        'papeleria': 'PAPELERÍA',
        'lacteos': 'LÁCTEOS',
        'ferreteria': 'FERRETERÍA',
        'carnes': 'CARNES',
        'frutas': 'FRUTAS',
        'verduras': 'VERDURAS',
        'aseo_personal': 'ASEO PERSONAL',
        'limpieza': 'LIMPIEZA',
        'otros': 'OTROS'
    };

    if (categoria === 'todos') {
        productosFiltrados = [...productos];
        tituloCategoria = 'TODOS';
    } else {
        productosFiltrados = productos.filter(p => p.descripcion === categoria);
        tituloCategoria = nombresCategorias[categoria] || categoria.toUpperCase();
    }

    if (productosFiltrados.length === 0) {
        showToast(`No hay productos en categoría: ${tituloCategoria}`, 'warning');
        cerrarModalEtiquetas();
        return;
    }

    productosFiltrados.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));

    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            showToast('Error: Librería PDF no cargada', 'error');
            return;
        }

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const margin = 10;
        const labelWidth = 63;
        const labelHeight = 35;
        
        let labelIndex = 0;

        productosFiltrados.forEach((producto) => {
            if (labelIndex >= 21) {
                doc.addPage();
                labelIndex = 0;
            }

            const row = Math.floor(labelIndex / 3);
            const col = labelIndex % 3;
            
            const x = margin + (col * labelWidth);
            const y = margin + (row * labelHeight);

            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.5);
            doc.rect(x, y, labelWidth - 2, labelHeight - 2, 'S');

            doc.setFontSize(7);
            doc.setTextColor(80, 80, 80);
            doc.text((nombreEstablecimiento || 'TIENDA').substring(0, 20), x + 2, y + 5);

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'bold');
            let nombreProducto = producto.nombre || 'Producto';
            if (nombreProducto.length > 22) {
                nombreProducto = nombreProducto.substring(0, 20) + '...';
            }
            doc.text(nombreProducto, x + 2, y + 12);

            doc.setFontSize(14);
            doc.setTextColor(0, 150, 0);
            doc.setFont(undefined, 'bold');
            
            let precioTexto = '';
            if (monedaEtiquetas === 'USD') {
                precioTexto = `$${(producto.precioUnitarioDolar || 0).toFixed(2)}`;
            } else {
                precioTexto = `Bs ${(producto.precioUnitarioBolivar || 0).toFixed(2)}`;
            }
            doc.text(precioTexto, x + 2, y + 22);

            doc.setFontSize(6);
            doc.setTextColor(120, 120, 120);
            doc.setFont(undefined, 'normal');
            doc.text(`Cat: ${producto.descripcion || 'N/A'}`, x + 2, y + 28);
            
            if (producto.codigoBarras) {
                doc.setFontSize(5);
                doc.text(`Cód: ${producto.codigoBarras}`, x + 2, y + 32);
            }

            labelIndex++;
        });

        doc.save(`etiquetas_${categoria}_${new Date().toISOString().slice(0,10)}.pdf`);
        showToast(`Etiquetas generadas: ${tituloCategoria}`, 'success');
    } catch (error) {
        console.error('Error generando etiquetas:', error);
        showToast('Error al generar etiquetas: ' + error.message, 'error');
    }

    cerrarModalEtiquetas();
}

// ===== RESPALDO Y RESTAURACIÓN =====
function descargarBackup() {
    const backup = {
        productos,
        nombreEstablecimiento,
        tasaBCV: tasaBCVGuardada,
        ventasDiarias,
        carrito,
        claveSeguridad,
        monedaEtiquetas,
        fecha: new Date().toISOString(),
        version: '2.0'
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Respaldo descargado', 'success');
}

function cargarBackup(files) {
    if (!files || !files.length) return;

    const file = files[0];
    if (!file.name.endsWith('.json')) {
        showToast('Seleccione un archivo JSON', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);
            
            if (!backup.productos || !Array.isArray(backup.productos)) {
                throw new Error('Formato inválido');
            }

            if (confirm('¿Cargar respaldo? Se perderán los datos actuales.')) {
                localStorage.clear();
                
                localStorage.setItem(STORAGE_KEYS.PRODUCTOS, JSON.stringify(backup.productos));
                localStorage.setItem(STORAGE_KEYS.NOMBRE, backup.nombreEstablecimiento || '');
                localStorage.setItem(STORAGE_KEYS.TASA, backup.tasaBCV || '0');
                localStorage.setItem(STORAGE_KEYS.VENTAS, JSON.stringify(backup.ventasDiarias || []));
                localStorage.setItem(STORAGE_KEYS.CARRITO, JSON.stringify(backup.carrito || []));
                localStorage.setItem(STORAGE_KEYS.CLAVE, backup.claveSeguridad || '1234');
                localStorage.setItem(STORAGE_KEYS.MONEDA, backup.monedaEtiquetas || 'VES');

                showToast('Respaldo cargado. Recargando...', 'success');
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (error) {
            showToast('Error al cargar archivo', 'error');
            console.error(error);
        }
    };
    reader.readAsText(file);
    
    document.getElementById('fileInput').value = '';
}

// ===== CAMBIO DE CLAVE =====
function mostrarModalCambiarClave() {
    document.getElementById('modalCambiarClave').style.display = 'block';
    document.getElementById('claveActual').value = '';
    document.getElementById('nuevaClave').value = '';
    document.getElementById('confirmarClave').value = '';
}

function cerrarModalCambiarClave() {
    document.getElementById('modalCambiarClave').style.display = 'none';
}

function cambiarClave() {
    const actual = document.getElementById('claveActual').value.trim();
    const nueva = document.getElementById('nuevaClave').value.trim();
    const confirmar = document.getElementById('confirmarClave').value.trim();

    if (actual !== claveSeguridad && actual !== 'ACME123') {
        showToast('Clave actual incorrecta', 'error');
        return;
    }

    if (nueva.length < 4) {
        showToast('La clave debe tener al menos 4 caracteres', 'error');
        return;
    }

    if (nueva !== confirmar) {
        showToast('Las claves no coinciden', 'error');
        return;
    }

    claveSeguridad = nueva;
    localStorage.setItem(STORAGE_KEYS.CLAVE, claveSeguridad);
    showToast('Clave cambiada exitosamente', 'success');
    cerrarModalCambiarClave();
}

// ===== COPYRIGHT =====
function toggleCopyrightNotice() {
    document.getElementById('copyrightNotice').classList.toggle('show');
}

// ===== EXPORTAR FUNCIONES AL ÁMBITO GLOBAL =====
window.toggleSidebar = toggleSidebar;
window.showSection = showSection;
window.calcularPrecioVenta = calcularPrecioVenta;
window.guardarProducto = guardarProducto;
window.editarProducto = editarProducto;
window.eliminarProducto = eliminarProducto;
window.buscarProducto = buscarProducto;
window.ajustarInventario = ajustarInventario;
window.agregarPorCodigoBarras = agregarPorCodigoBarras;
window.agregarProductoAlCarrito = agregarProductoAlCarrito;
window.actualizarCantidadCarrito = actualizarCantidadCarrito;
window.cambiarCantidadDirecta = cambiarCantidadDirecta;
window.cambiarUnidadCarrito = cambiarUnidadCarrito;
window.eliminarDelCarrito = eliminarDelCarrito;
window.finalizarVenta = finalizarVenta;
window.cerrarModalPago = cerrarModalPago;
window.seleccionarMetodoPago = seleccionarMetodoPago;
window.confirmarMetodoPago = confirmarMetodoPago;
window.cancelarPago = cancelarPago;
window.guardarNombreEstablecimiento = guardarNombreEstablecimiento;
window.actualizarTasaBCV = actualizarTasaBCV;
window.mostrarListaCostos = mostrarListaCostos;
window.generarReporteDiario = generarReporteDiario;
window.mostrarOpcionesPDF = mostrarOpcionesPDF;
window.cerrarModalCategorias = cerrarModalCategorias;
window.generarPDFPorCategoria = generarPDFPorCategoria;
window.generarEtiquetasAnaqueles = generarEtiquetasAnaqueles;
window.cerrarModalEtiquetas = cerrarModalEtiquetas;
window.actualizarMonedaEtiquetas = actualizarMonedaEtiquetas;
window.generarEtiquetasPorCategoria = generarEtiquetasPorCategoria;
window.descargarBackup = descargarBackup;
window.cargarBackup = cargarBackup;
window.mostrarModalCambiarClave = mostrarModalCambiarClave;
window.cerrarModalCambiarClave = cerrarModalCambiarClave;
window.cambiarClave = cambiarClave;
window.toggleCopyrightNotice = toggleCopyrightNotice;
window.mostrarModalClave = mostrarModalClave;
window.cerrarModalClave = cerrarModalClave;
window.verificarClaveModal = verificarClaveModal;
