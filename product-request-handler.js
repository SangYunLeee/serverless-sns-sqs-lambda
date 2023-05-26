const axios = require("axios");

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const handler = async (event) => {
  let newevent = JSON.parse(event.Records[0].body)
  let attributes = event.Records[0].attributes;
  console.log(`attributes :`, attributes);

  const { Subject: subject, Message: message } = newevent;
  const {
    MessageAttributeProductId,
    MessageAttributeCount,
  } = newevent.MessageAttributes;

  const {Value: productId} = MessageAttributeProductId;
  const count = Number(MessageAttributeCount.Value);

  if (count > 1000) {
    console.log(`WRONG COUNT`);
    await delay(4000);
  }

  const param = {
    subject,
    message,
    productId,
    count,
  };

  console.log(`param :`, param);

  await axios.post(`${process.env.PRODUCT_UPDATE_URL}/product/donut`, param)
      .then(function (response) {
        console.log("성공");
      })
      .catch(function (error) {
        console.log(error);
  });
};

module.exports = {
  handler,
};
