module.exports = {
  apps: [
    {
      name: "synersat-app",
      script: "server.js",
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
