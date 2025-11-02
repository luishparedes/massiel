// ===== VARIABLES GLOBALES =====
let productos = JSON.parse(localStorage.getItem('productos')) || [];
let nombreEstablecimiento = localStorage.getItem('nombreEstablecimiento') || '';
let tasaBCVGuardada = parseFloat(localStorage.getItem('tasaBCV')) || 0;
let ventasDiarias = JSON.parse(localStorage.getItem('ventasDiarias')) || [];
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
let métodoPagoSeleccionado = null;
let detallesPago = {};
let productoEditando = null;
let productosFiltrados = [];

// === NUEVAS VARIABLES PARA ESCÁNER ===
let tiempoUltimaTecla = 0;
let bufferEscaneo = '';

// ===== PROTECCIÓN CONTRA ACCESO DIRECTO =====
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

// ===== SISTEMA DE REDIRECCIÓN POR INACTIVIDAD MEJORADO =====
const TIEMPO_INACTIVIDAD = 4 * 60 * 1000;
const URL_REDIRECCION = "http://portal.calculadoramagica.lat/";

let temporizadorInactividad;
let ultimaActividad = Date.now();

function registrarActividad() {
    ultimaActividad = Date.now();
    reiniciarTemporizador();
}

function verificarInactividad() {
    const tiempoTranscurrido = Date.now() - ultimaActividad;
    
    if (tiempoTranscurrido >= TIEMPO_INACTIVIDAD) {
        console.log('Redirigiendo por inactividad después de', Math.round(tiempoTranscurrido / 1000), 'segundos');
        sessionStorage.removeItem('calculadora_magica_session');
        localStorage.removeItem('ultimaActividad');
        window.location.href = URL_REDIRECCION;
        return;
    }
    
    setTimeout(verificarInactividad, 1000);
}

function reiniciarTemporizador() {
    localStorage.setItem('ultimaActividad', Date.now().toString());
    
    if (temporizadorInactividad) {
        clearTimeout(temporizadorInactividad);
    }
    
    temporizadorInactividad = setTimeout(() => {
        console.log('Temporizador de inactividad ejecutado');
        sessionStorage.removeItem('calculadora_magica_session');
        localStorage.removeItem('ultimaActividad');
        window.location.href = URL_REDIRECCION;
    }, TIEMPO_INACTIVIDAD);
}

['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'input'].forEach(evento => {
    document.addEventListener(evento, registrarActividad, { passive: true });
});

function inicializarSistemaInactividad() {
    const ultimaActividadGuardada = localStorage.getItem('ultimaActividad');
    if (ultimaActividadGuardada) {
        ultimaActividad = parseInt(ultimaActividadGuardada);
        
        const tiempoTranscurrido = Date.now() - ultimaActividad;
        if (tiempoTranscurrido >= TIEMPO_INACTIVIDAD) {
            console.log('Sesión expirada al cargar. Redirigiendo...');
            sessionStorage.removeItem('calculadora_magica_session');
            localStorage.removeItem('ultimaActividad');
            window.location.href = URL_REDIRECCION;
            return;
        }
    }
    
    reiniciarTemporizador();
    verificarInactividad();
}

// ===== PROTECCIÓN CONTRA F12 Y HERRAMIENTAS DE DESARROLLO =====
(function() {
    function mostrarAdvertenciaSeguridad() {
        console.log('%c⚠️ ACCESO RESTRINGIDO ⚠️', 'color: red; font-size: 20px; font-weight: bold;');
        console.log('El uso de herramientas de desarrollo está restringido en esta aplicación.');
        alert('⚠️ Acceso restringido\nEl uso de F12 y herramientas de desarrollo no está permitido en esta aplicación.');
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' || e.keyCode === 123 ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.keyCode === 73)) ||
            (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.keyCode === 74)) ||
            (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.keyCode === 67)) ||
            (e.ctrlKey && (e.key === 'U' || e.keyCode === 85))) {
            e.preventDefault();
            mostrarAdvertenciaSeguridad();
            return false;
        }
    });
    
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        mostrarAdvertenciaSeguridad();
        return false;
    });
    
    function detectarDevTools() {
        const umbral = 160;
        const inicio = performance.now();
        debugger;
        const fin = performance.now();
        
        if (fin - inicio > umbral) {
            mostrarAdvertenciaSeguridad();
        }
    }
    
    setInterval(detectarDevTools, 1000);
})();

// ===== FUNCIÓN PARA REDONDEAR A 2 DECIMALES =====
function redondear2Decimales(numero) {
    if (isNaN(numero)) return 0;
    return Math.round((numero + Number.EPSILON) * 100) / 100;
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('Calculadora iniciada correctamente');
    inicializarSistemaInactividad();
    cargarDatosIniciales();
    actualizarLista();
    actualizarCarrito();
    configurarEventos();
    configurarEventosMoviles();
});

// ===== CONFIGURACIÓN ESPECÍFICA PARA MÓVILES =====
function configurarEventosMoviles() {
    document.addEventListener('touchstart', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
            document.body.style.zoom = '100%';
        }
    });
    
    document.addEventListener('touchmove', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
            e.preventDefault();
        }
    }, { passive: false });
    
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
}

// ===== UTILIDADES / TOASTS =====
function showToast(message, type = 'success', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'success' : type === 'error' ? 'error' : 'warning'}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        setTimeout(() => {
            if (container.contains(toast)) container.removeChild(toast);
        }, 300);
    }, duration);
}

// ===== CONFIGURACIÓN DE EVENTOS MEJORADA =====
function configurarEventos() {
    const buscarInput = document.getElementById('buscar');
    if (buscarInput) {
        buscarInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarProducto();
            }
        });
        
        buscarInput.addEventListener('input', function(e) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                buscarProducto();
            }, 500);
        });
    }

    const codigoInput = document.getElementById('codigoBarrasInput');
    if (codigoInput) {
        codigoInput.addEventListener('keydown', function(e) {
            const tiempoActual = new Date().getTime();
            
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                
                if (this.value.trim() && (tiempoActual - tiempoUltimaTecla) < 100) {
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
                    if (bufferEscaneo.length > 0) {
                        bufferEscaneo = '';
                    }
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
                (p.nombre || p.producto || '').toLowerCase().includes(termino) ||
                (p.codigoBarras && p.codigoBarras.toLowerCase().includes(termino))
            );

            coincidencias.slice(0, 8).forEach(prod => {
                const opcion = document.createElement('div');
                opcion.textContent = `${(prod.nombre || prod.producto)} (${prod.descripcion || prod.descripcion})`;
                opcion.onclick = function() {
                    document.getElementById('codigoBarrasInput').value = prod.codigoBarras || prod.nombre || prod.producto;
                    procesarEscaneo(document.getElementById('codigoBarrasInput').value);
                    sugerenciasDiv.innerHTML = '';
                    document.getElementById('codigoBarrasInput').focus();
                };
                sugerenciasDiv.appendChild(opcion);
            });
        });

        codigoInput.addEventListener('blur', function() {
            setTimeout(() => {
                const activeElement = document.activeElement;
                const esCampoConfiguracion = activeElement && 
                    (activeElement.id === 'tasaBCV' || 
                     activeElement.id === 'nombreEstablecimiento' ||
                     activeElement.closest('.config-section'));
                
                if (!esCampoConfiguracion && 
                    (!activeElement || 
                     !activeElement.matches('button, input[type="text"], select, textarea'))) {
                    codigoInput.focus();
                }
            }, 100);
        });
    }

    setTimeout(() => {
        if (codigoInput) {
            codigoInput.focus();
            codigoInput.select();
        }
    }, 500);

    const camposConfiguracion = ['tasaBCV', 'nombreEstablecimiento'];
    camposConfiguracion.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            campo.addEventListener('focus', function() {
                this.setAttribute('data-scanning-disabled', 'true');
            });
            campo.addEventListener('blur', function() {
                this.removeAttribute('data-scanning-disabled');
            });
        }
    });
}

// ===== BUSCADOR RÁPIDO =====
const codigoInputElem = document.getElementById('codigoBarrasInput');
if (codigoInputElem) {
    codigoInputElem.addEventListener('input', function() {
        const termino = this.value.trim().toLowerCase();
        const sugerenciasDiv = document.getElementById('sugerencias');
        if (!sugerenciasDiv) return;
        sugerenciasDiv.innerHTML = '';

        if (termino.length < 2) return;

        const coincidencias = productos.filter(p =>
            (p.nombre || p.producto || '').toLowerCase().includes(termino) ||
            (p.codigoBarras && p.codigoBarras.toLowerCase().includes(termino))
        );

        coincidencias.slice(0, 8).forEach(prod => {
            const opcion = document.createElement('div');
            opcion.textContent = `${(prod.nombre || prod.producto)} (${prod.descripcion || prod.descripcion})`;
            opcion.onclick = function() {
                document.getElementById('codigoBarrasInput').value = prod.codigoBarras || prod.nombre || prod.producto;
                agregarPorCodigoBarras();
                sugerenciasDiv.innerHTML = '';
                document.getElementById('codigoBarrasInput').focus();
            };
            sugerenciasDiv.appendChild(opcion);
        });
    });
}

// ===== FUNCIONES BÁSICAS =====
function cargarDatosIniciales() {
    const nombreElem = document.getElementById('nombreEstablecimiento');
    const tasaElem = document.getElementById('tasaBCV');
    if (nombreElem) nombreElem.value = nombreEstablecimiento;
    if (tasaElem) tasaElem.value = tasaBCVGuardada || '';
}

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
        showToast("Complete todos los campos requeridos", 'error');
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
            `<strong>Precio unitario:</strong> $${precioUnitarioDolar.toFixed(2)} / Bs${precioUnitarioBolivar.toFixed(2)}`;
    }
}

// ===== GUARDAR / EDITAR PRODUCTOS =====
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
        showToast("Complete el nombre y descripción del producto", 'error'); 
        return; 
    }
    if (!tasaBCV || tasaBCV <= 0) { 
        showToast("Ingrese una tasa BCV válida", 'error'); 
        return; 
    }
    if (!costo || !ganancia || !unidadesPorCaja) { 
        showToast("Complete todos los campos requeridos", 'error'); 
        return; 
    }

    if (codigoBarras && productoEditando === null) {
        const codigoExistente = productos.findIndex(p => 
            p.codigoBarras && p.codigoBarras.toLowerCase() === codigoBarras.toLowerCase()
        );
        if (codigoExistente !== -1) {
            showToast("El código de barras ya existe para otro producto", 'error');
            return;
        }
    }

    let productoExistenteIndex = -1;
    if (productoEditando !== null) {
        productoExistenteIndex = productoEditando;
    } else {
        productoExistenteIndex = productos.findIndex(p => 
            (p.nombre || p.producto || '').toLowerCase() === nombre.toLowerCase()
        );
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

    if (productoExistenteIndex !== -1) {
        productos[productoExistenteIndex] = producto;
        showToast("✓ Producto actualizado exitosamente", 'success');
    } else {
        productos.push(producto);
        showToast("✓ Producto guardado exitosamente", 'success');
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
        if (!productoFiltrado) return;
        
        indiceReal = productos.findIndex(p => 
            p.nombre === productoFiltrado.nombre && 
            p.descripcion === productoFiltrado.descripcion
        );
        
        if (indiceReal === -1) {
            showToast("Error: Producto no encontrado en la lista principal", 'error');
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
            `<strong>Precio unitario:</strong> $${precioUnitarioDolar.toFixed(2)} / Bs${precioUnitarioBolivar.toFixed(2)}`;
    }

    productoEditando = indiceReal;
    
    showToast(`Editando: ${producto.nombre}`, 'success');
}

// ===== CARRITO DE VENTAS =====
function agregarPorCodigoBarras() {
    const codigo = document.getElementById('codigoBarrasInput').value.trim();
    procesarEscaneo(codigo);
}

function actualizarCarrito() {
    const carritoBody = document.getElementById('carritoBody');
    const totalCarritoBs = document.getElementById('totalCarritoBs');
    const totalCarritoDolares = document.getElementById('totalCarritoDolares');

    if (!carritoBody) return;

    carritoBody.innerHTML = '';

    if (carrito.length === 0) {
        carritoBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">El carrito está vacío</td></tr>';
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

        const botonMas = item.unidad === 'gramo'
            ? `<button onclick="ingresarGramos(${index})" class="btn-carrito">+</button>`
            : `<button onclick="actualizarCantidadCarrito(${index}, 1)" class="btn-carrito">+</button>`;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.nombre} (${item.descripcion})</td>
            <td>Bs ${item.precioUnitarioBolivar.toFixed(2)}</td>
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
            <td>Bs ${item.subtotal.toFixed(2)}</td>
            <td>
                <button class="btn-eliminar-carrito" onclick="eliminarDelCarrito(${index})">Eliminar</button>
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

    calcularSubtotalSegonUnidad(item);

    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
}

// ===== FUNCIÓN: ingresarGramos =====
function ingresarGramos(index) {
    const item = carrito[index];
    if (!item) return;

    const producto = productos[item.indexProducto];
    if (!producto) {
        showToast("Producto no encontrado en inventario", 'error');
        return;
    }

    const gramosInput = prompt("Ingrese la cantidad en gramos (ej: 350):", item.cantidad || '');
    if (gramosInput === null) return;

    const gramos = parseFloat(gramosInput);
    if (isNaN(gramos) || gramos <= 0) {
        showToast("Ingrese una cantidad válida en gramos", 'error');
        return;
    }

    const disponibleGramos = (producto.unidadesExistentes || 0) * 1000;

    let enCarritoMismoProducto = 0;
    carrito.forEach((it, i) => {
        if (i !== index && it.indexProducto === item.indexProducto) {
            if (it.unidad === 'gramo') enCarritoMismoProducto += (parseFloat(it.cantidad) || 0);
            else {
                const factor = producto.unidadesPorCaja || 1;
                enCarritoMismoProducto += (parseFloat(it.cantidad) || 0) * factor * 1000;
            }
        }
    });

    if ((gramos + enCarritoMismoProducto) > disponibleGramos) {
        showToast("No hay suficiente stock (gramos) para esa cantidad", 'error');
        return;
    }

    item.cantidad = gramos;
    item.unidad = 'gramo';
    calcularSubtotalSegonUnidad(item);

    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
}

// ===== FUNCIÓN CALCULAR SUBTOTAL SEGÚN UNIDAD =====
function calcularSubtotalSegonUnidad(item) {
    const producto = productos[item.indexProducto];
    if (!producto) return;

    if (item.unidad === 'gramo') {
        item.subtotal = redondear2Decimales(item.cantidad * item.precioUnitarioBolivar * 0.001);
        item.subtotalDolar = redondear2Decimales(item.cantidad * item.precioUnitarioDolar * 0.001);
    } else {
        item.subtotal = redondear2Decimales(item.cantidad * item.precioUnitarioBolivar);
        item.subtotalDolar = redondear2Decimales(item.cantidad * item.precioUnitarioDolar);
    }
}

function cambiarUnidadCarrito(index, nuevaUnidad) {
    carrito[index].unidad = nuevaUnidad;
    calcularSubtotalSegonUnidad(carrito[index]);
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
}

// ===== LISTA DE PRODUCTOS =====
function actualizarLista() {
    const tbody = document.querySelector('#listaProductos tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    productosFiltrados = [];

    productos.forEach((producto, index) => {
        const inventarioBajo = producto.unidadesExistentes <= 5;
        const filas = document.createElement('tr');
        filas.innerHTML = `
            <td>${producto.nombre}</td>
            <td>${producto.descripcion}</td>
            <td>${producto.codigoBarras || 'N/A'}</td>
            <td class="${inventarioBajo ? 'inventario-bajo' : ''}">${producto.unidadesExistentes}</td>
            <td>
                <div class="ajuste-inventario">
                    <button onclick="ajustarInventario(${index}, 'sumar')" class="btn-inventario">+</button>
                    <button onclick="ajustarInventario(${index}, 'restar')" class="btn-inventario">-</button>
                </div>
            </td>
            <td>$${producto.precioUnitarioDolar.toFixed(2)}</td>
            <td>Bs${producto.precioUnitarioBolivar.toFixed(2)}</td>
            <td>${(producto.ganancia * 100).toFixed(0)}%</td>
            <td>
                <button class="editar" onclick="editarProducto(${index})">Editar</button>
                <button class="eliminar" onclick="eliminarProducto(${index})">Eliminar</button>
            </td>
        `;
        tbody.appendChild(filas);
    });
}

// ===== BUSCADOR MEJORADO PARA MÓVILES =====
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
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (productosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No se encontraron productos</td></tr>';
        return;
    }

    productosFiltrados.forEach((producto, index) => {
        const inventarioBajo = producto.unidadesExistentes <= 5;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${producto.nombre}</td>
            <td>${producto.descripcion}</td>
            <td>${producto.codigoBarras || 'N/A'}</td>
            <td class="${inventarioBajo ? 'inventario-bajo' : ''}">${producto.unidadesExistentes}</td>
            <td>
                <div class="ajuste-inventario">
                    <button onclick="ajustarInventario(${index}, 'sumar')" class="btn-inventario">+</button>
                    <button onclick="ajustarInventario(${index}, 'restar')" class="btn-inventario">-</button>
                </div>
            </td>
            <td>$${producto.precioUnitarioDolar.toFixed(2)}</td>
            <td>Bs${producto.precioUnitarioBolivar.toFixed(2)}</td>
            <td>${(producto.ganancia * 100).toFixed(0)}%</td>
            <td>
                <button class="editar" onclick="editarProducto(${index})">Editar</button>
                <button class="eliminar" onclick="eliminarProducto(${index})">Eliminar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function ajustarInventario(index, operacion) {
    let indiceReal = index;
    
    if (productosFiltrados.length > 0) {
        const productoFiltrado = productosFiltrados[index];
        if (!productoFiltrado) return;
        
        indiceReal = productos.findIndex(p => 
            p.nombre === productoFiltrado.nombre && 
            p.descripcion === productoFiltrado.descripcion
        );
        
        if (indiceReal === -1) {
            showToast("Error: Producto no encontrado en la lista principal", 'error');
            return;
        }
    }
    
    const producto = productos[indiceReal];
    const cantidad = parseInt(prompt(`Ingrese la cantidad a ${operacion === 'sumar' ? 'sumar' : 'restar'}:`, "1")) || 0;

    if (cantidad <= 0) { showToast("Ingrese una cantidad válida", 'error'); return; }
    if (operacion === 'restar' && producto.unidadesExistentes < cantidad) { showToast("No hay suficientes unidades en inventario", 'error'); return; }

    producto.unidadesExistentes = operacion === 'sumar' ? producto.unidadesExistentes + cantidad : producto.unidadesExistentes - cantidad;

    localStorage.setItem('productos', JSON.stringify(productos));
    actualizarLista();
    showToast(`Inventario de ${producto.nombre} actualizado: ${producto.unidadesExistentes} unidades`, 'success');
}

function eliminarProducto(index) {
    let indiceReal = index;
    
    if (productosFiltrados.length > 0) {
        const productoFiltrado = productosFiltrados[index];
        if (!productoFiltrado) return;
        
        indiceReal = productos.findIndex(p => 
            p.nombre === productoFiltrado.nombre && 
            p.descripcion === productoFiltrado.descripcion
        );
        
        if (indiceReal === -1) {
            showToast("Error: Producto no encontrado en la lista principal", 'error');
            return;
        }
    }
    
    const producto = productos[indiceReal];
    if (confirm(`¿Estás seguro de eliminar "${producto.nombre}"?`)) {
        productos.splice(indiceReal, 1);
        localStorage.setItem('productos', JSON.stringify(productos));
        actualizarLista();
        showToast(`Producto eliminado: ${producto.nombre}`, 'success');
    }
}

// ===== MÉTODOS DE PAGO Y VENTAS =====
function finalizarVenta() {
    if (carrito.length === 0) { showToast("El carrito está vacío", 'warning'); return; }

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

function seleccionarMetodoPago(metodo) {
    metodoPagoSeleccionado = metodo;
    const detallesDiv = document.getElementById('camposPago');
    const totalBs = carrito.reduce((sum, i) => sum + i.subtotal, 0);
    detallesDiv.innerHTML = '';

    detallesPago = { metodo, totalBs };

    if (metodo === 'efectivo_bs' || metodo === 'efectivo_dolares') {
        detallesDiv.innerHTML = `
            <div class="campo-pago">
                <label>Monto recibido (${metodo === 'efectivo_bs' ? 'Bs' : '$'}):</label>
                <input type="number" id="montoRecibido" placeholder="Ingrese monto recibido" class="input-movil" />
            </div>
            <div class="campo-pago">
                <label>Cambio:</label>
                <input type="text" id="cambioCalculado" readonly placeholder="0.00" class="input-movil" />
            </div>
        `;
        setTimeout(() => {
            const input = document.getElementById('montoRecibido');
            if (!input) return;
            input.addEventListener('input', () => {
                const recib = parseFloat(input.value) || 0;
                let cambio = 0;
                if (metodo === 'efectivo_bs') cambio = redondear2Decimales(recib - totalBs);
                else {
                    const totalEnDolares = tasaBCVGuardada ? redondear2Decimales(totalBs / tasaBCVGuardada) : 0;
                    cambio = redondear2Decimales(recid - totalEnDolares);
                }
                document.getElementById('cambioCalculado').value = cambio >= 0 ? cambio.toFixed(2) : `Faltan ${Math.abs(cambio).toFixed(2)}`;
            });
        }, 100);
    } else if (metodo === 'punto' || metodo === 'biopago') {
        detallesDiv.innerHTML = `
            <div class="campo-pago">
                <label>Monto a pagar:</label>
                <input type="number" id="montoPago" placeholder="Ingrese monto" class="input-movil" />
            </div>
        `;
    } else if (metodo === 'pago_movil') {
        detallesDiv.innerHTML = `
            <div class="campo-pago">
                <label>Monto a pagar:</label>
                <input type="number" id="montoPagoMovil" placeholder="Ingrese monto" class="input-movil" />
            </div>
            <div class="campo-pago">
                <label>Referencia / Número:</label>
                <input type="text" id="refPagoMovil" placeholder="Referencia bancaria" class="input-movil" />
            </div>
            <div class="campo-pago">
                <label>Banco:</label>
                <input type="text" id="bancoPagoMovil" placeholder="Nombre del banco" class="input-movil" />
            </div>
        `;
    }

    document.getElementById('detallesPago').style.display = 'block';
}

function confirmarMetodoPago() {
    if (!metodoPagoSeleccionado) { 
        showToast("Seleccione un método de pago", 'error'); 
        return; 
    }

    const totalBs = carrito.reduce((sum, item) => sum + item.subtotal, 0);

    if (metodoPagoSeleccionado === 'efectivo_bs') {
        const recib = parseFloat(document.getElementById('montoRecibido').value) || 0;
        if (recib < totalBs) { 
            showToast("Monto recibido menor al total", 'error'); 
            return; 
        }
        detallesPago.cambio = redondear2Decimales(recib - totalBs);
        detallesPago.montoRecibido = recib;
    } else if (metodoPagoSeleccionado === 'efectivo_dolares') {
        const recib = parseFloat(document.getElementById('montoRecibido').value) || 0;
        const totalEnDolares = tasaBCVGuardada ? redondear2Decimales(totalBs / tasaBCVGuardada) : 0;
        if (recib < totalEnDolares) { 
            showToast("Monto recibido menor al total", 'error'); 
            return; 
        }
        detallesPago.cambio = redondear2Decimales(recib - totalEnDolares);
        detallesPago.montoRecibido = recib;
    } else if (metodoPagoSeleccionado === 'punto' || metodoPagoSeleccionado === 'biopago') {
        const monto = parseFloat(document.getElementById('montoPago') ? document.getElementById('montoPago').value : 0) || 0;
        if (monto <= 0) { 
            showToast("Ingrese el monto para Punto/Biopago", 'error'); 
            return; 
        }
        detallesPago.monto = monto;
    } else if (metodoPagoSeleccionado === 'pago_movil') {
        const monto = parseFloat(document.getElementById('montoPagoMovil').value) || 0;
        const ref = document.getElementById('refPagoMovil').value.trim();
        const banco = document.getElementById('bancoPagoMovil').value.trim();
        if (!monto || !ref || !banco) { 
            showToast("Complete todos los datos de Pago Móvil", 'error'); 
            return; 
        }
        detallesPago = {...detallesPago, monto, ref, banco };
    }

    carrito.forEach(item => {
        const producto = productos[item.indexProducto];
        if (producto) {
            if (item.unidad === 'gramo') {
                producto.unidadesExistentes = redondear2Decimales(producto.unidadesExistentes - (item.cantidad / 1000));
            } else {
                producto.unidadesExistentes = redondear2Decimales(producto.unidadesExistentes - item.cantidad);
            }

            if (producto.unidadesExistentes < 0) {
                producto.unidadesExistentes = 0;
            }

            ventasDiarias.push({
                fecha: new Date().toLocaleDateString(),
                hora: new Date().toLocaleTimeString(),
                producto: producto.nombre,
                cantidad: item.cantidad,
                unidad: item.unidad,
                totalBolivar: item.subtotal,
                metodoPago: metodoPagoSeleccionado,
                indexProducto: item.indexProducto
            });
        }
    });

    localStorage.setItem('productos', JSON.stringify(productos));
    localStorage.setItem('ventasDiarias', JSON.stringify(ventasDiarias));

    showToast(`Venta completada por Bs ${redondear2Decimales(totalBs).toFixed(2)}`, 'success');

    detallesPago.totalBs = redondear2Decimales(totalBs);
    detallesPago.items = JSON.parse(JSON.stringify(carrito));
    detallesPago.fecha = new Date().toLocaleString();

    carrito = [];
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
    actualizarLista();
    
    cerrarModalPago();

    imprimirTicketTermico(detallesPago);
}

function cancelarPago() {
    document.getElementById('detallesPago').style.display = 'none';
    metodoPagoSeleccionado = null;
    detallesPago = {};
}

// ===== NOMBRE ESTABLECIMIENTO Y TASA BCV =====
function guardarNombreEstablecimiento() {
    nombreEstablecimiento = document.getElementById('nombreEstablecimiento').value.trim();
    if (!nombreEstablecimiento) { showToast("Ingrese un nombre válido", 'error'); return; }
    localStorage.setItem('nombreEstablecimiento', nombreEstablecimiento);
    showToast(`Nombre guardado: "${nombreEstablecimiento}"`, 'success');
}

function actualizarTasaBCV() {
    const nuevaTasa = parseFloat(document.getElementById('tasaBCV').value);

    if (!nuevaTasa || nuevaTasa <= 0) { showToast("Ingrese una tasa BCV válida", 'error'); return; }

    tasaBCVGuardada = nuevaTasa;
    localStorage.setItem('tasaBCV', tasaBCVGuardada);

    productos.forEach(producto => {
        producto.precioUnitarioBolivar = producto.precioUnitarioDolar * nuevaTasa;
        producto.precioMayorBolivar = producto.precioMayorDolar * nuevaTasa;
    });

    localStorage.setItem('productos', JSON.stringify(productos));
    actualizarLista();

    showToast(`Tasa BCV actualizada a: ${nuevaTasa}`, 'success');
}

function toggleCopyrightNotice() {
    const notice = document.getElementById('copyrightNotice');
    if (!notice) return;
    notice.style.display = notice.style.display === 'block' ? 'none' : 'block';
}

/* ===== LISTA DE COSTOS ===== */
function mostrarListaCostos() {
    const container = document.getElementById('listaCostosContainer');
    const buscarCostosInput = document.getElementById('buscarCostos');
    if (!container) return;
    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';
        if (buscarCostosInput) buscarCostosInput.style.display = 'inline-block';
        llenarListaCostos();
    } else {
        container.style.display = 'none';
        if (buscarCostosInput) buscarCostosInput.style.display = 'none';
    }
}

function llenarListaCostos() {
    const lista = document.getElementById('listaCostos');
    if (!lista) return;
    lista.innerHTML = '';
    const copia = [...productos].sort((a, b) => (a.nombre || '').localeCompare((b.nombre || ''), 'es', { sensitivity: 'base' }));
    copia.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${p.nombre} (${p.descripcion})</span><span>$${(p.costo / (p.unidadesPorCaja || 1)).toFixed(2)} / Bs${( (p.costo / (p.unidadesPorCaja || 1)) * (tasaBCVGuardada || p.precioUnitarioBolivar) ).toFixed(2)}</span>`;
        lista.appendChild(li);
    });
}

function filtrarListaCostos() {
    const termino = document.getElementById('buscarCostos').value.trim().toLowerCase();
    const lista = document.getElementById('listaCostos');
    if (!lista) return;
    lista.innerHTML = '';
    const copia = [...productos].sort((a, b) => (a.nombre || '').localeCompare((b.nombre || ''), 'es', { sensitivity: 'base' }));
    const filtrados = termino ? copia.filter(p => (p.nombre || '').toLowerCase().includes(termino) || (p.descripcion || '').toLowerCase().includes(termino)) : copia;
    filtrados.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${p.nombre} (${p.descripcion})</span><span>$${(p.costo / (p.unidadesPorCaja || 1)).toFixed(2)} / Bs${( (p.precioUnitarioBolivar).toFixed(2) )}</span>`;
        lista.appendChild(li);
    });
}

// ===== GENERAR PDF COSTOS =====
function generarPDFCostos() {
    if (!productos.length) { showToast("No hay productos para generar PDF de costos", 'warning'); return; }

    const copia = [...productos].sort((a, b) => (a.nombre || '').localeCompare((b.nombre || ''), 'es', { sensitivity: 'base' }));
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text(nombreEstablecimiento || 'Lista de Costos', 14, 18);
    doc.setFontSize(10);
    const rows = copia.map(p => [
        p.nombre,
        p.descripcion,
        `$${(p.costo / (p.unidadesPorCaja || 1)).toFixed(2)}`,
        `Bs ${p.precioUnitarioBolivar.toFixed(2)}`
    ]);

    doc.autoTable({
        head: [['Producto', 'Descripción', 'Costo (u)', 'Precio Unit. (Bs)']],
        body: rows,
        startY: 28,
        styles: { fontSize: 9 }
    });

    doc.save(`lista_costos_${(new Date()).toISOString().slice(0,10)}.pdf`);
}

// ===== GENERAR REPORTE DIARIO (PDF) MEJORADO =====
function generarReporteDiario() {
    if (!ventasDiarias.length) { showToast("No hay ventas registradas", 'warning'); return; }

    const hoy = new Date().toLocaleDateString();
    const ventasHoy = ventasDiarias.filter(v => v.fecha === hoy);
    const ventasAUsar = ventasHoy.length ? ventasHoy : ventasDiarias;

    let totalVentasBs = 0;
    let totalVentasDolares = 0;
    const filas = ventasAUsar.map(v => {
        totalVentasBs += v.totalBolivar || 0;
        
        // Calcular total en dólares usando la tasa BCV guardada
        const totalDolar = tasaBCVGuardada > 0 ? (v.totalBolivar || 0) / tasaBCVGuardada : 0;
        totalVentasDolares += totalDolar;

        return [
            v.fecha,
            v.hora,
            v.producto,
            `${v.cantidad} ${v.unidad}`,
            `Bs ${ (v.totalBolivar || 0).toFixed(2) }`,
            `$ ${ totalDolar.toFixed(2) }`,
            v.metodoPago
        ];
    });

    // ===== FÓRMULA SIMPLIFICADA 50-30-20 SOBRE INGRESOS EN DÓLARES =====
    const llaveMaestra = redondear2Decimales(totalVentasDolares / 100);
    const reinvertir = redondear2Decimales(llaveMaestra * 50);
    const gastosFijos = redondear2Decimales(llaveMaestra * 30);
    const sueldo = redondear2Decimales(llaveMaestra * 20);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt' });

    doc.setFontSize(14);
    doc.text(nombreEstablecimiento || 'Reporte Diario', 40, 40);
    doc.setFontSize(10);
    doc.text(`Fecha: ${ (new Date()).toLocaleDateString() }`, 40, 60);
    doc.text(`Tasa BCV: ${tasaBCVGuardada}`, 40, 75);

    doc.autoTable({
        startY: 90,
        head: [['Fecha','Hora','Producto','Cant.','Total (Bs)','Total ($)','Pago']],
        body: filas,
        styles: { fontSize: 9 }
    });

    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 300;
    
    // ===== SECCIÓN MEJORADA: RESUMEN FINANCIERO =====
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMEN FINANCIERO', 40, finalY + 20);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Total ingresos en Bolívares: Bs ${totalVentasBs.toFixed(2)}`, 40, finalY + 40);
    doc.text(`Total ingresos en Dólares: $ ${totalVentasDolares.toFixed(2)}`, 40, finalY + 58);
    
    // ===== NUEVA SECCIÓN: DISTRIBUCIÓN 50-30-20 EN DÓLARES =====
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('DISTRIBUCIÓN RECOMENDADA (50-30-20) EN DÓLARES', 40, finalY + 85);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`50% Para reinvertir: $ ${reinvertir.toFixed(2)}`, 40, finalY + 105);
    doc.text(`30% Para gastos fijos: $ ${gastosFijos.toFixed(2)}`, 40, finalY + 123);
    doc.text(`20% Para sueldo: $ ${sueldo.toFixed(2)}`, 40, finalY + 141);
    
    // ===== VERIFICACIÓN DE CÁLCULO =====
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Verificación: ${reinvertir.toFixed(2)} + ${gastosFijos.toFixed(2)} + ${sueldo.toFixed(2)} = ${(reinvertir + gastosFijos + sueldo).toFixed(2)}`, 40, finalY + 165);
    
    // ===== NOTA EXPLICATIVA =====
    doc.setFontSize(9);
    doc.text('Nota: Esta distribución ayuda a mantener un negocio saludable, reinvirtiendo en inventario,', 40, finalY + 185);
    doc.text('cubriendo gastos operativos y asegurando un ingreso personal sostenible.', 40, finalY + 198);

    doc.save(`reporte_diario_${(new Date()).toISOString().slice(0,10)}.pdf`);
}

// ===== NUEVAS FUNCIONALIDADES INNOVADORAS =====

// ===== PDF POR CATEGORÍA =====
function mostrarOpcionesPDF() {
    document.getElementById('modalCategorias').style.display = 'block';
}

function cerrarModalCategorias() {
    document.getElementById('modalCategorias').style.display = 'none';
}

function generarPDFPorCategoria(categoria) {
    if (!productos.length) { 
        showToast("No hay productos para generar PDF", 'warning'); 
        return; 
    }

    let productosFiltrados = [];
    let tituloCategoria = '';

    if (categoria === 'todos') {
        productosFiltrados = [...productos];
        tituloCategoria = 'TODOS LOS PRODUCTOS';
    } else {
        productosFiltrados = productos.filter(p => p.descripcion === categoria);
        
        const nombresCategorias = {
            'viveres': 'VÍVERES',
            'bebidas': 'BEBIDAS',
            'licores': 'LICORES',
            'enlatados': 'ENLATADOS',
            'plasticos': 'PLÁSTICOS',
            'papeleria': 'PAPELERÍA',
            'lacteos': 'LÁCTEOS',
            'ferreteria': 'FERRETERÍA',
            'agropecuaria': 'AGROPECUARIA',
            'frigorifico': 'FRIGORÍFICO',
            'pescaderia': 'PESCADERÍA',
            'repuesto': 'REPUESTO',
            'confiteria': 'CONFITERÍA',
            'ropa': 'ROPA',
            'calzados': 'CALZADOS',
            'charcuteria': 'CHARCUTERÍA',
            'carnes': 'CARNES',
            'aseo_personal': 'ASEO PERSONAL',
            'limpieza': 'PRODUCTOS DE LIMPIEZA',
            'verduras': 'VERDURAS',
            'frutas': 'FRUTAS',
            'hortalizas': 'HORTALIZAS',
            'aliños': 'ALIÑOS',
            'otros': 'OTROS'
        };
        
        tituloCategoria = nombresCategorias[categoria] || categoria.toUpperCase();
    }

    if (productosFiltrados.length === 0) {
        showToast(`No hay productos en la categoría: ${tituloCategoria}`, 'warning');
        cerrarModalCategorias();
        return;
    }

    productosFiltrados.sort((a, b) => (a.nombre || '').localeCompare((b.nombre || ''), 'es', { sensitivity: 'base' }));

    const rows = productosFiltrados.map(p => [
        p.nombre,
        `$${p.precioUnitarioDolar.toFixed(2)}`,
        `Bs ${p.precioUnitarioBolivar.toFixed(2)}`
    ]);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(nombreEstablecimiento || 'Lista de Productos', 14, 18);
    doc.setFontSize(12);
    doc.text(`Categoría: ${tituloCategoria}`, 14, 26);
    doc.setFontSize(10);
    doc.text(`Fecha: ${(new Date()).toLocaleDateString()}`, 14, 34);

    doc.autoTable({
        head: [['Producto', 'Precio ($)', 'Precio (Bs)']],
        body: rows,
        startY: 42,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [38, 198, 218] }
    });

    doc.save(`lista_${categoria}_${(new Date()).toISOString().slice(0,10)}.pdf`);
    cerrarModalCategorias();
    showToast(`PDF generado para: ${tituloCategoria}`, 'success');
}

// ===== ETIQUETAS PARA ANAQUELES =====
function generarEtiquetasAnaqueles() {
    document.getElementById('modalEtiquetas').style.display = 'block';
}

function cerrarModalEtiquetas() {
    document.getElementById('modalEtiquetas').style.display = 'none';
}

function generarEtiquetasPorCategoria(categoria) {
    if (!productos.length) { 
        showToast("No hay productos para generar etiquetas", 'warning'); 
        return; 
    }

    let productosFiltrados = [];
    let tituloCategoria = '';

    if (categoria === 'todos') {
        productosFiltrados = [...productos];
        tituloCategoria = 'TODOS LOS PRODUCTOS';
    } else {
        productosFiltrados = productos.filter(p => p.descripcion === categoria);
        
        const nombresCategorias = {
            'viveres': 'VÍVERES',
            'bebidas': 'BEBIDAS',
            'licores': 'LICORES',
            'enlatados': 'ENLATADOS',
            'plasticos': 'PLÁSTICOS',
            'papeleria': 'PAPELERÍA',
            'lacteos': 'LÁCTEOS',
            'ferreteria': 'FERRETERÍA',
            'agropecuaria': 'AGROPECUARIA',
            'frigorifico': 'FRIGORÍFICO',
            'pescaderia': 'PESCADERÍA',
            'repuesto': 'REPUESTO',
            'confiteria': 'CONFITERÍA',
            'ropa': 'ROPA',
            'calzados': 'CALZADOS',
            'charcuteria': 'CHARCUTERÍA',
            'carnes': 'CARNES',
            'aseo_personal': 'ASEO PERSONAL',
            'limpieza': 'PRODUCTOS DE LIMPIEZA',
            'verduras': 'VERDURAS',
            'frutas': 'FRUTAS',
            'hortalizas': 'HORTALIZAS',
            'aliños': 'ALIÑOS',
            'otros': 'OTROS'
        };
        
        tituloCategoria = nombresCategorias[categoria] || categoria.toUpperCase();
    }

    if (productosFiltrados.length === 0) {
        showToast(`No hay productos en la categoría: ${tituloCategoria}`, 'warning');
        cerrarModalEtiquetas();
        return;
    }

    productosFiltrados.sort((a, b) => (a.nombre || '').localeCompare((b.nombre || ''), 'es', { sensitivity: 'base' }));

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const labelWidth = 63;
    const labelHeight = 35;
    const labelsPerPage = 21;

    let currentPage = 0;
    let labelIndex = 0;

    productosFiltrados.forEach((producto, index) => {
        if (labelIndex >= labelsPerPage) {
            doc.addPage();
            currentPage++;
            labelIndex = 0;
        }

        const row = Math.floor(labelIndex / 3);
        const col = labelIndex % 3;
        
        const x = margin + (col * labelWidth);
        const y = margin + (row * labelHeight);

        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(255, 255, 255);
        doc.rect(x, y, labelWidth - 2, labelHeight - 2, 'FD');

        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(nombreEstablecimiento || 'TIENDA', x + 2, y + 5);

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const nombreProducto = producto.nombre.length > 25 ? 
            producto.nombre.substring(0, 25) + '...' : producto.nombre;
        doc.text(nombreProducto, x + 2, y + 10);

        doc.setFontSize(14);
        doc.setTextColor(220, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text(`Bs ${producto.precioUnitarioBolivar.toFixed(2)}`, x + 2, y + 20);

        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.setFont(undefined, 'normal');
        doc.text(`Categoría: ${tituloCategoria}`, x + 2, y + 25);

        if (producto.codigoBarras) {
            doc.setFontSize(6);
            doc.text(`Cód: ${producto.codigoBarras}`, x + 2, y + 30);
        }

        labelIndex++;
    });

    doc.save(`etiquetas_${categoria}_${(new Date()).toISOString().slice(0,10)}.pdf`);
    cerrarModalEtiquetas();
    showToast(`Etiquetas generadas para: ${tituloCategoria}`, 'success');
}

// ===== Imprimir ticket térmico =====
function imprimirTicketTermico(detalles) {
    try {
        const printWindow = window.open('', '_blank', 'toolbar=0,location=0,menubar=0');
        if (!printWindow) {
            showToast('No se pudo abrir la ventana de impresión. Verifica bloqueadores de popups.', 'error');
            return;
        }

        let itemsHtml = '';
        (detalles.items || []).forEach(it => {
            const nombre = it.nombre.length > 20 ? it.nombre.slice(0, 20) + '...' : it.nombre;
            const cantidad = it.unidad === 'gramo' ? `${it.cantidad} g` : `${it.cantidad}`;
            const subtotal = (it.subtotal || 0).toFixed(2);
            itemsHtml += `<div><span style="float:left">${nombre} x${cantidad}</span><span style="float:right">Bs ${subtotal}</span><div style="clear:both"></div></div>`;
        });

        const cambioTexto = detalles.cambio !== undefined ? `<div>Cambio: Bs ${detalles.cambio.toFixed(2)}</div>` : '';
        const montoRecibidoTexto = detalles.montoRecibido !== undefined ? `<div>Recibido: ${detalles.montoRecibido}</div>` : '';

        const content = `
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8"/>
            <title>Ticket</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: monospace; padding: 6px; margin: 0; }
                .ticket { width: 280px; max-width: 100%; }
                .ticket h2 { text-align:center; font-size: 16px; margin:6px 0; }
                .line { border-top: 1px dashed #000; margin:6px 0; }
                .items div { margin-bottom:6px; font-size:12px; }
                .totals { margin-top:8px; font-weight:bold; font-size:13px; }
                .small { font-size:11px; color:#333; }
                @media print {
                    body { padding: 0; }
                    .ticket { width: 58mm; }
                }
            </style>
        </head>
        <body>
            <div class="ticket">
                <h2>${nombreEstablecimiento || 'Calculadora Mágica'}</h2>
                <div class="small">Fecha: ${detalles.fecha}</div>
                <div class="line"></div>
                <div class="items">
                    ${itemsHtml}
                </div>
                <div class="line"></div>
                <div class="totals">TOTAL: Bs ${detalles.totalBs.toFixed(2)}</div>
                ${montoRecibidoTexto}
                ${cambioTexto}
                <div class="line"></div>
                <div class="small">Método: ${detalles.metodo}</div>
                <div class="small">Gracias por su compra</div>
            </div>
            <script>
                setTimeout(function(){ window.print(); setTimeout(()=>window.close(), 300); }, 300);
            </script>
        </body>
        </html>`;

        printWindow.document.open();
        printWindow.document.write(content);
        printWindow.document.close();
    } catch (err) {
        console.error(err);
        showToast('Error al preparar impresión del ticket', 'error');
    }
}

// ===== Cerrar modal si se hace clic fuera =====
window.onclick = function(event) {
    const modal = document.getElementById('modalPago');
    if (event.target == modal) cerrarModalPago();
    
    const modalCategorias = document.getElementById('modalCategorias');
    if (event.target == modalCategorias) cerrarModalCategorias();
    
    const modalEtiquetas = document.getElementById('modalEtiquetas');
    if (event.target == modalEtiquetas) cerrarModalEtiquetas();
};

// ===== FUNCIONES DE RESPALDO Y RESTAURACIÓN =====
function descargarBackup() {
    try {
        const backupData = {
            productos: JSON.parse(localStorage.getItem('productos')) || [],
            nombreEstablecimiento: localStorage.getItem('nombreEstablecimiento') || '',
            tasaBCV: localStorage.getItem('tasaBCV') || 0,
            ventasDiarias: JSON.parse(localStorage.getItem('ventasDiarias')) || [],
            carrito: JSON.parse(localStorage.getItem('carrito')) || [],
            fechaBackup: new Date().toISOString(),
            version: '1.0'
        };

        const dataStr = JSON.stringify(backupData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(dataBlob);
        downloadLink.download = `respaldo_calculadora_${new Date().toISOString().slice(0, 10)}.json`;
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        showToast('Respaldo descargado exitosamente', 'success');
    } catch (error) {
        console.error('Error al descargar respaldo:', error);
        showToast('Error al descargar el respaldo', 'error');
    }
}

function cargarBackup(files) {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.name.endsWith('.json')) {
        showToast('Por favor selecciona un archivo JSON válido', 'error');
        return;
    }

    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const backupData = JSON.parse(e.target.result);
            
            if (!backupData.productos || !Array.isArray(backupData.productos)) {
                throw new Error('Formato de archivo inválido');
            }
            
            if (confirm('¿Estás seguro de que deseas cargar este respaldo? Se sobrescribirán todos los datos actuales.')) {
                localStorage.setItem('productos', JSON.stringify(backupData.productos));
                localStorage.setItem('nombreEstablecimiento', backupData.nombreEstablecimiento || '');
                localStorage.setItem('tasaBCV', backupData.tasaBCV || 0);
                localStorage.setItem('ventasDiarias', JSON.stringify(backupData.ventasDiarias || []));
                localStorage.setItem('carrito', JSON.stringify(backupData.carrito || []));
                
                productos = JSON.parse(localStorage.getItem('productos')) || [];
                nombreEstablecimiento = localStorage.getItem('nombreEstablecimiento') || '';
                tasaBCVGuardada = parseFloat(localStorage.getItem('tasaBCV')) || 0;
                ventasDiarias = JSON.parse(localStorage.getItem('ventasDiarias')) || [];
                carrito = JSON.parse(localStorage.getItem('carrito')) || [];
                
                cargarDatosIniciales();
                actualizarLista();
                actualizarCarrito();
                
                showToast('Respaldo cargado exitosamente', 'success');
            }
        } catch (error) {
            console.error('Error al cargar respaldo:', error);
            showToast('Error al cargar el respaldo: archivo inválido', 'error');
        }
    };
    
    reader.onerror = function() {
        showToast('Error al leer el archivo', 'error');
    };
    
    reader.readAsText(file);
    
    document.getElementById('fileInput').value = '';
}

// ===== NUEVAS FUNCIONES PARA ESCÁNER MEJORADO =====
function procesarEscaneo(codigo) {
    if (!codigo) {
        showToast("Código de barras vacío", 'warning');
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
        showToast("Producto no encontrado: " + codigo, 'error');
        mostrarSugerenciasEspecificas(codigo);
        return;
    }

    agregarProductoAlCarrito(productoEncontrado);
    darFeedbackEscaneoExitoso();
}

function agregarProductoAlCarrito(productoEncontrado) {
    const enCarrito = carrito.findIndex(item => item.nombre === productoEncontrado.nombre && item.unidad === 'unidad');

    if (enCarrito !== -1) {
        carrito[enCarrito].cantidad += 1;
        carrito[enCarrito].subtotal = redondear2Decimales(carrito[enCarrito].cantidad * carrito[enCarrito].precioUnitarioBolivar);
        carrito[enCarrito].subtotalDolar = redondear2Decimales(carrito[enCarrito].cantidad * carrito[enCarrito].precioUnitarioDolar);
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
            indexProducto: productos.findIndex(p => p.nombre === productoEncontrado.nombre)
        });
    }

    const codigoInput = document.getElementById('codigoBarrasInput');
    if (codigoInput) {
        codigoInput.value = '';
        codigoInput.focus();
    }

    const scannerStatus = document.getElementById('scannerStatus');
    if (scannerStatus) scannerStatus.textContent = '✓ Producto agregado. Escanee siguiente...';

    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
}

function mostrarSugerenciasEspecificas(codigo) {
    const sugerenciasDiv = document.getElementById('sugerencias');
    if (!sugerenciasDiv) return;

    sugerenciasDiv.innerHTML = '<div style="color: #ff6b6b; padding: 5px;">Producto no encontrado. Sugerencias:</div>';

    const similares = productos.filter(p =>
        (p.nombre || '').toLowerCase().includes(codigo.toLowerCase().substring(0, 3)) ||
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(codigo.toLowerCase().substring(0, 3)))
    ).slice(0, 5);

    similares.forEach(prod => {
        const opcion = document.createElement('div');
        opcion.style.cursor = 'pointer';
        opcion.style.padding = '5px';
        opcion.style.borderBottom = '1px solid #eee';
        opcion.innerHTML = `<strong>${prod.nombre}</strong> - ${prod.descripcion}`;
        opcion.onclick = function() {
            agregarProductoAlCarrito(prod);
            sugerenciasDiv.innerHTML = '';
        };
        sugerenciasDiv.appendChild(opcion);
    });

    if (similares.length === 0) {
        sugerenciasDiv.innerHTML += '<div style="padding: 5px;">No se encontraron productos similares</div>';
    }
}

function darFeedbackEscaneoExitoso() {
    const codigoInput = document.getElementById('codigoBarrasInput');
    if (codigoInput) {
        codigoInput.style.backgroundColor = '#d4edda';
        setTimeout(() => {
            codigoInput.style.backgroundColor = '';
        }, 300);
    }
}

// ===== SISTEMA DE SINCRONIZACIÓN OFFLINE =====
function verificarConexion() {
    return navigator.onLine;
}

function guardarDatosOffline() {
    const datos = {
        productos: productos,
        nombreEstablecimiento: nombreEstablecimiento,
        tasaBCV: tasaBCVGuardada,
        ventasDiarias: ventasDiarias,
        carrito: carrito,
        timestamp: new Date().getTime()
    };
    
    localStorage.setItem('datosOffline', JSON.stringify(datos));
}

function cargarDatosOffline() {
    const datosGuardados = localStorage.getItem('datosOffline');
    if (datosGuardados) {
        const datos = JSON.parse(datosGuardados);
        
        // Solo cargar si los datos offline son más recientes
        const timestampOffline = datos.timestamp || 0;
        const timestampActual = localStorage.getItem('ultimaSincronizacion') || 0;
        
        if (timestampOffline > timestampActual) {
            productos = datos.productos || productos;
            nombreEstablecimiento = datos.nombreEstablecimiento || nombreEstablecimiento;
            tasaBCVGuardada = datos.tasaBCV || tasaBCVGuardada;
            ventasDiarias = datos.ventasDiarias || ventasDiarias;
            carrito = datos.carrito || carrito;
            
            // Actualizar localStorage
            localStorage.setItem('productos', JSON.stringify(productos));
            localStorage.setItem('nombreEstablecimiento', nombreEstablecimiento);
            localStorage.setItem('tasaBCV', tasaBCVGuardada.toString());
            localStorage.setItem('ventasDiarias', JSON.stringify(ventasDiarias));
            localStorage.setItem('carrito', JSON.stringify(carrito));
            
            showToast('Datos recuperados correctamente', 'success');
        }
    }
}

// Guardar datos automáticamente cada 30 segundos
setInterval(guardarDatosOffline, 30000);

// Cargar datos offline al iniciar
window.addEventListener('load', function() {
    if (!verificarConexion()) {
        cargarDatosOffline();
    }
});

// Sincronizar cuando se recupera la conexión
window.addEventListener('online', function() {
    showToast('Conexión restaurada - Sincronizando datos', 'success');
    localStorage.setItem('ultimaSincronizacion', new Date().getTime().toString());
});

window.addEventListener('offline', function() {
    showToast('Sin conexión - Modo offline activado', 'warning');
    guardarDatosOffline();
});
