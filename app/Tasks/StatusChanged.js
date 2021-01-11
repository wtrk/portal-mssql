'use strict'
const Database = use("Database");
const Task = use('Task')
const sgMail = use("@sendgrid/mail");
const Env = use("Env");

class StatusChanged extends Task {
  static get schedule() {
    return '* * * * *'
  }

  async handle() {
    const queryDb = await Database
      .table('add_health_temp_cats')
      .innerJoin('users', function () {
        this
          .on("status_update", 1)
          .andOn('add_health_temp_cats.person_id', 'users.linked_user_id')
      })
    if (queryDb.length > 0) {
      queryDb.forEach((a, index) => {
        let email = a.email;
        let firstname = a.firstname;
        let policyId = a.policy_id;
        let policyStatus = a.status;

        // send confirmation emailg
        sgMail.setApiKey(Env.get("SENDGRID_API_KEY"));
        const msg = {
          //to: request.input("email"),
          to: email,
          from: Env.get("SENDGRID_EMAIL_FROM"),
          subject: "Policy:" + policyId,
          templateId: "7454ef8b-ff35-45aa-b864-c367bba100a5",
          substitutions: {
            name: firstname,
            policyId: policyId,
            policyStatus: policyStatus
          }
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



      });

      await Database
        .table('add_health_temp_cats')
        .update("status_update", 0)

      return console.log('updated requests status email sent')
    }




  }
}

module.exports = StatusChanged
