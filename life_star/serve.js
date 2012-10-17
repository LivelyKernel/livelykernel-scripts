var life_star = require('life_star'),
    args = process.argv,
    env = require('../scripts/env');

life_star({
    host: env.LIFE_STAR_HOST,
    port: parseInt(args[2]),
    fsNode: args[3], // LivelyKernel directory to serve from
    enableTesting: args[4] !== 'notesting',
    logLevel: args[5], // log level for logger: error, warning, info, debug
    behindProxy: args[6] == 'true',
    enableSSL: args[7] == 'true',
    enableSSLClientAuth: args[8] == 'true',
    sslServerKey: args[9] !== 'undefined' ? args[9] : null,
    sslServerCert: args[10] !== 'undefined' ? args[10] : null,
    sslCACert: args[11] !== 'undefined' ? args[11] : null
});
