"use strict";
const User = use("App/Models/User");
const Database = use("Database");
const Mail = use("Mail");
const sgMail = use("@sendgrid/mail");
const Env = use("Env");

class RegisteredListController {
  async showUsersList({ view }) {
    const linkedUsers = await Database.table("Globals_rep.dbo.client_contact_details_rep").distinct("client_contact_name").distinct("client_contact_id");

      const linkedEmployees = await Database.table("clover_departments").distinct("name").distinct("id");
    const users = await Database.from("users")
      .orderBy("accstatus", "desc")
      .whereNot({ member_type: 1 });
      
    return view.render("admin.usersList", {users,linkedUsers,linkedEmployees});
  }

  async activateUser({ request, response }) {
    const accountToActivate = await User.query()
      .where("email", request.input("email"))
      .first();
    if (!accountToActivate) {
      session.flash({
        alert: {
          type: "error",
          message: "This account does not exist",
        },
      });
    } else {
      accountToActivate.accstatus = 1;
      await accountToActivate.save();
      // send confirmation emailg

      sgMail.setApiKey(Env.get("SENDGRID_API_KEY"));
      const msg = {
        to: request.input("email"),
        from: "dev@clover-brokers.com",
        subject: "You Clover account is activated",
        html: "<strong>You Clover account is activated</strong>",
      };
      sgMail
        .send(msg)
        .then(() => {
          const flashMessage = "Message Sent to the activated account";
        })
        .catch((error) => {
          const flashMessage = error.response.body;
          console.log("RegisteredListController", error.response.body);
        });
      return response.redirect("/admin/registered");
    }
  }
  async chooseMemberType({ request, response }) {
    const memberId=request.input("registeredUserId")
    const memberType=request.input("member_type")
    const today = new Date().toLocaleDateString();

    await Database.table("users").where('id', memberId)
    .update({
      'linked_user_id': null,
      'member_type': memberType,
      'updated_at': today,
    });

    return response.redirect("back");
  }
  async disableUser({ request, response }) {
    // return console.log(request.input("status"))
    const accountToDelete = await User.query()
      .where("email", request.input("email"))
      .first();
    if (!accountToDelete) {
      session.flash({
        alert: {
          type: "error",
          message: "This account does not exist.",
        },
      });
    } else {
      accountToDelete.accstatus = request.input("status");
      accountToDelete.linked_user_id = 0;
      await accountToDelete.save();
      let today = new Date().toLocaleDateString();
      await Database.table("acc_status_history").insert({
        user_id: accountToDelete.id,
        acc_status: 3,
        date_update: today,
      });
      // send confirmation emailg
      sgMail.setApiKey(Env.get("SENDGRID_API_KEY"));
      if (request.input("status") == 3) {
        const msg = {
          to: request.input("email"),
          from: Env.get("SENDGRID_EMAIL_FROM"),
          subject: "You Clover account is disabled",
          templateId: "dbfd1441-36e0-46c5-baf2-f62c64e737f0",
          substitutions: {
            name: accountToDelete.firstname,
            email: request.input("email"),
          },
        };
        sgMail.send(msg, (error, result) => {
          if (error) {
            console.log(error);
          } else {
            console.log("That's wassup!");
          }
        });
      } else {
        const msg = {
          to: request.input("email"),
          from: Env.get("SENDGRID_EMAIL_FROM"),
          subject: "You Clover account is enabled",
          templateId: "00e8d369-b915-4dec-81ab-731426069c85",
          substitutions: {
            name: accountToDelete.firstname,
            email: request.input("email"),
          },
        };
        sgMail.send(msg, (error, result) => {
          if (error) {
            console.log(error);
          } else {
            console.log("That's wassup!");
          }
        });
      }
    }
    return response.redirect("back");
  }

  async linkUser({ request, response }) {
    const accountToLink = await User.query()
      .where("id", request.input("registeredUserId"))
      .first();
    accountToLink.linked_user_id = request.input("linkedUserId");
    accountToLink.accstatus = 2;
    await accountToLink.save();
    let today = new Date().toLocaleDateString();
    const accStatusHistory = await Database.table("acc_status_history").insert({
      user_id: accountToLink.id,
      acc_status: 2,
      date_update: today,
    });

    return response.redirect("back");
  }

  async unlinkUser({ request, response }) {
    const accountToUnlink = await User.query()
      .where("email", request.input("email"))
      .first();
    if (!accountToUnlink) {
      session.flash({
        alert: {
          type: "error",
          message: "This account does not exist",
        },
      });
    } else {
      accountToUnlink.linked_user_id = 0;
      accountToUnlink.accstatus = 1;
      await accountToUnlink.save();
      let today = new Date().toLocaleDateString();
      const accStatusHistory = await Database.table(
        "acc_status_history"
      ).insert({
        user_id: accountToUnlink.id,
        acc_status: 1,
        date_update: today,
      });
    }
    return response.redirect("back");
  }
}

module.exports = RegisteredListController;
