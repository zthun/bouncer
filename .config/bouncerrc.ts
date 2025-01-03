export default {
  domains: [
    {
      host: `database.local.zthunworks.com`,
      paths: {
        "/": "bouncer-mongo-admin:8081",
      },
    },
    {
      host: `email.local.zthunworks.com`,
      paths: {
        "/": "bouncer-email",
      },
    },
  ],
};
