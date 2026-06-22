module.exports = {
  apps: [
    {
      name: 'api-personal',
      script: './server.js',
      cwd: '/var/www/rfid-inventory-api',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: process.env.PERSONAL_DATABASE_URL,
        API_KEY: process.env.API_KEY,
      },
    },
    {
      name: 'api-shared',
      script: './server.js',
      cwd: '/var/www/rfid-inventory-api',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        DATABASE_URL: process.env.SHARED_DATABASE_URL,
        API_KEY: process.env.API_KEY,
      },
    },
  ],
};