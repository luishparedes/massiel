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

// Variables para escáner
let tiempoUltimaTecla = 0;
let bufferEscaneo = '';

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('Calculadora Mágica iniciada correctamente');
    inicializarSistemaInactividad();
    cargarDatosIniciales();
    actualizarEstadisticas();
    configurarEventos();
    configurarEventosMoviles();
    limpiarVentasAntiguas(); // Limpiar ventas de más de 7 días
    
    // Enfocar input de escáner al cargar
    setTimeout(() => {
        const codigoInput = document.getElementById('codigoBarrasInput');
        if (codigoInput) {
            codigoInput.focus();
        }
    }, 1000);
});

// ===== LIMPIAR VENTAS ANTIGUAS (7 días) =====
function limpiarVentasAntiguas() {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 7); // Hace 7 días
    
    ventasDiarias = ventasDiarias.filter(venta => {
        const fechaVenta = new Date(venta.fecha);
        return fechaVenta >= fechaLimite;
    });
    
    localStorage.setItem('ventasDiarias', JSON.stringify(ventasDiarias));
}

// ===== NAVEGACIÓN Y UI =====
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');
}

function showSection(sectionId) {
    // Ocultar todas las secciones
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar sección seleccionada
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Actualizar navegación activa
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Marcar item activo (buscar por función onclick)
    const activeNav = Array.from(navItems).find(item => 
        item.getAttribute('onclick') === `showSection('${sectionId}')` ||
        (sectionId === 'inicio' && item.getAttribute('onclick') === `showSection('inicio')`)
    );
    if (activeNav) {
        activeNav.classList.add('active');
    }
    
    // Cargar datos específicos de la sección
    switch(sectionId) {
        case 'lista-productos':
            actualizarListaProductos();
            break;
        case 'carrito-ventas':
            actualizarCarrito();
            // Enfocar input de escáner
            setTimeout(() => {
                const input = document.getElementById('codigoBarrasInput');
                if (input) input.focus();
            }, 300);
            break;
        case 'lista-costos':
            llenarListaCostos();
            break;
        case 'escaner-rapido':
            // Enfocar búsqueda rápida
            setTimeout(() => {
                const input = document.getElementById('busquedaRapida');
                if (input) input.focus();
            }, 300);
            break;
        case 'inicio':
            actualizarEstadisticas();
            break;
    }
    
    // Cerrar sidebar en móviles
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar.classList.contains('collapsed')) {
            toggleSidebar();
        }
    }
}

function actualizarEstadisticas() {
    // Total productos
    document.getElementById('totalProductos').textContent = productos.length;
    
    // Ventas hoy
    const hoy = new Date().toLocaleDateString();
    const ventasHoy = ventasDiarias.filter(v => v.fecha === hoy).length;
    document.getElementById('ventasHoy').textContent = ventasHoy;
    
    // Inventario bajo
    const inventarioBajo = productos.filter(p => p.unidadesExistentes <= 5).length;
    document.getElementById('inventarioBajo').textContent = inventarioBajo;
    
    // Tasa BCV
    document.getElementById('tasaActual').textContent = tasaBCVGuardada.toFixed(2);
    
    // Nombre establecimiento
    document.getElementById('currentEstablecimiento').textContent = 
        nombreEstablecimiento || 'Sin nombre';
}

// ===== CONFIGURACIÓN DE EVENTOS =====
function configurarEventos() {
    // Buscador de productos
    const buscarInput = document.getElementById('buscar');
    if (buscarInput) {
        buscarInput.addEventListener('input', function(e) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                buscarProducto();
            }, 500);
        });
    }

    // Input de escáner del carrito
    const codigoInput = document.getElementById('codigoBarrasInput');
    if (codigoInput) {
        configurarInputBusqueda(codigoInput, 'sugerencias');
    }

    // Input de búsqueda rápida
    const busquedaRapidaInput = document.getElementById('busquedaRapida');
    if (busquedaRapidaInput) {
        busquedaRapidaInput.addEventListener('input', function() {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                buscarProductoRapido();
            }, 300);
        });
    }

    // Configurar fecha máxima para reportes
    const fechaInput = document.getElementById('fechaReporte');
    if (fechaInput) {
        const hoy = new Date().toISOString().split('T')[0];
        fechaInput.max = hoy;
        fechaInput.value = hoy;
    }
}

function configurarInputBusqueda(inputElement, sugerenciasId) {
    inputElement.addEventListener('input', function() {
        const termino = this.value.trim().toLowerCase();
        const sugerenciasDiv = document.getElementById(sugerenciasId);
        if (!sugerenciasDiv) return;
        
        sugerenciasDiv.innerHTML = '';
        sugerenciasDiv.style.display = 'none';

        if (termino.length < 2) return;

        const coincidencias = productos.filter(p =>
            (p.nombre || p.producto || '').toLowerCase().includes(termino) ||
            (p.codigoBarras && p.codigoBarras.toLowerCase().includes(termino))
        );

        if (coincidencias.length > 0) {
            sugerenciasDiv.style.display = 'block';
            
            // Título de sugerencias
            const titulo = document.createElement('div');
            titulo.className = 'sugerencia-titulo';
            titulo.textContent = `Sugerencias (${coincidencias.length} encontrados):`;
            sugerenciasDiv.appendChild(titulo);

            coincidencias.slice(0, 8).forEach(prod => {
                const opcion = document.createElement('div');
                opcion.className = 'sugerencia-item';
                opcion.innerHTML = `
                    <div style="flex: 1;">
                        <strong>${prod.nombre}</strong>
                        <div style="font-size: 12px; color: #666;">${prod.descripcion}</div>
                        <div style="font-size: 11px; color: #888;">Código: ${prod.codigoBarras || 'N/A'}</div>
                    </div>
                    <button class="btn-agregar-sugerencia" onclick="agregarProductoDesdeSugerencia('${prod.nombre}')">
                        Agregar
                    </button>
                `;
                
                // Agregar al hacer clic en cualquier parte del item
                opcion.addEventListener('click', function(e) {
                    if (e.target.classList.contains('btn-agregar-sugerencia')) return;
                    agregarProductoDesdeSugerencia(prod.nombre);
                });
                
                sugerenciasDiv.appendChild(opcion);
            });
        }
    });

    inputElement.addEventListener('blur', function() {
        setTimeout(() => {
            const sugerenciasDiv = document.getElementById(sugerenciasId);
            if (sugerenciasDiv) {
                sugerenciasDiv.style.display = 'none';
            }
        }, 200);
    });
}

function configurarEventosMoviles() {
    // Prevenir zoom en inputs
    document.addEventListener('touchstart', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
            document.body.style.zoom = '100%';
        }
    }, { passive: true });

    // Mejorar scroll en móviles
    document.addEventListener('touchmove', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
            e.preventDefault();
        }
    }, { passive: false });
}

function manejarEntradaEscaneo(e) {
    const tiempoActual = new Date().getTime();
    
    if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        
        if (e.target.value.trim() && (tiempoActual - tiempoUltimaTecla) < 100) {
            procesarEscaneo(e.target.value.trim());
            e.target.value = '';
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
}

// ===== FUNCIONES BÁSICAS =====
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

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'success', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
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

// ===== GESTIÓN DE PRODUCTOS =====
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
        precioUnitarioElem.innerHTML = `
            <h4>Resultado del Cálculo:</h4>
            <p><strong>Precio unitario:</strong> $${precioUnitarioDolar.toFixed(2)} / Bs ${precioUnitarioBolivar.toFixed(2)}</p>
            <p><strong>Precio al mayor:</strong> $${precioDolar.toFixed(2)} / Bs ${precioBolivares.toFixed(2)}</p>
        `;
    }
}

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
    actualizarEstadisticas();

    // Limpiar formulario
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

// ===== LISTA DE PRODUCTOS =====
function actualizarListaProductos() {
    const tbody = document.getElementById('productosTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    productosFiltrados = productos;

    productos.forEach((producto, index) => {
        const inventarioBajo = producto.unidadesExistentes <= 5;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${producto.nombre}</td>
            <td>${producto.descripcion}</td>
            <td>${producto.codigoBarras || 'N/A'}</td>
            <td class="${inventarioBajo ? 'inventario-bajo' : ''}">${producto.unidadesExistentes}</td>
            <td>$${producto.precioUnitarioDolar.toFixed(2)}</td>
            <td>Bs ${producto.precioUnitarioBolivar.toFixed(2)}</td>
            <td>${(producto.ganancia * 100).toFixed(0)}%</td>
            <td>
                <button class="btn btn-secondary" onclick="editarProducto(${index})" style="padding: 6px 12px; margin: 2px;">
                    <span class="material-icons" style="font-size: 16px;">edit</span>
                </button>
                <button class="btn btn-danger" onclick="eliminarProducto(${index})" style="padding: 6px 12px; margin: 2px;">
                    <span class="material-icons" style="font-size: 16px;">delete</span>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function buscarProducto() {
    const termino = document.getElementById('buscar').value.trim().toLowerCase();
    const tbody = document.getElementById('productosTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (!termino) { 
        productosFiltrados = productos;
        actualizarListaProductos();
        return; 
    }

    productosFiltrados = productos.filter(p =>
        (p.nombre || '').toLowerCase().includes(termino) ||
        (p.descripcion || '').toLowerCase().includes(termino) ||
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(termino))
    );

    if (productosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No se encontraron productos</td></tr>';
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
            <td>$${producto.precioUnitarioDolar.toFixed(2)}</td>
            <td>Bs ${producto.precioUnitarioBolivar.toFixed(2)}</td>
            <td>${(producto.ganancia * 100).toFixed(0)}%</td>
            <td>
                <button class="btn btn-secondary" onclick="editarProducto(${index})" style="padding: 6px 12px; margin: 2px;">
                    <span class="material-icons" style="font-size: 16px;">edit</span>
                </button>
                <button class="btn btn-danger" onclick="eliminarProducto(${index})" style="padding: 6px 12px; margin: 2px;">
                    <span class="material-icons" style="font-size: 16px;">delete</span>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
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

    // Llenar formulario
    document.getElementById('producto').value = producto.nombre || '';
    document.getElementById('codigoBarras').value = producto.codigoBarras || '';
    document.getElementById('descripcion').value = producto.descripcion || '';
    document.getElementById('costo').value = producto.costo || '';
    document.getElementById('ganancia').value = (producto.ganancia * 100) || '';
    document.getElementById('unidadesPorCaja').value = producto.unidadesPorCaja || '';
    document.getElementById('unidadesExistentes').value = producto.unidadesExistentes || '';
    
    // Calcular y mostrar precio
    const tasaBCV = parseFloat(document.getElementById('tasaBCV').value) || tasaBCVGuardada;
    if (tasaBCV > 0) {
        const precioUnitarioDolar = producto.precioUnitarioDolar;
        const precioUnitarioBolivar = precioUnitarioDolar * tasaBCV;
        document.getElementById('precioUnitario').innerHTML = `
            <h4>Precio Actual:</h4>
            <p><strong>Precio unitario:</strong> $${precioUnitarioDolar.toFixed(2)} / Bs ${precioUnitarioBolivar.toFixed(2)}</p>
        `;
    }

    productoEditando = indiceReal;
    showSection('agregar-producto');
    showToast(`Editando: ${producto.nombre}`, 'success');
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
        actualizarListaProductos();
        actualizarEstadisticas();
        showToast(`Producto eliminado: ${producto.nombre}`, 'success');
    }
}

// ===== CARRITO DE VENTAS - FUNCIONES MEJORADAS =====
function agregarPorCodigoBarras() {
    const codigo = document.getElementById('codigoBarrasInput').value.trim();
    if (!codigo) {
        showToast("Ingrese un código o nombre de producto", 'warning');
        return;
    }
    procesarEscaneo(codigo);
}

function procesarEscaneo(codigo) {
    if (!codigo) {
        showToast("Código de barras vacío", 'warning');
        return;
    }

    // Buscar producto exacto primero
    let productoEncontrado = productos.find(p =>
        p.codigoBarras && p.codigoBarras.toLowerCase() === codigo.toLowerCase()
    );

    // Si no encuentra por código, buscar por nombre exacto
    if (!productoEncontrado) {
        productoEncontrado = productos.find(p =>
            (p.nombre || '').toLowerCase() === codigo.toLowerCase()
        );
    }

    // Si no encuentra exacto, buscar por coincidencia parcial
    if (!productoEncontrado) {
        const coincidencias = productos.filter(p =>
            (p.nombre || '').toLowerCase().includes(codigo.toLowerCase())
        );
        
        if (coincidencias.length === 1) {
            // Si hay solo una coincidencia, usarla
            productoEncontrado = coincidencias[0];
        } else if (coincidencias.length > 1) {
            // Si hay múltiples coincidencias, mostrar sugerencias
            mostrarSugerenciasCarrito(coincidencias, codigo);
            return;
        }
    }

    if (!productoEncontrado) {
        showToast("Producto no encontrado: " + codigo, 'error');
        
        // Mostrar sugerencias similares
        const sugerencias = productos.filter(p =>
            (p.nombre || '').toLowerCase().includes(codigo.toLowerCase().substring(0, 3)) ||
            (p.codigoBarras && p.codigoBarras.toLowerCase().includes(codigo.toLowerCase().substring(0, 3)))
        );
        
        if (sugerencias.length > 0) {
            mostrarSugerenciasCarrito(sugerencias, codigo);
        }
        return;
    }

    agregarProductoAlCarrito(productoEncontrado);
}

// FUNCIÓN PARA AGREGAR PRODUCTO DESDE SUGERENCIA
function agregarProductoDesdeSugerencia(nombreProducto) {
    const producto = productos.find(p => p.nombre === nombreProducto);
    if (producto) {
        agregarProductoAlCarrito(producto);
        const sugerenciasDiv = document.getElementById('sugerencias');
        if (sugerenciasDiv) {
            sugerenciasDiv.style.display = 'none';
        }
        document.getElementById('codigoBarrasInput').value = '';
        document.getElementById('codigoBarrasInput').focus();
    }
}

function agregarProductoAlCarrito(productoEncontrado) {
    const enCarrito = carrito.findIndex(item => 
        item.nombre === productoEncontrado.nombre && item.unidad === 'unidad'
    );

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
    if (scannerStatus) {
        scannerStatus.textContent = '✓ Producto agregado. Escanee siguiente...';
        scannerStatus.className = 'scanner-status exitoso';
        
        setTimeout(() => {
            scannerStatus.textContent = 'Esperando escaneo de código de barras...';
            scannerStatus.className = 'scanner-status';
        }, 2000);
    }

    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
}

function actualizarCarrito() {
    const carritoBody = document.getElementById('carritoBody');
    const totalCarritoBs = document.getElementById('totalCarritoBs');
    const totalCarritoDolares = document.getElementById('totalCarritoDolares');

    if (!carritoBody) return;

    carritoBody.innerHTML = '';

    if (carrito.length === 0) {
        carritoBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">El carrito está vacío</td></tr>';
        if (totalCarritoBs) totalCarritoBs.querySelector('strong').textContent = '0,00';
        if (totalCarritoDolares) totalCarritoDolares.querySelector('strong').textContent = '0,00';
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
            <td>${item.nombre} (${item.descripcion})</td>
            <td>Bs ${item.precioUnitarioBolivar.toFixed(2)}</td>
            <td>
                <button class="btn btn-secondary" onclick="actualizarCantidadCarrito(${index}, -1)" style="padding: 4px 8px; margin: 2px;">-</button>
                ${cantidadMostrada}
                <button class="btn btn-secondary" onclick="actualizarCantidadCarrito(${index}, 1)" style="padding: 4px 8px; margin: 2px;">+</button>
            </td>
            <td>
                <select onchange="cambiarUnidadCarrito(${index}, this.value)" class="form-select" style="padding: 6px; font-size: 12px;">
                    <option value="unidad" ${item.unidad === 'unidad' ? 'selected' : ''}>Unidad</option>
                    <option value="gramo" ${item.unidad === 'gramo' ? 'selected' : ''}>Gramo</option>
                </select>
            </td>
            <td>Bs ${item.subtotal.toFixed(2)}</td>
            <td>
                <button class="btn btn-danger" onclick="eliminarDelCarrito(${index})" style="padding: 6px 12px;">
                    <span class="material-icons" style="font-size: 16px;">delete</span>
                </button>
            </td>
        `;
        carritoBody.appendChild(row);
    });

    if (totalCarritoBs) totalCarritoBs.querySelector('strong').textContent = totalBs.toFixed(2);
    if (totalCarritoDolares) totalCarritoDolares.querySelector('strong').textContent = totalDolares.toFixed(2);
}

function actualizarCantidadCarrito(index, cambio) {
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

function calcularSubtotalSegunUnidad(item) {
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
    calcularSubtotalSegunUnidad(carrito[index]);
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
}

function limpiarCarrito() {
    if (carrito.length === 0) {
        showToast("El carrito ya está vacío", 'warning');
        return;
    }
    
    if (confirm("¿Estás seguro de limpiar el carrito?")) {
        carrito = [];
        localStorage.setItem('carrito', JSON.stringify(carrito));
        actualizarCarrito();
        showToast("Carrito limpiado", 'success');
    }
}

// ===== ESCÁNER RÁPIDO =====
function buscarProductoRapido() {
    const termino = document.getElementById('busquedaRapida').value.trim().toLowerCase();
    const resultadoDiv = document.getElementById('resultadoBusqueda');
    
    if (!resultadoDiv) return;
    
    resultadoDiv.innerHTML = '';

    if (!termino) {
        resultadoDiv.innerHTML = `
            <div class="placeholder-message">
                <span class="material-icons">search</span>
                <p>Ingresa un código de barras o nombre de producto para buscar</p>
            </div>
        `;
        return;
    }

    // Buscar productos
    const productosEncontrados = productos.filter(p =>
        (p.nombre || '').toLowerCase().includes(termino) ||
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(termino)) ||
        (p.descripcion || '').toLowerCase().includes(termino)
    );

    if (productosEncontrados.length === 0) {
        resultadoDiv.innerHTML = `
            <div class="placeholder-message">
                <span class="material-icons">search_off</span>
                <p>No se encontraron productos para "${termino}"</p>
            </div>
        `;
        return;
    }

    // Mostrar resultados
    productosEncontrados.forEach(producto => {
        const productoDiv = document.createElement('div');
        productoDiv.className = 'producto-encontrado';
        productoDiv.innerHTML = `
            <h3>${producto.nombre}</h3>
            <p><strong>Categoría:</strong> ${producto.descripcion}</p>
            <p><strong>Código:</strong> ${producto.codigoBarras || 'N/A'}</p>
            <p><strong>Existencias:</strong> ${producto.unidadesExistentes} unidades</p>
            
            <div class="precios-rapidos">
                <div class="precio-rapido">
                    <div class="moneda">DÓLARES</div>
                    <div class="monto">$${producto.precioUnitarioDolar.toFixed(2)}</div>
                    <div style="font-size: 12px; color: #666; margin-top: 4px;">Unitario</div>
                </div>
                <div class="precio-rapido">
                    <div class="moneda">BOLÍVARES</div>
                    <div class="monto">Bs ${producto.precioUnitarioBolivar.toFixed(2)}</div>
                    <div style="font-size: 12px; color: #666; margin-top: 4px;">Unitario</div>
                </div>
            </div>
            
            <div class="precios-rapidos" style="margin-top: 12px;">
                <div class="precio-rapido" style="background: #e8f5e8;">
                    <div class="moneda">MAYOR $</div>
                    <div class="monto">$${producto.precioMayorDolar.toFixed(2)}</div>
                </div>
                <div class="precio-rapido" style="background: #e8f5e8;">
                    <div class="moneda">MAYOR Bs</div>
                    <div class="monto">Bs ${producto.precioMayorBolivar.toFixed(2)}</div>
                </div>
            </div>
            
            <button class="btn btn-primary" onclick="agregarDesdeEscannerRapido('${producto.nombre}')" 
                    style="margin-top: 16px; width: 100%;">
                <span class="material-icons">add_shopping_cart</span>
                Agregar al Carrito
            </button>
        `;
        resultadoDiv.appendChild(productoDiv);
    });
}

function agregarDesdeEscannerRapido(nombreProducto) {
    const producto = productos.find(p => p.nombre === nombreProducto);
    if (producto) {
        agregarProductoAlCarrito(producto);
        showToast(`${producto.nombre} agregado al carrito`, 'success');
        showSection('carrito-ventas');
    }
}

// ===== VENTAS Y PAGOS =====
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

function seleccionarMetodoPago(metodo) {
    metodoPagoSeleccionado = metodo;
    const detallesDiv = document.getElementById('camposPago');
    const totalBs = carrito.reduce((sum, i) => sum + i.subtotal, 0);
    detallesDiv.innerHTML = '';

    detallesPago = { metodo, totalBs };

    if (metodo === 'efectivo_bs' || metodo === 'efectivo_dolares') {
        detallesDiv.innerHTML = `
            <div class="form-group">
                <label class="form-label">Monto recibido (${metodo === 'efectivo_bs' ? 'Bs' : '$'}):</label>
                <input type="number" id="montoRecibido" class="form-input" placeholder="Ingrese monto recibido" step="0.01" />
            </div>
            <div class="form-group">
                <label class="form-label">Cambio:</label>
                <input type="text" id="cambioCalculado" class="form-input" readonly placeholder="0.00" />
            </div>
        `;
        
        const input = document.getElementById('montoRecibido');
        input.addEventListener('input', () => {
            const recib = parseFloat(input.value) || 0;
            let cambio = 0;
            if (metodo === 'efectivo_bs') {
                cambio = redondear2Decimales(recib - totalBs);
            } else {
                const totalEnDolares = tasaBCVGuardada ? redondear2Decimales(totalBs / tasaBCVGuardada) : 0;
                cambio = redondear2Decimales(recib - totalEnDolares);
            }
            document.getElementById('cambioCalculado').value = cambio >= 0 ? cambio.toFixed(2) : `Faltan ${Math.abs(cambio).toFixed(2)}`;
        });
    } else if (metodo === 'punto' || metodo === 'biopago') {
        detallesDiv.innerHTML = `
            <div class="form-group">
                <label class="form-label">Monto a pagar:</label>
                <input type="number" id="montoPago" class="form-input" placeholder="Ingrese monto" step="0.01" />
            </div>
        `;
    } else if (metodo === 'pago_movil') {
        detallesDiv.innerHTML = `
            <div class="form-group">
                <label class="form-label">Monto a pagar:</label>
                <input type="number" id="montoPagoMovil" class="form-input" placeholder="Ingrese monto" step="0.01" />
            </div>
            <div class="form-group">
                <label class="form-label">Referencia / Número:</label>
                <input type="text" id="refPagoMovil" class="form-input" placeholder="Referencia bancaria" />
            </div>
            <div class="form-group">
                <label class="form-label">Banco:</label>
                <input type="text" id="bancoPagoMovil" class="form-input" placeholder="Nombre del banco" />
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

    // Procesar venta
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
    actualizarEstadisticas();
    
    cerrarModalPago();
    imprimirTicketTermico(detallesPago);
}

function cancelarPago() {
    document.getElementById('detallesPago').style.display = 'none';
    metodoPagoSeleccionado = null;
    detallesPago = {};
}

// ===== LISTA DE COSTOS =====
function llenarListaCostos() {
    const lista = document.getElementById('listaCostos');
    if (!lista) return;
    
    lista.innerHTML = '';
    const copia = [...productos].sort((a, b) => (a.nombre || '').localeCompare((b.nombre || ''), 'es', { sensitivity: 'base' }));
    
    copia.forEach(p => {
        const costoItem = document.createElement('div');
        costoItem.className = 'costo-item';
        costoItem.innerHTML = `
            <div>
                <strong>${p.nombre}</strong>
                <div style="font-size: 12px; color: var(--text-secondary);">${p.descripcion}</div>
            </div>
            <div style="text-align: right;">
                <div>$${(p.costo / (p.unidadesPorCaja || 1)).toFixed(2)}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">Bs ${p.precioUnitarioBolivar.toFixed(2)}</div>
            </div>
        `;
        lista.appendChild(costoItem);
    });
}

function filtrarListaCostos() {
    const termino = document.getElementById('buscarCostos').value.trim().toLowerCase();
    const lista = document.getElementById('listaCostos');
    if (!lista) return;
    
    lista.innerHTML = '';
    const copia = [...productos].sort((a, b) => (a.nombre || '').localeCompare((b.nombre || ''), 'es', { sensitivity: 'base' }));
    const filtrados = termino ? copia.filter(p => 
        (p.nombre || '').toLowerCase().includes(termino) || 
        (p.descripcion || '').toLowerCase().includes(termino)
    ) : copia;
    
    filtrados.forEach(p => {
        const costoItem = document.createElement('div');
        costoItem.className = 'costo-item';
        costoItem.innerHTML = `
            <div>
                <strong>${p.nombre}</strong>
                <div style="font-size: 12px; color: var(--text-secondary);">${p.descripcion}</div>
            </div>
            <div style="text-align: right;">
                <div>$${(p.costo / (p.unidadesPorCaja || 1)).toFixed(2)}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">Bs ${p.precioUnitarioBolivar.toFixed(2)}</div>
            </div>
        `;
        lista.appendChild(costoItem);
    });
}

// ===== CONFIGURACIÓN =====
function guardarNombreEstablecimiento() {
    nombreEstablecimiento = document.getElementById('nombreEstablecimiento').value.trim();
    if (!nombreEstablecimiento) { 
        showToast("Ingrese un nombre válido", 'error'); 
        return; 
    }
    localStorage.setItem('nombreEstablecimiento', nombreEstablecimiento);
    actualizarEstadisticas();
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

    // Recalcular precios en bolívares
    productos.forEach(producto => {
        producto.precioUnitarioBolivar = producto.precioUnitarioDolar * nuevaTasa;
        producto.precioMayorBolivar = producto.precioMayorDolar * nuevaTasa;
    });

    localStorage.setItem('productos', JSON.stringify(productos));
    actualizarEstadisticas();

    showToast(`Tasa BCV actualizada a: ${nuevaTasa}`, 'success');
}

// ===== REPORTES DIARIOS MEJORADOS =====
function mostrarModalReporte() {
    document.getElementById('modalReporte').style.display = 'block';
}

function cerrarModalReporte() {
    document.getElementById('modalReporte').style.display = 'none';
    document.getElementById('selectorFecha').style.display = 'none';
}

function mostrarSelectorFecha() {
    document.getElementById('selectorFecha').style.display = 'block';
}

function generarReporteDiario(tipo) {
    let fechaReporte;
    
    if (tipo === 'hoy') {
        fechaReporte = new Date().toLocaleDateString();
    } else {
        cerrarModalReporte();
        return;
    }
    
    generarReportePorFechaEspecifica(fechaReporte);
    cerrarModalReporte();
}

function generarReportePorFecha() {
    const fechaInput = document.getElementById('fechaReporte').value;
    if (!fechaInput) {
        showToast("Seleccione una fecha", 'error');
        return;
    }
    
    const fecha = new Date(fechaInput);
    const fechaFormateada = fecha.toLocaleDateString();
    
    generarReportePorFechaEspecifica(fechaFormateada);
    cerrarModalReporte();
}

function generarReportePorFechaEspecifica(fechaReporte) {
    // Verificar si hay ventas
    if (!ventasDiarias || ventasDiarias.length === 0) { 
        showToast("No hay ventas registradas para generar reporte", 'warning'); 
        return; 
    }

    // Filtrar ventas por fecha
    const ventasFiltradas = ventasDiarias.filter(v => v.fecha === fechaReporte);
    
    if (ventasFiltradas.length === 0) {
        showToast(`No hay ventas registradas para la fecha ${fechaReporte}`, 'warning');
        return;
    }

    let totalVentasBs = 0;
    let totalVentasDolares = 0;
    
    // Crear filas para la tabla
    const filas = ventasFiltradas.map(v => {
        if (!v) return null;
        
        const totalBs = v.totalBolivar || 0;
        const totalDolar = tasaBCVGuardada > 0 ? (totalBs / tasaBCVGuardada) : 0;
        
        totalVentasBs += totalBs;
        totalVentasDolares += totalDolar;

        return [
            v.fecha || 'Sin fecha',
            v.hora || 'Sin hora',
            v.producto || 'Producto desconocido',
            `${v.cantidad || 0} ${v.unidad || 'unidad'}`,
            `Bs ${totalBs.toFixed(2)}`,
            `$ ${totalDolar.toFixed(2)}`,
            v.metodoPago || 'No especificado'
        ];
    }).filter(fila => fila !== null);

    if (filas.length === 0) {
        showToast("No hay datos de ventas válidos para generar el reporte", 'error');
        return;
    }

    // Calcular distribución 50-30-20
    const llaveMaestra = redondear2Decimales(totalVentasDolares / 100);
    const reinvertir = redondear2Decimales(llaveMaestra * 50);
    const gastosFijos = redondear2Decimales(llaveMaestra * 30);
    const sueldo = redondear2Decimales(llaveMaestra * 20);

    // Crear PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Encabezado
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(nombreEstablecimiento || 'Reporte Diario - Calculadora Mágica', 20, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha del reporte: ${fechaReporte}`, 20, 35);
    doc.text(`Tasa BCV: ${tasaBCVGuardada.toFixed(2)}`, 20, 42);
    doc.text(`Total de ventas: ${ventasFiltradas.length}`, 20, 49);

    // Tabla de ventas
    doc.autoTable({
        startY: 55,
        head: [
            ['Fecha', 'Hora', 'Producto', 'Cantidad', 'Total (Bs)', 'Total ($)', 'Método Pago']
        ],
        body: filas,
        styles: { 
            fontSize: 8,
            cellPadding: 3
        },
        headStyles: {
            fillColor: [66, 133, 244],
            textColor: 255,
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        margin: { top: 55 }
    });

    // Obtener posición final de la tabla
    const finalY = doc.lastAutoTable.finalY + 15;

    // Resumen financiero
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMEN FINANCIERO', 20, finalY);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total ingresos en Bolívares: Bs ${totalVentasBs.toFixed(2)}`, 20, finalY + 12);
    doc.text(`Total ingresos en Dólares: $ ${totalVentasDolares.toFixed(2)}`, 20, finalY + 22);
    
    // Distribución recomendada
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('DISTRIBUCIÓN RECOMENDADA (50-30-20)', 20, finalY + 40);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 100, 0);
    doc.text(`• 50% Para reinvertir en inventario: $ ${reinvertir.toFixed(2)}`, 20, finalY + 55);
    doc.setTextColor(200, 100, 0);
    doc.text(`• 30% Para gastos fijos y operativos: $ ${gastosFijos.toFixed(2)}`, 20, finalY + 67);
    doc.setTextColor(0, 0, 150);
    doc.text(`• 20% Para sueldo personal: $ ${sueldo.toFixed(2)}`, 20, finalY + 79);
    
    // Verificación
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text(`Verificación: ${reinvertir.toFixed(2)} + ${gastosFijos.toFixed(2)} + ${sueldo.toFixed(2)} = ${(reinvertir + gastosFijos + sueldo).toFixed(2)}`, 20, finalY + 95);

    // Pie de página
    const pageHeight = doc.internal.pageSize.height;
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text('Reporte generado por Calculadora Mágica - Sistema de Gestión Comercial', 20, pageHeight - 10);

    // Guardar PDF
    const nombreArchivo = `reporte_${fechaReporte.replace(/\//g, '-')}.pdf`;
    doc.save(nombreArchivo);
    
    showToast(`Reporte generado exitosamente - ${ventasFiltradas.length} ventas`, 'success');
}

// ===== FUNCIONES DE CATEGORÍAS =====
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

function generarPDFCostos() {
    if (!productos.length) { 
        showToast("No hay productos para generar PDF de costos", 'warning'); 
        return; 
    }

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

// ===== IMPRESIÓN DE TICKET =====
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

// ===== RESPALDO Y RESTAURACIÓN =====
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
                actualizarEstadisticas();
                
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

// ===== SISTEMA DE SEGURIDAD =====
function toggleCopyrightNotice() {
    const notice = document.getElementById('copyrightNotice');
    if (!notice) return;
    notice.style.display = notice.style.display === 'block' ? 'none' : 'block';
}

// Protección contra F12 y herramientas de desarrollo
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
})();

// Sistema de inactividad
const TIEMPO_INACTIVIDAD = 4 * 60 * 1000;
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
            console.log('Sesión expirada al cargar. Redirigiendo...');
            sessionStorage.removeItem('calculadora_magica_session');
            localStorage.removeItem('ultimaActividad');
            window.location.href = URL_REDIRECCION;
            return;
        }
    }
    
    reiniciarTemporizador();
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

// Cerrar modales al hacer clic fuera
window.onclick = function(event) {
    const modal = document.getElementById('modalPago');
    if (event.target == modal) cerrarModalPago();
    
    const modalCategorias = document.getElementById('modalCategorias');
    if (event.target == modalCategorias) cerrarModalCategorias();
    
    const modalEtiquetas = document.getElementById('modalEtiquetas');
    if (event.target == modalEtiquetas) cerrarModalEtiquetas();
    
    const modalReporte = document.getElementById('modalReporte');
    if (event.target == modalReporte) cerrarModalReporte();
};

// Función de exportación
function exportarProductos() {
    if (!productos.length) {
        showToast("No hay productos para exportar", 'warning');
        return;
    }
    
    const dataStr = JSON.stringify(productos, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(dataBlob);
    downloadLink.download = `productos_${new Date().toISOString().slice(0, 10)}.json`;
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    showToast('Productos exportados exitosamente', 'success');
}
