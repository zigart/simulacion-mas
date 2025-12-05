// ===========================================
// Simulador de Movimiento Armónico Simple
// ===========================================

// Modo de simulación: 'spring' o 'pendulum'
let simulationMode = 'spring';

// Parámetros de la simulación
const params = {
    // Resorte
    mass: 1.0,           // kg
    springConstant: 40,  // N/m
    amplitude: 0.15,     // metros
    // Péndulo
    pendulumLength: 1.5, // metros
    pendulumAngle: 20,   // grados
    gravity: 9.8,        // m/s²
    // Común
    phase: 0             // radianes
};

// Factor de escala: píxeles por metro (para visualización)
// Ajustado para que la amplitud máxima (0.5m) quepa en el canvas
const PIXELS_PER_METER = 320;

// Estado de la simulación
let simulation = {
    time: 0,
    isRunning: false,
    animationId: null,
    lastTimestamp: 0,
    timeScale: 1
};

// Datos para los gráficos
const graphData = {
    position: [],
    velocity: [],
    acceleration: [],
    maxPoints: 500,
    timeWindow: 5 // segundos visibles en el gráfico
};

// Canvas y contextos
let springCanvas, springCtx;

// Charts de Chart.js
let positionChart, velocityChart, accelerationChart;

// Colores para los gráficos - Paleta UNTREF
const colors = {
    position: '#3b82f6',      // Azul institucional
    velocity: '#10b981',       // Verde
    acceleration: '#ef4444',   // Rojo
    grid: '#334155',
    axis: '#475569',
    text: '#94a3b8'
};

// =====================
// Inicialización
// =====================
document.addEventListener('DOMContentLoaded', () => {
    initializeCanvases();
    setupEventListeners();
    updateCalculatedValues();
    drawSpring(0);
    // Los gráficos de Chart.js se inicializan vacíos
});

function initializeCanvases() {
    // Canvas del resorte
    springCanvas = document.getElementById('spring-canvas');
    springCtx = springCanvas.getContext('2d');
    
    // Inicializar gráficos de Chart.js
    initializeCharts();
}

function initializeCharts() {
    // Configuración común para todos los gráficos
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 0 // Desactivar animaciones para mejor rendimiento en tiempo real
        },
        interaction: {
            mode: 'nearest',
            intersect: false,
            axis: 'xy'
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                align: 'end',
                labels: {
                    boxWidth: 12,
                    boxHeight: 12,
                    padding: 8,
                    font: {
                        family: 'JetBrains Mono',
                        size: 9
                    },
                    color: '#9ca3af',
                    usePointStyle: true,
                    filter: function(item) {
                        // Ocultar la línea principal de la leyenda
                        return item.datasetIndex !== 0;
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                titleFont: {
                    family: 'JetBrains Mono',
                    size: 11
                },
                bodyFont: {
                    family: 'JetBrains Mono',
                    size: 12
                },
                padding: 10,
                cornerRadius: 8,
                displayColors: false
            }
        },
        scales: {
            x: {
                type: 'linear',
                title: {
                    display: true,
                    text: 'Tiempo (s)',
                    color: '#9ca3af',
                    font: {
                        family: 'JetBrains Mono',
                        size: 10
                    }
                },
                grid: {
                    color: '#2d3748',
                    lineWidth: 0.5
                },
                ticks: {
                    color: '#9ca3af',
                    font: {
                        family: 'JetBrains Mono',
                        size: 9
                    },
                    callback: function(value) {
                        return value.toFixed(1) + 's';
                    }
                }
            },
            y: {
                grid: {
                    color: '#2d3748',
                    lineWidth: 0.5
                },
                ticks: {
                    color: '#9ca3af',
                    font: {
                        family: 'JetBrains Mono',
                        size: 9
                    }
                }
            }
        }
    };

    // Configuración común para puntos clave (máximos, mínimos, ceros)
    const keyPointsConfig = {
        maximos: {
            label: 'Máximos',
            data: [],
            borderColor: '#ffd93d',
            backgroundColor: '#ffd93d',
            pointRadius: 9,
            pointHoverRadius: 14,
            pointHitRadius: 25,
            pointStyle: 'triangle',
            showLine: false,
            order: 0
        },
        minimos: {
            label: 'Mínimos',
            data: [],
            borderColor: '#ff6b6b',
            backgroundColor: '#ff6b6b',
            pointRadius: 9,
            pointHoverRadius: 14,
            pointHitRadius: 25,
            pointStyle: 'triangle',
            rotation: 180,
            showLine: false,
            order: 0
        },
        ceros: {
            label: 'Ceros',
            data: [],
            borderColor: '#ffffff',
            backgroundColor: '#ffffff',
            pointRadius: 7,
            pointHoverRadius: 12,
            pointHitRadius: 25,
            pointStyle: 'circle',
            showLine: false,
            order: 0
        }
    };

    // Gráfico de Posición
    const posCtx = document.getElementById('position-graph').getContext('2d');
    positionChart = new Chart(posCtx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Posición',
                    data: [],
                    borderColor: colors.position,
                    backgroundColor: colors.position + '20',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHitRadius: 5,
                    pointHoverBackgroundColor: colors.position,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                    order: 1
                },
                { ...keyPointsConfig.maximos },
                { ...keyPointsConfig.minimos },
                { ...keyPointsConfig.ceros }
            ]
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                title: {
                    display: true,
                    text: 'Posición x(t)',
                    color: colors.position,
                    font: {
                        family: 'JetBrains Mono',
                        size: 12,
                        weight: '600'
                    },
                    padding: { bottom: 10 }
                },
                tooltip: {
                    ...commonOptions.plugins.tooltip,
                    callbacks: {
                        title: (items) => `t = ${items[0].parsed.x.toFixed(3)} s`,
                        label: (item) => `x = ${item.parsed.y.toFixed(4)} m`
                    }
                }
            },
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    title: {
                        display: true,
                        text: 'x (m)',
                        color: colors.position,
                        font: {
                            family: 'JetBrains Mono',
                            size: 10
                        }
                    }
                }
            }
        }
    });

    // Gráfico de Velocidad
    const velCtx = document.getElementById('velocity-graph').getContext('2d');
    velocityChart = new Chart(velCtx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Velocidad',
                    data: [],
                    borderColor: colors.velocity,
                    backgroundColor: colors.velocity + '20',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHitRadius: 5,
                    pointHoverBackgroundColor: colors.velocity,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                    order: 1
                },
                { ...keyPointsConfig.maximos },
                { ...keyPointsConfig.minimos },
                { ...keyPointsConfig.ceros }
            ]
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                title: {
                    display: true,
                    text: 'Velocidad v(t)',
                    color: colors.velocity,
                    font: {
                        family: 'JetBrains Mono',
                        size: 12,
                        weight: '600'
                    },
                    padding: { bottom: 10 }
                },
                tooltip: {
                    ...commonOptions.plugins.tooltip,
                    callbacks: {
                        title: (items) => `t = ${items[0].parsed.x.toFixed(3)} s`,
                        label: (item) => `v = ${item.parsed.y.toFixed(4)} m/s`
                    }
                }
            },
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    title: {
                        display: true,
                        text: 'v (m/s)',
                        color: colors.velocity,
                        font: {
                            family: 'JetBrains Mono',
                            size: 10
                        }
                    }
                }
            }
        }
    });

    // Gráfico de Aceleración
    const accCtx = document.getElementById('acceleration-graph').getContext('2d');
    accelerationChart = new Chart(accCtx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Aceleración',
                    data: [],
                    borderColor: colors.acceleration,
                    backgroundColor: colors.acceleration + '20',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHitRadius: 5,
                    pointHoverBackgroundColor: colors.acceleration,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                    order: 1
                },
                { ...keyPointsConfig.maximos },
                { ...keyPointsConfig.minimos },
                { ...keyPointsConfig.ceros }
            ]
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                title: {
                    display: true,
                    text: 'Aceleración a(t)',
                    color: colors.acceleration,
                    font: {
                        family: 'JetBrains Mono',
                        size: 12,
                        weight: '600'
                    },
                    padding: { bottom: 10 }
                },
                tooltip: {
                    ...commonOptions.plugins.tooltip,
                    callbacks: {
                        title: (items) => `t = ${items[0].parsed.x.toFixed(3)} s`,
                        label: (item) => `a = ${item.parsed.y.toFixed(4)} m/s²`
                    }
                }
            },
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    title: {
                        display: true,
                        text: 'a (m/s²)',
                        color: colors.acceleration,
                        font: {
                            family: 'JetBrains Mono',
                            size: 10
                        }
                    },
                    ticks: {
                        ...commonOptions.scales.y.ticks,
                        callback: function(value) {
                            return value.toFixed(1);
                        }
                    }
                }
            }
        }
    });
}

function setupEventListeners() {
    // Botones de modo
    document.getElementById('mode-spring').addEventListener('click', () => switchMode('spring'));
    document.getElementById('mode-pendulum').addEventListener('click', () => switchMode('pendulum'));

    // Controles del Resorte
    document.getElementById('mass').addEventListener('input', (e) => {
        params.mass = parseFloat(e.target.value);
        document.getElementById('mass-value').textContent = params.mass.toFixed(1);
        updateCalculatedValues();
    });
    
    document.getElementById('spring-constant').addEventListener('input', (e) => {
        params.springConstant = parseFloat(e.target.value);
        document.getElementById('spring-constant-value').textContent = params.springConstant;
        updateCalculatedValues();
    });
    
    document.getElementById('amplitude').addEventListener('input', (e) => {
        params.amplitude = parseFloat(e.target.value);
        document.getElementById('amplitude-value').textContent = params.amplitude.toFixed(2);
        updateCalculatedValues();
    });

    // Controles del Péndulo
    document.getElementById('pendulum-length').addEventListener('input', (e) => {
        params.pendulumLength = parseFloat(e.target.value);
        document.getElementById('pendulum-length-value').textContent = params.pendulumLength.toFixed(1);
        updateCalculatedValues();
    });

    document.getElementById('pendulum-angle').addEventListener('input', (e) => {
        params.pendulumAngle = parseFloat(e.target.value);
        document.getElementById('pendulum-angle-value').textContent = params.pendulumAngle;
        updateCalculatedValues();
    });

    document.getElementById('gravity').addEventListener('input', (e) => {
        params.gravity = parseFloat(e.target.value);
        document.getElementById('gravity-value').textContent = params.gravity.toFixed(1);
        updateCalculatedValues();
    });
    
    // Control común
    document.getElementById('phase').addEventListener('input', (e) => {
        params.phase = parseFloat(e.target.value);
        document.getElementById('phase-value').textContent = params.phase.toFixed(1);
    });
    
    // Botones de control
    document.getElementById('start-btn').addEventListener('click', startSimulation);
    document.getElementById('pause-btn').addEventListener('click', pauseSimulation);
    document.getElementById('reset-btn').addEventListener('click', resetSimulation);
}

function switchMode(mode) {
    simulationMode = mode;
    
    // Actualizar botones
    document.getElementById('mode-spring').classList.toggle('active', mode === 'spring');
    document.getElementById('mode-pendulum').classList.toggle('active', mode === 'pendulum');
    
    // Actualizar subtítulo
    const subtitle = document.getElementById('simulation-subtitle');
    if (mode === 'spring') {
        subtitle.textContent = 'Simulación interactiva de un sistema masa-resorte';
    } else {
        subtitle.textContent = 'Simulación interactiva de un péndulo simple';
    }
    
    // Mostrar/ocultar controles
    document.querySelectorAll('.spring-control').forEach(el => {
        el.style.display = mode === 'spring' ? 'block' : 'none';
    });
    document.querySelectorAll('.pendulum-control').forEach(el => {
        el.style.display = mode === 'pendulum' ? 'block' : 'none';
    });

    // Mostrar/ocultar fórmulas
    document.querySelectorAll('.spring-formula').forEach(el => {
        el.style.display = mode === 'spring' ? 'block' : 'none';
    });
    document.querySelectorAll('.pendulum-formula').forEach(el => {
        el.style.display = mode === 'pendulum' ? 'block' : 'none';
    });

    // Reiniciar simulación
    resetSimulation();
    updateCalculatedValues();
}

// =====================
// Cálculos físicos
// =====================
function calculateOmega() {
    if (simulationMode === 'spring') {
        return Math.sqrt(params.springConstant / params.mass);
    } else {
        return Math.sqrt(params.gravity / params.pendulumLength);
    }
}

function calculatePeriod() {
    return (2 * Math.PI) / calculateOmega();
}

function calculateFrequency() {
    return 1 / calculatePeriod();
}

function getAmplitude() {
    if (simulationMode === 'spring') {
        return params.amplitude;
    } else {
        // Para péndulo, convertir ángulo a radianes como "amplitud"
        return params.pendulumAngle * Math.PI / 180;
    }
}

function calculatePosition(t) {
    const omega = calculateOmega();
    const A = getAmplitude();
    return A * Math.cos(omega * t + params.phase);
}

function calculateVelocity(t) {
    const omega = calculateOmega();
    const A = getAmplitude();
    return -A * omega * Math.sin(omega * t + params.phase);
}

function calculateAcceleration(t) {
    const omega = calculateOmega();
    const A = getAmplitude();
    return -A * omega * omega * Math.cos(omega * t + params.phase);
}

function updateCalculatedValues() {
    const omega = calculateOmega();
    const period = calculatePeriod();
    const frequency = calculateFrequency();
    const A = getAmplitude();
    const vMax = A * omega;
    const aMax = A * omega * omega;
    
    let energy;
    if (simulationMode === 'spring') {
        energy = 0.5 * params.springConstant * params.amplitude * params.amplitude;
    } else {
        // Energía del péndulo: E = m*g*L*(1 - cos(θ₀)) ≈ 0.5*m*g*L*θ₀² para ángulos pequeños
        const theta0 = params.pendulumAngle * Math.PI / 180;
        energy = 0.5 * params.gravity * params.pendulumLength * theta0 * theta0;
    }
    
    document.getElementById('calc-omega').textContent = omega.toFixed(2);
    document.getElementById('calc-period').textContent = period.toFixed(2);
    document.getElementById('calc-frequency').textContent = frequency.toFixed(2);
    document.getElementById('calc-vmax').textContent = vMax.toFixed(2);
    document.getElementById('calc-amax').textContent = aMax.toFixed(2);
    document.getElementById('calc-energy').textContent = energy.toFixed(3);
}

// =====================
// Control de simulación
// =====================
function startSimulation() {
    if (!simulation.isRunning) {
        simulation.isRunning = true;
        simulation.lastTimestamp = 0;
        simulation.animationId = requestAnimationFrame(animate);
    }
}

function pauseSimulation() {
    simulation.isRunning = false;
    if (simulation.animationId) {
        cancelAnimationFrame(simulation.animationId);
        simulation.animationId = null;
    }
}

function resetSimulation() {
    pauseSimulation();
    simulation.time = 0;
    simulation.lastTimestamp = 0;
    graphData.position = [];
    graphData.velocity = [];
    graphData.acceleration = [];
    
    if (simulationMode === 'spring') {
        drawSpring(0);
    } else {
        drawPendulum(0);
    }
    resetCharts();
    updateCurrentValues(0, 0, 0, 0);
}

function animate(timestamp) {
    if (!simulation.isRunning) return;
    
    // Primera iteración: inicializar timestamp
    if (simulation.lastTimestamp === 0) {
        simulation.lastTimestamp = timestamp;
    }
    
    // Calcular delta time
    const deltaTime = (timestamp - simulation.lastTimestamp) / 1000;
    simulation.lastTimestamp = timestamp;
    
    // Evitar saltos grandes de tiempo
    const clampedDelta = Math.min(deltaTime, 0.1);
    
    // Actualizar tiempo
    simulation.time += clampedDelta * simulation.timeScale;
    
    // Calcular valores actuales
    const position = calculatePosition(simulation.time);
    const velocity = calculateVelocity(simulation.time);
    const acceleration = calculateAcceleration(simulation.time);
    
    // Guardar datos para gráficos
    addDataPoint(simulation.time, position, velocity, acceleration);
    
    // Dibujar según el modo
    if (simulationMode === 'spring') {
        const positionPixels = position * PIXELS_PER_METER;
        drawSpring(positionPixels);
    } else {
        drawPendulum(position); // position es el ángulo en radianes
    }
    drawAllGraphs();
    updateCurrentValues(position, velocity, acceleration, simulation.time);
    
    // Siguiente frame
    simulation.animationId = requestAnimationFrame(animate);
}

function addDataPoint(time, position, velocity, acceleration) {
    graphData.position.push({ x: time, y: position });
    graphData.velocity.push({ x: time, y: velocity });
    graphData.acceleration.push({ x: time, y: acceleration });
    
    // Mantener solo los puntos necesarios para la ventana de tiempo + un pequeño margen
    const minTime = time - graphData.timeWindow - 0.5;
    
    while (graphData.position.length > 0 && graphData.position[0].x < minTime) {
        graphData.position.shift();
        graphData.velocity.shift();
        graphData.acceleration.shift();
    }
}

function updateCurrentValues(position, velocity, acceleration, time) {
    // Los valores ya están en unidades físicas
    if (simulationMode === 'spring') {
        document.getElementById('current-position').textContent = position.toFixed(3);
        document.getElementById('current-velocity').textContent = velocity.toFixed(3);
        document.getElementById('current-acceleration').textContent = acceleration.toFixed(3);
    } else {
        // Para péndulo, mostrar ángulo en grados
        const angleDeg = position * 180 / Math.PI;
        const angularVel = velocity * 180 / Math.PI;
        const angularAcc = acceleration * 180 / Math.PI;
        document.getElementById('current-position').textContent = angleDeg.toFixed(2) + '°';
        document.getElementById('current-velocity').textContent = angularVel.toFixed(2) + '°/s';
        document.getElementById('current-acceleration').textContent = angularAcc.toFixed(2) + '°/s²';
    }
    document.getElementById('current-time').textContent = time.toFixed(2);
}

// =====================
// Dibujo del resorte
// =====================
function drawSpring(displacement) {
    const ctx = springCtx;
    const width = springCanvas.width;
    const height = springCanvas.height;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);
    
    // Fondo con gradiente
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0d1321');
    gradient.addColorStop(1, '#151f2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Configuración del resorte
    const anchorX = width / 2;
    const anchorY = 30;
    const equilibriumY = height / 2;
    const massY = equilibriumY + displacement;
    const massRadius = 25;
    
    // Dibujar soporte superior
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(anchorX - 50, 0, 100, 15);
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(anchorX - 5, 10, 10, 25);
    
    // Dibujar línea de equilibrio (punteada)
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, equilibriumY);
    ctx.lineTo(width - 20, equilibriumY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Etiqueta de equilibrio
    ctx.font = '11px JetBrains Mono';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'left';
    ctx.fillText('x = 0', 25, equilibriumY - 8);
    
    // Dibujar el resorte (zig-zag)
    drawSpringCoil(ctx, anchorX, anchorY + 20, massY - massRadius);
    
    // Dibujar la masa
    drawMass(ctx, anchorX, massY, massRadius);
    
    // Dibujar indicador de desplazamiento
    if (Math.abs(displacement) > 2) {
        drawDisplacementIndicator(ctx, anchorX + 50, equilibriumY, massY, displacement);
    }
    
    // Dibujar escala
    drawScale(ctx, width - 30, equilibriumY);
}

function drawSpringCoil(ctx, x, startY, endY) {
    const coils = 12;
    const coilWidth = 20;
    const springLength = endY - startY;
    const coilHeight = springLength / coils;
    
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(x, startY);
    
    for (let i = 0; i < coils; i++) {
        const y1 = startY + (i + 0.25) * coilHeight;
        const y2 = startY + (i + 0.75) * coilHeight;
        const y3 = startY + (i + 1) * coilHeight;
        
        const direction = i % 2 === 0 ? 1 : -1;
        
        ctx.lineTo(x + direction * coilWidth, y1);
        ctx.lineTo(x - direction * coilWidth, y2);
        ctx.lineTo(x, y3);
    }
    
    ctx.stroke();
    
    // Sombra/brillo del resorte
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.lineWidth = 6;
    ctx.stroke();
}

function drawMass(ctx, x, y, radius) {
    // Sombra
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(x + 3, y + 3, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Masa principal
    const massGradient = ctx.createRadialGradient(x - 8, y - 8, 0, x, y, radius);
    massGradient.addColorStop(0, '#5a6a8a');
    massGradient.addColorStop(0.7, '#3d4a66');
    massGradient.addColorStop(1, '#2d3748');
    
    ctx.fillStyle = massGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Borde
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Etiqueta de masa
    ctx.font = 'bold 14px JetBrains Mono';
    ctx.fillStyle = '#e8eaed';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('m', x, y);
}

function drawDisplacementIndicator(ctx, x, y0, yMass, displacement) {
    const direction = displacement > 0 ? 1 : -1;
    const color = displacement > 0 ? '#ff6b6b' : '#3b82f6';
    
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    
    // Línea de desplazamiento
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, yMass);
    ctx.stroke();
    
    // Flecha
    ctx.beginPath();
    ctx.moveTo(x, yMass);
    ctx.lineTo(x - 6, yMass - direction * 10);
    ctx.lineTo(x + 6, yMass - direction * 10);
    ctx.closePath();
    ctx.fill();
    
    // Etiqueta
    ctx.font = '11px JetBrains Mono';
    ctx.textAlign = 'left';
    const label = displacement > 0 ? '+x' : '-x';
    ctx.fillText(label, x + 8, (y0 + yMass) / 2);
}

function drawScale(ctx, x, centerY) {
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1;
    
    // Línea vertical
    ctx.beginPath();
    ctx.moveTo(x, centerY - 80);
    ctx.lineTo(x, centerY + 80);
    ctx.stroke();
    
    // Marcas
    for (let i = -4; i <= 4; i++) {
        const y = centerY + i * 20;
        const markLength = i === 0 ? 10 : 5;
        ctx.beginPath();
        ctx.moveTo(x - markLength, y);
        ctx.lineTo(x, y);
        ctx.stroke();
    }
}

// =====================
// Dibujo del péndulo
// =====================
function drawPendulum(angle) {
    const ctx = springCtx;
    const width = springCanvas.width;
    const height = springCanvas.height;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);
    
    // Fondo con gradiente
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0d1321');
    gradient.addColorStop(1, '#151f2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Configuración del péndulo
    const pivotX = width / 2;
    const pivotY = 50;
    const ropeLength = 80 + (params.pendulumLength - 0.5) * 64;
    const bobRadius = 20;
    
    // Calcular posición de la masa
    const bobX = pivotX + ropeLength * Math.sin(angle);
    const bobY = pivotY + ropeLength * Math.cos(angle);
    
    // Dibujar soporte superior
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(pivotX - 40, 0, 80, 15);
    
    // Dibujar punto de pivote
    ctx.fillStyle = '#2d3748';
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Dibujar línea vertical de referencia (equilibrio)
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(pivotX, pivotY + ropeLength + bobRadius + 20);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Dibujar la cuerda
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();
    
    // Efecto de brillo en la cuerda
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.lineWidth = 6;
    ctx.stroke();
    
    // Dibujar la masa (bob)
    // Sombra
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(bobX + 3, bobY + 3, bobRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Masa principal
    const bobGradient = ctx.createRadialGradient(bobX - 6, bobY - 6, 0, bobX, bobY, bobRadius);
    bobGradient.addColorStop(0, '#5a6a8a');
    bobGradient.addColorStop(0.7, '#3d4a66');
    bobGradient.addColorStop(1, '#2d3748');
    
    ctx.fillStyle = bobGradient;
    ctx.beginPath();
    ctx.arc(bobX, bobY, bobRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Borde
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Etiqueta de masa
    ctx.font = 'bold 12px JetBrains Mono';
    ctx.fillStyle = '#e8eaed';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('m', bobX, bobY);
    
    // Dibujar arco del ángulo
    if (Math.abs(angle) > 0.02) {
        const arcRadius = 40;
        const startAngle = Math.PI / 2;
        const endAngle = Math.PI / 2 - angle;
        
        ctx.strokeStyle = angle > 0 ? '#ff6b6b' : '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, arcRadius, Math.min(startAngle, endAngle), Math.max(startAngle, endAngle));
        ctx.stroke();
        
        // Etiqueta del ángulo
        const labelAngle = (startAngle + endAngle) / 2;
        const labelX = pivotX + (arcRadius + 15) * Math.cos(labelAngle);
        const labelY = pivotY + (arcRadius + 15) * Math.sin(labelAngle);
        ctx.font = '11px JetBrains Mono';
        ctx.fillStyle = angle > 0 ? '#ff6b6b' : '#3b82f6';
        ctx.fillText('θ', labelX, labelY);
    }
    
    // Etiqueta de longitud
    const midX = (pivotX + bobX) / 2 - 15;
    const midY = (pivotY + bobY) / 2;
    ctx.font = '10px JetBrains Mono';
    ctx.fillStyle = '#6b7280';
    ctx.fillText('L', midX, midY);
}

// =====================
// Dibujo de gráficos con Chart.js
// =====================
// Constantes para rangos fijos del eje Y
const MAX_AMPLITUDE_SPRING = 0.50;  // Amplitud máxima del resorte (metros)
const MAX_AMPLITUDE_PENDULUM = 45 * Math.PI / 180;  // Ángulo máximo del péndulo (radianes)

function drawAllGraphs() {
    const omega = calculateOmega();
    
    // Seleccionar amplitud máxima según el modo
    const maxAmp = simulationMode === 'spring' ? MAX_AMPLITUDE_SPRING : MAX_AMPLITUDE_PENDULUM;
    
    // Rangos del eje Y
    const maxPosition = maxAmp * 1.1;
    const maxVelocity = maxAmp * omega * 1.1;
    const maxAcceleration = maxAmp * omega * omega * 1.1;
    
    // Actualizar datos de cada gráfico
    updateChart(positionChart, graphData.position, maxPosition, 'position');
    updateChart(velocityChart, graphData.velocity, maxVelocity, 'velocity');
    updateChart(accelerationChart, graphData.acceleration, maxAcceleration, 'acceleration');
}

function updateChart(chart, data, maxYValue, type) {
    // Copiar datos al gráfico
    chart.data.datasets[0].data = data.map(point => ({
        x: point.x,
        y: point.y
    }));
    
    // Calcular ventana de tiempo basada en el tiempo actual de simulación
    const currentTime = simulation.time;
    let minTime, maxTime;
    
    if (currentTime <= graphData.timeWindow) {
        minTime = 0;
        maxTime = graphData.timeWindow;
    } else {
        minTime = currentTime - graphData.timeWindow;
        maxTime = currentTime;
    }
    
    chart.options.scales.x.min = minTime;
    chart.options.scales.x.max = maxTime;
    
    // Calcular y agregar puntos clave
    const keyPoints = calculateKeyPoints(minTime, maxTime, type);
    chart.data.datasets[1].data = keyPoints.maximos;
    chart.data.datasets[2].data = keyPoints.minimos;
    chart.data.datasets[3].data = keyPoints.ceros;
    
    // Configurar eje Y simétrico alrededor de 0
    chart.options.scales.y.min = -maxYValue;
    chart.options.scales.y.max = maxYValue;
    
    // Actualizar el gráfico sin animación
    chart.update('none');
}

// Calcular puntos clave (máximos, mínimos, ceros) para un rango de tiempo
function calculateKeyPoints(minTime, maxTime, type) {
    const omega = calculateOmega();
    const period = calculatePeriod();
    const maximos = [];
    const minimos = [];
    const ceros = [];
    
    // Para posición x(t) = A·cos(ωt + φ):
    // - Máximos: ωt + φ = 2πn → t = (2πn - φ)/ω
    // - Mínimos: ωt + φ = π + 2πn → t = ((2n+1)π - φ)/ω
    // - Ceros: ωt + φ = π/2 + πn → t = (π/2 + πn - φ)/ω
    
    // Para velocidad v(t) = -Aω·sin(ωt + φ):
    // - Máximos: ωt + φ = 3π/2 + 2πn
    // - Mínimos: ωt + φ = π/2 + 2πn
    // - Ceros: ωt + φ = πn
    
    // Para aceleración a(t) = -Aω²·cos(ωt + φ):
    // - Máximos: ωt + φ = π + 2πn
    // - Mínimos: ωt + φ = 2πn
    // - Ceros: ωt + φ = π/2 + πn
    
    const phi = params.phase;
    const A = getAmplitude(); // Usa la amplitud correcta según el modo
    
    // Calcular cuántos períodos caben en el rango visible (con margen)
    const startN = Math.floor((minTime * omega + phi) / (2 * Math.PI)) - 1;
    const endN = Math.ceil((maxTime * omega + phi) / (2 * Math.PI)) + 1;
    
    for (let n = startN; n <= endN; n++) {
        let tMax, tMin, tZero1, tZero2;
        let yMax, yMin;
        
        if (type === 'position') {
            // Posición: x(t) = A·cos(ωt + φ)
            tMax = (2 * Math.PI * n - phi) / omega;
            tMin = ((2 * n + 1) * Math.PI - phi) / omega;
            tZero1 = (Math.PI / 2 + 2 * Math.PI * n - phi) / omega;
            tZero2 = (3 * Math.PI / 2 + 2 * Math.PI * n - phi) / omega;
            yMax = A;
            yMin = -A;
        } else if (type === 'velocity') {
            // Velocidad: v(t) = -Aω·sin(ωt + φ)
            tMax = (3 * Math.PI / 2 + 2 * Math.PI * n - phi) / omega;
            tMin = (Math.PI / 2 + 2 * Math.PI * n - phi) / omega;
            tZero1 = (2 * Math.PI * n - phi) / omega;
            tZero2 = (Math.PI + 2 * Math.PI * n - phi) / omega;
            yMax = A * omega;
            yMin = -A * omega;
        } else if (type === 'acceleration') {
            // Aceleración: a(t) = -Aω²·cos(ωt + φ)
            tMax = ((2 * n + 1) * Math.PI - phi) / omega;
            tMin = (2 * Math.PI * n - phi) / omega;
            tZero1 = (Math.PI / 2 + 2 * Math.PI * n - phi) / omega;
            tZero2 = (3 * Math.PI / 2 + 2 * Math.PI * n - phi) / omega;
            yMax = A * omega * omega;
            yMin = -A * omega * omega;
        }
        
        // Agregar puntos si están en el rango visible y ya han ocurrido
        if (tMax >= minTime && tMax <= maxTime && tMax <= simulation.time) {
            maximos.push({ x: tMax, y: yMax });
        }
        if (tMin >= minTime && tMin <= maxTime && tMin <= simulation.time) {
            minimos.push({ x: tMin, y: yMin });
        }
        if (tZero1 >= minTime && tZero1 <= maxTime && tZero1 <= simulation.time) {
            ceros.push({ x: tZero1, y: 0 });
        }
        if (tZero2 >= minTime && tZero2 <= maxTime && tZero2 <= simulation.time) {
            ceros.push({ x: tZero2, y: 0 });
        }
    }
    
    return { maximos, minimos, ceros };
}

function resetCharts() {
    // Usar rangos basados en amplitud máxima y omega actual
    const omega = calculateOmega();
    const maxAmp = simulationMode === 'spring' ? MAX_AMPLITUDE_SPRING : MAX_AMPLITUDE_PENDULUM;
    const maxPosition = maxAmp * 1.1;
    const maxVelocity = maxAmp * omega * 1.1;
    const maxAcceleration = maxAmp * omega * omega * 1.1;
    
    const resetSingleChart = (chart, maxY) => {
        if (chart) {
            // Limpiar todos los datasets
            chart.data.datasets.forEach(dataset => {
                dataset.data = [];
            });
            chart.options.scales.x.min = 0;
            chart.options.scales.x.max = graphData.timeWindow;
            chart.options.scales.y.min = -maxY;
            chart.options.scales.y.max = maxY;
            chart.update('none');
        }
    };
    
    resetSingleChart(positionChart, maxPosition);
    resetSingleChart(velocityChart, maxVelocity);
    resetSingleChart(accelerationChart, maxAcceleration);
}

// =====================
// Utilidades
// =====================
function lerp(a, b, t) {
    return a + (b - a) * t;
}

console.log('Simulador de Movimiento Armónico Simple cargado correctamente.');

