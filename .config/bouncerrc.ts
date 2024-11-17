export default {
  domains: [
    {
      name: `database.local.zthunworks.com`,
      paths: {
        "/": "bouncer-mongo-admin:8081",
      },
    },
    {
      name: `email.local.zthunworks.com`,
      paths: {
        "/": "bouncer-email",
      },
    },
  ],
};
