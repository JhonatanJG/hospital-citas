const { DB_ENGINE } = require('../config/env');
let repos;
if (DB_ENGINE === 'postgres') {
  repos = require('./postgres/index');
} else {
  repos = require('./firestore/index');
}
module.exports = repos;
