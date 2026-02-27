// ============================================
// CALCULADORA MÁGICA - VERSIÓN PROFESIONAL COMPLETA
// CON SISTEMA DE CRÉDITOS MEJORADO Y REPORTE DIARIO OPTIMIZADO
// ============================================

// ===== PROTECCIÓN AVANZADA CONTRA INSPECCIÓN Y HERRAMIENTAS =====
(function() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    
    if (!isMobile) {
        document.addEventListener('keydown', function(e) {
            if (e.key === 'F2' || e.keyCode === 113) {
                e.preventDefault();
                return false;
            }
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
                e.preventDefault();
                return false;
            }
            if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                return false;
            }
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                return false;
            }
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                return false;
            }
        }, false);
        
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });
        
        document.addEventListener('copy', function(e) {
            e.preventDefault();
            return false;
        });
        
        document.addEventListener('cut', function(e) {
            e.preventDefault();
            return false;
        });
        
        document.addEventListener('selectstart', function(e) {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                return false;
            }
        });
        
        setInterval(function() {
            const widthThreshold = window.outerWidth - window.innerWidth > 160;
            const heightThreshold = window.outerHeight - window.innerHeight > 160;
            
            if (widthThreshold || heightThreshold) {
                console.clear();
            }
        }, 1000);
        
        if (isProduction) {
            setInterval(function() {
                console.clear();
            }, 3000);
            
            console.log = function() {};
            console.info = function() {};
            console.warn = function() {};
            console.debug = function() {};
        }
        
        const style = document.createElement('style');
        style.textContent = `
            body {
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }
            input, textarea, [contenteditable="true"] {
                -webkit-user-select: text;
                -moz-user-select: text;
                -ms-user-select: text;
                user-select: text;
            }
        `;
        document.head.appendChild(style);
        
        if (isProduction) {
            const dominiosPermitidos = [
                'portal.calculadoramagica.lat',
                'calculadoramagica.lat',
                'clientes.calculadoramagica.lat',
                'codepen.io',
                'cdpn.io',
                'github.io',
                'github.com',
                'raw.githubusercontent.com',
                'localhost',
                '127.0.0.1'
            ];
            
            const hostname = window.location.hostname;
            const permitido = dominiosPermitidos.some(dominio => 
                hostname === dominio || 
                hostname.endsWith('.' + dominio) ||
                hostname.includes(dominio)
            );
            
            if (!permitido) {
                console.warn('%c⚠️ Ejecutando en dominio no autorizado: ' + hostname, 'color: orange;');
            } else {
                console.log('%c✅ Dominio autorizado: ' + hostname, 'color: green;');
            }
        }
    }
})();

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

// ----- VARIABLES DE CRÉDITOS MEJORADAS -----
let creditos = [];
let creditoEditando = null;
let creditosFiltrados = [];
let filtroActual = 'todos';

// Variables para escáner
let tiempoUltimaTecla = 0;
let bufferEscaneo = '';

// Variable para eliminación
let productoEliminarPendiente = null;

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
    MONEDA: 'monedaEtiquetas',
    CREDITOS: 'creditos'
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
    console.log('🚀 Calculadora Mágica v2.1 iniciando');
    cargarDatosStorage();
    inicializarSistemaInactividad();
    configurarEventos();
    configurarEventosMoviles();
    actualizarTodo();
    actualizarAnioCopyright();
    
    setTimeout(() => {
        inicializarCreditos();
    }, 100);
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
        creditos = JSON.parse(localStorage.getItem(STORAGE_KEYS.CREDITOS)) || [];

        carrito = carrito.filter(item => item && item.nombre);
        
        creditos = creditos.map(c => ({
            ...c,
            productos: c.productos || [] // Asegurar que exista el array de productos
        }));
    } catch (error) {
        console.error('Error cargando datos:', error);
        productos = [];
        carrito = [];
        creditos = [];
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
    
    if (sectionId === 'punto-venta') {
        setTimeout(() => document.getElementById('codigoBarrasInput')?.focus(), 300);
    }
    
    if (sectionId === 'creditos') {
        actualizarVistaCreditos();
    }
}

function actualizarNombreSidebar() {
    const span = document.getElementById('sidebarStoreName');
    if (span) span.textContent = nombreEstablecimiento;
}

// ===== EVENTOS =====
function configurarEventos() {
    const buscarInput = document.getElementById('buscar');
    if (buscarInput) {
        buscarInput.addEventListener('input', function() {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => buscarProducto(), 500);
        });
    }

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
    
    const buscarCreditoInput = document.getElementById('buscarCredito');
    if (buscarCreditoInput) {
        buscarCreditoInput.addEventListener('input', function() {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => buscarCreditos(), 500);
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
        showToast('Producto actualizado correctamente', 'success');
        productoEditando = null;
        document.getElementById('formProductoTitle').textContent = 'Agregar Nuevo Producto';
        document.getElementById('btnGuardarProducto').style.display = 'inline-flex';
        document.getElementById('btnGuardarCambios').style.display = 'none';
    } else {
        productos.push(producto);
        showToast('Producto guardado correctamente', 'success');
    }

    safeSetItem(STORAGE_KEYS.PRODUCTOS, productos);
    actualizarTodo();
    limpiarFormularioProducto();
}

function guardarCambiosProducto() {
    if (productoEditando === null) {
        showToast('No hay ningún producto en edición', 'error');
        return;
    }
    guardarProducto();
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
    productoEditando = null;
    document.getElementById('formProductoTitle').textContent = 'Agregar Nuevo Producto';
    document.getElementById('btnGuardarProducto').style.display = 'inline-flex';
    document.getElementById('btnGuardarCambios').style.display = 'none';
}

function cancelarEdicion() {
    if (productoEditando !== null) {
        if (confirm('¿Cancelar la edición? Se perderán los cambios no guardados.')) {
            limpiarFormularioProducto();
        }
    } else {
        limpiarFormularioProducto();
    }
}

// ===== FUNCIÓN DE EDICIÓN POR DOBLE CLIC MEJORADA =====
function editarProducto(index) {
    event?.stopPropagation();
    
    let indiceReal = index;
    
    if (productosFiltrados.length > 0) {
        const prodFiltrado = productosFiltrados[index];
        indiceReal = productos.findIndex(p => 
            p.nombre === prodFiltrado.nombre && 
            p.costo === prodFiltrado.costo
        );
        if (indiceReal === -1) {
            showToast('Error: Producto no encontrado', 'error');
            return;
        }
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
    
    setTimeout(() => {
        calcularPrecioVenta();
    }, 100);
    
    document.getElementById('formProductoTitle').textContent = 'Editando Producto';
    document.getElementById('btnGuardarProducto').style.display = 'none';
    document.getElementById('btnGuardarCambios').style.display = 'inline-flex';
    
    showSection('productos');
    showToast(`Editando: ${producto.nombre}`, 'info');
}

// Agregar fallback: botón de edición en inventario
function editarProductoConBoton(index) {
    editarProducto(index);
}

// ===== FUNCIÓN DE ELIMINACIÓN =====
function eliminarProducto(index) {
    event?.stopPropagation();
    
    let indiceReal = index;
    
    if (productosFiltrados.length > 0) {
        const prodFiltrado = productosFiltrados[index];
        indiceReal = productos.findIndex(p => 
            p.nombre === prodFiltrado.nombre && 
            p.costo === prodFiltrado.costo
        );
        if (indiceReal === -1) {
            showToast('Error: Producto no encontrado', 'error');
            return;
        }
    }
    
    productoEliminarPendiente = indiceReal;
    
    const modal = document.getElementById('modalConfirmacionEliminar');
    if (modal) {
        document.getElementById('mensajeConfirmacionEliminar').textContent = 
            `¿Está seguro de que desea eliminar "${productos[indiceReal].nombre}"?`;
        modal.style.display = 'block';
    }
}

function confirmarEliminacionProducto() {
    if (productoEliminarPendiente === null) return;
    
    const nombreProducto = productos[productoEliminarPendiente].nombre;
    productos.splice(productoEliminarPendiente, 1);
    safeSetItem(STORAGE_KEYS.PRODUCTOS, productos);
    productosFiltrados = [];
    actualizarTodo();
    showToast(`Producto "${nombreProducto}" eliminado correctamente`, 'success');
    
    cerrarModalConfirmacionEliminar();
    productoEliminarPendiente = null;
}

function cerrarModalConfirmacionEliminar() {
    document.getElementById('modalConfirmacionEliminar').style.display = 'none';
    productoEliminarPendiente = null;
}

// ===== INVENTARIO =====
function actualizarListaProductos() {
    const tbody = document.querySelector('#inventario-section tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const listado = productosFiltrados.length > 0 ? productosFiltrados : productos;
    
    listado.forEach((p, idx) => {
        const fila = document.createElement('tr');
        fila.setAttribute('ondblclick', `editarProducto(${idx})`);
        fila.setAttribute('title', 'Doble clic para editar');
        fila.style.cursor = 'pointer';
        
        const stockBajo = p.unidadesExistentes < 4 ? 'inventario-bajo' : '';
        
        fila.innerHTML = `
            <td>${p.nombre}</td>
            <td>${p.descripcion}</td>
            <td class="${stockBajo}"><strong>${p.unidadesExistentes}</strong></td>
            <td>$${p.precioUnitarioDolar.toFixed(2)}</td>
            <td>Bs ${p.precioUnitarioBolivar.toFixed(2)}</td>
            <td>
                <div class="ajuste-inventario">
                    <button onclick="editarProductoConBoton(${idx})" class="btn-secondary" title="Editar producto">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="eliminarProducto(${idx})" class="btn-danger" title="Eliminar producto">
                        <i class="fas fa-trash"></i>
                    </button>
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

// ===== ESTADÍSTICAS =====
function actualizarEstadisticas() {
    const totalProductos = productos.length;
    const stockBajo = productos.filter(p => p.unidadesExistentes < 4).length;
    
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
    const indexProducto = productos.findIndex(p => 
        p.nombre === producto.nombre && 
        p.costo === producto.costo
    );
    
    if (producto.unidadesExistentes <= 0) {
        showToast(`❌ ${producto.nombre} no tiene stock disponible`, 'error');
        return;
    }
    
    const existente = carrito.findIndex(item => 
        item.nombre === producto.nombre && item.unidad === 'unidad'
    );

    if (existente !== -1) {
        if (carrito[existente].cantidad + 1 > producto.unidadesExistentes) {
            showToast(`❌ Stock insuficiente. Disponible: ${producto.unidadesExistentes}`, 'error');
            return;
        }
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
    
    if (unidad === 'gramo' && item.unidad === 'unidad') {
        item.cantidad = item.cantidad * 1000;
    } else if (unidad === 'unidad' && item.unidad === 'gramo') {
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

    for (let item of carrito) {
        const producto = productos[item.indexProducto];
        if (!producto) continue;
        
        if (item.unidad === 'gramo') {
            const disponibleGramos = (producto.unidadesExistentes || 0) * 1000;
            if (item.cantidad > disponibleGramos) {
                showToast(`Stock insuficiente para ${item.nombre}. Disponible: ${disponibleGramos}g`, 'error');
                return;
            }
        } else {
            if (item.cantidad > (producto.unidadesExistentes || 0)) {
                showToast(`Stock insuficiente para ${item.nombre}. Disponible: ${producto.unidadesExistentes}`, 'error');
                return;
            }
        }
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

// ===== PROCESO DE PAGO CON CRÉDITO MEJORADO =====
function seleccionarMetodoPago(metodo) {
    if (metodo === 'credito') {
        if (carrito.length === 0) {
            showToast('El carrito está vacío', 'warning');
            return;
        }
        
        showSection('creditos');
        
        const totalBs = carrito.reduce((sum, item) => sum + item.subtotal, 0);
        const totalDolares = carrito.reduce((sum, item) => sum + item.subtotalDolar, 0);
        
        if (totalDolares > 0 && totalBs > 0) {
            if (confirm('¿Registrar crédito en dólares? (Cancelar para bolívares)')) {
                document.getElementById('montoCredito').value = totalDolares.toFixed(2);
                document.getElementById('monedaCredito').value = 'USD';
            } else {
                document.getElementById('montoCredito').value = totalBs.toFixed(2);
                document.getElementById('monedaCredito').value = 'Bs';
            }
        } else if (totalDolares > 0) {
            document.getElementById('montoCredito').value = totalDolares.toFixed(2);
            document.getElementById('monedaCredito').value = 'USD';
        } else {
            document.getElementById('montoCredito').value = totalBs.toFixed(2);
            document.getElementById('monedaCredito').value = 'Bs';
        }
        
        if (!document.getElementById('diasCredito').value) {
            document.getElementById('diasCredito').value = '30';
        }
        
        showToast('Complete los datos del crédito', 'info');
        cerrarModalPago();
        return;
    }
    
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

    const ahora = new Date();
    const fechaHoy = ahora.toLocaleDateString();
    const hora = ahora.toLocaleTimeString();

    let stockActualizado = false;
    let productosVendidos = [];
    
    carrito.forEach(item => {
        const producto = productos[item.indexProducto];
        if (producto) {
            const stockAnterior = producto.unidadesExistentes;
            const cantidadVendida = item.unidad === 'gramo' ? item.cantidad / 1000 : item.cantidad;
            
            producto.unidadesExistentes = redondear2Decimales(producto.unidadesExistentes - cantidadVendida);
            
            productosVendidos.push({
                nombre: item.nombre,
                cantidad: item.cantidad,
                unidad: item.unidad,
                subtotal: item.subtotal
            });
            
            if (producto.unidadesExistentes < 0) {
                producto.unidadesExistentes = 0;
            }
            
            stockActualizado = true;
            
            if (producto.unidadesExistentes < 4 && producto.unidadesExistentes > 0) {
                showToast(`⚠️ ${producto.nombre} tiene stock bajo: ${producto.unidadesExistentes} unidades`, 'warning');
            } else if (producto.unidadesExistentes === 0) {
                showToast(`❌ ${producto.nombre} se ha agotado`, 'error');
            }
        }
    });

    if (!stockActualizado) {
        showToast('Error: No se pudo actualizar el inventario', 'error');
        return;
    }

    // Si es crédito, guardar productos en el crédito
    if (metodoPagoSeleccionado === 'credito') {
        const cliente = document.getElementById('clienteNombre').value.trim();
        const monto = parseFloat(document.getElementById('montoCredito').value);
        const moneda = document.getElementById('monedaCredito').value;
        const dias = parseInt(document.getElementById('diasCredito').value);
        let fechaInicio = document.getElementById('fechaInicioCredito').value;
        
        if (!fechaInicio) {
            fechaInicio = new Date().toISOString().split('T')[0];
        }
        
        const fechaVencimiento = calcularFechaVencimiento(fechaInicio, dias);
        
        const nuevoCredito = {
            cliente,
            monto,
            moneda,
            dias,
            fechaInicio,
            fechaVencimiento,
            fechaRegistro: new Date().toISOString(),
            estado: 'activo',
            productos: productosVendidos
        };
        
        creditos.push(nuevoCredito);
        guardarCreditosStorage();
    }

    const ventaRegistro = {
        fecha: fechaHoy,
        hora: hora,
        total: totalBs,
        totalDolares: totalDolares,
        metodoPago: metodoPagoSeleccionado,
        items: carrito.map(item => ({
            nombre: item.nombre,
            cantidad: item.cantidad,
            unidad: item.unidad,
            subtotal: item.subtotal
        }))
    };

    ventasDiarias.push(ventaRegistro);

    safeSetItem(STORAGE_KEYS.PRODUCTOS, productos);
    safeSetItem(STORAGE_KEYS.VENTAS, ventasDiarias);

    showToast(`✅ Venta completada por Bs ${totalBs.toFixed(2)}`, 'success');

    detallesPago.totalBs = redondear2Decimales(totalBs);
    detallesPago.totalDolares = redondear2Decimales(totalDolares);
    detallesPago.items = JSON.parse(JSON.stringify(carrito));
    detallesPago.fecha = new Date().toLocaleString();

    imprimirTicketTermicoESC_POS(detallesPago);

    carrito = [];
    safeSetItem(STORAGE_KEYS.CARRITO, carrito);
    
    actualizarCarrito();
    actualizarListaProductos();
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
            '\x1B\x40',
            '\x1B\x61\x01',
            '\x1B\x21\x30',
            (nombreEstablecimiento || "MI NEGOCIO") + "\n",
            '\x1B\x21\x00',
            '\x1B\x61\x00',
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
        ticket.push('\x1B\x21\x20');
        ticket.push(`TOTAL: Bs ${detalles.totalBs.toFixed(2)}\n`);
        ticket.push(`REF: $${detalles.totalDolares.toFixed(2)}\n`);
        ticket.push('\x1B\x21\x00');
        ticket.push(`Pago: ${detalles.metodo}\n`);
        ticket.push("\n¡Gracias por su compra!\n\n");
        ticket.push('\x1D\x56\x00');

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

// ===== REPORTE DIARIO MEJORADO =====
function mostrarReporteDiario() {
    const container = document.getElementById('reporteDiarioContainer');
    if (!container) return;

    const hoy = new Date().toLocaleDateString();
    const ventasHoy = ventasDiarias.filter(v => v.fecha === hoy);

    if (ventasHoy.length === 0) {
        showToast('No hay ventas registradas hoy', 'warning');
        return;
    }

    let totalGeneral = 0;
    let totalProductosVendidos = 0;
    const totalesPorMetodo = {};
    const productosResumen = {};

    ventasHoy.forEach(venta => {
        totalGeneral += venta.total || 0;
        
        const metodo = venta.metodoPago || 'otro';
        if (!totalesPorMetodo[metodo]) {
            totalesPorMetodo[metodo] = 0;
        }
        totalesPorMetodo[metodo] += venta.total || 0;
        
        if (venta.items && Array.isArray(venta.items)) {
            venta.items.forEach(item => {
                totalProductosVendidos += item.cantidad || 0;
                
                const key = item.nombre;
                if (!productosResumen[key]) {
                    productosResumen[key] = {
                        cantidad: 0,
                        subtotal: 0
                    };
                }
                productosResumen[key].cantidad += item.cantidad || 0;
                productosResumen[key].subtotal += item.subtotal || 0;
            });
        }
    });

    document.getElementById('reporteTotalGeneral').textContent = `Bs ${totalGeneral.toFixed(2)}`;
    document.getElementById('reporteCantidadVentas').textContent = ventasHoy.length;
    document.getElementById('reporteTotalProductosVendidos').textContent = totalProductosVendidos;

    const metodosContainer = document.getElementById('reporteTotalesMetodos');
    metodosContainer.innerHTML = '';

    const nombresMetodos = {
        'efectivo_bs': 'Efectivo Bs',
        'efectivo_dolares': 'Efectivo $',
        'punto': 'Punto',
        'pago_movil': 'Pago Móvil',
        'biopago': 'Biopago',
        'credito': 'Crédito',
        'otro': 'Otro'
    };

    Object.keys(totalesPorMetodo).forEach(metodo => {
        const div = document.createElement('div');
        div.innerHTML = `
            <strong>${nombresMetodos[metodo] || metodo}:</strong><br>
            Bs ${totalesPorMetodo[metodo].toFixed(2)}
        `;
        metodosContainer.appendChild(div);
    });

    const productosContainer = document.getElementById('reporteProductosVendidos');
    productosContainer.innerHTML = '';
    
    const productosArray = Object.entries(productosResumen).sort((a, b) => a[0].localeCompare(b[0]));
    
    if (productosArray.length > 0) {
        const ul = document.createElement('ul');
        ul.style.cssText = 'list-style: none; padding: 0; margin: 0;';
        
        productosArray.forEach(([nombre, datos]) => {
            const li = document.createElement('li');
            li.style.cssText = 'padding: 5px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;';
            li.innerHTML = `
                <span><strong>${nombre}</strong></span>
                <span>Cantidad: ${datos.cantidad.toFixed(2)} | Total: Bs ${datos.subtotal.toFixed(2)}</span>
            `;
            ul.appendChild(li);
        });
        
        productosContainer.appendChild(ul);
    } else {
        productosContainer.innerHTML = '<p style="color: #999; text-align: center;">No hay productos vendidos</p>';
    }

    const tbody = document.getElementById('reporteDetalleBody');
    tbody.innerHTML = '';

    ventasHoy.sort((a, b) => a.hora.localeCompare(b.hora)).forEach((venta, idx) => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>#${idx + 1}</td>
            <td>${venta.hora}</td>
            <td>${nombresMetodos[venta.metodoPago] || venta.metodoPago}</td>
            <td>Bs ${(venta.total || 0).toFixed(2)}</td>
        `;
        tbody.appendChild(fila);
    });

    container.style.display = 'block';
    
    showToast('📊 Reporte generado. Recuerda descargar y limpiar los datos.', 'info', 5000);
}

function cerrarReporteDiario() {
    document.getElementById('reporteDiarioContainer').style.display = 'none';
}

function generarPDFReporteDiario() {
    const hoy = new Date().toLocaleDateString();
    const ventasHoy = ventasDiarias.filter(v => v.fecha === hoy);

    if (ventasHoy.length === 0) {
        showToast('No hay ventas para generar reporte', 'warning');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            showToast('Error: Librería PDF no cargada', 'error');
            return;
        }

        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text(nombreEstablecimiento || 'Reporte Diario', 14, 20);
        doc.setFontSize(12);
        doc.text(`Fecha: ${hoy}`, 14, 28);
        doc.text(`Tasa BCV: ${tasaBCVGuardada}`, 14, 35);

        let totalGeneral = 0;
        let totalProductosVendidos = 0;
        const totalesPorMetodo = {};
        const productosResumen = {};

        ventasHoy.forEach(venta => {
            totalGeneral += venta.total || 0;
            
            const metodo = venta.metodoPago || 'otro';
            if (!totalesPorMetodo[metodo]) {
                totalesPorMetodo[metodo] = 0;
            }
            totalesPorMetodo[metodo] += venta.total || 0;
            
            if (venta.items && Array.isArray(venta.items)) {
                venta.items.forEach(item => {
                    totalProductosVendidos += item.cantidad || 0;
                    
                    const key = item.nombre;
                    if (!productosResumen[key]) {
                        productosResumen[key] = {
                            cantidad: 0,
                            subtotal: 0
                        };
                    }
                    productosResumen[key].cantidad += item.cantidad || 0;
                    productosResumen[key].subtotal += item.subtotal || 0;
                });
            }
        });

        doc.setFontSize(10);
        doc.text(`Total General: Bs ${totalGeneral.toFixed(2)}`, 14, 45);
        doc.text(`Cantidad de Ventas: ${ventasHoy.length}`, 14, 52);
        doc.text(`Total Productos Vendidos: ${totalProductosVendidos}`, 14, 59);

        let yPos = 67;
        doc.text('Totales por Método de Pago:', 14, yPos);
        yPos += 7;

        const nombresMetodos = {
            'efectivo_bs': 'Efectivo Bs',
            'efectivo_dolares': 'Efectivo $',
            'punto': 'Punto',
            'pago_movil': 'Pago Móvil',
            'biopago': 'Biopago',
            'credito': 'Crédito'
        };

        Object.keys(totalesPorMetodo).forEach(metodo => {
            doc.text(`${nombresMetodos[metodo] || metodo}: Bs ${totalesPorMetodo[metodo].toFixed(2)}`, 20, yPos);
            yPos += 5;
        });

        yPos += 5;
        doc.text('Productos Vendidos:', 14, yPos);
        yPos += 7;

        const productosArray = Object.entries(productosResumen).sort((a, b) => a[0].localeCompare(b[0]));
        productosArray.forEach(([nombre, datos]) => {
            doc.text(`${nombre}: ${datos.cantidad.toFixed(2)} unidades - Bs ${datos.subtotal.toFixed(2)}`, 20, yPos);
            yPos += 5;
            
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
        });

        const ventasOrdenadas = [...ventasHoy].sort((a, b) => a.hora.localeCompare(b.hora));
        const filas = ventasOrdenadas.map((v, i) => [
            `#${i+1}`,
            v.hora,
            nombresMetodos[v.metodoPago] || v.metodoPago,
            `Bs ${(v.total || 0).toFixed(2)}`
        ]);

        doc.autoTable({
            head: [['#', 'Hora', 'Método', 'Total']],
            body: filas,
            startY: yPos + 5,
            styles: { fontSize: 9 }
        });

        doc.save(`reporte_diario_${hoy.replace(/\//g, '-')}.pdf`);
        showToast('Reporte PDF generado', 'success');
    } catch (error) {
        console.error('Error generando PDF:', error);
        showToast('Error al generar PDF', 'error');
    }
}

function limpiarVentasDiarias() {
    if (!confirm('¿Está seguro de limpiar todas las ventas del día? Esta acción no se puede deshacer.')) {
        return;
    }

    const hoy = new Date().toLocaleDateString();
    ventasDiarias = ventasDiarias.filter(v => v.fecha !== hoy);
    safeSetItem(STORAGE_KEYS.VENTAS, ventasDiarias);
    
    cerrarReporteDiario();
    showToast('Ventas del día limpiadas', 'success');
}

// ===== REPORTES Y PDF EXISTENTES =====
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
    mostrarReporteDiario();
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
        'lacteos': 'LÁCTEOS',
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
        'lacteos': 'LÁCTEOS',
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
        creditos,
        fecha: new Date().toISOString(),
        version: '2.1'
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
                localStorage.setItem(STORAGE_KEYS.CREDITOS, JSON.stringify(backup.creditos || []));

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

// ===== COPYRIGHT =====
function toggleCopyrightNotice() {
    document.getElementById('copyrightNotice').classList.toggle('show');
}

// ============================================
// MÓDULO DE CRÉDITOS MEJORADO
// ============================================

function inicializarCreditos() {
    creditos = creditos.map(c => ({
        ...c,
        productos: c.productos || [],
        estado: calcularEstadoCredito(c)
    }));
    actualizarVistaCreditos();
    
    setInterval(verificarCreditosPorVencer, 3600000);
    setTimeout(verificarCreditosPorVencer, 5000);
}

function guardarCreditosStorage() {
    safeSetItem(STORAGE_KEYS.CREDITOS, creditos);
}

function calcularFechaVencimiento(fechaInicio, dias) {
    const fecha = new Date(fechaInicio);
    fecha.setDate(fecha.getDate() + parseInt(dias));
    return fecha.toISOString().split('T')[0];
}

function calcularEstadoCredito(credito) {
    if (credito.estado === 'pagado') return 'pagado';
    
    const hoy = new Date();
    const fechaVencimiento = new Date(credito.fechaVencimiento || 
        calcularFechaVencimiento(credito.fechaInicio, credito.dias));
    
    const diffTime = fechaVencimiento - hoy;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'vencido';
    if (diffDays <= 3) return 'porVencer';
    return 'activo';
}

function calcularDiasRestantes(credito) {
    if (credito.estado === 'pagado') return 0;
    
    const hoy = new Date();
    const fechaVencimiento = new Date(credito.fechaVencimiento || 
        calcularFechaVencimiento(credito.fechaInicio, credito.dias));
    
    return Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
}

function formatearMontoCredito(credito) {
    const simbolo = credito.moneda === 'USD' ? '$' : 'Bs';
    return `${simbolo} ${parseFloat(credito.monto).toFixed(2)}`;
}

function verificarCreditosPorVencer() {
    const hoy = new Date();
    
    creditos.forEach(credito => {
        if (credito.estado === 'pagado') return;
        
        const estado = calcularEstadoCredito(credito);
        credito.estado = estado;
        
        const fechaVencimiento = new Date(credito.fechaVencimiento || 
            calcularFechaVencimiento(credito.fechaInicio, credito.dias));
        const diffTime = fechaVencimiento - hoy;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 3) {
            showToast(`⚠️ El crédito de ${credito.cliente} vence en 3 días`, 'warning', 8000);
        } else if (diffDays === 1) {
            showToast(`⚠️ ⚠️ El crédito de ${credito.cliente} vence MAÑANA`, 'warning', 8000);
        } else if (diffDays === 0) {
            showToast(`⚠️ ⚠️ ⚠️ El crédito de ${credito.cliente} vence HOY`, 'warning', 8000);
        } else if (diffDays < 0) {
            showToast(`❌ El crédito de ${credito.cliente} está VENCIDO`, 'error', 8000);
        }
    });
    
    guardarCreditosStorage();
    actualizarVistaCreditos();
}

function actualizarVistaCreditos() {
    actualizarEstadisticasCreditos();
    actualizarListaCreditos();
}

function actualizarEstadisticasCreditos() {
    const totalClientes = creditos.filter(c => c.estado !== 'pagado').length;
    const porVencer = creditos.filter(c => c.estado === 'porVencer').length;
    const vencidos = creditos.filter(c => c.estado === 'vencido').length;
    
    let totalAdeudado = 0;
    creditos.forEach(c => {
        if (c.estado !== 'pagado') {
            if (c.moneda === 'USD') {
                totalAdeudado += parseFloat(c.monto) * (tasaBCVGuardada || 0);
            } else {
                totalAdeudado += parseFloat(c.monto);
            }
        }
    });
    
    document.getElementById('totalClientesCredito').textContent = totalClientes;
    document.getElementById('creditosPorVencer').textContent = porVencer;
    document.getElementById('creditosVencidos').textContent = vencidos;
    document.getElementById('totalAdeudado').textContent = `Bs ${totalAdeudado.toFixed(2)}`;
}

function verProductosCredito(index) {
    let indiceReal = index;
    
    if (creditosFiltrados.length > 0) {
        const credFiltrado = creditosFiltrados[index];
        indiceReal = creditos.findIndex(c => 
            c.cliente === credFiltrado.cliente && 
            c.fechaRegistro === credFiltrado.fechaRegistro
        );
    }
    
    const credito = creditos[indiceReal];
    const modal = document.getElementById('modalProductosCredito');
    const contenido = document.getElementById('contenidoProductosCredito');
    
    if (credito.productos && credito.productos.length > 0) {
        let html = '<ul style="list-style: none; padding: 0;">';
        credito.productos.forEach(prod => {
            html += `
                <li style="padding: 8px; border-bottom: 1px solid #eee;">
                    <strong>${prod.nombre}</strong><br>
                    Cantidad: ${prod.cantidad} ${prod.unidad === 'gramo' ? 'g' : 'und'} | 
                    Subtotal: Bs ${prod.subtotal.toFixed(2)}
                </li>
            `;
        });
        html += '</ul>';
        contenido.innerHTML = html;
    } else {
        contenido.innerHTML = '<p style="color: #999; text-align: center;">No hay productos registrados para este crédito</p>';
    }
    
    modal.style.display = 'block';
}

function cerrarModalProductosCredito() {
    document.getElementById('modalProductosCredito').style.display = 'none';
}

function actualizarListaCreditos() {
    const tbody = document.getElementById('creditosBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const lista = creditosFiltrados.length > 0 ? creditosFiltrados : creditos;
    
    const listaFiltrada = lista.filter(c => {
        if (filtroActual === 'todos') return true;
        if (filtroActual === 'activos') return c.estado === 'activo';
        if (filtroActual === 'porVencer') return c.estado === 'porVencer';
        if (filtroActual === 'vencidos') return c.estado === 'vencido';
        return true;
    });
    
    listaFiltrada.sort((a, b) => {
        const fechaA = new Date(a.fechaVencimiento || calcularFechaVencimiento(a.fechaInicio, a.dias));
        const fechaB = new Date(b.fechaVencimiento || calcularFechaVencimiento(b.fechaInicio, b.dias));
        return fechaA - fechaB;
    });
    
    listaFiltrada.forEach((credito, idx) => {
        const fila = document.createElement('tr');
        const estado = calcularEstadoCredito(credito);
        const diasRestantes = calcularDiasRestantes(credito);
        const fechaVencimiento = credito.fechaVencimiento || 
            calcularFechaVencimiento(credito.fechaInicio, credito.dias);
        
        if (estado === 'vencido') fila.classList.add('vencido');
        else if (estado === 'porVencer') fila.classList.add('por-vencer');
        
        if (creditoEditando && creditos[creditoEditando] === credito) {
            fila.classList.add('editing');
        }
        
        let claseEstado = 'estado-activo';
        let textoEstado = 'Activo';
        
        if (estado === 'vencido') {
            claseEstado = 'estado-vencido';
            textoEstado = 'VENCIDO';
        } else if (estado === 'porVencer') {
            claseEstado = 'estado-por-vencer';
            textoEstado = 'Por vencer';
        } else if (estado === 'pagado') {
            claseEstado = 'estado-pagado';
            textoEstado = 'Pagado';
        }
        
        const tieneProductos = credito.productos && credito.productos.length > 0;
        
        fila.innerHTML = `
            <td><strong>${credito.cliente}</strong></td>
            <td>${formatearMontoCredito(credito)}</td>
            <td>${new Date(credito.fechaInicio).toLocaleDateString()}</td>
            <td>${new Date(fechaVencimiento).toLocaleDateString()}</td>
            <td><span class="${claseEstado}">${textoEstado}</span></td>
            <td class="dias-restante" title="${diasRestantes} días restantes">
                ${diasRestantes > 0 ? diasRestantes : Math.abs(diasRestantes)} días
                ${diasRestantes < 0 ? ' (vencido)' : ''}
            </td>
            <td>
                ${tieneProductos ? 
                    `<span onclick="verProductosCredito(${idx})" class="producto-tooltip" title="Ver productos del crédito">
                        <i class="fas fa-eye"></i> Ver productos
                    </span>` : 
                    '<span style="color: #999;">Sin productos</span>'}
            </td>
            <td>
                <div class="ajuste-inventario">
                    <button onclick="editarCredito(${idx})" class="btn-secondary" title="Editar crédito">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="eliminarCredito(${idx})" class="btn-danger" title="Eliminar crédito">
                        <i class="fas fa-trash"></i>
                    </button>
                    ${estado !== 'pagado' ? 
                        `<button onclick="marcarComoPagado(${idx})" class="btn-success" title="Marcar como pagado">
                            <i class="fas fa-check"></i>
                        </button>` : ''
                    }
                </div>
            </td>
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
    
    if (!cliente) return showToast('Ingrese el nombre del cliente', 'error');
    if (!monto || monto <= 0) return showToast('Ingrese un monto válido', 'error');
    if (!dias || dias <= 0) return showToast('Ingrese los días de crédito', 'error');
    
    if (!fechaInicio) {
        fechaInicio = new Date().toISOString().split('T')[0];
    }
    
    const fechaVencimiento = calcularFechaVencimiento(fechaInicio, dias);
    
    // Si viene del carrito, tomar los productos
    let productosCredito = [];
    if (carrito && carrito.length > 0 && confirm('¿Incluir los productos del carrito en este crédito?')) {
        productosCredito = carrito.map(item => ({
            nombre: item.nombre,
            cantidad: item.cantidad,
            unidad: item.unidad,
            subtotal: item.subtotal
        }));
    }
    
    const credito = {
        cliente,
        monto,
        moneda,
        dias,
        fechaInicio,
        fechaVencimiento,
        fechaRegistro: new Date().toISOString(),
        estado: 'activo',
        productos: productosCredito
    };
    
    if (creditoEditando !== null) {
        let indiceReal = creditoEditando;
        
        if (creditosFiltrados.length > 0) {
            const credFiltrado = creditosFiltrados[creditoEditando];
            indiceReal = creditos.findIndex(c => 
                c.cliente === credFiltrado.cliente && 
                c.fechaRegistro === credFiltrado.fechaRegistro
            );
        }
        
        creditos[indiceReal] = { ...creditos[indiceReal], ...credito };
        showToast('Crédito actualizado', 'success');
        creditoEditando = null;
        
        document.getElementById('formCreditoTitle').textContent = 'Registrar Nuevo Crédito';
        document.getElementById('btnGuardarCredito').innerHTML = '<i class="fas fa-save"></i> Guardar Crédito';
        document.getElementById('btnCancelarCredito').style.display = 'none';
    } else {
        creditos.push(credito);
        showToast('Crédito registrado', 'success');
    }
    
    guardarCreditosStorage();
    limpiarFormularioCredito();
    creditosFiltrados = [];
    filtroActual = 'todos';
    actualizarFiltrosUI();
    actualizarVistaCreditos();
    
    // Si había carrito y se incluyeron productos, limpiar carrito
    if (carrito.length > 0 && productosCredito.length > 0) {
        carrito = [];
        safeSetItem(STORAGE_KEYS.CARRITO, carrito);
        actualizarCarrito();
    }
}

function editarCredito(index) {
    let indiceReal = index;
    
    if (creditosFiltrados.length > 0) {
        const credFiltrado = creditosFiltrados[index];
        indiceReal = creditos.findIndex(c => 
            c.cliente === credFiltrado.cliente && 
            c.fechaRegistro === credFiltrado.fechaRegistro
        );
    }
    
    const credito = creditos[indiceReal];
    
    document.getElementById('clienteNombre').value = credito.cliente;
    document.getElementById('montoCredito').value = credito.monto;
    document.getElementById('monedaCredito').value = credito.moneda;
    document.getElementById('diasCredito').value = credito.dias;
    document.getElementById('fechaInicioCredito').value = credito.fechaInicio;
    
    creditoEditando = indiceReal;
    
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

function eliminarCredito(index) {
    let indiceReal = index;
    
    if (creditosFiltrados.length > 0) {
        const credFiltrado = creditosFiltrados[index];
        indiceReal = creditos.findIndex(c => 
            c.cliente === credFiltrado.cliente && 
            c.fechaRegistro === credFiltrado.fechaRegistro
        );
    }
    
    if (confirm(`¿Eliminar crédito de ${creditos[indiceReal].cliente}?`)) {
        const nombre = creditos[indiceReal].cliente;
        creditos.splice(indiceReal, 1);
        guardarCreditosStorage();
        creditosFiltrados = [];
        actualizarVistaCreditos();
        showToast(`Crédito de ${nombre} eliminado`, 'success');
    }
}

function marcarComoPagado(index) {
    let indiceReal = index;
    
    if (creditosFiltrados.length > 0) {
        const credFiltrado = creditosFiltrados[index];
        indiceReal = creditos.findIndex(c => 
            c.cliente === credFiltrado.cliente && 
            c.fechaRegistro === credFiltrado.fechaRegistro
        );
    }
    
    if (confirm(`¿Marcar como pagado el crédito de ${creditos[indiceReal].cliente}?`)) {
        creditos[indiceReal].estado = 'pagado';
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
    
    if (!termino) {
        creditosFiltrados = [];
    } else {
        creditosFiltrados = creditos.filter(c => 
            c.cliente.toLowerCase().includes(termino) ||
            c.monto.toString().includes(termino)
        );
    }
    
    actualizarListaCreditos();
}

function mostrarTodosCreditos() {
    document.getElementById('buscarCredito').value = '';
    creditosFiltrados = [];
    actualizarListaCreditos();
}

function filtrarCreditos(filtro) {
    filtroActual = filtro;
    actualizarFiltrosUI();
    actualizarListaCreditos();
}

function actualizarFiltrosUI() {
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const btnMap = {
        'todos': 'filtroTodos',
        'activos': 'filtroActivos',
        'porVencer': 'filtroPorVencer',
        'vencidos': 'filtroVencidos'
    };
    
    const btnId = btnMap[filtroActual];
    if (btnId) {
        document.getElementById(btnId).classList.add('active');
    }
}

// ===== EXPORTAR FUNCIONES AL ÁMBITO GLOBAL =====
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
window.cerrarModalPago = cerrarModalPago;
window.seleccionarMetodoPago = seleccionarMetodoPago;
window.confirmarMetodoPago = confirmarMetodoPago;
window.cancelarPago = cancelarPago;
window.guardarNombreEstablecimiento = guardarNombreEstablecimiento;
window.actualizarTasaBCV = actualizarTasaBCV;
window.mostrarListaCostos = mostrarListaCostos;
window.generarReporteDiario = generarReporteDiario;
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
window.cancelarEdicion = cancelarEdicion;

// Exportar funciones de créditos mejoradas
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
