"use strict";

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URL's and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.1/routing
|
*/

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use("Route");

Route.on("/").render("home").as("home").middleware(["auth"]);

Route.get("my-profile", "Account/AccountController.myProfile");

//AUTHENTICATION// middleware authenticated to check if user is loggedin redirect to home
Route.get("register", "Auth/RegisterController.showRegister");
Route.post("register", "Auth/RegisterController.register").as("register");

Route.get("register2", "Auth/RegisterController.showRegister2");
Route.post("register2", "Auth/RegisterController.register2").as("register2");

Route.get("register3", "Auth/RegisterController.showRegister3");
Route.post("register3", "Auth/RegisterController.register3").as("register3");

Route.get("register4", "Auth/RegisterController.showRegister4");

Route.get("register/confirm/:token", "Auth/RegisterController.confirmEmail");
//REGISTRATION end//
//LOGIN start//
Route.get("login", "Auth/LoginController.showLogin");
Route.post("login", "Auth/LoginController.login").as("login");
Route.get("login2", "Auth/LoginController.showLogin2");
Route.post("login2", "Auth/LoginController.login2").as("login2");
Route.get("loginOTP", "Auth/LoginController.loginOTP");
Route.post("verifyloginOTP", "Auth/LoginController.verifyloginOTP").as(
  "verifyloginOTP"
);
Route.get("verifyAuthy", "Auth/LoginController.showVerifyAuthy");
Route.post("verifyAuthy", "Auth/LoginController.verifyAuthy").as("verifyAuthy");
Route.post("verifyloginAuthy", "Auth/LoginController.verifyloginAuthy").as(
  "verifyloginAuthy"
);
//LOGIN end//
Route.get("logout", "Auth/AuthenticatedController.logout");
Route.get("password/reset", "Auth/PasswordResetController.showLinkRequestForm");
Route.post("password/email", "Auth/PasswordResetController.sendResetLinkEmail");
Route.get(
  "password/reset/:token",
  "Auth/PasswordResetController.showResetForm"
);
Route.post("password/reset", "Auth/PasswordResetController.reset");
//ADMINISTRATION// middleware userIsAdmin to check if user is admin or redirect to home
Route.get(
  "admin/registered/",
  "Admin/RegisteredListController.showUsersList"
).middleware(["userIsAdmin"]);
Route.post("admin/activateUser/", "Admin/RegisteredListController.activateUser")
  .middleware(["userIsAdmin"])
  .as("activateUser");
Route.post("admin/disableUser/", "Admin/RegisteredListController.disableUser")
  .middleware(["userIsAdmin"])
  .as("disableUser");
Route.post("admin/chooseMemberType/", "Admin/RegisteredListController.chooseMemberType")
  .middleware(["userIsAdmin"])
  .as("chooseMemberType");
Route.post("admin/linkUser/", "Admin/RegisteredListController.linkUser")
  .middleware(["userIsAdmin"])
  .as("linkUser");
Route.post("admin/unlinkUser/", "Admin/RegisteredListController.unlinkUser")
  .middleware(["userIsAdmin"])
  .as("unlinkUser");

///////////////////////////////////////////////////////////////////////////
////ENDORSEMENT SECTION

Route.get("endorsement/dashboard", "EndorsementController.dashboard");
Route.get("endorsement/viewAs", "EndorsementController.viewAs").as("viewAs");
Route.get("endorsement/myPolicies", "EndorsementController.myPolicies");

////MY REQUEST PAGE - start
Route.get(
  "endorsement/myAdditionRequests",
  "EndorsementController.myAdditionRequests"
).as("myAdditionRequests");
Route.get("endorsement/byPolicy", "EndorsementController.byPolicy").as(
  "byPolicy"
);
Route.get("endorsement/byWebReqId", "EndorsementController.byWebReqId").as(
  "byWebReqId"
);
Route.get(
  "endorsement/completedByPolicy",
  "EndorsementController.completedByPolicy"
).as("completedByPolicy");
Route.get(
  "endorsement/completedByWebReqId",
  "EndorsementController.completedByWebReqId"
).as("completedByWebReqId");
Route.post(
  "endorsement/deleteRejectedPerson",
  "EndorsementController.deleteRejectedPerson"
).as("deleteRejectedPerson");
Route.post(
  "endorsement/resubmitRejectedPerson",
  "EndorsementController.resubmitRejectedPerson"
).as("resubmitRejectedPerson");
Route.post(
  "endorsement/saveResubmittedMember",
  "EndorsementController.saveResubmittedMember"
).as("saveResubmittedMember");

Route.get(
  "endorsement/myDeletionRequests",
  "EndorsementController.myDeletionRequests"
).as("myDeletionRequests");
Route.get(
  "endorsement/deletionByPolicy",
  "EndorsementController.deletionByPolicy"
).as("deletionByPolicy");
Route.get(
  "endorsement/deletionByWebReqId",
  "EndorsementController.deletionByWebReqId"
).as("deletionByWebReqId");
Route.get(
  "endorsement/completedDeletionByPolicy",
  "EndorsementController.completedDeletionByPolicy"
).as("completedDeletionByPolicy");
Route.get(
  "endorsement/completedDeletionByWebReqId",
  "EndorsementController.completedDeletionByWebReqId"
).as("completedDeletionByWebReqId");
Route.post(
  "endorsement/deleteDeletionRejectedPerson",
  "EndorsementController.deleteDeletionRejectedPerson"
).as("deleteDeletionRejectedPerson");
Route.post(
  "endorsement/resubmitDeletion",
  "EndorsementController.resubmitDeletion"
).as("resubmitDeletion");
Route.post(
  "endorsement/resubmitDeletionUpload",
  "EndorsementController.resubmitDeletionUpload"
).as("resubmitDeletionUpload");

////MY REQUEST PAGE - end

Route.get(
  "endorsement/showResubmitRejectedPerson",
  "EndorsementController.showResubmitRejectedPerson"
).as("showResubmitRejectedPerson");

Route.post(
  "endorsement/deleteInvalidRequest",
  "EndorsementController.deleteInvalidRequest"
).as("deleteInvalidRequest");
Route.post(
  "endorsement/resubmitInvalidRequest",
  "EndorsementController.resubmitInvalidRequest"
).as("resubmitInvalidRequest");
/////////////start/////////////CENSUS/////////////start/////////////
Route.get("endorsement/census", "EndorsementController.census");
Route.post("endorsement/censusList", "EndorsementController.censusList").as(
  "censusList"
);
/////////////end/////////////CENSUS/////////////end/////////////

/////////////start/////////////ADD A MEMBER/////////////start/////////////
Route.get(
  "endorsement/getCORFromMaster",
  "EndorsementController.getCORFromMaster"
).as("getCORFromMaster");
Route.get("endorsement/addAMember", "EndorsementController.addAMember");
Route.post("endorsement/addAMember1", "EndorsementController.addAMember1").as(
  "addAMember1"
);
Route.post("endorsement/addAMember2", "EndorsementController.addAMember2").as(
  "addAMember2"
);
Route.post("endorsement/addAMember3", "EndorsementController.addAMember3").as(
  "addAMember3"
);
Route.post("endorsement/step3Upload", "EndorsementController.step3Upload").as(
  "step3Upload"
);
/////////////end/////////////ADD A MEMBER/////////////end/////////////

/////////////start/////////////DELETE A MEMBER/////////////start/////////////
Route.get("endorsement/deleteAMember", "EndorsementController.deleteAMember");
Route.post(
  "endorsement/deleteAMember1",
  "EndorsementController.deleteAMember1"
).as("deleteAMember1");
Route.post(
  "endorsement/deleteAMember3",
  "EndorsementController.deleteAMember3"
).as("deleteAMember3");
Route.post(
  "endorsement/deleteAMember3Upload",
  "EndorsementController.deleteAMember3Upload"
).as("deleteAMember3Upload");
/////////////end/////////////DELETE A MEMBER/////////////end/////////////

Route.post(
  "endorsement/myRequestsDetails",
  "EndorsementController.myRequestsDetails"
).as("myRequestsDetails");

Route.get("endorsement/deletion", "EndorsementController.deletion");
Route.post("endorsement/addCategory", "EndorsementController.addCategory").as(
  "addCategory"
);

// APIs start
Route.get(
  "api/addHealthTempCats/:pid/:wid/:endid",
  "Api/ApiController.addHealthTempCats"
);
Route.get(
  "api/deleteHealthTempCats/:pid/:wid/:endid",
  "Api/ApiController.deleteHealthTempCats"
);
Route.get("api/test", "Api/ApiController.apiTest").as("apiTest");
Route.post("api/statusChanged/:id", "Api/ApiController.statusChanged");
// APIs end

//Loader
Route.get("loader", "EndorsementController.loader").as("loader");
