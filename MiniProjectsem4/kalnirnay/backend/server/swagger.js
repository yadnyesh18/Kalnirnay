const swaggerAutogen = require('swagger-autogen')();

const doc = {
    info: {
        title: 'Kalnirnay API',
        description: 'Kalnirnay Management System API',
        version: '1.0.0',
    },
    host: 'localhost:8080',
    schemes: ['http'],
};

const outputFile = './swagger-output.json';
const endpointsFiles = [
    './routes/events.js',
    './routes/users.js',
    './routes/groups.js',
    './routes/checklists.js',
];

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
    require('./server.js');
});