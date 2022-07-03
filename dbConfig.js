const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("talk", "user", "pass", {
  dialect: "sqlite",
  host: "./talk2me.sqlite",
});

module.exports = sequelize;
