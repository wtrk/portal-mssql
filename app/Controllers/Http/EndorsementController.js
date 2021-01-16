"use strict";
const User = use("App/Models/User");
const Database = use("Database");
const Env = use("Env");
const Helpers = use("Helpers");
const sgMail = use("@sendgrid/mail");
const Axios = use("axios");

function getPolicies(userId) {
  return Database.raw('select distinct [policies] .* from [Globals_rep].[dbo].[policies_rep] as [policies] inner join [Globals_rep].[dbo].[contact_links_tbl_rep] as [b] on [policies].[master_policy_clover_id] = [b].[master_policy_clover_id] where [b].[client_contact_id] =  ?', [userId])


}
function getDistinctMaster(userId){
  return Database.table("Globals_rep.dbo.policies_rep as policies")
    .innerJoin("Globals_rep.dbo.contact_links_tbl_rep as b", function () {
      this.on("policies.master_policy_clover_id", "b.master_policy_clover_id");
    })
    .where("b.client_contact_id", userId).distinct(
      "policies.master_account"
    );
}

class EndorsementController {
  async dashboard({ view, auth }) {
    const listOfClients = await Database.table(
      "Globals_rep.dbo.client_contact_details_rep"
    );
    const policiesCount = await Database.table(
      "Globals_rep.dbo.contact_links_tbl_rep"
    )
      .where("client_contact_id", auth.user.linked_user_id)
      .distinct("master_policy_clover_id");
    const ongoingAddMembers = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .where("status", 1);
    const ongoingAddRequests = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .where("status", 1)
      .distinct("web_req_id");

    const ongoingDeleteMembers = await Database.table("delete_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .where("status", 1);
    const ongoingDeleteRequests = await Database.table(
      "delete_health_temp_cats"
    )
      .where("person_id", auth.user.linked_user_id)
      .where("status", 1)
      .distinct("web_req_id");

    let addRequests = await Database.table("add_health_temps")
      .innerJoin("add_health_temp_cats", function () {
        this.on(
          "add_health_temps.Add_health_temp_id",
          "add_health_temp_cats.Add_health_temp_id"
        ).andOn(
          "add_health_temps.web_req_id",
          "add_health_temp_cats.web_req_id"
        );
      })
      .where("add_health_temp_cats.person_id", auth.user.linked_user_id)
      .whereNot("add_health_temp_cats.endorsement_id", null)
      .limit(4);

    let deleteRequests = await Database.table("delete_health_temps as a")
      .innerJoin("Globals_rep.dbo.contact_links_tbl_rep as b", function () {
        this.on("a.client_contact_id", "b.client_contact_id");
      })
      .where("b.client_contact_id", auth.user.linked_user_id)
      .limit(4);
    return view.render("endorsement/dashboard", {
      policiesLength: policiesCount.length,
      ongoingAddMembersLength: ongoingAddMembers.length,
      ongoingAddRequestsLength: ongoingAddRequests.length,
      ongoingDeleteMembersLength: ongoingDeleteMembers.length,
      ongoingDeleteRequestsLength: ongoingDeleteRequests.length,
      addRequests: addRequests,
      deleteRequests: deleteRequests,
      listOfClients: listOfClients,
    });
  }
  async viewAs({ auth, request, response }) {
    console.log(request.input("user_id"));
    return "ddd";
  }
  async myPolicies({ view, auth }) {
    const policies = await getPolicies(auth.user.linked_user_id);
    const distinctMaster = await getDistinctMaster(auth.user.linked_user_id)
    return view.render("endorsement/my_policies", {
      policies: policies,
      distinctContacts: distinctMaster,
    });
  }
  async myRequestsDetails({ view, auth, request }) {
    const myRequestsData = request.body;
    let myRequestsEntries = [];
    if (myRequestsData.section == "add") {
      myRequestsEntries = await Database.table("add_health_temps")
        .innerJoin("add_health_temp_cats", function () {
          this.on(
            "add_health_temps.Add_health_temp_id",
            "add_health_temp_cats.Add_health_temp_id"
          ).andOn(
            "add_health_temps.web_req_id",
            "add_health_temp_cats.web_req_id"
          );
        })
        .where(
          "add_health_temp_cats.endorsement_id",
          myRequestsData.endorsement_id
        )
        .where("status", myRequestsData.status);
    } else {
      myRequestsEntries = await Database.table("delete_health_temps")
        .innerJoin("delete_health_temp_cats", function () {
          this.on(
            "delete_health_temps.Add_health_temp_id",
            "delete_health_temp_cats.Add_health_temp_id"
          ).andOn(
            "delete_health_temps.web_req_id",
            "delete_health_temp_cats.web_req_id"
          );
        })
        .where(
          "delete_health_temp_cats.endorsement_id",
          myRequestsData.endorsement_id
        )
        .where("status", myRequestsData.status);
    }

    return view.render("endorsement/my_requests_details", {
      myRequestsEntries: myRequestsEntries,
      endorsement_id: myRequestsData.endorsement_id,
    });
  }
  async myAdditionRequests({ view, auth, session }) {
    let webReqIdFromAddHealthTemp;
    let endorsementIdFromAddHealthTemp;
    if (session.get("webReqId")) {
      webReqIdFromAddHealthTemp = session.get("webReqId");
      const endorsementIdFromDb = await Database.table("add_health_temp_cats")
        .where("person_id", auth.user.linked_user_id)
        .where("web_req_id", webReqIdFromAddHealthTemp)
        .distinct("endorsement_id");
      endorsementIdFromAddHealthTemp = endorsementIdFromDb.map(
        (a) => a.endorsement_id
      );
    }

    const policiesFromAddDb = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .where("status", 1)
      .whereNot("endorsement_id", null)
      .distinct("policy_id");
    let policiesFromAddArray = policiesFromAddDb.map((a) => a.policy_id);

    const policiesFromAdd = await Database.table(
      "Globals_rep.dbo.contact_links_tbl_rep as a"
    )
      .where("a.client_contact_id", auth.user.linked_user_id)
      .whereIn("a.master_policy_clover_id", policiesFromAddArray);

    const endorsIdFromAddDb = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .whereNot("endorsement_id", null)
      .distinct("endorsement_id")
      .distinct("policy_id")
      .distinct("date");

    const ongoingFtpRequests = await Database.table("add_health_temps")
      .where("client_contact_id", auth.user.linked_user_id)
      .where("ftp", 1);
    const invalidFtpRequests = await Database.table("add_health_temp_errors")
      .where("client_contact_id", auth.user.linked_user_id)
      .where("ftp", 1);

    const invalidRequests = await Database.select(
      "b.master_account",
      "b.first_name",
      "b.last_name",
      "b.cor",
      "b.created_at",
      "a.policy_id",
      "a.Add_health_temp_id",
      "a.web_req_id"
    )
      .from("add_health_temp_error_cats as a")
      .innerJoin("add_health_temp_errors as b", function () {
        this.on("a.Add_health_temp_id", "b.Add_health_temp_id").andOn(
          "a.web_req_id",
          "b.web_req_id"
        );
      })
      .where("b.client_contact_id", auth.user.linked_user_id)
      .whereNot("b.ftp", 1);
    const personDbRejected = await Database.select(
      "add_health_temps.first_name",
      "add_health_temps.last_name",
      "add_health_temps.created_at",
      "add_health_temp_cats.reason_rejection",
      "add_health_temp_cats.policy_id",
      "add_health_temp_cats.lob",
      "add_health_temp_cats.Add_health_temp_id",
      "add_health_temp_cats.web_req_id"
    )
      .from("add_health_temp_cats")
      .innerJoin("add_health_temps", function () {
        this.on(
          "add_health_temp_cats.Add_health_temp_id",
          "add_health_temps.Add_health_temp_id"
        ).andOn(
          "add_health_temp_cats.web_req_id",
          "add_health_temps.web_req_id"
        );
      })
      .where("add_health_temp_cats.status", "3")
      .whereNot("add_health_temps.ftp", 1);

    return view.render("endorsement/my_requests_addition", {
      policiesFromAdd: policiesFromAdd,
      endorsIdFromAddDb: endorsIdFromAddDb,
      personDbRejected: personDbRejected,
      ongoingFtpRequests: ongoingFtpRequests,
      invalidFtpRequests: invalidFtpRequests,
      invalidRequests: invalidRequests,
    });
  }
  async byPolicy({ view, auth, session }) {
    const policiesFromAddDb = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .whereIn("status", [0, 1])
      .distinct("policy_id");
    let policiesFromAdd = policiesFromAddDb.map((a) => a.policy_id);

    const contactsFromPolicies = await Database.table(
      "Globals_rep.dbo.contact_links_tbl_rep as a"
    )
      .where("a.client_contact_id", auth.user.linked_user_id)
      .whereIn("a.master_policy_clover_id", policiesFromAdd).debug(true);

    const endorsIdFromAddDb = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .whereIn("status", [0, 1])
      .distinct("endorsement_id")
      .distinct("policy_id")
      .distinct("date");

      
    return view.render("endorsement/my_addition_requests_sub/by_policy", {
      policiesFromAdd,
      contactsFromPolicies,
      endorsIdFromAddDb,
    });
  }
  async byWebReqId({ view, auth, session }) {
    const webReqIdsDb = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .whereIn("status", [0, 1])
      .distinct("web_req_id");

    const endorsIdFromAddDb = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .whereIn("status", [0, 1])
      .distinct("endorsement_id")
      .distinct("web_req_id")
      .distinct("date");

    return view.render("endorsement/my_addition_requests_sub/by_webreqid", {
      webReqIdsDb: webReqIdsDb,
      endorsIdFromAddDb: endorsIdFromAddDb,
    });
  }
  async completedByPolicy({ view, auth, session }) {
    const policiesFromAddDb = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .where("status", 2)
      .distinct("policy_id");
    let policiesFromAddArray = policiesFromAddDb.map((a) => a.policy_id);
    const policiesFromAdd = await Database.table(
      "Globals_rep.dbo.contact_links_tbl_rep as a"
    )
      .where("a.client_contact_id", auth.user.linked_user_id)
      .whereIn("a.master_policy_clover_id", policiesFromAddArray);

    const endorsIdFromAddDb = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .where("status", 2)
      .distinct("endorsement_id")
      .distinct("policy_id")
      .distinct("date");
    return view.render(
      "endorsement/my_addition_requests_sub/completed_by_policy",
      {
        policiesFromAdd: policiesFromAdd,
        endorsIdFromAddDb: endorsIdFromAddDb,
      }
    );
  }
  async completedByWebReqId({ view, auth, session }) {
    const webReqIdsDb = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .where("status", 2)
      .distinct("web_req_id");
      
    const endorsIdFromAddDb = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .where("status", 2)
      .distinct("endorsement_id")
      .distinct("web_req_id")
      .distinct("date");

    return view.render(
      "endorsement/my_addition_requests_sub/completed_by_webreqid",
      {
        webReqIdsDb: webReqIdsDb,
        endorsIdFromAddDb: endorsIdFromAddDb,
      }
    );
  }

  async myDeletionRequests({ view, auth, session }) {
    let webReqIdFromDeleteHealthTemp;
    let endorsementIdFromDeleteHealthTemp;
    if (session.get("webReqId")) {
      webReqIdFromDeleteHealthTemp = session.get("webReqId");
      const endorsementIdFromDb = await Database.table(
        "delete_health_temp_cats"
      )
        .where("person_id", auth.user.linked_user_id)
        .where("web_req_id", webReqIdFromDeleteHealthTemp)
        .distinct("endorsement_id");
      endorsementIdFromDeleteHealthTemp = endorsementIdFromDb.map(
        (a) => a.endorsement_id
      );
    }

    const policiesFromDeleteDb = await Database.table("delete_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .where("status", 1)
      .whereNot("endorsement_id", null)
      .distinct("policy_id");
    let policiesFromDeleteArray = policiesFromDeleteDb.map((a) => a.policy_id);

    const policiesFromDelete = await Database.table(
      "Globals_rep.dbo.contact_links_tbl_rep as a"
    )
      .where("a.client_contact_id", auth.user.linked_user_id)
      .whereIn("a.master_policy_clover_id", policiesFromDeleteArray);

    const endorsIdFromDeleteDb = await Database.table("delete_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .whereNot("endorsement_id", null)
      .distinct("endorsement_id")
      .distinct("policy_id")
      .distinct("date");

    const personDbRejected = await Database.select(
      "a.first_name",
      "a.last_name",
      "a.created_at",
      "a.company_name",
      "b.reason_rejection",
      "b.policy_id",
      "b.Add_health_temp_id",
      "b.web_req_id"
    )
      .from("delete_health_temp_cats as b")
      .innerJoin("delete_health_temps as a", function () {
        this.on("b.Add_health_temp_id", "a.Add_health_temp_id").andOn(
          "b.web_req_id",
          "a.web_req_id"
        );
      })
      .where("b.status", 3);
    console.log(personDbRejected);

    return view.render("endorsement/my_requests_deletion", {
      policiesFromDelete: policiesFromDelete,
      endorsIdFromDeleteDb: endorsIdFromDeleteDb,
      personDbRejected: personDbRejected,
    });
  }
  async deletionByPolicy({ view, auth, session }) {
    const policiesFromDeleteDb = await Database.table("delete_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .whereIn("status", [0, 1])
      .distinct("policy_id");
    let policiesFromDelete = policiesFromDeleteDb.map((a) => a.policy_id);

    const contactsFromPolicies = await Database.table(
      "Globals_rep.dbo.contact_links_tbl_rep as a"
    )
      .where("a.client_contact_id", auth.user.linked_user_id)
      .whereIn("a.master_policy_clover_id", policiesFromDelete);

    const endorsIdFromDeleteDb = await Database.table("delete_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .whereIn("status", [0, 1])
      .distinct("endorsement_id")
      .distinct("policy_id")
      .distinct("date");
    return view.render("endorsement/my_deletion_requests_sub/by_policy", {
      contactsFromPolicies,  policiesFromDelete, endorsIdFromDeleteDb,
    });
  }
  async deletionByWebReqId({ view, auth, session }) {
    const webReqIdsDb = await Database.table("delete_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .whereIn("status", [0, 1])
      .distinct("web_req_id");

    const endorsIdFromDeleteDb = await Database.table("delete_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .whereIn("status", [0, 1])
      .distinct("endorsement_id")
      .distinct("web_req_id")
      .distinct("date");

    return view.render("endorsement/my_deletion_requests_sub/by_webreqid", {
      webReqIdsDb: webReqIdsDb,
      endorsIdFromDeleteDb: endorsIdFromDeleteDb,
    });
  }
  async completedDeletionByPolicy({ view, auth, session }) {
    const policiesFromDeleteDb = await Database.table("delete_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .where("status", 2)
      .distinct("policy_id");
    let policiesFromDeleteArray = policiesFromDeleteDb.map((a) => a.policy_id);
    const policiesFromDelete = await Database.table(
      "Globals_rep.dbo.contact_links_tbl_rep as a"
    )
      .where("a.client_contact_id", auth.user.linked_user_id)
      .whereIn("a.master_policy_clover_id", policiesFromDeleteArray);

    const endorsIdFromDeleteDb = await Database.table("delete_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .where("status", 2)
      .distinct("endorsement_id")
      .distinct("policy_id")
      .distinct("date");
    return view.render(
      "endorsement/my_deletion_requests_sub/completed_by_policy",
      {
        policiesFromDelete: policiesFromDelete,
        endorsIdFromDeleteDb: endorsIdFromDeleteDb,
      }
    );
  }
  async completedDeletionByWebReqId({ view, auth, session }) {
    const webReqIdsDb = await Database.table("delete_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .where("status", 2)
      .distinct("web_req_id");
      
    const endorsIdFromDeleteDb = await Database.table("delete_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .where("status", 2)
      .distinct("endorsement_id")
      .distinct("web_req_id")
      .distinct("date");

    return view.render(
      "endorsement/my_deletion_requests_sub/completed_by_webreqid",
      {
        webReqIdsDb: webReqIdsDb,
        endorsIdFromDeleteDb: endorsIdFromDeleteDb,
      }
    );
  }

  async deleteRejectedPerson({ auth, request, response }) {
    const insertedData = request.input("data")[0];
    const memberToDelete = await Database.table("add_health_temp_cats")
      .where("policy_id", insertedData.policy_id)
      .where("web_req_id", insertedData.web_req_id)
      .where("Add_health_temp_id", insertedData.Add_health_temp_id)
      .update({
        status: 4,
        last_status_updated: insertedData.last_status_updated,
      });

    const cta_log = {
      person_id: auth.user.linked_user_id,
      form: "add_health_temp",
      action: "Delete Rejected Person",
      date: new Date(),
    };
    await Database.from("cta_log").insert(cta_log);

    return "You have successfully deleted this member";
  }
  async resubmitRejectedPerson({ auth, request, response, session, view }) {
    let memberToResubmit = await Database.table("add_health_temps")
      .where("web_req_id", request.body.web_req_id)
      .where("Add_health_temp_id", request.body.Add_health_temp_id)
      .first();
    const memberCatsToResubmit = await Database.table("add_health_temp_cats")
      .where("web_req_id", request.body.web_req_id)
      .where("Add_health_temp_id", request.body.Add_health_temp_id)
      .distinct("cat")
      .distinct("policy_id")
      .distinct("limits");
    memberCatsToResubmit.forEach((e, i) => {
      if (e.limits == null) {
        memberToResubmit[e.policy_id] = e.cat;
      } else {
        memberToResubmit[e.policy_id] = e.limits;
      }
    });
    session.put("rejected_webReqId", request.body.web_req_id);
    session.put("rejected_policyId", request.body.policy_id);
    const renameKey = (object, key, newKey) => {
      const clonedObj = clone(object);
      const targetKey = clonedObj[key];
      delete clonedObj[key];
      clonedObj[newKey] = targetKey;
      return clonedObj;
    };
    const clone = (obj) => Object.assign({}, obj);

    memberToResubmit = renameKey(
      memberToResubmit,
      "company_name",
      "Company Name"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "s_department",
      "Shop or Site or Department"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "employee_staff_id",
      "Employee Staff ID"
    );
    memberToResubmit = renameKey(memberToResubmit, "first_name", "First Name");
    memberToResubmit = renameKey(
      memberToResubmit,
      "second_name",
      "Second Name"
    );
    memberToResubmit = renameKey(memberToResubmit, "last_name", "Family Name");
    memberToResubmit = renameKey(memberToResubmit, "relation", "Relation");
    memberToResubmit = renameKey(memberToResubmit, "dob", "DOB");
    memberToResubmit = renameKey(memberToResubmit, "gender", "Gender");
    memberToResubmit = renameKey(
      memberToResubmit,
      "nationality",
      "Nationality"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "marital_status",
      "Marital Status"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "cost_sharing",
      "Cost Sharing"
    );
    memberToResubmit = renameKey(memberToResubmit, "position", "Position");
    memberToResubmit = renameKey(memberToResubmit, "grade", "Grade");
    memberToResubmit = renameKey(memberToResubmit, "mobile", "Mobile No");
    memberToResubmit = renameKey(memberToResubmit, "email", "E-mail");
    memberToResubmit = renameKey(
      memberToResubmit,
      "national_id",
      "NATIONAL ID"
    );

    memberToResubmit = renameKey(memberToResubmit, "saudi_id", "SAUDI ID");
    memberToResubmit = renameKey(memberToResubmit, "iqama_id", "IQAMA NO.");
    memberToResubmit = renameKey(
      memberToResubmit,
      "iqama_expire_at",
      "IQAMA EXPIRY DATE"
    );
    memberToResubmit = renameKey(memberToResubmit, "sponsor_id", "SPONSOR ID");
    memberToResubmit = renameKey(memberToResubmit, "kuwait_id", "KUWAIT (KID)");
    memberToResubmit = renameKey(memberToResubmit, "qatar_id", "QATAR (QID)");
    memberToResubmit = renameKey(
      memberToResubmit,
      "emirates_id",
      "EMIRATES ID NO."
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "passport_num",
      "PASSPORT NO."
    );
    memberToResubmit = renameKey(memberToResubmit, "uid", "UID");
    memberToResubmit = renameKey(
      memberToResubmit,
      "gdrfa_file_number",
      "GDRFAFileNumber"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "emirate_of_visa_issuance",
      "EMIRATE OF VISA ISSUANCE"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "member_type",
      "MEMBER TYPE"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "entity_type",
      "ENTITY TYPE"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "establishment_id",
      "ESTABLISHMENT ID#"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "previously_insured",
      "Has the member been previously insured?"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "residential_location",
      "RESIDENTIAL LOCATION"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "work_location",
      "WORK LOCATION"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "employees_salary_bracket",
      "EMPLOYEES SALARY BRACKET"
    );
    memberToResubmit = renameKey(memberToResubmit, "commission", "COMMISSION");
    memberToResubmit = renameKey(
      memberToResubmit,
      "entity_contact_number",
      "ENTITY CONTACT NUMBER"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "entity_email_id",
      "ENTITY E-MAIL ID"
    );
    return view.render("endorsement/add_a_member", {
      cor: memberToResubmit.cor,
      master_account: memberToResubmit.master_account,
      section: "resubmitted",
      memberToResubmit: memberToResubmit,
    });
  }
  async showResubmitRejectedPerson({ auth, session, response, view }) {
    const memberToResubmitSession = session.get("memberToResubmit");
    var cor = memberToResubmitSession.cor;
    let memberToResubmit = {
      "Company Name": memberToResubmitSession["company_name"],
      "Shop or Site or Department": memberToResubmitSession["company_name"],
      "Employee Staff ID": memberToResubmitSession["company_name"],
      "First Name": memberToResubmitSession["first_name"],
      "Second Name": memberToResubmitSession["second_name"],
      "Family Name": memberToResubmitSession["company_name"],
      Relation: memberToResubmitSession["relation"],
      DOB: memberToResubmitSession["dob"],
      Gender: memberToResubmitSession["gender"],
      Nationality: memberToResubmitSession["nationality"],
      "Marital Status": memberToResubmitSession["marital_status"],
      "Cost Sharing": memberToResubmitSession["cost_sharing"],
      Position: memberToResubmitSession["position"],
      Grade: memberToResubmitSession["grade"],
      "Mobile No": memberToResubmitSession["mobile"],
      "E-mail": memberToResubmitSession["email"],
      "NATIONAL ID": memberToResubmitSession["company_name"],
      "SAUDI ID": memberToResubmitSession["saudi_id"],
      "IQAMA NO.": memberToResubmitSession["iqama_id"],
      "IQAMA EXPIRY DATE": memberToResubmitSession["iqama_expire_at"],
      "SPONSOR ID": memberToResubmitSession["sponsor_id"],
      "KUWAIT (KID)": memberToResubmitSession["kuwait_id"],
      "QATAR (QID)": memberToResubmitSession["qatar_id"],
      "EMIRATES ID NO.": memberToResubmitSession["emirates_id"],
      "PASSPORT NO.": memberToResubmitSession["passport_num"],
      UID: memberToResubmitSession["uid"],
      GDRFAFileNumber: memberToResubmitSession["gdrfa_file_number"],
      "EMIRATE OF VISA ISSUANCE":
        memberToResubmitSession["emirate_of_visa_issuance"],
      "MEMBER TYPE": memberToResubmitSession["member_type"],
      "ENTITY TYPE": memberToResubmitSession["entity_type"],
      "ESTABLISHMENT ID#": memberToResubmitSession["establishment_id"],
      "Has the member been previously insured?":
        memberToResubmitSession["previously_insured"],
      "RESIDENTIAL LOCATION": memberToResubmitSession["residential_location"],
      "WORK LOCATION": memberToResubmitSession["work_location"],
      "EMPLOYEES SALARY BRACKET":
        memberToResubmitSession["employees_salary_bracket"],
      COMMISSION: memberToResubmitSession["commission"],
      "ENTITY CONTACT NUMBER": memberToResubmitSession["entity_contact_number"],
      "ENTITY E-MAIL ID": memberToResubmitSession["entity_email_id"],
    };
    if (cor == "DUBAI" || cor == "DUBAI LSB") {
      delete memberToResubmit["NATIONAL ID"];
      delete memberToResubmit["SAUDI ID"];
      delete memberToResubmit["IQAMA NO."];
      delete memberToResubmit["IQAMA EXPIRY DATE"];
      delete memberToResubmit["SPONSOR ID"];
      delete memberToResubmit["KUWAIT (KID)"];
      delete memberToResubmit["QATAR (QID)"];
      delete memberToResubmit["Has the member been previously insured?"];
    } else if (cor == "AUH") {
      delete memberToResubmit["NATIONAL ID"];
      delete memberToResubmit["SAUDI ID"];
      delete memberToResubmit["IQAMA NO."];
      delete memberToResubmit["IQAMA EXPIRY DATE"];
      delete memberToResubmit["SPONSOR ID"];
      delete memberToResubmit["KUWAIT (KID)"];
      delete memberToResubmit["QATAR (QID)"];
      delete memberToResubmit["GDRFAFileNumber"];
      delete memberToResubmit["EMIRATE OF VISA ISSUANCE"];
      delete memberToResubmit["MEMBER TYPE"];
      delete memberToResubmit["ENTITY TYPE"];
      delete memberToResubmit["ESTABLISHMENT ID#"];
      delete memberToResubmit["RESIDENTIAL LOCATION"];
      delete memberToResubmit["WORK LOCATION"];
      delete memberToResubmit["EMPLOYEES SALARY BRACKET"];
      delete memberToResubmit["COMMISSION"];
      delete memberToResubmit["ENTITY CONTACT NUMBER"];
      delete memberToResubmit["ENTITY E-MAIL ID"];
    } else if (cor == "OTHER EMIRATES") {
      delete memberToResubmit["NATIONAL ID"];
      delete memberToResubmit["SAUDI ID"];
      delete memberToResubmit["IQAMA NO."];
      delete memberToResubmit["IQAMA EXPIRY DATE"];
      delete memberToResubmit["SPONSOR ID"];
      delete memberToResubmit["KUWAIT (KID)"];
      delete memberToResubmit["QATAR (QID)"];
      delete memberToResubmit["GDRFAFileNumber"];
      delete memberToResubmit["EMIRATE OF VISA ISSUANCE"];
      delete memberToResubmit["MEMBER TYPE"];
      delete memberToResubmit["ENTITY TYPE"];
      delete memberToResubmit["ESTABLISHMENT ID#"];
      delete memberToResubmit["Has the member been previously insured?"];
      delete memberToResubmit["RESIDENTIAL LOCATION"];
      delete memberToResubmit["WORK LOCATION"];
      delete memberToResubmit["EMPLOYEES SALARY BRACKET"];
      delete memberToResubmit["COMMISSION"];
      delete memberToResubmit["ENTITY CONTACT NUMBER"];
      delete memberToResubmit["ENTITY E-MAIL ID"];
    } else if (cor == "JORDAN") {
      delete memberToResubmit["SAUDI ID"];
      delete memberToResubmit["IQAMA NO."];
      delete memberToResubmit["IQAMA EXPIRY DATE"];
      delete memberToResubmit["SPONSOR ID"];
      delete memberToResubmit["KUWAIT (KID)"];
      delete memberToResubmit["QATAR (QID)"];
      delete memberToResubmit["EMIRATES ID NO."];
      delete memberToResubmit["PASSPORT NO."];
      delete memberToResubmit["UID"];
      delete memberToResubmit["GDRFAFileNumber"];
      delete memberToResubmit["EMIRATE OF VISA ISSUANCE"];
      delete memberToResubmit["MEMBER TYPE"];
      delete memberToResubmit["ENTITY TYPE"];
      delete memberToResubmit["ESTABLISHMENT ID#"];
      delete memberToResubmit["Has the member been previously insured?"];
      delete memberToResubmit["RESIDENTIAL LOCATION"];
      delete memberToResubmit["WORK LOCATION"];
      delete memberToResubmit["EMPLOYEES SALARY BRACKET"];
      delete memberToResubmit["COMMISSION"];
      delete memberToResubmit["ENTITY CONTACT NUMBER"];
      delete memberToResubmit["ENTITY E-MAIL ID"];
    } else if (cor == "KSA") {
      delete memberToResubmit["NATIONAL ID"];
      delete memberToResubmit["KUWAIT (KID)"];
      delete memberToResubmit["QATAR (QID)"];
      delete memberToResubmit["EMIRATES ID NO."];
      delete memberToResubmit["PASSPORT NO."];
      delete memberToResubmit["UID"];
      delete memberToResubmit["GDRFAFileNumber"];
      delete memberToResubmit["EMIRATE OF VISA ISSUANCE"];
      delete memberToResubmit["MEMBER TYPE"];
      delete memberToResubmit["ENTITY TYPE"];
      delete memberToResubmit["ESTABLISHMENT ID#"];
      delete memberToResubmit["Has the member been previously insured?"];
      delete memberToResubmit["RESIDENTIAL LOCATION"];
      delete memberToResubmit["WORK LOCATION"];
      delete memberToResubmit["EMPLOYEES SALARY BRACKET"];
      delete memberToResubmit["COMMISSION"];
      delete memberToResubmit["ENTITY CONTACT NUMBER"];
      delete memberToResubmit["ENTITY E-MAIL ID"];
    } else if (cor == "KUWAIT") {
      delete memberToResubmit["NATIONAL ID"];
      delete memberToResubmit["SAUDI ID"];
      delete memberToResubmit["IQAMA NO."];
      delete memberToResubmit["IQAMA EXPIRY DATE"];
      delete memberToResubmit["SPONSOR ID"];
      delete memberToResubmit["QATAR (QID)"];
      delete memberToResubmit["EMIRATES ID NO."];
      delete memberToResubmit["PASSPORT NO."];
      delete memberToResubmit["UID"];
      delete memberToResubmit["GDRFAFileNumber"];
      delete memberToResubmit["EMIRATE OF VISA ISSUANCE"];
      delete memberToResubmit["MEMBER TYPE"];
      delete memberToResubmit["ENTITY TYPE"];
      delete memberToResubmit["ESTABLISHMENT ID#"];
      delete memberToResubmit["Has the member been previously insured?"];
      delete memberToResubmit["RESIDENTIAL LOCATION"];
      delete memberToResubmit["WORK LOCATION"];
      delete memberToResubmit["EMPLOYEES SALARY BRACKET"];
      delete memberToResubmit["COMMISSION"];
      delete memberToResubmit["ENTITY CONTACT NUMBER"];
      delete memberToResubmit["ENTITY E-MAIL ID"];
    } else if (cor == "QATAR") {
      delete memberToResubmit["NATIONAL ID"];
      delete memberToResubmit["SAUDI ID"];
      delete memberToResubmit["IQAMA NO."];
      delete memberToResubmit["IQAMA EXPIRY DATE"];
      delete memberToResubmit["SPONSOR ID"];
      delete memberToResubmit["KUWAIT (KID)"];
      delete memberToResubmit["EMIRATES ID NO."];
      delete memberToResubmit["PASSPORT NO."];
      delete memberToResubmit["UID"];
      delete memberToResubmit["GDRFAFileNumber"];
      delete memberToResubmit["EMIRATE OF VISA ISSUANCE"];
      delete memberToResubmit["MEMBER TYPE"];
      delete memberToResubmit["ENTITY TYPE"];
      delete memberToResubmit["ESTABLISHMENT ID#"];
      delete memberToResubmit["Has the member been previously insured?"];
      delete memberToResubmit["RESIDENTIAL LOCATION"];
      delete memberToResubmit["WORK LOCATION"];
      delete memberToResubmit["EMPLOYEES SALARY BRACKET"];
      delete memberToResubmit["COMMISSION"];
      delete memberToResubmit["ENTITY CONTACT NUMBER"];
      delete memberToResubmit["ENTITY E-MAIL ID"];
    } else {
      delete memberToResubmit["NATIONAL ID"];
      delete memberToResubmit["SAUDI ID"];
      delete memberToResubmit["IQAMA NO."];
      delete memberToResubmit["IQAMA EXPIRY DATE"];
      delete memberToResubmit["SPONSOR ID"];
      delete memberToResubmit["KUWAIT (KID)"];
      delete memberToResubmit["QATAR (QID)"];
      delete memberToResubmit["EMIRATES ID NO."];
      delete memberToResubmit["PASSPORT NO."];
      delete memberToResubmit["UID"];
      delete memberToResubmit["GDRFAFileNumber"];
      delete memberToResubmit["EMIRATE OF VISA ISSUANCE"];
      delete memberToResubmit["MEMBER TYPE"];
      delete memberToResubmit["ENTITY TYPE"];
      delete memberToResubmit["ESTABLISHMENT ID#"];
      delete memberToResubmit["Has the member been previously insured?"];
      delete memberToResubmit["RESIDENTIAL LOCATION"];
      delete memberToResubmit["WORK LOCATION"];
      delete memberToResubmit["EMPLOYEES SALARY BRACKET"];
      delete memberToResubmit["COMMISSION"];
      delete memberToResubmit["ENTITY CONTACT NUMBER"];
      delete memberToResubmit["ENTITY E-MAIL ID"];
    }
    const emiratesDB = await Database.from("Globals_rep.dbo.Emirates_rep");
    let emirates = emiratesDB.map((a) => a.name);
    const nationalitiesDB = await Database.from("countries").distinct(
      "country_enName"
    );
    let nationalities = nationalitiesDB.map((a) => a.country_enName);
    const memberTypesDB = await Database.from("member_types").distinct("name");
    let memberTypes = memberTypesDB.map((a) => a.name);

    const entityTypesDB = await Database.from("entity_types").distinct("name");
    let entityTypes = entityTypesDB.map((a) => a.name);

    const establishmentIdsDB = await Database.from(
      "establishment_ids"
    ).distinct("name");
    let establishmentIds = establishmentIdsDB.map((a) => a.name);

    const residentialLocationsDB = await Database.from(
      "residential_locations"
    ).distinct("name");
    let residentialLocations = residentialLocationsDB.map((a) => a.name);

    const workLocationsDB = await Database.from("work_locations").distinct(
      "name"
    );
    let workLocations = workLocationsDB.map((a) => a.name);

    const employeesSalaryBracketsDB = await Database.from(
      "employees_salary_brackets"
    ).distinct("name");
    let employeesSalaryBrackets = employeesSalaryBracketsDB.map((a) => a.name);

    return view.render("endorsement/resubmit_a_member", {
      memberToResubmit: memberToResubmit,
      emirates: emirates,
      nationalities: nationalities,
      memberTypes: memberTypes,
      entityTypes: entityTypes,
      establishmentIds: establishmentIds,
      residentialLocations: residentialLocations,
      workLocations: workLocations,
      employeesSalaryBrackets: employeesSalaryBrackets,
      cor: cor,
      webReqId: memberToResubmitSession.web_req_id,
      master_account: memberToResubmitSession.master_account,
    });
  }
  async deleteInvalidRequest({ auth, request, response }) {
    const insertedData = request.input("data")[0];
    const deleteMember = await Database.table("add_health_temp_errors")
      .where("web_req_id", insertedData.web_req_id)
      .delete();
    const deleteCat = await Database.table("add_health_temp_error_cats")
      .where("web_req_id", insertedData.web_req_id)
      .delete();

    const cta_log = {
      person_id: auth.user.linked_user_id,
      form: "add_health_temp",
      action: "Delete Invalid Person",
      date: new Date(),
    };
    await Database.from("cta_log").insert(cta_log);
    return "You have successfully deleted this member";
  }
  async resubmitInvalidRequest({ auth, request, response, session, view }) {
    let memberToResubmit = await Database.table("add_health_temp_errors")
      .where("web_req_id", request.body.web_req_id)
      .where("Add_health_temp_id", request.body.Add_health_temp_id)
      .first();
    const memberCatsToResubmit = await Database.table(
      "add_health_temp_error_cats"
    )
      .where("web_req_id", request.body.web_req_id)
      .where("Add_health_temp_id", request.body.Add_health_temp_id)
      .distinct("cat")
      .distinct("policy_id");
    memberCatsToResubmit.forEach((e, i) => {
      memberToResubmit[e.policy_id] = e.cat;
    });
    session.put("invalid_webReqId", request.body.web_req_id);
    session.put("invalid_addHealthTempId", request.body.Add_health_temp_id);
    const renameKey = (object, key, newKey) => {
      const clonedObj = clone(object);
      const targetKey = clonedObj[key];
      delete clonedObj[key];
      clonedObj[newKey] = targetKey;
      return clonedObj;
    };
    const clone = (obj) => Object.assign({}, obj);

    memberToResubmit = renameKey(
      memberToResubmit,
      "company_name",
      "Company Name"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "s_department",
      "Shop or Site or Department"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "employee_staff_id",
      "Employee Staff ID"
    );
    memberToResubmit = renameKey(memberToResubmit, "first_name", "First Name");
    memberToResubmit = renameKey(
      memberToResubmit,
      "second_name",
      "Second Name"
    );
    memberToResubmit = renameKey(memberToResubmit, "last_name", "Family Name");
    memberToResubmit = renameKey(memberToResubmit, "relation", "Relation");
    memberToResubmit = renameKey(memberToResubmit, "dob", "DOB");
    memberToResubmit = renameKey(memberToResubmit, "gender", "Gender");
    memberToResubmit = renameKey(
      memberToResubmit,
      "nationality",
      "Nationality"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "marital_status",
      "Marital Status"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "cost_sharing",
      "Cost Sharing"
    );
    memberToResubmit = renameKey(memberToResubmit, "position", "Position");
    memberToResubmit = renameKey(memberToResubmit, "grade", "Grade");
    memberToResubmit = renameKey(memberToResubmit, "mobile", "Mobile No");
    memberToResubmit = renameKey(memberToResubmit, "email", "E-mail");
    memberToResubmit = renameKey(
      memberToResubmit,
      "national_id",
      "NATIONAL ID"
    );

    memberToResubmit = renameKey(memberToResubmit, "saudi_id", "SAUDI ID");
    memberToResubmit = renameKey(memberToResubmit, "iqama_id", "IQAMA NO.");
    memberToResubmit = renameKey(
      memberToResubmit,
      "iqama_expire_at",
      "IQAMA EXPIRY DATE"
    );
    memberToResubmit = renameKey(memberToResubmit, "sponsor_id", "SPONSOR ID");
    memberToResubmit = renameKey(memberToResubmit, "kuwait_id", "KUWAIT (KID)");
    memberToResubmit = renameKey(memberToResubmit, "qatar_id", "QATAR (QID)");
    memberToResubmit = renameKey(
      memberToResubmit,
      "emirates_id",
      "EMIRATES ID NO."
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "passport_num",
      "PASSPORT NO."
    );
    memberToResubmit = renameKey(memberToResubmit, "uid", "UID");
    memberToResubmit = renameKey(
      memberToResubmit,
      "gdrfa_file_number",
      "GDRFAFileNumber"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "emirate_of_visa_issuance",
      "EMIRATE OF VISA ISSUANCE"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "member_type",
      "MEMBER TYPE"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "entity_type",
      "ENTITY TYPE"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "establishment_id",
      "ESTABLISHMENT ID#"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "previously_insured",
      "Has the member been previously insured?"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "residential_location",
      "RESIDENTIAL LOCATION"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "work_location",
      "WORK LOCATION"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "employees_salary_bracket",
      "EMPLOYEES SALARY BRACKET"
    );
    memberToResubmit = renameKey(memberToResubmit, "commission", "COMMISSION");
    memberToResubmit = renameKey(
      memberToResubmit,
      "entity_contact_number",
      "ENTITY CONTACT NUMBER"
    );
    memberToResubmit = renameKey(
      memberToResubmit,
      "entity_email_id",
      "ENTITY E-MAIL ID"
    );

    return view.render("endorsement/add_a_member", {
      cor: memberToResubmit.cor,
      master_account: memberToResubmit.master_account,
      section: "resubmitted",
      memberToResubmit: memberToResubmit,
    });
  }
  async saveResubmittedMember({ auth, request, response }) {
    const insertedData = request.input("data");
    if (insertedData.dataDB && insertedData.dataDB != undefined) {
      await Database.from("resubmitted_insured_from_endorsement").insert(
        insertedData.dataDB
      );
      await Database.table("resubmitted_insured_from_endorsement")
        .where("web_req_id", insertedData.web_req_id)
        .where("Add_health_temp_id", insertedData.dataDB[0].Add_health_temp_id)
        .delete();
    }
    return response.redirect("myAdditionRequests");
  }
  //////////////start//////////////ADD A MEMBER//////////////start//////////////
  async addAMember({ view, auth, session }) {
    const webReqId = session.pull("webReqId");
    const rejected_policyId = session.pull("rejected_policyId");
    const distinctMaster = await getDistinctMaster(auth.user.linked_user_id)
    return view.render("endorsement/add_a_member", {
      master_accounts: distinctMaster,
    });
  }
  async getCORFromMaster({ request, auth }) {
    return await getDistinctMaster(auth.user.linked_user_id)
      .distinct("policies.cor")
      .where("policies.master_account", request.input("master_account"));
  }
  async addAMember1({ view, auth, request, response, session }) {
    const master_account = request.body.master_account;
    const cor = request.body.cor;
    let dataToInsert = [];
    if (request.body.dataToInsert) {
      dataToInsert = request.body.dataToInsert;
    }
    const contact = await Database.table(
      "Globals_rep.dbo.client_contact_details_rep"
    )
      .where("client_contact_id", auth.user.linked_user_id)
      .distinct("client_contact_name")
      .first();

    const rejectedPolicyId = session.get("rejected_policyId");
    let policiesDB = [];
    let policyQuery = await Database.raw("select distinct [a] .* from [Globals_rep].[dbo].[policies_rep] as [a] inner join [Globals_rep].[dbo].[contact_links_tbl_rep] as [b] on [a].[master_policy_clover_id] = [b].[master_policy_clover_id] where [b].[client_contact_id] = "+auth.user.linked_user_id+" and [a].[cor] = '"+cor+"'")

    if (rejectedPolicyId === null) {
      policiesDB = await policyQuery;
    } else {
      policiesDB = await policyQuery.where(
        "a.master_policy_clover_id",
        rejectedPolicyId
      );
    }

    let policies = policiesDB.map((a) => {
      return a.master_policy_clover_id;
    });
    const webReqIdDb = await Database.select("web_req_id")
      .from("add_health_temps")
      .orderBy("web_req_id", "desc")
      .first();

    const webReqIdDbError = await Database.select("web_req_id")
      .from("add_health_temp_errors")
      .orderBy("web_req_id", "desc")
      .first();

    let webReqNum = 0;
    if (webReqIdDb && webReqIdDbError) {
      webReqNum =
        webReqIdDb["web_req_id"] > webReqIdDbError["web_req_id"]
          ? webReqIdDb["web_req_id"]
          : webReqIdDbError["web_req_id"];
    } else if (webReqIdDb) {
      webReqNum = webReqIdDb["web_req_id"];
    } else if (webReqIdDbError) {
      webReqNum = webReqIdDbError["web_req_id"];
    } else {
      webReqNum = 0;
    }
    const webReqId = webReqNum + 1;
    session.put("webReqId", webReqId);

    const companyNameDB = await Database.from(
      "Globals_rep.dbo.contact_links_tbl_rep"
    )
      .where("client_contact_id", auth.user.linked_user_id)
      .distinct("client_cr_name");
    let companyName = companyNameDB.map((a) => a.client_cr_name);

    const emiratesDB = await Database.from("Globals_rep.dbo.Emirates_rep");
    let emirates = emiratesDB.map((a) => a.name);

    const nationalitiesDB = await Database.from("countries").distinct(
      "country_enName"
    );
    let nationalities = nationalitiesDB.map((a) => a.country_enName);

    const memberTypesDB = await Database.from("member_types");
    let memberTypes = memberTypesDB.map((a) => a.name_to_db);

    const entityTypesDB = await Database.from("entity_types");
    let entityTypes = entityTypesDB.map((a) => a.name_to_db);

    const establishmentIdsDB = await Database.from(
      "establishment_ids"
    ).distinct("name");
    let establishmentIds = establishmentIdsDB.map((a) => a.name);

    const residentialLocationsDB = await Database.from(
      "residential_locations"
    ).distinct("name");
    let residentialLocations = residentialLocationsDB.map((a) => a.name);

    const workLocationsDB = await Database.from("work_locations").distinct(
      "name"
    );
    let workLocations = workLocationsDB.map((a) => a.name);

    const employeesSalaryBracketsDB = await Database.from(
      "employees_salary_brackets"
    ).distinct("name");
    let employeesSalaryBrackets = employeesSalaryBracketsDB.map((a) => a.name);

    // const categoriesDB = await Database.from(
    //   "Globals_rep.dbo.policies_cats_rep as a"
    // )
    //   .innerJoin("Globals_rep.dbo.contact_links_tbl_rep as b", function () {
    //     this.on("a.master_policy_clover_id", "b.master_policy_clover_id");
    //   })
    //   .where("b.client_contact_id", auth.user.linked_user_id)
    //   .where("a.based_on_limit", "No")
    //   .whereIn("a.master_policy_clover_id", policies).debug(true)
    const categoriesDB = await Database.raw("select distinct  [a] . * from [Globals_rep].[dbo].[policies_cats_rep] as [a] inner join [Globals_rep].[dbo].[contact_links_tbl_rep] as [b] on [a].[master_policy_clover_id] = [b].[master_policy_clover_id] where [b].[client_contact_id] = "+auth.user.linked_user_id+" and [a].[master_policy_clover_id] in ("+policies.map(e=>"'"+e+"'")+") and [a].[based_on_limit] = 'No'")


    let categories = categoriesDB.map((a) => a.cat_name);

    // const catBasedOnLimit = await Database.select(
    //   "a.id",
    //   "a.master_policy_clover_id",
    //   "a.cat_name",
    //   "a.limit_from",
    //   "a.limit_to",
    //   "a.based_on_limit",
    //   "b.client_cr_id",
    //   "b.client_cr_name",
    //   "b.client_contact_id"
    // )
    //   .from("Globals_rep.dbo.policies_cats_rep as a")
    //   .innerJoin("Globals_rep.dbo.contact_links_tbl_rep as b", function () {
    //     this.on("a.master_policy_clover_id", "b.master_policy_clover_id");
    //   })
    //   .where("b.client_contact_id", auth.user.linked_user_id)
    //   .whereIn("a.master_policy_clover_id", policies)
    //   .where("a.based_on_limit", "Yes").debug(true);
      
      const catBasedOnLimit = await Database.raw("select distinct  [a] . * from [Globals_rep].[dbo].[policies_cats_rep] as [a] inner join [Globals_rep].[dbo].[contact_links_tbl_rep] as [b] on [a].[master_policy_clover_id] = [b].[master_policy_clover_id] where [b].[client_contact_id] = "+auth.user.linked_user_id+" and [a].[master_policy_clover_id] in ("+policies.map(e=>"'"+e+"'")+") and [a].[based_on_limit] = 'Yes'")

    return view.render("endorsement/add_a_member_1", {
      companyName: companyName,
      emirates: emirates,
      nationalities: nationalities,
      memberTypes: memberTypes,
      entityTypes: entityTypes,
      establishmentIds: establishmentIds,
      residentialLocations: residentialLocations,
      workLocations: workLocations,
      employeesSalaryBrackets: employeesSalaryBrackets,
      policies: policiesDB,
      master_account: master_account,
      client_contact_name: contact,
      client_contact_id: auth.user.linked_user_id,
      cor: cor,
      webReqId: webReqId,
      categories: categories,
      categoriesDB:categoriesDB,
      catBasedOnLimit: catBasedOnLimit,
      dataToInsert: dataToInsert,
    });
  }
  async addAMember2({ view, request, session, auth }) {
    const insertedData = request.input("data");
    const HOTcols = JSON.parse(request.input("HOTcols"));
    insertedData.dataDB.map((e) => {
      if (e.dob) {
        let dobArray = e.dob.split("/"); // Change format from DD/MM/YYYY to MM/DD/YYYY
        e.dob = dobArray[1] + "/" + dobArray[0] + "/" + dobArray[2];
      }
    });
    await Database.from("add_health_log").insert(insertedData.dataDB).debug(true);

    let tableHeaders = [];
    let validContent = [];
    let invalidContent = [];
    if (insertedData.validEntries) {
      insertedData.validEntries.forEach(function (validE, index) {
        let validENewArray = [];
        tableHeaders.length = 0;
        Object.keys(validE).forEach((key) => {
          let e=validE[key]
          tableHeaders.push(e.prop);
          validENewArray.push(e.value);
        });
        validContent=[...validContent,validENewArray.reverse()];
      });
    }
    if (insertedData.invalidEntries) {
      insertedData.invalidEntries.forEach((invalidE) => {
        let invalidENewArray = [];
        tableHeaders.length = 0;
        Object.keys(invalidE).forEach((key) => {
          let e=invalidE[key]
          tableHeaders.push(e.prop);
          invalidENewArray.push(e.value);
        });
        invalidContent=[...invalidContent,invalidENewArray.reverse()];
      });
    }
    console.log(invalidContent)
    const rejectedPolicyId = session.get("rejected_policyId");
    let policiesDB = [];
    if (rejectedPolicyId === null) {
      policiesDB = await getDistinctMaster(auth.user.linked_user_id)
        .where("policies.cor", insertedData.cor)
        .distinct("policies.master_policy_clover_id")
        .distinct("lob");
    } else {
      policiesDB = await getDistinctMaster(auth.user.linked_user_id)
        .where("policies.cor", insertedData.cor)
        .where("policies.master_policy_clover_id", rejectedPolicyId)
        .distinct("policies.master_policy_clover_id")
        .distinct("lob");
    }
    let policies = policiesDB.map((a) => a.master_policy_clover_id);

    const contact = await Database.table(
      "Globals_rep.dbo.client_contact_details_rep"
    )
      .where("client_contact_id", auth.user.linked_user_id)
      .distinct("client_contact_name")
      .first();

    const companyNameDB = await Database.from(
      "Globals_rep.dbo.contact_links_tbl_rep"
    )
      .where("client_contact_id", auth.user.linked_user_id)
      .distinct("client_cr_name");
    let companyName = companyNameDB.map((a) => a.client_cr_name);

    const emiratesDB = await Database.from("Globals_rep.dbo.Emirates_rep");
    let emirates = emiratesDB.map((a) => a.name);

    const nationalitiesDB = await Database.from("countries").distinct(
      "country_enName"
    );
    let nationalities = nationalitiesDB.map((a) => a.country_enName);

    const memberTypesDB = await Database.from("member_types").distinct("name");
    let memberTypes = memberTypesDB.map((a) => a.name);

    const entityTypesDB = await Database.from("entity_types").distinct("name");
    let entityTypes = entityTypesDB.map((a) => a.name);

    const establishmentIdsDB = await Database.from(
      "establishment_ids"
    ).distinct("name");
    let establishmentIds = establishmentIdsDB.map((a) => a.name);

    const residentialLocationsDB = await Database.from(
      "residential_locations"
    ).distinct("name");
    let residentialLocations = residentialLocationsDB.map((a) => a.name);

    const workLocationsDB = await Database.from("work_locations").distinct(
      "name"
    );
    let workLocations = workLocationsDB.map((a) => a.name);

    const employeesSalaryBracketsDB = await Database.from(
      "employees_salary_brackets"
    ).distinct("name");
    let employeesSalaryBrackets = employeesSalaryBracketsDB.map((a) => a.name);

    return view.render("endorsement/add_a_member_2", {
      webReqId: insertedData.web_req_id,
      tableHeaders: tableHeaders.reverse(),
      validContent: validContent,
      invalidContent: invalidContent,
      companyName: companyName,
      emirates: emirates,
      nationalities: nationalities,
      memberTypes: memberTypes,
      entityTypes: entityTypes,
      establishmentIds: establishmentIds,
      residentialLocations: residentialLocations,
      workLocations: workLocations,
      employeesSalaryBrackets: employeesSalaryBrackets,
      client_contact_id: auth.user.linked_user_id,
      invalidDetails: insertedData.invalidEntries,
      policies: policies,
      policiesDB: policiesDB,
      client_contact_name: contact,
      HOTcols: HOTcols,
      master_account: insertedData.master_account,
      cor: insertedData.cor,
    });
  }
  async addAMember3({ view, auth, request, response, session }) {
    const insertedData = request.input("data");
    let submittedEntries = [];
    const webReqId = session.get("webReqId");
    if (insertedData.dataInvalid && insertedData.dataInvalid != undefined) {
      insertedData.dataInvalid.forEach((a, index) => {
        a.created_at = new Date();
        a.dob = a.dob == "Invalid date" ? "" : a.dob;
      });
      await Database.from("add_health_temp_errors").insert(
        insertedData.dataInvalid
      );
    }
    if (
      insertedData.dataCategories &&
      insertedData.dataCategories != undefined
    ) {
      await Database.from("add_health_temp_error_cats").insert(
        insertedData.dataCategories
      );
    }
    if (insertedData.dataValid && insertedData.dataValid != undefined) {
      insertedData.dataValid.forEach((e) => {
        let dobArray = e.dob.split("/"); // Change format from DD/MM/YYYY to MM/DD/YYYY
        e.dob = dobArray[1] + "/" + dobArray[0] + "/" + dobArray[2];
      });
      await Database.from("add_health_temps_step2").insert(
        insertedData.dataValid
      );
    } else {
      return "goToMyRequest";
    }
    if (
      insertedData.dataValidCategories &&
      insertedData.dataValidCategories != undefined
    ) {
      const policiesCats = await Database.from(
        "Globals_rep.dbo.policies_cats_rep"
      );
      insertedData.dataValidCategories.forEach((a, index) => {
        a.date = new Date();
        policiesCats.forEach((policyCat) => {
          if (a.policy_id === policyCat.master_policy_clover_id) {
            if (a.cat > policyCat.limit_from && a.cat < policyCat.limit_to) {
              a.limits = a.cat;
              a.cat = policyCat.cat_name;
            }
          }
        });
      });
      await Database.from("add_health_temp_cats_step2").insert(
        insertedData.dataValidCategories
      );
    }

    await Database.table("add_health_log")
      .where("web_req_id", webReqId)
      .delete();
    if (insertedData.dataValid) {
      insertedData.dataValid.forEach((a) => {
        submittedEntries.push({
          first_name: a.first_name,
          last_name: a.last_name,
          dob: a.dob,
          company_name: a.company_name,
        });
      });
    }
    return view.render("endorsement/add_a_member_3", {
      submittedEntries: submittedEntries,
      cor: insertedData.cor,
    });
  }
  async step3Upload({ request, response, session, auth }) {
    const webReqId = session.get("webReqId");
    const addHealthTemps = await Database.from("add_health_temps_step2").where(
      "web_req_id",
      webReqId
    );
    addHealthTemps.map(function (e) {
      delete e.id;
      return e;
    });
    const rejectedWebReqId = session.pull("rejected_webReqId");
    const rejectedPolicyId = session.pull("rejected_policyId");
    let policyNotResubmittedArray = [];
    if (rejectedWebReqId && rejectedPolicyId) {
      let policyNotResubmitted = await Database.from("add_health_temp_cats")
        .where("web_req_id", rejectedWebReqId)
        .whereNot("policy_id", rejectedPolicyId)
        .distinct("policy_id");
      policyNotResubmittedArray = policyNotResubmitted.map((a) => a.policy_id);
    }
    const addHealthTempCats = await Database.select(
      "policy_id",
      "cat",
      "Add_health_temp_id",
      "web_req_id",
      "limits",
      "lob",
      "person_id",
      "status",
      "status_update",
      "date"
    )
      .from("add_health_temp_cats_step2")
      .where("web_req_id", webReqId)
      .whereNotIn("policy_id", policyNotResubmittedArray);

    if (addHealthTemps && addHealthTempCats) {
      await Database.from("add_health_temps").insert(addHealthTemps);
      await Database.from("add_health_temp_cats").insert(addHealthTempCats);
      await Database.from("add_health_temps_step2")
        .where("web_req_id", webReqId)
        .delete();
      await Database.from("add_health_temp_cats_step2")
        .where("web_req_id", webReqId)
        .delete();

      const invalidWebReqId = session.pull("invalid_webReqId");
      const invalidAddHealthTempId = session.pull("invalid_addHealthTempId");
      let cta_log = {};
      if (invalidWebReqId && invalidAddHealthTempId) {
        await Database.from("add_health_temp_errors")
          .where("web_req_id", invalidWebReqId)
          .where("Add_health_temp_id", invalidAddHealthTempId)
          .delete();
        await Database.from("add_health_temp_error_cats")
          .where("web_req_id", invalidWebReqId)
          .where("Add_health_temp_id", invalidAddHealthTempId)
          .delete();
        cta_log = {
          person_id: auth.user.linked_user_id,
          form: "add_health_temp",
          action: "Resubmit invalid",
          date: new Date(),
        };
      } else if (rejectedWebReqId && rejectedPolicyId) {
        await Database.from("add_health_temp_cats")
          .where("web_req_id", rejectedWebReqId)
          .where("policy_id", rejectedPolicyId)
          .update("status", 5);
        cta_log = {
          person_id: auth.user.linked_user_id,
          form: "add_health_temp",
          action: "Resubmit rejected",
          date: new Date(),
        };
      } else {
        cta_log = {
          person_id: auth.user.linked_user_id,
          form: "add_health_temp",
          action: "Addition",
          date: new Date(),
        };
      }
      await Database.from("cta_log").insert(cta_log);
    }

    const profilePics = request.file("profile_pics", {
      types: ["image", "pdf"],
      size: "2mb",
      extnames: ["jpeg", "jpg", "bmp", "gif", "png", "pdf", "tiff", "tif"],
    });
    let fileArray = [];
    if (profilePics) {
      await profilePics.moveAll(
        Helpers.tmpPath("uploads/endorsementDocs/add_health_temps/" + webReqId),
        (file) => {
          const fileName = `${new Date().getTime()}.${file.subtype}`;
          fileArray.push({
            name: fileName,
            web_req_id: webReqId,
          });
          return {
            name: fileName,
          };
        }
      );

      if (!profilePics.movedAll()) {
        return profilePics.errors();
      }
      await Database.from("add_health_temp_files").insert(fileArray);
      return response.redirect("myAdditionRequests");
    }
  }
  async loader({ view, session }) {
    session.flash({
      notification: "You have successfully created an endorsement request",
    });
    return view.render("endorsement/loader");
  }
  //////////////start//////////////DELETE A MEMBER//////////////start//////////////
  async deleteAMember({ view, auth, session }) {
    const master_accounts = await getDistinctMaster(
      auth.user.linked_user_id
    );
    return view.render("endorsement/delete_a_member", {
      master_accounts: master_accounts,
    });
  }
  async deleteAMember1({ view, auth, request, session }) {
    const cor = request.body.cor;
    session.put("cor", cor);
    const step = request.body.step;
    const masterPolicyCloverIdDb = await Database.select(
      "master_policy_clover_id"
    )
      .from("Globals_rep.dbo.policies_rep")
      .where("cor", cor);
    let masterPolicyCloverId = masterPolicyCloverIdDb.map(
      (a) => a.master_policy_clover_id
    );

    if (step == 1) {
      let principalsFromUpdatedIid = await Database.table(
        "Globals_rep.dbo.updated_iid_rep as a"
      )
        .join("Globals_rep.dbo.contact_links_tbl_rep as b", function () {
          this.on("a.master_policy_clover_id", "b.master_policy_clover_id");
        })
        .whereNotExists(
          Database.table("delete_health_temp_cats as c", function () {
            this.on("a.master_policy_clover_id", "c.policy_id").andOn(
              "b.client_contact_id",
              "c.person_id"
            );
          }).join("delete_health_temps as d", function () {
            this.on("c.Add_health_temp_id", "d.Add_health_temp_id")
              .andOn("c.web_req_id", "d.web_req_id")
              .andOn("d.employee_staff_id", "a.staff_id");
          })
        )
        .where("b.client_contact_id", auth.user.linked_user_id)
        .whereIn("a.master_policy_clover_id", masterPolicyCloverId)
        .where("a.relation", "1= PRINCIPAL")
        .distinct("a.first_name")
        .distinct("a.last_name")
        .distinct("a.dob")
        .distinct("a.gender")
        .distinct("a.staff_id")
        .debug(true);

      return view.render("endorsement/delete_a_member_1", {
        principalsFromUpdatedIid: principalsFromUpdatedIid,
      });
    } else {
      const membersFromPrincipal = request.body.data;
      const staffIds = request.body.data;
      const allMembersFromCensus = await Database.table(
        "Globals_rep.dbo.updated_iid_rep as a"
      )
        .whereIn("staff_id", staffIds)
        .distinct("first_name")
        .distinct("last_name")
        .distinct("staff_id")
        .distinct("relation")
        .distinct("company_name")
        .distinct("dob")
        .orderBy("staff_id", "asc")
        .orderBy("relation", "asc");
      return view.render("endorsement/delete_a_member_2", {
        allMembersFromCensus: allMembersFromCensus,
      });
    }
  }
  async deleteAMember3({ request, view, session, auth }) {
    const cor = session.get("cor");
    const masterAccountDB = await Database.select("master_account")
      .from("Globals_rep.dbo.policies_rep")
      .where("cor", cor)
      .first();
    const master_account = masterAccountDB["master_account"];

    const checkedMembersToDelete = request.input("data");
    let staffIds = [];
    let firstName = [];
    let lastName = [];
    let today = new Date();
    let membersToDelete = [];
    let membersToDeleteCat = [];
    let deletedMembers = [];
    if (checkedMembersToDelete) {
      checkedMembersToDelete.forEach(function (entryToDelete, index) {
        staffIds.push(entryToDelete.staff_id);
        firstName.push(entryToDelete.first_name);
        lastName.push(entryToDelete.last_name);
      });
      membersToDelete = await Database.select(
        "company_name",
        "s_department",
        "staff_id as employee_staff_id",
        "master_policy_clover_id",
        "first_name",
        "second_name",
        "last_name",
        "relation",
        "dob",
        "gender",
        "nationality",
        "marital_status",
        "cost_sharing",
        "position",
        "grade",
        "mobile",
        "email",
        "national_id",
        "saudi_id",
        "iqama_id",
        "iqama_expire_at",
        "sponsor_id",
        "kuwait_id",
        "qatar_id",
        "emirates_id",
        "passport_num",
        "uid",
        "gdrfa_file_number",
        "emirate_of_visa_issuance",
        "member_type",
        "entity_type",
        "establishment_id",
        "previously_insured",
        "residential_location",
        "work_location",
        "employees_salary_bracket",
        "commission",
        "entity_contact_number",
        "entity_email_id",
        "cat"
      )
        .from("Globals_rep.dbo.updated_iid_rep")
        .whereIn("staff_id", staffIds)
        .whereIn("first_name", firstName)
        .whereIn("last_name", lastName);

      const lastWebReqIdDb = await Database.table("delete_health_temps")
        .orderBy("web_req_id", "desc")
        .distinct("web_req_id")
        .first();
      let lastWebReqId =
        lastWebReqIdDb == undefined || lastWebReqIdDb.web_req_id === null
          ? 0
          : lastWebReqIdDb.web_req_id;
      const webReqId = lastWebReqId + 1;
      let addHealthTempId = 0;
      checkedMembersToDelete.forEach(function (entryFromWeb, index) {
        addHealthTempId++;
        membersToDelete.forEach(function (entryFromDb, index) {
          if (
            entryFromWeb.staff_id == entryFromDb.employee_staff_id &&
            entryFromWeb.first_name == entryFromDb.first_name &&
            entryFromWeb.last_name == entryFromDb.last_name
          ) {
            //entryFromDb.reason = entryFromWeb.reason;
            entryFromDb.created_at = today;
            entryFromDb.web_req_id = webReqId;
            entryFromDb.Add_health_temp_id = addHealthTempId;
            membersToDeleteCat.push({
              policy_id: entryFromDb.master_policy_clover_id,
              cat: entryFromDb.cat,
              web_req_id: webReqId,
              Add_health_temp_id: addHealthTempId,
              date: today,
              person_id: auth.user.linked_user_id,
            });
            deletedMembers.push({
              first_name: entryFromDb.first_name,
              last_name: entryFromDb.last_name,
              company_name: entryFromDb.company_name,
              relation: entryFromDb.relation,
              cat: entryFromDb.cat,
            });
            entryFromDb.master_account = master_account;
            entryFromDb.cor = cor;
            entryFromDb.client_contact_id = auth.user.linked_user_id;
            delete entryFromDb.cat;
            delete entryFromDb.id;
            delete entryFromDb.master_policy_clover_id;
          }
        });
      });
    }
    await Database.from("delete_health_temps").insert(membersToDelete);
    await Database.from("delete_health_temp_cats").insert(membersToDeleteCat);
    session.put("dataToDelete", membersToDelete);
    session.put("dataToDelete", membersToDeleteCat);
    const cta_log = {
      person_id: auth.user.linked_user_id,
      form: "delete_health_temp",
      action: "Deletion",
      date: new Date(),
    };
    await Database.from("cta_log").insert(cta_log);
    return view.render("endorsement/delete_a_member_3", {
      cor: checkedMembersToDelete.cor,
      deletedMembers: deletedMembers,
    });
  }
  async deleteAMember3Upload({ auth, request, response, session }) {
    const dataToDelete = session.pull("dataToDelete");

    const profilePics = request.file("profile_pics", {
      types: ["image", "pdf"],
      size: "2mb",
      extnames: ["jpeg", "jpg", "bmp", "gif", "png", "pdf", "tiff", "tif"],
    });
    let fileArray = [];
    if (profilePics) {
      await profilePics.moveAll(
        Helpers.tmpPath(
          "uploads/endorsementDocs/delete_health_temps/" +
            auth.user.linked_user_id
        ),
        (file) => {
          const fileName = `${new Date().getTime()}.${file.subtype}`;
          fileArray.push({
            name: fileName,
            web_req_id: dataToDelete[0].web_req_id,
          });
          return {
            name: fileName,
          };
        }
      );

      if (!profilePics.movedAll()) {
        return profilePics.errors();
      }
      await Database.from("census_to_delete_files").insert(fileArray);
      const cta_log = {
        person_id: auth.user.linked_user_id,
        form: "delete_health_temp",
        action: "Add Files",
        date: new Date(),
      };
      await Database.from("cta_log").insert(cta_log);

      return response.redirect("myDeletionRequests");
    }
  }
  async deleteDeletionRejectedPerson({ auth, request, response }) {
    const insertedData = request.input("data")[0];
    const memberToDelete = await Database.table("delete_health_temp_cats")
      .where("policy_id", insertedData.policy_id)
      .where("web_req_id", insertedData.web_req_id)
      .where("Add_health_temp_id", insertedData.Add_health_temp_id)
      .update({
        status: 4,
        last_status_updated: insertedData.last_status_updated,
      });

    const cta_log = {
      person_id: auth.user.linked_user_id,
      form: "delete_health_temp",
      action: "Delete Rejected Person",
      date: new Date(),
    };
    await Database.from("cta_log").insert(cta_log);
    return "You have successfully deleted this member";
  }
  async resubmitDeletion({ auth, request, response, session, view }) {
    const resubmittedData = request.body;
    session.put("webReqId_resubmit", resubmittedData.web_req_id);
    session.put("addHealthTempId_resubmit", resubmittedData.Add_health_temp_id);

    const cor = await Database.select("cor")
      .from("delete_health_temps")
      .where("web_req_id", resubmittedData.web_req_id)
      .where("Add_health_temp_id", resubmittedData.Add_health_temp_id)
      .first();

    return view.render("endorsement/resubmit_deletion", { cor: cor.cor });
  }
  async resubmitDeletionUpload({ auth, request, response, session }) {
    const webReqId = session.pull("webReqId_resubmit");
    const addHealthTempId = session.pull("addHealthTempId_resubmit");
    const profilePics = request.file("profile_pics", {
      types: ["image", "pdf"],
      size: "2mb",
      extnames: ["jpeg", "jpg", "bmp", "gif", "png", "pdf", "tiff", "tif"],
    });
    let fileArray = [];
    if (profilePics) {
      await profilePics.moveAll(
        Helpers.tmpPath(
          "uploads/endorsementDocs/delete_health_temps/" +
            auth.user.linked_user_id
        ),
        (file) => {
          const fileName = `${new Date().getTime()}.${file.subtype}`;
          fileArray.push({
            name: fileName,
            web_req_id: webReqId,
          });
          return {
            name: fileName,
          };
        }
      );

      if (!profilePics.movedAll()) {
        return profilePics.errors();
      }
      await Database.from("census_to_delete_files").insert(fileArray);

      const memberToDelete = await Database.table("delete_health_temp_cats")
        .where("web_req_id", webReqId)
        .where("Add_health_temp_id", addHealthTempId)
        .update({
          status: 1,
          last_status_updated: new Date(),
        });

      const cta_log = {
        person_id: auth.user.linked_user_id,
        form: "delete_health_temp",
        action: "Resubmit deletion",
        date: new Date(),
      };
      await Database.from("cta_log").insert(cta_log);

      return response.redirect("myDeletionRequests");
    }
  }
  //////////////start//////////////CENSUS//////////////start//////////////
  async census({ view, auth, session }) {
    const master_accounts = await getDistinctMaster(
      auth.user.linked_user_id
    );
    return view.render("endorsement/census", {
      master_accounts: master_accounts,
    });
  }
  async censusList({ view, auth, request }) {
    const master_account = request.body.master_account;
    const cor = request.body.cor;
    const masterPolicyCloverIdDb = await Database.raw(`select distinct [policies] .* from [Globals_rep].[dbo].[policies_rep] as [policies] inner join [Globals_rep].[dbo].[contact_links_tbl_rep] as [b] on [policies].[master_policy_clover_id] = [b].[master_policy_clover_id] where [b].[client_contact_id] = '${auth.user.linked_user_id}' and [policies].[master_account]='${master_account}' and [policies].[cor]='${cor}'`)
    let masterPolicyCloverId = masterPolicyCloverIdDb.map((a) => {
      return a.master_policy_clover_id
    });
      const updatedUidDb = await Database.raw("select distinct top (3000) [a].[master_policy_clover_id], [a].[uid], [a].[cat],a.limit from [Globals_rep].[dbo].[updated_iid_rep] as [a] inner join [Globals_rep].[dbo].[contact_links_tbl_rep] as [b] on [a].[master_policy_clover_id] = [b].[master_policy_clover_id] where [b].[client_contact_id] = "+auth.user.linked_user_id+" and [a].[master_policy_clover_id] in ("+masterPolicyCloverId.map(e=>"'"+e+"'")+") order by [a].[uid] desc")
      console.log(updatedUidDb)
      let distinctUid = [...new Set(updatedUidDb.map(e=>e.uid))];

      const uidData = await Database.raw("select a.*,company_name,s_department,staff_id,card_number,cost_sharing,position,grade from [Globals_rep].[dbo].[UID_rep] a,[Globals_rep].[dbo].updated_iid_rep b where a.uid = b.uid and b.[uid] in ("+distinctUid.map(e=>"'"+e+"'")+")")

    return view.render("endorsement/census_list", {
      uidData: uidData,
      policiesDb: masterPolicyCloverIdDb,
      updatedUidDb: updatedUidDb,
    });
  }

  //////////////////////////////////////////NOT USED ANYMORE/////////////////////////////////
  async deletion({ view }) {
    return view.render("endorsement/deletion");
  }
  async addCategory({ request, response }) {
    const catInserted = await Database.table("add_health_temp_cats").insert({
      Add_health_temp_id: request.input("addHealthTempId"),
      policy_id: request.input("master_policy_clover_id"),
      cat: request.input("category"),
    });
  }

  sendEmailStatus({ request, response }) {
    // send confirmation emailg

    sgMail.setApiKey(Env.get("SENDGRID_API_KEY"));
    const msg = {
      //to: request.input("email"),
      to: "master_account@gmail.com",
      from: "w3lb.com@gmail.com",
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
  }
}
module.exports = EndorsementController;
