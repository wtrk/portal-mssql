"use strict";
const Database = use("Database");
const Env = use("Env");
const fuzzball = use("fuzzball");
const axios = use('Axios');


class UserController {
  async entireDb({ request, response }) {
    await Database.table("uid").update({
      UID: 0,
      fuzz_score: 0,
      flag_email: 0,
      flag_mobile: 0,
      flag_marital: 0,
      flag_master: 0,
      status: 0,
      mobile: 0,
    });
    const tableData = await Database.table("uid");
    // const tableData = await Database.table("uid").orderBy('firsts', 'asc').limit(1000);

    tableData.forEach((eParent, iParent) => {
      const parentFirstname = eParent.firsts != null ? eParent.firsts + " " : "";
      const parentMaidenname = eParent.maiden != null ? eParent.maiden + " " : "";
      const parentLastname = eParent.lasts != null ? eParent.lasts + " " : "";
      let parentString = parentFirstname + parentMaidenname + parentLastname;
      parentString=parentString.split('.').join(" ")
      console.log(iParent,"added to array")
      let countSimilar = 0;
      tableData.forEach((eChild, iChild) => {
        const childFirstname = eChild.firsts != null ? eChild.firsts + " " : "";
        const childMaidenname = eChild.maiden != null ? eChild.maiden + " " : "";
        const childLastname = eChild.lasts != null ? eChild.lasts + " " : "";
        let childString = childFirstname + childMaidenname + childLastname;
        childString=childString.split('.').join(" ")
        if (eChild.YOB === eParent.YOB && 
          eChild.gender === eParent.gender && 
          eChild.nationality === eParent.nationality &&
          fuzzball.token_set_ratio(parentString, childString) > 70
        ) {
            let fuzz_score = iParent === iChild ? 1000 : fuzzball.token_set_ratio(parentString, childString); //if the same in the loop, give it 1000 as main field
              tableData[iChild].UID = eParent.id;
              tableData[iChild].fuzz_score = fuzz_score;
              if(eChild.email)
                tableData[iChild].flag_email = eParent.email === eChild.email ? 1 : 0;
              else {
                tableData[iChild].flag_email = 2
                tableData[iParent].flag_email = 2
              }
              if(eChild.mobilenb){
                const eParentMobile = (eParent.mobilenb!=null) ? eParent.mobilenb.split(" ").join("").split("-").join("") : null;
                const eChildMobile = (eChild.mobilenb!=null) ? eChild.mobilenb.split(" ").join("").split("-").join("") : null;
                tableData[iChild].flag_mobile = eParentMobile === eChildMobile ? 1 : 0;
              }else {
                tableData[iChild].flag_mobile = 2
                tableData[iParent].flag_mobile = 2
              }
              if(eChild.mstatus){
                tableData[iChild].flag_marital = eParent.mstatus === eChild.mstatus ? 1 : 0;
              }else {
                tableData[iChild].flag_marital = 2
                tableData[iParent].flag_marital = 2
              }
              if(eChild.master){
                tableData[iChild].flag_master = eParent.master === eChild.master ? 1 : 0;
              }else {
                tableData[iChild].flag_master = 2
                tableData[iParent].flag_master = 2
              }

            countSimilar++;
        }
      });
      if (countSimilar === 1) {
        tableData[iParent].fuzz_score = 1;
      }
    });
    const newArray = await tableData.map(e => {
      let status = 0
      if(e.fuzz_score!=1){
        if(e.flag_email===1 && e.flag_mobile===1 && e.flag_marital===1 && e.flag_master===1){
          status = 1
        }else{
          status = 2
        }
      }
      return ({
        id: e.id,
        fuzz_score: e.fuzz_score,
        UID: e.UID,
        status: status,
        flag_master: e.flag_master,
        flag_email: e.flag_email,
        flag_mobile: e.flag_mobile,
        flag_marital: e.flag_marital
      })
    }
    )
    //////////////////////////Check if 1000 dont have similars, make it 1/////////////////////
    ///////////1st sort them by fuzzscore, than by uid, than if 1000 with no same uid following change fuzzscore
    let newArraySortedByFuzz=newArray.sort((a, b) => {
      let comparison = 0;
      if (a.fuzz_score < b.fuzz_score) {
        comparison = 1;
      } else if (a.fuzz_score > b.fuzz_score) {
        comparison = -1;
      }
      return comparison;
    })
    let newArraySortedByUID=newArraySortedByFuzz.sort((a, b) => {
      let comparison = 0;
      if (a.UID > b.UID) {
        comparison = 1;
      } else if (a.UID < b.UID) {
        comparison = -1;
      }
      return comparison;
    })
    newArraySortedByUID.map((e,i)=>{
      if(e.fuzz_score===1000){
        if(e.UID!==newArraySortedByUID[i+1].UID){
          e.fuzz_score=1
        }
      }
    })
    
    axios({
      method: 'post',
      url: 'http://10.0.0.9:3333/api/insertEntireInDB',
      data: newArraySortedByUID
    }).then(function (response) {
      return response.json({
          response: "success"
        });
    })
    .catch(function (error) {
      console.log(error.response)
      return response.json({
          response: error
        });
    });



  }
  
  async insertEntireInDB({request,response}){
    let dataToSave = request.body
    for (var key in dataToSave) {
          await Database.table("uid").where("id", dataToSave[key].id).update({
            status: dataToSave[key].status,
            fuzz_score: dataToSave[key].fuzz_score,
            UID: dataToSave[key].UID,
            flag_email: dataToSave[key].flag_email,
            flag_mobile: dataToSave[key].flag_mobile,
            flag_marital: dataToSave[key].flag_marital,
            flag_master: dataToSave[key].flag_master
          });
          console.log(key, "saved to db")
      }
    return dataToSave

  }

  async oneNewEntry({request,response}){
    const tableData = await Database.table("uid")
    const dataFromApi=JSON.parse(request.raw())
    let resultApi=dataFromApi.map(entryData =>{
      const childFirstname = entryData.firsts != null ? entryData.firsts + " " : "";
      const childMaidenname = entryData.maiden != null ? entryData.maiden + " " : "";
      const childLastname = entryData.lasts != null ? entryData.lasts + " " : "";
      let childString = childFirstname + childMaidenname + childLastname;
      childString=childString.split('.').join(" ")
      let fuzz_score = 10;
      let dataToReturn = {message:"This entry is unique"}
      tableData.forEach((eParent, iParent) => {
        const parentFirstname = eParent.firsts != null ? eParent.firsts + " " : "";
        const parentMaidenname = eParent.maiden != null ? eParent.maiden + " " : "";
        const parentLastname = eParent.lasts != null ? eParent.lasts + " " : "";
        let parentString = parentFirstname + parentMaidenname + parentLastname;
        parentString=parentString.split('.').join(" ")
        
        
        if (entryData.YOB == eParent.YOB && 
          entryData.gender === eParent.gender && 
          entryData.nationality === eParent.nationality &&
          fuzzball.token_set_ratio(parentString, childString) > fuzz_score
        ) {
            fuzz_score = fuzzball.token_set_ratio(parentString, childString);
            let UID = eParent.id;
            let flag_email = 2;
            let flag_mobile = 2;
            let flag_marital = 2;
            let flag_master = 2;
            
              if(entryData.email) flag_email = eParent.email === entryData.email ? 1 : 0;

              if(entryData.mobilenb){
                const eParentMobile = (eParent.mobilenb!=null) ? eParent.mobilenb.split(" ").join("").split("-").join("") : null;
                const eChildMobile = (entryData.mobilenb!=null) ? entryData.mobilenb.split(" ").join("").split("-").join("") : null;
                flag_mobile = eParentMobile === eChildMobile ? 1 : 0;
              }
              
              if(entryData.mstatus) flag_marital = eParent.mstatus === entryData.mstatus ? 1 : 0;

              if(entryData.master) flag_master = eParent.master === entryData.master ? 1 : 0;
              dataToReturn = {
                fuzz_score,
                UID,
                flag_email,
                flag_mobile,
                flag_marital,
                flag_master,
              };
        }
      });
      return {...dataToReturn,entryData}
    })
    console.log(resultApi)

    return response.json({
      response: "success",
      data: resultApi
    });
  }
   async oneEntryReturn({params,response}){
     let fuzz_score = fuzzball.token_set_ratio(params.entry1, params.entry2)
    
    return response.json({
      response: "success", 
      fuzz_score
    });
  }
}

module.exports = UserController;
