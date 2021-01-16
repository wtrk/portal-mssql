
var notEmpty = (value, callback) => {
  var resNotEmpty = notEmptyfunction(value)
  callback(resNotEmpty.valid)
  return $("#text-error").html(resNotEmpty.message)
};
var employeeStaffId = (value, callback) => {
  var resNotEmpty = notEmptyfunction(value)
  if (!resNotEmpty.valid) {
    callback(resNotEmpty.valid)
    return $("#text-error").html(resNotEmpty.message)
  } else {
    var resMin2 = minLengthfunction(value, 2)
    callback(resMin2.valid)
    return $("#text-error").html(resMin2.message)
  }
}
var namesValidation = (value, callback) => {
  var resNotEmpty = notEmptyfunction(value)
  var resMin2 = minLengthfunction(value, 2)
  if (!resNotEmpty.valid) {
    callback(resNotEmpty.valid)
    return $("#text-error").html(resNotEmpty.message)
  } else if (!resMin2.valid) {
    callback(resMin2.valid)
    return $("#text-error").html(resMin2.message)
  } else {
    var resLettersSpaces = lettersSpacesfunction(value)
    callback(resLettersSpaces.valid)
    return $("#text-error").html(resLettersSpaces.message)
  }
}
var min2ifNotEmpty = (value, callback) => {
  var resNotEmpty = notEmptyfunction(value)
  var resMin2 = minLengthfunction(value, 2)
  if (!resNotEmpty.valid) {
    callback(!resNotEmpty.valid)
    return $("#text-error").html("")
  } else if (!resMin2.valid) {
    callback(resMin2.valid)
    return $("#text-error").html(resMin2.message)
  } else {
    var resLettersSpaces = lettersSpacesfunction(value)
    callback(resLettersSpaces.valid)
    return $("#text-error").html(resLettersSpaces.message)
  }
};
var acceptableDate = (value = "", callback) => {

  var resNotEmpty = notEmptyfunction(value)
  if (!resNotEmpty.valid) {
    callback(resNotEmpty.valid)
    return $("#text-error").html(resNotEmpty.message)
  } else {
    const dateParts = value.split("/");
    const timestampFromValue = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
    const currentTimestamp = Date.now()
    const ageFromtimestamps = Math.floor((currentTimestamp - timestampFromValue) / (365 * 24 * 60 * 60 * 1000));
    var resValidateDate = validDatefunction(timestampFromValue)
    if (!resValidateDate.valid) {
      callback(resValidateDate.valid)
      return $("#text-error").html(resValidateDate.message)
    } else if (ageFromtimestamps > 99 || ageFromtimestamps < 0) {
      callback(false)
      return $("#text-error").html("Age should be from 0 to 99")
    } else if (relationValue == "3= CHILD" && ageFromtimestamps > 25) {
      callback(false)
      $("#text-error").html("Children should be under 25")
    } else {
      callback(true)
      $("#text-error").html("")
    }
  }
}
var positionField = (value, callback) => {
  if (relationValue == "1= PRINCIPAL" && nationalityValue == "Kingdom Of Saudi Arabia") {
    notEmpty(value, callback)
  } else {
    var resNotEmpty = notEmptyfunction(value)
    var resMin3 = minLengthfunction(value, 3)

    if (!resNotEmpty.valid) {
      callback(!resNotEmpty.valid)
      return $("#text-error").html("")
    } else if (!resMin3.valid) {
      callback(resMin3.valid)
      return $("#text-error").html(resMin3.message)
    } else {
      callback(true)
      $("#text-error").text("")
    }
  }
}
var alphaNumericIfNotEmpty = (value, callback) => {
  var resNotEmpty = notEmptyfunction(value)
  if (!resNotEmpty.valid) {
    callback(resNotEmpty.valid)
    return $("#text-error").html(resNotEmpty.message)
  } else {
    var resAlphaNumeric = alphaNumericfunction(value)
    callback(resAlphaNumeric.valid)
    return $("#text-error").html(resAlphaNumeric.message)
  }
}
var phoneNumberIfPrincipal = (value, callback) => {
  var resNotEmpty = notEmptyfunction(value)
  if (resNotEmpty.valid) {
    var resValidPhone = validPhoneFunction(value)
    //callback(resValidPhone.valid)
    callback(true)
    return $("#text-error").html(resValidPhone.message)

  } else if (!resNotEmpty.valid && relationValue == "1= PRINCIPAL") {
    callback(resNotEmpty.valid)
    return $("#text-error").html(resNotEmpty.message)
  } else {
    callback(true)
    return $("#text-error").html("")
  }
}
var validEmailIfPrinciple = (value, callback) => {
  var resNotEmpty = notEmptyfunction(value)
  if (resNotEmpty.valid) {
    var resValidEmail = validEmailfunction(value)
    callback(resValidEmail.valid)
    return $("#text-error").html(resValidEmail.message)

  } else if (!resNotEmpty.valid && relationValue == "1= PRINCIPAL") {
    callback(resNotEmpty.valid)
    return $("#text-error").html(resNotEmpty.message)
  } else {
    callback(true)
    return $("#text-error").html("")
  }
}
var entityTypesValidation = (value, callback) => {
  var resNotEmpty = notEmptyfunction(value)
  if (resNotEmpty.valid) {
    if(nationalityValue=="United Arab Emirates"){
      callback(false)
      $("#text-error").html("This field should be empty for emiratis")
    }else{
      callback(true)
      $("#text-error").html("")
    }
  }else{
    if(nationalityValue=="United Arab Emirates"){
      callback(true)
      $("#text-error").html("")
    }else{
      callback(false)
      $("#text-error").html("This field is mandatory")
    }
  }
}
var validEmailAndMandatory = (value, callback) => {
  var resNotEmpty = notEmptyfunction(value)
  if (resNotEmpty.valid) {
    var validEmail=validEmailfunction(value)
    callback(validEmail.valid)
    $("#text-error").html(validEmail.message)
  }else{
    callback(false)
    $("#text-error").html("This field is mandatory")
  }
}
var memberTypesValidation = (value, callback) => {
  const timestampFromValue=Date.parse(ageValue);
  const currentTimestamp=Date.now()
  const agePerDays=Math.floor((currentTimestamp-timestampFromValue) / (24 * 60 * 60 * 1000));

  if(agePerDays<=31){
    if(value=="6 = Newborn - Birth Certificate ID"){
        callback(true)
        $("#text-error").html("")
    }else{
        callback(false)
        $("#text-error").html("It is mandatory to choose '6 = Newborn - Birth Certificate ID' for children under 1 month")
    }
  }else{
    if(nationalityValue=="United Arab Emirates"){
        if(value=="1 = UAE National – Emirates ID"){
            callback(true)
            $("#text-error").html("")
        }else{
            callback(false)
            $("#text-error").text("It is mandatory to choose '1 = UAE National – Emirates ID' for Emiratis")
        }
    }else if(nationalityValue=="Oman" || nationalityValue=="Bahrain" || nationalityValue=="Kuwait" || nationalityValue=="Qatar" || nationalityValue=="Kingdom Of Saudi Arabia"){
        if(value=="2 = GCC National - Passport"){
            callback(true)
            $("#text-error").html("")
        }else{
            callback(false)
            $("#text-error").text("It is mandatory to choose '2 = GCC National - Passport' if you are from "+nationalityValue)
        }
    }else{
        if(uaeVisaIssuanceValue=="Ajman"){
            if(value=="4 = Expat whos residency is issued in Dubai - File Number"){
                callback(true)
                $("#text-error").html("")
            }else{
                callback(false)
                $("#text-error").text("It is mandatory to choose '4 = Expat whos residency is issued in Dubai - File Number'")
            }
        }else{
            if(value=="5 = Expat whos residency is issued in Emirates other than Dubai - File Number"){
                callback(true)
                $("#text-error").html("")
            }else{
                callback(false)
                $("#text-error").text("It is mandatory to choose '5 = Expat whos residency is issued in Emirates other than Dubai - File Number' in UAE for foreigner")
            }
        }
    }
  }


}
var UAEnumFormat = (value, callback) => {
  var resNotEmpty = notEmptyfunction(value)
  if (resNotEmpty.valid) {
    /// commented waiting to buy the license
  //         var UAEnumFormat=UAEnumFormatfunction(value)
  //         if(UAEnumFormat.validation==true){
  //             callback(true)
  //             $("#text-error").html("")
  //         }else{
  //             callback(false)
  //             $("#text-error").html("<p>The selected data field "+UAEnumFormat.message+"</p>")
  //         }
    callback(true)
    return $("#text-error").html("")
  } else {
    callback(false)
    return $("#text-error").html("This field is mandatory")
  }




  callback(true)
}
var emiratesIdNumber=(value,callback) => {
  var resNotEmpty = notEmptyfunction(value)
  if(resNotEmpty.valid){
      var validIdNum=validIdNumFunction(value,18,3)
      if(validIdNum.validation==true){
          callback(true)
          $("#text-error").html("")
      }else{
          callback(false)
          $("#text-error").html("The selected data field must be a valid emirates Id number")
      }
  }else{
      callback(false)
      $("#text-error").html("This field is mandatory")
  }
}
var estIdValidation=(value,callback) => {
        var resNotEmpty=notEmptyfunction(value)
        if(resNotEmpty.valid){
          if(value==gdrfaValue){
              callback(false)
              $("#text-error").html("This field should not be equal to the GDRFAFileNUmber value")
          }else{
            if(memberTypeValue=="UAE National – Emirates ID" || memberTypeValue=="GCC National - Passport"){
              $("#text-error").html("This field should be empty for "+memberTypeValue)
              return callback(false)
            }
            if(entityTypeValue=="Resident" || entityTypeValue=="Investor Visa"){
                var validIdNum=validIdNumFunction(value,13,3)
                if(validIdNum.validation==true){
                    callback(true)
                    $("#text-error").html("")
                }else{
                    callback(false)
                    $("#text-error").html("The selected data field "+validIdNum.message)
                }

            }else if(entityTypeValue=="UAE Citizen" || entityTypeValue=="GCC Citizen"){
                var uidNumber=uidNumberFunction(value,6,15)
                if(uidNumber.validation==true){
                    callback(true)
                    $("#text-error").html("")
                }else{
                    callback(false)
                    $("#text-error").html("The selected data field "+uidNumber.message)
                }
            }else{
                var uidNumber=uidNumberFunction(value,9,11)
                if(uidNumber.validation==true){
                    callback(true)
                    $("#text-error").html("")
                }else{
                    callback(false)
                    $("#text-error").html("The selected data field "+uidNumber.message)
                }
            }
          }
        }else{
          if(memberTypeValue=="UAE National – Emirates ID" || memberTypeValue=="GCC National - Passport"){
            $("#text-error").html("")
            return callback(true)
          }
          callback(false)
          $("#text-error").html("This field is mandatory")
        
        }

}



//HOT Validations Function --START--
function notEmptyfunction(value) {
  return {
    valid: (value) ? true : false,
    message: (value) ? "" : "This field is mandatory"
  }
}
function minLengthfunction(value, length) {
  return {
    valid: (String(value).length >= length) ? true : false,
    message: (String(value).length >= length) ? "" : "Must be at least " + length + " characters."
  }
}
function lettersSpacesfunction(value) {
  var regex = /^[a-zA-Z-,]+(\s{0,1}[a-zA-Z-, ])*$/;
  return {
    valid: (regex.test(value)) ? true : false,
    message: (regex.test(value)) ? "" : "This field must be only alphabets"
  }
}
function validDatefunction(value = "") {
  return {
    valid: (!isNaN(value)) ? true : false,
    message: (!isNaN(value)) ? "" : "This field must have a valid date"
  }
}
function alphaNumericfunction(value) {
  var regex = /^[a-zA-Z0-9_]+$/;
  return {
    valid: (regex.test(value)) ? true : false,
    message: (regex.test(value)) ? "" : "This field must be only alphanumeric"
  }
}
function validPhoneFunction(value) {
  // const validPhoneFormat = $.ajax({
  //   type: "GET",
  //   url: "http://apilayer.net/api/validate",
  //   dataType: "json",
  //   data: { access_key: "386661ddd43191ec181a736418ab4702", number: value },
  //   async: false,
  //   done: function (results) {
  //     JSON.parse(results);
  //     return results;
  //   },
  //   fail: function (jqXHR, textStatus, errorThrown) {
  //     console.log("Could not get posts, server response: " + textStatus + ": " + errorThrown);
  //   },
  // }).responseJSON;
  // console.log(validPhoneFormat)
  // return {
  //   valid: (validPhoneFormat.valid) ? true : false,
  //   message: (validPhoneFormat.valid) ? "" : "This field must have a valid phone number"
  // }

  //remove the below when subscribe
  return {
    valid: true,
    message: ""
  }
}
function validEmailfunction(value) {
  var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  return {
    valid: (regex.test(value)) ? true : false,
    message: (regex.test(value)) ? "" : "This field must be a valid email address"
  }
}


//Functions below should be updated --START--
function validIdNumFunction(value, length, distinctLength) {
  var arr = $.unique(value.split(""));
  var distinctDifLength = arr.length;
  var first3Num = value.substring(0, 3).match(/^[0-9]+$/);

  if (value.length == length && distinctDifLength >= distinctLength && first3Num != null) {
    return {
      validation: true,
      message: "",
    };
  } else {
    return {
      validation: false,
      message: "must be valid, ",
    };
  }
}
function distinctNumberFunction(value) {
  var arr = $.unique(value.split(""));
  var distinctDifLength = arr.length;

  if (distinctDifLength >= 3) {
    return {
      validation: true,
      message: "",
    };
  } else {
    return {
      validation: false,
      message: "must be valid, ",
    };
  }
}
function uidNumberFunction(value, lengthMin, lengthMax) {
  var arr = $.unique(value.split(""));
  var distinctDifLength = arr.length;
  var allNum = value.match(/^[0-9]+$/);

  if (
    value.length >= lengthMin &&
    value.length <= lengthMax &&
    distinctDifLength >= 3 &&
    allNum != null
  ) {
    return {
      validation: true,
      message: "",
    };
  } else {
    return {
      validation: false,
      message: "must be valid, ",
    };
  }
}
function UAEnumFormatfunction(value) {
  const validPhoneFormat = $.ajax({
    type: "GET",
    url: "http://apilayer.net/api/validate",
    dataType: "json",
    data: { access_key: "386661ddd43191ec181a736418ab4702", number: value },
    async: false,
    done: function (results) {
      JSON.parse(results);
      return results;
    },
    fail: function (jqXHR, textStatus, errorThrown) {
      console.log(
        "Could not get posts, server response: " +
        textStatus +
        ": " +
        errorThrown
      );
    },
  }).responseJSON;
  if (validPhoneFormat.valid == true && validPhoneFormat.country_code == "AE") {
    return {
      validation: true,
      message: "",
    };
  } else {
    return {
      validation: false,
      message: " must have a valid UAE phone number, ",
    };
  }
}
