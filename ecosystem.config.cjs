/** PM2 bilan serverda doimiy ishlatish: pm2 start ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: "mkus-crm",
      script: "npm",
      args: "start",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
