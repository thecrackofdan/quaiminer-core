// Multi-GPU Visualization for QuaiMiner CORE
class MultiGPUVisualization {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.init();
    }
    
    init() {
        this.createGPUVisualization();
        setInterval(() => this.updateGPUDisplay(), 5000);
        this.updateGPUDisplay();
    }
    
    createGPUVisualization() {
        const section = document.createElement('section');
        section.id = 'multiGPUSection';
        section.className = 'multi-gpu-section';
        section.innerHTML = `
            <h2 class="section-title-red">
                🎮 Multi-GPU Status
                <span class="info-icon" data-tooltip="Individual GPU statistics and controls">ℹ️</span>
            </h2>
            <div id="gpuGrid" class="gpu-grid-enhanced">
                <!-- GPU cards will be dynamically generated -->
            </div>
        `;
        
        // Insert after GPU information section
        const gpuSection = document.querySelector('.gpu-section');
        if (gpuSection) {
            gpuSection.after(section);
        }
    }
    
    updateGPUDisplay() {
        if (!this.dashboard || !this.dashboard.miningData) return;
        
        const gpus = this.dashboard.miningData.gpus || [];
        const container = document.getElementById('gpuGrid');
        if (!container) return;
        
        if (gpus.length === 0) {
            container.innerHTML = '<div class="no-gpus">No GPUs detected</div>';
            return;
        }
        
        container.innerHTML = gpus.map((gpu, index) => `
            <div class="gpu-card-enhanced" data-gpu-id="${gpu.id || index}">
                <div class="gpu-card-header">
                    <h3>${gpu.name || `GPU ${index + 1}`}</h3>
                    <span class="gpu-status-indicator ${gpu.temperature > 80 ? 'warning' : 'normal'}"></span>
                </div>
                <div class="gpu-stats-grid">
                    <div class="gpu-stat">
                        <span class="gpu-stat-label">Hash Rate</span>
                        <span class="gpu-stat-value">${(gpu.hashRate || 0).toFixed(2)}</span>
                        <span class="gpu-stat-unit">MH/s</span>
                    </div>
                    <div class="gpu-stat">
                        <span class="gpu-stat-label">Temperature</span>
                        <span class="gpu-stat-value ${gpu.temperature > 80 ? 'warning' : ''}">${(gpu.temperature || 0).toFixed(1)}</span>
                        <span class="gpu-stat-unit">°C</span>
                    </div>
                    <div class="gpu-stat">
                        <span class="gpu-stat-label">Fan Speed</span>
                        <span class="gpu-stat-value">${(gpu.fanSpeed || 0).toFixed(0)}</span>
                        <span class="gpu-stat-unit">%</span>
                    </div>
                    <div class="gpu-stat">
                        <span class="gpu-stat-label">Power</span>
                        <span class="gpu-stat-value">${(gpu.powerUsage || 0).toFixed(0)}</span>
                        <span class="gpu-stat-unit">W</span>
                    </div>
                </div>
                <div class="gpu-efficiency">
                    <span class="efficiency-label">Efficiency:</span>
                    <span class="efficiency-value">${((gpu.hashRate || 0) / (gpu.powerUsage || 1)).toFixed(3)} MH/s per W</span>
                </div>
                <div class="gpu-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min((gpu.temperature || 0) / 100 * 100, 100)}%"></div>
                    </div>
                    <span class="progress-label">Temperature: ${(gpu.temperature || 0).toFixed(1)}°C</span>
                </div>
            </div>
        `).join('');
    }
}

// Auto-initialize
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof dashboard !== 'undefined') {
            window.multiGPU = new MultiGPUVisualization(dashboard);
        }
    });
}

