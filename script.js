// ===== VARIABLES GLOBALES =====
let productos = JSON.parse(localStorage.getItem('productos')) || [];
let nombreEstablecimiento = localStorage.getItem('nombreEstablecimiento') || '';
let tasaBCVGuardada = parseFloat(localStorage.getItem('tasaBCV')) || 0;
let ventasDiarias = JSON.parse(localStorage.getItem('ventasDiarias')) || [];
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
let metodoPagoSeleccionado = null;
let detallesPago = {}; // guardará info temporal al confirmar el pago

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('Calculadora iniciada correctamente');
    cargarDatosIniciales();
    actualizarLista();
    actualizarCarrito();
    configurarEventos();
});

// ===== UTILIDADES / TOASTS =====
function showToast(message, type = 'success', duration = 3500) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'success' : type === 'error' ? 'error' : 'warning'}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        setTimeout(() => container.removeChild(toast), 300);
    }, duration);
}

// ===== CONFIGURACIÓN DE EVENTOS =====
function configurarEventos() {
    // Búsqueda enter
    document.getElementById('buscar').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') buscarProducto();
    });

    // Scanner enter
    document.getElementById('codigoBarrasInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') agregarPorCodigoBarras();
    });

    // Sugerencias (input handler ya definido más abajo)
}

// ===== BUSCADOR RÁPIDO (input del carrito con sugerencias) =====
document.getElementById('codigoBarrasInput').addEventListener('input', function() {
    const termino = this.value.trim().toLowerCase();
    const sugerenciasDiv = document.getElementById('sugerencias');
    sugerenciasDiv.innerHTML = '';

    if (termino.length < 2) return;

    const coincidencias = productos.filter(p =>
        p.nombre.toLowerCase().includes(termino) ||
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(termino))
    );

    coincidencias.slice(0, 8).forEach(prod => {
        const opcion = document.createElement('div');
        opcion.textContent = `${prod.nombre} (${prod.descripcion})`;
        opcion.onclick = function() {
            document.getElementById('codigoBarrasInput').value = prod.codigoBarras || prod.nombre;
            agregarPorCodigoBarras();
            sugerenciasDiv.innerHTML = '';
            document.getElementById('codigoBarrasInput').focus();
        };
        sugerenciasDiv.appendChild(opcion);
    });
});

// ===== FUNCIONES BÁSICAS =====
function cargarDatosIniciales() {
    document.getElementById('nombreEstablecimiento').value = nombreEstablecimiento;
    document.getElementById('tasaBCV').value = tasaBCVGuardada || '';
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
    const precioUnitarioDolar = precioDolar / unidadesPorCaja;
    const precioUnitarioBolivar = precioBolivares / unidadesPorCaja;

    document.getElementById('precioUnitario').innerHTML =
        `<strong>Precio unitario:</strong> $${precioUnitarioDolar.toFixed(2)} / Bs${precioUnitarioBolivar.toFixed(2)}`;
}

// ===== GUARDAR / EDITAR PRODUCTOS =====
function guardarProducto() {
    const nombre = document.getElementById('producto').value.trim();
    const codigoBarras = document.getElementById('codigoBarras').value.trim();
    const descripcion = document.getElementById('descripcion').value;
    const costo = parseFloat(document.getElementById('costo').value);
    const ganancia = parseFloat(document.getElementById('ganancia').value);
    const unidadesPorCaja = parseFloat(document.getElementById('unidadesPorCaja').value);
    const unidadesExistentes = parseFloat(document.getElementById('unidadesExistentes').value) || 0;
    const tasaBCV = parseFloat(document.getElementById('tasaBCV').value) || tasaBCVGuardada;

    if (!nombre || !descripcion) { showToast("Complete el nombre y descripción del producto", 'error'); return; }
    if (!tasaBCV || tasaBCV <= 0) { showToast("Ingrese una tasa BCV válida", 'error'); return; }
    if (!costo || !ganancia || !unidadesPorCaja) { showToast("Complete todos los campos requeridos", 'error'); return; }

    const productoExistente = productos.findIndex(p => p.nombre.toLowerCase() === nombre.toLowerCase());
    if (productoExistente !== -1) {
        if (!confirm(`"${nombre}" ya existe. ¿Deseas actualizarlo?`)) return;
        productos.splice(productoExistente, 1);
    }

    const gananciaDecimal = ganancia / 100;
    const precioDolar = costo / (1 - gananciaDecimal);
    const precioBolivares = precioDolar * tasaBCV;

    const producto = {
        nombre,
        codigoBarras,
        descripcion,
        costo, // costo en $ (por caja)
        ganancia: gananciaDecimal,
        unidadesPorCaja,
        unidadesExistentes,
        precioMayorDolar: precioDolar,
        precioMayorBolivar: precioBolivares,
        precioUnitarioDolar: precioDolar / unidadesPorCaja,
        precioUnitarioBolivar: precioBolivares / unidadesPorCaja,
        fechaActualizacion: new Date().toISOString()
    };

    productos.push(producto);
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

    showToast("✓ Producto guardado exitosamente", 'success');
}

// ===== CARRITO DE VENTAS =====
function agregarPorCodigoBarras() {
    const codigo = document.getElementById('codigoBarrasInput').value.trim();
    if (!codigo) { showToast("Ingrese o escanee un código de barras", 'warning'); return; }

    // Buscar por código exacto primero
    let productoEncontrado = productos.find(p =>
        p.codigoBarras && p.codigoBarras.toLowerCase() === codigo.toLowerCase()
    );

    // Buscar por nombre si no encontrado por código
    if (!productoEncontrado) {
        productoEncontrado = productos.find(p =>
            p.nombre.toLowerCase().includes(codigo.toLowerCase())
        );
        if (!productoEncontrado) {
            showToast("Producto no encontrado", 'error');
            return;
        }
    }

    // Verificar si ya está en el carrito
    const enCarrito = carrito.findIndex(item => item.nombre === productoEncontrado.nombre && item.unidad === 'unidad');

    if (enCarrito !== -1) {
        // Actualizar cantidad (unidad)
        carrito[enCarrito].cantidad += 1;
        carrito[enCarrito].subtotal = carrito[enCarrito].cantidad * carrito[enCarrito].precioUnitarioBolivar;
        carrito[enCarrito].subtotalDolar = carrito[enCarrito].cantidad * carrito[enCarrito].precioUnitarioDolar;
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

    document.getElementById('codigoBarrasInput').value = '';
    document.getElementById('codigoBarrasInput').focus();
    document.getElementById('scannerStatus').textContent = 'Producto agregado. Esperando nuevo escaneo...';

    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
}

function actualizarCarrito() {
    const carritoBody = document.getElementById('carritoBody');
    const totalCarritoBs = document.getElementById('totalCarritoBs');
    const totalCarritoDolares = document.getElementById('totalCarritoDolares');

    carritoBody.innerHTML = '';

    if (carrito.length === 0) {
        carritoBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">El carrito está vacío</td></tr>';
        totalCarritoBs.textContent = 'Total: Bs 0,00';
        totalCarritoDolares.textContent = 'Total: $ 0,00';
        return;
    }

    let totalBs = 0;
    let totalDolares = 0;

    carrito.forEach((item, index) => {
        totalBs += item.subtotal;
        totalDolares += item.subtotalDolar;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.nombre} (${item.descripcion})</td>
            <td>Bs ${item.precioUnitarioBolivar.toFixed(2)}</td>
            <td>
                <button onclick="actualizarCantidadCarrito(${index}, -1)">-</button>
                ${item.cantidad}
                <button onclick="actualizarCantidadCarrito(${index}, 1)">+</button>
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

    totalCarritoBs.textContent = `Total: Bs ${totalBs.toFixed(2)}`;
    totalCarritoDolares.textContent = `Total: $ ${totalDolares.toFixed(2)}`;
}

function actualizarCantidadCarrito(index, cambio) {
    const item = carrito[index];
    item.cantidad += cambio;

    if (item.cantidad < 1) {
        eliminarDelCarrito(index);
        return;
    }

    // Recalcular subtotal según unidad
    calcularSubtotalSegunUnidad(item);

    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
}

function calcularSubtotalSegunUnidad(item) {
    const producto = productos[item.indexProducto];
    if (!producto) return;

    if (item.unidad === 'gramo') {
        // cantidad está en gramos, se multiplica por 0.001 para kilos
        item.subtotal = item.cantidad * item.precioUnitarioBolivar * 0.001;
        item.subtotalDolar = item.cantidad * item.precioUnitarioDolar * 0.001;
    } else {
        // unidad
        item.subtotal = item.cantidad * item.precioUnitarioBolivar;
        item.subtotalDolar = item.cantidad * item.precioUnitarioDolar;
    }
}

function cambiarUnidadCarrito(index, nuevaUnidad) {
    carrito[index].unidad = nuevaUnidad;
    // Cuando se cambia a gramo, se espera que cantidad se interprete en gramos.
    // Mantener la cantidad tal cual; el usuario puede editar cantidad con +/- o reingresarla en otra interfaz más adelante.
    calcularSubtotalSegunUnidad(carrito[index]);
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
    tbody.innerHTML = '';

    productos.forEach((producto, index) => {
        const inventarioBajo = producto.unidadesExistentes <= 5;
        const row = document.createElement('tr');
        row.innerHTML = `
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
        tbody.appendChild(row);
    });
}

function buscarProducto() {
    const termino = document.getElementById('buscar').value.trim().toLowerCase();
    if (!termino) { actualizarLista(); return; }

    const resultados = productos.filter(p =>
        p.nombre.toLowerCase().includes(termino) ||
        p.descripcion.toLowerCase().includes(termino) ||
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(termino))
    );

    const tbody = document.querySelector('#listaProductos tbody');
    tbody.innerHTML = '';

    resultados.forEach((producto, index) => {
        const inventarioBajo = producto.unidadesExistentes <= 5;
        const row = document.createElement('tr');
        row.innerHTML = `
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
        tbody.appendChild(row);
    });
}

function ajustarInventario(index, operacion) {
    const producto = productos[index];
    const cantidad = parseInt(prompt(`Ingrese la cantidad a ${operacion === 'sumar' ? 'sumar' : 'restar'}:`, "1")) || 0;

    if (cantidad <= 0) { showToast("Ingrese una cantidad válida", 'error'); return; }
    if (operacion === 'restar' && producto.unidadesExistentes < cantidad) { showToast("No hay suficientes unidades en inventario", 'error'); return; }

    producto.unidadesExistentes = operacion === 'sumar' ? producto.unidadesExistentes + cantidad : producto.unidadesExistentes - cantidad;

    localStorage.setItem('productos', JSON.stringify(productos));
    actualizarLista();
    showToast(`Inventario de ${producto.nombre} actualizado: ${producto.unidadesExistentes} unidades`, 'success');
}

function editarProducto(index) {
    const producto = productos[index];
    document.getElementById('producto').value = producto.nombre;
    document.getElementById('codigoBarras').value = producto.codigoBarras || '';
    document.getElementById('descripcion').value = producto.descripcion;
    document.getElementById('costo').value = producto.costo;
    document.getElementById('ganancia').value = producto.ganancia * 100;
    document.getElementById('unidadesPorCaja').value = producto.unidadesPorCaja;
    document.getElementById('unidadesExistentes').value = producto.unidadesExistentes;

    const precioUnitarioDolar = producto.precioUnitarioDolar;
    const precioUnitarioBolivar = producto.precioUnitarioBolivar;
    document.getElementById('precioUnitario').innerHTML =
        `<strong>Precio unitario:</strong> $${precioUnitarioDolar.toFixed(2)} / Bs${precioUnitarioBolivar.toFixed(2)}`;

    // Eliminar producto actual para reemplazarlo al guardar
    productos.splice(index, 1);
    localStorage.setItem('productos', JSON.stringify(productos));
    actualizarLista();

    showToast(`Editando producto: ${producto.nombre}`, 'warning');
}

function eliminarProducto(index) {
    const producto = productos[index];
    if (confirm(`¿Estás seguro de eliminar "${producto.nombre}"?`)) {
        productos.splice(index, 1);
        localStorage.setItem('productos', JSON.stringify(productos));
        actualizarLista();
        showToast(`Producto eliminado: ${producto.nombre}`, 'success');
    }
}

// Nota: la función limpiarLista fue eliminada por petición del usuario.

// ===== MÉTODOS DE PAGO Y VENTAS =====
function finalizarVenta() {
    if (carrito.length === 0) { showToast("El carrito está vacío", 'warning'); return; }

    const totalBs = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const totalDolares = carrito.reduce((sum, item) => sum + item.subtotalDolar, 0);

    document.getElementById('resumenTotalBs').textContent = `Total: Bs ${totalBs.toFixed(2)}`;
    document.getElementById('resumenTotalDolares').textContent = `Total: $ ${totalDolares.toFixed(2)}`;

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
        // Mostrar calculadora de cambio
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
        // Evento para calcular cambio en tiempo real
        setTimeout(() => {
            const input = document.getElementById('montoRecibido');
            input.addEventListener('input', () => {
                const recib = parseFloat(input.value) || 0;
                let cambio = 0;
                if (metodo === 'efectivo_bs') cambio = recib - totalBs;
                else {
                    // convertir totalBs a $ usando tasaBCVGuardada
                    const totalEnDolares = tasaBCVGuardada ? (totalBs / tasaBCVGuardada) : 0;
                    cambio = recib - totalEnDolares;
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
    if (!metodoPagoSeleccionado) { showToast("Seleccione un método de pago", 'error'); return; }

    const totalBs = carrito.reduce((sum, item) => sum + item.subtotal, 0);

    // Validaciones por método
    if (metodoPagoSeleccionado === 'efectivo_bs') {
        const recib = parseFloat(document.getElementById('montoRecibido').value) || 0;
        if (recib < totalBs) { showToast("Monto recibido menor al total", 'error'); return; }
        detallesPago.cambio = (recib - totalBs);
        detallesPago.montoRecibido = recib;
    } else if (metodoPagoSeleccionado === 'efectivo_dolares') {
        const recib = parseFloat(document.getElementById('montoRecibido').value) || 0;
        const totalEnDolares = tasaBCVGuardada ? (totalBs / tasaBCVGuardada) : 0;
        if (recib < totalEnDolares) { showToast("Monto recibido menor al total", 'error'); return; }
        detallesPago.cambio = (recib - totalEnDolares);
        detallesPago.montoRecibido = recib;
    } else if (metodoPagoSeleccionado === 'punto' || metodoPagoSeleccionado === 'biopago') {
        const monto = parseFloat(document.getElementById('montoPago') ? document.getElementById('montoPago').value : 0) || 0;
        if (monto < (tasaBCVGuardada ? (totalBs / tasaBCVGuardada) : 0) && metodoPagoSeleccionado === 'punto') {
            // punto: aceptar monto >= total en $ (if total is expressed differently). For simplicity, we accept if monto >= total in $ equivalent
            // but to avoid rejecting, we only validate that monto > 0
            if (monto <= 0) { showToast("Ingrese el monto en Punto", 'error'); return; }
        }
        detallesPago.monto = monto;
    } else if (metodoPagoSeleccionado === 'pago_movil') {
        const monto = parseFloat(document.getElementById('montoPagoMovil').value) || 0;
        const ref = document.getElementById('refPagoMovil').value.trim();
        const banco = document.getElementById('bancoPagoMovil').value.trim();
        if (!monto || !ref || !banco) { showToast("Complete todos los datos de Pago Móvil", 'error'); return; }
        detallesPago = {...detallesPago, monto, ref, banco };
    }

    // Registrar ventas y restar inventario
    carrito.forEach(item => {
        const producto = productos[item.indexProducto];
        if (producto) {
            // Cantidad vendida en unidades interpretadas
            let cantidadVendidaComoUnidades = 0; // en "unidades" base
            // Para 'gramo', item.cantidad está en gramos -> convertir a kilos fraccional
            if (item.unidad === 'gramo') {
                // Suponemos precioUnitario es por unidad (si guardaste como precio por kilo, asegúrate de unidadesPorCaja correcto)
                // Cantidad de kilos vendida = gramos / 1000
                cantidadVendidaComoUnidades = (item.cantidad / 1000) * producto.unidadesPorCaja;
            } else {
                // unidad: cantidad de unidades
                cantidadVendidaComoUnidades = item.cantidad;
            }

            // Ajuste en inventario: se usa unidadesExistentes tal como tu manejas
            // Si tus unidadesExistentes representan kilos, asegúrate de usar esa lógica
            if (item.unidad === 'gramo') {
                // restar en base a la unidad considerada en inventario (ejemplo: si inventario en kilos: restar gramos/1000)
                producto.unidadesExistentes = producto.unidadesExistentes - (item.cantidad / 1000);
            } else {
                producto.unidadesExistentes = producto.unidadesExistentes - item.cantidad;
            }

            // Normalizo a un registro de venta (para PDF y reporte)
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

    showToast(`Venta completada por Bs ${totalBs.toFixed(2)}`, 'success');

    // Preparar detalles para el ticket
    detallesPago.totalBs = totalBs;
    detallesPago.items = JSON.parse(JSON.stringify(carrito));
    detallesPago.fecha = new Date().toLocaleString();

    // Limpiar carrito
    carrito = [];
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
    cerrarModalPago();

    // Imprimir ticket térmico automáticamente
    imprimirTicketTermico(detallesPago);

    // Guardar ventas (ya guardado)
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
    notice.style.display = notice.style.display === 'block' ? 'none' : 'block';
}

/* ===== LISTA DE COSTOS (ORDEN ALFABÉTICO + buscador condicional) ===== */
function mostrarListaCostos() {
    const container = document.getElementById('listaCostosContainer');
    const buscarCostosInput = document.getElementById('buscarCostos');
    if (container.style.display === 'none' || container.style.display === '') {
        // Mostrar y activar buscador
        container.style.display = 'block';
        buscarCostosInput.style.display = 'inline-block';
        // Llenar lista
        llenarListaCostos();
    } else {
        container.style.display = 'none';
        buscarCostosInput.style.display = 'none';
    }
}

function llenarListaCostos() {
    const lista = document.getElementById('listaCostos');
    lista.innerHTML = '';
    // Orden alfabético por nombre
    const copia = [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    copia.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${p.nombre} (${p.descripcion})</span><span>$${(p.costo / (p.unidadesPorCaja || 1)).toFixed(2)} / Bs${( (p.costo / (p.unidadesPorCaja || 1)) * (tasaBCVGuardada || p.precioUnitarioBolivar) ).toFixed(2)}</span>`;
        lista.appendChild(li);
    });
}

function filtrarListaCostos() {
    const termino = document.getElementById('buscarCostos').value.trim().toLowerCase();
    const lista = document.getElementById('listaCostos');
    lista.innerHTML = '';
    const copia = [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    const filtrados = termino ? copia.filter(p => p.nombre.toLowerCase().includes(termino) || p.descripcion.toLowerCase().includes(termino)) : copia;
    filtrados.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${p.nombre} (${p.descripcion})</span><span>$${(p.costo / (p.unidadesPorCaja || 1)).toFixed(2)} / Bs${( (p.precioUnitarioBolivar).toFixed(2) )}</span>`;
        lista.appendChild(li);
    });
}

// ===== GENERAR PDF COSTOS =====
function generarPDFCostos() {
    // Genera un PDF con la lista de costos ordenada alfabéticamente
    if (!productos.length) { showToast("No hay productos para generar PDF de costos", 'warning'); return; }

    const copia = [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
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

    // Filtrar por fecha actual (opcional: si guardas ventas de días previos)
    const hoy = new Date().toLocaleDateString();
    const ventasHoy = ventasDiarias.filter(v => v.fecha === hoy);
    const ventasAUsar = ventasHoy.length ? ventasHoy : ventasDiarias; // si no hay ventas con fecha exacta, usar todas

    // Calcular totales y ganancia aproximada
    let totalVentasBs = 0;
    let totalCostosBs = 0;
    const filas = ventasAUsar.map(v => {
        totalVentasBs += v.totalBolivar || 0;
        const producto = productos[v.indexProducto] || productos.find(p => p.nombre === v.producto);
        let costoDolar = 0;

        if (producto) {
            if (v.unidad === 'gramo') {
                // v.cantidad es en gramos
                costoDolar = (v.cantidad / 1000) * (producto.costo / (producto.unidadesPorCaja || 1));
            } else if (v.unidad === 'caja') {
                costoDolar = v.cantidad * (producto.costo || 0);
            } else {
                // unidad
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

    // Generar PDF con jsPDF + autotable
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

// ===== PDF LISTA DE PRODUCTOS (orden alfabético, $ y Bs con ganancia) =====
function generarRespaldoCompleto() {
    if (!productos.length) { showToast("No hay productos para generar PDF", 'warning'); return; }

    const copia = [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    const rows = copia.map(p => [
        p.nombre,
        p.descripcion,
        `$${p.precioUnitarioDolar.toFixed(2)}`,
        `Bs ${p.precioUnitarioBolivar.toFixed(2)}`
    ]);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(nombreEstablecimiento || 'Lista de Productos', 14, 18);

    doc.autoTable({
        head: [['Producto', 'Descripción', 'Precio ($)', 'Precio (Bs)']],
        body: rows,
        startY: 28,
        styles: { fontSize: 9 }
    });

    doc.save(`lista_productos_${(new Date()).toISOString().slice(0,10)}.pdf`);
}

// ===== Imprimir ticket térmico (abre una ventana con formato estrecho y llama print) =====
function imprimirTicketTermico(detalles) {
    try {
        const printWindow = window.open('', '_blank', 'toolbar=0,location=0,menubar=0');
        if (!printWindow) {
            showToast('No se pudo abrir la ventana de impresión. Verifica bloqueadores de popups.', 'error');
            return;
        }

        // Construir HTML del ticket
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
};

