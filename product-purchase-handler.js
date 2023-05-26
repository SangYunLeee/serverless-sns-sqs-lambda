const serverless = require("serverless-http");
const express = require("express");
require("dotenv").config();
const app = express();
app.use(express.json())

const AWS = require("aws-sdk")
const sns = new AWS.SNS({ region: "ap-northeast-2" })
const sku = 'CP-502101';
const {
  connectDb,
  queries: { getProduct, setStock }
} = require('./database')

app.get("/product/donut", connectDb, async (req, res, next) => {
  const [ result ] = await req.conn.query(
    getProduct(sku)
  )

  await req.conn.end()
  if (result.length > 0) {
    return res.status(200).json(result[0]);
  } else {
    return res.status(400).json({ message: "상품 없음" });
  }
});

app.post("/checkout", connectDb, async (req, res, next) => {
  const [ result ] = await req.conn.query(
    getProduct(sku)
    )
  let body = req.body;
  // serverless invoke local --function api --path data.json
  if (process.env.ENV == "LOCAL") {
    body = JSON.parse(req.body);
  }

  if (result.length > 0) {
    const product = result[0]
    const {count, factoryId} = body;
    if (product.stock > count) {
      await req.conn.query(setStock(product.product_id, product.stock - count))
      return res.status(200).json({ message: `구매 완료! 남은 재고: ${product.stock - count}`});
    }
    else {
      await req.conn.end()
      await sendSNSMessage(sku, factoryId, count);
      return res.status(200).json({ message: `구매 실패! 남은 재고: ${product.stock}`});
    }
  } else {
    await req.conn.end()
    return res.status(400).json({ message: "상품 없음" });
  }
});

const sendSNSMessage = async (sku, factoryId, count) => {
  const now = new Date().toString()
  const message = `도너츠 재고가 없습니다. 제품을 생산해주세요! \n메시지 작성 시각: ${now}`
  const params = {
    Message: message,
    Subject: '도너츠 재고 부족',
    MessageAttributes: {
      MessageAttributeProductId: {
        StringValue: sku,
        DataType: "String",
      },
      MessageAttributeCount: {
        StringValue: String(count),
        DataType: "Number",
      },
    },
    TopicArn: process.env.TOPIC_ARN,
  }
  const publishResult = await sns.publish(params).promise()
  console.log(`publishResult :`, publishResult);
}


app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

module.exports.handler = serverless(app);
module.exports.app = app;
