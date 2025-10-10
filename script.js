// ===== VARIABLES GLOBALES =====
let productos = JSON.parse(localStorage.getItem('productos')) || [];
let nombreEstablecimiento = localStorage.getItem('nombreEstablecimiento') || '';
let tasaBCVGuardada = parseFloat(localStorage.getItem('tasaBCV')) || 0;
let ventasDiarias = JSON.parse(localStorage.getItem('ventasDiarias')) || [];
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
let métodoPagoSeleccionado = null;
let detallesPago = {}; // guardará información temporal al confirmar el pago
let productoEditando = null;
let productosFiltrados = []; // Array para almacenar resultados de búsqueda

// === NUEVAS VARIABLES PARA ESCÁNER ===
let tiempoUltimaTecla = 0;
let bufferEscaneo = '';

// ===== PROTECCIÓN CONTRA ACCESO DIRECTO (SIMPLIFICADA PARA MÓVIL Y COMPUTADORA) =====
(function() {
    const SESSION_KEY = 'calculadora_magica_session';
    const URL_REDIRECCION_PORTAL = "http://portal.calculadoramagica.lat/";
    
    // Verificar si ya tiene sesión activa
    const sessionValida = sessionStorage.getItem(SESSION_KEY);
    
    // Si no tiene sesión y no viene del portal, redirigir
    if (!sessionValida) {
        const referrer = document.referrer;
        const vieneDePortal = referrer && referrer.includes('portal.calculadoramagica.lat');
        const vieneDeClientes = referrer && referrer.includes('clientes.calculadoramagica.lat');
        
        // Permitir acceso si viene del portal, de clientes, o si no hay referrer (móviles)
        if (!vieneDePortal && !vieneDeClientes && referrer !== '') {
            console.log('Acceso directo detectado, redirigiendo al portal...');
            window.location.href = URL_REDIRECCION_PORTAL;
            return;
        }
        
        // Crear sesión válida
        sessionStorage.setItem(SESSION_KEY, 'activa_' + Date.now());
    }
})();

// ===== SISTEMA DE REDIRECCIÓN POR INACTIVIDAD MEJORADO ===== //
const TIEMPO_INACTIVIDAD = 4 * 60 * 1000; // 4 minutos en milisegundos
const URL_REDIRECCION = "http://portal.calculadoramagica.lat/";

let temporizadorInactividad;
let ultimaActividad = Date.now();

// Función para registrar actividad
function registrarActividad() {
    ultimaActividad = Date.now();
    reiniciarTemporizador();
}

// Función para verificar inactividad periódicamente
function verificarInactividad() {
    const tiempoTranscurrido = Date.now() - ultimaActividad;
    
    if (tiempoTranscurrido >= TIEMPO_INACTIVIDAD) {
        // Redirigir por inactividad
        console.log('Redirigiendo por inactividad después de', Math.round(tiempoTranscurrido / 1000), 'segundos');
        
        // Limpiar sesiones
        sessionStorage.removeItem('calculadora_magica_session');
        localStorage.removeItem('ultimaActividad');
        
        // Redirigir al portal
        window.location.href = URL_REDIRECCION;
        return;
    }
    
    // Programar siguiente verificación
    setTimeout(verificarInactividad, 1000);
}

function reiniciarTemporizador() {
    // Guardar timestamp de última actividad
    localStorage.setItem('ultimaActividad', Date.now().toString());
    
    // Limpiar temporizador existente
    if (temporizadorInactividad) {
        clearTimeout(temporizadorInactividad);
    }
    
    // Iniciar nuevo temporizador
    temporizadorInactividad = setTimeout(() => {
        console.log('Temporizador de inactividad ejecutado');
        
        // Limpiar sesiones
        sessionStorage.removeItem('calculadora_magica_session');
        localStorage.removeItem('ultimaActividad');
        
        // Redirigir después del tiempo de inactividad
        window.location.href = URL_REDIRECCION;
    }, TIEMPO_INACTIVIDAD);
}

// Eventos que indican actividad del usuario
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'input'].forEach(evento => {
    document.addEventListener(evento, registrarActividad, { passive: true });
});

// Inicializar sistema de inactividad
function inicializarSistemaInactividad() {
    // Recuperar última actividad desde localStorage
    const ultimaActividadGuardada = localStorage.getItem('ultimaActividad');
    if (ultimaActividadGuardada) {
        ultimaActividad = parseInt(ultimaActividadGuardada);
        
        // Verificar si ya pasó el tiempo de inactividad
        const tiempoTranscurrido = Date.now() - ultimaActividad;
        if (tiempoTranscurrido >= TIEMPO_INACTIVIDAD) {
            console.log('Sesión expirada al cargar. Redirigiendo...');
            sessionStorage.removeItem('calculadora_magica_session');
            localStorage.removeItem('ultimaActividad');
            window.location.href = URL_REDIRECCION;
            return;
        }
    }
    
    // Iniciar verificaciones
    reiniciarTemporizador();
    verificarInactividad();
}

// ===== PROTECCIÓN CONTRA F12 Y HERRAMIENTAS DE DESARROLLO =====
(function() {
    // Detectar tecla F12 y combinaciones de teclas
    document.addEventListener('keydown', function(e) {
        // Bloquear F12
        if (e.key === 'F12' || e.keyCode === 123) {
            e.preventDefault();
            mostrarAdvertenciaSeguridad();
            return false;
        }
        
        // Bloquear Ctrl+Shift+I (DevTools)
        if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.keyCode === 73)) {
            e.preventDefault();
            mostrarAdvertenciaSeguridad();
            return false;
        }
        
        // Bloquear Ctrl+Shift+J (Console)
        if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.keyCode === 74)) {
            e.preventDefault();
            mostrarAdvertenciaSeguridad();
            return false;
        }
        
        // Bloquear Ctrl+Shift+C (Inspector)
        if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.keyCode === 67)) {
            e.preventDefault();
            mostrarAdvertenciaSeguridad();
            return false;
        }
        
        // Bloquear Ctrl+U (Ver código fuente)
        if (e.ctrlKey && (e.key === 'U' || e.keyCode === 85)) {
            e.preventDefault();
            mostrarAdvertenciaSeguridad();
            return false;
        }
    });
    
    // Bloquear clic derecho (inspeccionar elemento)
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        mostrarAdvertenciaSeguridad();
        return false;
    });
    
    // Detectar si se abren las herramientas de desarrollo
    function detectarDevTools() {
        const umbral = 160;
        const inicio = performance.now();
        debugger;
        const fin = performance.now();
        
        if (fin - inicio > umbral) {
            mostrarAdvertenciaSeguridad();
        }
    }
    
    function mostrarAdvertenciaSeguridad() {
        // Mostrar mensaje en consola si está abierta
        console.log('%c⚠️ ACCESO RESTRINGIDO ⚠️', 'color: red; font-size: 20px; font-weight: bold;');
        console.log('El uso de herramientas de desarrollo está restringido en esta aplicación.');
        
        // Mostrar alerta al usuario
        alert('⚠️ Acceso restringido\nEl uso de F12 y herramientas de desarrollo no está permitido en esta aplicación.');
        
        // Opcional: Puedes redirigir o tomar otras acciones
        // window.location.href = '/acceso-denegado';
    }
    
    // Verificar periódicamente si las herramientas están abiertas
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
    inicializarSistemaInactividad(); // Inicializar sistema de inactividad
    cargarDatosIniciales();
    actualizarLista();
    actualizarCarrito();
    configurarEventos();
});

// ===== UTILIDADES / TOASTS =====
function showToast(message, type = 'success', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return; // por si no existe el contenedor
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
    // Búsqueda enter
    const buscarInput = document.getElementById('buscar');
    if (buscarInput) {
        buscarInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') buscarProducto();
        });
    }

    // ESCÁNER MEJORADO - Compatibilidad universal
    const codigoInput = document.getElementById('codigoBarrasInput');
    if (codigoInput) {
        // Detectar escaneo vs tecleo manual
        codigoInput.addEventListener('keydown', function(e) {
            const tiempoActual = new Date().getTime();
            
            // Si es Enter o Tab (terminadores comunes de escáner)
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                
                // Solo procesar si hay contenido y no es tecleo manual rápido
                if (this.value.trim() && (tiempoActual - tiempoUltimaTecla) < 100) {
                    procesarEscaneo(this.value.trim());
                    this.value = '';
                }
                return;
            }
            
            // Para caracteres normales, actualizar buffer y tiempo
            if (e.key.length === 1) {
                bufferEscaneo += e.key;
                tiempoUltimaTecla = tiempoActual;
                
                // Limpiar buffer después de un tiempo si no hay más teclas
                clearTimeout(window.bufferTimeout);
                window.bufferTimeout = setTimeout(() => {
                    if (bufferEscaneo.length > 0) {
                        bufferEscaneo = '';
                    }
                }, 60);
            }
        });

        // También mantener el evento input para sugerencias
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

        // Focus automático mejorado - EXCLUIR CAMPOS DE CONFIGURACIÓN
        codigoInput.addEventListener('blur', function() {
            // Recuperar focus después de un breve momento, pero solo si no estamos en campos de configuración
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

    // Focus automático al cargar la página
    setTimeout(() => {
        if (codigoInput) {
            codigoInput.focus();
            codigoInput.select();
        }
    }, 500);

    // PREVENIR QUE EL CAMPOS DE CONFIGURACIÓN ACTIVEN EL REDIRECCIONAMIENTO DEL ESCÁNER
    const camposConfiguracion = ['tasaBCV', 'nombreEstablecimiento'];
    camposConfiguracion.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            campo.addEventListener('focus', function() {
                // Desactivar temporalmente el comportamiento del escáner
                this.setAttribute('data-scanning-disabled', 'true');
            });
            campo.addEventListener('blur', function() {
                // Reactivar el comportamiento del escáner
                this.removeAttribute('data-scanning-disabled');
            });
        }
    });
}

// ===== BUSCADOR RÁPIDO (input del carrito con sugerencias) =====
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

    // Validar código de barras único (solo si no estamos editando)
    if (codigoBarras && productoEditando === null) {
        const codigoExistente = productos.findIndex(p => 
            p.codigoBarras && p.codigoBarras.toLowerCase() === codigoBarras.toLowerCase()
        );
        if (codigoExistente !== -1) {
            showToast("El código de barras ya existe para otro producto", 'error');
            return;
        }
    }

    // Si estamos editando un producto, mantener su índice original
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
        // Actualizar producto existente
        productos[productoExistenteIndex] = producto;
        showToast("✓ Producto actualizado exitosamente", 'success');
    } else {
        // Agregar nuevo producto
        productos.push(producto);
        showToast("✓ Producto guardado exitosamente", 'success');
    }

    localStorage.setItem('productos', JSON.stringify(productos));
    actualizarLista();

    // Reiniciar formulario
    document.getElementById('producto').value = '';
    document.getElementById('codigoBarras').value = '';
    document.getElementById('costo').value = '';
    document.getElementById('ganancia').value = '';
    document.getElementById('unidadesPorCaja').value = '';
    document.getElementById('unidadesExistentes').value = '';
    document.getElementById('descripcion').selectedIndex = 0;
    document.getElementById('precioUnitario').innerHTML = '';

    // Resetear variable de edición
    productoEditando = null;
}

function editarProducto(index) {
    // Si hay productos filtrados, obtener el índice real en el array original
    let indiceReal = index;
    
    if (productosFiltrados.length > 0) {
        // Buscar el producto en la lista filtrada y obtener el producto real
        const productoFiltrado = productosFiltrados[index];
        if (!productoFiltrado) return;
        
        // Encontrar el índice real en el array original
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

    // Llenar formulario con datos del producto
    document.getElementById('producto').value = producto.nombre || '';
    document.getElementById('codigoBarras').value = producto.codigoBarras || '';
    document.getElementById('descripcion').value = producto.descripcion || '';
    document.getElementById('costo').value = producto.costo || '';
    document.getElementById('ganancia').value = (producto.ganancia * 100) || '';
    document.getElementById('unidadesPorCaja').value = producto.unidadesPorCaja || '';
    document.getElementById('unidadesExistentes').value = producto.unidadesExistentes || '';
    
    // Calcular y mostrar precio unitario
    const tasaBCV = parseFloat(document.getElementById('tasaBCV').value) || tasaBCVGuardada;
    if (tasaBCV > 0) {
        const precioUnitarioDolar = producto.precioUnitarioDolar;
        const precioUnitarioBolivar = precioUnitarioDolar * tasaBCV;
        document.getElementById('precioUnitario').innerHTML =
            `<strong>Precio unitario:</strong> $${precioUnitarioDolar.toFixed(2)} / Bs${precioUnitarioBolivar.toFixed(2)}`;
    }

    // Establecer modo edición
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

        // Si la unidad es 'gramo', mostramos la cantidad seguida de "g"
        const cantidadMostrada = item.unidad === 'gramo' ? `${item.cantidad} g` : item.cantidad;

        // Si unidad = 'gramo', el botón + abrirá un prompt para ingresar gramos (ingresarGramos)
        const botonMas = item.unidad === 'gramo'
            ? `<button onclick="ingresarGramos(${index})">+</button>`
            : `<button onclick="actualizarCantidadCarrito(${index}, 1)">+</button>`;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.nombre} (${item.descripcion})</td>
            <td>Bs ${item.precioUnitarioBolivar.toFixed(2)}</td>
            <td>
                <button onclick="actualizarCantidadCarrito(${index}, -1)">-</button>
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

    // Para gramos, el cambio se interpreta como gramos (ej: -1 resta 1 gr)
    item.cantidad += cambio;

    if (item.cantidad <= 0) {
        eliminarDelCarrito(index);
        return;
    }

    // Recalcular subtotal según unidad
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

    const entrada = prompt("Ingrese la cantidad en gramos (ej: 350):", item.cantidad || '');
    if (entrada === null) return; // el usuario canceló

    const gramos = parseFloat(entrada);
    if (isNaN(gramos) || gramos <= 0) {
        showToast("Ingrese una cantidad válida en gramos", 'error');
        return;
    }

    // Validación simple de stock: producto.unidadesExistentes está en kilos según tu esquema,
    // por eso convertimos a gramos para comparar.
    const disponibleGramos = (producto.unidadesExistentes || 0) * 1000;

    // (Opcional) sumar lo que ya hay en carrito de este producto (excluyendo el ítem actual) para evitar sobreventa
    let enCarritoMismoProducto = 0;
    carrito.forEach((it, i) => {
        if (i !== index && it.indexProducto === item.indexProducto) {
            if (it.unidad === 'gramo') enCarritoMismoProducto += (parseFloat(it.cantidad) || 0);
            else {
                // si está en unidades, convertimos esa unidad a gramos:
                // suponemos que producto.unidadesPorCaja indica cómo convertir; si no aplica, será 0
                // Para productos por kilos normalmente unidadesPorCaja = 1 -> 1 unidad = 1000 g.
                const factor = producto.unidadesPorCaja || 1;
                enCarritoMismoProducto += (parseFloat(it.cantidad) || 0) * factor * 1000;
            }
        }
    });

    if ((gramos + enCarritoMismoProducto) > disponibleGramos) {
        showToast("No hay suficiente stock (gramos) para esa cantidad", 'error');
        return;
    }

    // Guardar cantidad en gramos y recalcular subtotal
    item.cantidad = gramos;
    item.unidad = 'gramo';
    calcularSubtotalSegonUnidad(item);

    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
}

function calcularSubtotalSegonUnidad(item) {
    const producto = productos[item.indexProducto];
    if (!producto) return;

    if (item.unidad === 'gramo') {
        // cantidad está en gramos, se multiplica por 0.001 para kilos
        item.subtotal = redondear2Decimales(item.cantidad * item.precioUnitarioBolivar * 0.001);
        item.subtotalDolar = redondear2Decimales(item.cantidad * item.precioUnitarioDolar * 0.001);
    } else {
        // unidad
        item.subtotal = redondear2Decimales(item.cantidad * item.precioUnitarioBolivar);
        item.subtotalDolar = redondear2Decimales(item.cantidad * item.precioUnitarioDolar);
    }
}

function cambiarUnidadCarrito(index, nuevaUnidad) {
    carrito[index].unidad = nuevaUnidad;
    // Mantener la cantidad tal cual; el usuario puede usar el + para ingresar gramos si selecciona "gramo".
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

    productosFiltrados = []; // Reiniciar array de productos filtrados

    productos.forEach((producto, index) => {
        const inventarioBajo = producto.unidadesExistentes <= 5;
        // Mostrar existencias: si el usuario maneja kilos, mantén kilos; si quieres mostrar gramos puedes adaptar.
        const filas = document.createElement('tr');
        filas.innerHTML = `
            <td>${producto.nombre}</td>
            <td>${producto.descripcion}</td>
            <td>${producto.codigoBarras || 'N/A'}</td>
            <td class="${inventarioBajo ? 'inventario-bajo' : ''}">${producto.unidadesExistentes}</td>
            <td>
                <div class="ajuste-inventario">
                    <button onclick="ajustarInventario(${index}, 'sumar')">+</button>
                    <button onclick="ajustarInventario(${index}, 'restar')">-</button>
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

function buscarProducto() {
    const termino = document.getElementById('buscar').value.trim().toLowerCase();
    if (!termino) { 
        productosFiltrados = []; // Limpiar array de productos filtrados
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
            <td>${producto.nombre}</td>
            <td>${producto.descripcion}</td>
            <td>${producto.codigoBarras || 'N/A'}}</td>
            <td class="${inventarioBajo ? 'inventario-bajo' : ''}">${producto.unidadesExistentes}</td>
            <td>
                <div class="ajuste-inventario">
                    <button onclick="ajustarInventario(${index}, 'sumar')">+</button>
                    <button onclick="ajustarInventario(${index}, 'restar')">-</button>
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
    // Si hay productos filtrados, obtener el índice real en el array original
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
    // Si hay productos filtrados, obtener el índice real en el array original
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

    // Limpio objeto detallesPago
    detallesPago = { metodo, totalBs };

    if (metodo === 'efectivo_bs' || metodo === 'efectivo_dolares') {
        detallesDiv.innerHTML = `
            <div class="campo-pago">
                <label>Monto recibido (${metodo === 'efectivo_bs' ? 'Bs' : '$'}):</label>
                <input type="number" id="montoRecibido" placeholder="Ingrese monto recibido" />
            </div>
            <div class="campo-pago">
                <label>Cambio:</label>
                <input type="text" id="cambioCalculado" readonly placeholder="0.00" />
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
                    cambio = redondear2Decimales(recib - totalEnDolares);
                }
                document.getElementById('cambioCalculado').value = cambio >= 0 ? cambio.toFixed(2) : `Faltan ${Math.abs(cambio).toFixed(2)}`;
            });
        }, 100);
    } else if (metodo === 'punto' || metodo === 'biopago') {
        detallesDiv.innerHTML = `
            <div class="campo-pago">
                <label>Monto a pagar:</label>
                <input type="number" id="montoPago" placeholder="Ingrese monto" />
            </div>
        `;
    } else if (metodo === 'pago_movil') {
        detallesDiv.innerHTML = `
            <div class="campo-pago">
                <label>Monto a pagar:</label>
                <input type="number" id="montoPagoMovil" placeholder="Ingrese monto" />
            </div>
            <div class="campo-pago">
                <label>Referencia / Número:</label>
                <input type="text" id="refPagoMovil" placeholder="Referencia bancaria" />
            </div>
            <div class="campo-pago">
                <label>Banco:</label>
                <input type="text" id="bancoPagoMovil" placeholder="Nombre del banco" />
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

    // Validaciones por método
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

    // Registrar ventas y restar inventario (aquí restamos según unidad final en carrito)
    carrito.forEach(item => {
    const producto = productos[item.indexProducto];
    if (producto) {
        // Para 'gramo': item.cantidad está en gramos -> restamos item.cantidad/1000 de unidadesExistentes (que están en kilos)
        if (item.unidad === 'gramo') {
            producto.unidadesExistentes = redondear2Decimales(producto.unidadesExistentes - (item.cantidad / 1000));
        } else {
            // Para unidades: restamos la cantidad directamente
            producto.unidadesExistentes = redondear2Decimales(producto.unidadesExistentes - item.cantidad);
        }

        // Asegurar que no haya números negativos
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

    // ACTUALIZAR LOS DATOS EN LOCALSTORAGE
    localStorage.setItem('productos', JSON.stringify(productos));
    localStorage.setItem('ventasDiarias', JSON.stringify(ventasDiarias));

    showToast(`Venta completada por Bs ${redondear2Decimales(totalBs).toFixed(2)}`, 'success');

    // Preparar detalles para el ticket
    detallesPago.totalBs = redondear2Decimales(totalBs);
    detallesPago.items = JSON.parse(JSON.stringify(carrito));
    detallesPago.fecha = new Date().toLocaleString();

    // Limpiar carrito
    carrito = [];
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
    
    // Actualizar la lista de productos para reflejar el nuevo inventario
    actualizarLista();
    
    cerrarModalPago();

    // Imprimir ticket térmico automáticamente
    imprimirTicketTermico(detallesPago);
}

// cancelar pago
function cancelarPago() {
    document.getElementById('detallesPago').style.display = 'none';
    metodoPagoSeleccionado = null;
    detallesPago = {};
}

// ===== NOMBRE ESTABLECIMIENTO Y TASA BCV (toasts por éxito/error) =====
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

    // Recalcular precios de todos los productos
    productos.forEach(producto => {
        producto.precioUnitarioBolivar = producto.precioUnitarioDolar * nuevaTasa;
        producto.precioMayorBolivar = producto.precioMayorDolar * nuevaTasa;
    });

    localStorage.setItem('productos', JSON.stringify(productos));
    actualizarLista();

    showToast(`Tasa BCV actualizada a: ${nuevaTasa}`, 'success');
}

// toggle copyright
function toggleCopyrightNotice() {
    const notice = document.getElementById('copyrightNotice');
    if (!notice) return;
    notice.style.display = notice.style.display === 'block' ? 'none' : 'block';
}

/* ===== LISTA DE COSTOS (ORDEN ALFABÉTICO + buscador condicional) ===== */
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

// ===== GENERAR REPORTE DIARIO (PDF) con detalle y cálculo de ganancia =====
function generarReporteDiario() {
    if (!ventasDiarias.length) { showToast("No hay ventas registradas", 'warning'); return; }

    const hoy = new Date().toLocaleDateString();
    const ventasHoy = ventasDiarias.filter(v => v.fecha === hoy);
    const ventasAUsar = ventasHoy.length ? ventasHoy : ventasDiarias;

    let totalVentasBs = 0;
    let totalCostosBs = 0;
    const filas = ventasAUsar.map(v => {
        totalVentasBs += v.totalBolivar || 0;
        const producto = productos[v.indexProducto] || productos.find(p => p.nombre === v.producto);
        let costoDolar = 0;

        if (producto) {
            if (v.unidad === 'gramo') {
                costoDolar = (v.cantidad / 1000) * (producto.costo / (producto.unidadesPorCaja || 1));
            } else if (v.unidad === 'caja') {
                costoDolar = v.cantidad * (producto.costo || 0);
            } else {
                costoDolar = v.cantidad * ((producto.costo || 0) / (producto.unidadesPorCaja || 1));
            }
        }

        const costoBs = costoDolar * (tasaBCVGuardada || 1);
        totalCostosBs += costoBs;

        return [
            v.fecha,
            v.hora,
            v.producto,
            `${v.cantidad} ${v.unidad}`,
            `Bs ${ (v.totalBolivar || 0).toFixed(2) }`,
            v.metodoPago,
            `Bs ${ costoBs.toFixed(2) }`
        ];
    });

    const gananciaEstim = totalVentasBs - totalCostosBs;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt' });

    doc.setFontSize(14);
    doc.text(nombreEstablecimiento || 'Reporte Diario', 40, 40);
    doc.setFontSize(10);
    doc.text(`Fecha: ${ (new Date()).toLocaleDateString() }`, 40, 60);

    doc.autoTable({
        startY: 80,
        head: [['Fecha','Hora','Producto','Cant.','Total (Bs)','Pago','Costo Bs']],
        body: filas,
        styles: { fontSize: 9 }
    });

    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 300;
    doc.setFontSize(11);
    doc.text(`Total ventas (Bs): ${totalVentasBs.toFixed(2)}`, 40, finalY + 20);
    doc.text(`Total costos estimados (Bs): ${totalCostosBs.toFixed(2)}`, 40, finalY + 38);
    doc.text(`Ganancia estimada (Bs): ${gananciaEstim.toFixed(2)}`, 40, finalY + 56);

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
        
        // Mapear el valor de la categoría a un nombre legible
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

    // Ordenar alfabéticamente
    productosFiltrados.sort((a, b) => (a.nombre || '').localeCompare((b.nombre || ''), 'es', { sensitivity: 'base' }));

    const rows = productosFiltrados.map(p => [
        p.nombre,
        `$${p.precioUnitarioDolar.toFixed(2)}`,
        `Bs ${p.precioUnitarioBolivar.toFixed(2)}`
    ]);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Encabezado
    doc.setFontSize(16);
    doc.text(nombreEstablecimiento || 'Lista de Productos', 14, 18);
    doc.setFontSize(12);
    doc.text(`Categoría: ${tituloCategoria}`, 14, 26);
    doc.setFontSize(10);
    doc.text(`Fecha: ${(new Date()).toLocaleDateString()}`, 14, 34);

    // Tabla
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

    // Ordenar alfabéticamente
    productosFiltrados.sort((a, b) => (a.nombre || '').localeCompare((b.nombre || ''), 'es', { sensitivity: 'base' }));

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Configuración de etiquetas
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 10;
    const labelWidth = 63; // 3 columnas
    const labelHeight = 35; // Altura de cada etiqueta
    const labelsPerPage = 21; // 3 columnas x 7 filas

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

        // Dibujar cuadro de etiqueta
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(255, 255, 255);
        doc.rect(x, y, labelWidth - 2, labelHeight - 2, 'FD');

        // Nombre del establecimiento (más pequeño)
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(nombreEstablecimiento || 'TIENDA', x + 2, y + 5);

        // Nombre del producto
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const nombreProducto = producto.nombre.length > 25 ? 
            producto.nombre.substring(0, 25) + '...' : producto.nombre;
        doc.text(nombreProducto, x + 2, y + 10);

        // Precio en bolívares (grande y destacado)
        doc.setFontSize(14);
        doc.setTextColor(220, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text(`Bs ${producto.precioUnitarioBolivar.toFixed(2)}`, x + 2, y + 20);

        // Categoría (pequeño)
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.setFont(undefined, 'normal');
        doc.text(`Categoría: ${tituloCategoria}`, x + 2, y + 25);

        // Código de barras si existe
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

// ===== Imprimir ticket térmico (abre una ventana con formato estrecho y llama print) =====
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
            <style>
                body { font-family: monospace; padding: 6px; }
                .ticket { width: 280px; }
                .ticket h2 { text-align:center; font-size: 16px; margin:6px 0; }
                .line { border-top: 1px dashed #000; margin:6px 0; }
                .items div { margin-bottom:6px; font-size:12px; }
                .totals { margin-top:8px; font-weight:bold; font-size:13px; }
                .small { font-size:11px; color:#333; }
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
        // Recopilar todos los datos del localStorage
        const backupData = {
            productos: JSON.parse(localStorage.getItem('productos')) || [],
            nombreEstablecimiento: localStorage.getItem('nombreEstablecimiento') || '',
            tasaBCV: localStorage.getItem('tasaBCV') || 0,
            ventasDiarias: JSON.parse(localStorage.getItem('ventasDiarias')) || [],
            carrito: JSON.parse(localStorage.getItem('carrito')) || [],
            fechaBackup: new Date().toISOString(),
            version: '1.0'
        };

        // Crear el archivo JSON
        const dataStr = JSON.stringify(backupData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        // Crear un enlace de descarga
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(dataBlob);
        downloadLink.download = `respaldo_calculadora_${new Date().toISOString().slice(0, 10)}.json`;
        
        // Simular clic en el enlace
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
            
            // Validar estructura básica del archivo
            if (!backupData.productos || !Array.isArray(backupData.productos)) {
                throw new Error('Formato de archivo inválido');
            }
            
            // Confirmar con el usuario antes de sobrescribir datos
            if (confirm('¿Estás seguro de que deseas cargar este respaldo? Se sobrescribirán todos los datos actuales.')) {
                // Restaurar datos en localStorage
                localStorage.setItem('productos', JSON.stringify(backupData.productos));
                localStorage.setItem('nombreEstablecimiento', backupData.nombreEstablecimiento || '');
                localStorage.setItem('tasaBCV', backupData.tasaBCV || 0);
                localStorage.setItem('ventasDiarias', JSON.stringify(backupData.ventasDiarias || []));
                localStorage.setItem('carrito', JSON.stringify(backupData.carrito || []));
                
                // Recargar variables globales
                productos = JSON.parse(localStorage.getItem('productos')) || [];
                nombreEstablecimiento = localStorage.getItem('nombreEstablecimiento') || '';
                tasaBCVGuardada = parseFloat(localStorage.getItem('tasaBCV')) || 0;
                ventasDiarias = JSON.parse(localStorage.getItem('ventasDiarias')) || [];
                carrito = JSON.parse(localStorage.getItem('carrito')) || [];
                
                // Actualizar interfaz
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
    
    // Limpiar el input de archivo
    document.getElementById('fileInput').value = '';
}

// ===== NUEVAS FUNCIONES PARA ESCÁNER MEJORADO =====
function procesarEscaneo(codigo) {
    if (!codigo) {
        showToast("Código de barras vacío", 'warning');
        return;
    }

    // Buscar por código exacto primero
    let productoEncontrado = productos.find(p =>
        p.codigoBarras && p.codigoBarras.toLowerCase() === codigo.toLowerCase()
    );

    // Si no se encuentra por código, buscar por nombre exacto
    if (!productoEncontrado) {
        productoEncontrado = productos.find(p =>
            (p.nombre || '').toLowerCase() === codigo.toLowerCase()
        );
    }

    // Si aún no se encuentra, buscar por coincidencia parcial en nombre
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

    // AGREGAR AL CARRITO
    agregarProductoAlCarrito(productoEncontrado);
    darFeedbackEscaneoExitoso();
}

function agregarProductoAlCarrito(productoEncontrado) {
    // Verificar si ya está en el carrito (mismo nombre y unidad 'unidad')
    const enCarrito = carrito.findIndex(item => item.nombre === productoEncontrado.nombre && item.unidad === 'unidad');

    if (enCarrito !== -1) {
        // Actualizar cantidad (unidad)
        carrito[enCarrito].cantidad += 1;
        carrito[enCarrito].subtotal = redondear2Decimales(carrito[enCarrito].cantidad * carrito[enCarrito].precioUnitarioBolivar);
        carrito[enCarrito].subtotalDolar = redondear2Decimales(carrito[enCarrito].cantidad * carrito[enCarrito].precioUnitarioDolar);
    } else {
        // Agregar nuevo producto (por defecto unidad)
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

    // Limpiar y focus
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

    // Buscar productos similares
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
    // Cambio visual breve en el input
    const codigoInput = document.getElementById('codigoBarrasInput');
    if (codigoInput) {
        codigoInput.style.backgroundColor = '#d4edda';
        setTimeout(() => {
            codigoInput.style.backgroundColor = '';
        }, 300);
    }
}
