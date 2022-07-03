const { Model, DataTypes } = require("sequelize");
const sequelize = require("./dbConfig");
const User = require("./User");

class Recent extends Model {}

Recent.init(
  {
    caller_id: {
      type: DataTypes.UUIDV4,
      allowNull: false,
    },
    get_call_id: {
      type: DataTypes.UUIDV4,
      allowNull: false,
    },
    is_answered: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
  },

  {
    sequelize,
    modelName: "recent",
    timestamps: true,
  }
);

User.hasMany(Recent, {
  sourceKey: "id",
  as: "outgoingCalls",
  foreignKey: "caller_id",
});

User.hasMany(Recent, {
  sourceKey: "id",
  as: "incomingCalls",
  foreignKey: "get_call_id",
});

Recent.belongsTo(User, { foreignKey: "caller_id", as: "caller_info" });

Recent.belongsTo(User, { foreignKey: "get_call_id", as: "get_call_info" });

module.exports = Recent;
