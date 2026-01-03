export default {
  servers: [
    {
      type: "https",
      security: {
        domain: "local.zthunworks.com",
      },
      domains: {
        "database.local.zthunworks.com": {
          "/": "http://bouncer-mongo-admin:8081",
        },
        "email.local.zthunworks.com": {
          "/": "http://bouncer-email",
        },
      },
    },
  ],
};
