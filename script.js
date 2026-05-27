// ============================================
// CALCULADORA MÁGICA - VERSIÓN PROFESIONAL COMPLETA v3.3
// CANDADO DIGITAL OPTIMIZADO: Destrucción inmediata de interfaz en clones.
// ============================================

// ===== PROTECCIÓN AVANZADA Y VERIFICACIÓN DE DOMINIO =====
(function() {
    // 1. CANDADO DE SEGURIDAD INTERNO
    const DOMINIO_LEGAL = "clientes.calculadoramagica.lat";
    const hostActual = window.location.hostname;

    // Permitir desarrollo local, pero fulminar cualquier otro dominio clonado
    if (hostActual !== 'localhost' && hostActual !== '127.0.0.1' && hostActual !== DOMINIO_LEGAL) {
        
        // A) DESTRUCCIÓN INMEDIATA DEL CONTENIDO (Antes de la alerta)
        if (document.documentElement) {
            document.documentElement.innerHTML = ""; 
        }
        document.body.innerHTML = "<h1 style='color:#f44336; text-align:center; margin-top:20%; font-family:sans-serif;'>Error 403: Sistema No Autorizado u Obsoleto.</h1>";
        
        // B) REDIRECCIÓN INMEDIATA
        window.location.replace("https://" + DOMINIO_LEGAL);
        
        // C) ALERTA AL INTRUSO
        alert("Esta copia de la Calculadora Mágica no está autorizada o el link está vencido. Por favor, ingresa desde tu dominio oficial.");
        
        // D) CONGELAR EL SCRIPT (Si intentan quedarse en la página no procesará nada)
        throw new Error("Ejecución detenida: Dominio no autorizado.");
        return; 
    }

    // 2. RESTRICCIONES DE CONTEXTO E INSPECTOR (Continúa el código igual...)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isProduction = hostActual !== 'localhost' && hostActual !== '127.0.0.1';
    
    if (!isMobile) {
        document.addEventListener('keydown', function(e) {
            if (e.key === 'F12' || e.keyCode === 123) { e.preventDefault(); return false; }
            if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) { e.preventDefault(); return false; }
            if (e.ctrlKey && e.key.toLowerCase() === 'u') { e.preventDefault(); return false; }
            if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); return false; }
            if (e.ctrlKey && e.key.toLowerCase() === 'p') { e.preventDefault(); return false; }
        }, false);
        document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
        document.addEventListener('copy', function(e) { if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') e.preventDefault(); });
        document.addEventListener('cut', function(e) { if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') e.preventDefault(); });
        document.addEventListener('selectstart', function(e) { if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') e.preventDefault(); });
        
        let devtoolsOpen = false;
        setInterval(function() {
            const widthThreshold = window.outerWidth - window.innerWidth > 160;
            const heightThreshold = window.outerHeight - window.innerHeight > 160;
            if (widthThreshold || heightThreshold) { if (!devtoolsOpen) { devtoolsOpen = true; console.clear(); } }
            else { devtoolsOpen = false; }
        }, 1000);
        
        if (isProduction) {
            setInterval(function() { console.clear(); }, 3000);
            console.log = function() {}; console.info = function() {}; console.warn = function() {}; console.debug = function() {};
        }
        
        const style = document.createElement('style');
        style.textContent = `body { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; } input, textarea, [contenteditable="true"] { -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text; }`;
        document.head.appendChild(style);
    }
})();

// ----- VARIABLES GLOBALES -----
let productos = [];
let nombreEstablecimiento = '';
let tasaBCVGuardada = 0;
let monedaSeleccionada = 'VES';
let tasaMonedaActual = 0;
let ventasDiarias = [];
let carrito = [];
let claveSeguridad = '1234';
let claveEdicion = '';
let monedaEtiquetas = 'VES';
let productoEditando = null;
let productosFiltrados = [];

// ----- SISTEMA DE PAGO MIXTO -----
let pagoMixtoActual = {
    totalMoneda: 0,
    totalDolares: 0,
    pagos: [],
    totalPagadoMoneda: 0,
    totalPagadoDolares: 0,
    vueltoMoneda: 0,
    completado: false
};

// ----- CRÉDITOS -----
let creditos = [];
let creditoEditando = null;
let creditosFiltrados = [];
let filtroActual = 'todos';
let nextCreditoId = 1;

// ----- CATEGORÍAS -----
let categoriasPersonalizadas = [];

// ----- ESCÁNER -----
let bufferEscaneo = '';
let productoEliminarPendiente = null;

// ----- INACTIVIDAD -----
let temporizadorInactividad;
let temporizadorAviso;
let ultimaActividad = Date.now();
let redireccionEnCurso = false;
const TIEMPO_INACTIVIDAD = 24 * 60 * 1000;
const TIEMPO_AVISO = 20 * 60 * 1000;
const URL_REDIRECCION = "http://portal.calculadoramagica.lat/";

function reiniciarTemporizador() {
    ultimaActividad = Date.now();
    if (temporizadorInactividad) clearTimeout(temporizadorInactividad);
    if (temporizadorAviso) clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => alert("¡Atención! Te redirigiremos pronto por inactividad."), TIEMPO_AVISO);
    temporizadorInactividad = setTimeout(() => { if (!redireccionEnCurso) { redireccionEnCurso = true; window.location.href = URL_REDIRECCION; } }, TIEMPO_INACTIVIDAD);
}
window.addEventListener('mousemove', reiniciarTemporizador);
window.addEventListener('keydown', reiniciarTemporizador);
window.addEventListener('scroll', reiniciarTemporizador);
window.addEventListener('click', reiniciarTemporizador);
reiniciarTemporizador();

// ----- STORAGE KEYS -----
const STORAGE_KEYS = {
    PRODUCTOS: 'productos',
    NOMBRE: 'nombreEstablecimiento',
    TASA_BCV: 'tasaBCV',
    MONEDA_SELECCIONADA: 'monedaSeleccionada',
    TASA_MONEDA: 'tasaMonedaActual',
    VENTAS: 'ventasDiarias',
    CARRITO: 'carrito',
    CLAVE: 'claveSeguridad',
    CLAVE_EDICION: 'claveEdicion',
    MONEDA_ETIQUETAS: 'monedaEtiquetas',
    CREDITOS: 'creditos',
    CATEGORIAS: 'categoriasPersonalizadas',
    NEXT_CREDITO_ID: 'nextCreditoId'
};

// ===== UTILIDADES =====
function redondear2Decimales(numero) { return isNaN(numero) ? 0 : Math.round((numero + Number.EPSILON) * 100) / 100; }

function showToast(message, type = 'success', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#ff9800'}; color: white; padding: 12px 20px; border-radius: 8px; margin-top: 10px; box-shadow: 0 3px 10px rgba(0,0,0,0.2); animation: slideIn 0.3s;`;
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, duration);
}

function safeSetItem(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } 
    catch (e) { if (e.name === 'QuotaExceededError') showToast('⚠️ Espacio de almacenamiento lleno. Haz un respaldo.', 'warning'); else console.error(e); }
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    cargarDatosStorage();
    // Nota: El código original llamaba a inicializarSistemaInactividad() pero no estaba definido globalmente en este fragmento. Si posees esa función conserva su estructura, de lo contrario se ejecuta a través de los eventListeners superiores.
    configurarEventos();
    configurarEventosMoviles();
    actualizarTodo();
    actualizarAnioCopyright();
    setTimeout(() => inicializarCreditos(), 100);
});

function cargarDatosStorage() {
    try {
        productos = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTOS)) || [];
        nombreEstablecimiento = localStorage.getItem(STORAGE_KEYS.NOMBRE) || 'Mi Negocio';
        tasaBCVGuardada = parseFloat(localStorage.getItem(STORAGE_KEYS.TASA_BCV)) || 0;
        monedaSeleccionada = localStorage.getItem(STORAGE_KEYS.MONEDA_SELECCIONADA) || 'VES';
        tasaMonedaActual = parseFloat(localStorage.getItem(STORAGE_KEYS.TASA_MONEDA)) || 0;
        ventasDiarias = JSON.parse(localStorage.getItem(STORAGE_KEYS.VENTAS)) || [];
        carrito = JSON.parse(localStorage.getItem(STORAGE_KEYS.CARRITO)) || [];
        claveSeguridad = localStorage.getItem(STORAGE_KEYS.CLAVE) || '1234';
        claveEdicion = localStorage.getItem(STORAGE_KEYS.CLAVE_EDICION) || '';
        monedaEtiquetas = localStorage.getItem(STORAGE_KEYS.MONEDA_ETIQUETAS) || 'VES';
        creditos = JSON.parse(localStorage.getItem(STORAGE_KEYS.CREDITOS)) || [];
        nextCreditoId = parseInt(localStorage.getItem(STORAGE_KEYS.NEXT_CREDITO_ID)) || 1;
        
        let maxId = nextCreditoId;
        creditos = creditos.map(c => { if (!c.id) { c.id = maxId++; } return c; });
        if (maxId > nextCreditoId) { nextCreditoId = maxId; guardarCreditosStorage(); }
        
        const categoriasGuardadas = localStorage.getItem(STORAGE_KEYS.CATEGORIAS);
        if (categoriasGuardadas) { try { const parsed = JSON.parse(categoriasGuardadas); if (Array.isArray(parsed) && parsed.length > 0) categoriasPersonalizadas = parsed; else throw new Error(); } catch(e) { localStorage.removeItem(STORAGE_KEYS.CATEGORIAS); } }
        if (!categoriasPersonalizadas || categoriasPersonalizadas.length === 0) {
            categoriasPersonalizadas = ["viveres","bebidas","licores","enlatados","lacteos","carnes","frutas","verduras","aseo_personal","limpieza","otros"];
            guardarCategorias();
        }
        
        carrito = carrito.filter(item => item && item.nombre);
        actualizarSelectCategorias();
        
        const infoTasa = document.getElementById('infoTasa');
        if (infoTasa) {
            infoTasa.innerHTML = `Moneda activa: ${obtenerNombreMoneda(monedaSeleccionada)} (1 USD = ${tasaMonedaActual.toFixed(2)} ${monedaSeleccionada})`;
        }
        const selectMoneda = document.getElementById('monedaSeleccionada');
        if (selectMoneda) selectMoneda.value = monedaSeleccionada;
        const inputTasa = document.getElementById('tasaCambio');
        if (inputTasa) inputTasa.value = tasaMonedaActual;
        
        const mensajeClave = document.getElementById('mensajeClave');
        if (mensajeClave) mensajeClave.innerHTML = claveEdicion ? '<span style="color: #4CAF50;">✓ Clave personalizada establecida.</span>' : '<span style="color: #ff9800;">⚠️ No has establecido una clave. Puedes crear una o usar la clave maestra (admin123).</span>';
    } catch (error) { console.error(error); productos = []; carrito = []; creditos = []; }
}

function guardarCategorias() { localStorage.setItem(STORAGE_KEYS.CATEGORIAS, JSON.stringify(categoriasPersonalizadas)); }
function actualizarSelectCategorias() {
    const select = document.getElementById('descripcion');
    if (!select) return;
    const valorActual = select.value;
    select.innerHTML = '<option value="">Selecciona una categoría</option>';
    categoriasPersonalizadas.forEach(cat => { const option = document.createElement('option'); option.value = cat; option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' '); if (valorActual === cat) option.selected = true; select.appendChild(option); });
}

function actualizarTodo() {
    actualizarNombreSidebar();
    actualizarEstadisticas();
    actualizarListaProductos();
    actualizarCarrito();
    // Nota: Si conservas la función cargarDatosIniciales() en otra parte del script, se ejecutará sin problemas.
    if (typeof cargarDatosIniciales === "function") cargarDatosIniciales();
}
function actualizarAnioCopyright() { const el = document.getElementById('currentYear'); if (el) el.textContent = new Date().getFullYear(); }
function toggleSidebar() { document.getElementById('mainSidebar').classList.toggle('collapsed'); }
function showSection(sectionId) {
    document.querySelectorAll('.menu-item').forEach(item => { item.classList.remove('active'); if (item.dataset.section === sectionId) item.classList.add('active'); });
    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
    document.getElementById(`${sectionId}-section`).classList.add('active');
    if (sectionId === 'punto-venta') setTimeout(() => document.getElementById('codigoBarrasInput')?.focus(), 300);
    if (sectionId === 'creditos') actualizarVistaCreditos();
}
function actualizarNombreSidebar() { const span = document.getElementById('sidebarStoreName'); if (span) span.textContent = nombreEstablecimiento; }

function obtenerNombreMoneda(codigo) {
    const nombres = { VES: 'Bolívar', EUR: 'Euro', CLP: 'Peso chileno', COP: 'Peso colombiano', PEN: 'Sol peruano' };
    return nombres[codigo] || codigo;
}

// ===== TASA DE CAMBIO =====
function actualizarTasaCambio() {
    const moneda = document.getElementById('monedaSeleccionada').value;
    const tasa = parseFloat(document.getElementById('tasaCambio').value);
    if (!tasa || tasa <= 0) { showToast('Ingrese una tasa válida (1 USD = ?)', 'error'); return; }
    monedaSeleccionada = moneda;
    tasaMonedaActual = tasa;
    localStorage.setItem(STORAGE_KEYS.MONEDA_SELECCIONADA, monedaSeleccionada);
    localStorage.setItem(STORAGE_KEYS.TASA_MONEDA, tasaMonedaActual);
    
    productos.forEach(p => {
        p.precioUnitarioMoneda = redondear2Decimales(p.precioUnitarioDolar * tasaMonedaActual);
        p.precioMayorMoneda = redondear2Decimales(p.precioMayorDolar * tasaMonedaActual);
    });
    safeSetItem(STORAGE_KEYS.PRODUCTOS, productos);
    
    carrito.forEach(item => {
        item.precioUnitarioMoneda = redondear2Decimales(item.precioUnitarioDolar * tasaMonedaActual);
        recalcularSubtotal(item);
    });
    safeSetItem(STORAGE_KEYS.CARRITO, carrito);
    
    actualizarTodo();
    const infoTasa = document.getElementById('infoTasa');
    if (infoTasa) infoTasa.innerHTML = `Moneda activa: ${obtenerNombreMoneda(monedaSeleccionada)} (1 USD = ${tasaMonedaActual.toFixed(2)} ${monedaSeleccionada})`;
    showToast(`Tasa actualizada: 1 USD = ${tasaMonedaActual} ${monedaSeleccionada}`, 'success');
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

function guardarClaveEdicion() {
    const nuevaClave = document.getElementById('claveEdicionInput').value.trim();
    if (!nuevaClave) { showToast('La clave no puede estar vacía', 'error'); return; }
    claveEdicion = nuevaClave;
    localStorage.setItem(STORAGE_KEYS.CLAVE_EDICION, claveEdicion);
    document.getElementById('claveEdicionInput').value = '';
    const mensajeDiv = document.getElementById('mensajeClave');
    if (mensajeDiv) mensajeDiv.innerHTML = '<span style="color: #4CAF50;">✓ Clave guardada correctamente.</span>';
    showToast('Clave de edición guardada', 'success');
}
function probarClaveEdicion() {
    const claveIngresada = prompt("Ingrese la clave de edición para probar:");
    if (claveIngresada === claveEdicion || claveIngresada === "admin123") showToast("Clave correcta. Acceso permitido.", "success");
    else showToast("Clave incorrecta. Acceso denegado.", "error");
}
function verificarClaveEdicion() {
    if (!claveEdicion) {
        const claveIngresada = prompt("Ingrese la clave para editar (clave maestra):");
        if (claveIngresada === "admin123") return true;
        showToast("Clave incorrecta. Edición bloqueada.", "error");
        return false;
    } else {
        const claveIngresada = prompt("Ingrese la clave de edición:");
        if (claveIngresada === claveEdicion || claveIngresada === "admin123") return true;
        showToast("Clave incorrecta. Edición bloqueada.", "error");
        return false;
    }
}

// ===== PRODUCTOS =====
function calcularPrecioVenta() {
    const tasa = tasaMonedaActual || tasaBCVGuardada;
    const costo = parseFloat(document.getElementById('costo').value);
    const ganancia = parseFloat(document.getElementById('ganancia').value);
    const unidades = parseFloat(document.getElementById('unidadesPorCaja').value);
    if (!tasa || tasa <= 0) return showToast('Configure la tasa de cambio en Configuración', 'error');
    if (!costo || !ganancia || !unidades) return showToast('Complete todos los campos', 'error');
    const precioDolar = costo / (1 - (ganancia / 100));
    const unitarioDolar = redondear2Decimales(precioDolar / unidades);
    const unitarioMoneda = redondear2Decimales(unitarioDolar * tasa);
    document.getElementById('precioUnitario').innerHTML = `<strong>Precio unitario:</strong> $${unitarioDolar.toFixed(2)} / ${unitarioMoneda.toFixed(2)} ${monedaSeleccionada}`;
}

function guardarProducto() {
    const nombre = document.getElementById('producto').value.trim();
    const codigo = document.getElementById('codigoBarras').value.trim();
    const desc = document.getElementById('descripcion').value;
    const costo = parseFloat(document.getElementById('costo').value);
    const ganancia = parseFloat(document.getElementById('ganancia').value);
    const unidadesPorCaja = parseFloat(document.getElementById('unidadesPorCaja').value);
    const existencias = parseFloat(document.getElementById('unidadesExistentes').value) || 0;
    const tasa = tasaMonedaActual || tasaBCVGuardada;
    if (!nombre || !desc) return showToast('Complete nombre y descripción', 'error');
    if (!tasa || tasa <= 0) return showToast('Configure la tasa de cambio en Configuración', 'error');
    if (!costo || !ganancia || !unidadesPorCaja) return showToast('Complete todos los campos', 'error');
    if (codigo && productoEditando === null && productos.find(p => p.codigoBarras && p.codigoBarras.toLowerCase() === codigo.toLowerCase())) return showToast('Código ya existe', 'error');
    
    const precioDolar = costo / (1 - (ganancia / 100));
    const unitarioDolar = redondear2Decimales(precioDolar / unidadesPorCaja);
    const unitarioMoneda = redondear2Decimales(unitarioDolar * tasa);
    const productoNuevo = {
        nombre, codigoBarras: codigo, descripcion: desc, costo, ganancia: ganancia / 100,
        unidadesPorCaja, unidadesExistentes: existencias,
        precioUnitarioDolar: unitarioDolar, precioUnitarioMoneda: unitarioMoneda,
        precioMayorDolar: precioDolar, precioMayorMoneda: precioDolar * tasa,
        fechaActualizacion: new Date().toISOString()
    };
    if (productoEditando !== null) {
        productos[productoEditando] = productoNuevo;
        showToast('Producto actualizado', 'success');
        productoEditando = null;
        document.getElementById('formProductoTitle').textContent = 'Agregar Nuevo Producto';
        document.getElementById('btnGuardarProducto').style.display = 'inline-flex';
        document.getElementById('btnGuardarCambios').style.display = 'none';
    } else {
        productos.push(productoNuevo);
        showToast('Producto guardado', 'success');
    }
    safeSetItem(STORAGE_KEYS.PRODUCTOS, productos);
    actualizarTodo();
    limpiarFormularioProducto();
}
function guardarCambiosProducto() { if (productoEditando !== null) guardarProducto(); else showToast('No hay producto en edición', 'error'); }
function limpiarFormularioProducto() {
    document.getElementById('producto').value = '';
    document.getElementById('codigoBarras').value = '';
    document.getElementById('costo').value = '';
    document.getElementById('ganancia').value = '';
    document.getElementById('unidadesPorCaja').value = '';
    document.getElementById('unidadesExistentes').value = '';
    document.getElementById('descripcion').selectedIndex = 0;
    document.getElementById('precioUnitario').innerHTML = '';
    productoEditando = null;
    document.getElementById('formProductoTitle').textContent = 'Agregar Nuevo Producto';
    document.getElementById('btnGuardarProducto').style.display = 'inline-flex';
    document.getElementById('btnGuardarCambios').style.display = 'none';
}
function editarProducto(index) {
    if (!verificarClaveEdicion()) return;
    let indiceReal = index;
    if (productosFiltrados.length > 0) {
        const prodFiltrado = productosFiltrados[index];
        indiceReal = productos.findIndex(p => p.nombre === prodFiltrado.nombre && p.costo === prodFiltrado.costo);
        if (indiceReal === -1) { showToast('Error: Producto no encontrado', 'error'); return; }
    }
    const producto = productos[indiceReal];
    document.getElementById('producto').value = producto.nombre || '';
    document.getElementById('codigoBarras').value = producto.codigoBarras || '';
    document.getElementById('descripcion').value = producto.descripcion || '';
    document.getElementById('costo').value = producto.costo || '';
    document.getElementById('ganancia').value = (producto.ganancia * 100) || '';
    document.getElementById('unidadesPorCaja').value = producto.unidadesPorCaja || '';
    document.getElementById('unidadesExistentes').value = producto.unidadesExistentes || '';
    productoEditando = indiceReal;
    setTimeout(() => calcularPrecioVenta(), 100);
    document.getElementById('formProductoTitle').textContent = 'Editando Producto';
    document.getElementById('btnGuardarProducto').style.display = 'none';
    document.getElementById('btnGuardarCambios').style.display = 'inline-flex';
    showSection('productos');
    showToast(`Editando: ${producto.nombre}`, 'info');
}
function editarProductoConBoton(index) { editarProducto(index); }
function eliminarProducto(index) {
    if (!verificarClaveEdicion()) return;
    let indiceReal = index;
    if (productosFiltrados.length > 0) {
        const prodFiltrado = productosFiltrados[index];
        indiceReal = productos.findIndex(p => p.nombre === prodFiltrado.nombre && p.costo === prodFiltrado.costo);
        if (indiceReal === -1) { showToast('Error: Producto no encontrado', 'error'); return; }
    }
    productoEliminarPendiente = indiceReal;
    const modal = document.getElementById('modalConfirmacionEliminar');
    if (modal) { document.getElementById('mensajeConfirmacionEliminar').textContent = `¿Eliminar "${productos[indiceReal].nombre}"?`; modal.style.display = 'block'; }
}
function confirmarEliminacionProducto() {
    if (productoEliminarPendiente === null) return;
    const nombreProducto = productos[productoEliminarPendiente].nombre;
    productos.splice(productoEliminarPendiente, 1);
    safeSetItem(STORAGE_KEYS.PRODUCTOS, productos);
    productosFiltrados = [];
    actualizarTodo();
    showToast(`Producto "${nombreProducto}" eliminado`, 'success');
    cerrarModalConfirmacionEliminar();
    productoEliminarPendiente = null;
}
function cerrarModalConfirmacionEliminar() { document.getElementById('modalConfirmacionEliminar').style.display = 'none'; productoEliminarPendiente = null; }

// ===== INVENTARIO =====
function actualizarListaProductos() {
    const tbody = document.querySelector('#inventario-section tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const listado = productosFiltrados.length > 0 ? productosFiltrados : productos;
    listado.forEach((p, idx) => {
        const fila = document.createElement('tr');
        fila.setAttribute('ondblclick', `editarProducto(${idx})`);
        fila.style.cursor = 'pointer';
        const stockBajo = p.unidadesExistentes < 4 ? 'inventario-bajo' : '';
        fila.innerHTML = `<td>${p.nombre}</td><td>${p.descripcion}</td><td class="${stockBajo}"><strong>${p.unidadesExistentes}</strong></td><td>$${p.precioUnitarioDolar.toFixed(2)}</td><td>${p.precioUnitarioMoneda.toFixed(2)} ${monedaSeleccionada}</td><td><div class="ajuste-inventario"><button onclick="editarProductoConBoton(${idx})" class="btn-secondary"><i class="fas fa-edit"></i></button><button onclick="eliminarProducto(${idx})" class="btn-danger"><i class="fas fa-trash"></i></button></div></td>`;
        tbody.appendChild(fila);
    });
}
function buscarProducto() {
    const termino = document.getElementById('buscar').value.trim().toLowerCase();
    productosFiltrados = termino ? productos.filter(p => p.nombre.toLowerCase().includes(termino) || p.descripcion.toLowerCase().includes(termino) || (p.codigoBarras && p.codigoBarras.toLowerCase().includes(termino))) : [];
    actualizarListaProductos();
}

// ===== ESTADÍSTICAS =====
function actualizarEstadisticas() {
    const totalProductos = productos.length;
    const stockBajo = productos.filter(p => p.unidadesExistentes < 4).length;
    document.getElementById('totalProductosCount').textContent = totalProductos;
    document.getElementById('stockBajoCount').textContent = stockBajo;
    let gananciaUSD = 0, totalInvertidoUSD = 0;
    productos.forEach(p => {
        const costoUnitario = p.costo / (p.unidadesPorCaja || 1);
        gananciaUSD += (p.precioUnitarioDolar - costoUnitario) * (p.unidadesExistentes || 0);
        totalInvertidoUSD += (p.unidadesExistentes || 0) * costoUnitario;
    });
    document.getElementById('gananciaTotalUSD').textContent = `$${redondear2Decimales(gananciaUSD).toFixed(2)}`;
    document.getElementById('gananciaTotalMoneda').textContent = `${redondear2Decimales(gananciaUSD * tasaMonedaActual).toFixed(2)} ${monedaSeleccionada}`;
    document.getElementById('totalInvertidoUSD').textContent = `$${redondear2Decimales(totalInvertidoUSD).toFixed(2)} USD`;
    document.getElementById('totalInvertidoMoneda').textContent = `/ ${redondear2Decimales(totalInvertidoUSD * tasaMonedaActual).toFixed(2)} ${monedaSeleccionada}`;
}

// ===== CARRITO =====
function agregarPorCodigoBarras() { procesarEscaneo(document.getElementById('codigoBarrasInput').value.trim()); }
function procesarEscaneo(codigo) {
    if (!codigo) return showToast('Ingrese un código', 'warning');
    let producto = productos.find(p => (p.codigoBarras && p.codigoBarras.toLowerCase() === codigo.toLowerCase()) || p.nombre.toLowerCase() === codigo.toLowerCase());
    if (!producto) producto = productos.find(p => p.nombre.toLowerCase().includes(codigo.toLowerCase()));
    if (!producto) { showToast('Producto no encontrado', 'error'); mostrarSugerencias(codigo); return; }
    agregarProductoAlCarrito(producto);
    document.getElementById('codigoBarrasInput').value = '';
    document.getElementById('codigoBarrasInput').focus();
    document.getElementById('scannerStatus').innerHTML = '<i class="fas fa-check-circle"></i> Producto agregado';
}
function mostrarSugerencias(termino) {
    const sugerencias = productos.filter(p => p.nombre.toLowerCase().includes(termino.toLowerCase())).slice(0,5);
    const div = document.getElementById('sugerencias');
    if (!div) return;
    div.innerHTML = '';
    sugerencias.forEach(p => { const item = document.createElement('div'); item.textContent = `${p.nombre} (${p.descripcion})`; item.onclick = () => agregarProductoAlCarrito(p); div.appendChild(item); });
}
function agregarProductoAlCarrito(producto) {
    const indexProducto = productos.findIndex(p => p.nombre === producto.nombre && p.costo === producto.costo);
    if (producto.unidadesExistentes <= 0) { showToast(`❌ ${producto.nombre} sin stock`, 'error'); return; }
    const existente = carrito.findIndex(item => item.nombre === producto.nombre && item.unidad === 'unidad');
    if (existente !== -1) {
        if (carrito[existente].cantidad + 1 > producto.unidadesExistentes) { showToast(`Stock insuficiente. Disponible: ${producto.unidadesExistentes}`, 'error'); return; }
        carrito[existente].cantidad += 1;
        recalcularSubtotal(carrito[existente]);
    } else {
        carrito.push({
            nombre: producto.nombre, descripcion: producto.descripcion,
            precioUnitarioMoneda: producto.precioUnitarioMoneda, precioUnitarioDolar: producto.precioUnitarioDolar,
            cantidad: 1, unidad: 'unidad', subtotal: producto.precioUnitarioMoneda, subtotalDolar: producto.precioUnitarioDolar,
            indexProducto
        });
    }
    safeSetItem(STORAGE_KEYS.CARRITO, carrito);
    actualizarCarrito();
}
function recalcularSubtotal(item) {
    if (item.unidad === 'gramo') {
        const precioGramoMoneda = item.precioUnitarioMoneda / 1000;
        const precioGramoUsd = item.precioUnitarioDolar / 1000;
        item.subtotal = redondear2Decimales(item.cantidad * precioGramoMoneda);
        item.subtotalDolar = redondear2Decimales(item.cantidad * precioGramoUsd);
    } else {
        item.subtotal = redondear2Decimales(item.cantidad * item.precioUnitarioMoneda);
        item.subtotalDolar = redondear2Decimales(item.cantidad * item.precioUnitarioDolar);
    }
}
function actualizarCarrito() {
    const tbody = document.getElementById('carritoBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (carrito.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Carrito vacío</td></tr>'; document.getElementById('totalCarritoMoneda').innerHTML = `<strong>Total moneda seleccionada:</strong> 0,00`; document.getElementById('totalCarritoDolares').innerHTML = '<strong>Total USD:</strong> 0,00'; return; }
    let totalMoneda = 0, totalUsd = 0;
    carrito.forEach((item, idx) => {
        recalcularSubtotal(item);
        totalMoneda += item.subtotal;
        totalUsd += item.subtotalDolar;
        const fila = document.createElement('tr');
        fila.innerHTML = `<td>${item.nombre}</td><td>${item.precioUnitarioMoneda.toFixed(2)} ${monedaSeleccionada}</td><td><button onclick="actualizarCantidadCarrito(${idx}, -1)">-</button><span onclick="cambiarCantidadDirecta(${idx})" style="cursor:pointer; padding:5px 10px; background:#f0f0f0;">${item.cantidad} ${item.unidad === 'gramo' ? 'g' : ''}</span><button onclick="actualizarCantidadCarrito(${idx}, 1)">+</button></td><td><select onchange="cambiarUnidadCarrito(${idx}, this.value)"><option value="unidad" ${item.unidad==='unidad'?'selected':''}>Unidad</option><option value="gramo" ${item.unidad==='gramo'?'selected':''}>Gramo</option></select></td><td>${item.subtotal.toFixed(2)} ${monedaSeleccionada}</td><td><button onclick="eliminarDelCarrito(${idx})" style="background:#f44336;"><i class="fas fa-trash"></i></button></td>`;
        tbody.appendChild(fila);
    });
    document.getElementById('totalCarritoMoneda').innerHTML = `<strong>Total moneda seleccionada:</strong> ${totalMoneda.toFixed(2)} ${monedaSeleccionada}`;
    document.getElementById('totalCarritoDolares').innerHTML = `<strong>Total USD:</strong> $${totalUsd.toFixed(2)}`;
}
function actualizarCantidadCarrito(index, delta) {
    if (!carrito[index]) return;
    const item = carrito[index];
    const producto = productos[item.indexProducto];
    let nuevaCantidad = item.cantidad + delta;
    if (item.unidad === 'gramo') { const disponibleGramos = (producto.unidadesExistentes || 0) * 1000; if (nuevaCantidad > disponibleGramos) { showToast('Stock insuficiente', 'error'); return; } }
    else { if (nuevaCantidad > (producto.unidadesExistentes || 0)) { showToast('Stock insuficiente', 'error'); return; } }
    item.cantidad = Math.max(0.1, nuevaCantidad);
    if (item.cantidad <= 0) eliminarDelCarrito(index);
    else { recalcularSubtotal(item); safeSetItem(STORAGE_KEYS.CARRITO, carrito); actualizarCarrito(); }
}
function cambiarCantidadDirecta(index) {
    if (!carrito[index]) return;
    const item = carrito[index];
    const producto = productos[item.indexProducto];
    let nuevaCantidad = prompt(`Ingrese la cantidad en ${item.unidad === 'gramo' ? 'gramos' : 'unidades'}:`, item.cantidad);
    if (nuevaCantidad === null) return;
    nuevaCantidad = parseFloat(nuevaCantidad);
    if (isNaN(nuevaCantidad) || nuevaCantidad <= 0) { showToast('Cantidad inválida', 'error'); return; }
    if (item.unidad === 'gramo') { const disponibleGramos = (producto.unidadesExistentes || 0) * 1000; if (nuevaCantidad > disponibleGramos) { showToast(`Stock insuficiente. Disponible: ${disponibleGramos}g`, 'error'); return; } }
    else { if (nuevaCantidad > (producto.unidadesExistentes || 0)) { showToast(`Stock insuficiente. Disponible: ${producto.unidadesExistentes}`, 'error'); return; } }
    item.cantidad = nuevaCantidad;
    recalcularSubtotal(item);
    safeSetItem(STORAGE_KEYS.CARRITO, carrito);
    actualizarCarrito();
}
function cambiarUnidadCarrito(index, unidad) {
    if (!carrito[index]) return;
    const item = carrito[index];
    if (unidad === 'gramo' && item.unidad === 'unidad') item.cantidad = item.cantidad * 1000;
    else if (unidad === 'unidad' && item.unidad === 'gramo') item.cantidad = item.cantidad / 1000;
    item.unidad = unidad;
    recalcularSubtotal(item);
    safeSetItem(STORAGE_KEYS.CARRITO, carrito);
    actualizarCarrito();
}
function eliminarDelCarrito(index) { carrito.splice(index,1); safeSetItem(STORAGE_KEYS.CARRITO, carrito); actualizarCarrito(); }
