/**
 * Alert Manager - Comprehensive alert system for QuaiMiner CORE OS
 * Supports: Email, Telegram, Discord, and in-app notifications
 */

const nodemailer = require('nodemailer');
const axios = require('axios');
const logger = require('./logger');
const { notifications } = require('../database');

class AlertManager {
    constructor() {
        this.alertRules = [];
        this.alertHistory = [];
        this.telegramBot = null;
        this.emailTransporter = null;
        this.discordWebhook = null;
        this.loadConfiguration();
        this.initializeChannels();
    }

    /**
     * Load alert configuration from database or environment
     */
    loadConfiguration() {
        // Load from environment variables or database
        this.config = {
            email: {
                enabled: process.env.ALERT_EMAIL_ENABLED === 'true',
                smtp: {
                    host: process.env.ALERT_EMAIL_SMTP_HOST || 'smtp.gmail.com',
                    port: parseInt(process.env.ALERT_EMAIL_SMTP_PORT || '587'),
                    secure: process.env.ALERT_EMAIL_SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.ALERT_EMAIL_USER || '',
                        pass: process.env.ALERT_EMAIL_PASS || ''
                    }
                },
                to: process.env.ALERT_EMAIL_TO || ''
            },
            telegram: {
                enabled: process.env.ALERT_TELEGRAM_ENABLED === 'true',
                botToken: process.env.ALERT_TELEGRAM_BOT_TOKEN || '',
                chatId: process.env.ALERT_TELEGRAM_CHAT_ID || ''
            },
            discord: {
                enabled: process.env.ALERT_DISCORD_ENABLED === 'true',
                webhookUrl: process.env.ALERT_DISCORD_WEBHOOK_URL || ''
            }
        };

        // Default alert rules
        this.alertRules = [
            {
                id: 'rig_down',
                name: 'Rig Offline',
                type: 'rig_status',
                condition: { field: 'isMining', operator: 'equals', value: false },
                enabled: true,
                channels: ['email', 'telegram', 'discord'],
                cooldown: 300 // 5 minutes
            },
            {
                id: 'high_temp',
                name: 'High GPU Temperature',
                type: 'gpu_temp',
                condition: { field: 'temperature', operator: 'greaterThan', value: 80 },
                enabled: true,
                channels: ['email', 'telegram'],
                cooldown: 600 // 10 minutes
            },
            {
                id: 'low_hashrate',
                name: 'Low Hashrate',
                type: 'hashrate',
                condition: { field: 'hashRate', operator: 'lessThan', value: 5 },
                enabled: true,
                channels: ['telegram', 'discord'],
                cooldown: 300
            },
            {
                id: 'high_reject_rate',
                name: 'High Reject Rate',
                type: 'shares',
                condition: { field: 'rejectRate', operator: 'greaterThan', value: 0.1 },
                enabled: true,
                channels: ['email'],
                cooldown: 900 // 15 minutes
            },
            {
                id: 'gpu_failure',
                name: 'GPU Failure',
                type: 'gpu_status',
                condition: { field: 'status', operator: 'equals', value: 'error' },
                enabled: true,
                channels: ['email', 'telegram', 'discord'],
                cooldown: 0 // Immediate
            }
        ];
    }

    /**
     * Initialize alert channels
     */
    initializeChannels() {
        // Initialize email transporter
        if (this.config.email.enabled && this.config.email.smtp.auth.user) {
            try {
                this.emailTransporter = nodemailer.createTransport({
                    host: this.config.email.smtp.host,
                    port: this.config.email.smtp.port,
                    secure: this.config.email.smtp.secure,
                    auth: this.config.email.smtp.auth
                });
                logger.info('Email alert channel initialized');
            } catch (error) {
                logger.error('Failed to initialize email transporter:', error);
            }
        }

        // Initialize Telegram bot
        if (this.config.telegram.enabled && this.config.telegram.botToken) {
            try {
                const TelegramBot = require('node-telegram-bot-api');
                this.telegramBot = new TelegramBot(this.config.telegram.botToken, { polling: false });
                logger.info('Telegram alert channel initialized');
            } catch (error) {
                logger.error('Failed to initialize Telegram bot:', error);
            }
        }

        // Discord webhook is ready to use (no initialization needed)
        if (this.config.discord.enabled && this.config.discord.webhookUrl) {
            logger.info('Discord alert channel configured');
        }
    }

    /**
     * Update configuration
     */
    updateConfiguration(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.initializeChannels();
    }

    /**
     * Add or update alert rule
     */
    addAlertRule(rule) {
        const existingIndex = this.alertRules.findIndex(r => r.id === rule.id);
        if (existingIndex >= 0) {
            this.alertRules[existingIndex] = rule;
        } else {
            this.alertRules.push(rule);
        }
    }

    /**
     * Remove alert rule
     */
    removeAlertRule(ruleId) {
        this.alertRules = this.alertRules.filter(r => r.id !== ruleId);
    }

    /**
     * Check if alert should be sent (cooldown check)
     */
    shouldSendAlert(ruleId, context = {}) {
        const lastAlert = this.alertHistory.find(
            a => a.ruleId === ruleId && 
            Date.now() - a.timestamp < (this.alertRules.find(r => r.id === ruleId)?.cooldown || 0) * 1000
        );
        return !lastAlert;
    }

    /**
     * Evaluate alert rule condition
     */
    evaluateCondition(condition, data) {
        const { field, operator, value } = condition;
        const fieldValue = this.getNestedValue(data, field);

        switch (operator) {
            case 'equals':
                return fieldValue === value;
            case 'notEquals':
                return fieldValue !== value;
            case 'greaterThan':
                return parseFloat(fieldValue) > parseFloat(value);
            case 'lessThan':
                return parseFloat(fieldValue) < parseFloat(value);
            case 'greaterThanOrEqual':
                return parseFloat(fieldValue) >= parseFloat(value);
            case 'lessThanOrEqual':
                return parseFloat(fieldValue) <= parseFloat(value);
            case 'contains':
                return String(fieldValue).includes(String(value));
            default:
                return false;
        }
    }

    /**
     * Get nested value from object
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, prop) => current?.[prop], obj);
    }

    /**
     * Check mining stats and trigger alerts
     */
    async checkMiningStats(stats) {
        for (const rule of this.alertRules) {
            if (!rule.enabled) continue;

            // Check cooldown
            if (!this.shouldSendAlert(rule.id, stats)) continue;

            // Evaluate condition
            if (this.evaluateCondition(rule.condition, stats)) {
                await this.triggerAlert(rule, stats);
            }
        }
    }

    /**
     * Trigger alert
     */
    async triggerAlert(rule, context) {
        const alert = {
            ruleId: rule.id,
            ruleName: rule.name,
            type: rule.type,
            timestamp: Date.now(),
            context: context,
            channels: rule.channels || []
        };

        // Record alert
        this.alertHistory.push(alert);
        if (this.alertHistory.length > 1000) {
            this.alertHistory = this.alertHistory.slice(-1000);
        }

        // Create notification in database
        try {
            notifications.create(1, rule.type, rule.name, this.formatAlertMessage(rule, context));
        } catch (error) {
            logger.error('Failed to create notification:', error);
        }

        // Send to configured channels
        const promises = [];
        if (rule.channels.includes('email') && this.config.email.enabled) {
            promises.push(this.sendEmailAlert(rule, context));
        }
        if (rule.channels.includes('telegram') && this.config.telegram.enabled) {
            promises.push(this.sendTelegramAlert(rule, context));
        }
        if (rule.channels.includes('discord') && this.config.discord.enabled) {
            promises.push(this.sendDiscordAlert(rule, context));
        }

        await Promise.allSettled(promises);
        logger.info(`Alert triggered: ${rule.name}`, { ruleId: rule.id, channels: rule.channels });
    }

    /**
     * Format alert message
     */
    formatAlertMessage(rule, context) {
        let message = `🚨 ${rule.name}\n\n`;
        
        switch (rule.type) {
            case 'rig_status':
                message += `Rig Status: ${context.isMining ? 'Mining' : 'Stopped'}\n`;
                if (context.hashRate) message += `Hashrate: ${context.hashRate} MH/s\n`;
                break;
            case 'gpu_temp':
                message += `GPU: ${context.gpuName || 'Unknown'}\n`;
                message += `Temperature: ${context.temperature}°C\n`;
                message += `Threshold: ${rule.condition.value}°C\n`;
                break;
            case 'hashrate':
                message += `Current Hashrate: ${context.hashRate} MH/s\n`;
                message += `Threshold: ${rule.condition.value} MH/s\n`;
                break;
            case 'shares':
                message += `Reject Rate: ${(context.rejectRate * 100).toFixed(2)}%\n`;
                message += `Accepted: ${context.acceptedShares || 0}\n`;
                message += `Rejected: ${context.rejectedShares || 0}\n`;
                break;
            case 'gpu_status':
                message += `GPU: ${context.gpuName || 'Unknown'}\n`;
                message += `Status: ${context.status}\n`;
                message += `Error: ${context.error || 'Unknown error'}\n`;
                break;
            default:
                message += JSON.stringify(context, null, 2);
        }

        message += `\nTime: ${new Date().toLocaleString()}`;
        return message;
    }

    /**
     * Send email alert
     */
    async sendEmailAlert(rule, context) {
        if (!this.emailTransporter || !this.config.email.to) {
            return;
        }

        try {
            await this.emailTransporter.sendMail({
                from: this.config.email.smtp.auth.user,
                to: this.config.email.to,
                subject: `🚨 QuaiMiner Alert: ${rule.name}`,
                text: this.formatAlertMessage(rule, context),
                html: this.formatAlertMessageHTML(rule, context)
            });
            logger.info('Email alert sent', { ruleId: rule.id });
        } catch (error) {
            logger.error('Failed to send email alert:', error);
        }
    }

    /**
     * Format alert message as HTML
     */
    formatAlertMessageHTML(rule, context) {
        const message = this.formatAlertMessage(rule, context);
        return `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
                <div style="background-color: #fff; padding: 20px; border-radius: 5px; border-left: 4px solid #ff6b6b;">
                    <h2 style="color: #ff6b6b; margin-top: 0;">🚨 ${rule.name}</h2>
                    <pre style="background-color: #f9f9f9; padding: 15px; border-radius: 3px; white-space: pre-wrap;">${message}</pre>
                    <p style="color: #666; font-size: 12px; margin-top: 20px;">
                        QuaiMiner CORE OS Alert System
                    </p>
                </div>
            </div>
        `;
    }

    /**
     * Send Telegram alert
     */
    async sendTelegramAlert(rule, context) {
        if (!this.telegramBot || !this.config.telegram.chatId) {
            return;
        }

        try {
            await this.telegramBot.sendMessage(
                this.config.telegram.chatId,
                this.formatAlertMessage(rule, context),
                { parse_mode: 'Markdown' }
            );
            logger.info('Telegram alert sent', { ruleId: rule.id });
        } catch (error) {
            logger.error('Failed to send Telegram alert:', error);
        }
    }

    /**
     * Send Discord alert
     */
    async sendDiscordAlert(rule, context) {
        if (!this.config.discord.webhookUrl) {
            return;
        }

        try {
            const embed = {
                title: `🚨 ${rule.name}`,
                description: this.formatAlertMessage(rule, context),
                color: 0xff6b6b, // Red color
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'QuaiMiner CORE OS'
                }
            };

            await axios.post(this.config.discord.webhookUrl, {
                embeds: [embed]
            });
            logger.info('Discord alert sent', { ruleId: rule.id });
        } catch (error) {
            logger.error('Failed to send Discord alert:', error);
        }
    }

    /**
     * Get alert history
     */
    getAlertHistory(limit = 100) {
        return this.alertHistory.slice(-limit).reverse();
    }

    /**
     * Get alert statistics
     */
    getAlertStats() {
        const stats = {
            total: this.alertHistory.length,
            last24h: this.alertHistory.filter(a => Date.now() - a.timestamp < 86400000).length,
            byType: {},
            byChannel: {
                email: 0,
                telegram: 0,
                discord: 0
            }
        };

        this.alertHistory.forEach(alert => {
            stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
            alert.channels.forEach(channel => {
                stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1;
            });
        });

        return stats;
    }
}

// Singleton instance
let alertManagerInstance = null;

function getAlertManager() {
    if (!alertManagerInstance) {
        alertManagerInstance = new AlertManager();
    }
    return alertManagerInstance;
}

module.exports = {
    AlertManager,
    getAlertManager
};

