export default {
  domains: [
    {
      name: `database.local.zthunworks.com`,
      paths: {
        "/": "helpful-mongo-admin:8081",
      },
    },
    {
      name: `email.local.zthunworks.com`,
      paths: {
        "/": "helpful-email",
      },
    },
  ],
};
