// Profitability Calculator for QuaiMiner CORE
class ProfitabilityCalculator {
    constructor() {
        this.electricityRate = 0.10; // $0.10 per kWh default
        this.quaiPrice = 0.01; // $0.01 per QUAI default
        this.init();
    }
    
    init() {
        this.createCalculatorUI();
        this.loadSavedSettings();
        this.attachEventListeners();
    }
    
    createCalculatorUI() {
        const section = document.createElement('section');
        section.id = 'profitabilitySection';
        section.className = 'profitability-section';
        section.innerHTML = `
            <h2 class="section-title-red">
                💰 Profitability Calculator
                <span class="info-icon" data-tooltip="Calculate mining profitability based on current stats">ℹ️</span>
            </h2>
            <div class="calculator-grid">
                <div class="calculator-inputs">
                    <div class="input-group">
                        <label>Hash Rate (MH/s):</label>
                        <input type="number" id="calcHashRate" step="0.1" placeholder="10.5">
                    </div>
                    <div class="input-group">
                        <label>Power Usage (W):</label>
                        <input type="number" id="calcPower" step="1" placeholder="150">
                    </div>
                    <div class="input-group">
                        <label>Electricity Rate ($/kWh):</label>
                        <input type="number" id="calcElectricity" step="0.01" value="0.10">
                    </div>
                    <div class="input-group">
                        <label>QUAI Price ($):</label>
                        <input type="number" id="calcQuaiPrice" step="0.001" value="0.01">
                    </div>
                    <div class="input-group">
                        <label>Pool Fee (%):</label>
                        <input type="number" id="calcPoolFee" step="0.1" value="0" min="0" max="100">
                    </div>
                    <button class="btn-primary" id="calculateBtn">Calculate</button>
                    <button class="btn-secondary" id="useCurrentStatsBtn">Use Current Stats</button>
                </div>
                <div class="calculator-results">
                    <h3>Results</h3>
                    <div class="result-card">
                        <div class="result-item">
                            <span class="result-label">Daily Revenue:</span>
                            <span class="result-value" id="dailyRevenue">$0.00</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Daily Cost:</span>
                            <span class="result-value" id="dailyCost">$0.00</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Daily Profit:</span>
                            <span class="result-value" id="dailyProfit">$0.00</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Monthly Profit:</span>
                            <span class="result-value" id="monthlyProfit">$0.00</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Yearly Profit:</span>
                            <span class="result-value" id="yearlyProfit">$0.00</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">ROI (Break-even):</span>
                            <span class="result-value" id="roi">-- days</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Efficiency:</span>
                            <span class="result-value" id="efficiency">-- MH/s per W</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insert after historical charts
        const chartsSection = document.getElementById('historicalChartsSection');
        if (chartsSection) {
            chartsSection.after(section);
        } else {
            document.querySelector('.validated-blocks-section')?.after(section);
        }
    }
    
    loadSavedSettings() {
        const saved = localStorage.getItem('profitabilitySettings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.electricityRate = settings.electricityRate || 0.10;
            this.quaiPrice = settings.quaiPrice || 0.01;
            
            const electricityInput = document.getElementById('calcElectricity');
            const quaiPriceInput = document.getElementById('calcQuaiPrice');
            if (electricityInput) electricityInput.value = this.electricityRate;
            if (quaiPriceInput) quaiPriceInput.value = this.quaiPrice;
        }
    }
    
    attachEventListeners() {
        const calculateBtn = document.getElementById('calculateBtn');
        const useCurrentBtn = document.getElementById('useCurrentStatsBtn');
        
        if (calculateBtn) {
            calculateBtn.onclick = () => this.calculate();
        }
        
        if (useCurrentBtn) {
            useCurrentBtn.onclick = () => this.useCurrentStats();
        }
        
        // Auto-save settings
        const electricityInput = document.getElementById('calcElectricity');
        const quaiPriceInput = document.getElementById('calcQuaiPrice');
        
        if (electricityInput) {
            electricityInput.onchange = () => {
                this.electricityRate = parseFloat(electricityInput.value) || 0.10;
                this.saveSettings();
            };
        }
        
        if (quaiPriceInput) {
            quaiPriceInput.onchange = () => {
                this.quaiPrice = parseFloat(quaiPriceInput.value) || 0.01;
                this.saveSettings();
            };
        }
    }
    
    useCurrentStats() {
        if (typeof dashboard !== 'undefined' && dashboard.miningData) {
            const hashRateInput = document.getElementById('calcHashRate');
            const powerInput = document.getElementById('calcPower');
            
            if (hashRateInput) hashRateInput.value = dashboard.miningData.hashRate || 0;
            if (powerInput) powerInput.value = dashboard.miningData.powerUsage || 0;
            
            this.calculate();
        }
    }
    
    calculate() {
        const hashRate = parseFloat(document.getElementById('calcHashRate')?.value) || 0;
        const power = parseFloat(document.getElementById('calcPower')?.value) || 0;
        const electricity = parseFloat(document.getElementById('calcElectricity')?.value) || this.electricityRate;
        const quaiPrice = parseFloat(document.getElementById('calcQuaiPrice')?.value) || this.quaiPrice;
        const poolFee = parseFloat(document.getElementById('calcPoolFee')?.value) || 0;
        
        if (hashRate === 0 || power === 0) {
            alert('Please enter hash rate and power usage');
            return;
        }
        
        // Simplified calculation (would need actual network difficulty for accurate results)
        // This is a placeholder - real calculation needs network hash rate and block time
        const estimatedDailyQuai = (hashRate / 1000) * 24; // Simplified
        const dailyRevenue = estimatedDailyQuai * quaiPrice * (1 - poolFee / 100);
        const dailyCost = (power / 1000) * 24 * electricity;
        const dailyProfit = dailyRevenue - dailyCost;
        
        // Update UI
        this.updateResults({
            dailyRevenue,
            dailyCost,
            dailyProfit,
            monthlyProfit: dailyProfit * 30,
            yearlyProfit: dailyProfit * 365,
            efficiency: hashRate / power
        });
    }
    
    updateResults(results) {
        const formatCurrency = (value) => `$${value.toFixed(2)}`;
        
        document.getElementById('dailyRevenue').textContent = formatCurrency(results.dailyRevenue);
        document.getElementById('dailyCost').textContent = formatCurrency(results.dailyCost);
        document.getElementById('dailyProfit').textContent = formatCurrency(results.dailyProfit);
        document.getElementById('monthlyProfit').textContent = formatCurrency(results.monthlyProfit);
        document.getElementById('yearlyProfit').textContent = formatCurrency(results.yearlyProfit);
        document.getElementById('efficiency').textContent = `${results.efficiency.toFixed(2)} MH/s per W`;
    }
    
    saveSettings() {
        localStorage.setItem('profitabilitySettings', JSON.stringify({
            electricityRate: this.electricityRate,
            quaiPrice: this.quaiPrice
        }));
    }
}

// Auto-initialize
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.profitabilityCalculator = new ProfitabilityCalculator();
    });
}

