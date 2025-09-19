require('dotenv').config();
module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/hydra',
    migrations: { directory: './migrations' },
  },
};
