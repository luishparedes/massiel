// ===== SISTEMA DE ACTUALIZACIÓN AUTOMÁTICA ===== //
const VERSION_ACTUAL = "1.4.0";
const TIEMPO_INACTIVIDAD = 10 * 60 * 1000;
const URL_REDIRECCION = "http://portal.calculadoramagica.lat/";

let temporizadorInactividad, productos = [], nombreEstablecimiento = '', tasaBCVGuardada = 0, ventasDiarias = [], carrito = [], metodoPagoSeleccionado = null, detallesPago = {};

// Datos persistentes
function inicializarDatos() {
    productos = JSON.parse(localStorage.getItem('productos')) || [];
    nombreEstablecimiento = localStorage.getItem('nombreEstablecimiento') || '';
    tasaBCVGuardada = parseFloat(localStorage.getItem('tasaBCV')) || 0;
    ventasDiarias = JSON.parse(localStorage.getItem('ventasDiarias')) || [];
    carrito = JSON.parse(localStorage.getItem('carrito')) || [];
}

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', function() {
    inicializarDatos();
    reiniciarTemporizador();
    cargarDatosIniciales();
    actualizarLista();
    actualizarCarrito();
    verificarActualizacion();
    configurarScanner();
    configurarBusquedaProductos();
});

// ===== SISTEMA DE REDIRECCIÓN POR INACTIVIDAD ===== //
function reiniciarTemporizador() {
    clearTimeout(temporizadorInactividad);
    temporizadorInactividad = setTimeout(() => {
        window.location.href = URL_REDIRECCION;
    }, TIEMPO_INACTIVIDAD);
}

['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evento => {
    document.addEventListener(evento, reiniciarTemporizador);
});

// Verificar si hay una nueva versión
function verificarActualizacion() {
    const versionGuardada = localStorage.getItem('appVersion');
    if (versionGuardada !== VERSION_ACTUAL) {
        localStorage.setItem('appVersion', VERSION_ACTUAL);
        if (versionGuardada !== null) {
            mostrarToast("¡Nueva actualización disponible! La app se recargará automáticamente.", "info");
            setTimeout(() => window.location.reload(true), 3000);
        }
    }
}

// ================= MEJORAS EN EL GUARDADO LOCAL =================
function guardarEnLocalStorage(clave, datos) {
    try {
        localStorage.setItem(clave, JSON.stringify(datos));
        return true;
    } catch (e) {
        console.error("Error al guardar en localStorage:", e);
        mostrarToast("Error al guardar datos. Espacio insuficiente.", "error");
        return false;
    }
}

// ================= MEJORAS EN LA BÚSQUEDA DE PRODUCTOS =================
function configurarBusquedaProductos() {
    const inputBusqueda = document.getElementById('codigoBarrasInput');
    const sugerenciasContainer = document.createElement('div');
    sugerenciasContainer.id = 'sugerenciasProductos';
    sugerenciasContainer.style.cssText = 'position: absolute; background: white; border: 1px solid #ccc; max-height: 200px; overflow-y: auto; z-index: 1000; width: 100%; display: none;';
    inputBusqueda.parentNode.appendChild(sugerenciasContainer);
    
    inputBusqueda.addEventListener('input', function() {
        const valor = this.value.trim();
        if (valor.length > 2) {
            mostrarSugerencias(valor, inputBusqueda, sugerenciasContainer);
        } else {
            sugerenciasContainer.style.display = 'none';
        }
    });
    
    document.addEventListener('click', function(e) {
        if (e.target !== inputBusqueda && !sugerenciasContainer.contains(e.target)) {
            sugerenciasContainer.style.display = 'none';
        }
    });
}

function mostrarSugerencias(termino, input, container) {
    const terminoLower = termino.toLowerCase();
    const sugerencias = productos.filter(p => 
        p.nombre.toLowerCase().includes(terminoLower) || 
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(terminoLower)) ||
        p.descripcion.toLowerCase().includes(terminoLower)
    );
    
    if (sugerencias.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.innerHTML = '';
    sugerencias.forEach(producto => {
        const div = document.createElement('div');
        div.textContent = `${producto.nombre} (${producto.descripcion})`;
        div.style.cssText = 'padding: 8px; cursor: pointer; border-bottom: 1px solid #eee;';
        div.addEventListener('click', function() {
            input.value = producto.codigoBarras || producto.nombre;
            container.style.display = 'none';
            agregarPorCodigoBarras();
        });
        container.appendChild(div);
    });
    
    const rect = input.getBoundingClientRect();
    container.style.width = rect.width + 'px';
    container.style.top = (rect.bottom + window.scrollY) + 'px';
    container.style.left = rect.left + 'px';
    container.style.display = 'block';
}

// ================= MEJORAS EN EL CARRITO =================
function configurarScanner() {
    const inputScanner = document.getElementById('codigoBarrasInput');
    inputScanner.focus();
    
    inputScanner.addEventListener('input', function(e) {
        document.getElementById('scannerStatus').textContent = 'Código detectado: ' + this.value;
        if (this.value.length >= 8) {
            setTimeout(() => agregarPorCodigoBarras(), 300);
        }
    });
    
    inputScanner.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') agregarPorCodigoBarras();
    });
}

function agregarPorCodigoBarras() {
    const codigo = document.getElementById('codigoBarrasInput').value.trim();
    if (!codigo) {
        mostrarToast("?? Ingrese o escanee un código de barras", "error");
        return;
    }
    
    let productoEncontrado = productos.find(p => p.codigoBarras && p.codigoBarras.toLowerCase() === codigo.toLowerCase());
    if (!productoEncontrado) {
        productoEncontrado = productos.find(p => 
            p.nombre.toLowerCase().includes(codigo.toLowerCase()) || 
            p.descripcion.toLowerCase().includes(codigo.toLowerCase())
        );
        
        if (!productoEncontrado) {
            mostrarToast("?? Producto no encontrado. ¿Desea agregarlo manualmente?", "warning");
            if (confirm("Producto no encontrado. ¿Desea agregarlo manualmente?")) {
                document.getElementById('codigoBarras').value = codigo;
                document.getElementById('producto').focus();
                window.scrollTo(0, 0);
            }
            return;
        }
    }
    
    const enCarrito = carrito.find(item => item.nombre === productoEncontrado.nombre);
    if (enCarrito) {
        enCarrito.cantidad += 1;
        enCarrito.subtotal = enCarrito.cantidad * enCarrito.precioUnitarioBolivar;
        mostrarToast(`+1 ${productoEncontrado.nombre} en carrito`);
    } else {
        carrito.push({
            nombre: productoEncontrado.nombre,
            descripcion: productoEncontrado.descripcion,
            precioUnitarioBolivar: productoEncontrado.precioUnitarioBolivar,
            precioUnitarioDolar: productoEncontrado.precioUnitarioDolar,
            cantidad: 1,
            subtotal: productoEncontrado.precioUnitarioBolivar,
            subtotalDolar: productoEncontrado.precioUnitarioDolar,
            indexProducto: productos.findIndex(p => p.nombre === productoEncontrado.nombre),
            gananciaPorcentaje: productoEncontrado.ganancia * 100
        });
        mostrarToast(`✓ ${productoEncontrado.nombre} agregado al carrito`);
    }
    
    document.getElementById('codigoBarrasInput').value = '';
    document.getElementById('codigoBarrasInput').focus();
    document.getElementById('scannerStatus').textContent = 'Producto agregado. Esperando nuevo escaneo...';
    
    guardarCarrito();
    actualizarCarrito();
}

function eliminarDelCarrito(index) {
    const producto = carrito[index].nombre;
    carrito.splice(index, 1);
    guardarCarrito();
    actualizarCarrito();
    mostrarToast(`✗ ${producto} eliminado del carrito`);
}

function actualizarCantidadCarrito(index, cambio) {
    const item = carrito[index];
    item.cantidad += cambio;
    if (item.cantidad < 1) {
        eliminarDelCarrito(index);
        return;
    }
    item.subtotal = item.cantidad * item.precioUnitarioBolivar;
    item.subtotalDolar = item.cantidad * item.precioUnitarioDolar;
    guardarCarrito();
    actualizarCarrito();
}

function actualizarCarrito() {
    const carritoBody = document.getElementById('carritoBody');
    const totalCarritoBs = document.getElementById('totalCarritoBs');
    const totalCarritoDolares = document.getElementById('totalCarritoDolares');
    
    carritoBody.innerHTML = '';
    if (carrito.length === 0) {
        carritoBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">El carrito está vacío</td></tr>';
        totalCarritoBs.textContent = 'Total: Bs 0,00';
        totalCarritoDolares.textContent = 'Total: $ 0,00';
        return;
    }
    
    let totalBs = 0, totalDolares = 0;
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

function guardarCarrito() {
    guardarEnLocalStorage('carrito', carrito);
}

// ================= SISTEMA DE MÉTODOS DE PAGO =================
function mostrarModalPago() {
    const totalBs = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const totalDolares = carrito.reduce((sum, item) => sum + item.subtotalDolar, 0);
    
    document.getElementById('resumenTotalBs').textContent = `Total: Bs ${totalBs.toFixed(2)}`;
    document.getElementById('resumenTotalDolares').textContent = `Total: $ ${totalDolares.toFixed(2)}`;
    
    document.getElementById('modalPago').style.display = 'block';
    document.getElementById('detallesPago').style.display = 'none';
    metodoPagoSeleccionado = null;
    detallesPago = {};
}

function cerrarModalPago() {
    document.getElementById('modalPago').style.display = 'none';
}

function seleccionarMetodoPago(metodo) {
    metodoPagoSeleccionado = metodo;
    const detallesDiv = document.getElementById('camposPago');
    detallesDiv.innerHTML = '';
    
    switch(metodo) {
        case 'efectivo_bs':
            detallesDiv.innerHTML = `
                <div class="campo-pago">
                    <label>Monto recibido (Bs):</label>
                    <input type="number" id="montoRecibidoBs" placeholder="0.00" step="0.01" required>
                </div>
                <div class="campo-pago">
                    <label>Cambio a devolver (Bs):</label>
                    <input type="number" id="cambioBs" placeholder="0.00" step="0.01" readonly>
                </div>
            `;
            
            const montoRecibidoBsInput = document.getElementById('montoRecibidoBs');
            const cambioBsInput = document.getElementById('cambioBs');
            const totalBs = carrito.reduce((sum, item) => sum + item.subtotal, 0);
            
            montoRecibidoBsInput.addEventListener('input', function() {
                const montoRecibido = parseFloat(this.value) || 0;
                const cambio = montoRecibido - totalBs;
                cambioBsInput.value = cambio > 0 ? cambio.toFixed(2) : '0.00';
            });
            break;
            
        case 'efectivo_dolares':
            detallesDiv.innerHTML = `
                <div class="campo-pago">
                    <label>Monto recibido ($):</label>
                    <input type="number" id="montoRecibidoDolares" placeholder="0.00" step="0.01" required>
                </div>
                <div class="campo-pago">
                    <label>Cambio a devolver ($):</label>
                    <input type="number" id="cambioDolares" placeholder="0.00" step="0.01" readonly>
                </div>
            `;
            
            const montoRecibidoDolaresInput = document.getElementById('montoRecibidoDolares');
            const cambioDolaresInput = document.getElementById('cambioDolares');
            const totalDolares = carrito.reduce((sum, item) => sum + item.subtotalDolar, 0);
            
            montoRecibidoDolaresInput.addEventListener('input', function() {
                const montoRecibido = parseFloat(this.value) || 0;
                const cambio = montoRecibido - totalDolares;
                cambioDolaresInput.value = cambio > 0 ? cambio.toFixed(2) : '0.00';
            });
            break;
            
        case 'punto':
            detallesDiv.innerHTML = `
                <div class="campo-pago">
                    <label>Número de referencia:</label>
                    <input type="text" id="referenciaPunto" placeholder="Número de referencia" required>
                </div>
            `;
            break;
            
        case 'pago_movil':
            detallesDiv.innerHTML = `
                <div class="campo-pago">
                    <label>Número de teléfono:</label>
                    <input type="text" id="telefonoPagoMovil" placeholder="0412XXXXXXX" required>
                </div>
                <div class="campo-pago">
                    <label>Número de referencia:</label>
                    <input type="text" id="referenciaPagoMovil" placeholder="Número de referencia" required>
                </div>
            `;
            break;
            
        case 'transferencia':
            detallesDiv.innerHTML = `
                <div class="campo-pago">
                    <label>Número de referencia:</label>
                    <input type="text" id="referenciaTransferencia" placeholder="Número de referencia" required>
                </div>
                <div class="campo-pago">
                    <label>Banco:</label>
                    <input type="text" id="bancoTransferencia" placeholder="Nombre del banco" required>
                </div>
            `;
            break;
            
        case 'credito':
            detallesDiv.innerHTML = `
                <div class="campo-pago">
                    <label>Nombre del titular:</label>
                    <input type="text" id="titularCredito" placeholder="Nombre completo" required>
                </div>
                <div class="campo-pago">
                    <label>Últimos 4 dígitos:</label>
                    <input type="text" id="digitosCredito" placeholder="XXXX" maxlength="4" required>
                </div>
            `;
            break;
            
        case 'combinado':
            const totalBsCombinado = carrito.reduce((sum, item) => sum + item.subtotal, 0);
            detallesDiv.innerHTML = `
                <div class="campo-pago">
                    <label>Monto en efectivo (Bs):</label>
                    <input type="number" id="montoEfectivoCombinado" placeholder="0.00" step="0.01" required>
                </div>
                <div class="campo-pago">
                    <label>Monto transferencia (Bs):</label>
                    <input type="number" id="montoTransferenciaCombinado" placeholder="0.00" step="0.01" required>
                </div>
                <div class="campo-pago">
                    <label>Referencia transferencia:</label>
                    <input type="text" id="referenciaCombinado" placeholder="Número de referencia" required>
                </div>
                <div class="campo-pago">
                    <label>Total a pagar (Bs):</label>
                    <input type="number" id="totalCombinado" value="${totalBsCombinado.toFixed(2)}" readonly>
                </div>
                <div class="campo-pago">
                    <label>Saldo restante (Bs):</label>
                    <input type="number" id="saldoCombinado" placeholder="0.00" step="0.01" readonly>
                </div>
            `;
            
            const montoEfectivoInput = document.getElementById('montoEfectivoCombinado');
            const montoTransferenciaInput = document.getElementById('montoTransferenciaCombinado');
            const saldoInput = document.getElementById('saldoCombinado');
            
            function calcularSaldoCombinado() {
                const efectivo = parseFloat(montoEfectivoInput.value) || 0;
                const transferencia = parseFloat(montoTransferenciaInput.value) || 0;
                const totalPagado = efectivo + transferencia;
                const saldo = totalBsCombinado - totalPagado;
                saldoInput.value = saldo > 0 ? saldo.toFixed(2) : '0.00';
            }
            
            montoEfectivoInput.addEventListener('input', calcularSaldoCombinado);
            montoTransferenciaInput.addEventListener('input', calcularSaldoCombinado);
            break;
    }
    
    document.getElementById('detallesPago').style.display = 'block';
}

function cancelarPago() {
    document.getElementById('detallesPago').style.display = 'none';
    metodoPagoSeleccionado = null;
    detallesPago = {};
}

function confirmarMetodoPago() {
    if (!metodoPagoSeleccionado) {
        mostrarToast("Seleccione un método de pago", "error");
        return;
    }
    
    let camposValidos = true;
    detallesPago = { metodo: metodoPagoSeleccionado };
    
    switch(metodoPagoSeleccionado) {
        case 'efectivo_bs':
            const montoRecibidoBs = parseFloat(document.getElementById('montoRecibidoBs').value) || 0;
            const totalBs = carrito.reduce((sum, item) => sum + item.subtotal, 0);
            
            if (montoRecibidoBs < totalBs) {
                mostrarToast("El monto recibido es menor al total", "error");
                camposValidos = false;
                break;
            }
            
            detallesPago.montoRecibido = montoRecibidoBs;
            detallesPago.cambio = montoRecibidoBs - totalBs;
            break;
            
        case 'efectivo_dolares':
            const montoRecibidoDolares = parseFloat(document.getElementById('montoRecibidoDolares').value) || 0;
            const totalDolares = carrito.reduce((sum, item) => sum + item.subtotalDolar, 0);
            
            if (montoRecibidoDolares < totalDolares) {
                mostrarToast("El monto recibido es menor al total", "error");
                camposValidos = false;
                break;
            }
            
            detallesPago.montoRecibido = montoRecibidoDolares;
            detallesPago.cambio = montoRecibidoDolares - totalDolares;
            break;
            
        case 'punto':
            const referenciaPunto = document.getElementById('referenciaPunto').value.trim();
            if (!referenciaPunto) {
                mostrarToast("Ingrese el número de referencia", "error");
                camposValidos = false;
                break;
            }
            detallesPago.referencia = referenciaPunto;
            break;
            
        case 'pago_movil':
            const telefonoPagoMovil = document.getElementById('telefonoPagoMovil').value.trim();
            const referenciaPagoMovil = document.getElementById('referenciaPagoMovil').value.trim();
            
            if (!telefonoPagoMovil || !referenciaPagoMovil) {
                mostrarToast("Complete todos los campos", "error");
                camposValidos = false;
                break;
            }
            
            detallesPago.telefono = telefonoPagoMovil;
            detallesPago.referencia = referenciaPagoMovil;
            break;
            
        case 'transferencia':
            const referenciaTransferencia = document.getElementById('referenciaTransferencia').value.trim();
            const bancoTransferencia = document.getElementById('bancoTransferencia').value.trim();
            
            if (!referenciaTransferencia || !bancoTransferencia) {
                mostrarToast("Complete todos los campos", "error");
                camposValidos = false;
                break;
            }
            
            detallesPago.referencia = referenciaTransferencia;
            detallesPago.banco = bancoTransferencia;
            break;
            
        case 'credito':
            const titularCredito = document.getElementById('titularCredito').value.trim();
            const digitosCredito = document.getElementById('digitosCredito').value.trim();
            
            if (!titularCredito || !digitosCredito || digitosCredito.length !== 4) {
                mostrarToast("Complete todos los campos correctamente", "error");
                camposValidos = false;
                break;
            }
            
            detallesPago.titular = titularCredito;
            detallesPago.digitos = digitosCredito;
            break;
            
        case 'combinado':
            const montoEfectivo = parseFloat(document.getElementById('montoEfectivoCombinado').value) || 0;
            const montoTransferencia = parseFloat(document.getElementById('montoTransferenciaCombinado').value) || 0;
            const referenciaCombinado = document.getElementById('referenciaCombinado').value.trim();
            const totalBsCombinado = carrito.reduce((sum, item) => sum + item.subtotal, 0);
            
            if (!referenciaCombinado || (montoEfectivo + montoTransferencia) < totalBsCombinado) {
                mostrarToast("Complete todos los campos o verifique los montos", "error");
                camposValidos = false;
                break;
            }
            
            detallesPago.montoEfectivo = montoEfectivo;
            detallesPago.montoTransferencia = montoTransferencia;
            detallesPago.referencia = referenciaCombinado;
            break;
    }
    
    if (!camposValidos) return;
    procesarVenta();
}

function procesarVenta() {
    const totalBs = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const totalDolares = carrito.reduce((sum, item) => sum + item.subtotalDolar, 0);
    
    let gananciaTotalDolares = 0, gananciaTotalBolivares = 0;
    
    carrito.forEach(item => {
        const productoIndex = item.indexProducto;
        if (productoIndex !== -1 && productos[productoIndex]) {
            const producto = productos[productoIndex];
            
            if (producto.unidadesExistentes < item.cantidad) {
                mostrarToast(`?? No hay suficientes existencias de ${producto.nombre}`, "error");
                return;
            }
            
            producto.unidadesExistentes -= item.cantidad;
            
            const costoUnitarioDolar = producto.costo / producto.unidadesPorCaja;
            const gananciaUnitariaDolar = producto.precioUnitarioDolar - costoUnitarioDolar;
            const gananciaProductoDolar = gananciaUnitariaDolar * item.cantidad;
            const gananciaProductoBolivar = gananciaProductoDolar * tasaBCVGuardada;
            
            gananciaTotalDolares += gananciaProductoDolar;
            gananciaTotalBolivares += gananciaProductoBolivar;
            
            const hoy = new Date();
            const venta = {
                fecha: hoy.toLocaleDateString(),
                hora: hoy.toLocaleTimeString(),
                producto: producto.nombre,
                descripcion: producto.descripcion,
                cantidad: item.cantidad,
                precioUnitarioDolar: producto.precioUnitarioDolar,
                precioUnitarioBolivar: producto.precioUnitarioBolivar,
                totalDolar: item.cantidad * producto.precioUnitarioDolar,
                totalBolivar: item.subtotal,
                gananciaDolar: gananciaProductoDolar,
                gananciaBolivar: gananciaProductoBolivar,
                metodoPago: metodoPagoSeleccionado,
                detallesPago: detallesPago
            };
            
            ventasDiarias.push(venta);
        }
    });
    
    guardarEnLocalStorage('productos', productos);
    guardarEnLocalStorage('ventasDiarias', ventasDiarias);
    
    mostrarToast(`✓ Venta completada por Bs ${totalBs.toFixed(2)}. Ganancia: $${gananciaTotalDolares.toFixed(2)} / Bs ${gananciaTotalBolivares.toFixed(2)}`);
    
    carrito = [];
    metodoPagoSeleccionado = null;
    detallesPago = {};
    guardarCarrito();
    actualizarCarrito();
    actualizarLista();
    cerrarModalPago();
    
    if (confirm("¿Desea imprimir ticket de la venta?")) {
        imprimirTicketVenta();
    }
}

function finalizarVenta() {
    if (carrito.length === 0) {
        mostrarToast("?? El carrito está vacío", "error");
        return;
    }
    mostrarModalPago();
}

// ================= MEJORAS EN LA IMPRESIÓN DE TICKETS =================
function imprimirTicketVenta() {
    const fecha = new Date();
    const totalBs = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const totalDolares = carrito.reduce((sum, item) => sum + item.subtotalDolar, 0);
    
    let contenido = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Ticket de Venta</title>
            <meta charset="UTF-8">
            <style>
                body { 
                    font-family: 'Courier New', monospace; 
                    font-size: 12px; 
                    width: 70mm; 
                    margin: 0; 
                    padding: 5px; 
                    box-sizing: border-box;
                }
                .ticket { 
                    width: 100%; 
                    max-width: 70mm; 
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 5px; 
                    border-bottom: 1px dashed #000;
                    padding-bottom: 5px;
                }
                .header h3 {
                    margin: 0;
                    font-size: 14px;
                    font-weight: bold;
                }
                .item { 
                    display: flex; 
                    justify-content: space-between; 
                    margin-bottom: 3px; 
                    border-bottom: 1px dotted #ccc;
                    padding-bottom: 2px;
                }
                .item-name {
                    flex: 2;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .item-price {
                    flex: 1;
                    text-align: right;
                }
                .total { 
                    font-weight: bold; 
                    margin-top: 8px; 
                    border-top: 1px dashed #000; 
                    padding-top: 5px; 
                    text-align: center;
                }
                .fecha { 
                    font-size: 10px; 
                    text-align: center; 
                    margin-top: 10px; 
                }
                .thank-you {
                    text-align: center;
                    margin-top: 10px;
                    font-style: italic;
                }
                .metodo-pago {
                    text-align: center;
                    margin-top: 5px;
                    font-weight: bold;
                }
                .detalles-pago {
                    font-size: 10px;
                    margin-top: 5px;
                }
                @media print {
                    body { 
                        margin: 0; 
                        padding: 0; 
                    }
                    .ticket { 
                        width: 70mm; 
                    }
                }
            </style>
        </head>
        <body onload="window.print(); setTimeout(function() { window.close(); }, 100);">
            <div class="ticket">
                <div class="header">
                    <h3>${nombreEstablecimiento || 'Mi Negocio'}</h3>
                    <div>${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
                <div class="items">
    `;
    
    const productosMostrar = carrito.slice(0, 10);
    productosMostrar.forEach(item => {
        const nombreCorto = item.nombre.length > 20 ? item.nombre.substring(0, 17) + '...' : item.nombre;
        contenido += `
            <div class="item">
                <div class="item-name">${nombreCorto} x${item.cantidad}</div>
                <div class="item-price">Bs ${item.subtotal.toFixed(2)}</div>
            </div>
        `;
    });
    
    if (carrito.length > 10) {
        contenido += `
            <div class="item">
                <div class="item-name">... y ${carrito.length - 10} productos más</div>
                <div class="item-price"></div>
            </div>
        `;
    }
    
    contenido += `
                </div>
                <div class="total">
                    <div>Total: Bs ${totalBs.toFixed(2)} / $ ${totalDolares.toFixed(2)}</div>
                </div>
                <div class="metodo-pago">
                    <div>Método: ${metodoPagoSeleccionado ? metodoPagoSeleccionado.replace(/_/g, ' ').toUpperCase() : 'NO ESPECIFICADO'}</div>
                </div>
    `;
    
    if (detallesPago) {
        contenido += `<div class="detalles-pago">`;
        
        switch(metodoPagoSeleccionado) {
            case 'efectivo_bs':
                contenido += `Monto recibido: Bs ${detallesPago.montoRecibido.toFixed(2)}<br>`;
                contenido += `Cambio: Bs ${detallesPago.cambio.toFixed(2)}`;
                break;
                
            case 'efectivo_dolares':
                contenido += `Monto recibido: $ ${detallesPago.montoRecibido.toFixed(2)}<br>`;
                contenido += `Cambio: $ ${detallesPago.cambio.toFixed(2)}`;
                break;
                
            case 'punto':
                contenido += `Referencia: ${detallesPago.referencia}`;
                break;
                
            case 'pago_movil':
                contenido += `Teléfono: ${detallesPago.telefono}<br>`;
                contenido += `Referencia: ${detallesPago.referencia}`;
                break;
                
            case 'transferencia':
                contenido += `Banco: ${detallesPago.banco}<br>`;
                contenido += `Referencia: ${detallesPago.referencia}`;
                break;
                
            case 'credito':
                contenido += `Titular: ${detallesPago.titular}<br>`;
                contenido += `Tarjeta: ****${detallesPago.digitos}`;
                break;
                
            case 'combinado':
                contenido += `Efectivo: Bs ${detallesPago.montoEfectivo.toFixed(2)}<br>`;
                contenido += `Transferencia: Bs ${detallesPago.montoTransferencia.toFixed(2)}<br>`;
                contenido += `Referencia: ${detallesPago.referencia}`;
                break;
        }
        
        contenido += `</div>`;
    }
    
    contenido += `
                <div class="fecha">Tasa BCV: ${tasaBCVGuardada}</div>
                <div class="thank-you">¡Gracias por su compra!</div>
            </div>
        </body>
        </html>
    `;
    
    const ventana = window.open('', '_blank', 'width=250,height=400');
    ventana.document.write(contenido);
    ventana.document.close();
}

// ================= FUNCIONES PRINCIPALES (ORIGINALES) =================
function cargarDatosIniciales() {
    document.getElementById('nombreEstablecimiento').value = nombreEstablecimiento;
    document.getElementById('tasaBCV').value = tasaBCVGuardada || '';
}

function calcularPrecioVenta() {
    const tasaBCV = parseFloat(document.getElementById('tasaBCV').value) || tasaBCVGuardada;
    const costo = parseFloat(document.getElementById('costo').value);
    const ganancia = parseFloat(document.getElementById('ganancia').value);
    const unidadesPorCaja = parseFloat(document.getElementById('unidadesPorCaja').value);
    const unidadesExistentes = parseFloat(document.getElementById('unidadesExistentes').value) || 0;

    if (!validarTasaBCV(tasaBCV)) return;
    if (!validarCamposNumericos(costo, ganancia, unidadesPorCaja)) return;

    const gananciaDecimal = ganancia / 100;
    const precioDolar = costo / (1 - gananciaDecimal);
    const precioBolivares = precioDolar * tasaBCV;
    const precioUnitarioDolar = precioDolar / unidadesPorCaja;
    const precioUnitarioBolivar = precioBolivares / unidadesPorCaja;

    mostrarResultados(precioUnitarioDolar, precioUnitarioBolivar);
}

function guardarProducto() {
    const nombre = document.getElementById('producto').value.trim();
    const codigoBarras = document.getElementById('codigoBarras').value.trim();
    const descripcion = document.getElementById('descripcion').value;
    const costo = parseFloat(document.getElementById('costo').value);
    const ganancia = parseFloat(document.getElementById('ganancia').value);
    const unidadesPorCaja = parseFloat(document.getElementById('unidadesPorCaja').value);
    const unidadesExistentes = parseFloat(document.getElementById('unidadesExistentes').value) || 0;
    const tasaBCV = parseFloat(document.getElementById('tasaBCV').value) || tasaBCVGuardada;

    if (!validarCamposTexto(nombre, descripcion)) return;
    if (!validarTasaBCV(tasaBCV)) return;
    if (!validarCamposNumericos(costo, ganancia, unidadesPorCaja)) return;

    if (productoExiste(nombre)) {
        if (!confirm(`?? "${nombre}" ya existe. ¿Deseas actualizarlo?`)) return;
        const index = productos.findIndex(p => p.nombre.toLowerCase() === nombre.toLowerCase());
        productos.splice(index, 1);
    }

    const producto = calcularProducto(nombre, codigoBarras, descripcion, costo, ganancia, unidadesPorCaja, tasaBCV, unidadesExistentes);
    guardarProductoEnLista(producto);
}

// ================= FUNCIONES DE LISTA DE COSTOS =================
function mostrarListaCostos() {
    const container = document.getElementById('listaCostosContainer');
    const lista = document.getElementById('listaCostos');
    
    if (productos.length === 0) {
        mostrarToast("?? No hay productos registrados", "warning");
        container.style.display = 'none';
        return;
    }

    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';
        actualizarListaCostos();
    } else {
        container.style.display = 'none';
    }
}

function actualizarListaCostos() {
    const lista = document.getElementById('listaCostos');
    lista.innerHTML = '';

    const productosOrdenados = [...productos].sort((a, b) => b.costo - a.costo);
    
    productosOrdenados.forEach(producto => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${producto.nombre} (${producto.descripcion})</span>
            <span>$${producto.costo.toFixed(2)} / Bs${(producto.costo * tasaBCVGuardada).toFixed(2)}</span>
        `;
        lista.appendChild(li);
    });
}

function generarPDFCostos() {
    if (productos.length === 0) {
        mostrarToast("?? No hay productos para generar el PDF", "warning");
        return;
    }

    if (esDispositivoMovil()) {
        if (!confirm("?? Estás en un dispositivo móvil. La generación de PDF puede fallar. ¿Continuar?")) {
            return;
        }
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.text(`Lista de Costos - ${nombreEstablecimiento || 'Mi Negocio'}`, 105, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Fecha: ${new Date().toLocaleDateString()} | Tasa BCV: ${tasaBCVGuardada}`, 105, 22, { align: 'center' });
        
        const columns = [
            { header: 'Producto', dataKey: 'nombre' },
            { header: 'Descripción', dataKey: 'descripcion' },
            { header: 'Código Barras', dataKey: 'codigoBarras' },
            { header: 'Costo ($)', dataKey: 'costoDolar' },
            { header: 'Costo (Bs)', dataKey: 'costoBolivar' }
        ];
        
        const rows = productos.map(producto => ({
            nombre: producto.nombre,
            descripcion: producto.descripcion,
            codigoBarras: producto.codigoBarras || 'N/A',
            costoDolar: `$${producto.costo.toFixed(2)}`,
            costoBolivar: `Bs${(producto.costo * tasaBCVGuardada).toFixed(2)}`
        }));
        
        doc.autoTable({
            startY: 30,
            head: [columns.map(col => col.header)],
            body: rows.map(row => columns.map(col => row[col.dataKey])),
            margin: { horizontal: 10 },
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [41, 128, 185], textColor: 255 }
        });
        
        if (esDispositivoMovil()) {
            const pdfData = doc.output('datauristring');
            const nuevaVentana = window.open();
            nuevaVentana.document.write(`<iframe width='100%' height='100%' src='${pdfData}'></iframe>`);
            mostrarToast("? PDF generado. Abriendo en nueva ventana...");
        } else {
            doc.save(`lista_costos_${new Date().toISOString().split('T')[0]}.pdf`);
            mostrarToast("? Lista de costos generada en PDF");
        }
    } catch (error) {
        mostrarToast("? Error al generar PDF: " + error.message, "error");
        if (esDispositivoMovil()) {
            mostrarToast("?? En móviles, prueba con Chrome o Firefox", "warning");
        }
    }
}

// ================= FUNCIONES DE RESPALDO =================
function generarRespaldoCompleto() {
    if (productos.length === 0 && ventasDiarias.length === 0) {
        mostrarToast("?? No hay datos para respaldar", "warning");
        return;
    }

    const esAndroid = /Android/i.test(navigator.userAgent);
    const esChrome = /Chrome/i.test(navigator.userAgent);
    
    if (esAndroid) {
        const confirmacion = confirm(
            "?? Generar PDF en Android:\n\n" +
            "1. Usa Chrome para mejor compatibilidad\n" +
            "2. PDFs grandes pueden tardar\n" +
            "3. Verifica la carpeta 'Descargas'\n\n" +
            "¿Generar el reporte?"
        );
        if (!confirmacion) return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });

        const configMovil = {
            fontSize: 7,
            cellPadding: 2,
            margin: { horizontal: 5 },
            pageBreak: 'auto',
            rowPageBreak: 'avoid'
        };

        doc.setFontSize(14);
        doc.text(`Respaldo - ${nombreEstablecimiento || 'Mi Negocio'}`, 105, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Generado: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 105, 22, { align: 'center' });
        doc.text(`Tasa BCV: ${tasaBCVGuardada} | Productos: ${productos.length}`, 105, 28, { align: 'center' });

        const columns = [
            { header: 'Producto', dataKey: 'nombre' },
            { header: 'Código', dataKey: 'codigo' },
            { header: 'Unid/Caja', dataKey: 'unidades' },
            { header: 'Costo$', dataKey: 'costo' },
            { header: 'Gan%', dataKey: 'ganancia' },
            { header: 'P.Venta$', dataKey: 'pVentaDolar' },
            { header: 'P.VentaBs', dataKey: 'pVentaBs' }
        ];
        
        const rows = productos.map(producto => ({
            nombre: producto.nombre,
            codigo: producto.codigoBarras || 'N/A',
            unidades: producto.unidadesPorCaja,
            costo: `$${producto.costo.toFixed(2)}`,
            ganancia: `${(producto.ganancia * 100).toFixed(0)}%`,
            pVentaDolar: `$${producto.precioUnitarioDolar.toFixed(2)}`,
            pVentaBs: `Bs${producto.precioUnitarioBolivar.toFixed(2)}`
        }));

        doc.autoTable({
            startY: 35,
            head: [columns.map(col => col.header)],
            body: rows.map(row => columns.map(col => row[col.dataKey])),
            styles: configMovil,
            headStyles: { 
                fillColor: [41, 128, 185],
                textColor: 255,
                fontSize: 7
            },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 20 },
                2: { cellWidth: 15 },
                3: { cellWidth: 15 },
                4: { cellWidth: 15 },
                5: { cellWidth: 20 },
                6: { cellWidth: 25 }
            }
        });

        if (esAndroid) {
            if (window.saveAs) {
                const pdfBlob = doc.output('blob');
                saveAs(pdfBlob, `respaldo_${new Date().toISOString().slice(0,10)}.pdf`);
                mostrarToast("? PDF guardado en Descargas");
            } 
            else if (esChrome) {
                const pdfData = doc.output('dataurlnewwindow');
                mostrarToast("? Abriendo PDF en Chrome...");
            } 
            else {
                try {
                    doc.save(`respaldo_${new Date().toISOString().slice(0,10)}.pdf`);
                } catch (e) {
                    const pdfData = doc.output('datauristring');
                    const ventana = window.open();
                    ventana.document.write(`<iframe src='${pdfData}' style='width:100%;height:100%;border:none'></iframe>`);
                    mostrarToast("?? Usa Chrome para descargar directamente");
                }
            }
        } else {
            doc.save(`respaldo_${new Date().toISOString().slice(0,10)}.pdf`);
        }
    } catch (error) {
        console.error("Error generando PDF:", error);
        mostrarToast(`? Error: ${error.message}`, "error");
        
        if (esAndroid) {
            mostrarToast("?? Solución: \n1. Usa Chrome\n2. Reduce cantidad de productos\n3. Reinicia la app", "warning", 5000);
        }
    }
}

// ================= FUNCIONES DE GESTIÓN =================
function actualizarTasaBCV() {
    const nuevaTasa = parseFloat(document.getElementById('tasaBCV').value);
    if (!validarTasaBCV(nuevaTasa)) return;

    tasaBCVGuardada = nuevaTasa;
    localStorage.setItem('tasaBCV', tasaBCVGuardada);
    
    if (productos.length > 0) {
        actualizarPreciosConNuevaTasa(nuevaTasa);
        actualizarLista();
        mostrarToast(`? Tasa BCV actualizada a: ${nuevaTasa}\n${productos.length} productos recalculados.`);
    } else {
        mostrarToast("? Tasa BCV actualizada (no hay productos para recalcular)");
    }
}

function actualizarPreciosConNuevaTasa(nuevaTasa) {
    productos.forEach(producto => {
        producto.precioMayorBolivar = producto.precioMayorDolar * nuevaTasa;
        producto.precioUnitarioBolivar = producto.precioUnitarioDolar * nuevaTasa;
    });
    guardarEnLocalStorage('productos', productos);
}

function guardarNombreEstablecimiento() {
    nombreEstablecimiento = document.getElementById('nombreEstablecimiento').value.trim();
    if (!nombreEstablecimiento) {
        mostrarToast("?? Ingrese un nombre válido", "error");
        return;
    }
    localStorage.setItem('nombreEstablecimiento', nombreEstablecimiento);
    mostrarToast(`? Nombre guardado: "${nombreEstablecimiento}"`);
}

function limpiarVentasAntiguas() {
    if (ventasDiarias.length === 0) return;
    
    const fechasUnicas = [...new Set(ventasDiarias.map(v => v.fecha))];
    fechasUnicas.sort((a, b) => new Date(b) - new Date(a));
    
    if (fechasUnicas.length > 4) {
        const fechasAEliminar = fechasUnicas.slice(4);
        ventasDiarias = ventasDiarias.filter(v => !fechasAEliminar.includes(v.fecha));
        guardarEnLocalStorage('ventasDiarias', ventasDiarias);
    }
}

function limpiarLista() {
    if (confirm("?? ¿Estás seguro de limpiar toda la lista de productos? Esta acción no se puede deshacer.")) {
        productos = [];
        guardarEnLocalStorage('productos', productos);
        actualizarLista();
        mostrarToast("??? Todos los productos han sido eliminados");
    }
}

// ================= FUNCIONES DE INVENTARIO =================
function ajustarInventario(index, operacion) {
    const producto = productos[index];
    const cantidad = parseInt(prompt(`Ingrese la cantidad a ${operacion === 'sumar' ? 'sumar' : 'restar'}:`, "1")) || 0;
    
    if (cantidad <= 0) {
        mostrarToast("?? Ingrese una cantidad válida", "error");
        return;
    }

    if (operacion === 'restar') {
        if (producto.unidadesExistentes < cantidad) {
            mostrarToast("?? No hay suficientes unidades en inventario", "error");
            return;
        }
        
        const hoy = new Date();
        const fechaKey = hoy.toLocaleDateString();
        const horaKey = hoy.toLocaleTimeString();
        
        const venta = {
            fecha: fechaKey,
            hora: horaKey,
            producto: producto.nombre,
            descripcion: producto.descripcion,
            cantidad: cantidad,
            precioUnitarioDolar: producto.precioUnitarioDolar,
            precioUnitarioBolivar: producto.precioUnitarioBolivar,
            totalDolar: cantidad * producto.precioUnitarioDolar,
            totalBolivar: cantidad * producto.precioUnitarioBolivar
        };
        
        ventasDiarias.push(venta);
        localStorage.setItem('ventasDiarias', JSON.stringify(ventasDiarias));
        
        mostrarToast(`? Venta registrada: ${cantidad} ${producto.nombre} - Total: $${venta.totalDolar.toFixed(2)} / Bs${venta.totalBolivar.toFixed(2)}`);
    }

    producto.unidadesExistentes = operacion === 'sumar' ? 
        producto.unidadesExistentes + cantidad : 
        producto.unidadesExistentes - cantidad;
    
    localStorage.setItem('productos', JSON.stringify(productos));
    actualizarLista();
}

function generarReporteDiario() {
    if (ventasDiarias.length === 0) {
        mostrarToast("?? No hay ventas registradas", "warning");
        return;
    }

    const fechaReporte = prompt("Ingrese la fecha del reporte (DD/MM/AAAA):", new Date().toLocaleDateString());
    if (!fechaReporte) return;

    const ventasDelDia = ventasDiarias.filter(venta => venta.fecha === fechaReporte);
    if (ventasDelDia.length === 0) {
        mostrarToast(`?? No hay ventas registradas para el ${fechaReporte}`, "warning");
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.text(`Reporte de Ventas Diario - ${nombreEstablecimiento || 'Mi Negocio'}`, 105, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Fecha: ${fechaReporte}`, 105, 22, { align: 'center' });
        
        const totalDolar = ventasDelDia.reduce((sum, venta) => sum + venta.totalDolar, 0);
        const totalBolivar = ventasDelDia.reduce((sum, venta) => sum + venta.totalBolivar, 0);
        const gananciaTotalDolar = ventasDelDia.reduce((sum, venta) => sum + (venta.gananciaDolar || 0), 0);
        const gananciaTotalBolivar = ventasDelDia.reduce((sum, venta) => sum + (venta.gananciaBolivar || 0), 0);
        
        doc.autoTable({
            startY: 30,
            head: [
                ['Producto', 'Descripción', 'Cantidad', 'P.Unit ($)', 'P.Unit (Bs)', 'Total ($)', 'Total (Bs)', 'Ganancia ($)', 'Ganancia (Bs)']
            ],
            body: ventasDelDia.map(venta => [
                venta.producto,
                venta.descripcion,
                venta.cantidad,
                `$${venta.precioUnitarioDolar.toFixed(2)}`,
                `Bs${venta.precioUnitarioBolivar.toFixed(2)}`,
                `$${venta.totalDolar.toFixed(2)}`,
                `Bs${venta.totalBolivar.toFixed(2)}`,
                `$${(venta.gananciaDolar || 0).toFixed(2)}`,
                `Bs${(venta.gananciaBolivar || 0).toFixed(2)}`
            ]),
            margin: { horizontal: 10 },
            styles: { 
                fontSize: 8, 
                cellPadding: 3,
                overflow: 'linebreak'
            },
            headStyles: { 
                fillColor: [41, 128, 185],
                textColor: 255,
                fontSize: 9
            },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 20 },
                2: { cellWidth: 12 },
                3: { cellWidth: 15 },
                4: { cellWidth: 15 },
                5: { cellWidth: 15 },
                6: { cellWidth: 15 },
                7: { cellWidth: 15 },
                8: { cellWidth: 15 }
            }
        });
        
        const finalY = doc.autoTable.previous.finalY + 10;
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text(`Total General en Dólares: $${totalDolar.toFixed(2)}`, 14, finalY);
        doc.text(`Total General en Bolívares: Bs${totalBolivar.toFixed(2)}`, 14, finalY + 10);
        doc.text(`Ganancia Total en Dólares: $${gananciaTotalDolar.toFixed(2)}`, 14, finalY + 20);
        doc.text(`Ganancia Total en Bolívares: Bs${gananciaTotalBolivar.toFixed(2)}`, 14, finalY + 30);
        doc.text(`Tasa BCV utilizada: ${tasaBCVGuardada}`, 14, finalY + 40);
        
        const metodosPago = {};
        ventasDelDia.forEach(venta => {
            const metodo = venta.metodoPago || 'no_especificado';
            metodosPago[metodo] = (metodosPago[metodo] || 0) + venta.totalBolivar;
        });
        
        let yPos = finalY + 50;
        doc.text("Métodos de Pago:", 14, yPos);
        yPos += 10;
        
        for (const [metodo, monto] of Object.entries(metodosPago)) {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
            doc.text(`${metodo.replace(/_/g, ' ').toUpperCase()}: Bs${monto.toFixed(2)}`, 20, yPos);
            yPos += 7;
        }
        
        const nombreArchivo = `ventas_${fechaReporte.replace(/\//g, '-')}.pdf`;
        doc.save(nombreArchivo);
        mostrarToast(`? Reporte del ${fechaReporte} generado con éxito`);
        
    } catch (error) {
        mostrarToast("? Error al generar reporte: " + error.message, "error");
        console.error(error);
    }
}

// ================= FUNCIONES DE CÁLCULO =================
function calcularProducto(nombre, codigoBarras, descripcion, costo, ganancia, unidadesPorCaja, tasaBCV, unidadesExistentes = 0) {
    const gananciaDecimal = ganancia / 100;
    const precioDolar = costo / (1 - gananciaDecimal);
    const precioBolivares = precioDolar * tasaBCV;

    return {
        nombre,
        codigoBarras,
        descripcion,
        costo,
        ganancia: gananciaDecimal,
        unidadesPorCaja,
        unidadesExistentes: unidadesExistentes || 0,
        precioMayorDolar: precioDolar,
        precioMayorBolivar: precioBolivares,
        precioUnitarioDolar: precioDolar / unidadesPorCaja,
        precioUnitarioBolivar: precioBolivares / unidadesPorCaja,
        fechaActualizacion: new Date().toISOString()
    };
}

function guardarProductoEnLista(producto) {
    productos.push(producto);
    localStorage.setItem('productos', JSON.stringify(productos));
    actualizarLista();
    reiniciarCalculadora();
    mostrarToast("? Producto guardado exitosamente");
}

// ================= FUNCIONES DE INTERFAZ =================
function actualizarLista() {
    const tbody = document.querySelector('#listaProductos tbody');
    tbody.innerHTML = '';

    const productosOrdenados = [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre));
    
    productosOrdenados.forEach((producto, index) => {
        const originalIndex = productos.findIndex(p => p.nombre === producto.nombre);
        const inventarioBajo = producto.unidadesExistentes <= 5;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${producto.nombre}</td>
            <td>${producto.descripcion}</td>
            <td>${producto.codigoBarras || 'N/A'}</td>
            <td class="${inventarioBajo ? 'inventario-bajo' : ''}">${producto.unidadesExistentes}</td>
            <td>
                <div class="ajuste-inventario">
                    <button onclick="ajustarInventario(${originalIndex}, 'sumar')">+</button>
                    <button onclick="ajustarInventario(${originalIndex}, 'restar')">-</button>
                </div>
            </td>
            <td>$${producto.precioUnitarioDolar.toFixed(2)}</td>
            <td>Bs${producto.precioUnitarioBolivar.toFixed(2)}</td>
            <td>${(producto.ganancia * 100).toFixed(0)}%</td>
            <td>
                <button class="editar" onclick="editarProducto(${originalIndex})">Editar</button>
                <button class="imprimir" onclick="imprimirTicket(${originalIndex})">Imprimir</button>
                <button class="eliminar" onclick="eliminarProducto(${originalIndex})">Eliminar</button>
                <button class="cb-button" onclick="agregarCodigoBarras(${originalIndex})">CB</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (document.getElementById('listaCostosContainer').style.display === 'block') {
        actualizarListaCostos();
    }
}

function mostrarResultados(precioUnitarioDolar, precioUnitarioBolivar) {
    document.getElementById('precioUnitario').innerHTML = 
        `<strong>Precio unitario:</strong> $${precioUnitarioDolar.toFixed(2)} / Bs${precioUnitarioBolivar.toFixed(2)}`;
}

function reiniciarCalculadora() {
    document.getElementById('producto').value = '';
    document.getElementById('codigoBarras').value = '';
    document.getElementById('costo').value = '';
    document.getElementById('ganancia').value = '';
    document.getElementById('unidadesPorCaja').value = '';
    document.getElementById('unidadesExistentes').value = '';
    document.getElementById('descripcion').selectedIndex = 0;
}

// ================= FUNCIONES DE VALIDACIÓN =================
function validarTasaBCV(tasa) {
    if (isNaN(tasa) || tasa <= 0) {
        mostrarToast("?? Ingrese una tasa BCV válida (mayor a cero)", "error");
        return false;
    }
    return true;
}

function validarCamposNumericos(costo, ganancia, unidades) {
    if (isNaN(costo) || costo <= 0 || isNaN(ganancia) || ganancia <= 0 || isNaN(unidades) || unidades <= 0) {
        mostrarToast("?? Complete todos los campos con valores válidos (mayores a cero)", "error");
        return false;
    }
    return true;
}

function validarCamposTexto(nombre, descripcion) {
    if (!nombre || !descripcion) {
        mostrarToast("?? Complete todos los campos", "error");
        return false;
    }
    return true;
}

function productoExiste(nombre) {
    return productos.some(p => p.nombre.toLowerCase() === nombre.toLowerCase());
}

// ================= FUNCIONES DE NOTIFICACIÓN =================
function mostrarToast(mensaje, tipo = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function esDispositivoMovil() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function buscarProducto() {
    const termino = document.getElementById('buscar').value.trim().toLowerCase();
    if (!termino) {
        actualizarLista();
        return;
    }

    const resultados = productos.filter(p => 
        p.nombre.toLowerCase().includes(termino) || 
        p.descripcion.toLowerCase().includes(termino) ||
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(termino))
    );

    const tbody = document.querySelector('#listaProductos tbody');
    tbody.innerHTML = '';

    resultados.forEach((producto, index) => {
        const originalIndex = productos.findIndex(p => p.nombre === producto.nombre);
        const inventarioBajo = producto.unidadesExistentes <= 5;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${producto.nombre}</td>
            <td>${producto.descripcion}</td>
            <td>${producto.codigoBarras || 'N/A'}</td>
            <td class="${inventarioBajo ? 'inventario-bajo' : ''}">${producto.unidadesExistentes}</td>
            <td>
                <div class="ajuste-inventario">
                    <button onclick="ajustarInventario(${originalIndex}, 'sumar')">+</button>
                    <button onclick="ajustarInventario(${originalIndex}, 'restar')">-</button>
                </div>
            </td>
            <td>$${producto.precioUnitarioDolar.toFixed(2)}</td>
            <td>Bs${producto.precioUnitarioBolivar.toFixed(2)}</td>
            <td>${(producto.ganancia * 100).toFixed(0)}%</td>
            <td>
                <button class="editar" onclick="editarProducto(${originalIndex})">Editar</button>
                <button class="imprimir" onclick="imprimirTicket(${originalIndex})">Imprimir</button>
                <button class="eliminar" onclick="eliminarProducto(${originalIndex})">Eliminar</button>
                <button class="cb-button" onclick="agregarCodigoBarras(${originalIndex})">CB</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ================= FUNCIONES ADICIONALES =================
function editarProducto(index) {
    const producto = productos[index];
    
    document.getElementById('producto').value = producto.nombre;
    document.getElementById('codigoBarras').value = producto.codigoBarras || '';
    document.getElementById('descripcion').value = producto.descripcion;
    document.getElementById('costo').value = producto.costo;
    document.getElementById('ganancia').value = producto.ganancia * 100;
    document.getElementById('unidadesPorCaja').value = producto.unidadesPorCaja;
    document.getElementById('unidadesExistentes').value = producto.unidadesExistentes;
    
    const tasaBCV = parseFloat(document.getElementById('tasaBCV').value) || tasaBCVGuardada;
    const precioUnitarioDolar = producto.precioUnitarioDolar;
    const precioUnitarioBolivar = precioUnitarioDolar * tasaBCV;
    
    mostrarResultados(precioUnitarioDolar, precioUnitarioBolivar);
    
    productos.splice(index, 1);
    localStorage.setItem('productos', JSON.stringify(productos));
    
    mostrarToast(`?? Editando producto: ${producto.nombre}`);
}

function agregarCodigoBarras(index) {
    const producto = productos[index];
    const codigoBarras = prompt(`Ingrese el código de barras para ${producto.nombre}:`, producto.codigoBarras || '');
    
    if (codigoBarras === null) return;
    
    producto.codigoBarras = codigoBarras.trim();
    localStorage.setItem('productos', JSON.stringify(productos));
    actualizarLista();
    
    mostrarToast(`✓ Código de barras actualizado para ${producto.nombre}`);
}

function eliminarProducto(index) {
    const producto = productos[index];
    if (confirm(`¿Estás seguro de eliminar "${producto.nombre}"?`)) {
        productos.splice(index, 1);
        localStorage.setItem('productos', JSON.stringify(productos));
        actualizarLista();
        mostrarToast(`??? Producto eliminado: ${producto.nombre}`);
    }
}

function imprimirTicket(index) {
    const producto = productos[index];
    const ventana = window.open('', '_blank');
    ventana.document.write(`
        <html>
            <head>
                <title>Ticket - ${producto.nombre}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .ticket { max-width: 300px; margin: 0 auto; border: 1px dashed #ccc; padding: 15px; }
                    .header { text-align: center; margin-bottom: 10px; }
                    .producto { font-weight: bold; font-size: 18px; }
                    .precios { margin-top: 10px; }
                    .fecha { font-size: 12px; text-align: right; margin-top: 15px; }
                    .codigo-barras { text-align: center; margin: 10px 0; font-family: monospace; }
                </style>
            </head>
            <body>
                <div class="ticket">
                    <div class="header">
                        <h3>${nombreEstablecimiento || 'Mi Negocio'}</h3>
                    </div>
                    <div class="producto">${producto.nombre}</div>
                    <div>${producto.descripcion}</div>
                    ${producto.codigoBarras ? `<div class="codigo-barras">Código: ${producto.codigoBarras}</div>` : ''}
                    <div class="precios">
                        <div>Precio: $${producto.precioUnitarioDolar.toFixed(2)}</div>
                        <div>Precio: Bs${producto.precioUnitarioBolivar.toFixed(2)}</div>
                    </div>
                    <div class="fecha">${new Date().toLocaleString()}</div>
                </div>
                <script>window.print();</script>
            </body>
        </html>
    `);
    ventana.document.close();
}

// Sistema de actualización
const APP_VERSION = "1.4.0";

function toggleCopyrightNotice() {
    const notice = document.getElementById('copyrightNotice');
    notice.classList.toggle('show');
}

function checkAppVersion() {
    const savedVersion = localStorage.getItem('appVersion');
    
    if (!savedVersion) {
        localStorage.setItem('appVersion', APP_VERSION);
        return;
    }
    
    if (savedVersion !== APP_VERSION) {
        setTimeout(() => {
            mostrarToast(`Versión ${APP_VERSION} cargada`, "success", 3000);
        }, 2000);
        localStorage.setItem('appVersion', APP_VERSION);
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    checkAppVersion();
    
    setTimeout(() => {
        toggleCopyrightNotice();
        setTimeout(() => {
            const notice = document.getElementById('copyrightNotice');
            if (notice.classList.contains('show')) {
                notice.classList.remove('show');
            }
        }, 15000);
    }, 5000);
});

// Cerrar modal si se hace clic fuera de él
window.onclick = function(event) {
    const modal = document.getElementById('modalPago');
    if (event.target == modal) {
        cerrarModalPago();
    }
};
