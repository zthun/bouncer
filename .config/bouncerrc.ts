export default {
  servers: [
    {
      type: "https",
      domains: [
        {
          host: `database.local.zthunworks.com`,
          paths: {
            "/": "http://bouncer-mongo-admin:8081",
          },
        },
        {
          host: `email.local.zthunworks.com`,
          paths: {
            "/": "http://bouncer-email",
          },
        },
      ],
    },
  ],
  domains: [
    {
      host: `database.local.zthunworks.com`,
      paths: {
        "/": "http://bouncer-mongo-admin:8081",
      },
    },
    {
      host: `email.local.zthunworks.com`,
      paths: {
        "/": "http://bouncer-email",
      },
    },
  ],
};
