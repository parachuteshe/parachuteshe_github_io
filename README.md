# parachuteshe.github.io

## 企业微信 URL 有效性验证（Netlify）

当前仓库已提供 `GET /wecom/callback` 的验证实现，部署到 Netlify 后可用于企业微信「接收消息服务器」URL 校验。

### 1) Netlify 环境变量

在 Netlify Site Settings -> Environment Variables 配置：

- `WECOM_TOKEN`：企业微信后台填写的 Token
- `WECOM_ENCODING_AES_KEY`：43 位 EncodingAESKey（不带结尾 `=`）
- `WECOM_CORP_ID`：企业 ID（可选但建议配置，用于校验 receiveId）

### 2) 企业微信后台填写

- URL：`https://parashe.site/wecom/callback`
- Token：与 `WECOM_TOKEN` 一致
- EncodingAESKey：与 `WECOM_ENCODING_AES_KEY` 一致
- 加密方式：按企业微信后台要求（此实现支持加密回调验证）

### 3) 行为说明

- 会先对 `echostr` 做 `urldecode`
- 校验 `msg_signature`
- 使用 `EncodingAESKey` 解密 `echostr`
- 返回解密后的明文 `msg`（纯文本，无额外换行）
