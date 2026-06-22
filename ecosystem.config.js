module.exports = {
  apps: [
    {
      name: 'api-personal',
      script: './server.js',
      cwd: '/var/www/rfid-inventory-api',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DB_NAME: process.env.PERSONAL_DB_NAME,
      },
    },
    {
      name: 'api-shared',
      script: './server.js',
      cwd: '/var/www/rfid-inventory-api',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        DB_NAME: process.env.SHARED_DB_NAME,
      },
    },
  ],
};