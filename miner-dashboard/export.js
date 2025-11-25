// Export functionality for QuaiMiner CORE
const PDFDocument = require('pdfkit');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { blocks, stats } = require('./database');

class ExportService {
    constructor() {
        this.exportsDir = path.join(__dirname, 'data', 'exports');
        this.init();
    }
    
    async init() {
        try {
            await fsPromises.mkdir(this.exportsDir, { recursive: true });
        } catch (error) {
            console.error('Error creating exports directory:', error);
        }
    }
    
    async exportPDF(options = {}) {
        const {
            startDate = null,
            endDate = null,
            includeCharts = true,
            includeStats = true
        } = options;
        
        const doc = new PDFDocument();
        const filename = `quaiminer-report-${Date.now()}.pdf`;
        const filepath = path.join(this.exportsDir, filename);
        
        return new Promise((resolve, reject) => {
            const stream = fs.createWriteStream(filepath);
            doc.pipe(stream);
            
            // Header
            doc.fontSize(20).text('QuaiMiner CORE Report', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
            doc.moveDown(2);
            
            // Block statistics
            if (includeStats) {
                const blockStats = blocks.getStats();
                doc.fontSize(16).text('Block Statistics', { underline: true });
                doc.moveDown();
                doc.fontSize(12);
                doc.text(`Total Blocks: ${blockStats.total}`);
                doc.text(`Last 24 Hours: ${blockStats.last24h}`);
                doc.text(`Last 7 Days: ${blockStats.last7d}`);
                doc.text(`Total Reward: ${blockStats.totalReward.toFixed(6)} QUAI`);
                doc.moveDown(2);
            }
            
            // Recent blocks
            const recentBlocks = blocks.getAll(50);
            if (recentBlocks.length > 0) {
                doc.fontSize(16).text('Recent Validated Blocks', { underline: true });
                doc.moveDown();
                
                recentBlocks.forEach((block, index) => {
                    if (index < 20) { // Limit to 20 for PDF
                        doc.fontSize(10);
                        doc.text(`Block #${block.block_number} - ${block.chain} - ${new Date(block.timestamp).toLocaleString()} - ${block.reward} QUAI`);
                    }
                });
            }
            
            doc.end();
            
            stream.on('finish', () => resolve({ filename, filepath }));
            stream.on('error', reject);
        });
    }
    
    async exportCSV(options = {}) {
        const {
            type = 'blocks', // 'blocks' or 'stats'
            startDate = null,
            endDate = null
        } = options;
        
        const filename = `quaiminer-${type}-${Date.now()}.csv`;
        const filepath = path.join(this.exportsDir, filename);
        
        if (type === 'blocks') {
            const data = blocks.getAll(1000);
            const csvWriter = createCsvWriter({
                path: filepath,
                header: [
                    { id: 'block_number', title: 'Block Number' },
                    { id: 'block_hash', title: 'Block Hash' },
                    { id: 'timestamp', title: 'Timestamp' },
                    { id: 'chain', title: 'Chain' },
                    { id: 'reward', title: 'Reward' },
                    { id: 'tx_hash', title: 'Transaction Hash' }
                ]
            });
            
            await csvWriter.writeRecords(data.map(b => ({
                block_number: b.block_number,
                block_hash: b.block_hash || '',
                timestamp: new Date(b.timestamp).toISOString(),
                chain: b.chain,
                reward: b.reward,
                tx_hash: b.tx_hash || ''
            })));
        } else if (type === 'stats') {
            const hours = options.hours || 24;
            const data = stats.getHistory(hours);
            const csvWriter = createCsvWriter({
                path: filepath,
                header: [
                    { id: 'timestamp', title: 'Timestamp' },
                    { id: 'hash_rate', title: 'Hash Rate (MH/s)' },
                    { id: 'accepted_shares', title: 'Accepted Shares' },
                    { id: 'rejected_shares', title: 'Rejected Shares' },
                    { id: 'power_usage', title: 'Power Usage (W)' },
                    { id: 'temperature', title: 'Temperature (°C)' },
                    { id: 'fan_speed', title: 'Fan Speed (%)' }
                ]
            });
            
            await csvWriter.writeRecords(data.map(s => ({
                timestamp: new Date(s.timestamp).toISOString(),
                hash_rate: s.hash_rate,
                accepted_shares: s.accepted_shares,
                rejected_shares: s.rejected_shares,
                power_usage: s.power_usage,
                temperature: s.temperature,
                fan_speed: s.fan_speed
            })));
        }
        
        return { filename, filepath };
    }
    
    async exportJSON(options = {}) {
        const {
            type = 'blocks',
            startDate = null,
            endDate = null
        } = options;
        
        const filename = `quaiminer-${type}-${Date.now()}.json`;
        const filepath = path.join(this.exportsDir, filename);
        
        let data;
        if (type === 'blocks') {
            data = blocks.getAll(1000);
        } else if (type === 'stats') {
            const hours = options.hours || 24;
            data = stats.getHistory(hours);
        }
        
        await fsPromises.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');
        return { filename, filepath };
    }
}

module.exports = new ExportService();

