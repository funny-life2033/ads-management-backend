"use strict";

var ApiContracts = require("authorizenet").APIContracts;
var ApiControllers = require("authorizenet").APIControllers;

require("dotenv").config();

function getRandomString(text) {
  return text + Math.floor(Math.random() * 100000 + 1);
}

function getRandomInt() {
  return Math.floor(Math.random() * 100000 + 1);
}

function getRandomAmount() {
  return (Math.random() * 100 + 1).toFixed(2);
}

function getDate() {
  return new Date().toISOString().substring(0, 10);
}

function createSubscription(callback) {
  var merchantAuthenticationType =
    new ApiContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(
    process.env.SANDBOX_AUTHORIZE_API_LOGIN_ID
  );
  merchantAuthenticationType.setTransactionKey(
    process.env.SANDBOX_AUTHORIZE_TRANSACTION_KEY
  );

  var interval = new ApiContracts.PaymentScheduleType.Interval();
  interval.setLength(2);
  interval.setUnit(ApiContracts.ARBSubscriptionUnitEnum.MONTHS);

  var paymentScheduleType = new ApiContracts.PaymentScheduleType();
  paymentScheduleType.setInterval(interval);
  paymentScheduleType.setStartDate(getDate());
  paymentScheduleType.setTotalOccurrences(1);
  //   paymentScheduleType.setTrialOccurrences(0);

  var creditCard = new ApiContracts.CreditCardType();
  creditCard.setExpirationDate("2038-12");
  creditCard.setCardNumber("4111111111111111");

  var payment = new ApiContracts.PaymentType();
  payment.setCreditCard(creditCard);

  var orderType = new ApiContracts.OrderType();
  //   orderType.setInvoiceNumber(getRandomString("Inv:"));
  //   orderType.setDescription(getRandomString("Description"));

  var customer = new ApiContracts.CustomerType();
  customer.setType(ApiContracts.CustomerTypeEnum.INDIVIDUAL);
  customer.setId(getRandomString("Id"));
  customer.setEmail("topmasterdev2033@gmail.com");
  customer.setPhoneNumber("1232122122");
  customer.setFaxNumber("1232122122");
  customer.setTaxId("911011011");

  var nameAndAddressType = new ApiContracts.NameAndAddressType();
  nameAndAddressType.setFirstName(getRandomString("FName"));
  nameAndAddressType.setLastName(getRandomString("LName"));
  nameAndAddressType.setCompany(getRandomString("Company"));
  nameAndAddressType.setAddress(getRandomString("Address"));
  nameAndAddressType.setCity(getRandomString("City"));
  nameAndAddressType.setState(getRandomString("State"));
  nameAndAddressType.setZip("98004");
  nameAndAddressType.setCountry("USA");

  var arbSubscription = new ApiContracts.ARBSubscriptionType();
  arbSubscription.setName(getRandomString("Name"));
  arbSubscription.setPaymentSchedule(paymentScheduleType);
  arbSubscription.setAmount("10.00");
  //   arbSubscription.setTrialAmount(getRandomAmount());
  arbSubscription.setPayment(payment);
  arbSubscription.setOrder(orderType);
  arbSubscription.setCustomer(customer);
  arbSubscription.setBillTo(nameAndAddressType);
  arbSubscription.setShipTo(nameAndAddressType);

  var createRequest = new ApiContracts.ARBCreateSubscriptionRequest();
  createRequest.setMerchantAuthentication(merchantAuthenticationType);
  createRequest.setSubscription(arbSubscription);

  console.log(JSON.stringify(createRequest.getJSON(), null, 2));

  var ctrl = new ApiControllers.ARBCreateSubscriptionController(
    createRequest.getJSON()
  );

  ctrl.execute(function () {
    var apiResponse = ctrl.getResponse();

    var response = new ApiContracts.ARBCreateSubscriptionResponse(apiResponse);

    console.log(JSON.stringify(response, null, 2));

    if (response != null) {
      if (
        response.getMessages().getResultCode() ==
        ApiContracts.MessageTypeEnum.OK
      ) {
        console.log("Subscription Id : " + response.getSubscriptionId());
        console.log(
          "Message Code : " + response.getMessages().getMessage()[0].getCode()
        );
        console.log(
          "Message Text : " + response.getMessages().getMessage()[0].getText()
        );
      } else {
        console.log("Result Code: " + response.getMessages().getResultCode());
        console.log(
          "Error Code: " + response.getMessages().getMessage()[0].getCode()
        );
        console.log(
          "Error message: " + response.getMessages().getMessage()[0].getText()
        );
      }
    } else {
      console.log("Null Response.");
    }

    callback(response);
  });
}

createSubscription(function () {
  console.log("createSubscription call complete.");
});
