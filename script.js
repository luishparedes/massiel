// ===== VARIABLES GLOBALES =====
let productos = [];
let nombreEstablecimiento = '';
let tasaBCVGuardada = 0;
let ventasDiarias = [];
let carrito = [];
let métodoPagoSeleccionado = null;
let detallesPago = {};
let productoEditando = null;
let productosFiltrados = [];
let monedaEtiquetas = 'VES';
let claveSeguridad = '1234';

// ===== SEGURIDAD Y RENDIMIENTO =====
let ultimaPeticion = 0;
const MIN_INTERVALO_MS = 80;
let tiempoUltimaTecla = 0;
let bufferEscaneo = '';

// ===== NUEVA VARIABLE PARA CONTROL DE REDIRECCIÓN =====
let redireccionEnCurso = false;

// --- Función de rate limit ---
function permitirEjecucion() {
    const ahora = Date.now();
    if (ahora - ultimaPeticion < MIN_INTERVALO_MS) return false;
    ultimaPeticion = ahora;
    return true;
}

// --- Carga segura de datos del localStorage ---
function cargarDatosSeguros() {
    try {
        productos = JSON.parse(localStorage.getItem('productos')) || [];
        nombreEstablecimiento = localStorage.getItem('nombreEstablecimiento') || '';
        tasaBCVGuardada = parseFloat(localStorage.getItem('tasaBCV')) || 0;
        ventasDiarias = JSON.parse(localStorage.getItem('ventasDiarias')) || [];
        carrito = JSON.parse(localStorage.getItem('carrito')) || [];
        monedaEtiquetas = localStorage.getItem('monedaEtiquetas') || 'VES';
        claveSeguridad = localStorage.getItem('claveSeguridad') || '1234';

        // Validar que sean arrays
        if (!Array.isArray(productos)) productos = [];
        if (!Array.isArray(ventasDiarias)) ventasDiarias = [];
        if (!Array.isArray(carrito)) carrito = [];

    } catch (e) {
        console.error("Error cargando datos del localStorage:", e);
        showToast("Error al cargar datos. Iniciando con valores por defecto.", 'error');
        // Resetear datos corruptos
        productos = [];
        ventasDiarias = [];
        carrito = [];
    }
}

// ===== NUEVA LÓGICA DE REDIRECCIÓN CORREGIDA =====
(function() {
    const SESSION_KEY = 'calculadora_magica_session';
    const URL_REDIRECCION_PORTAL = "http://portal.calculadoramagica.lat/";
    
    // Verificar si venimos de una redirección por inactividad
    const urlParams = new URLSearchParams(window.location.search);
    const vieneDeRedireccion = urlParams.has('from') && urlParams.get('from') === 'inactivity';
    const sessionValida = sessionStorage.getItem(SESSION_KEY);
    
    // Si NO hay sesión válida Y NO venimos de una redirección, redirigir al portal
    if (!sessionValida && !vieneDeRedireccion) {
        console.log('No hay sesión activa. Redirigiendo al portal...');
        window.location.href = URL_REDIRECCION_PORTAL;
        return;
    }
    
    // Si venimos de una redirección, establecer sesión automáticamente
    if (vieneDeRedireccion) {
        console.log('Acceso desde redirección por inactividad. Estableciendo sesión.');
        sessionStorage.setItem(SESSION_KEY, 'activa_' + Date.now());
        
        // Limpiar el parámetro de la URL sin recargar la página
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
})();

// ===== SISTEMA DE REDIRECCIÓN POR INACTIVIDAD MEJORADO =====
const TIEMPO_INACTIVIDAD = 4 * 60 * 1000; // 4 minutos
const URL_REDIRECCION = "http://portal.calculadoramagica.lat/";

let temporizadorInactividad;
let ultimaActividad = Date.now();

function registrarActividad() {
    ultimaActividad = Date.now();
    reiniciarTemporizador();
}

function reiniciarTemporizador() {
    // Guardar última actividad
    localStorage.setItem('ultimaActividad', Date.now().toString());
    
    // Limpiar temporizador anterior
    if (temporizadorInactividad) {
        clearTimeout(temporizadorInactividad);
    }
    
    // Establecer nuevo temporizador
    temporizadorInactividad = setTimeout(() => {
        // Verificar si realmente ha pasado el tiempo suficiente
        const tiempoTranscurrido = Date.now() - ultimaActividad;
        
        if (tiempoTranscurrido >= TIEMPO_INACTIVIDAD && !redireccionEnCurso) {
            console.log('Redirigiendo por inactividad después de', Math.round(tiempoTranscurrido / 1000), 'segundos');
            redireccionEnCurso = true;
            
            // Limpiar sesión
            sessionStorage.removeItem('calculadora_magica_session');
            
            // Redirigir CON un parámetro para indicar que es por inactividad
            window.location.href = URL_REDIRECCION + '?from=inactivity';
        }
    }, TIEMPO_INACTIVIDAD);
}

function inicializarSistemaInactividad() {
    // Registrar eventos de actividad
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'input'].forEach(evento => {
        document.addEventListener(evento, registrarActividad, { passive: true });
    });
    
    // Verificar si hay una última actividad guardada
    const ultimaActividadGuardada = localStorage.getItem('ultimaActividad');
    if (ultimaActividadGuardada) {
        ultimaActividad = parseInt(ultimaActividadGuardada);
        
        // Si ha pasado más del tiempo de inactividad, redirigir
        const tiempoTranscurrido = Date.now() - ultimaActividad;
        if (tiempoTranscurrido >= TIEMPO_INACTIVIDAD && !redireccionEnCurso) {
            console.log('Sesión expirada al cargar. Redirigiendo...');
            redireccionEnCurso = true;
            sessionStorage.removeItem('calculadora_magica_session');
            window.location.href = URL_REDIRECCION + '?from=inactivity';
            return;
        }
    }
    
    // Iniciar temporizador
    reiniciarTemporizador();
}

// ===== NUEVA FUNCIÓN: LIMPIEZA DE DATOS ANTIGUOS =====
function limpiarDatosViejos() {
    if (!permitirEjecucion()) return;
    try {
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - 30); // Hace 30 días

        const ventasOriginales = ventasDiarias.length;
        ventasDiarias = ventasDiarias.filter(venta => {
            // Intentar parsear la fecha de la venta
            try {
                const partesFecha = venta.fecha.split('/');
                if (partesFecha.length === 3) {
                    const fechaVenta = new Date(partesFecha[2], partesFecha[1]-1, partesFecha[0]);
                    return fechaVenta >= fechaLimite;
                }
                return true; // Si no se puede parsear, mantenerla por seguridad
            } catch (e) {
                return true; // En caso de error, mantener
            }
        });

        const eliminadas = ventasOriginales - ventasDiarias.length;
        localStorage.setItem('ventasDiarias', JSON.stringify(ventasDiarias));
        
        if (eliminadas > 0) {
            showToast(`🧹 Limpieza completada: ${eliminadas} ventas antiguas eliminadas.`, 'success');
        } else {
            showToast('No se encontraron ventas antiguas para limpiar.', 'info');
        }
    } catch (error) {
        console.error("Error en limpieza de datos:", error);
        showToast("Error al limpiar datos antiguos.", 'error');
    }
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Calculadora Optimizada iniciada');
    cargarDatosSeguros();
    inicializarSistemaInactividad(); // Inicializar sistema de inactividad
    llenarModalesCategorias();
    llenarMetodosPago();
    actualizarLista();
    actualizarCarrito();
    configurarEventos();
    configurarEventosMoviles();
    actualizarGananciaTotal();
    actualizarTotalInvertido();
    cargarDatosInicialesUI();
});

// ===== LLENAR MODALES DE CATEGORÍAS =====
function llenarModalesCategorias() {
    const categorias = [
        { valor: 'todos', texto: 'TODOS LOS PRODUCTOS' },
        { valor: 'viveres', texto: 'VÍVERES' },
        { valor: 'bebidas', texto: 'BEBIDAS' },
        { valor: 'licores', texto: 'LICORES' },
        { valor: 'enlatados', texto: 'ENLATADOS' },
        { valor: 'plasticos', texto: 'PLÁSTICOS' },
        { valor: 'papeleria', texto: 'PAPELERÍA' },
        { valor: 'lacteos', texto: 'LÁCTEOS' },
        { valor: 'ferreteria', texto: 'FERRETERÍA' },
        { valor: 'agropecuaria', texto: 'AGROPECUARIA' },
        { valor: 'frigorifico', texto: 'FRIGORÍFICO' },
        { valor: 'pescaderia', texto: 'PESCADERÍA' },
        { valor: 'repuesto', texto: 'REPUESTO' },
        { valor: 'confiteria', texto: 'CONFITERÍA' },
        { valor: 'ropa', texto: 'ROPA' },
        { valor: 'calzados', texto: 'CALZADOS' },
        { valor: 'charcuteria', texto: 'CHARCUTERÍA' },
        { valor: 'carnes', texto: 'CARNES' },
        { valor: 'aseo_personal', texto: 'ASEO PERSONAL' },
        { valor: 'limpieza', texto: 'PRODUCTOS DE LIMPIEZA' },
        { valor: 'verduras', texto: 'VERDURAS' },
        { valor: 'frutas', texto: 'FRUTAS' },
        { valor: 'hortalizas', texto: 'HORTALIZAS' },
        { valor: 'aliños', texto: 'ALIÑOS' },
        { valor: 'otros', texto: 'OTROS' }
    ];

    const contenedorPDF = document.getElementById('categoriasLista');
    const contenedorEtiquetas = document.getElementById('categoriasListaEtiquetas');
    
    if (contenedorPDF) {
        contenedorPDF.innerHTML = '';
        categorias.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'categoria-btn';
            btn.textContent = cat.texto;
            btn.onclick = () => generarPDFPorCategoria(cat.valor);
            contenedorPDF.appendChild(btn);
        });
    }

    if (contenedorEtiquetas) {
        contenedorEtiquetas.innerHTML = '';
        categorias.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'categoria-btn';
            btn.textContent = cat.texto;
            btn.onclick = () => generarEtiquetasPorCategoria(cat.valor);
            contenedorEtiquetas.appendChild(btn);
        });
    }
}

function llenarMetodosPago() {
    const metodos = [
        { valor: 'efectivo_bs', texto: 'Efectivo Bs' },
        { valor: 'efectivo_dolares', texto: 'Efectivo $' },
        { valor: 'punto', texto: 'Punto' },
        { valor: 'pago_movil', texto: 'Pago Móvil' },
        { valor: 'biopago', texto: 'Biopago' }
    ];
    const contenedor = document.getElementById('metodosPagoLista');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    metodos.forEach(met => {
        const btn = document.createElement('button');
        btn.textContent = met.texto;
        btn.onclick = () => seleccionarMetodoPago(met.valor);
        contenedor.appendChild(btn);
    });
}

// ===== FUNCIÓN DE REDONDEO =====
function redondear2Decimales(numero) {
    if (isNaN(numero) || numero === null || numero === undefined) return 0;
    return Math.round((numero + Number.EPSILON) * 100) / 100;
}

// ===== FUNCIONES BÁSICAS UI =====
function cargarDatosInicialesUI() {
    const nombreElem = document.getElementById('nombreEstablecimiento');
    const tasaElem = document.getElementById('tasaBCV');
    const monedaEtiquetasElem = document.getElementById('monedaEtiquetas');
    
    if (nombreElem) nombreElem.value = nombreEstablecimiento;
    if (tasaElem) tasaElem.value = tasaBCVGuardada || '';
    if (monedaEtiquetasElem) monedaEtiquetasElem.value = monedaEtiquetas;
}

function calcularPrecioVenta() {
    const tasaBCV = parseFloat(document.getElementById('tasaBCV').value) || tasaBCVGuardada;
    const costo = parseFloat(document.getElementById('costo').value);
    const ganancia = parseFloat(document.getElementById('ganancia').value);
    const unidadesPorCaja = parseFloat(document.getElementById('unidadesPorCaja').value);

    if (!tasaBCV || tasaBCV <= 0) return showToast("Ingrese una tasa BCV válida", 'error');
    if (!costo || !ganancia || !unidadesPorCaja) return showToast("Complete todos los campos requeridos", 'error');

    const gananciaDecimal = ganancia / 100;
    const precioDolar = costo / (1 - gananciaDecimal);
    const precioBolivares = precioDolar * tasaBCV;
    const precioUnitarioDolar = redondear2Decimales(precioDolar / unidadesPorCaja);
    const precioUnitarioBolivar = redondear2Decimales(precioBolivares / unidadesPorCaja);

    const precioUnitarioElem = document.getElementById('precioUnitario');
    if (precioUnitarioElem) {
        precioUnitarioElem.innerHTML = `<strong>Precio unitario:</strong> $${precioUnitarioDolar.toFixed(2)} / Bs${precioUnitarioBolivar.toFixed(2)}`;
    }
}

function guardarNombreEstablecimiento() {
    nombreEstablecimiento = document.getElementById('nombreEstablecimiento').value.trim();
    if (!nombreEstablecimiento) return showToast("Ingrese un nombre válido", 'error');
    localStorage.setItem('nombreEstablecimiento', nombreEstablecimiento);
    showToast(`Nombre guardado: "${nombreEstablecimiento}"`, 'success');
}

function actualizarTasaBCV() {
    const nuevaTasa = parseFloat(document.getElementById('tasaBCV').value);
    if (!nuevaTasa || nuevaTasa <= 0) return showToast("Ingrese una tasa BCV válida", 'error');

    tasaBCVGuardada = nuevaTasa;
    localStorage.setItem('tasaBCV', tasaBCVGuardada);

    productos.forEach(producto => {
        producto.precioUnitarioBolivar = producto.precioUnitarioDolar * nuevaTasa;
        producto.precioMayorBolivar = producto.precioMayorDolar * nuevaTasa;
    });

    localStorage.setItem('productos', JSON.stringify(productos));
    actualizarLista();
    actualizarGananciaTotal();
    showToast(`Tasa BCV actualizada a: ${nuevaTasa}`, 'success');
}

// ===== GUARDAR PRODUCTO =====
function guardarProducto() {
    if (!permitirEjecucion()) return;

    const nombre = document.getElementById('producto').value.trim();
    const codigoBarras = document.getElementById('codigoBarras').value.trim();
    const descripcion = document.getElementById('descripcion').value;
    const costo = parseFloat(document.getElementById('costo').value);
    const ganancia = parseFloat(document.getElementById('ganancia').value);
    const unidadesPorCaja = parseFloat(document.getElementById('unidadesPorCaja').value);
    const unidadesExistentes = parseFloat(document.getElementById('unidadesExistentes').value) || 0;
    const tasaBCV = parseFloat(document.getElementById('tasaBCV').value) || tasaBCVGuardada;

    if (!nombre || !descripcion) return showToast("Complete el nombre y descripción", 'error');
    if (!tasaBCV || tasaBCV <= 0) return showToast("Ingrese una tasa BCV válida", 'error');
    if (!costo || !ganancia || !unidadesPorCaja) return showToast("Complete todos los campos", 'error');

    // Validar código de barras único si es nuevo
    if (codigoBarras && productoEditando === null) {
        const codigoExistente = productos.findIndex(p => p.codigoBarras && p.codigoBarras.toLowerCase() === codigoBarras.toLowerCase());
        if (codigoExistente !== -1) return showToast("El código de barras ya existe", 'error');
    }

    const gananciaDecimal = ganancia / 100;
    const precioDolar = costo / (1 - gananciaDecimal);
    const precioBolivares = precioDolar * tasaBCV;
    const precioUnitarioDolar = redondear2Decimales(precioDolar / unidadesPorCaja);
    const precioUnitarioBolivar = redondear2Decimales(precioBolivares / unidadesPorCaja);

    const producto = {
        nombre, codigoBarras, descripcion, costo, ganancia: gananciaDecimal,
        unidadesPorCaja, unidadesExistentes, precioMayorDolar: precioDolar,
        precioMayorBolivar: precioBolivares, precioUnitarioDolar, precioUnitarioBolivar,
        fechaActualizacion: new Date().toISOString()
    };

    if (productoEditando !== null) {
        productos[productoEditando] = producto;
        showToast("✓ Producto actualizado", 'success');
        productoEditando = null;
    } else {
        productos.push(producto);
        showToast("✓ Producto guardado", 'success');
    }

    localStorage.setItem('productos', JSON.stringify(productos));
    actualizarLista();
    actualizarGananciaTotal();

    // Limpiar formulario
    document.getElementById('producto').value = '';
    document.getElementById('codigoBarras').value = '';
    document.getElementById('costo').value = '';
    document.getElementById('ganancia').value = '';
    document.getElementById('unidadesPorCaja').value = '';
    document.getElementById('unidadesExistentes').value = '';
    document.getElementById('descripcion').selectedIndex = 0;
    document.getElementById('precioUnitario').innerHTML = 'Precio unitario: ';
}

// ===== LISTA DE PRODUCTOS =====
function actualizarLista() {
    const tbody = document.querySelector('#listaProductos tbody');
    if (!tbody) return;
    
    // Usar fragmento para mejorar rendimiento
    const fragment = document.createDocumentFragment();
    const productosAMostrar = productosFiltrados.length > 0 ? productosFiltrados : productos;

    productosAMostrar.forEach((producto, index) => {
        const inventarioBajo = producto.unidadesExistentes <= 5;
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${producto.nombre || ''}</td>
            <td>${producto.descripcion || ''}</td>
            <td>${producto.codigoBarras || 'N/A'}</td>
            <td class="${inventarioBajo ? 'inventario-bajo' : ''}">${producto.unidadesExistentes || 0}</td>
            <td>
                <div class="ajuste-inventario">
                    <button onclick="ajustarInventario(${index}, 'sumar')" class="btn-inventario">+</button>
                    <button onclick="ajustarInventario(${index}, 'restar')" class="btn-inventario">-</button>
                </div>
            </td>
            <td>$${(producto.precioUnitarioDolar || 0).toFixed(2)}</td>
            <td>Bs${(producto.precioUnitarioBolivar || 0).toFixed(2)}</td>
            <td>${((producto.ganancia || 0) * 100).toFixed(0)}%</td>
            <td>
                <button class="editar" onclick="editarProducto(${index})">Editar</button>
                <button class="eliminar" onclick="eliminarProducto(${index})">Eliminar</button>
            </td>
        `;
        fragment.appendChild(fila);
    });

    // Limpiar y agregar nuevo contenido
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
}

// ===== BUSCAR PRODUCTO =====
let timeoutBusqueda;
function buscarProducto() {
    clearTimeout(timeoutBusqueda);
    timeoutBusqueda = setTimeout(() => {
        const termino = document.getElementById('buscar').value.trim().toLowerCase();
        if (!termino) {
            productosFiltrados = [];
            actualizarLista();
            return;
        }

        productosFiltrados = productos.filter(p =>
            (p.nombre || '').toLowerCase().includes(termino) ||
            (p.descripcion || '').toLowerCase().includes(termino) ||
            (p.codigoBarras && p.codigoBarras.toLowerCase().includes(termino))
        );
        actualizarLista();
    }, 300);
}

// ===== AJUSTAR INVENTARIO =====
function ajustarInventario(index, operacion) {
    if (!permitirEjecucion()) return;

    const claveAjuste = prompt("Ingrese la clave de seguridad:");
    if (claveAjuste !== claveSeguridad) return showToast('✗ Clave incorrecta', 'error');

    let indiceReal = index;
    if (productosFiltrados.length > 0) {
        const productoFiltrado = productosFiltrados[index];
        indiceReal = productos.findIndex(p => p.nombre === productoFiltrado.nombre && p.descripcion === productoFiltrado.descripcion);
        if (indiceReal === -1) return showToast("Producto no encontrado", 'error');
    }

    const producto = productos[indiceReal];
    const cantidad = parseInt(prompt(`Ingrese la cantidad a ${operacion === 'sumar' ? 'sumar' : 'restar'}:`, "1")) || 0;

    if (cantidad <= 0) return showToast("Ingrese una cantidad válida", 'error');
    if (operacion === 'restar' && producto.unidadesExistentes < cantidad) return showToast("No hay suficientes unidades", 'error');

    producto.unidadesExistentes = operacion === 'sumar' ? producto.unidadesExistentes + cantidad : producto.unidadesExistentes - cantidad;

    localStorage.setItem('productos', JSON.stringify(productos));
    actualizarLista();
    actualizarGananciaTotal();
    showToast(`Inventario de ${producto.nombre} actualizado`, 'success');
}

function editarProducto(index) {
    const claveIngresada = prompt("Ingrese la clave de seguridad:");
    if (claveIngresada !== claveSeguridad) return showToast('✗ Clave incorrecta', 'error');

    let indiceReal = index;
    if (productosFiltrados.length > 0) {
        const productoFiltrado = productosFiltrados[index];
        indiceReal = productos.findIndex(p => p.nombre === productoFiltrado.nombre && p.descripcion === productoFiltrado.descripcion);
        if (indiceReal === -1) return showToast("Producto no encontrado", 'error');
    }

    const producto = productos[indiceReal];
    document.getElementById('producto').value = producto.nombre || '';
    document.getElementById('codigoBarras').value = producto.codigoBarras || '';
    document.getElementById('descripcion').value = producto.descripcion || '';
    document.getElementById('costo').value = producto.costo || '';
    document.getElementById('ganancia').value = (producto.ganancia * 100) || '';
    document.getElementById('unidadesPorCaja').value = producto.unidadesPorCaja || '';
    document.getElementById('unidadesExistentes').value = producto.unidadesExistentes || '';

    const tasaBCV = parseFloat(document.getElementById('tasaBCV').value) || tasaBCVGuardada;
    if (tasaBCV > 0) {
        document.getElementById('precioUnitario').innerHTML = `<strong>Precio unitario:</strong> $${(producto.precioUnitarioDolar || 0).toFixed(2)} / Bs${((producto.precioUnitarioDolar || 0) * tasaBCV).toFixed(2)}`;
    }

    productoEditando = indiceReal;
    showToast(`Editando: ${producto.nombre}`, 'success');
}

function eliminarProducto(index) {
    if (!permitirEjecucion()) return;

    let indiceReal = index;
    if (productosFiltrados.length > 0) {
        const productoFiltrado = productosFiltrados[index];
        indiceReal = productos.findIndex(p => p.nombre === productoFiltrado.nombre && p.descripcion === productoFiltrado.descripcion);
        if (indiceReal === -1) return showToast("Producto no encontrado", 'error');
    }

    const producto = productos[indiceReal];
    if (confirm(`¿Eliminar "${producto.nombre}"?`)) {
        productos.splice(indiceReal, 1);
        localStorage.setItem('productos', JSON.stringify(productos));
        actualizarLista();
        actualizarGananciaTotal();
        showToast(`Producto eliminado`, 'success');
    }
}

// ===== FUNCIONES DE CÁLCULO DE TOTALES =====
function actualizarTotalInvertido() {
    let totalUSD = 0, totalBS = 0;
    productos.forEach(p => {
        totalUSD += p.costo || 0;
        totalBS += (p.costo || 0) * tasaBCVGuardada;
    });
    const elemUSD = document.getElementById('totalInvertidoUSD');
    const elemBS = document.getElementById('totalInvertidoBS');
    if (elemUSD) elemUSD.textContent = `$${redondear2Decimales(totalUSD).toFixed(2)} USD`;
    if (elemBS) elemBS.textContent = `/ Bs ${redondear2Decimales(totalBS).toFixed(2)}`;
}

function actualizarGananciaTotal() {
    let gananciaUSD = 0, gananciaBS = 0;
    productos.forEach(p => {
        const gananciaPorUnidadUSD = (p.precioUnitarioDolar || 0) - ((p.costo || 0) / (p.unidadesPorCaja || 1));
        const gananciaPorUnidadBS = (p.precioUnitarioBolivar || 0) - (((p.costo || 0) / (p.unidadesPorCaja || 1)) * tasaBCVGuardada);
        gananciaUSD += gananciaPorUnidadUSD * (p.unidadesExistentes || 0);
        gananciaBS += gananciaPorUnidadBS * (p.unidadesExistentes || 0);
    });
    const elemUSD = document.getElementById('gananciaTotalUSD');
    const elemBS = document.getElementById('gananciaTotalBS');
    if (elemUSD) elemUSD.textContent = `$${redondear2Decimales(gananciaUSD).toFixed(2)}`;
    if (elemBS) elemBS.textContent = `/ Bs ${redondear2Decimales(gananciaBS).toFixed(2)}`;
}

// ===== CARRITO =====
function calcularSubtotalSegunUnidad(item) {
    const producto = productos[item.indexProducto];
    if (!producto) return;

    if (item.unidad === 'gramo') {
        const precioPorGramoBolivar = (producto.precioUnitarioBolivar || 0) / 1000;
        const precioPorGramoDolar = (producto.precioUnitarioDolar || 0) / 1000;
        item.subtotal = redondear2Decimales(item.cantidad * precioPorGramoBolivar);
        item.subtotalDolar = redondear2Decimales(item.cantidad * precioPorGramoDolar);
    } else {
        item.subtotal = redondear2Decimales(item.cantidad * (item.precioUnitarioBolivar || 0));
        item.subtotalDolar = redondear2Decimales(item.cantidad * (item.precioUnitarioDolar || 0));
    }
}

function actualizarCarrito() {
    const carritoBody = document.getElementById('carritoBody');
    const totalCarritoBs = document.getElementById('totalCarritoBs');
    const totalCarritoDolares = document.getElementById('totalCarritoDolares');

    if (!carritoBody) return;

    if (carrito.length === 0) {
        carritoBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">El carrito está vacío</td></tr>';
        if (totalCarritoBs) totalCarritoBs.textContent = 'Total: Bs 0,00';
        if (totalCarritoDolares) totalCarritoDolares.textContent = 'Total: $ 0,00';
        return;
    }

    let totalBs = 0, totalDolares = 0;
    const fragment = document.createDocumentFragment();

    carrito.forEach((item, index) => {
        calcularSubtotalSegunUnidad(item);
        totalBs += item.subtotal || 0;
        totalDolares += item.subtotalDolar || 0;

        const row = document.createElement('tr');
        const cantidadMostrada = item.unidad === 'gramo' ? `${item.cantidad} g` : item.cantidad;
        const botonMas = item.unidad === 'gramo'
            ? `<button onclick="ingresarGramos(${index})" class="btn-carrito">+ g</button>`
            : `<button onclick="actualizarCantidadCarrito(${index}, 1)" class="btn-carrito">+</button>`;

        row.innerHTML = `
            <td>${item.nombre} (${item.descripcion})</td>
            <td>Bs ${(item.precioUnitarioBolivar || 0).toFixed(2)}</td>
            <td>
                <button onclick="actualizarCantidadCarrito(${index}, -1)" class="btn-carrito">-</button>
                ${cantidadMostrada}
                ${botonMas}
            </td>
            <td>
                <select onchange="cambiarUnidadCarrito(${index}, this.value)" class="unidad-selector">
                    <option value="unidad" ${item.unidad === 'unidad' ? 'selected' : ''}>Unidad</option>
                    <option value="gramo" ${item.unidad === 'gramo' ? 'selected' : ''}>Gramo</option>
                </select>
            </td>
            <td>Bs ${(item.subtotal || 0).toFixed(2)}</td>
            <td><button class="btn-eliminar-carrito" onclick="eliminarDelCarrito(${index})">Eliminar</button></td>
        `;
        fragment.appendChild(row);
    });

    carritoBody.innerHTML = '';
    carritoBody.appendChild(fragment);

    if (totalCarritoBs) totalCarritoBs.textContent = `Total: Bs ${redondear2Decimales(totalBs).toFixed(2)}`;
    if (totalCarritoDolares) totalCarritoDolares.textContent = `Total: $ ${redondear2Decimales(totalDolares).toFixed(2)}`;
}

function agregarProductoAlCarrito(productoEncontrado) {
    const indexProducto = productos.findIndex(p => p.nombre === productoEncontrado.nombre && p.descripcion === productoEncontrado.descripcion);
    if (indexProducto === -1) return showToast("Error: Producto no encontrado en inventario", 'error');

    const enCarrito = carrito.findIndex(item => item.nombre === productoEncontrado.nombre && item.descripcion === productoEncontrado.descripcion && item.unidad === 'unidad');

    if (enCarrito !== -1) {
        carrito[enCarrito].cantidad += 1;
        calcularSubtotalSegunUnidad(carrito[enCarrito]);
    } else {
        carrito.push({
            nombre: productoEncontrado.nombre,
            descripcion: productoEncontrado.descripcion,
            precioUnitarioBolivar: productoEncontrado.precioUnitarioBolivar,
            precioUnitarioDolar: productoEncontrado.precioUnitarioDolar,
            cantidad: 1,
            unidad: 'unidad',
            subtotal: productoEncontrado.precioUnitarioBolivar,
            subtotalDolar: productoEncontrado.precioUnitarioDolar,
            indexProducto: indexProducto
        });
    }

    document.getElementById('codigoBarrasInput').value = '';
    document.getElementById('codigoBarrasInput').focus();
    document.getElementById('scannerStatus').textContent = '✓ Producto agregado.';
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
}

function procesarEscaneo(codigo) {
    if (!codigo) return showToast("Código vacío", 'warning');

    let productoEncontrado = productos.find(p => p.codigoBarras && p.codigoBarras.toLowerCase() === codigo.toLowerCase());
    if (!productoEncontrado) productoEncontrado = productos.find(p => (p.nombre || '').toLowerCase() === codigo.toLowerCase());
    if (!productoEncontrado) productoEncontrado = productos.find(p => (p.nombre || '').toLowerCase().includes(codigo.toLowerCase()));

    if (!productoEncontrado) {
        showToast("Producto no encontrado: " + codigo, 'error');
        mostrarSugerenciasEspecificas(codigo);
        return;
    }

    agregarProductoAlCarrito(productoEncontrado);
}

function actualizarCantidadCarrito(index, cambio) {
    if (!permitirEjecucion()) return;
    const item = carrito[index];
    if (!item) return;

    item.cantidad += cambio;
    if (item.cantidad <= 0) {
        eliminarDelCarrito(index);
        return;
    }

    calcularSubtotalSegunUnidad(item);
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
}

function ingresarGramos(index) {
    if (!permitirEjecucion()) return;
    const item = carrito[index];
    if (!item) return;

    const producto = productos[item.indexProducto];
    if (!producto) return showToast("Producto no encontrado", 'error');

    const gramosInput = prompt("Ingrese la cantidad en gramos:", item.cantidad || '');
    if (gramosInput === null) return;

    const gramos = parseFloat(gramosInput);
    if (isNaN(gramos) || gramos <= 0) return showToast("Cantidad inválida", 'error');

    const disponibleGramos = (producto.unidadesExistentes || 0) * 1000;
    let enCarritoMismoProducto = 0;
    carrito.forEach((it, i) => {
        if (i !== index && it.indexProducto === item.indexProducto) {
            if (it.unidad === 'gramo') enCarritoMismoProducto += (parseFloat(it.cantidad) || 0);
            else enCarritoMismoProducto += (parseFloat(it.cantidad) || 0) * (producto.unidadesPorCaja || 1) * 1000;
        }
    });

    if ((gramos + enCarritoMismoProducto) > disponibleGramos) return showToast("Stock insuficiente", 'error');

    item.cantidad = gramos;
    item.unidad = 'gramo';
    calcularSubtotalSegunUnidad(item);
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
}

function cambiarUnidadCarrito(index, nuevaUnidad) {
    if (!permitirEjecucion()) return;
    const item = carrito[index];
    const producto = productos[item.indexProducto];
    if (!producto) return;

    if (nuevaUnidad === 'unidad' && item.unidad === 'gramo') {
        item.cantidad = Math.ceil(item.cantidad / 1000);
    }
    item.unidad = nuevaUnidad;
    calcularSubtotalSegunUnidad(item);
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
}

function eliminarDelCarrito(index) {
    if (!permitirEjecucion()) return;
    carrito.splice(index, 1);
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
}

// ===== FUNCIONES DE VENTA =====
function finalizarVenta() {
    if (carrito.length === 0) return showToast("El carrito está vacío", 'warning');
    const totalBs = carrito.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const totalDolares = carrito.reduce((sum, item) => sum + (item.subtotalDolar || 0), 0);
    document.getElementById('resumenTotalBs').textContent = `Total: Bs ${redondear2Decimales(totalBs).toFixed(2)}`;
    document.getElementById('resumenTotalDolares').textContent = `Total: $ ${redondear2Decimales(totalDolares).toFixed(2)}`;
    document.getElementById('modalPago').style.display = 'block';
    metodoPagoSeleccionado = null;
    document.getElementById('detallesPago').style.display = 'none';
}

function cerrarModalPago() {
    document.getElementById('modalPago').style.display = 'none';
    metodoPagoSeleccionado = null;
    detallesPago = {};
}

function seleccionarMetodoPago(metodo) {
    metodoPagoSeleccionado = metodo;
    const detallesDiv = document.getElementById('camposPago');
    const totalBs = carrito.reduce((sum, i) => sum + (i.subtotal || 0), 0);
    const totalDolares = carrito.reduce((sum, i) => sum + (i.subtotalDolar || 0), 0);
    detallesDiv.innerHTML = '';
    detallesPago = { metodo, totalBs, totalDolares };

    if (metodo === 'efectivo_bs' || metodo === 'efectivo_dolares') {
        const moneda = metodo === 'efectivo_bs' ? 'Bs' : '$';
        detallesDiv.innerHTML = `
            <div class="campo-pago"><label>Monto recibido (${moneda}):</label><input type="number" id="montoRecibido" placeholder="Ingrese monto" class="input-movil" /></div>
            <div class="campo-pago"><label>Cambio:</label><input type="text" id="cambioCalculado" readonly placeholder="0.00" class="input-movil" /></div>
        `;
        setTimeout(() => {
            document.getElementById('montoRecibido')?.addEventListener('input', function() {
                calcularFaltaOCambio(parseFloat(this.value) || 0, metodo, totalBs, totalDolares);
            });
        }, 100);
    } else if (metodo === 'punto' || metodo === 'biopago') {
        detallesDiv.innerHTML = `<div class="campo-pago"><label>Monto a pagar:</label><input type="number" id="montoPago" placeholder="Ingrese monto" class="input-movil" /></div>`;
    } else if (metodo === 'pago_movil') {
        detallesDiv.innerHTML = `
            <div class="campo-pago"><label>Monto a pagar:</label><input type="number" id="montoPagoMovil" placeholder="Ingrese monto" class="input-movil" /></div>
            <div class="campo-pago"><label>Referencia:</label><input type="text" id="refPagoMovil" placeholder="Referencia" class="input-movil" /></div>
            <div class="campo-pago"><label>Banco:</label><input type="text" id="bancoPagoMovil" placeholder="Banco" class="input-movil" /></div>
        `;
    }
    document.getElementById('detallesPago').style.display = 'block';
}

function calcularFaltaOCambio(montoRecibido, metodo, totalBs, totalDolares) {
    const mensajeDiv = document.getElementById('mensajePago');
    const cambioInput = document.getElementById('cambioCalculado');
    if (!mensajeDiv || !cambioInput) return;

    let mensaje = '', tipo = '';
    if (metodo === 'efectivo_bs') {
        if (montoRecibido < totalBs) {
            const falta = redondear2Decimales(totalBs - montoRecibido);
            mensaje = `Faltan Bs ${falta.toFixed(2)}`;
            tipo = 'falta';
            cambioInput.value = `-${falta.toFixed(2)}`;
        } else {
            const cambio = redondear2Decimales(montoRecibido - totalBs);
            mensaje = `Cambio: Bs ${cambio.toFixed(2)}`;
            tipo = 'cambio';
            cambioInput.value = cambio.toFixed(2);
        }
    } else if (metodo === 'efectivo_dolares') {
        if (montoRecibido < totalDolares) {
            const falta = redondear2Decimales(totalDolares - montoRecibido);
            mensaje = `Faltan $ ${falta.toFixed(2)}`;
            tipo = 'falta';
            cambioInput.value = `-${falta.toFixed(2)}`;
        } else {
            const cambio = redondear2Decimales(montoRecibido - totalDolares);
            mensaje = `Cambio: $ ${cambio.toFixed(2)}`;
            tipo = 'cambio';
            cambioInput.value = cambio.toFixed(2);
        }
    }
    mensajeDiv.textContent = mensaje;
    mensajeDiv.className = `mensaje-pago ${tipo}`;
    mensajeDiv.style.display = 'block';
}

function confirmarMetodoPago() {
    if (!metodoPagoSeleccionado) return showToast("Seleccione un método de pago", 'error');

    const totalBs = carrito.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const totalDolares = carrito.reduce((sum, item) => sum + (item.subtotalDolar || 0), 0);

    // Validaciones simples
    if (metodoPagoSeleccionado === 'efectivo_bs') {
        const recib = parseFloat(document.getElementById('montoRecibido')?.value) || 0;
        if (recib < totalBs) return showToast("Monto recibido menor al total", 'error');
        detallesPago.cambio = redondear2Decimales(recib - totalBs);
    } else if (metodoPagoSeleccionado === 'efectivo_dolares') {
        const recib = parseFloat(document.getElementById('montoRecibido')?.value) || 0;
        if (recib < totalDolares) return showToast("Monto recibido menor al total", 'error');
        detallesPago.cambio = redondear2Decimales(recib - totalDolares);
    }

    // Registrar venta
    carrito.forEach(item => {
        const producto = productos[item.indexProducto];
        if (producto) {
            if (item.unidad === 'gramo') producto.unidadesExistentes = redondear2Decimales(producto.unidadesExistentes - (item.cantidad / 1000));
            else producto.unidadesExistentes = redondear2Decimales(producto.unidadesExistentes - item.cantidad);
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

    localStorage.setItem('productos', JSON.stringify(productos));
    localStorage.setItem('ventasDiarias', JSON.stringify(ventasDiarias));

    showToast(`Venta completada por Bs ${redondear2Decimales(totalBs).toFixed(2)}`, 'success');

    detallesPago.totalBs = redondear2Decimales(totalBs);
    detallesPago.totalDolares = redondear2Decimales(totalDolares);
    detallesPago.items = JSON.parse(JSON.stringify(carrito));
    detallesPago.fecha = new Date().toLocaleString();

    carrito = [];
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
    actualizarLista();
    actualizarGananciaTotal();
    cerrarModalPago();
    imprimirTicketTermicoESC_POS(detallesPago);
}

// ===== FUNCIONES DE MODALES =====
function mostrarOpcionesPDF() { document.getElementById('modalCategorias').style.display = 'block'; }
function cerrarModalCategorias() { document.getElementById('modalCategorias').style.display = 'none'; }
function generarEtiquetasAnaqueles() { document.getElementById('modalEtiquetas').style.display = 'block'; }
function cerrarModalEtiquetas() { document.getElementById('modalEtiquetas').style.display = 'none'; }
function actualizarMonedaEtiquetas() {
    const selector = document.getElementById('monedaEtiquetas');
    if (selector) {
        monedaEtiquetas = selector.value;
        localStorage.setItem('monedaEtiquetas', monedaEtiquetas);
    }
}
function mostrarModalCambiarClave() { document.getElementById('modalCambiarClave').style.display = 'block'; }
function cerrarModalCambiarClave() { document.getElementById('modalCambiarClave').style.display = 'none'; }

// ===== FUNCIONES DE CLAVE =====
function cambiarClave() {
    const claveActual = document.getElementById('claveActual').value.trim();
    const nuevaClave = document.getElementById('nuevaClave').value.trim();
    const confirmarClave = document.getElementById('confirmarClave').value.trim();

    if (claveActual !== claveSeguridad) return showToast('Clave actual incorrecta', 'error');
    if (nuevaClave.length < 4) return showToast('La nueva clave debe tener al menos 4 caracteres', 'error');
    if (nuevaClave !== confirmarClave) return showToast('Las nuevas claves no coinciden', 'error');

    claveSeguridad = nuevaClave;
    localStorage.setItem('claveSeguridad', claveSeguridad);
    showToast('✓ Clave cambiada exitosamente', 'success');
    cerrarModalCambiarClave();
}

// ===== LISTA DE COSTOS =====
function mostrarListaCostos() {
    const container = document.getElementById('listaCostosContainer');
    const buscarInput = document.getElementById('buscarCostos');
    if (!container) return;
    if (container.style.display === 'none') {
        container.style.display = 'block';
        if (buscarInput) buscarInput.style.display = 'inline-block';
        llenarListaCostos();
        actualizarTotalInvertido();
    } else {
        container.style.display = 'none';
        if (buscarInput) buscarInput.style.display = 'none';
    }
}

function llenarListaCostos() {
    const lista = document.getElementById('listaCostos');
    if (!lista) return;
    const copia = [...productos].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    lista.innerHTML = copia.map(p => 
        `<li><span>${p.nombre} (${p.descripcion})</span><span>$${((p.costo || 0) / (p.unidadesPorCaja || 1)).toFixed(2)} / Bs${(p.precioUnitarioBolivar || 0).toFixed(2)}</span></li>`
    ).join('');
}

function filtrarListaCostos() {
    const termino = document.getElementById('buscarCostos').value.trim().toLowerCase();
    const lista = document.getElementById('listaCostos');
    if (!lista) return;
    const copia = [...productos].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    const filtrados = termino ? copia.filter(p => (p.nombre || '').toLowerCase().includes(termino) || (p.descripcion || '').toLowerCase().includes(termino)) : copia;
    lista.innerHTML = filtrados.map(p => 
        `<li><span>${p.nombre} (${p.descripcion})</span><span>$${((p.costo || 0) / (p.unidadesPorCaja || 1)).toFixed(2)} / Bs${(p.precioUnitarioBolivar || 0).toFixed(2)}</span></li>`
    ).join('');
}

// ===== FUNCIONES DE RESPALDO =====
function descargarBackup() {
    try {
        const backupData = {
            productos, nombreEstablecimiento, tasaBCV: tasaBCVGuardada,
            ventasDiarias, carrito, fechaBackup: new Date().toISOString(),
            version: '2.0', claveSeguridad, monedaEtiquetas
        };
        const dataStr = JSON.stringify(backupData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `respaldo_calc_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
        showToast('Respaldo descargado', 'success');
    } catch (error) {
        showToast('Error al descargar', 'error');
    }
}

function cargarBackup(files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.name.endsWith('.json')) return showToast('Archivo no válido', 'error');

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.productos || !Array.isArray(data.productos)) throw new Error('Formato inválido');

            if (confirm('¿Cargar respaldo? Se perderán los datos actuales.')) {
                localStorage.clear();
                localStorage.setItem('productos', JSON.stringify(data.productos));
                localStorage.setItem('nombreEstablecimiento', data.nombreEstablecimiento || '');
                localStorage.setItem('tasaBCV', data.tasaBCV || '0');
                localStorage.setItem('ventasDiarias', JSON.stringify(data.ventasDiarias || []));
                localStorage.setItem('carrito', JSON.stringify(data.carrito || []));
                if (data.claveSeguridad) localStorage.setItem('claveSeguridad', data.claveSeguridad);
                if (data.monedaEtiquetas) localStorage.setItem('monedaEtiquetas', data.monedaEtiquetas);
                showToast('Respaldo cargado. Recargando...', 'success');
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (error) {
            showToast('Error al cargar', 'error');
        }
    };
    reader.readAsText(file);
    document.getElementById('fileInput').value = '';
}

// ===== FUNCIONES DE PDF =====
function generarPDFPorCategoria(categoria) {
    cerrarModalCategorias();
    if (!productos.length) return showToast("No hay productos", 'warning');

    let filtrados = categoria === 'todos' ? [...productos] : productos.filter(p => p.descripcion === categoria);
    if (!filtrados.length) return showToast("Sin productos en categoría", 'warning');

    filtrados.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    const rows = filtrados.map(p => [p.nombre, `$${(p.precioUnitarioDolar || 0).toFixed(2)}`, `Bs ${(p.precioUnitarioBolivar || 0).toFixed(2)}`]);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(nombreEstablecimiento || 'Lista de Productos', 14, 18);
    doc.setFontSize(10);
    doc.text(`Categoría: ${categoria.toUpperCase()}`, 14, 26);
    doc.autoTable({ head: [['Producto', 'Precio ($)', 'Precio (Bs)']], body: rows, startY: 32 });
    doc.save(`lista_${categoria}_${new Date().toISOString().slice(0,10)}.pdf`);
    showToast(`PDF generado`, 'success');
}

function generarEtiquetasPorCategoria(categoria) {
    cerrarModalEtiquetas();
    if (!productos.length) return showToast("No hay productos", 'warning');

    let filtrados = categoria === 'todos' ? [...productos] : productos.filter(p => p.descripcion === categoria);
    if (!filtrados.length) return showToast("Sin productos en categoría", 'warning');

    filtrados.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210, margin = 10, labelWidth = 63, labelHeight = 35;
    let labelIndex = 0;

    filtrados.forEach((producto) => {
        if (labelIndex >= 21) { doc.addPage(); labelIndex = 0; }
        const row = Math.floor(labelIndex / 3);
        const col = labelIndex % 3;
        const x = margin + (col * labelWidth);
        const y = margin + (row * labelHeight);

        doc.setDrawColor(200,200,200).setFillColor(255,255,255).rect(x, y, labelWidth-2, labelHeight-2, 'FD');
        doc.setFontSize(8).setTextColor(100,100,100).text(nombreEstablecimiento || 'TIENDA', x+2, y+5);
        doc.setFontSize(10).setTextColor(0,0,0).text(producto.nombre.substring(0,25), x+2, y+10);
        doc.setFontSize(14).setTextColor(220,0,0).setFont(undefined,'bold');
        doc.text(monedaEtiquetas === 'USD' ? `$ ${(producto.precioUnitarioDolar || 0).toFixed(2)}` : `Bs ${(producto.precioUnitarioBolivar || 0).toFixed(2)}`, x+2, y+20);
        doc.setFontSize(7).setTextColor(100,100,100).setFont(undefined,'normal').text(`Cat: ${categoria}`, x+2, y+25);
        if (producto.codigoBarras) doc.setFontSize(6).text(`Cód: ${producto.codigoBarras}`, x+2, y+30);
        labelIndex++;
    });

    doc.save(`etiquetas_${categoria}_${new Date().toISOString().slice(0,10)}.pdf`);
    showToast(`Etiquetas generadas`, 'success');
}

function generarPDFCostos() {
    if (!productos.length) return showToast("No hay productos", 'warning');
    const copia = [...productos].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(nombreEstablecimiento || 'Lista de Costos', 14, 18);
    doc.setFontSize(10);
    const rows = copia.map(p => [p.nombre, p.descripcion, `$${((p.costo || 0) / (p.unidadesPorCaja || 1)).toFixed(2)}`, `Bs ${(p.precioUnitarioBolivar || 0).toFixed(2)}`]);
    doc.autoTable({ head: [['Producto', 'Descripción', 'Costo (u)', 'Precio Unit. (Bs)']], body: rows, startY: 28 });
    doc.save(`lista_costos_${new Date().toISOString().slice(0,10)}.pdf`);
}

function generarReporteDiario() {
    if (!ventasDiarias.length) return showToast("No hay ventas", 'warning');

    const hoy = new Date().toLocaleDateString();
    const ventasHoy = ventasDiarias.filter(v => v.fecha === hoy);
    const ventasAUsar = ventasHoy.length ? ventasHoy : ventasDiarias;

    let totalBs = 0, totalDolares = 0;
    const filas = ventasAUsar.map(v => {
        totalBs += v.totalBolivar || 0;
        const totalDolar = tasaBCVGuardada > 0 ? (v.totalBolivar || 0) / tasaBCVGuardada : 0;
        totalDolares += totalDolar;
        return [v.fecha, v.hora, v.producto, `${v.cantidad} ${v.unidad}`, `Bs ${(v.totalBolivar || 0).toFixed(2)}`, `$ ${totalDolar.toFixed(2)}`, v.metodoPago];
    });

    const llaveMaestra = redondear2Decimales(totalDolares / 100);
    const reinvertir = redondear2Decimales(llaveMaestra * 50);
    const gastosFijos = redondear2Decimales(llaveMaestra * 30);
    const sueldo = redondear2Decimales(llaveMaestra * 20);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt' });
    doc.setFontSize(14).text(nombreEstablecimiento || 'Reporte Diario', 40, 40);
    doc.setFontSize(10).text(`Fecha: ${new Date().toLocaleDateString()}`, 40, 60).text(`Tasa BCV: ${tasaBCVGuardada}`, 40, 75);
    doc.autoTable({ startY: 90, head: [['Fecha','Hora','Producto','Cant.','Total (Bs)','Total ($)','Pago']], body: filas, styles: { fontSize: 9 } });

    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 300;
    doc.setFontSize(12).setFont(undefined,'bold').text('RESUMEN FINANCIERO', 40, finalY+20);
    doc.setFontSize(11).setFont(undefined,'normal')
        .text(`Total ingresos en Bolívares: Bs ${totalBs.toFixed(2)}`, 40, finalY+40)
        .text(`Total ingresos en Dólares: $ ${totalDolares.toFixed(2)}`, 40, finalY+58)
        .setFontSize(12).setFont(undefined,'bold').text('DISTRIBUCIÓN 50-30-20 EN DÓLARES', 40, finalY+85)
        .setFontSize(11).setFont(undefined,'normal')
        .text(`50% Reinvertir: $ ${reinvertir.toFixed(2)}`, 40, finalY+105)
        .text(`30% Gastos fijos: $ ${gastosFijos.toFixed(2)}`, 40, finalY+123)
        .text(`20% Sueldo: $ ${sueldo.toFixed(2)}`, 40, finalY+141);
    doc.save(`reporte_${new Date().toISOString().slice(0,10)}.pdf`);
}

// ===== FUNCIONES DE EVENTOS Y UTILIDADES =====
function configurarEventos() {
    const buscarInput = document.getElementById('buscar');
    if (buscarInput) {
        buscarInput.addEventListener('keypress', (e) => e.key === 'Enter' && buscarProducto());
        buscarInput.addEventListener('input', buscarProducto);
    }

    const codigoInput = document.getElementById('codigoBarrasInput');
    if (codigoInput) {
        codigoInput.addEventListener('keydown', (e) => {
            const ahora = Date.now();
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                if (this.value.trim() && (ahora - tiempoUltimaTecla) < 100) {
                    procesarEscaneo(this.value.trim());
                    this.value = '';
                }
            }
            if (e.key.length === 1) {
                bufferEscaneo += e.key;
                tiempoUltimaTecla = ahora;
                clearTimeout(window.bufferTimeout);
                window.bufferTimeout = setTimeout(() => { bufferEscaneo = ''; }, 60);
            }
        });

        codigoInput.addEventListener('input', function() {
            const termino = this.value.trim().toLowerCase();
            const sugerenciasDiv = document.getElementById('sugerencias');
            if (!sugerenciasDiv) return;
            sugerenciasDiv.innerHTML = '';
            if (termino.length < 2) return;

            const coincidencias = productos.filter(p =>
                (p.nombre || '').toLowerCase().includes(termino) ||
                (p.codigoBarras && p.codigoBarras.toLowerCase().includes(termino))
            ).slice(0, 8);

            coincidencias.forEach(prod => {
                const opcion = document.createElement('div');
                opcion.textContent = `${prod.nombre} (${prod.descripcion})`;
                opcion.onclick = () => {
                    document.getElementById('codigoBarrasInput').value = prod.codigoBarras || prod.nombre;
                    procesarEscaneo(document.getElementById('codigoBarrasInput').value);
                    sugerenciasDiv.innerHTML = '';
                };
                sugerenciasDiv.appendChild(opcion);
            });
        });
    }

    setTimeout(() => document.getElementById('codigoBarrasInput')?.focus(), 500);
}

function configurarEventosMoviles() {
    if (!/Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;
    document.addEventListener('touchstart', (e) => {
        if (e.target.matches('input, select, textarea')) {
            setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        }
    }, { passive: true });
}

function mostrarSugerenciasEspecificas(codigo) {
    const div = document.getElementById('sugerencias');
    if (!div) return;
    div.innerHTML = '<div style="color:#ff6b6b; padding:5px;">No encontrado. Sugerencias:</div>';
    const similares = productos.filter(p =>
        (p.nombre || '').toLowerCase().includes(codigo.toLowerCase().substring(0,3)) ||
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(codigo.toLowerCase().substring(0,3)))
    ).slice(0,5);
    similares.forEach(p => {
        const opt = document.createElement('div');
        opt.style.cursor = 'pointer'; opt.style.padding = '5px';
        opt.innerHTML = `<strong>${p.nombre}</strong> - ${p.descripcion}`;
        opt.onclick = () => { agregarProductoAlCarrito(p); div.innerHTML = ''; };
        div.appendChild(opt);
    });
}

function toggleCopyrightNotice() {
    const notice = document.getElementById('copyrightNotice');
    if (notice) notice.style.display = notice.style.display === 'block' ? 'none' : 'block';
}

// ===== TOAST =====
function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ===== IMPRESIÓN TÉRMICA =====
async function imprimirTicketTermicoESC_POS(detalles) {
    try {
        if (typeof qz === 'undefined') {
            console.log('Simulando impresión');
            showToast("Ticket (simulado)", "success");
            return;
        }

        await qz.websocket.connect();
        const impresoras = await qz.printers.find();
        const termica = impresoras.find(p => p.toLowerCase().includes("epson") || p.toLowerCase().includes("thermal") || p.toLowerCase().includes("pos"));
        if (!termica) throw new Error("No se encontró impresora térmica");

        const config = qz.configs.create(termica);
        const fecha = new Date().toLocaleString();
        
        let ticket = [
            '\x1B\x40', // Inicializar
            '\x1B\x61\x01', // Centrar
            '\x1B\x21\x30', // Doble tamaño
            (nombreEstablecimiento || "MI NEGOCIO") + "\n",
            '\x1B\x21\x00', // Normal
            '\x1B\x61\x00', // Izquierda
            `${fecha}\n`,
            "--------------------------------\n"
        ];

        detalles.items.forEach(item => {
            ticket.push(`${item.nombre.substring(0,30)}\n`);
            ticket.push(`   ${item.cantidad} x ${item.precioUnitarioBolivar.toFixed(2)} = ${item.subtotal.toFixed(2)}\n`);
        });

        ticket.push("--------------------------------\n");
        ticket.push('\x1B\x21\x20'); // Negrita
        ticket.push(`TOTAL Bs: ${detalles.totalBs.toFixed(2)}\n`);
        ticket.push('\x1B\x21\x00');
        ticket.push(`USD Ref: $${detalles.totalDolares.toFixed(2)}\n`);
        ticket.push(`PAGO: ${detalles.metodoPago}\n`);
        ticket.push("\n¡Gracias!\n\n");
        ticket.push('\x1D\x56\x00'); // Corte

        await qz.print(config, ticket);
        await qz.websocket.disconnect();
        showToast("Ticket impreso", "success");
    } catch (err) {
        console.error("Error impresión:", err);
        showToast("Error al imprimir", "error");
    }
}
