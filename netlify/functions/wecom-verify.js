const crypto = require("crypto");

function sha1(content) {
  return crypto.createHash("sha1").update(content, "utf8").digest("hex");
}

function verifySignature({ token, timestamp, nonce, echostr, msgSignature }) {
  const sign = sha1([token, timestamp, nonce, echostr].sort().join(""));
  return sign === msgSignature;
}

function decodeEchostr(echostr, encodingAesKey, corpId) {
  const aesKey = Buffer.from(`${encodingAesKey}=`, "base64");
  const iv = aesKey.subarray(0, 16);

  const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);
  decipher.setAutoPadding(false);

  const encrypted = Buffer.from(echostr, "base64");
  let decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  // 企业微信使用 PKCS7（32 字节块）补位
  const pad = decrypted[decrypted.length - 1];
  if (pad > 0 && pad <= 32) {
    decrypted = decrypted.subarray(0, decrypted.length - pad);
  }

  const msgLength = decrypted.readUInt32BE(16);
  const msg = decrypted.subarray(20, 20 + msgLength).toString("utf8");
  const receiveId = decrypted.subarray(20 + msgLength).toString("utf8");

  if (corpId && receiveId !== corpId) {
    throw new Error("corpId mismatch");
  }

  return msg;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  const {
    msg_signature: msgSignature,
    timestamp,
    nonce,
    echostr: rawEchostr,
  } = event.queryStringParameters || {};

  const token = process.env.WECOM_TOKEN;
  const encodingAesKey = process.env.WECOM_ENCODING_AES_KEY;
  const corpId = process.env.WECOM_CORP_ID;

  if (!token || !encodingAesKey) {
    return {
      statusCode: 500,
      body: "Server env not configured",
    };
  }

  if (!msgSignature || !timestamp || !nonce || !rawEchostr) {
    return {
      statusCode: 400,
      body: "Missing required query params",
    };
  }

  // 企业微信文档要求先做 urldecode
  const echostr = decodeURIComponent(rawEchostr);

  if (
    !verifySignature({
      token,
      timestamp,
      nonce,
      echostr,
      msgSignature,
    })
  ) {
    return {
      statusCode: 401,
      body: "Invalid signature",
    };
  }

  try {
    const plainText = decodeEchostr(echostr, encodingAesKey, corpId);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
      // 注意不能带引号、BOM 或额外换行
      body: plainText,
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: `Decrypt failed: ${error.message}`,
    };
  }
};
