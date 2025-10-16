// ===== VARIABLES GLOBALES =====
let productos = JSON.parse(localStorage.getItem('productos')) || [];
let nombreEstablecimiento = localStorage.getItem('nombreEstablecimiento') || '';
let tasaBCVGuardada = parseFloat(localStorage.getItem('tasaBCV')) || 0;
let ventasDiarias = JSON.parse(localStorage.getItem('ventasDiarias')) || [];
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
let metodoPagoSeleccionado = null;
let detallesPago = {};
let productoEditando = null;
let productosFiltrados = [];

// === VARIABLES PARA ESCÁNER MEJORADO ===
let tiempoUltimaTecla = 0;
let bufferEscaneo = '';
let focusActivo = false; // Controlar si el focus está activo

// ===== DETECCIÓN DE DISPOSITIVO MÓVIL =====
const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const esTablet = /iPad|Android|Tablet/i.test(navigator.userAgent);

// ===== INICIALIZACIÓN OPTIMIZADA PARA MÓVIL =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('Calculadora Mágica - Versión Móvil Optimizada');
    
    // Configurar viewport para diferentes dispositivos
    configurarViewport();
    
    // Inicializar sistemas
    inicializarSistemaInactividad();
    cargarDatosIniciales();
    actualizarLista();
    actualizarCarrito();
    configurarEventosMovil();
    
    // Focus automático en escáner SOLO si es móvil y no hay interacción previa
    setTimeout(() => {
        if (esMovil && !focusActivo) {
            activarFocusEscanner();
        }
    }, 1500);
});

// ===== CONFIGURACIÓN DE VIEWPORT DINÁMICA =====
function configurarViewport() {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (esMovil && !esTablet) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    } else if (esTablet) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=2.0, user-scalable=yes');
    }
}

// ===== CONFIGURACIÓN DE EVENTOS PARA MÓVIL CORREGIDA =====
function configurarEventosMovil() {
    // Búsqueda con enter
    const buscarInput = document.getElementById('buscar');
    if (buscarInput) {
        buscarInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') buscarProducto();
        });
        
        // Prevenir que el focus del buscador active el escáner
        buscarInput.addEventListener('focus', function() {
            focusActivo = true;
            desactivarFocusEscanner();
        });
        
        buscarInput.addEventListener('blur', function() {
            setTimeout(() => {
                if (!document.activeElement || document.activeElement.tagName === 'BODY') {
                    focusActivo = false;
                    reactivarFocusEscanner();
                }
            }, 500);
        });
    }

    // ESCÁNER OPTIMIZADO PARA MÓVIL - CORREGIDO
    const codigoInput = document.getElementById('codigoBarrasInput');
    if (codigoInput) {
        // Evento input para sugerencias
        codigoInput.addEventListener('input', function(e) {
            const termino = this.value.trim().toLowerCase();
            mostrarSugerencias(termino);
        });

        // Evento keydown para detección de escaneo
        codigoInput.addEventListener('keydown', function(e) {
            manejarEntradaEscaneo(e);
        });

        // Focus mejorado para móvil - CORREGIDO
        codigoInput.addEventListener('focus', function() {
            focusActivo = true;
        });

        codigoInput.addEventListener('blur', function() {
            // Solo reactivar el focus si el usuario no ha interactuado con otros campos
            setTimeout(() => {
                const activeElement = document.activeElement;
                const esCampoConfiguracion = activeElement && 
                    (activeElement.id === 'tasaBCV' || 
                     activeElement.id === 'nombreEstablecimiento' ||
                     activeElement.id === 'buscar' ||
                     activeElement.id === 'producto' ||
                     activeElement.id === 'codigoBarras' ||
                     activeElement.id === 'costo' ||
                     activeElement.id === 'ganancia' ||
                     activeElement.id === 'unidadesPorCaja' ||
                     activeElement.id === 'unidadesExistentes' ||
                     activeElement.closest('.config-section'));
                
                if (!esCampoConfiguracion && !activeElement) {
                    focusActivo = false;
                    reactivarFocusEscanner();
                }
            }, 1000);
        });

        // Evento táctil para limpiar sugerencias
        document.addEventListener('touchstart', function(e) {
            if (!e.target.closest('.scanner-input')) {
                ocultarSugerencias();
            }
        });
    }

    // PROTEGER TODOS LOS CAMPOS DE CONFIGURACIÓN
    const camposConfiguracion = [
        'tasaBCV', 'nombreEstablecimiento', 'producto', 'codigoBarras', 
        'costo', 'ganancia', 'unidadesPorCaja', 'unidadesExistentes', 'descripcion'
    ];
    
    camposConfiguracion.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            campo.addEventListener('focus', function() {
                focusActivo = true;
                desactivarFocusEscanner();
            });
            
            campo.addEventListener('blur', function() {
                setTimeout(() => {
                    const activeElement = document.activeElement;
                    if (!activeElement || 
                        (activeElement.tagName !== 'INPUT' && 
                         activeElement.tagName !== 'SELECT' && 
                         activeElement.tagName !== 'TEXTAREA')) {
                        focusActivo = false;
                        reactivarFocusEscanner();
                    }
                }, 500);
            });
        }
    });

    // Prevenir comportamiento por defecto en formularios
    document.addEventListener('touchstart', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
            e.target.classList.add('input-activo');
        }
    });

    document.addEventListener('touchend', function(e) {
        document.querySelectorAll('.input-activo').forEach(el => {
            el.classList.remove('input-activo');
        });
    });

    // Gestos táctiles para navegación rápida
    let startX, startY;
    document.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    });

    document.addEventListener('touchend', function(e) {
        if (!startX || !startY) return;
        
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const diffX = startX - endX;
        const diffY = startY - endY;
        
        // Swipe izquierda/derecha para navegar entre secciones
        if (Math.abs(diffX) > 50 && Math.abs(diffY) < 50) {
            if (diffX > 0) {
                scrollToSection('carrito');
            } else {
                scrollToSection('productos');
            }
        }
    });
}

// ===== FUNCIONES DE CONTROL DE FOCUS MEJORADAS =====
function activarFocusEscanner() {
    const codigoInput = document.getElementById('codigoBarrasInput');
    if (codigoInput && !focusActivo && esMovil) {
        try {
            codigoInput.focus();
            // Solo seleccionar texto si está vacío
            if (!codigoInput.value) {
                codigoInput.setSelectionRange(0, 0);
            }
        } catch (error) {
            console.log('Error al activar focus:', error);
        }
    }
}

function desactivarFocusEscanner() {
    focusActivo = true;
    const codigoInput = document.getElementById('codigoBarrasInput');
    if (codigoInput) {
        codigoInput.blur();
    }
}

function reactivarFocusEscanner() {
    if (!focusActivo && esMovil) {
        setTimeout(activarFocusEscanner, 500);
    }
}

// ===== MANEJO DE ESCANEO MEJORADO PARA MÓVIL =====
function manejarEntradaEscaneo(e) {
    const tiempoActual = new Date().getTime();
    
    if (e.key === 'Enter') {
        e.preventDefault();
        const valor = e.target.value.trim();
        if (valor) {
            procesarEscaneo(valor);
            e.target.value = '';
        }
        return;
    }
    
    // Detectar escaneo rápido (caracteres en rápida sucesión)
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        bufferEscaneo += e.key;
        tiempoUltimaTecla = tiempoActual;
        
        clearTimeout(window.bufferTimeout);
        window.bufferTimeout = setTimeout(() => {
            if (bufferEscaneo.length > 5) { // Posible código de barras
                procesarEscaneo(bufferEscaneo);
                e.target.value = '';
            }
            bufferEscaneo = '';
        }, 100);
    }
}

// ===== SUGERENCIAS MEJORADAS PARA TÁCTIL =====
function mostrarSugerencias(termino) {
    const sugerenciasDiv = document.getElementById('sugerencias');
    if (!sugerenciasDiv) return;
    
    sugerenciasDiv.innerHTML = '';

    if (termino.length < 2) return;

    const coincidencias = productos.filter(p =>
        (p.nombre || p.producto || '').toLowerCase().includes(termino) ||
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(termino))
    ).slice(0, 6);

    if (coincidencias.length === 0) {
        const noResults = document.createElement('div');
        noResults.textContent = 'No se encontraron productos';
        noResults.style.padding = '10px';
        noResults.style.color = '#666';
        noResults.style.fontStyle = 'italic';
        sugerenciasDiv.appendChild(noResults);
        return;
    }

    coincidencias.forEach(prod => {
        const opcion = document.createElement('div');
        opcion.className = 'sugerencia-item';
        opcion.innerHTML = `
            <strong>${(prod.nombre || prod.producto)}</strong>
            <small>${prod.descripcion || ''}</small>
            <div class="precio-sugerencia">Bs ${prod.precioUnitarioBolivar?.toFixed(2) || '0.00'}</div>
        `;
        
        opcion.addEventListener('touchstart', function(e) {
            e.preventDefault();
            this.style.backgroundColor = '#f0f0f0';
        });
        
        opcion.addEventListener('touchend', function(e) {
            e.preventDefault();
            this.style.backgroundColor = '';
            agregarProductoAlCarrito(prod);
            sugerenciasDiv.innerHTML = '';
            document.getElementById('codigoBarrasInput').value = '';
            // No forzar focus automático después de seleccionar sugerencia
        });
        
        sugerenciasDiv.appendChild(opcion);
    });
}

function ocultarSugerencias() {
    const sugerenciasDiv = document.getElementById('sugerencias');
    if (sugerenciasDiv) {
        sugerenciasDiv.innerHTML = '';
    }
}

// ===== NAVEGACIÓN POR SECCIONES =====
function scrollToSection(seccion) {
    const sections = {
        'calculator': '.calculator',
        'carrito': '.carrito-ventas', 
        'productos': '#listaProductos'
    };
    
    const element = document.querySelector(sections[seccion]);
    if (element) {
        const yOffset = -80;
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        
        window.scrollTo({
            top: y,
            behavior: 'smooth'
        });
        
        element.style.boxShadow = '0 0 0 3px rgba(38, 198, 218, 0.5)';
        setTimeout(() => {
            element.style.boxShadow = '';
        }, 1000);
    }
}

// ===== PROTECCIÓN CONTRA ACCESO DIRECTO (OPTIMIZADA) =====
(function() {
    const SESSION_KEY = 'calculadora_magica_session';
    const URL_REDIRECCION_PORTAL = "http://portal.calculadoramagica.lat/";
    
    const sessionValida = sessionStorage.getItem(SESSION_KEY);
    
    if (!sessionValida) {
        const referrer = document.referrer;
        const vieneDePortal = referrer && referrer.includes('portal.calculadoramagica.lat');
        const vieneDeClientes = referrer && referrer.includes('clientes.calculadoramagica.lat');
        
        if (!vieneDePortal && !vieneDeClientes && referrer !== '') {
            console.log('Acceso directo detectado, redirigiendo al portal...');
            window.location.href = URL_REDIRECCION_PORTAL;
            return;
        }
        
        sessionStorage.setItem(SESSION_KEY, 'activa_' + Date.now());
    }
})();

// ===== SISTEMA DE INACTIVIDAD MEJORADO =====
const TIEMPO_INACTIVIDAD = 5 * 60 * 1000;
const URL_REDIRECCION = "http://portal.calculadoramagica.lat/";

let temporizadorInactividad;
let ultimaActividad = Date.now();

function registrarActividad() {
    ultimaActividad = Date.now();
    reiniciarTemporizador();
}

function inicializarSistemaInactividad() {
    const ultimaActividadGuardada = localStorage.getItem('ultimaActividad');
    if (ultimaActividadGuardada) {
        ultimaActividad = parseInt(ultimaActividadGuardada);
        
        const tiempoTranscurrido = Date.now() - ultimaActividad;
        if (tiempoTranscurrido >= TIEMPO_INACTIVIDAD) {
            sessionStorage.removeItem('calculadora_magica_session');
            localStorage.removeItem('ultimaActividad');
            window.location.href = URL_REDIRECCION;
            return;
        }
    }
    
    reiniciarTemporizador();
    verificarInactividad();
}

function reiniciarTemporizador() {
    localStorage.setItem('ultimaActividad', Date.now().toString());
    
    if (temporizadorInactividad) {
        clearTimeout(temporizadorInactividad);
    }
    
    temporizadorInactividad = setTimeout(() => {
        sessionStorage.removeItem('calculadora_magica_session');
        localStorage.removeItem('ultimaActividad');
        window.location.href = URL_REDIRECCION;
    }, TIEMPO_INACTIVIDAD);
}

function verificarInactividad() {
    const tiempoTranscurrido = Date.now() - ultimaActividad;
    
    if (tiempoTranscurrido >= TIEMPO_INACTIVIDAD) {
        sessionStorage.removeItem('calculadora_magica_session');
        localStorage.removeItem('ultimaActividad');
        window.location.href = URL_REDIRECCION;
        return;
    }
    
    setTimeout(verificarInactividad, 1000);
}

// Eventos de actividad
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'input'].forEach(evento => {
    document.addEventListener(evento, registrarActividad, { passive: true });
});

// ===== FUNCIONES BÁSICAS OPTIMIZADAS =====
function cargarDatosIniciales() {
    const nombreElem = document.getElementById('nombreEstablecimiento');
    const tasaElem = document.getElementById('tasaBCV');
    if (nombreElem) nombreElem.value = nombreEstablecimiento;
    if (tasaElem) tasaElem.value = tasaBCVGuardada || '';
}

function redondear2Decimales(numero) {
    if (isNaN(numero)) return 0;
    return Math.round((numero + Number.EPSILON) * 100) / 100;
}

// ===== TOAST NOTIFICATIONS MEJORADAS =====
function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : '⚠';
    toast.innerHTML = `<span class="toast-icon">${icon}</span> ${message}`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => {
            if (container.contains(toast)) container.removeChild(toast);
        }, 300);
    }, duration);
}

// ===== CÁLCULO DE PRECIOS =====
function calcularPrecioVenta() {
    const tasaBCV = parseFloat(document.getElementById('tasaBCV').value) || tasaBCVGuardada;
    const costo = parseFloat(document.getElementById('costo').value);
    const ganancia = parseFloat(document.getElementById('ganancia').value);
    const unidadesPorCaja = parseFloat(document.getElementById('unidadesPorCaja').value);

    if (!tasaBCV || tasaBCV <= 0) {
        showToast("Ingrese una tasa BCV válida", 'error');
        return;
    }
    if (!costo || !ganancia || !unidadesPorCaja) {
        showToast("Complete todos los campos", 'error');
        return;
    }

    const gananciaDecimal = ganancia / 100;
    const precioDolar = costo / (1 - gananciaDecimal);
    const precioBolivares = precioDolar * tasaBCV;
    const precioUnitarioDolar = redondear2Decimales(precioDolar / unidadesPorCaja);
    const precioUnitarioBolivar = redondear2Decimales(precioBolivares / unidadesPorCaja);

    const precioUnitarioElem = document.getElementById('precioUnitario');
    if (precioUnitarioElem) {
        precioUnitarioElem.innerHTML = 
            `<strong>Precio unitario:</strong><br>
             $${precioUnitarioDolar.toFixed(2)} / Bs ${precioUnitarioBolivar.toFixed(2)}`;
    }
}

// ===== GESTIÓN DE PRODUCTOS =====
function guardarProducto() {
    const nombre = document.getElementById('producto').value.trim();
    const codigoBarras = document.getElementById('codigoBarras').value.trim();
    const descripcion = document.getElementById('descripcion').value;
    const costo = parseFloat(document.getElementById('costo').value);
    const ganancia = parseFloat(document.getElementById('ganancia').value);
    const unidadesPorCaja = parseFloat(document.getElementById('unidadesPorCaja').value);
    const unidadesExistentesInput = parseFloat(document.getElementById('unidadesExistentes').value) || 0;
    const tasaBCV = parseFloat(document.getElementById('tasaBCV').value) || tasaBCVGuardada;

    if (!nombre || !descripcion) { 
        showToast("Complete nombre y descripción", 'error'); 
        return; 
    }
    if (!tasaBCV || tasaBCV <= 0) { 
        showToast("Ingrese tasa BCV válida", 'error'); 
        return; 
    }
    if (!costo || !ganancia || !unidadesPorCaja) { 
        showToast("Complete todos los campos", 'error'); 
        return; 
    }

    if (codigoBarras && productoEditando === null) {
        const codigoExistente = productos.findIndex(p => 
            p.codigoBarras && p.codigoBarras.toLowerCase() === codigoBarras.toLowerCase()
        );
        if (codigoExistente !== -1) {
            showToast("Código de barras ya existe", 'error');
            return;
        }
    }

    const gananciaDecimal = ganancia / 100;
    const precioDolar = costo / (1 - gananciaDecimal);
    const precioBolivares = precioDolar * tasaBCV;
    const precioUnitarioDolar = redondear2Decimales(precioDolar / unidadesPorCaja);
    const precioUnitarioBolivar = redondear2Decimales(precioBolivares / unidadesPorCaja);

    const producto = {
        nombre,
        codigoBarras,
        descripcion,
        costo,
        ganancia: gananciaDecimal,
        unidadesPorCaja,
        unidadesExistentes: unidadesExistentesInput,
        precioMayorDolar: precioDolar,
        precioMayorBolivar: precioBolivares,
        precioUnitarioDolar: precioUnitarioDolar,
        precioUnitarioBolivar: precioUnitarioBolivar,
        fechaActualizacion: new Date().toISOString()
    };

    let productoExistenteIndex = productoEditando !== null ? productoEditando : 
        productos.findIndex(p => (p.nombre || p.producto || '').toLowerCase() === nombre.toLowerCase());

    if (productoExistenteIndex !== -1) {
        productos[productoExistenteIndex] = producto;
        showToast("✓ Producto actualizado", 'success');
    } else {
        productos.push(producto);
        showToast("✓ Producto guardado", 'success');
    }

    localStorage.setItem('productos', JSON.stringify(productos));
    actualizarLista();

    document.getElementById('producto').value = '';
    document.getElementById('codigoBarras').value = '';
    document.getElementById('costo').value = '';
    document.getElementById('ganancia').value = '';
    document.getElementById('unidadesPorCaja').value = '';
    document.getElementById('unidadesExistentes').value = '';
    document.getElementById('descripcion').selectedIndex = 0;
    document.getElementById('precioUnitario').innerHTML = '';

    productoEditando = null;
}

function editarProducto(index) {
    let indiceReal = index;
    
    if (productosFiltrados.length > 0) {
        const productoFiltrado = productosFiltrados[index];
        indiceReal = productos.findIndex(p => 
            p.nombre === productoFiltrado.nombre && 
            p.descripcion === productoFiltrado.descripcion
        );
        
        if (indiceReal === -1) {
            showToast("Producto no encontrado", 'error');
            return;
        }
    }
    
    const producto = productos[indiceReal];
    if (!producto) return;

    document.getElementById('producto').value = producto.nombre || '';
    document.getElementById('codigoBarras').value = producto.codigoBarras || '';
    document.getElementById('descripcion').value = producto.descripcion || '';
    document.getElementById('costo').value = producto.costo || '';
    document.getElementById('ganancia').value = (producto.ganancia * 100) || '';
    document.getElementById('unidadesPorCaja').value = producto.unidadesPorCaja || '';
    document.getElementById('unidadesExistentes').value = producto.unidadesExistentes || '';
    
    const tasaBCV = parseFloat(document.getElementById('tasaBCV').value) || tasaBCVGuardada;
    if (tasaBCV > 0) {
        const precioUnitarioDolar = producto.precioUnitarioDolar;
        const precioUnitarioBolivar = precioUnitarioDolar * tasaBCV;
        document.getElementById('precioUnitario').innerHTML =
            `<strong>Precio unitario:</strong><br>
             $${precioUnitarioDolar.toFixed(2)} / Bs ${precioUnitarioBolivar.toFixed(2)}`;
    }

    productoEditando = indiceReal;
    showToast(`Editando: ${producto.nombre}`, 'success');
    
    scrollToSection('calculator');
}

// ===== CARRITO DE VENTAS OPTIMIZADO =====
function procesarEscaneo(codigo) {
    if (!codigo) {
        showToast("Código vacío", 'warning');
        return;
    }

    let productoEncontrado = productos.find(p =>
        p.codigoBarras && p.codigoBarras.toLowerCase() === codigo.toLowerCase()
    );

    if (!productoEncontrado) {
        productoEncontrado = productos.find(p =>
            (p.nombre || '').toLowerCase() === codigo.toLowerCase()
        );
    }

    if (!productoEncontrado) {
        productoEncontrado = productos.find(p =>
            (p.nombre || '').toLowerCase().includes(codigo.toLowerCase())
        );
    }

    if (!productoEncontrado) {
        showToast("Producto no encontrado", 'error');
        return;
    }

    agregarProductoAlCarrito(productoEncontrado);
}

function agregarProductoAlCarrito(producto) {
    const enCarrito = carrito.findIndex(item => 
        item.nombre === producto.nombre && item.unidad === 'unidad'
    );

    if (enCarrito !== -1) {
        carrito[enCarrito].cantidad += 1;
        carrito[enCarrito].subtotal = redondear2Decimales(carrito[enCarrito].cantidad * carrito[enCarrito].precioUnitarioBolivar);
        carrito[enCarrito].subtotalDolar = redondear2Decimales(carrito[enCarrito].cantidad * carrito[enCarrito].precioUnitarioDolar);
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
            indexProducto: productos.findIndex(p => p.nombre === producto.nombre)
        });
    }

    const codigoInput = document.getElementById('codigoBarrasInput');
    if (codigoInput) {
        codigoInput.value = '';
        // NO forzar focus automáticamente después de agregar producto
    }

    const scannerStatus = document.getElementById('scannerStatus');
    if (scannerStatus) scannerStatus.textContent = '✓ Producto agregado';

    const carritoElement = document.querySelector('.carrito-ventas');
    carritoElement.style.transform = 'scale(1.02)';
    setTimeout(() => {
        carritoElement.style.transform = 'scale(1)';
    }, 200);

    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
    
    showToast(`Agregado: ${producto.nombre}`, 'success');
}

function actualizarCarrito() {
    const carritoBody = document.getElementById('carritoBody');
    const totalCarritoBs = document.getElementById('totalCarritoBs');
    const totalCarritoDolares = document.getElementById('totalCarritoDolares');

    if (!carritoBody) return;

    carritoBody.innerHTML = '';

    if (carrito.length === 0) {
        carritoBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">El carrito está vacío</td></tr>';
        if (totalCarritoBs) totalCarritoBs.textContent = 'Total: Bs 0,00';
        if (totalCarritoDolares) totalCarritoDolares.textContent = 'Total: $ 0,00';
        return;
    }

    let totalBs = 0;
    let totalDolares = 0;

    carrito.forEach((item, index) => {
        totalBs += item.subtotal;
        totalDolares += item.subtotalDolar;

        const cantidadMostrada = item.unidad === 'gramo' ? `${item.cantidad} g` : item.cantidad;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong>${item.nombre}</strong><br>
                <small>${item.descripcion}</small>
            </td>
            <td>Bs ${item.precioUnitarioBolivar.toFixed(2)}</td>
            <td>
                <div class="controles-cantidad">
                    <button onclick="actualizarCantidadCarrito(${index}, -1)" class="btn-cantidad">−</button>
                    <span>${cantidadMostrada}</span>
                    <button onclick="actualizarCantidadCarrito(${index}, 1)" class="btn-cantidad">+</button>
                </div>
            </td>
            <td>Bs ${item.subtotal.toFixed(2)}</td>
            <td>
                <button onclick="eliminarDelCarrito(${index})" class="btn-eliminar-carrito">🗑️</button>
            </td>
        `;
        carritoBody.appendChild(row);
    });

    if (totalCarritoBs) totalCarritoBs.textContent = `Total: Bs ${redondear2Decimales(totalBs).toFixed(2)}`;
    if (totalCarritoDolares) totalCarritoDolares.textContent = `Total: $ ${redondear2Decimales(totalDolares).toFixed(2)}`;
}

function actualizarCantidadCarrito(index, cambio) {
    const item = carrito[index];
    if (!item) return;

    item.cantidad += cambio;

    if (item.cantidad <= 0) {
        eliminarDelCarrito(index);
        return;
    }

    item.subtotal = redondear2Decimales(item.cantidad * item.precioUnitarioBolivar);
    item.subtotalDolar = redondear2Decimales(item.cantidad * item.precioUnitarioDolar);

    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
}

function eliminarDelCarrito(index) {
    const producto = carrito[index].nombre;
    carrito.splice(index, 1);
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
    showToast(`Eliminado: ${producto}`, 'warning');
}

// ===== LISTA DE PRODUCTOS =====
function actualizarLista() {
    const tbody = document.querySelector('#listaProductos tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    productosFiltrados = [];

    productos.forEach((producto, index) => {
        const inventarioBajo = producto.unidadesExistentes <= 5;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong>${producto.nombre}</strong>
                ${producto.codigoBarras ? `<br><small>Cód: ${producto.codigoBarras}</small>` : ''}
            </td>
            <td>${producto.descripcion}</td>
            <td class="${inventarioBajo ? 'inventario-bajo' : ''}">
                ${producto.unidadesExistentes}
            </td>
            <td>Bs ${producto.precioUnitarioBolivar.toFixed(2)}</td>
            <td>
                <div class="acciones-producto">
                    <button onclick="editarProducto(${index})" class="btn-editar">✏️</button>
                    <button onclick="eliminarProducto(${index})" class="btn-eliminar">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function buscarProducto() {
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

    const tbody = document.querySelector('#listaProductos tbody');
    tbody.innerHTML = '';

    productosFiltrados.forEach((producto, index) => {
        const inventarioBajo = producto.unidadesExistentes <= 5;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong>${producto.nombre}</strong>
                ${producto.codigoBarras ? `<br><small>Cód: ${producto.codigoBarras}</small>` : ''}
            </td>
            <td>${producto.descripcion}</td>
            <td class="${inventarioBajo ? 'inventario-bajo' : ''}">
                ${producto.unidadesExistentes}
            </td>
            <td>Bs ${producto.precioUnitarioBolivar.toFixed(2)}</td>
            <td>
                <div class="acciones-producto">
                    <button onclick="editarProducto(${index})" class="btn-editar">✏️</button>
                    <button onclick="eliminarProducto(${index})" class="btn-eliminar">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function eliminarProducto(index) {
    let indiceReal = index;
    
    if (productosFiltrados.length > 0) {
        const productoFiltrado = productosFiltrados[index];
        indiceReal = productos.findIndex(p => 
            p.nombre === productoFiltrado.nombre && 
            p.descripcion === productoFiltrado.descripcion
        );
        
        if (indiceReal === -1) {
            showToast("Producto no encontrado", 'error');
            return;
        }
    }
    
    const producto = productos[indiceReal];
    
    if (confirm(`¿Eliminar "${producto.nombre}"?`)) {
        productos.splice(indiceReal, 1);
        localStorage.setItem('productos', JSON.stringify(productos));
        actualizarLista();
        showToast(`Eliminado: ${producto.nombre}`, 'success');
    }
}

// ===== MÉTODOS DE PAGO =====
function finalizarVenta() {
    if (carrito.length === 0) { 
        showToast("El carrito está vacío", 'warning'); 
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
}

function cerrarModalPago() {
    document.getElementById('modalPago').style.display = 'none';
    metodoPagoSeleccionado = null;
    detallesPago = {};
}

// ===== FUNCIONES ADICIONALES =====
function guardarNombreEstablecimiento() {
    nombreEstablecimiento = document.getElementById('nombreEstablecimiento').value.trim();
    if (!nombreEstablecimiento) { 
        showToast("Ingrese un nombre válido", 'error'); 
        return; 
    }
    localStorage.setItem('nombreEstablecimiento', nombreEstablecimiento);
    showToast(`Nombre guardado: "${nombreEstablecimiento}"`, 'success');
}

function actualizarTasaBCV() {
    const nuevaTasa = parseFloat(document.getElementById('tasaBCV').value);

    if (!nuevaTasa || nuevaTasa <= 0) { 
        showToast("Ingrese una tasa BCV válida", 'error'); 
        return; 
    }

    tasaBCVGuardada = nuevaTasa;
    localStorage.setItem('tasaBCV', tasaBCVGuardada);

    productos.forEach(producto => {
        producto.precioUnitarioBolivar = producto.precioUnitarioDolar * nuevaTasa;
        producto.precioMayorBolivar = producto.precioMayorDolar * nuevaTasa;
    });

    localStorage.setItem('productos', JSON.stringify(productos));
    actualizarLista();

    showToast(`Tasa BCV actualizada: ${nuevaTasa}`, 'success');
}

function toggleCopyrightNotice() {
    const notice = document.getElementById('copyrightNotice');
    if (!notice) return;
    notice.style.display = notice.style.display === 'block' ? 'none' : 'block';
}

// Cerrar modales al hacer clic fuera
window.onclick = function(event) {
    const modales = ['modalPago', 'modalCategorias', 'modalEtiquetas'];
    modales.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });
};

// Manejar la visibilidad de la página
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Página no visible
    } else {
        registrarActividad();
    }
});

// Manejar el evento beforeunload para guardar datos
window.addEventListener('beforeunload', function() {
    localStorage.setItem('ultimaActividad', Date.now().toString());
});

console.log('Calculadora Mágica - JavaScript móvil optimizado cargado');
