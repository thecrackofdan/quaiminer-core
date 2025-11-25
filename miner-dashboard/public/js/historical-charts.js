// Historical Data Charts for QuaiMiner CORE
class HistoricalCharts {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.charts = {};
        this.init();
    }
    
    init() {
        // Create chart containers if they don't exist
        this.createChartContainers();
        
        // Initialize charts
        this.initHashRateChart();
        this.initTemperatureChart();
        this.initPowerChart();
        this.initSharesChart();
        
        // Update charts periodically
        setInterval(() => this.updateAllCharts(), 60000); // Every minute
        this.updateAllCharts();
    }
    
    createChartContainers() {
        const chartsSection = document.getElementById('historicalChartsSection');
        if (!chartsSection) {
            // Create section if it doesn't exist
            const section = document.createElement('section');
            section.id = 'historicalChartsSection';
            section.className = 'historical-charts-section';
            section.innerHTML = `
                <h2 class="section-title-red">
                    📊 Historical Data
                    <span class="info-icon" data-tooltip="Historical mining statistics over time">ℹ️</span>
                </h2>
                <div class="charts-grid">
                    <div class="chart-card">
                        <h3>Hash Rate</h3>
                        <canvas id="hashRateChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <h3>Temperature</h3>
                        <canvas id="temperatureChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <h3>Power Usage</h3>
                        <canvas id="powerChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <h3>Shares</h3>
                        <canvas id="sharesChart"></canvas>
                    </div>
                </div>
            `;
            // Insert after validated blocks section
            const blocksSection = document.querySelector('.validated-blocks-section');
            if (blocksSection) {
                blocksSection.after(section);
            }
        }
    }
    
    initHashRateChart() {
        const ctx = document.getElementById('hashRateChart');
        if (!ctx) return;
        
        this.charts.hashRate = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Hash Rate (MH/s)',
                    data: [],
                    borderColor: '#FF0000',
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#CCCCCC' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#CCCCCC' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        });
    }
    
    initTemperatureChart() {
        const ctx = document.getElementById('temperatureChart');
        if (!ctx) return;
        
        this.charts.temperature = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Temperature (°C)',
                    data: [],
                    borderColor: '#FFAA00',
                    backgroundColor: 'rgba(255, 170, 0, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: { color: '#CCCCCC' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#CCCCCC' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        });
    }
    
    initPowerChart() {
        const ctx = document.getElementById('powerChart');
        if (!ctx) return;
        
        this.charts.power = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Power (W)',
                    data: [],
                    borderColor: '#00FF00',
                    backgroundColor: 'rgba(0, 255, 0, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#CCCCCC' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#CCCCCC' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        });
    }
    
    initSharesChart() {
        const ctx = document.getElementById('sharesChart');
        if (!ctx) return;
        
        this.charts.shares = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Accepted',
                    data: [],
                    backgroundColor: 'rgba(0, 255, 0, 0.5)'
                }, {
                    label: 'Rejected',
                    data: [],
                    backgroundColor: 'rgba(255, 0, 0, 0.5)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#CCCCCC' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#CCCCCC' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        });
    }
    
    async updateAllCharts() {
        try {
            const hours = 24;
            const data = await this.dashboard.fetchHistoricalData(hours);
            
            if (!data || data.length === 0) return;
            
            // Process data for charts
            const labels = data.map(d => {
                const date = new Date(d.timestamp);
                return date.toLocaleTimeString();
            });
            
            // Hash rate
            if (this.charts.hashRate) {
                this.charts.hashRate.data.labels = labels;
                this.charts.hashRate.data.datasets[0].data = data.map(d => d.hash_rate || 0);
                this.charts.hashRate.update('none');
            }
            
            // Temperature
            if (this.charts.temperature) {
                this.charts.temperature.data.labels = labels;
                this.charts.temperature.data.datasets[0].data = data.map(d => d.temperature || 0);
                this.charts.temperature.update('none');
            }
            
            // Power
            if (this.charts.power) {
                this.charts.power.data.labels = labels;
                this.charts.power.data.datasets[0].data = data.map(d => d.power_usage || 0);
                this.charts.power.update('none');
            }
            
            // Shares
            if (this.charts.shares) {
                this.charts.shares.data.labels = labels;
                this.charts.shares.data.datasets[0].data = data.map(d => d.accepted_shares || 0);
                this.charts.shares.data.datasets[1].data = data.map(d => d.rejected_shares || 0);
                this.charts.shares.update('none');
            }
        } catch (error) {
            console.error('Error updating charts:', error);
        }
    }
}

// Export for use in dashboard
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistoricalCharts;
}

