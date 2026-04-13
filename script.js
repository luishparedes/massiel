// ============================================
// CALCULADORA MÁGICA - VERSIÓN PROFESIONAL COMPLETA v3.0
// MEJORAS: Pagos Mixtos, Ticket Térmico POS, Reportes Mejorados
// ============================================

// ===== PROTECCIÓN AVANZADA =====
(function() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    
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
let tasaBCVGuardada = 0;      // Tasa para convertir USD a moneda local (por defecto VES)
let monedaSeleccionada = 'VES'; // Moneda activa: VES, EUR, CLP, COP, PEN
let tasaMonedaActual = 0;       // Tasa de cambio para la moneda seleccionada (1 USD = ?)
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
    pagos: [],      // { metodo, montoMoneda, montoDolares, detalles }
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
    inicializarSistemaInactividad();
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
        
        // Asegurar que cada crédito tenga id
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
        
        // Mostrar info de tasa en UI
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
    cargarDatosIniciales();
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
    
    // Recalcular precios en moneda para todos los productos
    productos.forEach(p => {
        p.precioUnitarioMoneda = redondear2Decimales(p.precioUnitarioDolar * tasaMonedaActual);
        p.precioMayorMoneda = redondear2Decimales(p.precioMayorDolar * tasaMonedaActual);
    });
    safeSetItem(STORAGE_KEYS.PRODUCTOS, productos);
    
    // Recalcular carrito
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

// ===== SISTEMA DE PAGO MIXTO (NUEVO) =====
function finalizarVenta() {
    if (carrito.length === 0) { showToast('Carrito vacío', 'warning'); return; }
    for (let item of carrito) {
        const producto = productos[item.indexProducto];
        if (!producto) continue;
        if (item.unidad === 'gramo') { if (item.cantidad > (producto.unidadesExistentes * 1000)) { showToast(`Stock insuficiente para ${item.nombre}`, 'error'); return; } }
        else { if (item.cantidad > producto.unidadesExistentes) { showToast(`Stock insuficiente para ${item.nombre}`, 'error'); return; } }
    }
    const totalMoneda = carrito.reduce((s,i)=>s+i.subtotal,0);
    const totalDolares = carrito.reduce((s,i)=>s+i.subtotalDolar,0);
    
    // Inicializar pago mixto
    pagoMixtoActual = {
        totalMoneda: totalMoneda,
        totalDolares: totalDolares,
        pagos: [],
        totalPagadoMoneda: 0,
        totalPagadoDolares: 0,
        vueltoMoneda: 0,
        completado: false
    };
    
    actualizarModalPagoMixto();
    document.getElementById('modalPagoMixto').style.display = 'block';
}

function actualizarModalPagoMixto() {
    const simbolo = monedaSeleccionada;
    document.getElementById('resumenTotalPagoMoneda').textContent = pagoMixtoActual.totalMoneda.toFixed(2);
    document.getElementById('resumenTotalPagoDolares').textContent = pagoMixtoActual.totalDolares.toFixed(2);
    document.getElementById('totalPagadoMixto').textContent = pagoMixtoActual.totalPagadoMoneda.toFixed(2);
    document.getElementById('restanteMixto').textContent = (pagoMixtoActual.totalMoneda - pagoMixtoActual.totalPagadoMoneda).toFixed(2);
    document.getElementById('resumenMonedaSimbolo').textContent = simbolo;
    document.getElementById('totalPagadoMonedaSimbolo').textContent = simbolo;
    document.getElementById('restanteMonedaSimbolo').textContent = simbolo;
    document.getElementById('vueltoMonedaSimbolo').textContent = simbolo;
    
    const restante = pagoMixtoActual.totalMoneda - pagoMixtoActual.totalPagadoMoneda;
    if (restante <= 0) {
        pagoMixtoActual.vueltoMoneda = Math.abs(restante);
        document.getElementById('vueltoMixto').textContent = pagoMixtoActual.vueltoMoneda.toFixed(2);
        document.getElementById('btnConfirmarPagoMixto').disabled = false;
        document.getElementById('btnConfirmarPagoMixto').style.opacity = '1';
    } else {
        document.getElementById('vueltoMixto').textContent = '0.00';
        document.getElementById('btnConfirmarPagoMixto').disabled = true;
        document.getElementById('btnConfirmarPagoMixto').style.opacity = '0.5';
    }
    
    // Actualizar lista de pagos
    const listaDiv = document.getElementById('listaPagosMixtos');
    listaDiv.innerHTML = '';
    const nombresMetodos = {
        efectivo_bs: 'Efectivo Bs', efectivo_dolares: 'Efectivo $', punto: 'Punto',
        pago_movil: 'Pago Móvil', biopago: 'Biopago', credito: 'Crédito'
    };
    pagoMixtoActual.pagos.forEach((pago, idx) => {
        const div = document.createElement('div');
        div.style.cssText = 'display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;';
        div.innerHTML = `
            <span><strong>${nombresMetodos[pago.metodo] || pago.metodo}</strong></span>
            <span>${pago.montoMoneda.toFixed(2)} ${monedaSeleccionada}</span>
            <button onclick="eliminarPagoMixto(${idx})" style="background:#f44336; padding:2px 8px; min-width:auto;">X</button>
        `;
        listaDiv.appendChild(div);
    });
    if (pagoMixtoActual.pagos.length === 0) {
        listaDiv.innerHTML = '<div style="text-align:center; color:#999; padding:10px;">No hay pagos registrados</div>';
    }
}

function agregarPagoMixto(metodo) {
    const restante = pagoMixtoActual.totalMoneda - pagoMixtoActual.totalPagadoMoneda;
    if (restante <= 0) {
        showToast('El total ya está cubierto', 'warning');
        return;
    }
    
    if (metodo === 'credito') {
        // Redirigir a créditos
        cerrarModalPagoMixto();
        showSection('creditos');
        document.getElementById('montoCredito').value = pagoMixtoActual.totalMoneda.toFixed(2);
        document.getElementById('monedaCredito').value = 'Bs';
        if (!document.getElementById('diasCredito').value) document.getElementById('diasCredito').value = '30';
        showToast('Complete los datos del crédito', 'info');
        return;
    }
    
    // Mostrar formulario para el método
    const detalleDiv = document.getElementById('detallePagoMixto');
    detalleDiv.style.display = 'block';
    const simbolo = metodo === 'efectivo_dolares' ? 'USD' : monedaSeleccionada;
    const montoMaximo = metodo === 'efectivo_dolares' ? (restante / tasaMonedaActual) : restante;
    
    if (metodo === 'efectivo_bs' || metodo === 'efectivo_dolares') {
        detalleDiv.innerHTML = `
            <h4>${metodo === 'efectivo_bs' ? 'Efectivo en Bolívares' : 'Efectivo en Dólares'}</h4>
            <div><label>Monto a pagar (${simbolo}):</label><input type="number" id="montoPagoMixto" step="0.01" placeholder="Monto máximo: ${montoMaximo.toFixed(2)}"></div>
            <div style="margin-top:10px;"><button onclick="procesarPagoMixto('${metodo}')" style="background:#4CAF50;">Agregar Pago</button></div>
        `;
    } else if (metodo === 'punto' || metodo === 'biopago') {
        detalleDiv.innerHTML = `
            <h4>${metodo === 'punto' ? 'Punto de Venta' : 'Biopago'}</h4>
            <div><label>Monto a pagar (${simbolo}):</label><input type="number" id="montoPagoMixto" step="0.01" placeholder="Monto máximo: ${montoMaximo.toFixed(2)}"></div>
            <div style="margin-top:10px;"><button onclick="procesarPagoMixto('${metodo}')" style="background:#4CAF50;">Agregar Pago</button></div>
        `;
    } else if (metodo === 'pago_movil') {
        detalleDiv.innerHTML = `
            <h4>Pago Móvil</h4>
            <div><label>Monto (${simbolo}):</label><input type="number" id="montoPagoMixto" step="0.01" placeholder="Monto máximo: ${montoMaximo.toFixed(2)}"></div>
            <div><label>Referencia:</label><input type="text" id="refPagoMixto"></div>
            <div><label>Banco:</label><input type="text" id="bancoPagoMixto"></div>
            <div style="margin-top:10px;"><button onclick="procesarPagoMixto('${metodo}')" style="background:#4CAF50;">Agregar Pago</button></div>
        `;
    }
}

function procesarPagoMixto(metodo) {
    const restanteMoneda = pagoMixtoActual.totalMoneda - pagoMixtoActual.totalPagadoMoneda;
    let montoMoneda = 0;
    let montoDolares = 0;
    let detalles = {};
    
    if (metodo === 'efectivo_dolares') {
        const montoUsd = parseFloat(document.getElementById('montoPagoMixto')?.value) || 0;
        if (montoUsd <= 0) { showToast('Ingrese un monto válido', 'error'); return; }
        montoDolares = montoUsd;
        montoMoneda = montoUsd * tasaMonedaActual;
        if (montoMoneda > restanteMoneda + 0.01) {
            const vueltoUsd = (montoMoneda - restanteMoneda) / tasaMonedaActual;
            showToast(`El pago excede el total. Vuelto en USD: $${vueltoUsd.toFixed(2)}`, 'warning');
            montoMoneda = restanteMoneda;
            montoDolares = restanteMoneda / tasaMonedaActual;
        }
        detalles = { montoRecibido: montoUsd, cambio: montoDolares - (restanteMoneda / tasaMonedaActual) };
    } else {
        const monto = parseFloat(document.getElementById('montoPagoMixto')?.value) || 0;
        if (monto <= 0) { showToast('Ingrese un monto válido', 'error'); return; }
        montoMoneda = monto;
        montoDolares = monto / tasaMonedaActual;
        if (montoMoneda > restanteMoneda + 0.01) {
            const vuelto = montoMoneda - restanteMoneda;
            showToast(`El pago excede el total. Vuelto: ${vuelto.toFixed(2)} ${monedaSeleccionada}`, 'warning');
            montoMoneda = restanteMoneda;
            montoDolares = restanteMoneda / tasaMonedaActual;
        }
        detalles = { montoRecibido: monto, cambio: monto - restanteMoneda };
    }
    
    if (metodo === 'pago_movil') {
        const ref = document.getElementById('refPagoMixto')?.value.trim();
        const banco = document.getElementById('bancoPagoMixto')?.value.trim();
        if (!ref || !banco) { showToast('Complete referencia y banco', 'error'); return; }
        detalles = { referencia: ref, banco: banco, monto: montoMoneda };
    }
    
    pagoMixtoActual.pagos.push({
        metodo: metodo,
        montoMoneda: redondear2Decimales(montoMoneda),
        montoDolares: redondear2Decimales(montoDolares),
        detalles: detalles
    });
    
    pagoMixtoActual.totalPagadoMoneda += montoMoneda;
    pagoMixtoActual.totalPagadoDolares += montoDolares;
    
    document.getElementById('detallePagoMixto').style.display = 'none';
    actualizarModalPagoMixto();
    showToast(`Pago agregado: ${montoMoneda.toFixed(2)} ${monedaSeleccionada}`, 'success');
}

function eliminarPagoMixto(index) {
    const pago = pagoMixtoActual.pagos[index];
    pagoMixtoActual.totalPagadoMoneda -= pago.montoMoneda;
    pagoMixtoActual.totalPagadoDolares -= pago.montoDolares;
    pagoMixtoActual.pagos.splice(index, 1);
    actualizarModalPagoMixto();
}

function confirmarPagoMixto() {
    if (pagoMixtoActual.totalPagadoMoneda < pagoMixtoActual.totalMoneda - 0.01) {
        showToast('El monto pagado es insuficiente', 'error');
        return;
    }
    
    pagoMixtoActual.completado = true;
    
    // Descontar inventario
    carrito.forEach(item => {
        const producto = productos[item.indexProducto];
        if (producto) {
            const cantidadVendida = item.unidad === 'gramo' ? item.cantidad / 1000 : item.cantidad;
            producto.unidadesExistentes = redondear2Decimales(producto.unidadesExistentes - cantidadVendida);
            if (producto.unidadesExistentes < 0) producto.unidadesExistentes = 0;
        }
    });
    safeSetItem(STORAGE_KEYS.PRODUCTOS, productos);
    
    // Registrar venta
    const ahora = new Date();
    const metodoStr = pagoMixtoActual.pagos.length === 1 ? pagoMixtoActual.pagos[0].metodo : 'mixto';
    const ventaRegistro = {
        fecha: ahora.toLocaleDateString(), hora: ahora.toLocaleTimeString(),
        total: pagoMixtoActual.totalMoneda, totalDolares: pagoMixtoActual.totalDolares,
        metodoPago: metodoStr, metodoDetalles: pagoMixtoActual.pagos,
        monedaUsada: monedaSeleccionada, tasaCambio: tasaMonedaActual,
        items: carrito.map(item => ({ nombre: item.nombre, cantidad: item.cantidad, unidad: item.unidad, subtotal: item.subtotal, precioUnitarioMoneda: item.precioUnitarioMoneda }))
    };
    ventasDiarias.push(ventaRegistro);
    safeSetItem(STORAGE_KEYS.VENTAS, ventasDiarias);
    
    showToast(`✅ Venta completada por ${pagoMixtoActual.totalMoneda.toFixed(2)} ${monedaSeleccionada}`, 'success');
    
    // Imprimir ticket
    const ticketData = {
        ...pagoMixtoActual,
        fecha: ahora.toLocaleString(),
        moneda: monedaSeleccionada,
        items: JSON.parse(JSON.stringify(carrito)),
        nombreNegocio: nombreEstablecimiento
    };
    imprimirTicketTermico(ticketData);
    
    // Limpiar carrito
    carrito = [];
    safeSetItem(STORAGE_KEYS.CARRITO, carrito);
    actualizarCarrito();
    actualizarListaProductos();
    actualizarEstadisticas();
    cerrarModalPagoMixto();
}

function cerrarModalPagoMixto() {
    document.getElementById('modalPagoMixto').style.display = 'none';
    pagoMixtoActual = {
        totalMoneda: 0, totalDolares: 0, pagos: [], totalPagadoMoneda: 0, totalPagadoDolares: 0, vueltoMoneda: 0, completado: false
    };
}

// ===== TICKET TÉRMICO OPTIMIZADO (POS) =====
function imprimirTicketTermico(datos) {
    const metodoStr = datos.pagos.length === 1 ? datos.pagos[0].metodo : 'Múltiples métodos';
    let detallesPago = '';
    if (datos.pagos.length > 1) {
        const nombresMetodos = {
            efectivo_bs: 'Efectivo Bs', efectivo_dolares: 'Efectivo $', punto: 'Punto',
            pago_movil: 'Pago Móvil', biopago: 'Biopago', credito: 'Crédito'
        };
        detallesPago = '<div class="payment-details"><strong>Desglose de pagos:</strong><br>';
        datos.pagos.forEach(p => {
            detallesPago += `${nombresMetodos[p.metodo] || p.metodo}: ${p.montoMoneda.toFixed(2)} ${datos.moneda}<br>`;
        });
        detallesPago += '</div>';
    }
    
    const ticketHTML = `
        <div class="ticket-print-area" style="width: 80mm; margin: 0 auto; font-family: 'Courier New', monospace; font-size: 10pt; padding: 2mm;">
            <div class="ticket-header" style="text-align: center;">
                <strong>${datos.nombreNegocio || nombreEstablecimiento || 'MI NEGOCIO'}</strong><br>
                ${datos.fecha}<br>
                Venta #${Date.now().toString().slice(-8)}<br>
                ---------------------------------
            </div>
            <div class="ticket-items">
                <table style="width:100%; border-collapse:collapse;">
                    <thead><tr><th>Producto</th><th>Cant</th><th>P/U</th><th>Subtotal</th></tr></thead>
                    <tbody>
                        ${datos.items.map(item => `<tr><td>${item.nombre.substring(0,20)}</td><td style="text-align:center">${item.cantidad} ${item.unidad==='gramo'?'g':''}</td><td style="text-align:right">${item.precioUnitarioMoneda.toFixed(2)}</td><td style="text-align:right">${item.subtotal.toFixed(2)}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
            <div style="text-align:right; margin-top:5px;">
                ---------------------------------<br>
                <strong>TOTAL: ${datos.totalMoneda.toFixed(2)} ${datos.moneda}</strong><br>
                (USD: $${datos.totalDolares.toFixed(2)})<br>
                Método: ${metodoStr}<br>
                ${datos.vueltoMoneda > 0 ? `Vuelto: ${datos.vueltoMoneda.toFixed(2)} ${datos.moneda}<br>` : ''}
                ${detallesPago}
                ---------------------------------<br>
                ¡Gracias por su compra!
            </div>
        </div>
    `;
    
    const ventana = window.open('', '_blank');
    ventana.document.write(`
        <html><head><title>Ticket de Venta</title>
        <style>
            @media print {
                body { margin: 0; padding: 0; }
                .ticket-print-area { width: 80mm; margin: 0; font-family: 'Courier New', monospace; font-size: 10pt; }
                .no-print { display: none; }
            }
        </style>
        </head><body>${ticketHTML}<div class="no-print" style="text-align:center; margin-top:20px;"><button onclick="window.print();setTimeout(()=>window.close(),500);">Imprimir Ticket</button></div></body></html>
    `);
    ventana.document.close();
}

// ===== REPORTE DIARIO MEJORADO =====
function mostrarReporteDiario() {
    const container = document.getElementById('reporteDiarioContainer');
    if (!container) return;
    const hoy = new Date().toLocaleDateString();
    const ventasHoy = ventasDiarias.filter(v => v.fecha === hoy);
    if (ventasHoy.length === 0) { showToast('No hay ventas hoy', 'warning'); return; }
    let totalGeneral = 0;
    const totalesPorMetodo = {};
    ventasHoy.forEach(venta => {
        totalGeneral += venta.total || 0;
        const metodo = venta.metodoPago === 'mixto' ? 'Mixto' : (venta.metodoPago || 'otro');
        totalesPorMetodo[metodo] = (totalesPorMetodo[metodo] || 0) + (venta.total || 0);
    });
    document.getElementById('reporteTotalGeneral').textContent = `${totalGeneral.toFixed(2)} ${monedaSeleccionada}`;
    document.getElementById('reporteCantidadVentas').textContent = ventasHoy.length;
    const sueldo = (totalGeneral / 100) * 20;
    document.getElementById('sueldoMonto').textContent = `${sueldo.toFixed(2)} ${monedaSeleccionada}`;
    const metodosContainer = document.getElementById('reporteTotalesMetodos');
    metodosContainer.innerHTML = '';
    const nombresMetodos = { efectivo_bs: 'Efectivo Bs', efectivo_dolares: 'Efectivo $', punto: 'Punto', pago_movil: 'Pago Móvil', biopago: 'Biopago', credito: 'Crédito', mixto: 'Mixto' };
    Object.keys(totalesPorMetodo).forEach(metodo => { const div = document.createElement('div'); div.innerHTML = `<strong>${nombresMetodos[metodo] || metodo}:</strong><br> ${totalesPorMetodo[metodo].toFixed(2)} ${monedaSeleccionada}`; metodosContainer.appendChild(div); });
    const tbody = document.getElementById('reporteDetalleBody');
    tbody.innerHTML = '';
    ventasHoy.sort((a,b)=>a.hora.localeCompare(b.hora)).forEach((venta, idx) => {
        const metodoMostrar = venta.metodoPago === 'mixto' ? 'Mixto' : (nombresMetodos[venta.metodoPago] || venta.metodoPago);
        const fila = document.createElement('tr');
        fila.innerHTML = `<td>#${idx+1}</td><td>${venta.hora}</td><td>${metodoMostrar}</td><td>${(venta.total||0).toFixed(2)} ${venta.monedaUsada || monedaSeleccionada}</td><td><button onclick="devolverVenta(${idx})" class="btn-secondary" style="padding:5px 10px; font-size:0.8rem;"><i class="fas fa-undo-alt"></i> Devolver</button></td>`;
        tbody.appendChild(fila);
    });
    container.style.display = 'block';
}
function devolverVenta(indiceVenta) {
    if (!verificarClaveEdicion()) return;
    const hoy = new Date().toLocaleDateString();
    const ventasHoy = ventasDiarias.filter(v => v.fecha === hoy);
    const venta = ventasHoy[indiceVenta];
    if (!venta) { showToast('Venta no encontrada', 'error'); return; }
    // Reintegrar productos al inventario
    if (venta.items) {
        venta.items.forEach(item => {
            const producto = productos.find(p => p.nombre === item.nombre);
            if (producto) {
                const cantidadDevuelta = item.unidad === 'gramo' ? item.cantidad / 1000 : item.cantidad;
                producto.unidadesExistentes = redondear2Decimales(producto.unidadesExistentes + cantidadDevuelta);
            }
        });
        safeSetItem(STORAGE_KEYS.PRODUCTOS, productos);
    }
    // Eliminar la venta del reporte diario
    const indiceReal = ventasDiarias.findIndex(v => v.fecha === hoy && v.hora === venta.hora && v.total === venta.total);
    if (indiceReal !== -1) ventasDiarias.splice(indiceReal, 1);
    safeSetItem(STORAGE_KEYS.VENTAS, ventasDiarias);
    showToast('Venta devuelta correctamente', 'success');
    actualizarTodo();
    mostrarReporteDiario(); // refrescar
}
function cerrarReporteDiario() { document.getElementById('reporteDiarioContainer').style.display = 'none'; }
function generarPDFReporteDiario() { showToast('Función PDF disponible', 'info'); }
function limpiarVentasDiarias() {
    if (!confirm('¿Limpiar todas las ventas del día?')) return;
    const hoy = new Date().toLocaleDateString();
    ventasDiarias = ventasDiarias.filter(v => v.fecha !== hoy);
    safeSetItem(STORAGE_KEYS.VENTAS, ventasDiarias);
    cerrarReporteDiario();
    showToast('Ventas del día limpiadas', 'success');
}
function mostrarListaCostos() {
    const container = document.getElementById('listaCostosContainer');
    const lista = document.getElementById('listaCostos');
    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';
        lista.innerHTML = '';
        [...productos].sort((a,b)=>a.nombre.localeCompare(b.nombre)).forEach(p => { const li = document.createElement('li'); li.style.cssText = 'padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;'; li.innerHTML = `<span>${p.nombre} (${p.descripcion})</span><span><strong>$${(p.costo/p.unidadesPorCaja).toFixed(2)}</strong> / ${p.precioUnitarioMoneda.toFixed(2)} ${monedaSeleccionada}</span>`; lista.appendChild(li); });
    } else { container.style.display = 'none'; }
}
function mostrarOpcionesPDF() { const modal = document.getElementById('modalCategorias'); if(modal){ llenarContenedorCategorias('categoriasPDFContainer','pdf'); modal.style.display='block'; } }
function cerrarModalCategorias() { document.getElementById('modalCategorias').style.display='none'; }
function generarPDFPorCategoria(categoria) { showToast('Función PDF disponible', 'info'); cerrarModalCategorias(); }
function generarEtiquetasAnaqueles() { const modal = document.getElementById('modalEtiquetas'); if(modal){ llenarContenedorCategorias('categoriasEtiquetasContainer','etiqueta'); modal.style.display='block'; document.getElementById('monedaEtiquetas').value=monedaEtiquetas; } }
function cerrarModalEtiquetas() { document.getElementById('modalEtiquetas').style.display='none'; }
function actualizarMonedaEtiquetas() { const selector = document.getElementById('monedaEtiquetas'); if(selector){ monedaEtiquetas=selector.value; localStorage.setItem(STORAGE_KEYS.MONEDA_ETIQUETAS,monedaEtiquetas); } }
function llenarContenedorCategorias(containerId, tipo) {
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = '';
    const btnTodos = document.createElement('button'); btnTodos.textContent='TODOS LOS PRODUCTOS'; btnTodos.style.gridColumn='span 3'; btnTodos.style.background=tipo==='pdf'?'#4CAF50':'#FF9800'; btnTodos.onclick=()=>{ if(tipo==='pdf') generarPDFPorCategoria('todos'); else generarEtiquetasPorCategoria('todos'); }; container.appendChild(btnTodos);
    categoriasPersonalizadas.forEach(cat => { const btn = document.createElement('button'); btn.textContent=cat.charAt(0).toUpperCase()+cat.slice(1).replace(/_/g,' '); btn.onclick=()=>{ if(tipo==='pdf') generarPDFPorCategoria(cat); else generarEtiquetasPorCategoria(cat); }; container.appendChild(btn); });
}
function generarEtiquetasPorCategoria(categoria) { showToast('Generando etiquetas...', 'info'); cerrarModalEtiquetas(); }
function descargarBackup() {
    const backup = { productos, nombreEstablecimiento, tasaBCV: tasaBCVGuardada, monedaSeleccionada, tasaMonedaActual, ventasDiarias, carrito, claveSeguridad, claveEdicion, monedaEtiquetas, creditos, categoriasPersonalizadas, nextCreditoId, fecha: new Date().toISOString(), version:'3.0' };
    const blob = new Blob([JSON.stringify(backup,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`respaldo_${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
    showToast('Respaldo descargado','success');
}
function cargarBackup(files) {
    if(!files||!files.length) return;
    const file=files[0];
    if(!file.name.endsWith('.json')){ showToast('Seleccione JSON','error'); return; }
    const reader=new FileReader();
    reader.onload=function(e){
        try{
            const backup=JSON.parse(e.target.result);
            if(!backup.productos) throw new Error();
            if(confirm('¿Cargar respaldo? Se perderán los datos actuales.')){
                localStorage.clear();
                localStorage.setItem(STORAGE_KEYS.PRODUCTOS,JSON.stringify(backup.productos));
                localStorage.setItem(STORAGE_KEYS.NOMBRE,backup.nombreEstablecimiento||'');
                localStorage.setItem(STORAGE_KEYS.TASA_BCV,backup.tasaBCV||'0');
                localStorage.setItem(STORAGE_KEYS.MONEDA_SELECCIONADA,backup.monedaSeleccionada||'VES');
                localStorage.setItem(STORAGE_KEYS.TASA_MONEDA,backup.tasaMonedaActual||'0');
                localStorage.setItem(STORAGE_KEYS.VENTAS,JSON.stringify(backup.ventasDiarias||[]));
                localStorage.setItem(STORAGE_KEYS.CARRITO,JSON.stringify(backup.carrito||[]));
                localStorage.setItem(STORAGE_KEYS.CLAVE,backup.claveSeguridad||'1234');
                localStorage.setItem(STORAGE_KEYS.CLAVE_EDICION,backup.claveEdicion||'');
                localStorage.setItem(STORAGE_KEYS.MONEDA_ETIQUETAS,backup.monedaEtiquetas||'VES');
                localStorage.setItem(STORAGE_KEYS.CREDITOS,JSON.stringify(backup.creditos||[]));
                localStorage.setItem(STORAGE_KEYS.CATEGORIAS,JSON.stringify(backup.categoriasPersonalizadas||[]));
                localStorage.setItem(STORAGE_KEYS.NEXT_CREDITO_ID,backup.nextCreditoId||1);
                showToast('Respaldo cargado. Recargando...','success');
                setTimeout(()=>window.location.reload(),1500);
            }
        }catch(error){ showToast('Error al cargar archivo','error'); }
    };
    reader.readAsText(file);
    document.getElementById('fileInput').value='';
}
function toggleCopyrightNotice() { document.getElementById('copyrightNotice').classList.toggle('show'); }

// ===== CRÉDITOS =====
function inicializarCreditos() {
    creditos = creditos.map(c => ({ ...c, productos: c.productos || [], estado: calcularEstadoCredito(c) }));
    actualizarVistaCreditos();
    setInterval(verificarCreditosPorVencer, 3600000);
    setTimeout(verificarCreditosPorVencer, 5000);
}
function guardarCreditosStorage() {
    safeSetItem(STORAGE_KEYS.CREDITOS, creditos);
    localStorage.setItem(STORAGE_KEYS.NEXT_CREDITO_ID, nextCreditoId);
}
function calcularFechaVencimiento(fechaInicio, dias) { const fecha = new Date(fechaInicio); fecha.setDate(fecha.getDate() + parseInt(dias)); return fecha.toISOString().split('T')[0]; }
function calcularEstadoCredito(credito) {
    if (credito.estado === 'pagado') return 'pagado';
    const hoy = new Date();
    const fechaVencimiento = new Date(credito.fechaVencimiento || calcularFechaVencimiento(credito.fechaInicio, credito.dias));
    const diffDays = Math.ceil((fechaVencimiento - hoy) / (1000*60*60*24));
    if (diffDays < 0) return 'vencido';
    if (diffDays <= 3) return 'porVencer';
    return 'activo';
}
function calcularDiasRestantes(credito) {
    if (credito.estado === 'pagado') return 0;
    const hoy = new Date();
    const fechaVencimiento = new Date(credito.fechaVencimiento || calcularFechaVencimiento(credito.fechaInicio, credito.dias));
    return Math.ceil((fechaVencimiento - hoy) / (1000*60*60*24));
}
function formatearMontoCredito(credito) {
    const simbolo = credito.moneda === 'USD' ? '$' : 'Bs';
    return `${simbolo} ${parseFloat(credito.monto).toFixed(2)}`;
}
function verificarCreditosPorVencer() {
    creditos.forEach(credito => {
        if (credito.estado === 'pagado') return;
        const nuevoEstado = calcularEstadoCredito(credito);
        if (nuevoEstado !== credito.estado) {
            credito.estado = nuevoEstado;
            const dias = calcularDiasRestantes(credito);
            if (dias === 3) showToast(`⚠️ Crédito de ${credito.cliente} vence en 3 días`, 'warning', 8000);
            else if (dias === 1) showToast(`⚠️ ⚠️ Crédito de ${credito.cliente} vence MAÑANA`, 'warning', 8000);
            else if (dias === 0) showToast(`⚠️ ⚠️ ⚠️ Crédito de ${credito.cliente} vence HOY`, 'warning', 8000);
            else if (dias < 0) showToast(`❌ Crédito de ${credito.cliente} VENCIDO`, 'error', 8000);
        }
    });
    guardarCreditosStorage();
    actualizarVistaCreditos();
}
function actualizarVistaCreditos() {
    actualizarEstadisticasCreditos();
    actualizarListaCreditos();
    actualizarDatalistClientes();
}
function actualizarEstadisticasCreditos() {
    const activos = creditos.filter(c => c.estado !== 'pagado');
    const porVencer = creditos.filter(c => c.estado === 'porVencer');
    const vencidos = creditos.filter(c => c.estado === 'vencido');
    let totalAdeudado = 0;
    activos.forEach(c => { if (c.moneda === 'USD') totalAdeudado += parseFloat(c.monto) * (tasaBCVGuardada || 0); else totalAdeudado += parseFloat(c.monto); });
    document.getElementById('totalClientesCredito').textContent = activos.length;
    document.getElementById('creditosPorVencer').textContent = porVencer.length;
    document.getElementById('creditosVencidos').textContent = vencidos.length;
    document.getElementById('totalAdeudado').textContent = `Bs ${totalAdeudado.toFixed(2)}`;
}
function actualizarDatalistClientes() {
    const datalist = document.getElementById('clientesList');
    if (!datalist) return;
    const nombresUnicos = [...new Set(creditos.map(c => c.cliente))];
    datalist.innerHTML = '';
    nombresUnicos.forEach(nombre => { const option = document.createElement('option'); option.value = nombre; datalist.appendChild(option); });
}
function actualizarListaCreditos() {
    const tbody = document.getElementById('creditosBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    let lista = creditosFiltrados.length ? creditosFiltrados : creditos;
    if (filtroActual !== 'todos') lista = lista.filter(c => c.estado === filtroActual);
    lista.sort((a,b) => new Date(a.fechaVencimiento||calcularFechaVencimiento(a.fechaInicio,a.dias)) - new Date(b.fechaVencimiento||calcularFechaVencimiento(b.fechaInicio,b.dias)));
    lista.forEach(credito => {
        const estado = calcularEstadoCredito(credito);
        const diasRestantes = calcularDiasRestantes(credito);
        const fechaVencimiento = credito.fechaVencimiento || calcularFechaVencimiento(credito.fechaInicio, credito.dias);
        let claseEstado = 'estado-activo', textoEstado = 'Activo';
        if (estado === 'vencido') { claseEstado = 'estado-vencido'; textoEstado = 'VENCIDO'; }
        else if (estado === 'porVencer') { claseEstado = 'estado-por-vencer'; textoEstado = 'Por vencer'; }
        else if (estado === 'pagado') { claseEstado = 'estado-pagado'; textoEstado = 'Pagado'; }
        const tieneProductos = credito.productos && credito.productos.length > 0;
        const fila = document.createElement('tr');
        if (estado === 'vencido') fila.classList.add('vencido');
        else if (estado === 'porVencer') fila.classList.add('por-vencer');
        fila.innerHTML = `
            <td><strong>${credito.cliente}</strong></td>
            <td>${formatearMontoCredito(credito)}</td>
            <td>${new Date(credito.fechaInicio).toLocaleDateString()}</td>
            <td>${new Date(fechaVencimiento).toLocaleDateString()}</td>
            <td><span class="${claseEstado}">${textoEstado}</span></td>
            <td>${diasRestantes > 0 ? diasRestantes : Math.abs(diasRestantes)} días ${diasRestantes < 0 ? '(vencido)' : ''}</td>
            <td>${tieneProductos ? `<span onclick="verProductosCredito(${credito.id})" class="producto-tooltip" title="Ver productos"><i class="fas fa-eye"></i> Ver</span>` : '<span style="color:#999;">Sin productos</span>'}</td>
            <td><div class="ajuste-inventario"><button onclick="editarCredito(${credito.id})" class="btn-secondary"><i class="fas fa-edit"></i></button><button onclick="eliminarCredito(${credito.id})" class="btn-danger"><i class="fas fa-trash"></i></button>${estado !== 'pagado' ? `<button onclick="marcarComoPagado(${credito.id})" class="btn-success"><i class="fas fa-check"></i></button>` : ''}</div></td>
        `;
        tbody.appendChild(fila);
    });
}
function guardarCredito() {
    const cliente = document.getElementById('clienteNombre').value.trim();
    const monto = parseFloat(document.getElementById('montoCredito').value);
    const moneda = document.getElementById('monedaCredito').value;
    const dias = parseInt(document.getElementById('diasCredito').value);
    let fechaInicio = document.getElementById('fechaInicioCredito').value;
    if (!cliente) return showToast('Ingrese nombre del cliente', 'error');
    if (!monto || monto <= 0) return showToast('Monto válido', 'error');
    if (!dias || dias <= 0) return showToast('Días de crédito', 'error');
    if (!fechaInicio) fechaInicio = new Date().toISOString().split('T')[0];
    const fechaVencimiento = calcularFechaVencimiento(fechaInicio, dias);
    let productosCredito = [];
    let totalBs = 0, totalDolares = 0;
    if (carrito && carrito.length > 0 && confirm('¿Incluir los productos del carrito en este crédito? Se descontarán del inventario.')) {
        carrito.forEach(item => {
            const producto = productos[item.indexProducto];
            if (producto) {
                const cantidadVendida = item.unidad === 'gramo' ? item.cantidad / 1000 : item.cantidad;
                producto.unidadesExistentes = redondear2Decimales(producto.unidadesExistentes - cantidadVendida);
                if (producto.unidadesExistentes < 0) producto.unidadesExistentes = 0;
                totalBs += item.subtotal;
                totalDolares += item.subtotalDolar;
            }
        });
        safeSetItem(STORAGE_KEYS.PRODUCTOS, productos);
        actualizarEstadisticas();
        productosCredito = carrito.map(item => ({ nombre: item.nombre, cantidad: item.cantidad, unidad: item.unidad, subtotal: item.subtotal, precioUnitarioMoneda: item.precioUnitarioMoneda, precioUnitarioDolar: item.precioUnitarioDolar }));
        const ahora = new Date();
        const ventaRegistro = { fecha: ahora.toLocaleDateString(), hora: ahora.toLocaleTimeString(), total: totalBs, totalDolares: totalDolares, metodoPago: 'credito', monedaUsada: monedaSeleccionada, tasaCambio: tasaMonedaActual, items: carrito.map(item => ({ nombre: item.nombre, cantidad: item.cantidad, unidad: item.unidad, subtotal: item.subtotal })) };
        ventasDiarias.push(ventaRegistro);
        safeSetItem(STORAGE_KEYS.VENTAS, ventasDiarias);
        carrito = [];
        safeSetItem(STORAGE_KEYS.CARRITO, carrito);
        actualizarCarrito();
    }
    if (creditoEditando !== null) {
        const index = creditos.findIndex(c => c.id === creditoEditando);
        if (index !== -1) {
            creditos[index] = { ...creditos[index], cliente, monto, moneda, dias, fechaInicio, fechaVencimiento, productos: [...(creditos[index].productos || []), ...productosCredito] };
            showToast('Crédito actualizado', 'success');
        }
        creditoEditando = null;
        document.getElementById('formCreditoTitle').textContent = 'Registrar Nuevo Crédito';
        document.getElementById('btnGuardarCredito').innerHTML = '<i class="fas fa-save"></i> Guardar Crédito';
        document.getElementById('btnCancelarCredito').style.display = 'none';
    } else {
        const nuevoCredito = { id: nextCreditoId++, cliente, monto, moneda, dias, fechaInicio, fechaVencimiento, fechaRegistro: new Date().toISOString(), estado: 'activo', productos: productosCredito };
        creditos.push(nuevoCredito);
        showToast('Crédito registrado', 'success');
    }
    guardarCreditosStorage();
    limpiarFormularioCredito();
    creditosFiltrados = [];
    filtroActual = 'todos';
    actualizarFiltrosUI();
    actualizarVistaCreditos();
}
function editarCredito(id) {
    const credito = creditos.find(c => c.id === id);
    if (!credito) { showToast('Crédito no encontrado', 'error'); return; }
    document.getElementById('clienteNombre').value = credito.cliente;
    document.getElementById('montoCredito').value = credito.monto;
    document.getElementById('monedaCredito').value = credito.moneda;
    document.getElementById('diasCredito').value = credito.dias;
    document.getElementById('fechaInicioCredito').value = credito.fechaInicio;
    creditoEditando = credito.id;
    document.getElementById('formCreditoTitle').textContent = 'Editando Crédito';
    document.getElementById('btnGuardarCredito').innerHTML = '<i class="fas fa-check"></i> Actualizar Crédito';
    document.getElementById('btnCancelarCredito').style.display = 'inline-flex';
    document.getElementById('formCreditoCard').scrollIntoView({ behavior: 'smooth' });
}
function cancelarEdicionCredito() {
    limpiarFormularioCredito();
    creditoEditando = null;
    document.getElementById('formCreditoTitle').textContent = 'Registrar Nuevo Crédito';
    document.getElementById('btnGuardarCredito').innerHTML = '<i class="fas fa-save"></i> Guardar Crédito';
    document.getElementById('btnCancelarCredito').style.display = 'none';
}
function eliminarCredito(id) {
    if (confirm('¿Eliminar este crédito?')) {
        creditos = creditos.filter(c => c.id !== id);
        guardarCreditosStorage();
        creditosFiltrados = [];
        actualizarVistaCreditos();
        showToast('Crédito eliminado', 'success');
    }
}
function marcarComoPagado(id) {
    const credito = creditos.find(c => c.id === id);
    if (credito && confirm(`¿Marcar como pagado el crédito de ${credito.cliente}?`)) {
        credito.estado = 'pagado';
        guardarCreditosStorage();
        actualizarVistaCreditos();
        showToast('Crédito marcado como pagado', 'success');
    }
}
function limpiarFormularioCredito() {
    document.getElementById('clienteNombre').value = '';
    document.getElementById('montoCredito').value = '';
    document.getElementById('monedaCredito').value = 'Bs';
    document.getElementById('diasCredito').value = '';
    document.getElementById('fechaInicioCredito').value = '';
    document.getElementById('mensajeCredito').innerHTML = '';
}
function buscarCreditos() {
    const termino = document.getElementById('buscarCredito').value.trim().toLowerCase();
    creditosFiltrados = termino ? creditos.filter(c => c.cliente.toLowerCase().includes(termino) || c.monto.toString().includes(termino)) : [];
    actualizarListaCreditos();
}
function mostrarTodosCreditos() { document.getElementById('buscarCredito').value = ''; creditosFiltrados = []; actualizarListaCreditos(); }
function filtrarCreditos(filtro) { filtroActual = filtro; actualizarFiltrosUI(); actualizarListaCreditos(); }
function actualizarFiltrosUI() {
    document.querySelectorAll('.filtro-btn').forEach(btn => btn.classList.remove('active'));
    const btnMap = { todos:'filtroTodos', activos:'filtroActivos', porVencer:'filtroPorVencer', vencidos:'filtroVencidos' };
    const btnId = btnMap[filtroActual];
    if (btnId) document.getElementById(btnId).classList.add('active');
}
function verProductosCredito(id) {
    const credito = creditos.find(c => c.id === id);
    if (!credito) return;
    const modal = document.getElementById('modalProductosCredito');
    const contenido = document.getElementById('contenidoProductosCredito');
    if (credito.productos && credito.productos.length > 0) {
        let html = '<ul style="list-style:none; padding:0;">';
        credito.productos.forEach(prod => { html += `<li style="padding:8px; border-bottom:1px solid #eee;"><strong>${prod.nombre}</strong><br>Cantidad: ${prod.cantidad} ${prod.unidad==='gramo'?'g':'und'} | Subtotal: ${prod.subtotal.toFixed(2)} ${monedaSeleccionada}</li>`; });
        html += '</ul>';
        contenido.innerHTML = html;
    } else { contenido.innerHTML = '<p style="color:#999;">No hay productos registrados</p>'; }
    modal.style.display = 'block';
}
function cerrarModalProductosCredito() { document.getElementById('modalProductosCredito').style.display = 'none'; }

// ===== CATEGORÍAS =====
function mostrarGestionCategorias() {
    const modal = document.getElementById('modalGestionCategorias');
    if (!modal) return;
    const listaDiv = document.getElementById('listaCategorias');
    listaDiv.innerHTML = '';
    categoriasPersonalizadas.forEach((cat, idx) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'categoria-item';
        itemDiv.innerHTML = `<span class="categoria-nombre" ondblclick="editarCategoria(${idx})">${cat}</span><div class="categoria-acciones"><button onclick="editarCategoria(${idx})"><i class="fas fa-edit"></i></button><button onclick="eliminarCategoria(${idx})"><i class="fas fa-trash"></i></button></div>`;
        listaDiv.appendChild(itemDiv);
    });
    modal.style.display = 'block';
}
function cerrarGestionCategorias() { document.getElementById('modalGestionCategorias').style.display = 'none'; }
function agregarCategoria() {
    const input = document.getElementById('nuevaCategoria');
    const nombre = input.value.trim();
    if (!nombre) { showToast('Ingrese nombre', 'warning'); return; }
    if (categoriasPersonalizadas.some(c => c.toLowerCase() === nombre.toLowerCase())) { showToast('Categoría ya existe', 'error'); return; }
    categoriasPersonalizadas.push(nombre);
    guardarCategorias();
    actualizarSelectCategorias();
    mostrarGestionCategorias();
    input.value = '';
    showToast('Categoría agregada', 'success');
}
function editarCategoria(index) {
    const nueva = prompt('Editar categoría:', categoriasPersonalizadas[index]);
    if (!nueva || nueva.trim() === '') return;
    const nombreNuevo = nueva.trim();
    if (categoriasPersonalizadas.some((c,i) => i!==index && c.toLowerCase() === nombreNuevo.toLowerCase())) { showToast('Ya existe', 'error'); return; }
    const nombreAnterior = categoriasPersonalizadas[index];
    categoriasPersonalizadas[index] = nombreNuevo;
    guardarCategorias();
    productos.forEach(p => { if (p.descripcion === nombreAnterior) p.descripcion = nombreNuevo; });
    safeSetItem(STORAGE_KEYS.PRODUCTOS, productos);
    actualizarSelectCategorias();
    mostrarGestionCategorias();
    showToast('Categoría actualizada', 'success');
}
function eliminarCategoria(index) {
    const categoria = categoriasPersonalizadas[index];
    const productosEnCategoria = productos.filter(p => p.descripcion === categoria);
    if (productosEnCategoria.length > 0) {
        if (confirm(`La categoría "${categoria}" tiene ${productosEnCategoria.length} productos. ¿Eliminarla? Pasarán a "otros".`)) {
            productos.forEach(p => { if (p.descripcion === categoria) p.descripcion = 'otros'; });
            safeSetItem(STORAGE_KEYS.PRODUCTOS, productos);
            categoriasPersonalizadas.splice(index,1);
            guardarCategorias();
            actualizarSelectCategorias();
            mostrarGestionCategorias();
            showToast(`Categoría "${categoria}" eliminada. Productos movidos a "otros".`, 'info');
        }
    } else {
        if (confirm(`¿Eliminar categoría "${categoria}"?`)) {
            categoriasPersonalizadas.splice(index,1);
            guardarCategorias();
            actualizarSelectCategorias();
            mostrarGestionCategorias();
            showToast('Categoría eliminada', 'success');
        }
    }
}

// ===== EVENTOS =====
function configurarEventos() {
    const buscarInput = document.getElementById('buscar');
    if(buscarInput) buscarInput.addEventListener('input', function(){ clearTimeout(this.searchTimeout); this.searchTimeout = setTimeout(()=>buscarProducto(),500); });
    const codigoInput = document.getElementById('codigoBarrasInput');
    if(codigoInput){
        codigoInput.addEventListener('keydown', function(e) {
            if(e.key==='Enter'){ e.preventDefault(); if(this.value.trim()) procesarEscaneo(this.value.trim()); this.value=''; return; }
            if(e.key.length===1){ bufferEscaneo+=e.key; clearTimeout(window.bufferTimeout); window.bufferTimeout=setTimeout(()=>{ bufferEscaneo=''; },60); }
        });
        codigoInput.addEventListener('input', function(){
            const termino=this.value.trim().toLowerCase();
            const sugerenciasDiv=document.getElementById('sugerencias');
            if(!sugerenciasDiv) return;
            sugerenciasDiv.innerHTML='';
            if(termino.length<2) return;
            const coincidencias=productos.filter(p=> p.nombre.toLowerCase().includes(termino) || (p.codigoBarras && p.codigoBarras.toLowerCase().includes(termino))).slice(0,8);
            coincidencias.forEach(prod=>{ const opcion=document.createElement('div'); opcion.textContent=`${prod.nombre} (${prod.descripcion})`; opcion.onclick=()=>{ agregarProductoAlCarrito(prod); codigoInput.value=''; sugerenciasDiv.innerHTML=''; codigoInput.focus(); }; sugerenciasDiv.appendChild(opcion); });
        });
    }
    const buscarCreditoInput = document.getElementById('buscarCredito');
    if(buscarCreditoInput) buscarCreditoInput.addEventListener('input', function(){ clearTimeout(this.searchTimeout); this.searchTimeout = setTimeout(()=>buscarCreditos(),500); });
}
function configurarEventosMoviles() {
    const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if(!esMovil) return;
    document.addEventListener('touchstart', function(e){ if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT') setTimeout(()=>e.target.scrollIntoView({behavior:'smooth',block:'center'}),100); }, {passive:true});
}
function inicializarSistemaInactividad() {
    ['mousedown','mousemove','keypress','scroll','touchstart','click'].forEach(evento=>{ document.addEventListener(evento,registrarActividad,{passive:true}); });
    reiniciarTemporizador();
}
function registrarActividad() { ultimaActividad=Date.now(); reiniciarTemporizador(); }
function cargarDatosIniciales() {
    document.getElementById('nombreEstablecimiento').value = nombreEstablecimiento;
    document.getElementById('monedaSeleccionada').value = monedaSeleccionada;
    document.getElementById('tasaCambio').value = tasaMonedaActual;
    document.getElementById('monedaEtiquetas').value = monedaEtiquetas;
}

// ===== EXPORTAR GLOBALES =====
window.toggleSidebar = toggleSidebar;
window.showSection = showSection;
window.calcularPrecioVenta = calcularPrecioVenta;
window.guardarProducto = guardarProducto;
window.guardarCambiosProducto = guardarCambiosProducto;
window.editarProducto = editarProducto;
window.editarProductoConBoton = editarProductoConBoton;
window.eliminarProducto = eliminarProducto;
window.confirmarEliminacionProducto = confirmarEliminacionProducto;
window.cerrarModalConfirmacionEliminar = cerrarModalConfirmacionEliminar;
window.buscarProducto = buscarProducto;
window.agregarPorCodigoBarras = agregarPorCodigoBarras;
window.agregarProductoAlCarrito = agregarProductoAlCarrito;
window.actualizarCantidadCarrito = actualizarCantidadCarrito;
window.cambiarCantidadDirecta = cambiarCantidadDirecta;
window.cambiarUnidadCarrito = cambiarUnidadCarrito;
window.eliminarDelCarrito = eliminarDelCarrito;
window.finalizarVenta = finalizarVenta;
window.agregarPagoMixto = agregarPagoMixto;
window.procesarPagoMixto = procesarPagoMixto;
window.eliminarPagoMixto = eliminarPagoMixto;
window.confirmarPagoMixto = confirmarPagoMixto;
window.cerrarModalPagoMixto = cerrarModalPagoMixto;
window.guardarNombreEstablecimiento = guardarNombreEstablecimiento;
window.actualizarTasaCambio = actualizarTasaCambio;
window.mostrarListaCostos = mostrarListaCostos;
window.mostrarReporteDiario = mostrarReporteDiario;
window.cerrarReporteDiario = cerrarReporteDiario;
window.generarPDFReporteDiario = generarPDFReporteDiario;
window.limpiarVentasDiarias = limpiarVentasDiarias;
window.mostrarOpcionesPDF = mostrarOpcionesPDF;
window.cerrarModalCategorias = cerrarModalCategorias;
window.generarPDFPorCategoria = generarPDFPorCategoria;
window.generarEtiquetasAnaqueles = generarEtiquetasAnaqueles;
window.cerrarModalEtiquetas = cerrarModalEtiquetas;
window.actualizarMonedaEtiquetas = actualizarMonedaEtiquetas;
window.generarEtiquetasPorCategoria = generarEtiquetasPorCategoria;
window.descargarBackup = descargarBackup;
window.cargarBackup = cargarBackup;
window.toggleCopyrightNotice = toggleCopyrightNotice;
window.guardarClaveEdicion = guardarClaveEdicion;
window.probarClaveEdicion = probarClaveEdicion;
window.devolverVenta = devolverVenta;
window.guardarCredito = guardarCredito;
window.editarCredito = editarCredito;
window.cancelarEdicionCredito = cancelarEdicionCredito;
window.eliminarCredito = eliminarCredito;
window.marcarComoPagado = marcarComoPagado;
window.buscarCreditos = buscarCreditos;
window.mostrarTodosCreditos = mostrarTodosCreditos;
window.filtrarCreditos = filtrarCreditos;
window.verProductosCredito = verProductosCredito;
window.cerrarModalProductosCredito = cerrarModalProductosCredito;
window.mostrarGestionCategorias = mostrarGestionCategorias;
window.cerrarGestionCategorias = cerrarGestionCategorias;
window.agregarCategoria = agregarCategoria;
window.editarCategoria = editarCategoria;
window.eliminarCategoria = eliminarCategoria;
