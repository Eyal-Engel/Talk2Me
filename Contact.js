const { Model, DataTypes } = require("sequelize");
const sequelize = require("./dbConfig");
const User = require("./User");

class Contact extends Model {}

Contact.init(
  {
    user_id: {
      type: DataTypes.UUIDV4,
      allowNull: false,
    },
    contact_id: {
      type: DataTypes.UUIDV4,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "contacts",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["user_id", "contact_id"],
      },
    ],
  }
);

User.hasMany(Contact, {
  sourceKey: "id",
  foreignKey: "user_id",
});
Contact.belongsTo(User, { foreignKey: "user_id", as: "user_info" });

Contact.belongsTo(User, { foreignKey: "contact_id", as: "contact_info" });

module.exports = Contact;
