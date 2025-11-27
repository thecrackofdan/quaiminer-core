/**
 * Swagger/OpenAPI Configuration
 */
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Quai GPU Miner Dashboard API',
            version: '1.0.0',
            description: 'API documentation for Quai Network mining dashboard',
            contact: {
                name: 'API Support',
                url: 'https://github.com/thecrackofdan/Quai-GPU-Miner'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                HealthResponse: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            example: 'ok'
                        },
                        timestamp: {
                            type: 'string',
                            format: 'date-time'
                        },
                        uptime: {
                            type: 'number',
                            example: 12345.67
                        }
                    }
                },
                MiningStats: {
                    type: 'object',
                    properties: {
                        hashRate: {
                            type: 'number',
                            example: 10.5
                        },
                        shares: {
                            type: 'object',
                            properties: {
                                accepted: { type: 'integer', example: 123 },
                                rejected: { type: 'integer', example: 5 }
                            }
                        },
                        earnings: {
                            type: 'number',
                            example: 0.001234
                        },
                        powerUsage: {
                            type: 'number',
                            example: 150
                        },
                        isMining: {
                            type: 'boolean',
                            example: true
                        }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            example: 'Internal server error'
                        },
                        message: {
                            type: 'string',
                            example: 'An error occurred'
                        }
                    }
                }
            }
        }
    },
    apis: ['./server.js', './routes/*.js'] // Path to API files
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

