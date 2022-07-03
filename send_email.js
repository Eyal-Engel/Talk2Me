const e = require("express");
var nodemailer = require("nodemailer");
// npm install nodemailer

module.exports = function send_ver_code_email(email) {
  const code = Math.floor(100000 + Math.random() * 900000);

  return new Promise((resolve) => {
    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "Talk2MeAppBot@gmail.com",
        pass: "ylsoppwbwdqbnpmv",
      },
    });

    var mailOptions = {
      from: "Talk2MeAppBot@gmail.com",
      to: email,
      subject: "Reset Password Request- Talk2Me",
      text:
        "~Talk2Me~ \n\n" +
        "Enter this code to reset your password: \n" +
        code.toString() +
        "\n\n Thank you, \n Talk2Me Team",
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
        resolve(false);
      } else {
        console.log("Email sent: " + info.response);
        resolve(code);
      }
    });
  });
};
