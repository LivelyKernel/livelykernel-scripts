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
    subservers: args[7] !== 'undefined' ? JSON.parse(args[7]) : null,
    useManifestCaching: args[8] == 'true',
    enableSSL: args[9] == 'true',
    enableSSLClientAuth: args[10] == 'true',
    sslServerKey: args[11] !== 'undefined' ? args[11] : null,
    sslServerCert: args[12] !== 'undefined' ? args[12] : null,
    sslCACert: args[13] !== 'undefined' ? args[13] : null
});
