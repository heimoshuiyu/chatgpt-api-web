> 前排提示：滥用 API 或在不支持的地区调用 API 有被封号的风险 <https://github.com/zhayujie/chatgpt-on-wechat/issues/423>

# ChatGPT API WEB

> 灵车东西，做着玩儿的

一个简单的网页，调用 OPENAI ChatGPT 进行对话。

![build status](https://github.com/heimoshuiyu/chatgpt-api-web/actions/workflows/pages.yml/badge.svg)

与官方 ChatGPT 相比：

- 对话记录使用浏览器的 localStorage 保存在本地
- 可删除对话消息
- 可以设置 system message (如："你是一个喵娘"，参见官方 [API 文档](https://platform.openai.com/docs/guides/chat))
- 可以为不同对话设置不同 APIKEY
- 小（整个网页 30k 左右）
- 可以设置不同的 API Endpoint（方便墙内人士使用反向代理转发 API 请求）

## 屏幕截图

![screenshot](./screenshot.webp)

~~让喵娘统治世界吧（（发病.webp~~

## 使用

以下任意方式都可：

- 访问 github pages 部署 <https://heimoshuiyu.github.io/chatgpt-api-web/>
- 从 [release](https://github.com/heimoshuiyu/chatgpt-api-web/releases) 下载网页文件，或在 [github pages](https://heimoshuiyu.github.io/chatgpt-api-web/) 按 `ctrl+s` 保存网页，然后双击打开
- 自行编译构建网页

### 更改默认参数

- `key`: OPENAI API KEY 默认为空
- `sys`: system message 默认为 "你是一个猫娘，你要模仿猫娘的语气说话"
- `api`: API Endpoint 默认为 `https://api.openai.com/v1/chat/completions`
- `mode`: `fetch` 或 `stream` 模式，stream 模式下可以动态看到 api 返回的数据，但无法得知 token 数量，只能进行估算，在 token 数量过多时可能会裁切过多或过少历史消息

例如 `http://localhost:1234/?key=xxxx` 那么新创建的会话将会使用该默认 API

以上参数应用于单个对话，随时可在顶部更改

## 自行编译构建网页

```bash
yarn install
yarn build
```

构建产物在 `dist` 文件夹中