var life_star = require('life_star'),
    args = process.argv,
    env = require('../scripts/env');

/* args[2]: port
   args[3]: LivelyKernel directory to serve from
   args[4]: testing DISabled?
   args[5]: log level for logger: error, warning, info, debug...
*/

life_star(env.LIFE_STAR_HOST,
          parseInt(args[2]),
          args[3],
          args[4] !== 'notesting',
          args[5]);
